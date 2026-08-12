"use strict";
/* =========================================================================
   THE SOUND OF IT — everything synthesised in the browser, so there is
   nothing to download and nothing to block.

   The bed is a train: filtered noise for the rumble, a slow two-beat clack
   for the rail joints, wind over the top, and the air conditioning that
   never quite stops. On top of that, the noises a working day makes.

   Nothing starts until a real gesture starts it, and everything is one
   toggle away from silence.
   ========================================================================= */
const SFX = (function () {

  let ctx = null, ready = false, muted = false;
  let master, bedGain, rumbleGain, rumbleFilt, windGain, windFilt, hvacGain;
  let noiseBuf = null;
  let clackTimer = 0, keyTimer = 0, typing = false;
  let ringNode = null;
  let speed = 0, tunnel = 0, inside = 1;

  function makeNoise(seconds) {
    const n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    /* Brownian-ish noise: much closer to a train than white noise is. */
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    return buf;
  }
  function loopNoise(dest, gainVal) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const g = ctx.createGain(); g.gain.value = gainVal;
    src.connect(g).connect(dest);
    src.start();
    return g;
  }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }

    noiseBuf = makeNoise(3);
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(ctx.destination);

    bedGain = ctx.createGain(); bedGain.gain.value = 1; bedGain.connect(master);

    /* rumble: low-passed noise whose cutoff and level follow the speed */
    rumbleFilt = ctx.createBiquadFilter();
    rumbleFilt.type = 'lowpass'; rumbleFilt.frequency.value = 190; rumbleFilt.Q.value = 0.9;
    rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0;
    rumbleFilt.connect(rumbleGain).connect(bedGain);
    loopNoise(rumbleFilt, 0.9);

    /* wind past the body, a band above the rumble */
    windFilt = ctx.createBiquadFilter();
    windFilt.type = 'bandpass'; windFilt.frequency.value = 620; windFilt.Q.value = 0.7;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    windFilt.connect(windGain).connect(bedGain);
    loopNoise(windFilt, 0.5);

    /* the air conditioning, which is on whether you want it or not */
    const hv = ctx.createBiquadFilter();
    hv.type = 'bandpass'; hv.frequency.value = 300; hv.Q.value = 0.5;
    hvacGain = ctx.createGain(); hvacGain.gain.value = 0.035;
    hv.connect(hvacGain).connect(bedGain);
    loopNoise(hv, 0.35);
    const hum = ctx.createOscillator();
    hum.type = 'sine'; hum.frequency.value = 58;
    const hg = ctx.createGain(); hg.gain.value = 0.022;
    hum.connect(hg).connect(bedGain); hum.start();

    ready = true;
  }

  /* -------------------------------------------------------------- one-shots */
  function env(node, gain, a, d, at) {
    const g = ctx.createGain();
    const t0 = at || ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    node.connect(g).connect(master);
    return { g, t0 };
  }
  function tone(freq, gain, a, d, type, at) {
    if (!ready) return;
    const o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.value = freq;
    const e = env(o, gain, a, d, at);
    o.start(e.t0); o.stop(e.t0 + a + d + 0.05);
  }
  function noiseHit(gain, a, d, freq, q, at) {
    if (!ready) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    src.connect(f);
    const e = env(f, gain, a, d, at);
    src.start(e.t0); src.stop(e.t0 + a + d + 0.05);
  }

  const CUES = {
    /* the rail joints, in pairs, because a bogie has two axles */
    clack() { noiseHit(0.16, 0.002, 0.05, 110, 1.2); noiseHit(0.11, 0.002, 0.05, 150, 1.2, ctx.currentTime + 0.09); },
    /* the two-note chime before an announcement */
    ding() { tone(659.25, 0.20, 0.01, 0.55, 'sine'); tone(523.25, 0.20, 0.01, 0.8, 'sine', ctx.currentTime + 0.42); },
    /* door release: the warning bleeps, then the hiss */
    doorOpen() {
      for (let i = 0; i < 4; i++) tone(1046, 0.10, 0.005, 0.10, 'square', ctx.currentTime + i * 0.22);
      noiseHit(0.10, 0.05, 0.7, 900, 0.7, ctx.currentTime + 0.9);
    },
    doorClose() {
      for (let i = 0; i < 5; i++) tone(880, 0.09, 0.005, 0.09, 'square', ctx.currentTime + i * 0.18);
      noiseHit(0.13, 0.02, 0.45, 260, 1.1, ctx.currentTime + 0.95);
    },
    mail() { tone(1174, 0.055, 0.004, 0.09, 'sine'); tone(1567, 0.045, 0.004, 0.13, 'sine', ctx.currentTime + 0.07); },
    bad()  { tone(207, 0.10, 0.005, 0.22, 'triangle'); tone(155, 0.09, 0.005, 0.34, 'triangle', ctx.currentTime + 0.12); },
    good() { tone(784, 0.075, 0.005, 0.13, 'sine'); tone(1046, 0.07, 0.005, 0.2, 'sine', ctx.currentTime + 0.1); },
    tea()  { noiseHit(0.07, 0.35, 1.7, 1500, 0.6); },
    thunk(){ noiseHit(0.13, 0.003, 0.10, 190, 1.6); },
    paper(){ noiseHit(0.05, 0.01, 0.16, 3400, 0.7); },
    step() { noiseHit(0.028, 0.002, 0.045, 240, 1.4); },
    key()  { noiseHit(0.022, 0.001, 0.022, 2400, 2.2); },
    bell() { tone(1318, 0.13, 0.004, 1.1, 'sine'); tone(1975, 0.05, 0.004, 0.9, 'sine'); },
    tunnelIn()  { noiseHit(0.16, 0.12, 1.0, 130, 0.8); },
    tunnelOut() { noiseHit(0.11, 0.06, 0.7, 420, 0.8); }
  };

  function play(name) {
    if (!ready || muted) return;
    const c = CUES[name];
    if (c) { try { c(); } catch (e) { /* the tab went to sleep mid-cue */ } }
  }

  /* the Teams call: a two-note pattern that repeats until it is dealt with */
  function ring(on) {
    if (!ready) return;
    if (!on) { if (ringNode) { clearInterval(ringNode); ringNode = null; } return; }
    if (ringNode) return;
    const beat = () => {
      if (muted) return;
      tone(587, 0.09, 0.01, 0.20, 'sine');
      tone(880, 0.09, 0.01, 0.24, 'sine', ctx.currentTime + 0.22);
    };
    beat();
    ringNode = setInterval(beat, 2600);
  }

  /* ------------------------------------------------------------- the bed */
  function setScene(o) {
    if (!ready) return;
    speed = o.speed || 0; tunnel = o.tunnel || 0;
    inside = o.laptopOpen ? 0.55 : 1;             // the overlay muffles the world
    const v = Math.min(1, speed / 95);
    const now = ctx.currentTime;
    const set = (param, val) => param.setTargetAtTime(val, now, 0.4);
    set(rumbleGain.gain, (0.05 + v * 0.30) * (1 + tunnel * 0.9) * inside);
    set(rumbleFilt.frequency, 150 + v * 190 - tunnel * 60);
    set(windGain.gain, v * v * 0.055 * (1 - tunnel * 0.5) * inside);
    set(windFilt.frequency, 480 + v * 500);
    set(hvacGain.gain, 0.035 * inside);
  }

  /* Rail joints, paced by how fast the wheels are actually turning. */
  function tick(dtMs) {
    if (!ready || muted) return;
    if (speed > 6) {
      clackTimer -= dtMs;
      if (clackTimer <= 0) {
        clackTimer = Math.max(340, 26000 / Math.max(8, speed)) * (0.9 + Math.random() * 0.2);
        CUES.clack();
      }
    }
    if (typing) {
      keyTimer -= dtMs;
      if (keyTimer <= 0) { keyTimer = 70 + Math.random() * 190; CUES.key(); }
    }
  }
  const setTyping = v => { typing = !!v; };

  function setMuted(v) {
    muted = !!v;
    if (ready) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05);
    if (muted) ring(false);
  }
  const isMuted = () => muted;
  const isReady = () => ready;

  return { init, play, ring, setScene, tick, setTyping, setMuted, isMuted, isReady };
})();

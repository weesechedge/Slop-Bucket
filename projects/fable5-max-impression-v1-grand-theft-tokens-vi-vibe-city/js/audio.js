/* ============================================================
   GRAND THEFT TOKENS VI — audio.js
   100% procedural WebAudio. No assets. Engine, siren, SFX,
   and a two-station radio (synthwave + chiptune) built on a
   lookahead step sequencer.
   ============================================================ */
GT.audio = (function () {
  const A = {
    ctx: null, master: null, sfx: null, music: null, engine: null, sirenG: null,
    station: 0, // 0 = off, 1 = Wave 84.5, 2 = BITRATE 8
    stationNames: ['RADIO OFF', '\u25B8 84.5 THE WAVE \u2014 synth fm', '\u25B8 BITRATE 8 \u2014 chip fm'],
    enabled: false,
  };

  function ensure() {
    if (A.ctx || A.failed) return;
    const Ctx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) { A.failed = true; return; }
    try {
      A.ctx = new Ctx();
      A.master = A.ctx.createGain(); A.master.gain.value = 0.9; A.master.connect(A.ctx.destination);
      A.sfx = A.ctx.createGain(); A.sfx.gain.value = 0.9; A.sfx.connect(A.master);
      A.music = A.ctx.createGain(); A.music.gain.value = 0.0; A.music.connect(A.master);
      // engine: two detuned oscillators -> lowpass -> gain
      A.engineG = A.ctx.createGain(); A.engineG.gain.value = 0;
      A.engineF = A.ctx.createBiquadFilter(); A.engineF.type = 'lowpass'; A.engineF.frequency.value = 800;
      A.eo1 = A.ctx.createOscillator(); A.eo1.type = 'sawtooth'; A.eo1.frequency.value = 60;
      A.eo2 = A.ctx.createOscillator(); A.eo2.type = 'square'; A.eo2.frequency.value = 61.5;
      const eg2 = A.ctx.createGain(); eg2.gain.value = 0.35;
      A.eo1.connect(A.engineF); A.eo2.connect(eg2); eg2.connect(A.engineF);
      A.engineF.connect(A.engineG); A.engineG.connect(A.master);
      A.eo1.start(); A.eo2.start();
      // siren: single osc, freq stepped between two tones
      A.sirenO = A.ctx.createOscillator(); A.sirenO.type = 'triangle'; A.sirenO.frequency.value = 700;
      A.sirenG = A.ctx.createGain(); A.sirenG.gain.value = 0;
      const sf = A.ctx.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 750; sf.Q.value = 1.2;
      A.sirenO.connect(sf); sf.connect(A.sirenG); A.sirenG.connect(A.master);
      A.sirenO.start();
      // radio scheduler
      A.step = 0; A.nextT = 0;
      A.timer = setInterval(schedule, 30);
      A.enabled = true;
    } catch (e) { A.failed = true; }
  }

  // ---------- helpers ----------
  function tone(freq, t, dur, type, gain, dest, opt) {
    if (!A.ctx) return;
    opt = opt || {};
    const o = A.ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (opt.slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slideTo), t + dur);
    const g = A.ctx.createGain();
    const atk = opt.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (opt.lpf) { const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.lpf; o.connect(f); node = f; }
    node.connect(g); g.connect(dest || A.sfx);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noiseHit(t, dur, gain, ftype, ffreq, dest) {
    if (!A.ctx) return;
    const len = Math.max(1, Math.floor(A.ctx.sampleRate * dur));
    const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = A.ctx.createBufferSource(); src.buffer = buf;
    const f = A.ctx.createBiquadFilter(); f.type = ftype || 'lowpass'; f.frequency.value = ffreq || 1200;
    const g = A.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest || A.sfx);
    src.start(t); src.stop(t + dur + 0.02);
  }

  // ---------- radio ----------
  // Station 1: 100bpm synthwave, Am F C G. Station 2: 150bpm chip, C maj pentatonic.
  const CHORDS = [ // [bass root, chord tones]
    [55.0, [110.0, 130.81, 164.81]],   // Am
    [43.65, [87.31, 110.0, 130.81]],   // F
    [65.41, [130.81, 164.81, 196.0]],  // C
    [49.0, [98.0, 123.47, 146.83]],    // G
  ];
  const BASS_STEPS = [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1];
  const CHIP_RIFF = [523, 587, 659, 784, 659, 587, 523, 440, 392, 440, 523, 659, 784, 880, 784, 659,
    523, 659, 784, 1047, 880, 784, 659, 523, 587, 659, 587, 523, 440, 392, 440, 523];

  function scheduleStep(step, t) {
    const st = A.station;
    if (st === 1) {
      const s16 = step % 16, bar = Math.floor(step / 16) % 4;
      const ch = CHORDS[bar];
      // drums
      if (s16 % 4 === 0) { tone(150, t, 0.13, 'sine', 0.55, A.music, { slideTo: 42 }); }            // kick
      if (s16 === 4 || s16 === 12) noiseHit(t, 0.16, 0.3, 'bandpass', 1800, A.music);               // snare
      if (s16 % 2 === 0) noiseHit(t, 0.04, 0.10, 'highpass', 6500, A.music);                        // hats
      // bass
      if (BASS_STEPS[s16]) { const oct = (s16 === 3 || s16 === 11) ? 2 : 1; tone(ch[0] * oct, t, 0.16, 'sawtooth', 0.26, A.music, { lpf: 420 }); }
      // pad at bar start
      if (s16 === 0) { for (const f of ch[1]) { tone(f, t, 2.3, 'sawtooth', 0.05, A.music, { attack: 0.5, lpf: 900 }); tone(f * 1.005, t, 2.3, 'sawtooth', 0.05, A.music, { attack: 0.5, lpf: 900 }); } }
      // sparkly arp on bars 1 & 3
      if ((bar === 1 || bar === 3) && s16 % 2 === 0) { const f = ch[1][(s16 / 2) % 3] * 2; tone(f, t, 0.12, 'square', 0.05, A.music, { lpf: 2600 }); tone(f, t + 0.165, 0.1, 'square', 0.025, A.music, { lpf: 2600 }); }
    } else if (st === 2) {
      const s = step % 32;
      if (s % 4 === 0) tone(130, t, 0.1, 'sine', 0.5, A.music, { slideTo: 50 });
      if (s % 8 === 4) noiseHit(t, 0.1, 0.28, 'highpass', 3000, A.music);
      if (s % 2 === 1) noiseHit(t, 0.03, 0.07, 'highpass', 8000, A.music);
      tone(CHIP_RIFF[s], t, 0.1, 'square', 0.09, A.music);
      if (s % 4 === 0) tone(CHIP_RIFF[s] / 4, t, 0.2, 'triangle', 0.22, A.music);
    }
  }
  function schedule() {
    if (!A.ctx || A.station === 0) return;
    const stepDur = A.station === 1 ? 60 / 100 / 4 : 60 / 150 / 4;
    if (A.nextT < A.ctx.currentTime) { A.nextT = A.ctx.currentTime + 0.06; }
    while (A.nextT < A.ctx.currentTime + 0.14) {
      scheduleStep(A.step, A.nextT);
      A.step++; A.nextT += stepDur;
    }
  }
  function cycleRadio() {
    A.station = (A.station + 1) % 3;
    A.step = 0; A.nextT = 0;
    return A.stationNames[A.station];
  }

  // ---------- per-frame ----------
  function update(dt, st) {
    if (!A.ctx) return;
    if (A.ctx.state === 'suspended') { try { A.ctx.resume(); } catch (e) {} }
    const playing = st.mode === 'play';
    const p = st.player;
    const inCar = !!(p && p.car);
    // engine
    let eTarget = 0, eFreq = 58;
    if (playing && inCar) {
      const car = p.car;
      const v = Math.hypot(car.vx || 0, car.vz || 0);
      eFreq = 55 + Math.min(v, 36) * 7 + Math.sin(st.time * 31) * 2.5;
      eTarget = 0.07 + Math.min(v / 36, 1) * 0.075;
    }
    A.eo1.frequency.value = eFreq; A.eo2.frequency.value = eFreq * 1.012 + 1.3;
    A.engineG.gain.value += (eTarget * (st.muted ? 0 : 1) - A.engineG.gain.value) * Math.min(1, dt * 8);
    // radio audible only in a car (title screen also plays it quietly)
    const radioOn = A.station > 0 && (inCar || st.mode === 'title') && !st.muted;
    const mTarget = radioOn ? (st.mode === 'title' ? 0.35 : 0.6) : 0;
    A.music.gain.value += (mTarget - A.music.gain.value) * Math.min(1, dt * 5);
    // siren: follow nearest pursuing cop
    let near = 1e9, anyCop = false;
    for (const c of st.vehicles) if (c.isPolice && c.sirenOn && !c.dead) { anyCop = true; const d = GT.U.dist2(c.x, c.z, p ? p.x : 0, p ? p.z : 0); if (d < near) near = d; }
    let sTarget = 0;
    if (playing && anyCop && st.stars > 0) sTarget = GT.U.clamp(1 - Math.sqrt(near) / 130, 0, 1) * 0.16;
    if (st.muted) sTarget = 0;
    A.sirenG.gain.value += (sTarget - A.sirenG.gain.value) * Math.min(1, dt * 6);
    const ph = Math.sin(st.time * 2 * Math.PI * 0.72) > 0;
    A.sirenO.frequency.value = ph ? 880 : 640;
    A.master.gain.value = st.muted ? 0 : 0.9;
  }

  // ---------- SFX ----------
  function now() { return A.ctx ? A.ctx.currentTime : 0; }
  const sfx = {
    crash: (impact) => { if (!A.ctx) return; const g = GT.U.clamp(impact / 22, 0.12, 0.85); noiseHit(now(), 0.22, g, 'lowpass', 700); tone(70, now(), 0.18, 'sine', g * 0.6, A.sfx, { slideTo: 35 }); },
    thud: () => { if (!A.ctx) return; noiseHit(now(), 0.1, 0.3, 'lowpass', 380); },
    punch: () => { if (!A.ctx) return; noiseHit(now(), 0.07, 0.32, 'bandpass', 900); },
    pickup: () => { if (!A.ctx) return; tone(880, now(), 0.09, 'square', 0.12, A.sfx); tone(1318, now() + 0.07, 0.12, 'square', 0.12, A.sfx); },
    orb: () => { if (!A.ctx) return; tone(660, now(), 0.08, 'sine', 0.15, A.sfx); tone(990, now() + 0.06, 0.09, 'sine', 0.15, A.sfx); tone(1320, now() + 0.12, 0.14, 'sine', 0.13, A.sfx); },
    horn: () => { if (!A.ctx) return; tone(400, now(), 0.28, 'square', 0.1, A.sfx, { lpf: 1200 }); tone(302, now(), 0.28, 'square', 0.1, A.sfx, { lpf: 1200 }); },
    hornShort: () => { if (!A.ctx) return; tone(360, now(), 0.12, 'square', 0.07, A.sfx, { lpf: 1100 }); },
    explosion: () => { if (!A.ctx) return; noiseHit(now(), 0.8, 0.8, 'lowpass', 350); tone(90, now(), 0.7, 'sine', 0.7, A.sfx, { slideTo: 28 }); noiseHit(now() + 0.05, 0.3, 0.3, 'highpass', 2500); },
    splash: () => { if (!A.ctx) return; noiseHit(now(), 0.5, 0.4, 'lowpass', 900); },
    passed: () => { if (!A.ctx) return; const t0 = now(); [523, 659, 784, 1047].forEach((f, i) => tone(f, t0 + i * 0.12, 0.45, 'square', 0.12, A.sfx, { lpf: 2400 })); tone(261, t0, 0.9, 'sawtooth', 0.1, A.sfx, { attack: 0.05, lpf: 800 }); },
    failed: () => { if (!A.ctx) return; tone(220, now(), 0.5, 'sawtooth', 0.16, A.sfx, { slideTo: 110, lpf: 700 }); },
    wasted: () => { if (!A.ctx) return; tone(196, now(), 1.3, 'sawtooth', 0.2, A.sfx, { slideTo: 49, lpf: 600 }); noiseHit(now(), 0.5, 0.3, 'lowpass', 400); },
    busted: () => { if (!A.ctx) return; tone(185, now(), 0.22, 'square', 0.16, A.sfx, { lpf: 800 }); tone(139, now() + 0.28, 0.4, 'square', 0.16, A.sfx, { lpf: 800 }); },
    blip: () => { if (!A.ctx) return; tone(1200, now(), 0.05, 'square', 0.07, A.sfx); },
    heal: () => { if (!A.ctx) return; tone(523, now(), 0.3, 'sine', 0.12, A.sfx); tone(784, now() + 0.1, 0.35, 'sine', 0.12, A.sfx); },
  };

  return { ensure, update, cycleRadio, sfx, _A: A };
})();

"use strict";
/* =========================================================================
   THE LONG SERVICE — shared primitives.

   One rule governs everything downstream: a real second is a simulated
   second. Nothing here may accelerate, skip, or catch up by cheating — the
   only legal way to know what happened while you were gone is to replay it
   from a seed against the wall clock.
   ========================================================================= */
const LS = (function () {

  /* The spoken transcript this was built from, kept verbatim. */
  const PROMPT = `Make the game explained in the below spoken transcript, this is a new slop bucket entry:

“all of this official public information we can about our job. Yep. And it... you just make -- What? You run a simulation of your actual day job in real time. So take all of this context about this working environment. This is a job of someone who works in the APS public sector, simulate their full day job in what they're gonna be doing. Emails, meetings, ministerial, you know, huarah that comes up, all that stuff. Like, waste of time, thons. Like, Teams not working all the errors, but, like, in real time watching the screen, of the person doing that job based on that input data. Really into these real time games. Well, I think real... it's something about the real time thing. You know, there is the actual work. We're we're doing it right now. You know what you know what I was inspired by? That slow train stuff. And so, actually, the original idea -- Slow train. You know you know the slow train? Like, there's, like, a train in Norway. Like, it's called slow TV. Yes. No. I know. It's just this long thing. It's like a whole train ride. Yep. The original inspiration. And just to be clear, Claude, this is two different games I'm talking about. It's not the same game. Okay. But it could be. You you let them choose. You know, maybe, you know, mix and match. I'm not fast. My original idea was slowly TV, but as the game, that you're just the conductor for that slow TV ride, and nothing happens the whole thing. Like, it's just a very boring long Australian ride from the top of Norway to the bottom, and you're just going around just, like, one hour and a half's the next stop. Otherwise, I guess I'll just sort of pace up and down the things. But, like, you know, it's not it's not a game where there's, like, emergencies and just, like, oh, attack in the steerage or whatever. It's like, no. It's just a normal, boring, long train ride, and you're a conductor living a mundane. Yes. And there's a completely different game from the -- Well, it could be. It could be, but that was the original inspiration for potato farmer and this. Yep. Real time stuff. It's the importance of the real time thing. Okay. So having, like, an actual sim of how the public sector works as a real sim of day to day, this is what your job actually is. And having people have to suffer that when they're doing all the bloody bullshit DTA assurance things and things like that, that might be a better assurance device than... assurance testing device than having meetings with them for them to understand how shit all their assurance things is. So here you go. You can live a day in the life, a full real time day in the life of someone who has to input your actual policy practically.”`;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- deterministic randomness --------------------------------- */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash32(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  /* A stable 0..1 from any key — for scenery that must be in the same place
     every time the train passes it. */
  const h01 = key => hash32(key) / 4294967296;
  const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
  const rint = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const chance = (r, p) => r() < p;
  function shuffle(r, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* ---------- formatting ----------------------------------------------- */
  const pad2 = n => String(Math.floor(n)).padStart(2, '0');
  const comma = n => Math.floor(n).toLocaleString('en-AU');
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const lerp = (a, b, t) => a + (b - a) * t;

  function dur(ms, coarse) {
    ms = Math.max(0, ms);
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    const out = [];
    if (h) out.push(h + ' h');
    if (h || m) out.push(m + ' m');
    if (!coarse || (!h && m < 5)) out.push((s % 60) + ' s');
    return out.join(' ') || '0 s';
  }
  function durWords(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    const p = [];
    if (h) p.push(h + (h === 1 ? ' hour' : ' hours'));
    if (m || !h) p.push(m + (m === 1 ? ' minute' : ' minutes'));
    return p.join(' and ');
  }
  /* minutes-since-midnight -> "14:07" */
  function clock(mins) {
    const m = ((Math.floor(mins) % 1440) + 1440) % 1440;
    return pad2(m / 60) + ':' + pad2(m % 60);
  }
  /* Broadcast timecode: hours:minutes:seconds:frames since the camera started. */
  function timecode(ms) {
    const s = Math.floor(ms / 1000);
    return pad2(s / 3600) + ':' + pad2((s / 60) % 60) + ':' + pad2(s % 60) + ':' +
           pad2(Math.floor((ms % 1000) / 40));      // 25 fps, as broadcast does
  }

  /* ---------- storage --------------------------------------------------- */
  function store(key, defaults) {
    let s;
    try { s = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { s = null; }
    s = Object.assign({}, defaults, s || {});
    const api = {
      s,
      write() {
        s.lastSeen = Date.now();
        try { localStorage.setItem(key, JSON.stringify(s)); } catch (e) { /* quota / private mode */ }
      },
      wipe() { try { localStorage.removeItem(key); } catch (e) {} }
    };
    setInterval(api.write, 5000);
    addEventListener('beforeunload', api.write);
    addEventListener('visibilitychange', () => { if (document.hidden) api.write(); });
    return api;
  }

  /* ---------- colour ----------------------------------------------------
     mix() emits rgb() strings and callers feed the results straight back in
     (interior light is exterior light, warmed and dimmed), so the parser
     reads both notations.                                                  */
  function parseCol(c) {
    c = String(c).trim();
    if (c.charAt(0) === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      const n = parseInt(h.slice(0, 6), 16);
      return isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = c.match(/-?\d+(?:\.\d+)?/g);
    return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
  }
  function mix(c1, c2, t) {
    const A = parseCol(c1), B = parseCol(c2);
    t = clamp(t, 0, 1);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' +
                    Math.round(A[1] + (B[1] - A[1]) * t) + ',' +
                    Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function rgba(c, a) {
    const A = parseCol(c);
    return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')';
  }

  /* ---------- the sky, lit by the viewer's own local time ---------------- */
  const SKY = [
    { h: 0,    top: '#05070e', bot: '#0a0f18', sun: null },
    { h: 4.6,  top: '#0a1020', bot: '#182338', sun: null },
    { h: 6.4,  top: '#20304f', bot: '#7d5c53', sun: '#f0a86a' },
    { h: 8,    top: '#3c5f8f', bot: '#a9bcc9', sun: '#ffe6b0' },
    { h: 12,   top: '#4d7fb5', bot: '#c3d3dd', sun: '#fff6df' },
    { h: 16,   top: '#4a76a8', bot: '#bcc9d2', sun: '#ffeec4' },
    { h: 18.4, top: '#38466f', bot: '#b07a5c', sun: '#f5915a' },
    { h: 20,   top: '#1a2340', bot: '#4a4059', sun: null },
    { h: 22,   top: '#0a1020', bot: '#141a2a', sun: null },
    { h: 24,   top: '#05070e', bot: '#0a0f18', sun: null }
  ];
  function sky(hourFloat) {
    let a = SKY[0], b = SKY[SKY.length - 1];
    for (let i = 0; i < SKY.length - 1; i++) {
      if (hourFloat >= SKY[i].h && hourFloat <= SKY[i + 1].h) { a = SKY[i]; b = SKY[i + 1]; break; }
    }
    const t = (hourFloat - a.h) / Math.max(0.001, b.h - a.h);
    const night = hourFloat < 5.7 || hourFloat > 19.5;
    return {
      top: mix(a.top, b.top, t),
      bot: mix(a.bot, b.bot, t),
      sun: a.sun && b.sun ? mix(a.sun, b.sun, t) : (t < 0.5 ? a.sun : b.sun),
      night,
      /* 0 in the dead of night, 1 at midday — drives how much daylight gets
         into the carriage and therefore how hard the lamps have to work. */
      day: clamp(Math.sin(clamp((hourFloat - 5) / 14, 0, 1) * Math.PI), 0, 1)
    };
  }
  const localHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };

  /* ---------- canvas ---------------------------------------------------- */
  function fit(cv, w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
    }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return g;
  }
  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function loop(fn) {
    let last = performance.now();
    const step = now => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      try { fn(dt, now); } catch (e) { console.error(e); }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return { PROMPT, $, $$, esc, rng, hash32, h01, pick, rint, chance, shuffle,
           pad2, comma, clamp, lerp, dur, durWords, clock, timecode, store,
           parseCol, mix, rgba, sky, localHour, fit, roundRect, loop };
})();

"use strict";
/* =========================================================================
   SLOW WORK — shared core.

   Everything here exists to serve one rule, which both simulations obey:
   one real second is one simulated second. There is no fast-forward, no
   multiplier, and no "skip". Time passes whether the tab is open or not,
   so state is anchored to wall-clock epochs rather than to frame counts.
   ========================================================================= */
const SW = (function () {

  /* ---------- the transcript this whole project was built from ---------- */
  const PROMPT = `Make the game explained in the below spoken transcript, this is a new slop bucket entry:

“all of this official public information we can about our job. Yep. And it... you just make -- What? You run a simulation of your actual day job in real time. So take all of this context about this working environment. This is a job of someone who works in the APS public sector, simulate their full day job in what they're gonna be doing. Emails, meetings, ministerial, you know, huarah that comes up, all that stuff. Like, waste of time, thons. Like, Teams not working all the errors, but, like, in real time watching the screen, of the person doing that job based on that input data. Really into these real time games. Well, I think real... it's something about the real time thing. You know, there is the actual work. We're we're doing it right now. You know what you know what I was inspired by? That slow train stuff. And so, actually, the original idea -- Slow train. You know you know the slow train? Like, there's, like, a train in Norway. Like, it's called slow TV. Yes. No. I know. It's just this long thing. It's like a whole train ride. Yep. The original inspiration. And just to be clear, Claude, this is two different games I'm talking about. It's not the same game. Okay. But it could be. You you let them choose. You know, maybe, you know, mix and match. I'm not fast. My original idea was slowly TV, but as the game, that you're just the conductor for that slow TV ride, and nothing happens the whole thing. Like, it's just a very boring long Australian ride from the top of Norway to the bottom, and you're just going around just, like, one hour and a half's the next stop. Otherwise, I guess I'll just sort of pace up and down the things. But, like, you know, it's not it's not a game where there's, like, emergencies and just, like, oh, attack in the steerage or whatever. It's like, no. It's just a normal, boring, long train ride, and you're a conductor living a mundane. Yes. And there's a completely different game from the -- Well, it could be. It could be, but that was the original inspiration for potato farmer and this. Yep. Real time stuff. It's the importance of the real time thing. Okay. So having, like, an actual sim of how the public sector works as a real sim of day to day, this is what your job actually is. And having people have to suffer that when they're doing all the bloody bullshit DTA assurance things and things like that, that might be a better assurance device than... assurance testing device than having meetings with them for them to understand how shit all their assurance things is. So here you go. You can live a day in the life, a full real time day in the life of someone who has to input your actual policy practically.”`;

  /* ---------- tiny DOM helpers ---------- */
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- deterministic randomness -------------------------------------
     The day (and the journey) must be identical whether you sat through it or
     had the tab closed, so every schedule is generated from a stored seed
     rather than from live rolls. mulberry32: small, fast, good enough.        */
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
  const pick  = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
  const rint  = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const chance = (r, p) => r() < p;
  function shuffle(r, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* ---------- formatting ---------- */
  const pad2 = n => String(Math.floor(n)).padStart(2, '0');
  const comma = n => Math.floor(n).toLocaleString('en-AU');

  function hms(ms) {
    ms = Math.max(0, ms);
    const s = Math.floor(ms / 1000);
    return pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor(s / 60) % 60) + ':' + pad2(s % 60);
  }
  /* "1 h 27 m 14 s" — the countdown voice of a station board. */
  function dur(ms, opts) {
    ms = Math.max(0, ms);
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60;
    const parts = [];
    if (h) parts.push(h + ' h');
    if (h || m) parts.push(m + ' m');
    if (!(opts && opts.coarse) || (!h && m < 5)) parts.push(ss + ' s');
    return parts.join(' ') || '0 s';
  }
  /* "1 hour 27 minutes" — the announcement voice. */
  function durWords(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    const p = [];
    if (h) p.push(h + (h === 1 ? ' hour' : ' hours'));
    if (m || !h) p.push(m + (m === 1 ? ' minute' : ' minutes'));
    return p.join(' and ');
  }
  /* Office clock: minutes since midnight -> "14:07" */
  function clock(minsSinceMidnight) {
    const m = ((Math.floor(minsSinceMidnight) % 1440) + 1440) % 1440;
    return pad2(m / 60) + ':' + pad2(m % 60);
  }

  /* ---------- storage -----------------------------------------------------
     lastSeen is stamped on every write, which is what lets a page work out how
     long it was closed for and replay what happened in the meantime.          */
  function store(key, defaults) {
    let s;
    try { s = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { s = null; }
    s = Object.assign({}, defaults, s || {});
    const api = {
      s,
      write() {
        s.lastSeen = Date.now();
        try { localStorage.setItem(key, JSON.stringify(s)); } catch (e) { /* quota / private mode */ }
      }
    };
    /* Autosave on a timer, on the way out, and whenever the tab is hidden. */
    setInterval(() => api.write(), 5000);
    addEventListener('beforeunload', () => api.write());
    addEventListener('visibilitychange', () => { if (document.hidden) api.write(); });
    return api;
  }

  /* ---------- toast ---------- */
  let toastEl = null, toastTimer = 0;
  function toast(msg, ms) {
    if (!toastEl) {
      toastEl = document.getElementById('toast');
      if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'toast'; document.body.appendChild(toastEl); }
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms || 3400);
  }

  /* ---------- the source-prompt bar ---------- */
  function promptBar(mountSel) {
    const host = typeof mountSel === 'string' ? $(mountSel) : mountSel;
    if (!host) return;
    const bar = document.createElement('div');
    bar.className = 'promptbar';
    bar.title = 'The spoken transcript this project was built from, word for word.';
    bar.innerHTML = '<span class="pb-label">From the prompt:</span>' +
                    '<span class="pb-text">' + esc(PROMPT) + '</span>' +
                    '<span class="pb-more">read all</span>';
    const more = $('.pb-more', bar);
    bar.addEventListener('click', () => {
      bar.classList.toggle('open');
      more.textContent = bar.classList.contains('open') ? 'collapse' : 'read all';
    });
    host.appendChild(bar);
  }

  /* ---------- achievements ------------------------------------------------
     `never: true` marks the ones that exist only to be looked at.            */
  function achievements(defs, got, mountSel) {
    const host = typeof mountSel === 'string' ? $(mountSel) : mountSel;
    function render() {
      if (!host) return;
      host.innerHTML = defs.map(d =>
        '<div class="a' + (got[d.id] ? ' got' : '') + (d.never ? ' never' : '') + '">' +
          '<div class="mk">' + (got[d.id] ? '&#9632;' : '&#9633;') + '</div>' +
          '<div><div class="nm">' + esc(d.name) + '</div><div class="ds">' + esc(d.desc) + '</div></div>' +
        '</div>').join('');
    }
    return {
      render,
      grant(id) {
        if (got[id]) return false;
        const d = defs.find(x => x.id === id);
        if (!d) return false;
        got[id] = Date.now();
        render();
        toast('Achievement: ' + d.name + ' — ' + d.desc);
        return true;
      }
    };
  }

  /* ---------- a single rAF loop, throttled to ~5 fps for text UIs ---------- */
  function loop(fn, minMs) {
    let last = 0;
    const step = now => {
      if (!minMs || now - last >= minMs) { last = now; try { fn(now); } catch (e) { console.error(e); } }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- sky ---------------------------------------------------------
     Both simulations are lit by the player's actual local time, because the
     whole point is that this is happening now.                               */
  function skyColours(hourFloat) {
    const stops = [
      { h: 0,    top: '#05070e', bot: '#0a0f18', sun: null,      glow: '#0a0f18' },
      { h: 4.5,  top: '#0a1020', bot: '#182338', sun: null,      glow: '#233047' },
      { h: 6.5,  top: '#20304f', bot: '#7d5c53', sun: '#f0a86a', glow: '#c98b4b' },
      { h: 8,    top: '#3c5f8f', bot: '#a9bcc9', sun: '#ffe6b0', glow: '#dbc79c' },
      { h: 12,   top: '#4d7fb5', bot: '#c3d3dd', sun: '#fff6df', glow: '#e8e2cf' },
      { h: 16,   top: '#4a76a8', bot: '#bcc9d2', sun: '#ffeec4', glow: '#dfd3ba' },
      { h: 18.5, top: '#38466f', bot: '#b07a5c', sun: '#f5915a', glow: '#c07750' },
      { h: 20,   top: '#1a2340', bot: '#4a4059', sun: null,      glow: '#3c3550' },
      { h: 22,   top: '#0a1020', bot: '#141a2a', sun: null,      glow: '#141a2a' },
      { h: 24,   top: '#05070e', bot: '#0a0f18', sun: null,      glow: '#0a0f18' }
    ];
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (hourFloat >= stops[i].h && hourFloat <= stops[i + 1].h) { a = stops[i]; b = stops[i + 1]; break; }
    }
    const t = (hourFloat - a.h) / Math.max(0.001, b.h - a.h);
    return {
      top: mix(a.top, b.top, t),
      bot: mix(a.bot, b.bot, t),
      sun: a.sun && b.sun ? mix(a.sun, b.sun, t) : (t < 0.5 ? a.sun : b.sun),
      night: hourFloat < 5.6 || hourFloat > 19.6
    };
  }
  /* mix() returns an rgb() string, and callers feed those results straight back
     in (a landscape colour is a darkened sky colour), so the parser has to read
     both notations or the second pass produces nonsense. */
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
    t = Math.max(0, Math.min(1, t));
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' +
                    Math.round(A[1] + (B[1] - A[1]) * t) + ',' +
                    Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  const localHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };

  /* ---------- canvas sizing (retina-aware, avoids the blurry-window look) -- */
  function fitCanvas(cv, cssHeight) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || cv.parentElement.clientWidth || 600;
    const h = cssHeight || cv.clientHeight || 240;
    cv.style.height = h + 'px';
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w, h };
  }

  return { PROMPT, $, $$, esc, rng, hash32, pick, rint, chance, shuffle, parseCol,
           pad2, comma, hms, dur, durWords, clock, store, toast, promptBar,
           achievements, loop, skyColours, mix, localHour, fitCanvas };
})();

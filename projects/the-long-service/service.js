"use strict";
/* =========================================================================
   THE SERVICE — the timetable, and the country going past the windows.

   The Nordkapp–Lindesnes through service takes four days. Today is day three:
   Trondheim to Lindesnes, 938 km, departing 08:42 and getting in at 21:48 —
   thirteen hours and six minutes, run at one second per second.

   The workday sits inside that: 09:00 to 17:06. Which leaves eighteen minutes
   of commute at the start and four and three quarter hours of evening at the
   end, in which nothing whatsoever is required of you.
   ========================================================================= */
const SERVICE = (function () {

  const TT_SEED   = 6120826;
  const DEPART_MIN = 8 * 60 + 42;              // 08:42 on the service clock
  const TOTAL_MIN  = 13 * 60 + 6;              // to Lindesnes at 21:48
  const TOTAL_MS   = TOTAL_MIN * 60000;

  /* Real places, in order, with kilometres measured from Nordkapp so the
     line map can show today's leg against the whole run. */
  const LINE_KM = 2900;
  const STOPS = [
    ['Trondheim', 1962], ['Oppdal', 2080], ['Dombås', 2148], ['Otta', 2196],
    ['Vinstra', 2228], ['Lillehammer', 2265], ['Hamar', 2323], ['Eidsvoll', 2378],
    ['Oslo S', 2450], ['Drammen', 2492], ['Kongsberg', 2534], ['Bø', 2600],
    ['Nordagutu', 2628], ['Neslandsvatn', 2716], ['Kristiansand', 2822],
    ['Mandal', 2865], ['Lindesnes', 2900]
  ];
  const START_KM = STOPS[0][1], END_KM = STOPS[STOPS.length - 1][1];

  /* -------------------------------------------------------------- timetable
     Fixed seed: a timetable is a timetable. Everyone rides the same one.   */
  const TT = (function () {
    const r = LS.rng(TT_SEED);
    const legs = [];
    for (let i = 1; i < STOPS.length; i++) {
      const km = STOPS[i][1] - STOPS[i - 1][1];
      legs.push({ km, w: km * (0.84 + r() * 0.36) + 6 });
    }
    const dwell = legs.map((l, i) => (STOPS[i + 1][0] === 'Oslo S' ? 14 : i % 4 === 2 ? 6 : 3));
    const run = TOTAL_MIN - dwell.reduce((a, b) => a + b, 0);
    const wSum = legs.reduce((a, l) => a + l.w, 0);
    let t = 0;
    const out = [{ name: STOPS[0][0], km: START_KM, arrive: 0, depart: 0, dwell: 0, plat: 1 }];
    legs.forEach((l, i) => {
      const arrive = t + l.w / wSum * run;
      out.push({ name: STOPS[i + 1][0], km: STOPS[i + 1][1], arrive,
                 depart: arrive + dwell[i], dwell: dwell[i],
                 plat: 1 + (LS.hash32('plat' + STOPS[i + 1][0]) % 6) });
      t = arrive + dwell[i];
    });
    out[out.length - 1].depart = out[out.length - 1].arrive;
    return out;
  })();

  /* Where the train is, given how long the service has been running. */
  function where(elapsedMs) {
    const m = Math.min(elapsedMs / 60000, TOTAL_MIN);
    let i = 0;
    for (let k = 0; k < TT.length; k++) if (m >= TT[k].arrive) i = k;
    const here = TT[i], next = TT[i + 1] || null;
    const done = elapsedMs >= TOTAL_MS;
    if (m < here.depart || !next) {
      return { i, km: here.km, speed: 0, atStop: true, station: here, next,
               dwellLeft: Math.max(0, (here.depart - m) * 60000), toNextMs: next ? (next.arrive - m) * 60000 : 0, done };
    }
    const f = (m - here.depart) / Math.max(0.001, next.arrive - here.depart);
    /* Trains spend most of a leg at line speed and the ends of it accelerating,
       so ease the profile rather than running a flat average. */
    const ease = LS.clamp(Math.sin(LS.clamp(f, 0, 1) * Math.PI) * 2.3, 0, 1);
    const cruise = (next.km - here.km) / Math.max(0.001, (next.arrive - here.depart) / 60);
    return { i, km: here.km + (next.km - here.km) * f, speed: cruise * ease * 1.15,
             atStop: false, station: here, next, dwellLeft: 0,
             toNextMs: (next.arrive - m) * 60000, f, done };
  }

  /* Tunnels are a permanent feature of the line, not a random event. */
  function tunnel(km) {
    const seg = Math.floor(km / 11);
    const h = LS.h01('tun' + seg);
    if (h > 0.30) return 0;
    const start = seg * 11 + h * 8;
    const len = 0.2 + LS.h01('tl' + seg) * 2.1;              // 200 m to 2.3 km
    return km >= start && km <= start + len ? (km - start) / len : 0;
  }
  function weather(km) {
    const h = LS.h01('wx' + Math.floor(km / 70));
    if (h < 0.16) return km < 2350 ? 'snow' : 'rain';
    if (h < 0.40) return 'cloud';
    return 'clear';
  }
  /* The country changes as you come down it. */
  const BIOMES = ['Mountain', 'High valley', 'Forest', 'Lake country', 'Farmland', 'Coast'];
  function biome(km) {
    const f = (km - START_KM) / (END_KM - START_KM);
    return f < 0.16 ? 0 : f < 0.34 ? 1 : f < 0.52 ? 2 : f < 0.70 ? 3 : f < 0.88 ? 4 : 5;
  }

  /* ------------------------------------------------------------- scenery
     Everything beside the line lives at a fixed kilometre, so the same shed
     is in the same place on every run, and can be captioned as it passes.  */
  const THINGS = [
    { k: 'house',    cap: 'A RED HOUSE' },
    { k: 'house',    cap: 'ANOTHER RED HOUSE' },
    { k: 'shed',     cap: 'A SHED' },
    { k: 'trees',    cap: null },
    { k: 'trees',    cap: null },
    { k: 'lake',     cap: 'WATER' },
    { k: 'crossing', cap: 'A LEVEL CROSSING, UNATTENDED' },
    { k: 'deer',     cap: 'AN ANIMAL' },
    { k: 'barn',     cap: 'A BARN' },
    { k: 'poles',    cap: null },
    { k: 'church',   cap: 'A CHURCH' },
    { k: 'boat',     cap: 'A BOAT, NOT MOVING' }
  ];
  const SLOT_KM = 0.62;
  function thingAt(slot) {
    const h = LS.hash32('sc' + slot);
    if (h % 3) return null;
    return THINGS[(h >>> 4) % THINGS.length];
  }
  /* What is out there right now, for the caption in the corner. */
  function passing(km) {
    const t = thingAt(Math.floor(km / SLOT_KM));
    return t && t.cap ? t.cap : null;
  }

  /* ====================================================================
     THE VIEW — painted into an offscreen canvas in screen space, then
     blitted through the window openings by the carriage renderer.
     ==================================================================== */
  function paint(g, w, h, o) {
    const km = o.km, sk = LS.sky(o.hour), tun = o.atStop ? 0 : tunnel(km);
    const wx = weather(km), bio = biome(km);
    /* The caller decides where the horizon goes, because it has to line up
       with the train's windows. */
    const horizon = o.horizon != null ? o.horizon : h * 0.52;

    const grad = g.createLinearGradient(0, 0, 0, horizon + 30);
    grad.addColorStop(0, sk.top); grad.addColorStop(1, sk.bot);
    g.fillStyle = grad; g.fillRect(0, 0, w, horizon + 30);

    if (sk.night) {
      for (let i = 0; i < 90; i++) {
        const sx = LS.h01('sx' + i) * w, sy = LS.h01('sy' + i) * horizon * 0.9;
        g.fillStyle = 'rgba(255,255,255,' + (0.12 + LS.h01('sb' + i) * 0.4).toFixed(2) + ')';
        g.fillRect(sx, sy, 1.3, 1.3);
      }
      /* The moon keeps station with the train, as it does. */
      const mx = w * 0.74, my = horizon * 0.3;
      g.fillStyle = 'rgba(226,230,240,.88)';
      g.beginPath(); g.arc(mx, my, 9, 0, 7); g.fill();
      g.fillStyle = 'rgba(226,230,240,.07)';
      g.beginPath(); g.arc(mx, my, 26, 0, 7); g.fill();
    } else if (sk.sun) {
      const p = LS.clamp((o.hour - 5.5) / 14, 0, 1);
      const sx = w * (0.18 + 0.6 * p), sy = horizon - Math.sin(p * Math.PI) * horizon * 0.72;
      g.fillStyle = LS.rgba(sk.sun, 0.14);
      g.beginPath(); g.arc(sx, sy, 40, 0, 7); g.fill();
      g.fillStyle = sk.sun;
      g.beginPath(); g.arc(sx, sy, 13, 0, 7); g.fill();
    }
    if (wx === 'cloud' || wx === 'rain' || wx === 'snow') {
      /* Cloud banks drift far more slowly than the ground. */
      g.fillStyle = LS.rgba(sk.night ? '#1a2030' : '#cdd4dc', sk.night ? 0.5 : 0.34);
      for (let i = 0; i < 7; i++) {
        const cx = ((LS.h01('cl' + i) * w * 2) - (km * 26) % (w * 2) + w * 2) % (w * 2) - w * 0.5;
        const cy = horizon * (0.18 + LS.h01('cy' + i) * 0.4);
        const cw = 90 + LS.h01('cw' + i) * 150;
        g.beginPath(); g.ellipse(cx, cy, cw, 13 + LS.h01('ch' + i) * 12, 0, 0, 7); g.fill();
      }
    }

    /* Land: three ridges, then the verge. A layer shifts (mult × 26) pixels
       per kilometre — that ratio is the parallax. */
    ridge(g, w, h, horizon + 4,  bio === 0 ? 54 : bio === 5 ? 16 : 30, 0.0026, km * 3,  land(sk, .28, bio), bio);
    ridge(g, w, h, horizon + 26, bio === 0 ? 34 : 20, 0.0068, km * 13, land(sk, .46, bio), bio);
    ridge(g, w, h, horizon + 46, 13, 0.0155, km * 42, land(sk, .62, bio), bio);

    const near = horizon + 62;
    const vg = g.createLinearGradient(0, near - 6, 0, h);
    vg.addColorStop(0, land(sk, .70, bio)); vg.addColorStop(1, land(sk, .92, bio));
    g.fillStyle = vg; g.fillRect(0, near - 6, w, h - near + 6);

    /* Objects on the ground travel with the ground: one slot per screen width. */
    const SP = Math.max(0.3, w / 1000 * SLOT_KM * 1.6);
    for (let d = -1; d <= 1; d++) {
      const slot = Math.floor(km / SLOT_KM) + d;
      const t = thingAt(slot);
      if (!t) continue;
      const x = w * (1 - ((km / SLOT_KM - slot)));
      if (x < -90 || x > w + 90) continue;
      thing(g, x, near, t.k, LS.hash32('sc' + slot), sk, bio);
    }

    /* Line-side furniture, moving at ground speed. */
    const gap = 58, off = (km * 1000) % gap;
    g.strokeStyle = land(sk, .34, bio); g.lineWidth = 2;
    for (let x = -off; x < w + gap; x += gap) {
      g.beginPath(); g.moveTo(x, near); g.lineTo(x, horizon + 14); g.stroke();
      g.beginPath(); g.moveTo(x - 8, horizon + 19); g.lineTo(x + 8, horizon + 19); g.stroke();
    }
    g.strokeStyle = land(sk, .26, bio); g.lineWidth = 1.1;
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      for (let x = -off; x < w + gap; x += gap) {
        g.moveTo(x, horizon + 19 + k * 3.5);
        g.quadraticCurveTo(x + gap / 2, horizon + 30 + k * 3.5, x + gap, horizon + 19 + k * 3.5);
      }
      g.stroke();
    }

    /* The verge itself is too close to resolve: horizontal motion blur. */
    const smear = (km * 1000 * 2.6) % w;
    for (let i = 0; i < 110; i++) {
      const sd = LS.hash32('v' + i);
      const y = near - 4 + LS.h01('vy' + i) * (h - near + 4);
      const len = 16 + (sd >>> 6) % 66;
      const x = ((LS.h01('vx' + i) * w - smear + w * 2) % w) - len / 2;
      const lift = (y - near + 6) / Math.max(1, h - near + 6);
      g.fillStyle = 'rgba(' + (sk.night ? '150,158,172,' : '228,226,216,') + (0.05 + (1 - lift) * 0.08).toFixed(3) + ')';
      g.fillRect(x, y, len, 1.3);
    }

    if (wx === 'rain' || wx === 'snow') {
      const n = wx === 'snow' ? 100 : 190;
      g.strokeStyle = 'rgba(190,204,226,.22)'; g.lineWidth = 1;
      g.fillStyle = 'rgba(255,255,255,.5)';
      for (let i = 0; i < n; i++) {
        const px = LS.h01('p' + i) * w;
        const t = Date.now() / (wx === 'snow' ? 2500 : 250) + i * 0.37;
        const py = (t % 1) * (h + 20) - 10;
        if (wx === 'snow') { g.beginPath(); g.arc(px + Math.sin(t * 2 + i) * 10, py, 1.4, 0, 7); g.fill(); }
        else { g.beginPath(); g.moveTo(px, py); g.lineTo(px - 5, py + 8); g.stroke(); }
      }
    }

    /* Standing at a platform. Drawn high enough up the frame to be visible
       through the carriage windows, which is the only place it can be seen. */
    if (o.atStop && o.station) platform(g, w, h, horizon + 26, o.station, sk);

    if (o.skipTunnel) return { tun, wx, bio };
    if (tun > 0) {
      const a = LS.clamp(Math.sin(LS.clamp(tun, 0, 1) * Math.PI) * 3.6, 0, 1);
      g.fillStyle = 'rgba(6,7,10,' + (a * 0.98).toFixed(3) + ')';
      g.fillRect(0, 0, w, h);
      /* Service lights strung along the tunnel wall, flicking past. */
      g.fillStyle = 'rgba(255,214,150,' + (a * 0.5).toFixed(2) + ')';
      const lo = (km * 1000 * 2.6) % 120;
      for (let x = -lo; x < w; x += 120) g.fillRect(x, horizon - 6, 3, 7);
    }
    return { tun, wx, bio };
  }

  /* Land is the sky, darkened toward whatever the country is made of here —
     rock in the north, forest in the middle, pasture at the bottom. */
  const GROUND = ['#2b3440', '#3a3d33', '#16251a', '#17262b', '#2c3a22', '#25333a'];
  function land(sk, k, bio) {
    const g = GROUND[bio || 0];
    if (sk.night) {
      const haze = LS.mix(sk.bot, '#2a3450', 0.4);
      return LS.mix(haze, '#03050a', Math.min(0.98, 0.2 + k * 0.9));
    }
    return LS.mix(sk.bot, g, Math.min(1, k * 1.25));
  }
  function ridge(g, w, h, baseY, amp, freq, offset, colour, bio) {
    g.fillStyle = colour;
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 3) {
      const u = (x + offset * 26) * freq;
      let y = baseY - Math.sin(u) * amp * 0.55 - Math.sin(u * 2.31 + 1.7) * amp * 0.3
                    - Math.sin(u * 5.7 + 0.4) * amp * 0.15;
      if (bio === 0) y -= Math.max(0, Math.sin(u * 0.42)) * amp * 0.6;
      g.lineTo(x, y);
    }
    g.lineTo(w, h); g.closePath(); g.fill();
  }
  function thing(g, x, gy, kind, seed, sk, bio) {
    const dark = sk.night;
    if (kind === 'house' || kind === 'barn') {
      const w = kind === 'barn' ? 34 : 24, hh = kind === 'barn' ? 24 : 19;
      g.fillStyle = dark ? '#3a1f1c' : (kind === 'barn' ? '#7a3a2c' : '#964034');
      g.fillRect(x - w / 2, gy - hh, w, hh);
      g.fillStyle = dark ? '#1d2129' : '#ded9d0';
      g.beginPath(); g.moveTo(x - w / 2 - 3, gy - hh); g.lineTo(x, gy - hh - 11); g.lineTo(x + w / 2 + 3, gy - hh); g.closePath(); g.fill();
      if (dark) { g.fillStyle = 'rgba(255,212,138,.9)'; g.fillRect(x - 4, gy - hh + 5, 5, 5); }
    } else if (kind === 'shed') {
      g.fillStyle = dark ? '#22262e' : '#6d6c63';
      g.fillRect(x - 10, gy - 12, 20, 12);
      g.fillStyle = dark ? '#191d24' : '#565550';
      g.fillRect(x - 12, gy - 14, 24, 3);
    } else if (kind === 'church') {
      g.fillStyle = dark ? '#23272f' : '#dcd6ca';
      g.fillRect(x - 12, gy - 22, 24, 22);
      g.fillStyle = dark ? '#191d24' : '#7b736a';
      g.beginPath(); g.moveTo(x + 6, gy - 22); g.lineTo(x + 11, gy - 44); g.lineTo(x + 16, gy - 22); g.closePath(); g.fill();
    } else if (kind === 'trees') {
      g.fillStyle = dark ? '#131a16' : (bio >= 4 ? '#31462f' : '#25382a');
      for (let i = 0; i < 6; i++) {
        const tx = x + i * 11 - 28, th = 17 + (seed >> i) % 13;
        g.beginPath(); g.moveTo(tx - 6, gy); g.lineTo(tx, gy - th); g.lineTo(tx + 6, gy); g.closePath(); g.fill();
      }
    } else if (kind === 'lake') {
      g.fillStyle = LS.mix(sk.bot, '#0d1620', dark ? 0.5 : 0.28);
      g.beginPath(); g.ellipse(x, gy + 3, 78, 9, 0, 0, 7); g.fill();
    } else if (kind === 'boat') {
      g.fillStyle = LS.mix(sk.bot, '#0d1620', dark ? 0.5 : 0.28);
      g.beginPath(); g.ellipse(x, gy + 3, 70, 8, 0, 0, 7); g.fill();
      g.fillStyle = dark ? '#2b3038' : '#c9c2b4';
      g.beginPath(); g.moveTo(x - 9, gy); g.lineTo(x + 9, gy); g.lineTo(x + 5, gy + 4); g.lineTo(x - 5, gy + 4); g.closePath(); g.fill();
    } else if (kind === 'deer') {
      g.fillStyle = dark ? '#2b2b30' : '#6f5c48';
      g.fillRect(x - 7, gy - 10, 13, 6);
      g.fillRect(x + 4, gy - 14, 3, 5);
      g.fillRect(x - 6, gy - 4, 2, 4); g.fillRect(x + 3, gy - 4, 2, 4);
    } else if (kind === 'crossing') {
      g.strokeStyle = dark ? '#3a4150' : '#c3bcae'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, gy); g.lineTo(x, gy - 20); g.stroke();
      g.fillStyle = '#c05a4a'; g.beginPath(); g.arc(x, gy - 23, 4.5, 0, 7); g.fill();
    } else {
      g.strokeStyle = dark ? '#2b303a' : '#8d8879'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x, gy); g.lineTo(x, gy - 34); g.stroke();
      g.beginPath(); g.moveTo(x - 11, gy - 30); g.lineTo(x + 11, gy - 30); g.stroke();
    }
  }
  function platform(g, w, h, near, station, sk) {
    g.fillStyle = sk.night ? '#191d24' : '#8f8b81';
    g.fillRect(0, near - 4, w, 12);
    g.fillStyle = sk.night ? '#12151b' : '#6e6a62';
    g.fillRect(0, near - 8, w, 5);
    /* Canopy posts and a station board, spaced so one is usually in view. */
    for (let i = 0; i < 7; i++) {
      const x = ((LS.h01('pp' + i) * w) | 0);
      g.fillStyle = sk.night ? '#242a33' : '#5d5a53';
      g.fillRect(x, near - 78, 4, 74);
    }
    /* canopy */
    g.fillStyle = sk.night ? '#1a1f27' : '#4f4c46';
    g.fillRect(0, near - 84, w, 8);
    const bx = w * 0.42;
    g.fillStyle = '#12324f';
    LS.roundRect(g, bx - 68, near - 60, 136, 22, 3); g.fill();
    g.fillStyle = '#e8ecf2';
    g.font = '600 12px "IBM Plex Mono",monospace';
    g.textAlign = 'center';
    g.fillText(station.name.toUpperCase().slice(0, 14), bx, near - 44);
    g.textAlign = 'left';
    /* the yellow line, which people stand behind */
    g.fillStyle = LS.rgba('#d8b23c', sk.night ? 0.5 : 0.8);
    g.fillRect(0, near + 6, w, 2);
    if (sk.night) {
      g.fillStyle = 'rgba(255,224,160,.12)';
      for (let i = 0; i < 5; i++) g.fillRect(w * (0.08 + i * 0.22) - 34, near - 80, 68, 24);
    }
  }

  return { STOPS, TT, TOTAL_MS, TOTAL_MIN, DEPART_MIN, LINE_KM, START_KM, END_KM,
           where, tunnel, weather, biome, BIOMES, passing, paint };
})();

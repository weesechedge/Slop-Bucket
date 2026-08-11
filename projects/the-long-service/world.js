"use strict";
/* =========================================================================
   THE CARRIAGE — a side-on cutaway of the train you are working in.

   This is the whole screen. Everything the game contains is an object in
   here at a known metre-mark: the laptop is on a tray table at 12A, the PA
   handset is in a vestibule five cars away, the doors are wherever the
   doors are. To do a thing you walk to the thing, and walking takes the
   time that walking takes. That is the entire economy of the game.

   Composition, back to front:
     far wall and windows -> luggage rack and ceiling -> far seats and the
     people in them -> aisle floor -> you -> the near-side seat backs, which
     are between the camera and the aisle and are drawn dark.
   ========================================================================= */
const WORLD = (function () {

  /* ------------------------------------------------------------ geometry
     One world unit is about a centimetre and a half, so a standing adult is
     117 units and the ceiling is 153. */
  const CEIL = -153, FLOOR = 0, UNDER = 26;
  const ROOF = -176, SOLE = 34, AXLE = 52, WHEEL_R = 15, RAIL = 67;
  const WIN_TOP = -118, WIN_BOT = -62, WIN_W = 44, PITCH = 62;
  const RACK_Y = -141, SEAT_TOP = -78;
  const WALK = 74;                              // units per second

  const SEG = [];
  (function layout() {
    let x = 0;
    const add = (t, w, o) => { SEG.push(Object.assign({ t, x0: x, x1: x + w, w }, o || {})); x += w; };
    add('cab',    190);
    add('vest',   130, { n: 1 });
    add('car',    560, { name: 'Car A', code: 'A' });
    add('vest',   130, { n: 2 });
    add('car',    560, { name: 'Quiet Car', code: 'B', quiet: true });
    add('vest',   130, { n: 3 });
    add('buffet', 480, { name: 'Buffet' });
    add('vest',   130, { n: 4 });
    add('car',    560, { name: 'Car C', code: 'C', desk: true });
    add('vest',   130, { n: 5 });
    add('van',    360, { name: 'Guard’s Van' });
  })();
  const WORLD_W = SEG[SEG.length - 1].x1;
  const segAt = x => { for (const s of SEG) if (x >= s.x0 && x < s.x1) return s; return SEG[SEG.length - 1]; };

  /* ------------------------------------------------------------ hotspots */
  const V = n => SEG.find(s => s.t === 'vest' && s.n === n);
  const CARC = SEG.find(s => s.desk);
  const HOT = [
    { id: 'pa1',   x: V(1).x0 + 66,   label: 'PA handset',      verb: 'Make the announcement', icon: 'pa' },
    { id: 'door1', x: V(1).x0 + 24,   label: 'Doors · car A',   verb: 'Work the doors',        icon: 'door' },
    { id: 'door2', x: V(2).x0 + 65,   label: 'Doors · quiet car', verb: 'Work the doors',      icon: 'door' },
    { id: 'door3', x: V(3).x0 + 65,   label: 'Doors · buffet',  verb: 'Work the doors',        icon: 'door' },
    { id: 'buffet', x: 1700 + 250,    label: 'Buffet counter',  verb: 'Make a cup of tea',     icon: 'tea' },
    { id: 'door4', x: V(4).x0 + 65,   label: 'Doors · car C',   verb: 'Work the doors',        icon: 'door' },
    { id: 'desk',  x: CARC.x0 + 250,  label: 'Seat 12A · your laptop', verb: 'Sit down and work', icon: 'laptop' },
    { id: 'door5', x: V(5).x0 + 65,   label: 'Doors · van',     verb: 'Work the doors',        icon: 'door' },
    { id: 'pa2',   x: V(5).x0 + 100,  label: 'PA handset',      verb: 'Make the announcement', icon: 'pa' },
    { id: 'log',   x: 3000 + 170,     label: 'Guard’s desk',    verb: 'The service record',    icon: 'book' },
    { id: 'window', x: SEG.find(s => s.code === 'A').x0 + 300, label: 'A window',
      verb: 'Look out of it',  icon: 'win' },
    /* The only place on the train where you are allowed to do nothing is four
       cars from your laptop. That is the trade. */
    { id: 'rest',  x: SEG.find(s => s.quiet).x0 + 290, label: 'The quiet car',
      verb: 'Sit down and watch the country', icon: 'win' }
  ];
  const REACH = 46;

  /* ------------------------------------------------------------ palettes */
  function palette(sky) {
    const d = sky.day;                                   // 0 night .. 1 midday
    /* Lamps are always on; daylight adds to them rather than replacing them. */
    const lampWarm = '#f6dcae';
    const base = LS.mix('#2a2723', '#6d6a63', 0.25 + d * 0.42);
    return {
      d,
      wall:    LS.mix(base, lampWarm, 0.20 + d * 0.10),
      wallHi:  LS.mix(base, lampWarm, 0.36 + d * 0.14),
      wallLo:  LS.mix(base, '#12100e', 0.34),
      /* Below the waist rail it is dark panelling, not more of the same
         beige — that contrast is what stops the interior reading as a wall. */
      dado:    LS.mix('#221c17', '#4e4237', 0.14 + d * 0.34),
      ceil:    LS.mix(base, lampWarm, 0.30 + d * 0.08),
      floor:   LS.mix('#1a1d24', '#3f4450', 0.12 + d * 0.30),
      floorHi: LS.mix('#22262e', '#4d525f', 0.14 + d * 0.30),
      seat:    LS.mix('#22304a', '#4a6390', 0.20 + d * 0.34),
      seatHi:  LS.mix('#31415e', '#5a76a6', 0.22 + d * 0.34),
      seatNear: LS.mix('#0f1520', '#1e2735', 0.16 + d * 0.30),
      cloth:   LS.mix('#6b6256', '#cfc6b4', 0.18 + d * 0.4),
      metal:   LS.mix('#3a3d42', '#9aa0a8', 0.2 + d * 0.35),
      dark:    LS.mix('#0d0c0b', '#1c1a17', 0.3 + d * 0.3),
      lamp:    lampWarm,
      glow:    1 - d * 0.72                              // how visible the lamp bloom is
    };
  }

  /* ============================================================== state */
  let cv, g, off, offg, W = 0, H = 0, S = 1, camX = 0, t = 0, portrait = false;
  const player = { x: CARC.x0 + 250, vx: 0, face: 1, phase: 0, seated: false, target: null };
  let jolt = 0, joltV = 0, lastJoltKm = 0;
  let pax = [];
  let sunPhase = 0;

  /* ---------------------------------------------------------- passengers */
  const POSE = ['sleep', 'read', 'window', 'phone', 'still', 'sleep', 'read', 'still'];
  const SEAT_ROWS = seg => Math.floor((seg.w - 90) / PITCH);
  function seatX(seg, row) { return seg.x0 + 52 + row * PITCH; }

  function seedPax() {
    pax = [];
    let id = 0;
    SEG.filter(s => s.t === 'car' || s.t === 'buffet').forEach(seg => {
      const rows = SEAT_ROWS(seg);
      for (let r = 0; r < rows; r++) {
        if (LS.h01('occ' + seg.code + r) > (seg.quiet ? 0.55 : 0.72)) continue;
        pax.push(mkPax(id++, seg, r));
      }
    });
  }
  function mkPax(id, seg, row) {
    const h = LS.hash32('p' + seg.x0 + '-' + row + '-' + id);
    return {
      id, seg, row, x: seatX(seg, row), state: 'seated',
      pose: POSE[h % POSE.length],
      coat: ['#7a4b3e', '#3f4a5c', '#4a5240', '#5d4160', '#6b6257', '#2f4a4a', '#7d6a3c'][(h >>> 3) % 7],
      skin: ['#e8c39a', '#c78f63', '#8d5a3b', '#5f3a26', '#f0d3b4'][(h >>> 7) % 5],
      hair: ['#2b2119', '#4a3627', '#7a6a55', '#1a1a1c', '#8f8f95'][(h >>> 11) % 5],
      phase: LS.h01('ph' + id) * 6.28,
      wants: 0, seat: (1 + row) + 'ABCD'[(h >>> 5) % 4],
      poseUntil: 0
    };
  }

  /* Poses drift about once every twenty minutes; nobody does anything else. */
  function repose(nowMs) {
    for (const p of pax) {
      if (p.state !== 'seated') continue;
      if (nowMs > p.poseUntil) {
        p.poseUntil = nowMs + (400 + LS.h01('rp' + p.id + Math.floor(nowMs / 1e6)) * 1500) * 1000;
        p.pose = POSE[LS.hash32('po' + p.id + Math.floor(nowMs / 900000)) % POSE.length];
      }
    }
  }

  /* People get off, and other people get on and look for a seat. */
  function stationChange(stopIdx) {
    const r = LS.rng(LS.hash32('stop' + stopIdx));
    const off = LS.rint(r, 1, 4);
    for (let i = 0; i < off && pax.length; i++) {
      const p = pax[Math.floor(r() * pax.length)];
      if (!p || p.state !== 'seated') continue;
      p.state = 'leaving';
      p.target = nearestDoor(p.x);
    }
    const on = LS.rint(r, 1, 4);
    const free = [];
    SEG.filter(s => s.t === 'car' || s.t === 'buffet').forEach(seg => {
      for (let row = 0; row < SEAT_ROWS(seg); row++) {
        const x = seatX(seg, row);
        if (!pax.some(p => Math.abs(p.x - x) < 6 && p.state === 'seated')) free.push({ seg, row, x });
      }
    });
    for (let i = 0; i < on && free.length; i++) {
      const spot = free.splice(Math.floor(r() * free.length), 1)[0];
      const np = mkPax(9000 + stopIdx * 10 + i, spot.seg, spot.row);
      np.x = nearestDoor(spot.x);
      np.state = 'boarding';
      np.target = spot.x;
      pax.push(np);
    }
  }
  function nearestDoor(x) {
    let best = null, bd = 1e9;
    for (const h of HOT) if (h.id.startsWith('door')) {
      const d = Math.abs(h.x - x); if (d < bd) { bd = d; best = h.x; }
    }
    return best;
  }

  /* ================================================================ init */
  function init(canvas) {
    cv = canvas;
    off = document.createElement('canvas');
    offg = off.getContext('2d');
    seedPax();
    resize();
    addEventListener('resize', resize);
  }
  function resize() {
    W = cv.clientWidth; H = cv.clientHeight;
    /* Enough zoom to read a face, enough frame to see it is a train: about a
       car and a quarter across, with roof and wheels in shot. A portrait phone
       cannot have both, so it takes the close view and loses the length. */
    portrait = H > W * 1.15;
    S = portrait ? LS.clamp(W / 260, 1.05, 2.6)
                 : LS.clamp(Math.min(H * 0.80 / 250, W / 760), 0.85, 2.4);
    g = LS.fit(cv, W, H);
  }

  /* y = 0 is the carriage floor. Roof, underframe and rail all hang off it. */
  const originY = () => Math.round(H * (portrait ? 0.56 : 0.60));
  const sx = wx => (wx - camX) * S + W / 2;
  const sy = wy => originY() + wy * S;

  /* ============================================================== update */
  function update(dt, st) {
    t += dt;
    /* Walking */
    if (!player.seated) {
      let dir = 0;
      if (player.target != null) {
        const d = player.target - player.x;
        if (Math.abs(d) < 4) { player.target = null; } else dir = Math.sign(d);
      } else dir = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
      player.vx = dir * WALK;
      /* A moving train is not a stable floor. */
      if (Math.abs(st.speed) > 5) player.vx *= 0.94;
      player.x = LS.clamp(player.x + player.vx * dt, 210, WORLD_W - 34);
      if (dir) player.face = dir;
      player.phase += Math.abs(player.vx) * dt * 0.075;
    } else player.vx = 0;

    camX = LS.lerp(camX, player.x, 1 - Math.pow(0.0016, dt));
    const half = W / (2 * S);
    camX = LS.clamp(camX, Math.min(half, WORLD_W / 2), Math.max(WORLD_W - half, WORLD_W / 2));

    /* Rail joints: a small vertical kick every few hundred metres of km. */
    const jk = Math.floor(st.km * 1000 / 42);
    if (jk !== lastJoltKm && st.speed > 4) {
      lastJoltKm = jk;
      if (LS.h01('j' + jk) > 0.86) joltV -= 6 + LS.h01('jm' + jk) * 12;
    }
    joltV += (-jolt * 150 - joltV * 13) * dt;
    jolt += joltV * dt;

    sunPhase += dt * 0.06;

    /* Passengers walking to and from the doors. */
    for (const p of pax) {
      if (p.state === 'seated') continue;
      const d = p.target - p.x;
      p.x += Math.sign(d) * Math.min(Math.abs(d), 54 * dt);
      p.phase = (p.phase || 0) + dt * 5;
      if (Math.abs(d) < 3) {
        if (p.state === 'leaving') p.gone = 1;
        else { p.state = 'seated'; p.poseUntil = 0; }
      }
    }
    pax = pax.filter(p => !p.gone);
    repose(Date.now());
  }

  const keys = { left: false, right: false };
  function setKey(k, v) { keys[k] = v; }
  function walkTo(x) { player.target = LS.clamp(x, 210, WORLD_W - 34); }

  function nearest() {
    if (player.seated) return HOT.find(h => h.id === 'desk');
    let best = null, bd = REACH;
    for (const h of HOT) { const d = Math.abs(h.x - player.x); if (d < bd) { bd = d; best = h; } }
    /* A passenger with a hand up outranks the furniture. */
    for (const p of pax) if (p.wants && p.state === 'seated') {
      const d = Math.abs(p.x - player.x);
      if (d < REACH) return { id: 'pax:' + p.id, x: p.x, label: 'Seat ' + p.seat, verb: 'See what they want', icon: 'ask', pax: p };
    }
    return best;
  }

  /* ================================================================ draw
     The shot is a cutaway of a moving train: sky and country behind it, the
     track under it, the body sliced open so you can see the aisle you are
     walking down. The body rocks on its suspension; the wheels do not.
     ==================================================================== */
  function draw(st) {
    const sk = LS.sky(st.hour);
    const P = palette(sk);
    const tun = st.tunnelDepth || 0;
    const dpr = LS.clamp(window.devicePixelRatio || 1, 1, 2);

    /* --- the country, painted once, with its horizon put where the windows
           are so the same image can serve as backdrop and as view --- */
    const ow = Math.round(W), oh = Math.round(H);
    if (off.width !== ow || off.height !== oh) { off.width = ow; off.height = oh; }
    offg.setTransform(1, 0, 0, 1, 0, 0);
    SERVICE.paint(offg, ow, oh, {
      km: st.km, hour: st.hour, atStop: st.atStop, station: st.station,
      horizon: sy(-92)
    });

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.drawImage(off, 0, 0, W, H);

    /* --- the track, which does not rock --- */
    track(P, sk, st);
    runningGear(P, sk, st);

    /* --- the train, which does --- */
    g.save();
    const roll = Math.sin(t * 0.83) * 0.30 + Math.sin(t * 2.17 + 1.1) * 0.12;
    const bob = Math.sin(t * 1.9) * 1.5 + jolt;
    const moving = Math.min(1, st.speed / 40);
    g.translate(W / 2, sy(SOLE));
    g.rotate((roll * moving) * Math.PI / 180);
    g.translate(-W / 2, -sy(SOLE) + bob * (0.35 + moving * 0.65));

    const x0 = camX - W / (2 * S) - 120, x1 = camX + W / (2 * S) + 120;
    const vis = SEG.filter(s => s.x1 > x0 && s.x0 < x1);

    vis.forEach(s => shell(s, P, sk));            /* roof and skirt          */
    vis.forEach(s => farWall(s, P, sk, st, tun)); /* wall, and the view      */
    vis.forEach(s => upper(s, P, sk));            /* ceiling, lamps, racks   */
    vis.forEach(s => fittings(s, P, sk, st));     /* doors, buffet, van      */
    vis.forEach(s => farSeats(s, P));
    drawPax(P, sk);
    vis.forEach(s => aisle(s, P, sk));
    if (P.d > 0.12 && !tun && !st.atStop) sunPools(vis, P, sk);
    if (!player.seated) drawConductor(P);
    vis.forEach(s => nearSeats(s, P));
    marker(P);
    g.restore();

    foreground(P, sk, st);

    /* --- lamp bloom, tunnel wash, vignette --- */
    if (P.glow > 0.08 || tun > 0) {
      const vg = g.createLinearGradient(0, sy(CEIL), 0, sy(FLOOR));
      vg.addColorStop(0, LS.rgba(P.lamp, 0.07 * (P.glow + tun)));
      vg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = vg; g.fillRect(0, sy(CEIL), W, sy(FLOOR) - sy(CEIL));
    }
    const vig = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.30, W / 2, H / 2, Math.max(W, H) * 0.80);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.6)');
    g.fillStyle = vig; g.fillRect(0, 0, W, H);
  }

  /* --------------------------------------------------------------- track */
  function track(P, sk, st) {
    const railY = sy(RAIL), ballastTop = railY - 6 * S;
    /* ballast */
    const bg = g.createLinearGradient(0, ballastTop, 0, H);
    bg.addColorStop(0, LS.mix(P.dark, sk.night ? '#0a0c10' : '#4a4640', 0.42));
    bg.addColorStop(1, LS.mix(P.dark, sk.night ? '#050609' : '#26241f', 0.5));
    g.fillStyle = bg;
    g.fillRect(0, ballastTop, W, H - ballastTop);

    /* sleepers, moving with the ground */
    const gap = 22 * S;
    const off2 = (st.km * 1000 * 3) % gap;
    g.fillStyle = LS.mix('#1a1611', sk.night ? '#0a0b0e' : '#3b332a', 0.55);
    for (let x = -off2; x < W + gap; x += gap) g.fillRect(x, railY - 1 * S, 13 * S, 7 * S);

    /* far rail, then the head of the near rail catching the light */
    g.fillStyle = LS.mix('#2a2c31', sk.night ? '#12151b' : '#6d7076', 0.5);
    g.fillRect(0, railY - 2.5 * S, W, 2.2 * S);
    g.fillStyle = LS.rgba(sk.night ? '#7d8794' : '#cfd5da', 0.75);
    g.fillRect(0, railY - 2.5 * S, W, 0.9 * S);
  }

  /* --------------------------------------------------------- bogies etc */
  function bogieXs() {
    const out = [];
    for (const s of SEG) {
      if (s.t === 'vest') continue;
      const inset = Math.min(110, s.w * 0.24);
      out.push(s.x0 + inset, s.x1 - inset);
    }
    return out;
  }
  let _bogies = null;
  function runningGear(P, sk, st) {
    if (!_bogies) _bogies = bogieXs();
    const spin = st.km * 1000 / WHEEL_R;
    for (const bx of _bogies) {
      const x = sx(bx);
      if (x < -140 || x > W + 140) continue;
      /* bogie frame */
      g.fillStyle = LS.mix('#15181e', sk.night ? '#0b0d11' : '#33383f', 0.5);
      LS.roundRect(g, x - 40 * S, sy(AXLE - 20), 80 * S, 22 * S, 3 * S); g.fill();
      for (const d of [-26, 26]) {
        const wx = x + d * S, wy = sy(AXLE);
        g.fillStyle = LS.mix('#0e1116', sk.night ? '#07090c' : '#2b3037', 0.5);
        g.beginPath(); g.arc(wx, wy, WHEEL_R * S, 0, 7); g.fill();
        g.strokeStyle = LS.rgba(sk.night ? '#5e6874' : '#9aa2ac', 0.6);
        g.lineWidth = Math.max(1, 1.6 * S);
        g.beginPath(); g.arc(wx, wy, WHEEL_R * S * 0.94, 0, 7); g.stroke();
        /* one spoke, so the rotation reads */
        g.strokeStyle = LS.rgba(sk.night ? '#4a535e' : '#7d858f', 0.85);
        g.lineWidth = Math.max(1, 2.4 * S);
        g.beginPath();
        g.moveTo(wx + Math.cos(spin) * WHEEL_R * S * 0.75, wy + Math.sin(spin) * WHEEL_R * S * 0.75);
        g.lineTo(wx - Math.cos(spin) * WHEEL_R * S * 0.75, wy - Math.sin(spin) * WHEEL_R * S * 0.75);
        g.stroke();
        g.fillStyle = LS.rgba(sk.night ? '#3d454f' : '#6b727b', 0.9);
        g.beginPath(); g.arc(wx, wy, 3.4 * S, 0, 7); g.fill();
      }
    }
  }

  /* -------------------------------------------------- roof and body skirt */
  function shell(s, P, sk) {
    const a = sx(s.x0), b = sx(s.x1);
    /* Tuscan red with a cream waistline: an old long-distance livery, and dark
       enough that the train reads against a bright sky and a dark ballast. */
    const bodyCol = LS.mix('#3a1d1b', '#7d3a33', 0.15 + P.d * 0.55);
    const roofCol = LS.mix('#1e2126', '#5e6268', 0.12 + P.d * 0.5);
    const cream   = LS.mix('#5f5847', '#ddd2b2', 0.15 + P.d * 0.7);
    /* Roof: a flat band the whole length of the train with a shallow camber,
       not an arch per vehicle — an arch per vehicle reads as a row of humps. */
    /* air conditioning sits on the roof, so it is drawn first and the roof
       overlaps its base */
    if (s.t === 'car' || s.t === 'buffet') {
      for (let i = 0; i < 2; i++) {
        const px = sx(s.x0 + s.w * (0.28 + i * 0.42));
        g.fillStyle = LS.mix(roofCol, '#000', 0.30);
        LS.roundRect(g, px - 26 * S, sy(ROOF - 3), 52 * S, 12 * S, 2 * S); g.fill();
        g.fillStyle = LS.rgba('#fff', 0.08);
        g.fillRect(px - 26 * S, sy(ROOF - 3), 52 * S, 1.6 * S);
      }
    }
    /* roof: one flat cambered band the length of the train */
    const rg = g.createLinearGradient(0, sy(ROOF + 2), 0, sy(CEIL + 10));
    rg.addColorStop(0, LS.mix(roofCol, '#fff', 0.14));
    rg.addColorStop(0.55, roofCol);
    rg.addColorStop(1, LS.mix(roofCol, '#000', 0.34));
    g.fillStyle = rg;
    g.fillRect(a, sy(ROOF + 5), b - a, sy(CEIL + 4) - sy(ROOF + 5));
    g.beginPath();
    g.moveTo(a, sy(ROOF + 7));
    g.quadraticCurveTo((a + b) / 2, sy(ROOF + 1), b, sy(ROOF + 7));
    g.lineTo(b, sy(ROOF + 10)); g.lineTo(a, sy(ROOF + 10));
    g.closePath(); g.fill();
    /* cant rail, then the body side between roof and window band */
    g.fillStyle = bodyCol;
    g.fillRect(a, sy(CEIL + 4), b - a, sy(CEIL + 12) - sy(CEIL + 4));
    g.fillStyle = LS.rgba('#000', 0.3);
    g.fillRect(a, sy(CEIL + 4), b - a, 1.4 * S);
    /* skirt below the floor, with a livery stripe */
    const sg = g.createLinearGradient(0, sy(FLOOR + UNDER - 4), 0, sy(SOLE + 6));
    sg.addColorStop(0, bodyCol);
    sg.addColorStop(0.42, LS.mix(bodyCol, '#000', 0.28));
    sg.addColorStop(1, LS.mix(bodyCol, '#000', 0.66));
    g.fillStyle = sg;
    g.fillRect(a, sy(FLOOR + UNDER - 4), b - a, sy(SOLE + 6) - sy(FLOOR + UNDER - 4));
    /* the cream waistline, which is the whole point of a livery */
    g.fillStyle = cream;
    g.fillRect(a, sy(FLOOR + UNDER - 4), b - a, 3.2 * S);
    g.fillStyle = LS.rgba('#000', 0.22);
    g.fillRect(a, sy(FLOOR + UNDER - 1), b - a, 1 * S);
    if (s.t === 'car' || s.t === 'van') {
      g.fillStyle = LS.rgba(cream, 0.55);
      g.font = '600 ' + (5.6 * S).toFixed(1) + 'px "IBM Plex Mono",monospace';
      g.fillText('SLOW RAIL' + (s.code ? '  ·  ' + s.code : ''), a + 18 * S, sy(SOLE + 2));
    }
    /* the gap between vehicles */
    if (s.t === 'vest') {
      g.fillStyle = 'rgba(0,0,0,.55)';
      g.fillRect(a - 3 * S, sy(ROOF), 5 * S, sy(SOLE + 6) - sy(ROOF));
      g.fillRect(b - 2 * S, sy(ROOF), 5 * S, sy(SOLE + 6) - sy(ROOF));
    }
  }

  /* ---------------------------------------------------------- foreground
     The nearest few metres of the world cannot be resolved at line speed,
     so they are a smear across the bottom of frame. */
  function foreground(P, sk, st) {
    if (st.atStop) return;
    const y0 = sy(RAIL) + 10 * S;
    if (y0 > H) return;
    const fg = g.createLinearGradient(0, y0, 0, H);
    fg.addColorStop(0, 'rgba(6,7,10,0)');
    fg.addColorStop(0.35, LS.rgba(sk.night ? '#05070a' : '#171a1c', 0.72));
    fg.addColorStop(1, LS.rgba(sk.night ? '#040508' : '#0e1113', 0.95));
    g.fillStyle = fg; g.fillRect(0, y0, W, H - y0);
    /* Blurred lineside things going past far too fast to make out. */
    const bsm = (st.km * 1000 * 5.4);
    for (let i = -1; i < 6; i++) {
      const slot = Math.floor(bsm / (W * 0.55)) + i;
      if (LS.hash32('fgb' + slot) % 3) continue;
      const bx = W * 1.1 - ((bsm / (W * 0.55) - slot) * W * 1.1);
      const bw = W * (0.05 + LS.h01('fgw' + slot) * 0.13);
      const bh = (H - y0) * (0.4 + LS.h01('fgh' + slot) * 0.7);
      const bgd = g.createRadialGradient(bx, H, 0, bx, H, Math.max(bw, bh));
      bgd.addColorStop(0, LS.rgba(sk.night ? '#020305' : '#0b0e10', 0.75));
      bgd.addColorStop(0.7, LS.rgba(sk.night ? '#020305' : '#0b0e10', 0.4));
      bgd.addColorStop(1, LS.rgba(sk.night ? '#020305' : '#0b0e10', 0));
      g.fillStyle = bgd;
      g.beginPath(); g.ellipse(bx, H, bw, bh, 0, 0, 7); g.fill();
    }
    const smear = (st.km * 1000 * 4.2) % W;
    for (let i = 0; i < 150; i++) {
      const sd = LS.hash32('fg' + i);
      const y = y0 + LS.h01('fy' + i) * (H - y0);
      const len = 40 + (sd >>> 5) % 150;
      const x = ((LS.h01('fx' + i) * W - smear + W * 2) % W) - len / 2;
      g.fillStyle = 'rgba(' + (sk.night ? '120,130,145,' : '198,196,188,') +
        (0.04 + LS.h01('fa' + i) * 0.09).toFixed(3) + ')';
      g.fillRect(x, y, len, 1.6 * S);
    }
  }

  /* ---------------------------------------------------------- far wall */
  function farWall(s, P, sk, st, tun) {
    const a = sx(s.x0), b = sx(s.x1), top = sy(CEIL), bot = sy(FLOOR);
    const grad = g.createLinearGradient(0, top, 0, bot);
    grad.addColorStop(0, P.wallHi); grad.addColorStop(0.62, P.wall); grad.addColorStop(1, P.wallLo);
    g.fillStyle = grad;
    g.fillRect(a, top, b - a, bot - top);

    /* A panel joint every seat pitch, a waist rail under the windows, and a
       darker dado below it — otherwise the wall is a slab of beige. */
    g.strokeStyle = LS.rgba(P.dark, 0.3); g.lineWidth = 1;
    for (let x = s.x0; x < s.x1; x += PITCH) {
      g.beginPath(); g.moveTo(sx(x), sy(CEIL + 20)); g.lineTo(sx(x), bot); g.stroke();
    }
    const dg = g.createLinearGradient(0, sy(WIN_BOT + 6), 0, sy(FLOOR));
    dg.addColorStop(0, P.dado);
    dg.addColorStop(1, LS.mix(P.dado, '#000', 0.35));
    g.fillStyle = dg;
    g.fillRect(a, sy(WIN_BOT + 6), b - a, sy(FLOOR) - sy(WIN_BOT + 6));
    g.fillStyle = LS.rgba(P.wallHi, 0.9);
    g.fillRect(a, sy(WIN_BOT + 3), b - a, 3 * S);
    g.fillStyle = LS.rgba('#000', 0.4);
    g.fillRect(a, sy(WIN_BOT + 6), b - a, 1.4 * S);

    if (s.t === 'car' || s.t === 'buffet') {
      const rows = Math.floor((s.w - 40) / PITCH);
      for (let i = 0; i < rows; i++) {
        const wx0 = s.x0 + 30 + i * PITCH;
        windowPane(wx0, wx0 + WIN_W, P, sk, st, tun);
      }
    } else if (s.t === 'vest') {
      windowPane(s.x0 + 14, s.x0 + 46, P, sk, st, tun, true);
      windowPane(s.x1 - 46, s.x1 - 14, P, sk, st, tun, true);
    } else if (s.t === 'van') {
      windowPane(s.x0 + 40, s.x0 + 40 + WIN_W, P, sk, st, tun);
      windowPane(s.x1 - 90, s.x1 - 90 + WIN_W, P, sk, st, tun);
    }
  }

  function windowPane(wa, wb, P, sk, st, tun, small) {
    const x = sx(wa), w = (wb - wa) * S;
    const yt = sy(small ? WIN_TOP + 6 : WIN_TOP), yb = sy(small ? WIN_BOT - 8 : WIN_BOT);
    if (x + w < -20 || x > W + 20) return;

    g.save();
    LS.roundRect(g, x, yt, w, yb - yt, 5 * S * 0.4);
    g.clip();
    /* The country, drawn in screen space and shifted very slightly by where
       you are standing — enough to feel like parallax, not enough to lie. */
    const ox = -(camX * 0.05) % off.width;
    g.drawImage(off, ox, yt - (off.height - (yb - yt)) * 0.42, off.width, off.height);
    g.drawImage(off, ox + off.width, yt - (off.height - (yb - yt)) * 0.42, off.width, off.height);
    /* Glass: a reflection of the interior, strongest at night. */
    const refl = 0.04 + Math.pow(1 - P.d, 2) * 0.46 + tun * 0.42;
    g.fillStyle = LS.rgba(P.lamp, refl * 0.10);
    g.fillRect(x, yt, w, yb - yt);
    g.fillStyle = LS.rgba(P.lamp, refl * 0.16);
    g.fillRect(x + w * 0.12, yt + (yb - yt) * 0.18, w * 0.3, (yb - yt) * 0.5);
    const gl = g.createLinearGradient(x, yt, x, yb);
    gl.addColorStop(0, 'rgba(255,255,255,.13)');
    gl.addColorStop(0.3, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.fillRect(x, yt, w, yb - yt);
    g.restore();

    g.strokeStyle = P.metal; g.lineWidth = Math.max(1, 2 * S * 0.5);
    LS.roundRect(g, x, yt, w, yb - yt, 5 * S * 0.4); g.stroke();
    g.strokeStyle = LS.rgba(P.dark, 0.5); g.lineWidth = 1;
    LS.roundRect(g, x - 1, yt - 1, w + 2, yb - yt + 2, 5 * S * 0.4); g.stroke();
  }

  /* -------------------------------------------------------- ceiling etc */
  function upper(s, P, sk) {
    const a = sx(s.x0), b = sx(s.x1);
    const cy = sy(CEIL), lampY = sy(CEIL + 9);
    const cg = g.createLinearGradient(0, sy(CEIL), 0, sy(CEIL + 20));
    cg.addColorStop(0, LS.mix(P.ceil, '#fff', 0.06));
    cg.addColorStop(1, LS.mix(P.ceil, '#000', 0.22));
    g.fillStyle = cg;
    g.fillRect(a, sy(CEIL), b - a, sy(CEIL + 20) - cy);
    /* Continuous lighting strip. */
    g.fillStyle = LS.rgba(P.lamp, 0.85);
    g.fillRect(a, lampY, b - a, 3.2 * S);
    const bloom = g.createLinearGradient(0, lampY, 0, lampY + 46 * S);
    bloom.addColorStop(0, LS.rgba(P.lamp, 0.20 * (0.4 + P.glow)));
    bloom.addColorStop(1, LS.rgba(P.lamp, 0));
    g.fillStyle = bloom; g.fillRect(a, lampY, b - a, 46 * S);

    if (s.t === 'car' || s.t === 'buffet') {
      /* Luggage rack with the occasional bag on it. */
      g.fillStyle = P.metal;
      g.fillRect(a + 6 * S, sy(RACK_Y), b - a - 12 * S, 3 * S);
      g.fillStyle = LS.rgba(P.dark, 0.5);
      g.fillRect(a + 6 * S, sy(RACK_Y) + 3 * S, b - a - 12 * S, 1.4 * S);
      const rows = Math.floor((s.w - 40) / PITCH);
      for (let i = 0; i < rows; i++) {
        const h = LS.hash32('bag' + s.x0 + i);
        if (h % 3) continue;
        const bx = sx(s.x0 + 34 + i * PITCH), bw = (16 + h % 18) * S, bh = (10 + (h >>> 5) % 9) * S;
        g.fillStyle = ['#3d3630', '#2f3a44', '#4a3a34', '#333a33'][(h >>> 9) % 4];
        LS.roundRect(g, bx, sy(RACK_Y) - bh, bw, bh, 2 * S); g.fill();
        g.fillStyle = LS.rgba('#000', 0.25);
        g.fillRect(bx, sy(RACK_Y) - bh * 0.42, bw, 1.6 * S);
      }
    }
  }

  /* ------------------------------------------------------- per-segment */
  function fittings(s, P, sk, st) {
    const a = sx(s.x0), b = sx(s.x1);
    if (s.t === 'vest') {
      /* Doors with rubber gaiters, a grab pole, a bin, a handset. */
      const dw = 42 * S, dx = sx(s.x0 + s.w / 2) - dw / 2;
      g.fillStyle = LS.mix(P.wallLo, '#000', 0.25);
      g.fillRect(dx - 4 * S, sy(CEIL + 10), dw + 8 * S, sy(FLOOR) - sy(CEIL + 10));
      const dOpen = st.doorsOpen ? 1 : 0;
      g.fillStyle = P.metal;
      g.fillRect(dx - dOpen * dw * 0.44, sy(CEIL + 14), dw * 0.48, sy(FLOOR) - sy(CEIL + 14));
      g.fillRect(dx + dw * 0.52 + dOpen * dw * 0.44, sy(CEIL + 14), dw * 0.48, sy(FLOOR) - sy(CEIL + 14));
      if (st.doorsOpen) {
        /* An open door is a hole in the train: you can see the platform. */
        g.save();
        g.beginPath();
        g.rect(dx + dw * 0.02, sy(CEIL + 16), dw * 0.96, sy(FLOOR) - sy(CEIL + 16));
        g.clip();
        g.drawImage(off, 0, 0, W, H);
        g.fillStyle = LS.rgba('#000', 0.22);
        g.fillRect(dx, sy(CEIL + 16), dw, sy(FLOOR) - sy(CEIL + 16));
        g.restore();
        g.fillStyle = LS.rgba('#000', 0.5);
        g.fillRect(dx + dw * 0.02, sy(CEIL + 16), dw * 0.96, 2.4 * S);
      } else {
        g.fillStyle = LS.rgba(P.wall, 0.9);
        g.fillRect(dx + dw * 0.2, sy(WIN_TOP + 2), dw * 0.6, (WIN_BOT - WIN_TOP - 14) * S);
      }
      g.strokeStyle = LS.rgba('#d8b23c', st.doorsOpen ? 0.9 : 0.35);
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(dx - 6 * S, sy(FLOOR) - 2); g.lineTo(dx + dw + 6 * S, sy(FLOOR) - 2); g.stroke();
      /* grab pole */
      g.fillStyle = P.metal;
      g.fillRect(sx(s.x0 + 18), sy(CEIL + 12), 2.6 * S, sy(FLOOR) - sy(CEIL + 12));
      /* bin */
      g.fillStyle = LS.mix(P.metal, '#000', 0.35);
      LS.roundRect(g, sx(s.x1 - 34), sy(-42), 18 * S, 42 * S, 3 * S); g.fill();
    }
    if (s.t === 'buffet') {
      const cx = sx(1700 + 210), cw = 120 * S;
      g.fillStyle = LS.mix(P.wall, '#241c14', 0.45);
      g.fillRect(cx, sy(-58), cw, 58 * S);
      g.fillStyle = LS.mix(P.cloth, '#fff', 0.25);
      g.fillRect(cx - 4 * S, sy(-62), cw + 8 * S, 5 * S);
      /* urn, cups, a menu board nobody reads */
      g.fillStyle = P.metal;
      LS.roundRect(g, cx + 12 * S, sy(-84), 16 * S, 23 * S, 2 * S); g.fill();
      g.fillStyle = LS.rgba('#e8ddc8', 0.85);
      for (let i = 0; i < 5; i++) g.fillRect(cx + (44 + i * 8) * S, sy(-70), 5 * S, 8 * S);
      /* the menu board, up on the bulkhead where it does not sit over a window */
      g.fillStyle = LS.mix(P.dark, '#000', 0.2);
      LS.roundRect(g, cx + cw * 0.40, sy(-138), 66 * S, 26 * S, 2 * S); g.fill();
      g.fillStyle = LS.rgba(P.lamp, 0.55);
      g.font = (5 * S).toFixed(1) + 'px "IBM Plex Mono",monospace';
      g.fillText('TEA   COFFEE', cx + cw * 0.435, sy(-130));
      g.fillText('PIE   LAMINGTON', cx + cw * 0.435, sy(-123.5));
      g.fillStyle = LS.rgba(P.lamp, 0.3);
      g.fillText('closed 0200-0530', cx + cw * 0.435, sy(-117));
    }
    if (s.t === 'van') {
      /* A desk, a clipboard, boxes, and a bicycle that is not yours. */
      g.fillStyle = LS.mix(P.wall, '#2a2018', 0.5);
      g.fillRect(sx(s.x0 + 140), sy(-56), 90 * S, 56 * S);
      g.fillStyle = LS.mix(P.cloth, '#fff', 0.1);
      g.fillRect(sx(s.x0 + 136), sy(-60), 98 * S, 5 * S);
      g.fillStyle = '#e6e0d0';
      g.save(); g.translate(sx(s.x0 + 168), sy(-62)); g.rotate(-0.12);
      g.fillRect(0, -26 * S, 20 * S, 26 * S);
      g.fillStyle = LS.rgba('#8a8272', 0.8);
      for (let i = 0; i < 5; i++) g.fillRect(2 * S, (-23 + i * 5) * S, 16 * S, 1 * S);
      g.restore();
      for (let i = 0; i < 4; i++) {
        const h = LS.hash32('box' + i);
        g.fillStyle = ['#5a4b38', '#4a4030', '#54452f'][(h) % 3];
        const bw = (22 + h % 14) * S, bh = (16 + (h >>> 4) % 12) * S;
        g.fillRect(sx(s.x0 + 250 + i * 26), sy(0) - bh, bw, bh);
      }
      g.strokeStyle = P.metal; g.lineWidth = 1.6;
      g.beginPath(); g.arc(sx(s.x0 + 60), sy(-44), 15 * S, 0, 7); g.stroke();
      g.beginPath(); g.arc(sx(s.x0 + 96), sy(-44), 15 * S, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(sx(s.x0 + 60), sy(-44)); g.lineTo(sx(s.x0 + 80), sy(-70));
      g.lineTo(sx(s.x0 + 96), sy(-44)); g.stroke();
    }
    if (s.t === 'cab') {
      g.fillStyle = LS.mix(P.wallLo, '#000', 0.3);
      g.fillRect(sx(s.x1 - 44), sy(CEIL + 12), 44 * S, sy(FLOOR) - sy(CEIL + 12));
      g.fillStyle = LS.rgba('#d8b23c', 0.7);
      g.font = '600 ' + (6 * S).toFixed(1) + 'px "IBM Plex Mono",monospace';
      g.save(); g.translate(sx(s.x1 - 22), sy(-70)); g.rotate(-Math.PI / 2);
      g.textAlign = 'center'; g.fillText('NO ENTRY', 0, 0); g.restore();
      g.textAlign = 'left';
    }
    /* Signage: which car you are in. */
    if (s.name) {
      g.fillStyle = LS.rgba(P.lamp, 0.20);
      g.font = '600 ' + (7 * S).toFixed(1) + 'px "IBM Plex Mono",monospace';
      g.textAlign = 'center';
      g.fillText(s.name.toUpperCase(), sx((s.x0 + s.x1) / 2), sy(CEIL + 14));
      g.textAlign = 'left';
    }
    if (s.quiet) {
      g.fillStyle = LS.rgba(P.lamp, 0.13);
      g.font = (5.5 * S).toFixed(1) + 'px "IBM Plex Mono",monospace';
      g.textAlign = 'center';
      g.fillText('please keep noise to a minimum', sx((s.x0 + s.x1) / 2), sy(CEIL + 23));
      g.textAlign = 'left';
    }
  }

  /* ---------------------------------------------------------- the seats */
  function farSeats(s, P) {
    if (s.t !== 'car' && s.t !== 'buffet') return;
    const rows = SEAT_ROWS(s);
    for (let r = 0; r < rows; r++) {
      const x = sx(seatX(s, r) - 24), w = 44 * S;
      if (x + w < -20 || x > W + 20) continue;
      const top = sy(SEAT_TOP), bot = sy(-6);
      const gr = g.createLinearGradient(0, top, 0, bot);
      gr.addColorStop(0, P.seatHi); gr.addColorStop(1, P.seat);
      g.fillStyle = gr;
      LS.roundRect(g, x, top, w, bot - top, 6 * S * 0.45); g.fill();
      /* headrest cover */
      g.fillStyle = LS.rgba(P.cloth, 0.9);
      LS.roundRect(g, x + 3 * S, top + 2 * S, w - 6 * S, 13 * S, 2 * S); g.fill();
      g.fillStyle = LS.rgba(P.dark, 0.18);
      g.fillRect(x, sy(-30), w, 1.4 * S);
      /* the tray table on the back of 12A's seat, with the laptop on it */
      if (s.desk && Math.abs(seatX(s, r) - (CARC.x0 + 250)) < 4) tray(seatX(s, r), P);
    }
  }
  function tray(wx, P) {
    const x = sx(wx + 20), y = sy(-46);
    g.fillStyle = LS.mix(P.cloth, '#2a2620', 0.55);
    LS.roundRect(g, x, y, 34 * S, 3.4 * S, 1.4 * S); g.fill();
    /* laptop, lid open, screen facing away — a rectangle of light on the wall */
    g.fillStyle = '#20242c';
    g.save();
    g.translate(x + 5 * S, y);
    g.transform(1, 0, -0.22, 1, 0, 0);
    g.fillRect(0, -20 * S, 24 * S, 20 * S);
    g.restore();
    g.fillStyle = LS.rgba('#8fbfe6', 0.5 + Math.sin(t * 3) * 0.04);
    g.save();
    g.translate(x + 5 * S, y);
    g.transform(1, 0, -0.22, 1, 0, 0);
    g.fillRect(1.5 * S, -18.5 * S, 21 * S, 17 * S);
    g.restore();
    g.fillStyle = '#2a2f38';
    g.fillRect(x + 2 * S, y - 1.6 * S, 28 * S, 2.2 * S);
  }
  function nearSeats(s, P) {
    if (s.t !== 'car' && s.t !== 'buffet') return;
    const rows = SEAT_ROWS(s);
    /* Offset half a pitch so the near row interleaves with the far one. */
    for (let r = -1; r <= rows; r++) {
      const wx = seatX(s, r) + PITCH / 2;
      const x = sx(wx - 22), w = 44 * S;
      if (x + w < -30 || x > W + 30) continue;
      const top = sy(-50), bot = sy(FLOOR + 15);
      const gr = g.createLinearGradient(0, top, 0, bot);
      gr.addColorStop(0, LS.mix(P.seatNear, '#000', 0.15));
      gr.addColorStop(1, LS.mix(P.seatNear, '#000', 0.62));
      g.fillStyle = gr;
      LS.roundRect(g, x, top, w, bot - top, 7 * S * 0.45); g.fill();
      /* a headrest cover catching the lamp, so it is not a black slab */
      g.fillStyle = LS.rgba(P.cloth, 0.26 + (r % 2) * 0.08);
      LS.roundRect(g, x + 4 * S, top + 3 * S, w - 8 * S, 9 * S, 2.5 * S); g.fill();
      g.fillStyle = LS.rgba('#000', 0.35);
      g.fillRect(x, top + 17 * S, w, 1.2 * S);
      /* the light down one edge tells you these are nearer than the others */
      g.fillStyle = LS.rgba(P.lamp, 0.05 + P.d * 0.05);
      g.fillRect(x + w - 3 * S, top + 2 * S, 2 * S, (bot - top) - 6 * S);
    }
  }

  /* ---------------------------------------------------------- the aisle */
  function aisle(s, P, sk) {
    const a = sx(s.x0), b = sx(s.x1);
    const fy = sy(FLOOR);
    const gr = g.createLinearGradient(0, fy - 4 * S, 0, fy + UNDER * S);
    gr.addColorStop(0, P.floorHi); gr.addColorStop(1, P.floor);
    g.fillStyle = gr;
    g.fillRect(a, fy - 4 * S, b - a, (UNDER + 4) * S);
    /* a runner down the middle of the aisle, and the joins between cars */
    g.fillStyle = LS.rgba(P.dark, 0.22);
    g.fillRect(a, fy + 13 * S, b - a, 3 * S);
    if (s.t === 'vest') {
      g.fillStyle = LS.rgba(P.dark, 0.55);
      g.fillRect(a - 2, fy - 4 * S, 4, (UNDER + 4) * S);
      g.fillRect(b - 2, fy - 4 * S, 4, (UNDER + 4) * S);
    }
  }

  /* Daylight lands on the floor in a row of parallelograms that slide as the
     line curves. It is the single cheapest way to say "the sun is out". */
  function sunPools(vis, P, sk) {
    const skew = Math.sin(sunPhase) * 26;
    g.save();
    g.globalCompositeOperation = 'lighter';
    vis.forEach(s => {
      if (s.t !== 'car' && s.t !== 'buffet') return;
      const rows = Math.floor((s.w - 40) / PITCH);
      for (let i = 0; i < rows; i++) {
        const wx = s.x0 + 30 + i * PITCH + WIN_W / 2;
        const px = sx(wx + skew), pw = WIN_W * 1.25 * S;
        if (px + pw < 0 || px > W) continue;
        const grd = g.createLinearGradient(0, sy(-30), 0, sy(FLOOR + 16));
        grd.addColorStop(0, LS.rgba('#ffe9c0', 0.02 * P.d));
        grd.addColorStop(1, LS.rgba('#ffe9c0', 0.13 * P.d));
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(px - pw / 2, sy(-34));
        g.lineTo(px + pw / 2, sy(-34));
        g.lineTo(px + pw / 2 + 16 * S, sy(FLOOR + 14));
        g.lineTo(px - pw / 2 + 16 * S, sy(FLOOR + 14));
        g.closePath(); g.fill();
      }
    });
    g.restore();
  }

  /* ------------------------------------------------------------- people */
  function drawPax(P, sk) {
    for (const p of pax) {
      const x = sx(p.x);
      if (x < -40 || x > W + 40) continue;
      const seated = p.state === 'seated';
      const breathe = Math.sin(t * 1.1 + p.phase) * 0.7;
      if (seated) {
        const hy = sy(-92 + breathe);
        /* Only the head and shoulders clear the seat back. */
        g.fillStyle = p.coat;
        LS.roundRect(g, x - 11 * S, hy + 6 * S, 22 * S, 22 * S, 5 * S); g.fill();
        const tilt = p.pose === 'sleep' ? 0.42 : p.pose === 'window' ? -0.2 : p.pose === 'read' ? 0.24 : 0;
        g.save();
        g.translate(x, hy);
        g.rotate(tilt);
        g.fillStyle = p.skin;
        g.beginPath(); g.arc(0, 0, 8.4 * S, 0, 7); g.fill();
        g.fillStyle = p.hair;
        g.beginPath(); g.arc(0, -1.6 * S, 8.4 * S, Math.PI * 1.02, Math.PI * 2.05); g.fill();
        g.restore();
        if (p.pose === 'read') {
          g.fillStyle = LS.rgba('#e8e0cc', 0.9);
          g.save(); g.translate(x - 16 * S, hy + 16 * S); g.rotate(-0.5);
          g.fillRect(0, 0, 15 * S, 11 * S); g.restore();
        }
        if (p.pose === 'phone') {
          g.fillStyle = LS.rgba('#9fd4ff', 0.75);
          g.fillRect(x - 15 * S, hy + 11 * S, 6 * S, 9 * S);
          g.fillStyle = LS.rgba('#9fd4ff', 0.10);
          g.beginPath(); g.arc(x - 12 * S, hy + 15 * S, 15 * S, 0, 7); g.fill();
        }
        if (p.pose === 'sleep') {
          g.fillStyle = LS.rgba(P.lamp, 0.30);
          g.font = (7 * S).toFixed(1) + 'px "IBM Plex Mono",monospace';
          g.fillText('z', x + 12 * S, hy - 9 * S - (t * 6 % 10) * S * 0.5);
        }
        if (p.wants) {
          const bob2 = Math.sin(t * 4) * 2 * S;
          g.fillStyle = LS.rgba('#e0903f', 0.95);
          g.beginPath(); g.arc(x + 15 * S, hy - 14 * S + bob2, 7 * S, 0, 7); g.fill();
          g.fillStyle = '#15171c';
          g.font = '700 ' + (9 * S).toFixed(1) + 'px "IBM Plex Mono",monospace';
          g.textAlign = 'center';
          g.fillText('?', x + 15 * S, hy - 11 * S + bob2);
          g.textAlign = 'left';
        }
      } else {
        /* Standing in the aisle, with luggage, going somewhere slowly. */
        const sw = Math.sin(p.phase) * 5 * S;
        g.strokeStyle = LS.mix(p.coat, '#000', 0.5); g.lineWidth = 4 * S;
        g.beginPath(); g.moveTo(x, sy(-48)); g.lineTo(x + sw, sy(FLOOR)); g.stroke();
        g.beginPath(); g.moveTo(x, sy(-48)); g.lineTo(x - sw, sy(FLOOR)); g.stroke();
        g.fillStyle = p.coat;
        LS.roundRect(g, x - 10 * S, sy(-100), 20 * S, 54 * S, 6 * S); g.fill();
        g.fillStyle = p.skin;
        g.beginPath(); g.arc(x, sy(-110), 8.4 * S, 0, 7); g.fill();
        g.fillStyle = p.hair;
        g.beginPath(); g.arc(x, sy(-111.6), 8.4 * S, Math.PI * 1.02, Math.PI * 2.05); g.fill();
        g.fillStyle = LS.mix(p.coat, '#000', 0.4);
        g.fillRect(x + 12 * S, sy(-34), 14 * S, 22 * S);
      }
    }
  }

  /* ---------------------------------------------------------------- you */
  function drawConductor(P) {
    const x = sx(player.x), f = player.face;
    const moving = Math.abs(player.vx) > 1;
    const sw = moving ? Math.sin(player.phase) * 9 * S : Math.sin(t * 1.3) * 1.2 * S;
    const lift = moving ? Math.abs(Math.sin(player.phase * 2)) * 2.2 * S : 0;

    g.save();
    g.translate(x, -lift);
    /* legs */
    g.strokeStyle = '#191d26'; g.lineWidth = 5.2 * S; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, sy(-52)); g.lineTo(sw, sy(FLOOR) - 1); g.stroke();
    g.beginPath(); g.moveTo(0, sy(-52)); g.lineTo(-sw, sy(FLOOR) - 1); g.stroke();
    /* coat */
    g.fillStyle = '#1e2634';
    LS.roundRect(g, -11 * S, sy(-104), 22 * S, 60 * S, 6 * S); g.fill();
    g.fillStyle = LS.rgba('#4b5568', 0.9);
    g.fillRect(-11 * S, sy(-104), 22 * S, 3 * S);
    /* hi-vis band, because there is a policy about it */
    g.fillStyle = 'rgba(214,226,86,.85)';
    g.fillRect(-11 * S, sy(-76), 22 * S, 4.6 * S);
    g.fillStyle = 'rgba(214,226,86,.35)';
    g.fillRect(-11 * S, sy(-68), 22 * S, 2.2 * S);
    /* arm */
    g.strokeStyle = '#1e2634'; g.lineWidth = 4.4 * S;
    g.beginPath(); g.moveTo(f * 6 * S, sy(-98)); g.lineTo(f * 8 * S - sw * 0.6, sy(-62)); g.stroke();
    /* head and cap */
    g.fillStyle = '#e0b189';
    g.beginPath(); g.arc(0, sy(-112), 8.2 * S, 0, 7); g.fill();
    /* the cap: a low crown and a peak, not a helmet */
    g.fillStyle = '#171d28';
    g.beginPath(); g.arc(0, sy(-116), 8.3 * S, Math.PI * 1.06, Math.PI * 1.98); g.fill();
    g.fillRect(-8.3 * S, sy(-117.5), 16.6 * S, 3 * S);
    g.fillStyle = '#0f141d';
    g.beginPath();
    g.moveTo(f * 1 * S, sy(-117.5));
    g.lineTo(f * 13 * S, sy(-116.4));
    g.lineTo(f * 13 * S, sy(-114.6));
    g.lineTo(f * 1 * S, sy(-114.5));
    g.closePath(); g.fill();
    g.restore();
    g.lineCap = 'butt';
  }

  /* --------------------------------------------------------- the marker */
  function marker(P) {
    const h = nearest();
    if (!h || player.seated) return;
    const x = sx(h.x), y = sy(-132) + Math.sin(t * 2.4) * 2.5 * S;
    g.fillStyle = LS.rgba('#e0903f', 0.9);
    g.beginPath();
    g.moveTo(x, y + 8 * S); g.lineTo(x - 5 * S, y); g.lineTo(x + 5 * S, y);
    g.closePath(); g.fill();
    g.fillStyle = LS.rgba('#e0903f', 0.16);
    g.beginPath(); g.ellipse(x, sy(FLOOR) + 2, 20 * S, 5 * S, 0, 0, 7); g.fill();
  }

  return {
    init, update, draw, setKey, walkTo, nearest, player, SEG, WORLD_W, HOT,
    stationChange, seedPax,
    pax: () => pax,
    screenX: wx => sx(wx),
    hotAtScreen(px) {
      /* Which hotspot did they tap? Anything within a finger of it. */
      let best = null, bd = 34 * S;
      for (const h of HOT) { const d = Math.abs(sx(h.x) - px); if (d < bd) { bd = d; best = h; } }
      for (const p of pax) if (p.wants && p.state === 'seated') {
        const d = Math.abs(sx(p.x) - px);
        if (d < bd) { bd = d; best = { id: 'pax:' + p.id, x: p.x, label: 'Seat ' + p.seat, verb: 'See what they want', pax: p }; }
      }
      return best;
    },
    worldXAtScreen: px => camX + (px - W / 2) / S,
    segAt, scale: () => S
  };
})();

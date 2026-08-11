"use strict";
/* =========================================================================
   THE LONG SERVICE — a slow-TV train, played in real time.

   The through service from the top of Norway to the bottom, operated under
   contract by an Australian operator, which explains the buffet car. You are
   the conductor. The run takes 41 hours 12 minutes and it takes them whether
   or not you are watching. Nothing happens. That is the timetable, not an
   oversight.
   ========================================================================= */
const TRAIN = (function () {

  const TT_SEED = 20260811;               // the timetable is the timetable
  const TOTAL_MIN = 41 * 60 + 12;         // 41 h 12 m, Nordkapp to Lindesnes
  const TOTAL_MS = TOTAL_MIN * 60000;

  /* Real places, roughly in order, down the spine of the country. */
  const STOPS = [
    ['Nordkapp', 0], ['Honningsvåg', 34], ['Olderfjord', 128], ['Lakselv', 176],
    ['Karasjok', 250], ['Alta', 388], ['Kautokeino', 517], ['Máze', 570],
    ['Skibotn', 726], ['Nordkjosbotn', 795], ['Setermoen', 895], ['Bardufoss', 940],
    ['Narvik', 1108], ['Fauske', 1345], ['Rognan', 1385], ['Mo i Rana', 1505],
    ['Mosjøen', 1595], ['Grong', 1745], ['Steinkjer', 1840], ['Trondheim', 1962],
    ['Oppdal', 2080], ['Dombås', 2148], ['Otta', 2196], ['Lillehammer', 2265],
    ['Hamar', 2323], ['Oslo S', 2450], ['Drammen', 2492], ['Kongsberg', 2534],
    ['Bø', 2600], ['Nordagutu', 2628], ['Neslandsvatn', 2716], ['Kristiansand', 2822],
    ['Mandal', 2865], ['Lindesnes', 2900]
  ];

  const CARS = [
    { n: 'Loco',        d: 'not your business' },
    { n: 'Car A',       d: 'unreserved' },
    { n: 'Car B',       d: 'unreserved' },
    { n: 'Quiet Car',   d: 'no phone calls' },
    { n: 'Buffet',      d: 'closed 0200–0530' },
    { n: 'Car D',       d: 'reserved' },
    { n: 'Guard’s Van', d: 'yours' }
  ];

  const PAX_DOING = [
    'asleep', 'asleep, upright', 'asleep, not upright', 'reading a paperback',
    'looking out the window', 'has been looking out the window for some time',
    'doing a crossword', 'doing the same crossword', 'eating a sandwich, slowly',
    'on a phone call in the quiet car', 'has stopped the phone call',
    'watching something on a laptop with 4% battery', 'knitting',
    'has taken their shoes off', 'has put their shoes back on',
    'staring at the seat in front', 'talking to a stranger about the weather',
    'no longer talking to the stranger', 'making a cup of tea last an hour',
    'has moved seats for no visible reason', 'has moved back',
    'has an unread book open on their lap', 'is pretending to be asleep'
  ];

  const NOTHING = [
    'The train continues.',
    'A hill goes past.',
    'The same hill goes past again, from a different angle.',
    'A window rattles and then stops rattling.',
    'The heating comes on in car B.',
    'The heating goes off in car B.',
    'Someone in car A coughs once.',
    'A paper cup rolls two metres and stops.',
    'The light changes very slightly.',
    'A level crossing goes past. There is nobody at it.',
    'A shed.',
    'Another shed.',
    'A lake, briefly.',
    'The rails change note over a bridge, then change back.',
    'A bird keeps pace with the train for eleven seconds.',
    'Snow, then no snow.',
    'A road runs alongside for a while and then does not.',
    'A red house with a white door.',
    'Nothing.',
    'Still nothing.',
    'The driver sounds the horn for a crossing. Nobody looks up.',
    'A power line dips and rises, dips and rises.',
    'The buffet trolley does not come.',
    'The buffet trolley comes and passes without stopping.',
    'You check your watch against the clock in car D. They agree.',
    'You straighten a headrest cover.',
    'Someone asks if this is the right train. It is.',
    'A passenger looks at you as though about to speak, and does not.'
  ];

  const ANNOUNCE_OPEN = [
    'G’day folks,', 'Ladies and gentlemen,', 'Morning all,', 'Afternoon everyone,',
    'Sorry to interrupt,', 'Just a quick one,'
  ];
  const ANNOUNCE_MID = [
    'we’ll shortly be arriving at', 'we are now approaching', 'next stop is',
    'coming up in a few minutes is', 'we’re running into'
  ];
  const ANNOUNCE_END = [
    'Please mind the gap and take all your belongings with you.',
    'The buffet remains open for hot drinks and a limited selection of sandwiches.',
    'We’re running about four minutes down, which we expect to make up.',
    'Please remember this is a quiet carriage.',
    'Thanks for travelling with us today.',
    'The doors will be released on the left-hand side.',
    'Anyone continuing south, you’re fine to stay where you are.'
  ];

  const TEA = [
    'You make a cup of tea in the guard’s van. It is too hot to drink for nine minutes.',
    'You make a cup of tea. It goes cold while you are answering a question about the buffet.',
    'You make a cup of tea and drink all of it, which is rare.',
    'You make a cup of tea. It is fine.'
  ];

  /* ================================================================ state */
  const DEFAULTS = {
    start: 0, car: 6, log: [], ach: {}, lastStop: -1, walkTo: -1,
    busyLabel: '', busyUntil: 0,
    c: { paces: 0, tickets: 0, announcements: 0, questions: 0, teas: 0, windows: 0,
         watched: 0, watchMs: 0, nothings: 0, incidents: 0, sessions: 0 },
    lastSeen: 0
  };

  let ST, S, ach, root, opts = {}, tt = [], dirty = true, cv = null, lastNothing = 0;

  /* ============================================================ timetable */
  function buildTimetable() {
    const r = SW.rng(TT_SEED);
    const legs = [];
    for (let i = 1; i < STOPS.length; i++) {
      const km = STOPS[i][1] - STOPS[i - 1][1];
      legs.push({ km, w: km * (0.82 + r() * 0.42) + 8 });      // gentle jitter, never zero
    }
    const dwell = legs.map((l, i) => (i % 7 === 3 ? 9 : (i % 3 === 0 ? 5 : 2)));
    const dwellTotal = dwell.reduce((a, b) => a + b, 0);
    const runTotal = TOTAL_MIN - dwellTotal;
    const wSum = legs.reduce((a, l) => a + l.w, 0);
    let t = 0;
    const out = [{ name: STOPS[0][0], km: 0, arrive: 0, depart: 0 }];
    legs.forEach((l, i) => {
      const run = l.w / wSum * runTotal;
      const arrive = t + run;
      const dep = arrive + dwell[i];
      out.push({ name: STOPS[i + 1][0], km: STOPS[i + 1][1], arrive, depart: dep, run, dwell: dwell[i] });
      t = dep;
    });
    out[out.length - 1].depart = out[out.length - 1].arrive;   // terminates
    return out;
  }

  /* ================================================================ clock */
  const elapsed = () => Math.max(0, Date.now() - S.start);
  const elapsedMin = () => elapsed() / 60000;
  const arrived = () => elapsed() >= TOTAL_MS;

  /* Where the train is now: which leg, how far along it, and how fast. */
  function where() {
    const m = Math.min(elapsedMin(), TOTAL_MIN);
    let i = 0;
    for (let k = 0; k < tt.length; k++) if (m >= tt[k].arrive) i = k;
    const here = tt[i];
    if (m < here.depart) {
      return { idx: i, km: here.km, speed: 0, atStop: true, next: tt[i + 1] || null,
               dwellLeft: (here.depart - m) * 60000, station: here };
    }
    const nxt = tt[i + 1];
    if (!nxt) return { idx: i, km: here.km, speed: 0, atStop: true, next: null, dwellLeft: 0, station: here };
    const f = (m - here.depart) / Math.max(0.001, nxt.arrive - here.depart);
    const km = here.km + (nxt.km - here.km) * f;
    /* Speed eases in and out of every stop, which is most of what a train does. */
    const cruise = (nxt.km - here.km) / Math.max(0.001, (nxt.arrive - here.depart) / 60);
    const ease = Math.min(1, Math.sin(Math.min(1, Math.max(0, f)) * Math.PI) * 2.2);
    return { idx: i, km, speed: cruise * ease * 1.18, atStop: false, next: nxt,
             toNextMs: (nxt.arrive - m) * 60000, f, station: here };
  }

  /* Tunnels are a fixed feature of the line, not a random event. */
  function tunnelAt(km) {
    const seg = Math.floor(km / 17);
    const h = SW.hash32('tun' + seg) / 4294967296;
    if (h > 0.34) return 0;
    const start = seg * 17 + h * 12;
    const len = 0.25 + (SW.hash32('len' + seg) % 1000) / 1000 * 2.4;   // 250 m – 2.6 km
    return (km >= start && km <= start + len) ? (km - start) / len : 0;
  }
  const inTunnel = () => { const w = where(); return !w.atStop && tunnelAt(w.km) > 0; };

  function weatherAt(km) {
    const h = SW.hash32('wx' + Math.floor(km / 90)) / 4294967296;
    const lat = km / 2900;
    if (h < 0.18) return lat < 0.45 ? 'snow' : 'rain';
    if (h < 0.42) return 'cloud';
    return 'clear';
  }
  function biomeAt(km) {
    const f = km / 2900;
    if (f < 0.13) return 0;      // arctic coast
    if (f < 0.30) return 1;      // fell and tundra
    if (f < 0.52) return 2;      // taiga
    if (f < 0.68) return 3;      // fjord and mountain
    if (f < 0.86) return 4;      // valley farmland
    return 5;                    // southern coast
  }
  const BIOME_NAME = ['Arctic coast', 'Fell and tundra', 'Taiga', 'Fjord country', 'Valley farmland', 'Southern coast'];

  /* ================================================================== log */
  function log(cls, text) {
    S.log.push({ c: cls, t: Date.now(), x: text });
    if (S.log.length > 260) S.log.splice(0, S.log.length - 260);
    dirty = true;
  }
  const stampOf = ms => { const d = new Date(ms); return SW.pad2(d.getHours()) + ':' + SW.pad2(d.getMinutes()); };

  /* ============================================================ the window */
  function drawWindow() {
    if (!cv) return;
    const h = Math.round(opts.compact ? Math.min(215, Math.max(140, cv.clientWidth * 0.17))
                                     : Math.min(300, Math.max(180, cv.clientWidth * 0.34)));
    const { g, w } = SW.fitCanvas(cv, h);
    const w0 = where();
    const km = w0.km;
    const hour = SW.localHour();
    const sky = SW.skyColours(hour);
    const tun = w0.atStop ? 0 : tunnelAt(km);
    const wx = weatherAt(km);
    const bio = biomeAt(km);

    /* sky */
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, sky.top); grad.addColorStop(1, sky.bot);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);

    if (sky.night) {
      for (let i = 0; i < 70; i++) {
        const sx = (SW.hash32('s' + i) % 1000) / 1000 * w;
        const sy = (SW.hash32('t' + i) % 1000) / 1000 * h * 0.6;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(Date.now() / 1400 + i));
        g.fillStyle = 'rgba(255,255,255,' + (0.16 + tw * 0.3).toFixed(2) + ')';
        g.fillRect(sx, sy, 1.2, 1.2);
      }
      /* This far north the sky does this on its own account. */
      if (bio <= 1 && SW.hash32('aur' + Math.floor(km / 240)) % 3 === 0) {
        for (let i = 0; i < 3; i++) {
          const y = h * 0.16 + i * 9;
          g.strokeStyle = 'rgba(120,220,170,' + (0.13 - i * 0.03) + ')';
          g.lineWidth = 7 - i;
          g.beginPath();
          for (let x = 0; x <= w; x += 8) {
            g.lineTo(x, y + Math.sin(x / 90 + Date.now() / 3600 + i) * 11 + Math.sin(x / 31) * 4);
          }
          g.stroke();
        }
      }
    } else if (sky.sun) {
      const sx = w * (0.22 + 0.56 * ((hour - 5.5) / 14));
      const sy = h * (0.62 - Math.sin(Math.max(0, Math.min(1, (hour - 5.5) / 14)) * Math.PI) * 0.46);
      g.globalAlpha = 0.9; g.fillStyle = sky.sun;
      g.beginPath(); g.arc(sx, sy, 13, 0, 7); g.fill();
      g.globalAlpha = 0.13; g.beginPath(); g.arc(sx, sy, 34, 0, 7); g.fill();
      g.globalAlpha = 1;
    }

    /* three ridges at three distances — the whole illusion of movement */
    /* A layer shifts (mult × 26) pixels per kilometre, so these three numbers
       are the parallax: distant hills barely move, the near bank tears past. */
    ridge(g, w, h, h * 0.60, bio === 3 ? 46 : bio === 1 ? 34 : 24, 0.0024, km * 3,  shade(sky, .30), bio);
    ridge(g, w, h, h * 0.71, bio === 3 ? 34 : 22, 0.0061, km * 12, shade(sky, .46), bio);
    ridge(g, w, h, h * 0.80, 14, 0.0140, km * 40, shade(sky, .62), bio);

    /* The near verge is too close to resolve at line speed, so it is drawn as
       horizontal motion blur rather than as objects. */
    const near = h * 0.855;
    const gg = g.createLinearGradient(0, near - 5, 0, h);
    gg.addColorStop(0, shade(sky, .68)); gg.addColorStop(1, shade(sky, .88));
    g.fillStyle = gg; g.fillRect(0, near - 5, w, h - near + 5);
    const smear = (km * 1000 * 2.4) % w;
    for (let i = 0; i < 90; i++) {
      const sd = SW.hash32('v' + i);
      const y = near - 3 + (sd % 1000) / 1000 * (h - near + 3);
      const len = 14 + (sd >> 6) % 54;
      const x = ((sd % 977) / 977 * w - smear % w + w * 2) % w - len / 2;
      const lift = (y - near + 5) / Math.max(1, h - near + 5);
      g.fillStyle = 'rgba(' + (sky.night ? '150,158,172,' : '226,224,214,') + (0.05 + (1 - lift) * 0.07).toFixed(3) + ')';
      g.fillRect(x, y, len, 1.2);
    }

    /* telegraph poles */
    const poleGap = 44;
    const poff = (km * 1000 * 1.0) % poleGap;
    g.strokeStyle = shade(sky, .34); g.lineWidth = 2;
    for (let x = -poff; x < w + poleGap; x += poleGap) {
      g.beginPath(); g.moveTo(x, near); g.lineTo(x, h * 0.44); g.stroke();
      g.beginPath(); g.moveTo(x - 7, h * 0.47); g.lineTo(x + 7, h * 0.47); g.stroke();
    }
    g.strokeStyle = shade(sky, .28); g.lineWidth = 1;
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      for (let x = -poff; x < w + poleGap; x += poleGap) {
        g.moveTo(x, h * 0.47 + k * 3);
        g.quadraticCurveTo(x + poleGap / 2, h * 0.47 + 8 + k * 3, x + poleGap, h * 0.47 + k * 3);
      }
      g.stroke();
    }

    /* the occasional thing, always in the same place on the line */
    const SP = Math.max(0.35, w / 1000);          // one slot per window-width of ground
    for (let d = -1; d <= 1; d++) {
      const slot = Math.floor(km / SP) + d;
      const hh = SW.hash32('obj' + slot);
      if (hh % 3) continue;
      const x = w * (1 - (km / SP - slot));
      if (x < -60 || x > w + 60) continue;
      drawThing(g, x, near, hh, bio, sky);
    }

    /* weather */
    if (wx !== 'clear' && !tun) {
      const n = wx === 'snow' ? 110 : 210;
      g.strokeStyle = 'rgba(186,202,224,.20)'; g.lineWidth = 1;
      g.fillStyle = 'rgba(255,255,255,.42)';
      for (let i = 0; i < n; i++) {
        const px = (SW.hash32('p' + i) % 1000) / 1000 * w;
        const t = Date.now() / (wx === 'snow' ? 2600 : 260) + i * 0.37;
        const py = ((t % 1) * (h + 20)) - 10;
        if (wx === 'snow') {
          g.beginPath(); g.arc(px + Math.sin(t * 2 + i) * 9, py, 1.3, 0, 7); g.fill();
        } else {
          /* Rain on a moving train falls backwards, in short hard strokes. */
          g.beginPath(); g.moveTo(px, py); g.lineTo(px - 4, py + 7); g.stroke();
        }
      }
    }
    if (wx === 'cloud') { g.fillStyle = 'rgba(140,150,165,.12)'; g.fillRect(0, 0, w, h * 0.6); }

    /* a tunnel is 250 m to 2.6 km of nothing at all */
    if (tun > 0) {
      const a = Math.min(1, Math.sin(Math.min(1, tun) * Math.PI) * 3.4);
      g.fillStyle = 'rgba(4,5,8,' + (a * 0.97).toFixed(3) + ')';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(240,220,180,' + (a * 0.07).toFixed(3) + ')';
      for (let i = 0; i < 5; i++) g.fillRect(w * (0.1 + i * 0.2), h * 0.28, 26, 34);   // your own reflection
      g.fillStyle = 'rgba(233,231,225,' + (a * 0.5).toFixed(2) + ')';
      g.font = '11px "IBM Plex Mono",monospace';
      g.fillText('tunnel', 14, h - 14);
    }

    /* stationary at a platform */
    if (w0.atStop && !arrived()) {
      g.fillStyle = 'rgba(10,12,16,.45)'; g.fillRect(0, near - 26, w, h - near + 26);
      g.fillStyle = 'rgba(233,231,225,.75)';
      g.font = '600 12px "IBM Plex Mono",monospace';
      g.fillText(w0.station.name.toUpperCase(), 14, near - 10);
    }

    /* After dark the glass shows you the carriage you are standing in. */
    if (sky.night && !tun) {
      g.fillStyle = 'rgba(236,214,170,.030)';
      for (let i = 0; i < 5; i++) g.fillRect(w * (0.08 + i * 0.2), h * 0.24, 30, 40);
      g.fillStyle = 'rgba(236,214,170,.018)';
      g.fillRect(0, h * 0.19, w, 3);
    }

    /* the window itself */
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 10;
    g.strokeRect(-5, -5, w + 10, h + 10);
    const vg = g.createLinearGradient(0, 0, 0, h);
    vg.addColorStop(0, 'rgba(0,0,0,.22)'); vg.addColorStop(0.35, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.18)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
  }

  function shade(sky, k) {
    /* Land reads as a darkened version of whatever the sky is. At night the
       sky is already nearly black, so mixing straight to black would flatten
       every ridge into it; lift the horizon first and then fall away hard, so
       the layers still separate as silhouettes. */
    if (sky.night) {
      const haze = SW.mix(sky.bot, '#2a3450', 0.38);
      return SW.mix(haze, '#03050a', Math.min(0.98, 0.22 + k * 0.88));
    }
    return SW.mix(sky.bot, '#12161c', k);
  }
  function ridge(g, w, h, baseY, amp, freq, offset, colour, bio) {
    g.fillStyle = colour;
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 3) {
      const u = (x + offset * 26) * freq;
      let y = baseY
        - Math.sin(u) * amp * 0.55
        - Math.sin(u * 2.31 + 1.7) * amp * 0.3
        - Math.sin(u * 5.7 + 0.4) * amp * 0.16;
      if (bio === 3) y -= Math.max(0, Math.sin(u * 0.5)) * amp * 0.5;    // fjord walls
      g.lineTo(x, y);
    }
    g.lineTo(w, h); g.closePath(); g.fill();
  }
  function drawThing(g, x, groundY, hh, bio, sky) {
    const kind = hh % 7;
    g.save();
    if (kind === 0 || kind === 1) {                    /* a red house */
      g.fillStyle = sky.night ? '#3a1f1c' : '#8d3b31';
      g.fillRect(x - 11, groundY - 17, 22, 17);
      g.fillStyle = sky.night ? '#20242c' : '#d9d6cf';
      g.beginPath(); g.moveTo(x - 14, groundY - 17); g.lineTo(x, groundY - 27); g.lineTo(x + 14, groundY - 17); g.closePath(); g.fill();
      if (sky.night) { g.fillStyle = 'rgba(255,214,140,.85)'; g.fillRect(x - 4, groundY - 13, 5, 5); }
    } else if (kind === 2) {                           /* a shed */
      g.fillStyle = sky.night ? '#22262e' : '#6b6a62';
      g.fillRect(x - 9, groundY - 11, 18, 11);
    } else if (kind === 3 && bio <= 2) {               /* reindeer, unbothered */
      g.fillStyle = sky.night ? '#2b2b30' : '#6d5c4c';
      g.fillRect(x - 6, groundY - 8, 11, 5);
      g.fillRect(x + 3, groundY - 11, 3, 4);
      g.fillRect(x - 5, groundY - 3, 2, 4); g.fillRect(x + 3, groundY - 3, 2, 4);
    } else if (kind === 4) {                           /* a lake */
      g.fillStyle = SW.mix(sky.bot, '#101820', 0.35);
      g.beginPath(); g.ellipse(x, groundY + 2, 46, 7, 0, 0, 7); g.fill();
    } else if (kind === 5) {                           /* trees */
      g.fillStyle = sky.night ? '#151b18' : '#2f4433';
      for (let i = 0; i < 4; i++) {
        const tx = x + i * 9 - 14, th = 15 + (hh >> i) % 9;
        g.beginPath(); g.moveTo(tx - 5, groundY); g.lineTo(tx, groundY - th); g.lineTo(tx + 5, groundY); g.closePath(); g.fill();
      }
    } else {                                           /* a crossing sign */
      g.strokeStyle = sky.night ? '#3a4150' : '#b9b3a6'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, groundY); g.lineTo(x, groundY - 16); g.stroke();
      g.fillStyle = '#c05a4a'; g.beginPath(); g.arc(x, groundY - 19, 4, 0, 7); g.fill();
    }
    g.restore();
  }

  /* ================================================================ duties */
  const busy = () => Date.now() < S.busyUntil;
  function doFor(secs, label, done) {
    if (busy()) { SW.toast('You are already doing that.'); return false; }
    S.busyLabel = label; S._busyFrom = Date.now();
    S.busyUntil = Date.now() + secs * 1000; S._onDone = done;
    dirty = true; return true;
  }

  const DUTIES = {
    pace() {
      doFor(SW.rint(SW.rng(Date.now() & 0xffff), 70, 150), 'Pacing up and down', () => {
        S.c.paces++;
        log('', SW.pick(SW.rng(Date.now() & 0xffff), [
          'You pace the length of the train and back. Nobody needs anything.',
          'You pace up and down. A passenger half-raises a hand and then does not.',
          'You walk the train. Everything is where it was.',
          'You pace up and down the things.'
        ]));
        if (S.c.paces >= 20) ach.grant('pacer');
      });
    },
    ticket() {
      doFor(SW.rint(SW.rng(Date.now() & 0xffff), 25, 70), 'Checking a ticket', () => {
        S.c.tickets++;
        log('', SW.pick(SW.rng(Date.now() & 0xffff), [
          'You check a ticket. It is valid.',
          'You check a ticket. It is valid, for a different day, which the passenger explains at length. You accept it.',
          'You check a ticket. The passenger is already holding it up, and has been for a while.',
          'You check a ticket. It is a screenshot of a ticket. It is valid.'
        ]));
        if (S.c.tickets >= 15) ach.grant('inspector');
      });
    },
    announce() {
      const w = where();
      if (!w.next) { SW.toast('There is no next stop. This is the last one.'); return; }
      const ms = w.atStop ? 0 : w.toNextMs;
      if (ms > 300000) { SW.toast('Too early. The announcement goes out about five minutes before the stop.'); return; }
      doFor(35, 'On the PA', () => {
        const r = SW.rng(Date.now() & 0xffffff);
        S.c.announcements++;
        S._pa = SW.pick(r, ANNOUNCE_OPEN) + ' ' + SW.pick(r, ANNOUNCE_MID) + ' ' + w.next.name + '. ' + SW.pick(r, ANNOUNCE_END);
        log('acc', 'PA: “' + S._pa + '”');
        if (S.c.announcements >= 8) ach.grant('voice');
      });
    },
    window_() {
      doFor(SW.rint(SW.rng(Date.now() & 0xffff), 30, 60), 'Closing a window', () => {
        S.c.windows++;
        log('', 'You close a window in car ' + CARS[Math.max(1, S.car)].n + '. Somebody opens it again in about twenty minutes.');
      });
    },
    question() {
      doFor(SW.rint(SW.rng(Date.now() & 0xffff), 20, 55), 'Answering a question', () => {
        S.c.questions++;
        const w = where();
        log('', 'A passenger asks when you get in. You say ' +
          (w.next ? SW.durWords(w.toNextMs || 0) + ' to ' + w.next.name : 'we are there') +
          ', and ' + SW.durWords(Math.max(0, TOTAL_MS - elapsed())) + ' to Lindesnes. They say “right”.');
      });
    },
    tea() {
      doFor(SW.rint(SW.rng(Date.now() & 0xffff), 120, 260), 'Making a cup of tea', () => {
        S.c.teas++;
        log('', SW.pick(SW.rng(Date.now() & 0xffff), TEA));
        if (S.c.teas >= 6) ach.grant('tea');
      });
    },
    watch() {
      /* The highest-value activity on this service. */
      doFor(300, 'Looking out of the window', () => {
        S.c.watched++; S.c.watchMs += 300000;
        log('acc', 'You look out of the window for five minutes. ' +
          BIOME_NAME[biomeAt(where().km)] + '. It is enough.');
        if (S.c.watched >= 6) ach.grant('window');
      });
    },
    walk(to) {
      if (busy()) { SW.toast('You are already doing that.'); return; }
      if (to === S.car) return;
      const dist = Math.abs(to - S.car);
      S.walkTo = to;
      doFor(dist * SW.rint(SW.rng(Date.now() & 0xffff), 22, 40), 'Walking to ' + CARS[to].n, () => {
        S.car = S.walkTo; S.walkTo = -1;
        log('', 'You are in ' + CARS[S.car].n + '. ' + CARS[S.car].d + '.');
        if (S.car === 4) log('', 'The buffet has a meat pie, a lamington and a limited selection of sandwiches.');
      });
    }
  };

  /* ============================================================ passengers */
  function paxFor(car) {
    const out = [];
    const n = car === 0 ? 0 : car === 3 ? 4 : car === 6 ? 1 : SW.rint(SW.rng(SW.hash32('n' + car)), 3, 7);
    for (let i = 0; i < n; i++) {
      const seed = SW.hash32('p' + car + '-' + i);
      const seat = (1 + (seed % 18)) + 'ABCD'[(seed >> 5) % 4];
      /* What a passenger is doing changes about once every twenty minutes. */
      const slot = Math.floor(elapsedMin() / 20) + (seed % 7);
      const doing = PAX_DOING[(SW.hash32('d' + car + i + slot)) % PAX_DOING.length];
      const since = tt[Math.max(0, Math.min(tt.length - 1, (seed >> 3) % Math.max(1, where().idx + 1)))];
      out.push({ seat, doing, since: doing.indexOf('asleep') === 0 && since ? since.name : null });
    }
    return out.sort((a, b) => parseInt(a.seat) - parseInt(b.seat));
  }

  /* ========================================================= achievements */
  const ACH = [
    { id: 'aboard',    name: 'On Board',            desc: 'Begin the service at Nordkapp.' },
    { id: 'first',     name: 'First Stop',          desc: 'Be there when the train calls at Honningsvåg.' },
    { id: 'window',    name: 'The Window',          desc: 'Look out of it for five minutes, six times.' },
    { id: 'tunnel',    name: 'Tunnel',              desc: 'Sit through an entire tunnel without touching anything.' },
    { id: 'pacer',     name: 'Up and Down',         desc: 'Pace the train twenty times.' },
    { id: 'inspector', name: 'Tickets Please',      desc: 'Check fifteen tickets. All valid.' },
    { id: 'voice',     name: 'The Voice',           desc: 'Make eight announcements.' },
    { id: 'tea',       name: 'Six Teas',            desc: 'Make six cups of tea over the course of the run.' },
    { id: 'quiet',     name: 'The Quiet Car',       desc: 'Spend an hour in the quiet car.' },
    { id: 'night',     name: 'Through the Night',   desc: 'Be on board at 3 a.m., local time.' },
    { id: 'trondheim', name: 'Trondheim',           desc: 'Reach Trondheim. That is over halfway.' },
    { id: 'longservice', name: 'The Long Service',  desc: 'Ride the whole thing. 41 hours and 12 minutes.' },
    { id: 'incident',  name: 'An Incident',         desc: 'Something happens.', never: true }
  ];

  /* ================================================================ render */
  function skel() {
    return '' +
    '<div class="grid cols">' +
      '<div>' +
        '<canvas class="window" id="trWin"></canvas>' +
        '<div class="pctsub" style="text-align:right;margin:7px 2px 16px" id="trWinSub">—</div>' +
        '<div class="panel">' +
          '<h2>Your Round</h2><p class="cap">the duties of a conductor</p>' +
          '<div class="carriages" id="trCars"></div>' +
          '<div class="btnrow">' +
            '<button class="btn" data-duty="pace">Pace up and down</button>' +
            '<button class="btn" data-duty="ticket">Check a ticket</button>' +
            '<button class="btn" data-duty="announce">Make the announcement</button>' +
            '<button class="btn" data-duty="question">Answer “when do we get in?”</button>' +
            '<button class="btn" data-duty="window_">Close a window</button>' +
            '<button class="btn" data-duty="tea">Make a cup of tea</button>' +
            '<button class="btn on" data-duty="watch">Look out of the window (5 min)</button>' +
          '</div>' +
          '<div class="taskbar" style="border:1px solid var(--line);border-radius:8px;margin-top:12px">' +
            '<span class="busy" id="trBusy"></span></div>' +
          '<div class="pa" style="margin-top:12px"><div class="pl">Last announcement</div><span id="trPA">Nothing yet.</span></div>' +
        '</div>' +
        '<div class="panel" style="margin-top:16px">' +
          '<h2>The Journey</h2><p class="cap">what has happened so far</p>' +
          '<div class="log" id="trLog"></div>' +
        '</div>' +
      '</div>' +
      '<div class="grid" style="align-content:start">' +
        '<div class="panel">' +
          '<h2>Next Stop</h2><p class="cap" id="trCap">southbound · one second per second</p>' +
          '<div style="text-align:center">' +
            '<div style="font-family:var(--serif);font-weight:600;font-size:clamp(22px,5vw,32px);line-height:1.15" id="trNext">—</div>' +
            '<div style="font-size:clamp(20px,5vw,30px);font-weight:600;color:var(--accent2);margin-top:8px;font-variant-numeric:tabular-nums" id="trEta">—</div>' +
            '<div class="pctsub" id="trEtaSub">—</div>' +
          '</div>' +
          '<div class="barwrap">' +
            '<div class="barlabels"><span>Nordkapp</span><span>Lindesnes</span></div>' +
            '<div class="bar"><div class="fill blue" id="trFill"></div><div class="ticks"></div></div>' +
            '<div class="pct" id="trPct">0.00 %</div>' +
            '<div class="pctsub" id="trLeft">of the run</div>' +
          '</div>' +
          '<div class="rows" style="margin-top:14px" id="trRows"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<h2>Incident Log</h2><p class="cap">for the record</p>' +
          '<div class="incident" id="trInc">No incidents.<br>No emergencies will occur on this service.<br>There is no attack in the steerage.<br>This has been checked.</div>' +
        '</div>' +
        '<div class="panel">' +
          '<h2>' + '<span id="trCarName">Car</span></h2><p class="cap">who is in here with you</p>' +
          '<div class="paxlist" id="trPax"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<h2>Timetable</h2><p class="cap">' + (STOPS.length - 1) + ' calls · ' + SW.comma(STOPS[STOPS.length - 1][1]) + ' km</p>' +
          '<div class="stopboard scrolly" style="max-height:280px" id="trBoard"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<h2>Achievements</h2><p class="cap">the conductor’s record</p>' +
          '<div class="ach" id="trAch"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* The strip used on the Combined Service: the window, the countdown and the
     three duties you cannot put off. Everything else is on the full page. */
  function skelCompact() {
    return '' +
    '<canvas class="window" id="trWin"></canvas>' +
    '<div class="pctsub" style="text-align:right;margin:7px 2px 14px" id="trWinSub">—</div>' +
    '<div class="panel">' +
      '<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:baseline">' +
        '<div><h2 style="margin:0">Next stop</h2><p class="cap" style="margin:4px 0 0" id="trCap">southbound</p></div>' +
        '<div style="margin-left:auto;text-align:right">' +
          '<div style="font-family:var(--serif);font-weight:600;font-size:clamp(17px,3.6vw,23px)" id="trNext">—</div>' +
          '<div style="font-size:clamp(15px,3vw,20px);font-weight:600;color:var(--accent2);font-variant-numeric:tabular-nums" id="trEta">—</div>' +
        '</div>' +
      '</div>' +
      '<div class="pctsub" style="text-align:right;margin-top:4px" id="trEtaSub">—</div>' +
      '<div class="barwrap" style="margin-top:12px">' +
        '<div class="barlabels"><span>Nordkapp</span><span>Lindesnes</span></div>' +
        '<div class="bar"><div class="fill blue" id="trFill"></div><div class="ticks"></div></div>' +
        '<div class="pct" id="trPct">0.00 %</div>' +
        '<div class="pctsub" id="trLeft">of the run</div>' +
      '</div>' +
      '<div class="carriages" style="margin-top:14px" id="trCars"></div>' +
      '<div class="btnrow">' +
        '<button class="btn" data-duty="announce">Make the announcement</button>' +
        '<button class="btn" data-duty="pace">Pace up and down</button>' +
        '<button class="btn" data-duty="ticket">Check a ticket</button>' +
        '<button class="btn on" data-duty="watch">Look out of the window (5 min)</button>' +
      '</div>' +
      '<div class="taskbar" style="border:1px solid var(--line);border-radius:8px;margin-top:12px">' +
        '<span class="busy" id="trBusy"></span></div>' +
      '<div class="pa" style="margin-top:12px"><div class="pl">Last announcement</div><span id="trPA">Nothing yet.</span></div>' +
    '</div>';
  }

  /* The compact skeleton used by the Combined Service omits most of these
     panels, so every write goes through a lookup that tolerates a missing
     element rather than through a pile of conditionals. */
  const Q = id => SW.$('#' + id, root);
  function setText(id, v) { const e = Q(id); if (e) e.textContent = v; }
  function setHTML(id, v) { const e = Q(id); if (e) e.innerHTML = v; }

  function render() {
    if (!root) return;
    const w = where();
    const done = arrived();
    const el = elapsed();
    const pct = Math.min(100, el / TOTAL_MS * 100);
    const LAST_KM = STOPS[STOPS.length - 1][1];

    setText('trNext', done ? 'Lindesnes' : (w.atStop ? w.station.name : (w.next ? w.next.name : '—')));
    setText('trEta', done ? 'arrived' : w.atStop ? 'stopped · ' + SW.dur(w.dwellLeft) : SW.dur(w.toNextMs));
    setText('trEtaSub', done
      ? 'The service terminates here. Please take all your belongings with you.'
      : w.atStop
        ? 'Doors open at ' + w.station.name + '. ' + (w.next ? 'Then ' + w.next.name + '.' : '')
        : 'then ' + (tt[w.idx + 2] ? tt[w.idx + 2].name : 'the end of the line'));
    setText('trCap', done ? 'terminated'
      : (w.atStop ? 'stationary at a platform' : Math.round(w.speed) + ' km/h · southbound'));

    const fill = Q('trFill'); if (fill) fill.style.width = pct.toFixed(3) + '%';
    setText('trPct', pct.toFixed(2) + ' %');
    setText('trLeft', done ? 'The run is complete.'
      : SW.dur(TOTAL_MS - el, { coarse: true }) + ' remaining · ' + Math.round(LAST_KM - w.km) + ' km');

    setText('trWinSub', (w.atStop ? w.station.name + ' · stationary'
      : BIOME_NAME[biomeAt(w.km)] + ' · ' + Math.round(w.speed) + ' km/h') +
      ' · ' + weatherAt(w.km) + (inTunnel() ? ' · in a tunnel' : ''));

    setHTML('trRows', [
      ['Distance run', SW.comma(w.km) + ' km of ' + SW.comma(LAST_KM), 'acc'],
      ['Time on board', SW.dur(el, { coarse: true }), ''],
      ['Calls made', Math.min(w.idx, tt.length - 1) + ' of ' + (STOPS.length - 1), ''],
      ['Announcements', S.c.announcements, ''],
      ['Tickets checked', S.c.tickets, ''],
      ['Paces of the train', S.c.paces, ''],
      ['Cups of tea', S.c.teas, ''],
      ['Time spent looking out of the window', SW.dur(S.c.watchMs, { coarse: true }), 'good'],
      ['Incidents', '0', 'dim'],
      ['Emergencies', '0', 'dim'],
      ['Things that have happened', S.c.nothings + ' · none of them', 'dim']
    ].map(r => '<div class="r"><span class="k">' + r[0] + '</span><span class="v ' + r[2] + '">' + r[1] + '</span></div>').join(''));

    setHTML('trCars', CARS.map((c, i) =>
      '<button class="car' + (i === S.car ? ' here' : '') + '" data-car="' + i + '">' +
      '<span class="cn">' + SW.esc(c.n) + '</span>' + SW.esc(c.d) + '</button>').join(''));
    setText('trCarName', CARS[S.car].n);

    if (Q('trPax')) {
      const pax = paxFor(S.car);
      setHTML('trPax', pax.length ? pax.map(p =>
        '<div class="pax"><span class="seat">' + p.seat + '</span><span class="doing">' + SW.esc(p.doing) +
        (p.since ? ', since ' + SW.esc(p.since) : '') + '</span></div>').join('')
        : '<div class="pax"><span class="seat">—</span><span class="doing">Nobody. It is just you and the noise of the train.</span></div>');
    }

    if (Q('trBoard')) {
      setHTML('trBoard', tt.map((st, i) => {
        const passed = elapsedMin() >= st.depart && i < tt.length - 1;
        const isNext = !done && w.next && st.name === w.next.name;
        const atNow = w.atStop && st.name === w.station.name;
        return '<div class="stop' + (passed && !atNow ? ' done' : '') + (isNext || atNow ? ' next' : '') + '">' +
          '<span class="nm">' + SW.esc(st.name) + '</span>' +
          '<span class="km">' + SW.comma(st.km) + ' km</span>' +
          '<span class="eta">' + (atNow ? 'here' : passed ? 'passed' : SW.dur((st.arrive - elapsedMin()) * 60000, { coarse: true })) + '</span>' +
        '</div>';
      }).join(''));
    }

    if (busy()) {
      const total = Math.max(1, S.busyUntil - (S._busyFrom || S.busyUntil - 1));
      const p = Math.min(1, 1 - (S.busyUntil - Date.now()) / total);
      setHTML('trBusy', '<span class="lb">' + SW.esc(S.busyLabel) + '… ' + SW.dur(S.busyUntil - Date.now()) + '</span>' +
                        '<span class="pb"><i style="width:' + (p * 100).toFixed(1) + '%"></i></span>');
    } else setHTML('trBusy', '<span class="lb" style="color:var(--dim)">Nothing needs doing.</span>');

    if (S._pa) setText('trPA', '“' + S._pa + '”');

    const lg = Q('trLog');
    if (lg) {
      const stick = lg.scrollTop + lg.clientHeight >= lg.scrollHeight - 24;
      lg.innerHTML = S.log.slice(-140).map(l =>
        '<div class="l ' + l.c + '"><span class="t">' + stampOf(l.t) + '</span><span class="x">' + SW.esc(l.x) + '</span></div>').join('');
      if (stick) lg.scrollTop = lg.scrollHeight;
    }
  }

  /* ================================================================== tick */
  function tick() {
    if (busy()) { /* still doing it */ }
    else if (S._onDone) { const f = S._onDone; S._onDone = null; S.busyLabel = ''; f(); ST.write(); }

    const w = where();
    const now = Date.now();
    const dt = Math.min(2000, now - (S._lastTick || now));
    S._lastTick = now;

    /* Calls at stations, logged whether or not anyone is watching. */
    const idx = w.idx;
    if (idx > S.lastStop) {
      for (let i = S.lastStop + 1; i <= idx; i++) {
        if (i === 0) continue;
        const s = tt[i];
        const r = SW.rng(SW.hash32('stop' + i));
        log('acc', 'Calling at ' + s.name + '. ' + SW.rint(r, 0, 9) + ' off, ' + SW.rint(r, 0, 7) + ' on. ' +
          'Stationary for ' + s.dwell + ' minutes.');
        if (i === 1) ach.grant('first');
        if (s.name === 'Trondheim') ach.grant('trondheim');
      }
      S.lastStop = idx;
      ST.write();
    }

    /* Something not happening, about every ninety seconds. */
    if (Date.now() - lastNothing > 90000) {
      lastNothing = Date.now();
      S.c.nothings++;
      log('', SW.pick(SW.rng(Date.now() & 0xffffff), NOTHING));
    }

    const hr = new Date().getHours();
    if (hr === 3) ach.grant('night');
    if (S.car === 3) {
      S._quietMs = (S._quietMs || 0) + dt;
      if (S._quietMs > 3600000) ach.grant('quiet');
    }
    if (inTunnel()) {
      if (!S._tunFrom) { S._tunFrom = Date.now(); S._tunTouched = false; }
    } else if (S._tunFrom) {
      if (!S._tunTouched && Date.now() - S._tunFrom > 12000) ach.grant('tunnel');
      S._tunFrom = 0;
    }
    if (arrived()) ach.grant('longservice');
    dirty = true;
  }

  /* ================================================================= mount */
  function mount(o) {
    opts = o || {};
    root = typeof opts.root === 'string' ? SW.$(opts.root) : opts.root;
    if (!root) return null;
    ST = SW.store(opts.key || 'slow-work-train-v1', DEFAULTS);
    S = ST.s;
    S.c = Object.assign({}, DEFAULTS.c, S.c);
    tt = buildTimetable();

    root.innerHTML = opts.compact ? skelCompact() : skel();
    cv = SW.$('#trWin', root);
    ach = SW.achievements(ACH, S.ach, SW.$('#trAch', root));
    ach.render();

    const away = S.start ? Date.now() - (S.lastSeen || S.start) : 0;
    if (!S.start) {
      S.start = Date.now(); S.lastStop = 0; S.car = 6;
      log('sys', 'The service departs Nordkapp. Lindesnes is 2,900 km and 41 hours 12 minutes away.');
      log('', 'You are in the guard’s van. The train is yours for the duration.');
      ach.grant('aboard');
    } else if (away > 120000) {
      log('away', 'You were away for ' + SW.dur(away, { coarse: true }) + '. The train kept going, as trains do.');
    }
    S.c.sessions++;
    /* The completion handler is a closure and cannot be written to storage, so
       a duty interrupted by closing the tab is simply not finished. */
    if (S.busyUntil) { S.busyUntil = 0; S.busyLabel = ''; S.walkTo = -1; }
    ST.write();

    root.addEventListener('click', e => {
      const d = e.target.closest('[data-duty]');
      if (d) { if (busy()) S._tunTouched = true; DUTIES[d.dataset.duty](); render(); return; }
      const c = e.target.closest('[data-car]');
      if (c) { S._tunTouched = true; DUTIES.walk(+c.dataset.car); render(); return; }
    });
    /* Any click at all counts as touching something, for the tunnel. */
    root.addEventListener('pointerdown', () => { if (S._tunFrom) S._tunTouched = true; });

    SW.loop(() => { tick(); if (dirty) { dirty = false; render(); } }, 400);
    SW.loop(() => drawWindow(), 33);
    setInterval(render, 1000);
    addEventListener('resize', drawWindow);
    render(); drawWindow();

    return {
      inTunnel, where, arrived,
      nextStop: () => where().next,
      msToNextStop: () => { const w = where(); return w.atStop ? 0 : w.toNextMs; },
      carriage: () => S.car,
      inQuietCar: () => S.car === 3,
      log: (c, m) => log(c, m),
      state: () => S
    };
  }

  return { mount, TOTAL_MS, TOTAL_MIN };
})();

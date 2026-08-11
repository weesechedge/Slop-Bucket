"use strict";
/* =========================================================================
   THE BROADCAST — the channel this is going out on, and the glue that makes
   the train and the job interfere with each other.

   The overlay is deliberately television furniture rather than dashboard
   furniture: a channel bug, a running timecode, a lower third for the next
   station, a line map, and a ticker along the bottom carrying everything
   that has happened, which is mostly nothing.
   ========================================================================= */
(function () {

  const KEY = 'long-service-v1';
  const DEFAULTS = {
    start: 0, lastStop: 0, doorsOpen: false, day: 1, mute: false, seenIntro: 0,
    log: [], announced: {},
    c: { announcements: 0, doors: 0, teas: 0, questions: 0, rests: 0, nothings: 0,
         deskMs: 0, walkMs: 0, steps: 0, missedStops: 0 },
    lastSeen: 0
  };

  const ST = LS.store(KEY, DEFAULTS);
  const S = ST.s;
  S.c = Object.assign({}, DEFAULTS.c, S.c);

  const $ = LS.$;
  const stage = $('#stage');
  let J = null, busy = null, lastTick = Date.now(), paused = true;

  /* ============================================================== ticker */
  const TICK_SPEED = 44;                       // pixels per second, as on TV
  let tickX = 0;
  const NOTHING = [
    'The train continues.', 'A hill goes past.', 'The heating comes on in car B.',
    'The heating goes off in car B.', 'Someone in car A coughs once.',
    'A paper cup rolls two metres and stops.', 'The light changes very slightly.',
    'A level crossing goes past. There is nobody at it.', 'A shed.', 'Another shed.',
    'The rails change note over a bridge, then change back.',
    'A bird keeps pace with the train for eleven seconds.',
    'The buffet trolley does not come.', 'You straighten a headrest cover.',
    'Someone asks if this is the right train. It is.',
    'A passenger looks at you as if about to speak, and does not.',
    'Nothing.', 'Still nothing.', 'A road runs alongside for a while, and then does not.'
  ];

  function log(kind, text) {
    S.log.push({ t: Date.now(), k: kind || '', x: text });
    if (S.log.length > 200) S.log.splice(0, S.log.length - 200);
    const el = document.createElement('span');
    el.className = 'tk ' + (kind || '');
    el.innerHTML = '<b>' + hhmm(Date.now()) + '</b>' + LS.esc(text);
    $('#tkTrack').appendChild(el);
  }
  const hhmm = ms => { const d = new Date(ms); return LS.pad2(d.getHours()) + ':' + LS.pad2(d.getMinutes()); };

  function tickerStep(dt) {
    const track = $('#tkTrack');
    tickX += TICK_SPEED * dt;
    /* Keep the belt full; nothing happening is itself content. */
    if (track.scrollWidth - tickX < innerWidth * 1.6) {
      S.c.nothings++;
      const el = document.createElement('span');
      el.className = 'tk dim';
      el.innerHTML = '<b>' + hhmm(Date.now()) + '</b>' +
        LS.esc(LS.pick(LS.rng(Date.now() & 0xffffff), NOTHING));
      track.appendChild(el);
    }
    const first = track.firstElementChild;
    if (first && first.offsetLeft + first.offsetWidth < tickX) {
      tickX -= first.offsetWidth;
      track.removeChild(first);
    }
    track.style.transform = 'translateX(' + (-tickX).toFixed(1) + 'px)';
  }

  /* ============================================================ captions */
  let capUntil = 0;
  function caption(big, small, ms) {
    const c = $('#caption');
    c.innerHTML = '<b>' + LS.esc(big) + '</b>' + (small ? '<span>' + LS.esc(small) + '</span>' : '');
    c.classList.add('on');
    capUntil = Date.now() + (ms || 5200);
  }
  let alertUntil = 0;
  function alertCard(kind, text) {
    const a = $('#alert');
    const label = { call: 'INCOMING CALL', meeting: 'MEETING STARTING', mini: 'MINISTERIAL',
                    bounce: 'SENT BACK', returned: 'RETURNED' }[kind] || 'YOUR ATTENTION';
    a.innerHTML = '<i></i><b>' + label + '</b><span>' + LS.esc(text) + '</span>' +
                  '<em>' + (kind === 'call' ? 'the laptop is at 12A' : 'on the laptop at 12A') + '</em>';
    a.classList.add('on');
    alertUntil = Date.now() + 9000;
  }

  /* ============================================================== speech */
  let voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /en[-_]AU/i.test(v.lang)) || vs.find(v => /en[-_]GB/i.test(v.lang)) ||
            vs.find(v => /^en/i.test(v.lang)) || vs[0] || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function say(text) {
    if (S.mute || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = 0.92; u.pitch = 0.96; u.volume = 0.9;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) { /* no voice available; the text is on screen anyway */ }
  }

  /* =============================================================== clock */
  const elapsed = () => Math.max(0, Date.now() - S.start);
  const svcMin = () => SERVICE.DEPART_MIN + elapsed() / 60000;

  /* =============================================================== tasks
     A conductor's task is time spent standing somewhere doing something.  */
  function doFor(secs, label, done, at) {
    if (busy) return false;
    busy = { until: Date.now() + secs * 1000, from: Date.now(), label, done, at };
    return true;
  }
  function busyStep() {
    if (!busy) return;
    /* Wandering off ends it, the same way it does at the desk. */
    if (busy.at != null && Math.abs(WORLD.player.x - busy.at) > 60) {
      log('bad', 'You wandered off part-way through: ' + busy.label.toLowerCase() + '.');
      busy = null; return;
    }
    if (Date.now() >= busy.until) { const d = busy.done; busy = null; d(); }
  }

  /* ============================================================ the world */
  function state() {
    const w = SERVICE.where(elapsed());
    return {
      km: w.km, speed: w.speed, atStop: w.atStop, station: w.station, next: w.next,
      toNextMs: w.toNextMs, dwellLeft: w.dwellLeft, i: w.i, done: w.done,
      hour: LS.localHour(), doorsOpen: S.doorsOpen,
      tunnelDepth: w.atStop ? 0 : SERVICE.tunnel(w.km)
    };
  }

  /* ========================================================= interactions */
  function interact() {
    if (paused || busy) return;
    if (WORLD.player.seated) { standUp(); return; }
    const h = WORLD.nearest();
    if (!h) return;
    const st = state();

    if (h.id === 'desk') { sitDown(); return; }
    if (h.id.startsWith('door')) {
      if (!st.atStop) { caption('THE TRAIN IS MOVING', 'The doors are interlocked. This is a good thing.', 3200); return; }
      if (!S.doorsOpen) {
        doFor(6, 'Releasing the doors', () => {
          S.doorsOpen = true; S.c.doors++;
          log('work', 'Doors released at ' + st.station.name + ', platform ' + st.station.plat + '.');
          WORLD.stationChange(st.i);
        }, h.x);
      } else {
        doFor(6, 'Closing the doors', () => {
          S.doorsOpen = false;
          log('work', 'Doors closed and interlocked. Right away.');
        }, h.x);
      }
      return;
    }
    if (h.id === 'pa1' || h.id === 'pa2') { openPA(); return; }
    if (h.id === 'buffet') {
      doFor(LS.rint(LS.rng(Date.now() & 0xffff), 100, 190), 'Making a cup of tea', () => {
        S.c.teas++; J.addFocus(0.16);
        log('', LS.pick(LS.rng(Date.now() & 0xffff), [
          'You make a cup of tea. It is too hot to drink for nine minutes.',
          'You make a cup of tea. It goes cold while you are answering a question about the buffet.',
          'You make a cup of tea and drink all of it, which is rare.',
          'You make a cup of tea. It is fine.'
        ]));
      }, h.x);
      return;
    }
    if (h.id === 'window' || h.id === 'rest') {
      const long = h.id === 'rest';
      doFor(long ? 300 : 90, long ? 'Watching the country go past' : 'Looking out of the window', () => {
        S.c.rests++; J.addFocus(long ? 0.42 : 0.12);
        const bio = SERVICE.BIOMES[SERVICE.biome(state().km)];
        caption(bio.toUpperCase(), long ? 'Five minutes. Nothing happened. It was enough.' : 'Nothing out there either.', 6000);
        log('good', long ? 'Five minutes in the quiet car. ' + bio + '. Nothing happened.'
                         : 'You looked out of the window. ' + bio + '.');
      }, h.x);
      return;
    }
    if (h.id === 'log') { openRecord(); return; }
    if (h.pax) {
      const p = h.pax;
      doFor(LS.rint(LS.rng(Date.now() & 0xffff), 20, 50), 'Seat ' + p.seat, () => {
        p.wants = 0; S.c.questions++;
        const w = state();
        const q = LS.pick(LS.rng(Date.now() & 0xffffff), [
          'asks when you get in', 'asks if this is the right train', 'asks whether the buffet is open',
          'asks if there is a quiet carriage', 'asks whether the wifi is working', 'asks nothing in the end'
        ]);
        log('', 'Seat ' + p.seat + ' ' + q + '. You say ' +
          (w.next ? LS.durWords(w.toNextMs) + ' to ' + w.next.name : 'we are there') + '. They say “right”.');
      }, h.x);
    }
  }

  function sitDown() {
    WORLD.player.seated = true;
    J.setSeated(true);
    J.markDirty();
    $('#lapWrap').classList.add('on');
    J.render();
    log('', 'Sat down at 12A. The laptop is awake.');
  }
  function standUp() {
    if (!WORLD.player.seated) return;
    WORLD.player.seated = false;
    J.setSeated(false);
    $('#lapWrap').classList.remove('on');
  }

  /* ------------------------------------------------------------ the PA */
  const OPEN = ['G’day folks,', 'Ladies and gentlemen,', 'Morning all,', 'Afternoon everyone,', 'Sorry to interrupt,'];
  const MID  = ['we’ll shortly be arriving at', 'we are now approaching', 'next stop is', 'coming up in a few minutes is'];
  const END  = ['Please mind the gap and take all your belongings with you.',
                'The buffet remains open for hot drinks and a limited selection of sandwiches.',
                'We’re running about four minutes down, which we expect to make up.',
                'Please remember car B is a quiet carriage.',
                'Thanks for travelling with us today.',
                'Doors will be released on the left-hand side.'];

  function openPA() {
    const st = state();
    const target = st.atStop ? st.station : st.next;
    if (!target) { caption('NO NEXT STOP', 'This is the last one.', 3000); return; }
    const r = LS.rng(Date.now() & 0xffffff);
    const draft = LS.pick(r, OPEN) + ' ' + LS.pick(r, MID) + ' ' + target.name + ', platform ' +
                  target.plat + '. ' + LS.pick(r, END);
    modal('The PA handset',
      '<p class="mnote">It goes out in every carriage. Say what you like — the handset does not check.</p>' +
      '<textarea id="paText" rows="4" spellcheck="false">' + LS.esc(draft) + '</textarea>' +
      '<div class="macts"><button data-m="say">Press to talk</button>' +
      '<button class="g" data-m="reroll">Another form of words</button>' +
      '<button class="g" data-m="close">Hang it up</button></div>' +
      '<p class="mnote small">' + (S.mute ? 'Sound is off — the words will still go out on screen.'
                                          : 'Sound is on. It will be spoken aloud.') + '</p>');
    modalHandler = a => {
      if (a === 'reroll') { const r2 = LS.rng(Date.now() & 0xffffff);
        $('#paText').value = LS.pick(r2, OPEN) + ' ' + LS.pick(r2, MID) + ' ' + target.name +
          ', platform ' + target.plat + '. ' + LS.pick(r2, END); return; }
      if (a === 'say') {
        const text = ($('#paText').value || '').slice(0, 400).trim();
        closeModal();
        if (!text) return;
        doFor(12, 'On the PA', () => {
          S.c.announcements++;
          S.announced[target.name] = 1;
          say(text);
          caption('ON THE PA', text, 9000);
          log('work', 'PA: “' + text + '”');
          /* Everyone looks up for a moment, then does not. */
          WORLD.pax().forEach(p => { if (LS.chance(LS.rng(LS.hash32('lk' + p.id + S.c.announcements)), 0.4)) p.pose = 'still'; });
        }, WORLD.player.x);
        return;
      }
      closeModal();
    };
  }

  /* --------------------------------------------------- the service record */
  function openRecord() {
    const st = state();
    const s = J.state();
    const rows = [
      ['Service', 'Day ' + S.day + ' · Trondheim → Lindesnes'],
      ['Run so far', LS.dur(elapsed(), true) + ' of ' + LS.dur(SERVICE.TOTAL_MS, true)],
      ['Distance', LS.comma(st.km - SERVICE.START_KM) + ' km of 938'],
      ['Calls made', Math.min(st.i, SERVICE.STOPS.length - 1) + ' of ' + (SERVICE.STOPS.length - 1)],
      ['Announcements', S.c.announcements],
      ['Doors worked', S.c.doors],
      ['Questions answered', S.c.questions],
      ['Cups of tea', S.c.teas],
      ['Time doing nothing on purpose', LS.dur(S.c.rests * 240000, true)],
      ['—', ''],
      ['Emails in', LS.comma(s.c.mails)],
      ['Replied', LS.comma(s.c.replied)],
      ['Meetings', s.c.meetings + ' · ' + Math.round(s.c.meetMs / 60000) + ' min'],
      ['Calls missed', s.c.missedCalls],
      ['Assurance', 'v' + s.assur.templ + ' · ' + s.assur.done.length + '/' + J.questions().length +
        (s.assur.accepted ? ' · in the queue' : '')],
      ['Ministerial', s.mini.live ? (s.mini.cleared ? 'with the Office' : J.CHAIN[s.mini.stage].n) : 'not yet'],
      ['Sent back', s.mini.resets + '×'],
      ['Value delivered to the public', 'not measurable at this gate']
    ];
    modal('Service record',
      '<div class="rec">' + rows.map(r => r[0] === '—'
        ? '<hr>'
        : '<div><span>' + r[0] + '</span><b>' + LS.esc(String(r[1])) + '</b></div>').join('') + '</div>' +
      '<div class="incident"><b>Incident log</b><span>No incidents.<br>No emergencies will occur on this service.<br>' +
      'There is no attack in the steerage.<br>This has been checked.</span></div>' +
      '<details class="src"><summary>The spoken transcript this was built from</summary><p>' +
      LS.esc(LS.PROMPT) + '</p></details>' +
      '<div class="macts"><button class="g" data-m="mute">Sound: ' + (S.mute ? 'off' : 'on') + '</button>' +
      '<button class="g" data-m="close">Put it back</button></div>');
    modalHandler = a => {
      if (a === 'mute') { S.mute = !S.mute; if (S.mute && 'speechSynthesis' in window) speechSynthesis.cancel(); openRecord(); return; }
      closeModal();
    };
  }

  /* ============================================================== modals */
  let modalHandler = null;
  function modal(title, html) {
    const m = $('#modal');
    m.innerHTML = '<div class="mbox"><div class="mtitle">' + LS.esc(title) + '</div>' + html + '</div>';
    m.classList.add('on');
  }
  function closeModal() { $('#modal').classList.remove('on'); modalHandler = null; }
  $('#modal').addEventListener('click', e => {
    if (e.target.id === 'modal') { closeModal(); return; }
    const b = e.target.closest('[data-m]');
    if (b && modalHandler) modalHandler(b.dataset.m);
  });

  /* ============================================================== station */
  let announceWindowFor = null, doorTimer = 0, wasTunnel = false;
  function stationLogic(st) {
    /* Five minutes out, the lower third comes up and the job is yours. */
    if (st.next && !st.atStop && st.toNextMs < 300000) {
      if (announceWindowFor !== st.next.name) {
        announceWindowFor = st.next.name;
        caption('NEXT STOP', st.next.name + ' — the announcement is yours', 6000);
      }
    } else if (announceWindowFor && (!st.next || st.atStop)) {
      if (!S.announced[announceWindowFor]) {
        S.c.missedStops++;
        log('', 'No announcement was made for ' + announceWindowFor + '. Nobody complains.');
      }
      announceWindowFor = null;
    }

    if (st.i > S.lastStop) {
      for (let k = S.lastStop + 1; k <= st.i; k++) {
        if (k === 0) continue;
        const stn = SERVICE.TT[k];
        log('work', 'Calling at ' + stn.name + ', platform ' + stn.plat + '. Stationary for ' + stn.dwell + ' minutes.');
      }
      S.lastStop = st.i;
      if (st.atStop) {
        caption(st.station.name.toUpperCase(), 'Platform ' + st.station.plat + ' · ' + st.station.dwell + ' minutes', 7000);
        doorTimer = Date.now() + 45000;
      }
    }
    /* Nothing goes wrong if you do not work the doors. Somebody else does. */
    if (st.atStop && !S.doorsOpen && doorTimer && Date.now() > doorTimer) {
      doorTimer = 0;
      S.doorsOpen = true;
      log('', 'The driver released the doors. You were elsewhere.');
      WORLD.stationChange(st.i);
    }
    if (!st.atStop && S.doorsOpen) { S.doorsOpen = false; }
  }

  /* Passengers put their hands up now and then, and always at the far end. */
  let nextWant = 0;
  function wantsStep() {
    if (Date.now() < nextWant) return;
    nextWant = Date.now() + LS.rint(LS.rng(Date.now() & 0xffff), 150, 420) * 1000;
    const list = WORLD.pax().filter(p => p.state === 'seated' && !p.wants);
    if (!list.length) return;
    const p = list[Math.floor(Math.random() * list.length)];
    p.wants = 1;
    log('', 'Somebody in seat ' + p.seat + ' would like a word.');
  }

  /* ========================================================= scenery card */
  let lastThing = null;
  function sceneryStep(st) {
    if (st.atStop || st.tunnelDepth) return;
    const cap = SERVICE.passing(st.km);
    if (cap && cap !== lastThing) { lastThing = cap; caption(cap, '', 4200); }
    else if (!cap) lastThing = null;
  }

  /* ================================================================ input */
  const keymap = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
  addEventListener('keydown', e => {
    if ($('#modal').classList.contains('on')) { if (e.key === 'Escape') closeModal(); return; }
    if (paused) { start(); return; }
    if (keymap[e.key]) { WORLD.setKey(keymap[e.key], true); WORLD.player.target = null; e.preventDefault(); }
    if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') { interact(); e.preventDefault(); }
    if (e.key === 'Escape') standUp();
  });
  addEventListener('keyup', e => { if (keymap[e.key]) WORLD.setKey(keymap[e.key], false); });

  stage.addEventListener('pointerdown', e => {
    if (paused) { start(); return; }
    if (WORLD.player.seated) return;
    const r = stage.getBoundingClientRect();
    const px = e.clientX - r.left;
    const h = WORLD.hotAtScreen(px);
    if (h) { WORLD.walkTo(h.x); pendingUse = h.id; }
    else { WORLD.walkTo(WORLD.worldXAtScreen(px)); pendingUse = null; }
  });
  let pendingUse = null;
  $('#useBtn').addEventListener('click', interact);
  $('#leftBtn').addEventListener('pointerdown', () => WORLD.setKey('left', true));
  $('#rightBtn').addEventListener('pointerdown', () => WORLD.setKey('right', true));
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => {
    $('#leftBtn').addEventListener(ev, () => WORLD.setKey('left', false));
    $('#rightBtn').addEventListener(ev, () => WORLD.setKey('right', false));
  });

  /* ================================================================= HUD */
  function hud(st) {
    const s = J.state();
    const ph = J.phase();
    const unread = s.mail.filter(m => !m.read).length + s.unreadOlder;
    $('#hudClock').textContent = ph === 'commute' ? '—' : LS.clock(J.officeMin());
    $('#hudPhase').textContent = ph === 'commute'
      ? 'the commute · ' + LS.dur(-J.dayMs(), true) + ' to 09:00'
      : ph === 'evening' ? 'after COB' : 'the working day';
    $('#hudPhase').className = 'hp ' + ph;
    const bar = LS.clamp(J.dayMs() / J.DAY_MS, 0, 1);
    $('#hudBar').style.width = (bar * 100).toFixed(2) + '%';
    $('#hudRows').innerHTML = [
      ['Inbox', LS.comma(unread) + ' unread', unread > 40 ? 'bad' : ''],
      ['Assurance', 'v' + s.assur.templ + ' · ' + s.assur.done.length + '/' + J.questions().length,
        s.assur.accepted ? 'good' : ''],
      ['QTB', s.mini.live ? (s.mini.cleared ? 'with the Office' : J.CHAIN[s.mini.stage].n) : 'not yet',
        s.mini.cleared ? 'good' : s.mini.live ? 'warn' : 'dim'],
      ['Focus', Math.round(s.focus * 100) + '%', s.focus < 0.4 ? 'bad' : '']
    ].map(r => '<div class="' + r[2] + '"><span>' + r[0] + '</span><b>' + LS.esc(r[1]) + '</b></div>').join('');
  }

  function lower(st) {
    const l = $('#lower');
    if (st.done) {
      l.classList.add('on');
      l.innerHTML = '<i>TERMINATES HERE</i><b>Lindesnes</b><span>The service is complete. Please take all your belongings with you.</span>';
      return;
    }
    if (st.atStop) {
      l.classList.add('on');
      l.innerHTML = '<i>NOW AT · PLATFORM ' + st.station.plat + '</i><b>' + LS.esc(st.station.name) + '</b>' +
        '<span>Departing in ' + LS.dur(st.dwellLeft) + (S.doorsOpen ? ' · doors open' : ' · doors closed') + '</span>';
      return;
    }
    if (st.next && st.toNextMs < 420000) {
      l.classList.add('on');
      l.innerHTML = '<i>NEXT STOP · PLATFORM ' + st.next.plat + '</i><b>' + LS.esc(st.next.name) + '</b>' +
        '<span>in ' + LS.dur(st.toNextMs) + (S.announced[st.next.name] ? ' · announced' : ' · not yet announced') + '</span>';
      return;
    }
    l.classList.remove('on');
  }

  function lineMap(st) {
    const f = LS.clamp((st.km - SERVICE.START_KM) / (SERVICE.END_KM - SERVICE.START_KM), 0, 1);
    $('#lmTrain').style.left = (f * 100).toFixed(2) + '%';
    $('#lmDone').style.width = (f * 100).toFixed(2) + '%';
    $('#lmNow').textContent = st.atStop ? st.station.name : (st.next ? '→ ' + st.next.name : 'Lindesnes');
  }

  function prompt(st) {
    const p = $('#prompt');
    if (paused) { p.classList.remove('on'); return; }
    if (busy) {
      const frac = LS.clamp((Date.now() - busy.from) / (busy.until - busy.from), 0, 1);
      p.classList.add('on', 'busy');
      p.innerHTML = '<span class="pl">' + LS.esc(busy.label) + ' · ' + LS.dur(busy.until - Date.now()) +
        '</span><span class="pbar"><i style="width:' + (frac * 100).toFixed(1) + '%"></i></span>';
      return;
    }
    p.classList.remove('busy');
    if (WORLD.player.seated) {
      p.classList.add('on');
      p.innerHTML = '<span class="pl">Seat 12A · <kbd>Esc</kbd> to stand up</span>';
      return;
    }
    const h = WORLD.nearest();
    if (!h) { p.classList.remove('on'); return; }
    let verb = h.verb;
    if (h.id.startsWith('door')) verb = !st.atStop ? 'Doors (interlocked)' : S.doorsOpen ? 'Close the doors' : 'Release the doors';
    if ((h.id === 'pa1' || h.id === 'pa2') && st.next && st.toNextMs > 420000 && !st.atStop)
      verb = 'Make an announcement anyway';
    p.classList.add('on');
    p.innerHTML = '<span class="pl"><em>' + LS.esc(h.label) + '</em> ' + LS.esc(verb) + '</span><kbd>E</kbd>';
  }

  /* =============================================================== start */
  function start() {
    if (!paused) return;
    paused = false;
    $('#boot').classList.add('gone');
    S.seenIntro = 1;
    if ('speechSynthesis' in window) pickVoice();
    setTimeout(() => { $('#boot').style.display = 'none'; }, 900);
  }
  $('#boot').addEventListener('click', start);

  /* ============================================================== booting */
  function boot() {
    JOB.init({
      key: 'long-service-job-v1',
      emit: (k, x) => log(k, x),
      alert: alertCard
    });
    J = JOB;
    JOB.onStand = standUp;
    WORLD.init(stage);
    JOB.mountUI($('#laptop'));

    const fresh = !S.start;
    const away = S.start ? Date.now() - (S.lastSeen || S.start) : 0;
    if (fresh) {
      S.start = Date.now();
      S.lastStop = 0;
      log('sys', 'The service departs Trondheim. Lindesnes is ' +
        LS.comma(SERVICE.END_KM - SERVICE.START_KM) + ' km and ' + LS.durWords(SERVICE.TOTAL_MS) + ' away.');
      log('', 'You are the conductor. Your laptop is at seat 12A in car C. The day starts at 09:00.');
    }
    /* Replay what happened while nobody was watching. */
    JOB.catchUp(elapsed());
    const st0 = state();
    for (let k = 1; k <= st0.i; k++) if (k > S.lastStop) log('', 'Called at ' + SERVICE.TT[k].name + '.');
    S.lastStop = Math.max(S.lastStop, st0.i);
    if (!fresh && away > 120000) {
      log('away', 'You were away for ' + LS.dur(away, true) + '. The train kept going. So did the day.');
    }
    /* Prime the ticker so the belt is never empty on the first frame. */
    S.log.slice(-14).forEach(l => {
      const el = document.createElement('span');
      el.className = 'tk ' + l.k;
      el.innerHTML = '<b>' + hhmm(l.t) + '</b>' + LS.esc(l.x);
      $('#tkTrack').appendChild(el);
    });

    $('#bootSub').textContent = fresh
      ? 'PRESS ANY KEY'
      : 'YOU ARE ' + LS.dur(elapsed(), true).toUpperCase() + ' INTO THE RUN · PRESS ANY KEY';

    ST.write();
    LS.loop(frame);
  }

  /* ================================================================ frame */
  function frame(dt) {
    const now = Date.now();
    const dtMs = now - lastTick; lastTick = now;
    const st = state();

    if (!paused) {
      busyStep();
      stationLogic(st);
      wantsStep();
      sceneryStep(st);
      /* A tunnel takes the connection with it, and whatever the connection was
         carrying. Seven per cent of this line is tunnel. */
      const inTun = !!st.tunnelDepth;
      if (inTun !== wasTunnel) {
        wasTunnel = inTun;
        JOB.net = !inTun;
        if (inTun) {
          const took = JOB.disrupt('the train went into a tunnel', true);
          log('bad', 'TEAMS · We couldn’t connect you. Please check your connection and try again. (CAA20003)');
          if (took) caption('NO CONNECTION', 'Whatever you were part-way through has gone with it.', 5000);
        } else {
          log('sys', 'Out of the tunnel. Teams reconnects and asks you to sign in again.');
        }
      }
      JOB.tick(elapsed(), { seated: WORLD.player.seated, dtMs });
      if (WORLD.player.seated) S.c.deskMs += dtMs; else if (Math.abs(WORLD.player.vx) > 1) S.c.walkMs += dtMs;
      /* Walked to something on purpose: use it on arrival. */
      if (pendingUse && WORLD.player.target === null) {
        const h = WORLD.nearest();
        if (h && h.id === pendingUse) interact();
        pendingUse = null;
      }
      if (st.done && !S.ended) {
        S.ended = 1;
        caption('LINDESNES', 'The service terminates here. Thirteen hours thirty-six minutes.', 12000);
        log('sys', 'The service terminates at Lindesnes. That is the run.');
      }
    }

    WORLD.update(dt, st);
    WORLD.draw(st);

    tickerStep(dt);
    prompt(st);
    lower(st);
    lineMap(st);
    hud(st);
    $('#tc').textContent = LS.timecode(elapsed());
    $('#svcClock').textContent = LS.clock(svcMin());
    $('#spd').textContent = st.atStop ? 'STATIONARY' : Math.round(st.speed) + ' KM/H';
    $('#wx').textContent = (st.tunnelDepth ? 'TUNNEL' : SERVICE.weather(st.km).toUpperCase()) +
      ' · ' + SERVICE.BIOMES[SERVICE.biome(st.km)].toUpperCase();
    stage.classList.toggle('tunnel', !!st.tunnelDepth);

    if (now > capUntil) $('#caption').classList.remove('on');
    if (now > alertUntil) $('#alert').classList.remove('on');
    if (WORLD.player.seated && JOB.dirty()) JOB.render();
    else if (WORLD.player.seated && now % 1000 < 34) JOB.render();
  }

  boot();
})();

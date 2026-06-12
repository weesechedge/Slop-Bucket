/* ============================================================
   GRAND THEFT TOKENS VI — main.js
   Boot, input (keyboard/mouse/touch), camera, game loop.
   ============================================================ */
'use strict';
(function () {
  const C = GT.C, U = GT.U;

  const M = {
    scene: null, camera: null, renderer: null,
    camYaw: 0, camPitch: 0.34, camDist: C.CAM_DIST_FOOT,
    zoomMul: 1, manualT: 0,
    keys: new Set(),
    touch: { active: false, id: -1, ox: 0, oy: 0, vx: 0, vy: 0, sprint: false },
    lastT: 0, started: false,
  };
  GT.main = M;

  // ================= boot =================
  GT.init = function () {
    const st = GT.state;
    M.scene = new THREE.Scene();
    M.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 2000);

    if (!GT.headless) {
      const canvas = document.getElementById('game');
      M.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      M.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      M.renderer.shadowMap.enabled = true;
      M.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      resize();
      window.addEventListener('resize', resize);
    }

    GT.city.build(M.scene);
    GT.ent.init(M.scene);
    GT.sim.init(M.scene);
    GT.hud.init();
    GT.missions.init(M.scene);

    // player just outside the safehouse marker
    GT.ent.spawnPlayer(GT.POI.safehouse.x + 7, GT.POI.safehouse.z + 9);
    M.camYaw = Math.PI; // face the city

    // starter car by the safehouse
    GT.ent.spawnCar('sports', GT.POI.safehouse.x + 13, GT.POI.safehouse.z + 3, 0, { parked: true, color: 0xff2e88 });

    // parked cars around town
    const PK = ['sedan', 'taxi', 'beater', 'van', 'sports', 'sedan', 'beater'];
    for (const s of GT.city.parkedSpots) {
      GT.ent.spawnCar(U.pick(PK), s.x, s.z, s.h, { parked: true });
    }

    // collectible orbs
    for (const s of GT.city.orbSpots) {
      GT.ent.spawnPickup(s.x, s.z, 'orb', 0, s.y);
    }

    if (!GT.headless) bindInput();

    GT.on('carExited', () => GT.hud.toast('On foot. Watch for traffic \u2014 it does not watch for you.'));
    if (!GT.headless) {
      GT.on('playerHurt', () => {
        const h = document.getElementById('hurt');
        if (h) { h.classList.remove('show'); void h.offsetWidth; h.classList.add('show'); }
      });
    }

    if (!GT.headless) {
      requestAnimationFrame(loop);
    }
  };

  GT.startGame = function () {
    const st = GT.state;
    if (st.mode !== 'title') return;
    try { GT.audio.ensure(); } catch (e) {}
    st.mode = 'play';
    GT.hud.hideTitle();
    GT.hud.setObjective('Find the purple marker at THE CoLAB.');
    GT.hud.toast('Welcome to Vibe City. Population: declining near you.');
    if (st.firstPlay) { st.firstPlay = false; GT.hud.toast('H for help \u00b7 R for radio (in car)'); }
  };

  function resize() {
    if (!M.renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    M.renderer.setSize(w, h);
    M.camera.aspect = w / h;
    M.camera.updateProjectionMatrix();
  }

  // ================= enter / exit cars =================
  function enterExit() {
    const st = GT.state, p = st.player;
    if (p.dead || st.mode !== 'play') return;
    if (p.car) { GT.sim.exitCar(false); return; }

    // nearest usable car
    let best = null, bd = Infinity;
    for (const car of st.vehicles) {
      if (car.dead || car.drowned) continue;
      const d = U.dist2(p.x, p.z, car.x, car.z);
      const rr = (car.r + 1.6) * (car.r + 1.6);
      if (d < rr && d < bd) { bd = d; best = car; }
    }
    if (!best) return;

    const jacked = best.driver === 'ai';
    if (jacked) {
      // eject the driver as a fleeing pedestrian
      const s = U.fwd(best.h + Math.PI / 2);
      const ped = GT.ent.spawnPed(best.x - s.x * (best.stats.w / 2 + 0.9), best.z - s.z * (best.stats.w / 2 + 0.9));
      if (ped) { ped.state = 'flee'; ped.fleeT = U.rand(4, 7); ped.threatX = p.x; ped.threatZ = p.z; ped.t = 0; }
      GT.ai.addHeat(best.isPolice ? 80 : 30);
      GT.audio.sfx.thud();
    } else if (best.parked) {
      if (GT.ai.witnessNearby(p.x, p.z, 16)) GT.ai.addHeat(best.isPolice ? 60 : 10);
    }
    best.parked = false;
    best.ai = null;
    best.driver = 'player';
    best.throttle = 0; best.brake = 0; best.handbrake = false; best.steer = 0;
    if (best.isPolice) best.sirenOn = false;
    p.car = best;
    p.mesh.visible = false;
    if (!best._ridden) { best._ridden = true; st.carsStolen++; }
    GT.hud.toast((jacked ? 'Jacked: ' : '') + best.name);
    GT.emit('carEntered', best);
  }
  M.enterExit = enterExit;
  M._applyInput = applyInput;

  // ================= input =================
  function bindInput() {
    const st = GT.state;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); return; }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      M.keys.add(e.code);

      if (st.mode === 'title') { if (e.code === 'Enter' || e.code === 'Space') GT.startGame(); return; }
      if (st.mode === 'dialog') { if (['Space', 'Enter', 'KeyE'].includes(e.code)) GT.hud.advanceDialog(); return; }
      if (st.mode === 'credits') { if (e.code === 'Enter') GT.hud.endCredits && GT.hud.endCredits(); return; }

      switch (e.code) {
        case 'KeyE': case 'KeyF': enterExit(); break;
        case 'KeyR': if (st.player.car) { const n = GT.audio.cycleRadio(); GT.hud.toast('\ud83d\udcfb ' + n); } break;
        case 'KeyB': if (st.player.car && !st.player.car.dead) GT.audio.sfx.horn(); break;
        case 'KeyH': GT.hud.toggleHelp(); break;
        case 'KeyM': st.muted = !st.muted; GT.hud.toast(st.muted ? 'Muted.' : 'Sound on.'); break;
        case 'KeyP': case 'Escape': togglePause(); break;
      }
    });
    window.addEventListener('keyup', (e) => M.keys.delete(e.code));
    window.addEventListener('blur', () => M.keys.clear());

    // mouse
    const canvas = M.renderer.domElement;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    let rmb = false, lastMX = 0, lastMY = 0;
    canvas.addEventListener('mousedown', (e) => {
      if (st.mode === 'title') { GT.startGame(); return; }
      if (st.mode === 'dialog') { GT.hud.advanceDialog(); return; }
      if (e.button === 2) { rmb = true; lastMX = e.clientX; lastMY = e.clientY; }
      else if (e.button === 0 && st.mode === 'play') {
        if (st.player.car) { if (!st.player.car.dead) GT.audio.sfx.hornShort(); }
        else GT.sim.punch();
      }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 2) rmb = false; });
    window.addEventListener('mousemove', (e) => {
      if (!rmb) return;
      M.camYaw = U.wrapAngle(M.camYaw - (e.clientX - lastMX) * 0.0075);
      M.camPitch = U.clamp(M.camPitch + (e.clientY - lastMY) * 0.005, 0.08, 1.1);
      lastMX = e.clientX; lastMY = e.clientY;
      M.manualT = 1.6;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      M.zoomMul = U.clamp(M.zoomMul * (e.deltaY > 0 ? 1.1 : 0.9), 0.55, 2.2);
    }, { passive: false });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && st.mode === 'play') togglePause();
    });

    if ('ontouchstart' in window) bindTouch();
  }

  function togglePause() {
    const st = GT.state;
    if (st.mode === 'play') { st.mode = 'pause'; GT.hud.showPause(true); }
    else if (st.mode === 'pause') { st.mode = 'play'; GT.hud.showPause(false); }
  }

  // ================= touch =================
  function bindTouch() {
    const st = GT.state;
    document.body.classList.add('touch');
    const stick = document.getElementById('stick');
    const knob = document.getElementById('stickKnob');

    function setKnob(dx, dy) { if (knob) knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }

    window.addEventListener('touchstart', (e) => {
      if (st.mode === 'title') { GT.startGame(); return; }
      if (st.mode === 'dialog') {
        if (!(e.target && e.target.closest && e.target.closest('.tbtn'))) GT.hud.advanceDialog();
        return;
      }
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.45 && !M.touch.active && st.mode === 'play'
            && !(e.target && e.target.closest && e.target.closest('.tbtn'))) {
          M.touch.active = true; M.touch.id = t.identifier;
          M.touch.ox = t.clientX; M.touch.oy = t.clientY;
          M.touch.vx = 0; M.touch.vy = 0;
          if (stick) { stick.style.left = (t.clientX - 55) + 'px'; stick.style.top = (t.clientY - 55) + 'px'; stick.classList.add('on'); }
        }
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (M.touch.active && t.identifier === M.touch.id) {
          let dx = t.clientX - M.touch.ox, dy = t.clientY - M.touch.oy;
          const d = Math.hypot(dx, dy), max = 52;
          if (d > max) { dx *= max / d; dy *= max / d; }
          M.touch.vx = dx / max; M.touch.vy = dy / max;
          setKnob(dx, dy);
        }
      }
    }, { passive: true });

    function endTouch(e) {
      for (const t of e.changedTouches) {
        if (M.touch.active && t.identifier === M.touch.id) {
          M.touch.active = false; M.touch.vx = 0; M.touch.vy = 0;
          setKnob(0, 0);
          if (stick) stick.classList.remove('on');
        }
      }
    }
    window.addEventListener('touchend', endTouch, { passive: true });
    window.addEventListener('touchcancel', endTouch, { passive: true });

    // buttons
    function btn(id, down, up) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); down(); }, { passive: false });
      if (up) el.addEventListener('touchend', (e) => { e.preventDefault(); up(); }, { passive: false });
    }
    btn('btnA', () => { if (st.mode === 'play') enterExit(); });
    btn('btnB', () => {
      if (st.mode !== 'play') return;
      if (st.player.car) { if (!st.player.car.dead) GT.audio.sfx.horn(); }
      else GT.sim.punch();
    });
    btn('btnSpr', () => { M.touch.sprint = true; }, () => { M.touch.sprint = false; });
    btn('btnRad', () => {
      if (st.mode === 'play' && st.player.car) { const n = GT.audio.cycleRadio(); GT.hud.toast('\ud83d\udcfb ' + n); }
    });
    btn('btnPause', () => { if (st.mode === 'play' || st.mode === 'pause') togglePause(); });
  }

  // ================= per-frame input =================
  function applyInput() {
    const st = GT.state, p = st.player;
    if (!p || p.dead) return;
    const k = M.keys;

    let fwdIn = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let strafe = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let sprint = k.has('ShiftLeft') || k.has('ShiftRight') || M.touch.sprint;
    let hb = k.has('Space');

    if (M.touch.active) { fwdIn = -M.touch.vy; strafe = M.touch.vx; }

    if (p.car) {
      const car = p.car;
      if (car.dead) { car.throttle = 0; car.brake = 1; return; }
      const sH = Math.sin(car.h), cH = Math.cos(car.h);
      const vAlong = car.vx * sH + car.vz * cH;
      car.steer = U.clamp(-strafe, -1, 1); // +h turns screen-left, so D (strafe+) needs negative steer
      car.handbrake = hb || (M.touch.active && M.touch.sprint);
      if (fwdIn > 0.05) { car.throttle = Math.min(1, fwdIn); car.brake = 0; }
      else if (fwdIn < -0.05) {
        if (vAlong > 0.6) { car.brake = Math.min(1, -fwdIn); car.throttle = 0; }
        else { car.throttle = Math.max(-0.62, fwdIn * 0.62); car.brake = 0; }
      } else { car.throttle = 0; car.brake = 0; }
      p.sprint = false;
    } else {
      // camera-relative movement (screen-right = view x up = (-cos, sin))
      const fy = M.camYaw;
      const fx = Math.sin(fy), fz = Math.cos(fy);
      const rx = -Math.cos(fy), rz = Math.sin(fy);
      p.inX = fx * fwdIn + rx * strafe;
      p.inZ = fz * fwdIn + rz * strafe;
      p.sprint = !!sprint;
    }
  }

  // ================= camera =================
  function updateCamera(rawDt) {
    const st = GT.state, p = st.player;
    if (!p) return;
    const inCar = !!p.car;
    const ref = inCar ? p.car : p;

    M.manualT = Math.max(0, M.manualT - rawDt);
    const moving = inCar ? (Math.abs(ref.vx) + Math.abs(ref.vz) > 1.2) : p.moving;
    if (M.manualT <= 0 && moving && st.mode !== 'title') {
      const rate = (inCar ? 2.9 : 2.2) * rawDt;
      M.camYaw = U.approachAngle(M.camYaw, ref.h, rate);
    }

    const dist = (inCar ? C.CAM_DIST_CAR : C.CAM_DIST_FOOT) * M.zoomMul;
    const ty = (inCar ? 1.7 : 1.45) + GT.city.groundY(ref.x, ref.z);
    const cosP = Math.cos(M.camPitch), sinP = Math.sin(M.camPitch);
    let ex = ref.x - Math.sin(M.camYaw) * dist * cosP;
    let ez = ref.z - Math.cos(M.camYaw) * dist * cosP;
    let ey = ty + dist * sinP;

    if (GT.sim.shake > 0.01) {
      const s = GT.sim.shake;
      ex += (Math.random() - 0.5) * s; ey += (Math.random() - 0.5) * s * 0.6; ez += (Math.random() - 0.5) * s;
    }
    const minY = GT.city.groundY(ex, ez) + 0.7;
    if (ey < minY) ey = minY;

    M.camera.position.set(ex, ey, ez);
    M.camera.lookAt(ref.x, ty, ref.z);
  }

  function titleCamera(t) {
    const a = t * 0.06;
    M.camera.position.set(Math.sin(a) * 120, 46, Math.cos(a) * 120);
    M.camera.lookAt(0, 8, 0);
  }

  // ================= main loop =================
  GT.update = function (rawDt) {
    const st = GT.state;
    st.time += rawDt;

    // NaN guard
    const p = st.player;
    if (p && (!isFinite(p.x) || !isFinite(p.z))) {
      p.x = GT.POI.safehouse.x + 7; p.z = GT.POI.safehouse.z + 9; p.vx = p.vz = 0;
      if (p.car) { p.car.x = p.x; p.car.z = p.z; p.car.vx = p.car.vz = 0; }
    }

    if (st.mode === 'title') {
      titleCamera(st.time);
      GT.audio.update(rawDt, st);
      return;
    }

    if (st.mode === 'play') {
      const dt = rawDt * st.timescale;
      applyInput();
      GT.ai.update(dt);
      GT.sim.update(dt, rawDt);
      GT.missions.update(dt);
    }
    // dialog/pause/credits: world frozen

    GT.audio.update(rawDt, st);
    GT.hud.update(rawDt);
    if (st.mode !== 'pause') updateCamera(rawDt);
  };

  function loop(t) {
    requestAnimationFrame(loop);
    const rawDt = Math.min(0.05, (t - (M.lastT || t)) / 1000);
    M.lastT = t;
    GT.update(rawDt);
    M.renderer.render(M.scene, M.camera);
  }

  // ================= go =================
  if (!GT.headless) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', GT.init);
    else GT.init();
  }
})();

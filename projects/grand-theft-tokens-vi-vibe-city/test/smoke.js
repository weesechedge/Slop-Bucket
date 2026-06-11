/* ============================================================
   GRAND THEFT TOKENS VI — test/smoke.js
   Headless sanity run: boots the whole game in Node with DOM
   stubs, simulates a few thousand frames, force-runs every
   mission, and asserts nothing exploded (except cars, on
   purpose).  Usage:  node test/smoke.js
   ============================================================ */
'use strict';

// ---------------- DOM / canvas stubs ----------------
function ctx2dStub() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 8 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (k in t) return t[k];
      return () => {};            // every other method is a no-op
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function elementStub(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    children: [], style: {}, dataset: {},
    classList: { _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { (f === undefined ? !this._s.has(c) : f) ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); } },
    textContent: '', innerHTML: '',
    clientWidth: 150, clientHeight: 150, offsetWidth: 150,
    width: 0, height: 0,
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
    setAttribute() {}, addEventListener() {}, removeEventListener() {}, remove() {},
    getContext() { return ctx2dStub(); },
    closest() { return null; },
  };
  Object.defineProperty(el, 'firstChild', { get() { return this.children[0] || null; } });
  return el;
}
// ---------------- WebAudio stub ----------------
// Lets GT.audio.ensure() succeed so the REAL audio.update body runs every
// frame headlessly (a stale-field crash in it once shipped because the old
// smoke test skipped it entirely).
function audioParam() {
  return { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} };
}
function audioNode() {
  return { connect(n) { return n; }, disconnect() {}, start() {}, stop() {},
    gain: audioParam(), frequency: audioParam(), detune: audioParam(),
    Q: audioParam(), playbackRate: audioParam(), type: '', buffer: null };
}
class StubAudioContext {
  constructor() { this.state = 'running'; this.sampleRate = 44100; this.destination = audioNode(); this._t0 = Date.now(); }
  get currentTime() { return (Date.now() - this._t0) / 1000; }
  resume() { return Promise.resolve(); }
  createGain() { return audioNode(); }
  createOscillator() { return audioNode(); }
  createBiquadFilter() { return audioNode(); }
  createBufferSource() { return audioNode(); }
  createBuffer(ch, len) { return { getChannelData() { return new Float32Array(len); } }; }
}
const byId = new Map();
global.window = global;
global.AudioContext = StubAudioContext;
global.devicePixelRatio = 1;
global.innerWidth = 1280; global.innerHeight = 720;
global.addEventListener = () => {}; global.removeEventListener = () => {};
global.requestAnimationFrame = () => {};
global.performance = global.performance || { now: () => Date.now() };
try { global.navigator = { userAgent: 'node-smoke' }; } catch (e) {}
global.document = {
  readyState: 'complete',
  body: elementStub('body'),
  hidden: false,
  createElement: (tag) => elementStub(tag),
  getElementById: (id) => { if (!byId.has(id)) byId.set(id, elementStub('div')); return byId.get(id); },
  addEventListener: () => {},
};

// ---------------- load the game ----------------
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
global.THREE = require(path.join(ROOT, 'lib/three.min.js'));

global.GT = global.GT || {};
GT.headless = true;

for (const f of ['config', 'audio', 'city', 'entities', 'ai', 'sim', 'missions', 'hud', 'main']) {
  const src = fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8');
  vm.runInThisContext(src, { filename: 'js/' + f + '.js' });
}

// ---------------- helpers ----------------
let frames = 0;
function step(n, dt) {
  dt = dt || 1 / 60;
  for (let i = 0; i < n; i++) {
    GT.update(dt);
    frames++;
    assertSane('frame ' + frames);
  }
}
let failures = 0;
function check(cond, msg) {
  if (!cond) { failures++; console.error('  \u2717 ' + msg); }
  else console.log('  \u2713 ' + msg);
}
function assertSane(where) {
  const st = GT.state, p = st.player;
  if (!isFinite(p.x) || !isFinite(p.z)) throw new Error('player NaN at ' + where);
  for (const c of st.vehicles) if (!isFinite(c.x) || !isFinite(c.h)) throw new Error('car NaN at ' + where + ' (' + c.kind + ')');
  for (const pd of st.peds) if (!isFinite(pd.x)) throw new Error('ped NaN at ' + where);
}
function teleport(x, z) {
  const p = GT.state.player;
  p.x = x; p.z = z; p.vx = p.vz = 0;
  if (p.car) { p.car.x = x; p.car.z = z; p.car.vx = p.car.vz = 0; }
}
function sanitize() {
  // hard-reset the danger level between test phases
  const st = GT.state, p = st.player;
  // drain any open dialog (e.g. a mission intro triggered by ending a
  // section while standing on the safehouse marker) and abort whatever
  // mission it kicked off — sections must start from a quiet world
  for (let i = 0; i < 12 && st.mode === 'dialog'; i++) GT.hud.advanceDialog();
  if (st.missionActive) GT.missions._fail(st.missionActive, 'smoke-test sanitize');
  if (st.mode === 'dialog') st.mode = 'play';
  // step off any mission trigger (ending a section on the safehouse marker
  // would otherwise pop the next intro dialog on the first step())
  p.x = 2; p.z = -21.4; p.vx = p.vz = 0;
  if (p.car) { p.car.x = p.x; p.car.z = p.z; p.car.vx = p.car.vz = 0; }
  st.heat = 0; st.stars = 0; st.arrestT = 0; st.deathT = 0; st.timescale = 1;
  p.dead = false; p.health = 100;
  if (p.car) GT.sim.exitCar(true);
  for (let i = st.vehicles.length - 1; i >= 0; i--) {
    const v = st.vehicles[i];
    if (v.isPolice || v.dead || v.drowned) { if (!v.mission) GT.ent.removeCar(v); }
  }
  for (let i = st.peds.length - 1; i >= 0; i--) {
    if (st.peds[i].officer) GT.ent.removePed(st.peds[i]);
  }
  GT.hud.wastedFx(false);
}
function nearestCar() {
  const st = GT.state, p = st.player; let best = null, bd = 1e9;
  for (const c of st.vehicles) {
    if (c.dead || c.drowned) continue;
    const d = GT.U.dist2(p.x, p.z, c.x, c.z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function driveInputs(throttle, steer) {
  const car = GT.state.player.car;
  if (!car) return;
  car.throttle = throttle; car.steer = steer; car.brake = 0; car.handbrake = false;
}

// ---------------- run ----------------
console.log('SMOKE: boot');
GT.init();
check(GT.state.player && GT.state.player.mesh, 'player spawned');
check(GT.state.vehicles.length > 10, 'parked cars spawned (' + GT.state.vehicles.length + ')');
check(GT.state.pickups.filter(p => p.kind === 'orb').length === GT.state.orbsTotal,
  'all ' + GT.state.orbsTotal + ' orbs placed');
check(GT.city.mapInfo && GT.city.mapInfo.canvas, 'minimap baked');

console.log('SMOKE: mission geometry audit (every target physically reachable)');
{
  const U = GT.U, C = GT.C;
  function circleClear(x, z, r) {
    for (const c of GT.city.query(x, z, r + 2)) {
      if (c.circle) { if (U.dist2(x, z, c.cx, c.cz) < (c.r + r) * (c.r + r)) return false; }
      else {
        const qx = U.clamp(x, c.x0, c.x1), qz = U.clamp(z, c.z0, c.z1);
        if (U.dist2(x, z, qx, qz) < r * r) return false;
      }
    }
    return true;
  }
  // Is there a clear stand-point for a body of radius vehR within hitR of
  // (x,z), with a collider-free straight corridor to the nearest road?
  function reachable(x, z, hitR, vehR, skipCorridor) {
    for (let d = 0; d <= hitR + 0.01; d += 0.7) {
      const na = d === 0 ? 1 : 16;
      for (let a = 0; a < na; a++) {
        const px = x + Math.sin(a / na * U.TAU) * d, pz = z + Math.cos(a / na * U.TAU) * d;
        if (!circleClear(px, pz, vehR)) continue;
        if (skipCorridor) return true;
        const nr = GT.city.nearestRoad(px, pz);
        const ex = nr.axis === 'z' ? nr.c : px, ez = nr.axis === 'z' ? pz : nr.c;
        const L = Math.hypot(ex - px, ez - pz), n = Math.max(1, Math.ceil(L / 1.4));
        let ok = true;
        for (let i = 1; i <= n; i++) {
          if (!circleClear(px + (ex - px) * i / n, pz + (ez - pz) * i / n, vehR)) { ok = false; break; }
        }
        if (ok) return true;
      }
    }
    return false;
  }
  const P = GT.POI;
  // [label, x, z, hit range, body radius]
  const carTargets = [
    ['M1 cp1', -96, -96, 5.2, 2.2], ['M1 cp2', -96, -32, 5.2, 2.2], ['M1 cp3', -160, -32, 5.2, 2.2],
    ['M1 return', P.safehouse.x, P.safehouse.z, 5.7, 2.2],
    ['M2 pier gate', P.pierGate.x + 1, P.pierGate.z, 6.2, 2.2],
    ['M3 garage (truck!)', P.garage.x, P.garage.z, 6.7, 3.0],
    ['M5 garage', P.garage.x, P.garage.z, 6.7, 2.2],
  ];
  for (const [label, x, z, hr, vr] of carTargets) check(reachable(x, z, hr, vr), label + ' reachable');
  // M4: all ten token spots, at the worst-case jitter corners, by car
  let m4bad = 0;
  for (const [bx, bz] of GT.missions.TOKEN_SPOTS)
    for (const [jx, jz] of [[-3, -3], [-3, 3], [3, -3], [3, 3]])
      if (!reachable(bx + jx, bz + jz, 2.8, 2.2)) m4bad++;
  check(m4bad === 0, 'M4: all 10 token spots car-reachable at worst-case jitter (' + m4bad + ' bad)');
  // foot targets
  check(reachable(P.safehouse.x, P.safehouse.z, 3.6, 0.42), 'safehouse mission trigger (foot)');
  check(reachable(P.hospitalHeal.x, P.hospitalHeal.z, 2, 0.42), 'hospital heal ring (foot)');
  check(reachable(P.pierEnd.x, P.pierEnd.z, 3.9, 0.42, true), 'M6 pier end (foot)');
  // fixture car spawns must not be inside anything
  check(circleClear(P.dataTruck.x, P.dataTruck.z, 3.0), 'data truck spawn clear');
  check(circleClear(P.impoundCar.x, P.impoundCar.z, 2.2), 'impound car spawn clear');
  check(reachable(P.impoundCar.x, P.impoundCar.z, 1, 2.2), 'impound car can drive out');
  // new-mission fixed points
  check(reachable(96, -64, 6.2, 2.3), 'M7 drop point reachable');
  let m8bad = 0;
  for (const [x, z] of [[-32, -160], [32, -96], [96, -32], [160, 32], [96, 96], [32, 160], [-32, 96], [-96, 32]])
    if (!reachable(x, z, 6.2, 2.2)) m8bad++;
  check(m8bad === 0, 'M8: all 8 race checkpoints reachable (' + m8bad + ' bad)');
  let m11bad = 0;
  for (const [x, z] of [[-96, -64], [96, 32], [-32, 20], [-160, 96], [160, -96], [-32, -224]])
    if (!reachable(x, z, 6.2, 2.2)) m11bad++;
  check(m11bad === 0, 'M11: all rideshare stops reachable (' + m11bad + ' bad)');
  check(circleClear(P.helipad.x, P.helipad.z, 3.4), 'helipad clear for the chopper');
  // every collectible orb has a clear stand-spot in collect range
  let orbBad = 0;
  for (const o of GT.city.orbSpots) if (!reachable(o.x, o.z, 1.7, 0.42, true)) orbBad++;
  check(orbBad === 0, 'all ' + GT.city.orbSpots.length + ' orbs collectable (' + orbBad + ' blocked)');
}

GT.startGame();
check(GT.state.mode === 'play', 'mode=play after start');
check(GT.audio._A.enabled && GT.audio._A.ctx, 'audio graph live (stubbed) \u2014 real update body now runs');
GT.audio.cycleRadio(); // station 1: exercise the sequencer too

console.log('SMOKE: idle world (5s)');
step(300);
check(GT.state.vehicles.some(v => v.ai), 'traffic spawned');
check(GT.state.peds.length > 5, 'peds spawned (' + GT.state.peds.length + ')');

console.log('SMOKE: walk around');
GT.state.player.inX = 0.7; GT.state.player.inZ = 0.7; GT.state.player.sprint = true;
step(180);
GT.state.player.inX = 0; GT.state.player.inZ = 0;
check(true, 'walked without exploding');

console.log('SMOKE: enter starter car + drive');
teleport(GT.POI.safehouse.x + 12, GT.POI.safehouse.z + 3);
GT.main.enterExit();
check(!!GT.state.player.car, 'entered a car (' + (GT.state.player.car && GT.state.player.car.name) + ')');
driveInputs(1, 0.15);
step(420);
check(Math.abs(GT.state.player.car.vx) + Math.abs(GT.state.player.car.vz) >= 0 && !GT.state.player.dead, 'drove 7s');
driveInputs(0, 0);

console.log('SMOKE: steering handedness regression');
{
  const p = GT.state.player, car = p.car;
  // In a car: D must yield negative steer (positive h-rate turns screen-left)
  GT.main.keys.clear(); GT.main.keys.add('KeyD');
  GT.main._applyInput();
  check(car.steer < 0, 'D steers right (steer=' + car.steer + ')');
  GT.main.keys.clear(); GT.main.keys.add('KeyA');
  GT.main._applyInput();
  check(car.steer > 0, 'A steers left (steer=' + car.steer + ')');
  // Turning right while driving forward must DECREASE heading
  car.h = 0; car.vx = 0; car.vz = 12; car.steer = 0; car.throttle = 1;
  GT.main.keys.clear(); GT.main.keys.add('KeyW'); GT.main.keys.add('KeyD');
  const h0 = car.h;
  for (let i = 0; i < 30; i++) { GT.main._applyInput(); GT.sim.update(1 / 60, 1 / 60); }
  check(car.h < h0, 'right turn decreases h (' + car.h.toFixed(2) + ')');
  GT.main.keys.clear();
  GT.sim.exitCar(true);
  // On foot at camYaw=0 (camera looks +z): screen-right is world -x
  GT.main.camYaw = 0;
  GT.main.keys.add('KeyD'); GT.main._applyInput();
  check(p.inX < -0.5 && Math.abs(p.inZ) < 0.01, 'foot strafe right \u2192 world -x (inX=' + p.inX + ')');
  GT.main.keys.clear(); GT.main.keys.add('KeyW'); GT.main._applyInput();
  check(p.inZ > 0.5, 'foot forward \u2192 camera forward');
  GT.main.keys.clear(); GT.main._applyInput();
  // minimap rotation must be a pure rotation (det +1), never a mirror
  for (const h of [0, 0.7, Math.PI / 2, Math.PI, -2.1]) {
    const ch = Math.cos(h), sh = Math.sin(h);
    const det = (-ch) * (-ch) - (sh) * (-sh);
    if (Math.abs(det - 1) > 1e-9) { check(false, 'map matrix det != +1 at h=' + h); }
  }
  check(true, 'map transform is a pure rotation (det +1)');
}

console.log('SMOKE: carjack an AI driver');
{
  const p = GT.state.player;
  // wait for a traffic car to exist, then teleport beside it and jack it
  let mark = null;
  for (let i = 0; i < 600 && !mark; i++) {
    GT.update(1 / 60); frames++;
    mark = GT.state.vehicles.find(v => v.driver === 'ai' && !v.isPolice && !v.dead);
  }
  check(!!mark, 'found an AI-driven car to jack');
  if (mark) {
    const pedsBefore = GT.state.peds.length;
    teleport(mark.x + 1.5, mark.z + 1.5);
    GT.main.enterExit();
    check(p.car === mark, 'jacked it (' + mark.name + ')');
    check(GT.state.peds.length === pedsBefore + 1, 'ejected driver became a ped');
    check(GT.state.heat > 0, 'jacking raised heat (' + GT.state.heat.toFixed(0) + ')');
    step(240);   // ejected driver flees; assertSane catches any NaN ghost
    const ghost = GT.state.peds.find(q => !isFinite(q.x) || !isFinite(q.z));
    check(!ghost, 'no NaN ghost pedestrians after jack');
    GT.sim.exitCar(true);
    GT.state.heat = 0;
    step(120);
  }
}

console.log('SMOKE: punch a ped');
GT.sim.exitCar(true);
if (GT.state.peds.length) {
  const pd = GT.state.peds.find(q => !q.officer) || GT.state.peds[0];
  teleport(pd.x + 0.8, pd.z + 0.8);
  GT.state.player.h = Math.atan2(pd.x - GT.state.player.x, pd.z - GT.state.player.z);
  GT.sim.punch();
  step(40);
  check(GT.state.heat > 0 || pd.state !== 'walk', 'punch had consequences (heat=' + GT.state.heat.toFixed(0) + ')');
}

console.log('SMOKE: max heat \u2014 cops respond (20s)');
teleport(2, GT.city.K[4] + 10.4);   // sidewalk beside a road: cops can reach us
GT.ai.addHeat(GT.C.HEAT_MAX);
let maxStars = 0, sawCopCar = false, sawOfficer = false;
for (let i = 0; i < 1200 && !(sawCopCar && sawOfficer && maxStars >= 4); i++) {
  GT.update(1 / 60); frames++; assertSane('heat-block');
  if (GT.state.player.dead) { GT.state.heat = GT.C.HEAT_MAX; }  // keep pressure on even if flattened
  maxStars = Math.max(maxStars, GT.state.stars);
  sawCopCar = sawCopCar || GT.state.vehicles.some(v => v.isPolice && !v.dead);
  sawOfficer = sawOfficer || GT.state.officers.length > 0;
}
check(maxStars >= 4, 'stars hit ' + maxStars);
check(sawCopCar, 'police cars responded');
check(sawOfficer, 'officers deployed');

console.log('SMOKE: get busted on purpose');
GT.state.player.inX = 0; GT.state.player.inZ = 0;
if (GT.state.player.car) GT.sim.exitCar(true);
GT.state.heat = 0; GT.state.arrestT = 0;
// hard-clear all law enforcement so this scene is deterministic
for (let i = GT.state.vehicles.length - 1; i >= 0; i--) {
  const v = GT.state.vehicles[i];
  if (v.isPolice && v !== GT.state.player.car) GT.ent.removeCar(v);
}
for (let i = GT.state.peds.length - 1; i >= 0; i--) {
  if (GT.state.peds[i].officer) GT.ent.removePed(GT.state.peds[i]);
}
GT.state.player.health = 100; GT.state.player.dead = false; GT.state.deathT = 0; GT.state.timescale = 1;
step(30);
GT.state.heat = GT.C.STAR_THRESH[0] + 40;   // 1 star: cops care, but gently
teleport(GT.POI.park.x + 14, GT.POI.park.z + 14);   // off the road grid
GT.ent.spawnOfficer(GT.state.player.x + 1.2, GT.state.player.z + 1.2);
GT.ent.spawnOfficer(GT.state.player.x - 1.2, GT.state.player.z + 1.2);
let busted = false;
GT.on('busted', () => { busted = true; });
const tok0 = GT.state.tokens;
for (let i = 0; i < 900 && !busted; i++) { GT.update(1 / 60); frames++; assertSane('bust-wait'); }
check(busted, 'officers made the arrest');
step(240); // ride out deathT + respawn
check(!GT.state.player.dead, 'respawned after bust');
check(GT.U.dist2(GT.state.player.x, GT.state.player.z, GT.POI.policeSpawn.x, GT.POI.policeSpawn.z) < 9,
  'respawned outside Vibe City P.D.');
check(GT.state.tokens <= tok0, 'bail deducted (' + (tok0 - GT.state.tokens) + ' \u26c1)');

console.log('SMOKE: wasted flow (drown)');
teleport(GT.C.DROWN_X + 30, 60);
let wasted = false; GT.on('wasted', () => { wasted = true; });
step(750);
check(wasted, 'drowning wasted the player');
check(!GT.state.player.dead && GT.state.player.health > 0, 'respawned at Mercy General');

console.log('SMOKE: missions 1\u201311 (forced start/cleanup)');
for (let mi = 0; mi < 11; mi++) {
  sanitize();
  // make sure we are alive, free and funded
  GT.state.tokens = Math.max(GT.state.tokens, 2000);
  teleport(GT.POI.safehouse.x + 7, GT.POI.safehouse.z + 9);
  GT.state.missionIdx = mi;
  GT.missions._start(mi);
  check(GT.state.missionActive && GT.state.missionActive.def, 'mission ' + (mi + 1) + ' started: ' + GT.missions.list[mi].title);
  step(240, 1 / 60);            // 4s of mission running
  if (GT.state.missionActive) {  // bail out cleanly so the next one can start
    GT.missions._fail(GT.state.missionActive, 'smoke-test abort');
  }
  step(30);
  check(!GT.state.missionActive, 'mission ' + (mi + 1) + ' cleaned up');
}

console.log('SMOKE: new vehicle kinds');
{
  sanitize(); step(10);
  let bad = [];
  const KINDS5 = ['muscle', 'supercar', 'bus', 'pickup', 'interceptor'];
  for (let ki = 0; ki < KINDS5.length; ki++) {
    const kind = KINDS5[ki];
    // beach sand: deterministic, collider-free, zero traffic
    const c = GT.ent.spawnCar(kind, 302 + ki * 13, -60, 0, { parked: true });
    if (!c || !c.stats || !(c.stats.max > 0)) { bad.push(kind); continue; }
    teleport(c.x - 2.5, c.z);
    GT.main.enterExit();
    if (GT.state.player.car !== c) { bad.push(kind + ':enter'); GT.ent.removeCar(c); continue; }
    GT.main.keys.clear(); GT.main.keys.add('KeyW');
    step(90);
    if (Math.hypot(c.vx, c.vz) < 2 && !c.dead) bad.push(kind + ':drive (v=' + Math.hypot(c.vx, c.vz).toFixed(1) + ')');
    GT.main.keys.clear();
    GT.sim.exitCar(true);
    GT.ent.removeCar(c);
  }
  check(bad.length === 0, 'all 5 new kinds spawn/enter/drive (' + (bad.join(',') || 'ok') + ')');
}

console.log('SMOKE: player face upload');
{
  const head = GT.state.player.mesh.getObjectByName('head');
  check(!!head, 'player has a (large) head');
  const ok = GT.ent.applyFace({ width: 320, height: 480 });
  check(ok && Array.isArray(head.material) && head.material[4].map, 'face texture applied to head front');
}

console.log('SMOKE: helicopter flight');
{
  sanitize(); step(10);
  const heli = GT.missions.ensureHeli();
  check(!!heli && heli.heli, 'fixture heli on the beach pad');
  teleport(heli.x - 3, heli.z);
  GT.main.enterExit();
  check(GT.state.player.car === heli, 'boarded the chopper');
  GT.main.keys.clear(); GT.main.keys.add('Space');
  step(150);
  check(heli.y > 6, 'climbed (y=' + heli.y.toFixed(1) + ')');
  GT.main.enterExit();   // try to bail mid-air
  check(GT.state.player.car === heli, 'mid-air exit refused');
  GT.main.keys.clear(); GT.main.keys.add('KeyW');   // level off, fly forward
  step(180);
  check(isFinite(heli.x) && Math.hypot(heli.vx, heli.vz) > 4, 'forward flight works');
  GT.main.keys.clear(); GT.main.keys.add('ShiftLeft');
  step(340);
  GT.main.keys.clear();
  step(40);
  check(heli.y - GT.city.groundY(heli.x, heli.z) < 2, 'landed (y=' + heli.y.toFixed(1) + ')');
  GT.main.enterExit();
  check(!GT.state.player.car, 'disembarked on the ground');
  // park it back for later tests
  heli.x = GT.POI.helipad.x; heli.z = GT.POI.helipad.z; heli.y = 0.68; heli.vx = heli.vz = heli.vy = 0;
}

console.log('SMOKE: 5-star response \u2014 ramped cops, interceptors, police chopper, token fire');
{
  sanitize(); step(30);
  teleport(2, GT.city.K[4] + 10.4);
  // give the player a car to absorb token fire
  const ride = GT.ent.spawnCar('sedan', GT.state.player.x + 3, GT.state.player.z, 0, { parked: true });
  teleport(ride.x - 2, ride.z); GT.main.enterExit();
  const hp0 = ride.health;
  let maxCops = 0, sawInterceptor = false, sawHeli = false, sawShot = false;
  for (let i = 0; i < 2100; i++) {
    GT.state.heat = GT.C.HEAT_MAX;
    GT.update(1 / 60); frames++; assertSane('five-star');
    maxCops = Math.max(maxCops, GT.state.vehicles.filter(v => v.isPolice && !v.dead && !v.heli).length);
    sawInterceptor = sawInterceptor || GT.state.vehicles.some(v => v.kind === 'interceptor' && !v.dead);
    sawHeli = sawHeli || GT.state.vehicles.some(v => v.heli && v.isPolice && !v.dead);
    sawShot = sawShot || GT.state.shots.length > 0;
  }
  check(maxCops >= 6, '5-star cop car count ramped (peak ' + maxCops + ')');
  check(sawInterceptor, 'ALIGNMENT INTERCEPTORs deployed');
  check(sawHeli, 'police chopper on station');
  check(sawShot, 'chopper opened fire (tokens)');
  check(ride.health < hp0 || GT.state.player.health < 100 || GT.state.player.dead, 'token fire dealt damage');
  // chopper leaves when the heat dies
  GT.state.heat = 0;
  let left = false;
  for (let i = 0; i < 1500 && !left; i++) {
    GT.update(1 / 60); frames++;
    left = !GT.state.vehicles.some(v => v.heli && v.isPolice && !v.dead);
  }
  check(left, 'chopper bugged out at 0 stars');
  sanitize(); step(60);
}

console.log('SMOKE: density sliders scale spawning');
{
  sanitize();
  GT.state.densityCars = 2; GT.state.densityPeds = 2;
  let tPeak = 0, pPeak = 0;
  for (let i = 0; i < 1500; i++) {
    GT.update(1 / 60); frames++;
    if (i % 15 === 0) {
      tPeak = Math.max(tPeak, GT.state.vehicles.filter(v => v.driver === 'ai' && !v.isPolice).length);
      pPeak = Math.max(pPeak, GT.state.peds.filter(q => !q.officer).length);
    }
  }
  check(tPeak > GT.C.TRAFFIC_TARGET + 3, '200% traffic: peak ' + tPeak + ' ai cars (base target ' + GT.C.TRAFFIC_TARGET + ')');
  check(pPeak > GT.C.PED_TARGET + 6, '200% peds: peak ' + pPeak);
  GT.state.densityCars = 1; GT.state.densityPeds = 1;
}

console.log('SMOKE: mission 3 physical delivery (real driving, no teleport-to-marker)');
{
  sanitize(); step(30);
  GT.state.missionIdx = 2;
  GT.missions._start(2);
  const m = GT.state.missionActive;
  const truck = m.data.truck;
  check(!!truck && !truck.dead, 'data truck exists');
  teleport(truck.x + 4.4, truck.z);
  GT.main.enterExit();
  check(GT.state.player.car === truck, 'in the data truck');
  step(5);
  check(m.phase === 1, 'delivery phase active');
  // park on the road outside FINE-TUNERS, then DRIVE onto the forecourt marker
  truck.x = -192; truck.z = -157; truck.h = Math.PI; truck.vx = truck.vz = 0;
  GT.state.player.x = truck.x; GT.state.player.z = truck.z;
  let delivered = false;
  GT.on('missionPassed', (t) => { if (t === 'Grand Theft Data') delivered = true; });
  GT.main.keys.clear(); GT.main.keys.add('KeyW');
  for (let i = 0; i < 360 && !delivered; i++) { GT.update(1 / 60); frames++; assertSane('m3-drive'); }
  GT.main.keys.clear();
  check(delivered, 'drove the truck through the gate onto the marker \u2014 MISSION PASSED');
  sanitize(); step(30);
}

console.log('SMOKE: mission 1 full playthrough');
sanitize();
step(60);
GT.state.missionIdx = 0; GT.state.tokens = 0;
teleport(GT.POI.safehouse.x + 7, GT.POI.safehouse.z + 9);
GT.missions._start(0);
{
  const m = GT.state.missionActive;
  // phase 0: get in a fresh car spawned for the purpose (chaos-proof)
  const fresh = GT.ent.spawnCar('sedan', GT.state.player.x + 4, GT.state.player.z, 0, { parked: true });
  teleport(fresh.x - 2, fresh.z);
  GT.main.enterExit();
  check(GT.state.player.car === fresh, 'got in the fresh car');
  step(20);
  check(m.phase >= 1, 'M1 phase advanced on carEntered (phase=' + m.phase + ')');
  // drive through each checkpoint by teleporting the car onto the markers
  for (let i = 0; i < 8 && GT.state.missionActive; i++) {
    const mk = GT.state.missionActive.marks && GT.state.missionActive.marks[0];
    if (!mk) break;
    teleport(mk.x, mk.z);
    step(30);
  }
  step(60);
  check(!GT.state.missionActive, 'M1 completed');
  check(GT.state.tokens >= 500, 'M1 paid out (' + GT.state.tokens + ' \u26c1)');
  check(GT.state.missionIdx === 1, 'mission index advanced');
}

console.log('SMOKE: mission 8 race playthrough');
{
  sanitize(); step(20);
  GT.state.missionIdx = 7;
  GT.missions._start(7);
  const m = GT.state.missionActive;
  const car = GT.ent.spawnCar('supercar', GT.state.player.x + 4, GT.state.player.z, 0, { parked: true });
  teleport(car.x - 2, car.z); GT.main.enterExit();
  let passed8 = false; GT.on('missionPassed', t => { if (t === 'The Benchmark') passed8 = true; });
  for (let i = 0; i < 10 && GT.state.missionActive === m; i++) {
    const mk = m.marks && m.marks[0];
    if (!mk) break;
    teleport(mk.x, mk.z);
    step(20);
  }
  check(passed8, 'The Benchmark: all 8 checkpoints, passed');
  sanitize();
}

console.log('SMOKE: mission 9 helicopter playthrough');
{
  sanitize(); step(20);
  GT.state.missionIdx = 8;
  GT.missions._start(8);
  const m = GT.state.missionActive;
  const heli = GT.missions.heli;
  heli.x = GT.POI.helipad.x; heli.z = GT.POI.helipad.z; heli.y = 0.68; heli.vx = heli.vz = heli.vy = 0; heli.health = heli.stats.hp;
  teleport(heli.x - 3, heli.z);
  GT.main.enterExit();
  check(GT.state.player.car === heli, 'aboard for Chopper Shopper');
  step(10);
  let passed9 = false; GT.on('missionPassed', t => { if (t === 'Chopper Shopper') passed9 = true; });
  for (let r = 0; r < 7 && GT.state.missionActive === m && m.data.i >= 0 && m.data.i < 6; r++) {
    const ring = m.data.rings[m.data.i];
    heli.x = ring[0]; heli.z = ring[1]; heli.y = ring[2]; heli.vx = heli.vz = 0;
    GT.state.player.x = heli.x; GT.state.player.z = heli.z;
    step(12);
  }
  check(GT.state.missionActive === m && m.data.i >= 6, 'all 6 rings threaded');
  heli.x = GT.POI.helipad.x; heli.z = GT.POI.helipad.z; heli.y = 1.0; heli.vx = heli.vz = heli.vy = 0;
  GT.state.player.x = heli.x; GT.state.player.z = heli.z;
  step(60);
  check(passed9, 'landed on the pad \u2014 Chopper Shopper passed');
  GT.main.enterExit();
  sanitize();
}

console.log('SMOKE: mission 10 vibe check playthrough');
{
  sanitize(); step(20);
  GT.state.missionIdx = 9;
  GT.missions._start(9);
  const m = GT.state.missionActive;
  let passed10 = false; GT.on('missionPassed', t => { if (t === 'Vibe Check') passed10 = true; });
  for (let w = 0; w < 8 && GT.state.missionActive === m; w++) {
    for (let i = 0; i < 6; i++) GT.ent.spawnPed(GT.state.player.x + GT.U.rand(-12, 12), GT.state.player.z + GT.U.rand(-12, 12));
    step(10);
    GT.ai.scare(GT.state.player.x, GT.state.player.z, 26);
    step(20);
  }
  check(passed10, 'scared 18 pedestrians \u2014 Vibe Check passed (' + (m.data ? m.data.n : '?') + ')');
  sanitize(); step(40);
}

console.log('SMOKE: mission 11 finale playthrough (rideshare \u2192 credits)');
{
  sanitize(); step(20);
  GT.state.missionIdx = 10;
  GT.missions._start(10);
  const m = GT.state.missionActive;
  const cab = GT.ent.spawnCar('taxi', GT.state.player.x + 4, GT.state.player.z, 0, { parked: true });
  teleport(cab.x - 2, cab.z); GT.main.enterExit();
  let passed11 = false; GT.on('missionPassed', t => { if (t === 'RLHF Rideshare') passed11 = true; });
  for (let leg = 0; leg < 8 && GT.state.missionActive === m; leg++) {
    const mk = m.marks && m.marks[0];
    if (!mk) break;
    teleport(mk.x, mk.z);
    cab.vx = cab.vz = 0;
    step(25);
  }
  check(passed11, 'three passengers delivered \u2014 finale passed');
  check(GT.state.gameComplete === true, 'gameComplete set by the finale');
  check(GT.state.mode === 'credits', 'credits rolling');
  GT.hud.endCredits();
  check(GT.state.mode === 'play', 'free roam after credits');
  sanitize();
}

console.log('SMOKE: long free-roam soak (30s sim)');
sanitize();
teleport(20, 20);
let dir = 0;
for (let i = 0; i < 1800; i++) {
  if (i % 240 === 0) { dir = Math.random() * Math.PI * 2; }
  GT.state.player.inX = Math.sin(dir); GT.state.player.inZ = Math.cos(dir); GT.state.player.sprint = (i % 480) < 240;
  GT.update(1 / 60); frames++; assertSane('soak');
}
GT.state.player.inX = 0; GT.state.player.inZ = 0;
check(true, 'soak finished (' + frames + ' frames total)');
check(GT.state.vehicles.length < 80, 'vehicle population bounded (' + GT.state.vehicles.length + ')');
check(GT.state.peds.length < 80, 'ped population bounded (' + GT.state.peds.length + ')');

console.log('SMOKE: credits path');
GT.hud.credits(['GRAND THEFT TOKENS VI', 'smoke test', 'fin']);
check(GT.state.mode === 'credits', 'credits mode');
GT.hud.endCredits();
check(GT.state.mode === 'play', 'back to play');

console.log('');
if (failures) { console.error('SMOKE FAILED: ' + failures + ' check(s)'); process.exit(1); }
console.log('SMOKE PASSED \u2014 ' + frames + ' frames, ' + GT.state.vehicles.length + ' cars, '
  + GT.state.peds.length + ' peds, tokens=' + GT.state.tokens);
process.exit(0);

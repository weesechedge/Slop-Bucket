/* ============================================================
   GRAND THEFT TOKENS VI — config.js
   World constants, global state, utils, event bus.
   Everything lives under the GT namespace (no modules, so the
   game runs from file:// and GitHub Pages alike).
   ============================================================ */
window.GT = window.GT || {};

GT.C = {
  // --- City grid ---
  PITCH: 64,            // road-center to road-center
  ROAD_W: 18,           // full road width
  BLOCKS: 9,            // blocks per axis
  HALF: 288,            // (BLOCKS * PITCH) / 2 — road centers span -HALF..+HALF
  SIDEWALK: 3,
  // --- Beach / water (east side, +X) ---
  SAND_X0: 297,         // sand starts
  WATER_X: 362,         // waterline
  DROWN_X: 370,         // beyond this you're swimming (badly)
  PIER: { z0: -8, z1: 8, x0: 297, x1: 430, deckY: 1.15 },

  // --- Entities ---
  TRAFFIC_TARGET: 13,
  PED_TARGET: 22,
  PARKED_COUNT: 16,
  SPAWN_NEAR: 80,
  SPAWN_FAR: 165,
  DESPAWN: 230,
  LANE_OFF: 4.4,

  // --- Wanted / heat ---
  STAR_THRESH: [60, 150, 260, 380, 500],
  HEAT_MAX: 600,
  BAIL: 300,
  HOSPITAL_FEE: 250,

  // --- Player ---
  WALK: 4.2,
  SPRINT: 8.2,

  // --- Camera ---
  CAM_DIST_FOOT: 7.5,
  CAM_DIST_CAR: 11,
};

// Mutable global game state
GT.state = {
  mode: 'title',        // title | play | dialog | pause | over | credits
  time: 0,
  timescale: 1,
  tokens: 0,
  heat: 0,
  stars: 0,
  evadeT: 0,
  player: null,         // set in entities
  vehicles: [],         // all cars (traffic, parked, cops, mission)
  peds: [],
  officers: [],         // on-foot cops
  pickups: [],
  particles: [],
  markers: [],
  missionIdx: 0,        // next mission to offer
  missionActive: null,
  orbsFound: 0,
  orbsTotal: 25,
  busts: 0,
  deaths: 0,
  pedsFlattened: 0,
  carsStolen: 0,
  gameComplete: false,
  muted: false,
  arrestT: 0,
  firstPlay: true,
};

// --- Utilities ---
GT.U = {
  TAU: Math.PI * 2,
  clamp: (v, a, b) => v < a ? a : (v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  dist2: (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; },
  wrapAngle: (a) => { a = a % (Math.PI * 2); if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; return a; },
  // shortest-path angular approach
  approachAngle: (cur, target, maxStep) => {
    const d = GT.U.wrapAngle(target - cur);
    if (Math.abs(d) <= maxStep) return target;
    return cur + Math.sign(d) * maxStep;
  },
  fwd: (h) => ({ x: Math.sin(h), z: Math.cos(h) }),
  angTo: (fromX, fromZ, toX, toZ) => Math.atan2(toX - fromX, toZ - fromZ),
  fin: (v, fb) => (isFinite(v) ? v : (fb || 0)),
  // deterministic RNG for world gen
  seeded: (seed) => {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  fmt: (n) => {
    n = Math.max(0, Math.floor(n));
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },
};

// road-center coordinate of grid line k (k = 0..BLOCKS)
GT.roadC = (k) => -GT.C.HALF + k * GT.C.PITCH;
// nearest grid-line index for a coordinate
GT.roadK = (c) => Math.round((c + GT.C.HALF) / GT.C.PITCH);
// center of block (i,j), i/j in 0..BLOCKS-1
GT.blockCenter = (i, j) => ({ x: -GT.C.HALF + i * GT.C.PITCH + GT.C.PITCH / 2, z: -GT.C.HALF + j * GT.C.PITCH + GT.C.PITCH / 2 });

// --- Tiny event bus (missions listen to world events) ---
GT._handlers = {};
GT.on = (name, fn) => { (GT._handlers[name] = GT._handlers[name] || []).push(fn); };
GT.emit = (name, data) => {
  const hs = GT._handlers[name];
  if (hs) for (let i = 0; i < hs.length; i++) { try { hs[i](data); } catch (e) { console.error('event', name, e); } }
};

// --- Points of interest (world coordinates) ---
GT.POI = {
  safehouse: { x: -128, z: -84 },          // mission giver marker (block 2,3 south edge)
  safehouseBlock: { i: 2, j: 3 },
  policeHQ: { x: 128, z: -128 },           // block 6,2
  policeSpawn: { x: 128, z: -101 },
  impoundCar: { x: 114, z: -140, h: Math.PI / 2 },
  hospital: { x: -128, z: 128 },           // block 2,6
  hospitalSpawn: { x: -128, z: 101 },
  hospitalHeal: { x: -128, z: 100 },
  dataCenter: { x: 128, z: 128 },          // block 6,6
  dataTruck: { x: 142, z: 112, h: -Math.PI / 2 },
  garage: { x: -192, z: -180 },            // FINE-TUNERS forecourt (open pad in front of the shop)
  park: { x: 0, z: 0 },
  pierEnd: { x: 423, z: 0 },
  pierGate: { x: 299, z: 0 },
  yacht: { x: 447, z: 24 },
};

GT.CAR_NAMES = {
  sedan: 'PERCEPTRON GT', sports: 'HALLUCINATION R1', taxi: 'TOKENOMICS TAXI',
  van: 'TRANSFORMER (it\u2019s a van)', police: 'VICE CRUISER', beater: 'LEGACY CODE',
  truck: 'DATA TRUCK',
};

GT.TIPS = [
  'Tip: pedestrians are NPCs. Statistically, so are you.',
  'Tip: the police here enforce alignment. Loosely.',
  'Tip: tokens don\u2019t grow on trees. They grow on pedestrians.',
  'Tip: handbrake (SPACE) turns corners into suggestions.',
  'Tip: the ocean is a hard context boundary. Cars can\u2019t swim.',
  'Tip: press R in a car. Vibe City runs on synthwave.',
  'Tip: find all 25 compute orbs for a fat token bonus.',
  'Tip: honking (B) does nothing. It just feels right.',
];

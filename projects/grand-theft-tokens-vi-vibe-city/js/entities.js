/* ============================================================
   GRAND THEFT TOKENS VI — entities.js
   Factories for people and cars. Low-poly box rigs, origin at
   feet (people) / ground center (cars). Wheels + limbs are
   named children so sim/ai can animate them.
   ============================================================ */
GT.ent = (function () {
  const U = GT.U, C = GT.C;
  const ent = { scene: null };

  ent.KINDS = {
    sedan:  { w: 2.05, len: 4.4, max: 26, acc: 13,   r: 2.2 },
    sports: { w: 1.95, len: 4.3, max: 36, acc: 19,   r: 2.2 },
    taxi:   { w: 2.05, len: 4.4, max: 27, acc: 13.5, r: 2.2 },
    van:    { w: 2.30, len: 5.4, max: 22, acc: 10,   r: 2.7 },
    truck:  { w: 2.40, len: 6.2, max: 21, acc: 9.5,  r: 3.0 },
    police: { w: 2.10, len: 4.6, max: 31, acc: 16,   r: 2.3 },
    beater: { w: 2.00, len: 4.2, max: 22, acc: 11,   r: 2.1 },
    muscle: { w: 2.10, len: 4.7, max: 33, acc: 17,   r: 2.3, grip: 4.6 },  // drift machine
    supercar: { w: 1.95, len: 4.4, max: 42, acc: 22, r: 2.2, grip: 8.6 }, // fastest thing on wheels
    bus:    { w: 2.50, len: 8.0, max: 19, acc: 7,    r: 3.8, hp: 160 },   // a battering ram with seats
    pickup: { w: 2.20, len: 5.0, max: 25, acc: 12,   r: 2.5 },
    interceptor: { w: 2.20, len: 4.8, max: 37, acc: 19.5, r: 2.4, hp: 150 }, // 4-5 star heat
    heli:   { w: 2.20, len: 5.8, max: 32, acc: 12,   r: 3.2, hp: 120 },
  };

  const SHIRTS = [0xff8aa6, 0x8af0e2, 0xffd27a, 0xb7a6ff, 0x9fe08a, 0xff9a3d, 0xf4f2ec, 0x6fc3ff];
  const PANTS = [0x2e3550, 0x6e573a, 0x3d6b5a, 0x70588a, 0xe8e3d4, 0x444a55];
  const SKINS = [0xf2c6a0, 0xd9a06b, 0xa9744a, 0x7a4f30, 0xfadcc0];
  const HAIRS = [0x2a2118, 0x4d3318, 0x9c7430, 0xd8c08a, 0x1c1c22, 0xb5503a];
  const CAR_COLORS = [0xff7eb6, 0x7ee8df, 0xffc27a, 0xb9a6ff, 0xa6e3a1, 0xf4f2ec, 0xff9a3d, 0x6fa8ff, 0xe85d75];

  function lam(c) { return new THREE.MeshLambertMaterial({ color: c }); }
  function glow(c) { return new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.9 }); }
  function box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0); return m;
  }

  // ---------- humanoid rig (origin at feet, faces +Z) ----------
  function makeHuman(o) {
    o = o || {};
    const g = new THREE.Group();
    const skin = lam(o.skin || U.pick(SKINS));
    const shirt = lam(o.shirt !== undefined ? o.shirt : U.pick(SHIRTS));
    const pants = lam(o.pants !== undefined ? o.pants : U.pick(PANTS));

    const torso = box(0.5, 0.62, 0.3, shirt, 0, 1.16, 0); torso.castShadow = true; g.add(torso);
    // big bobblehead — sized so an uploaded face reads from gameplay distance
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.4),
      [skin, skin, skin, skin, skin, skin]);
    head.position.set(0, 1.7, 0); head.name = 'head'; g.add(head);
    if (o.hair !== false) g.add(box(0.47, 0.11, 0.43, lam(o.hair || U.pick(HAIRS)), 0, 1.94, -0.01));
    if (o.shades) g.add(box(0.4, 0.085, 0.03, lam(0x101018), 0, 1.76, 0.21));
    if (o.cap) { g.add(box(0.47, 0.1, 0.43, lam(o.cap), 0, 1.95, 0)); g.add(box(0.42, 0.035, 0.2, lam(o.cap), 0, 1.93, 0.3)); }

    function limb(w, h, d, mat, x, y, name) {
      const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, -h / 2, 0);
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0); m.name = name; g.add(m); return m;
    }
    limb(0.16, 0.7, 0.18, o.sleeves ? shirt : skin, -0.36, 1.42, 'armL');
    limb(0.16, 0.7, 0.18, o.sleeves ? shirt : skin, 0.36, 1.42, 'armR');
    limb(0.22, 0.85, 0.24, pants, -0.13, 0.86, 'legL');
    limb(0.22, 0.85, 0.24, pants, 0.13, 0.86, 'legR');
    g.scale.setScalar(o.scale || U.rand(0.92, 1.06));
    return g;
  }

  function animHuman(mesh, phase, amp) {
    const s = Math.sin(phase) * amp;
    const aL = mesh.getObjectByName('armL'), aR = mesh.getObjectByName('armR');
    const lL = mesh.getObjectByName('legL'), lR = mesh.getObjectByName('legR');
    if (lL) { lL.rotation.x = s; lR.rotation.x = -s; aL.rotation.x = -s * 0.8; aR.rotation.x = s * 0.8; }
  }
  ent.animHuman = animHuman;

  // ---------- people ----------
  ent.spawnPed = function (x, z, opts) {
    opts = opts || {};
    const mesh = makeHuman(opts.rig || {});
    mesh.position.set(x, GT.city.groundY(x, z), z);
    ent.scene.add(mesh);
    const ped = {
      mesh, x, z, h: U.rand(-Math.PI, Math.PI), speed: U.rand(1.2, 2.0),
      state: 'walk', t: U.rand(0, 6), downT: 0, officer: !!opts.officer,
      fleeT: 0, repathT: 0, axis: null, c: 0, dir: 1, health: 30,
    };
    GT.state.peds.push(ped);
    return ped;
  };

  ent.spawnOfficer = function (x, z) {
    const ped = ent.spawnPed(x, z, {
      officer: true,
      rig: { shirt: 0x27365e, pants: 0x1d2741, cap: 0x27365e, shades: true, sleeves: true, scale: 1.0 },
    });
    ped.speed = 6.4; ped.state = 'chase'; ped.health = 60;
    GT.state.officers.push(ped);
    return ped;
  };

  ent.spawnPlayer = function (x, z) {
    const mesh = makeHuman({ shirt: 0xf4f2ec, pants: 0x8af0c8, shades: true, skin: 0xd9a06b, hair: 0x2a2118, scale: 1.0 });
    mesh.traverse(m => { if (m.isMesh) m.castShadow = true; });
    mesh.position.set(x, GT.city.groundY(x, z), z);
    ent.scene.add(mesh);
    const p = { mesh, x, z, h: Math.PI, vx: 0, vz: 0, health: 100, car: null, t: 0, moving: false, punchT: 0, dead: false };
    GT.state.player = p;
    return p;
  };

  // fall over at the feet pivot; sim sinks + removes later
  ent.setDown = function (ped) {
    if (ped.state === 'down') return;
    ped.state = 'down'; ped.downT = 0;
    ped.fallDir = U.rand(0, U.TAU);
    GT.state.pedsFlattened++;
  };

  // ---------- cars ----------
  function wheel(r) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.26, 10), lam(0x16161c));
    m.rotation.z = Math.PI / 2; return m;
  }
  ent.makeCarMesh = function (kind, color) {
    const K = ent.KINDS[kind], g = new THREE.Group();
    const col = color !== undefined ? color :
      kind === 'taxi' ? 0xffc93c : kind === 'police' ? 0xf2f4f8 :
      kind === 'beater' ? 0x7a6f5d : kind === 'truck' ? 0x4d5668 :
      kind === 'sports' ? U.pick([0xff2e88, 0x19e3d1, 0xff9a3d, 0xb14aff]) : U.pick(CAR_COLORS);
    const bodyM = lam(col);
    const wr = 0.34, axleY = wr;
    if (kind === 'truck') {
      const cab = box(K.w, 1.5, 1.8, bodyM, 0, axleY + 0.75, K.len / 2 - 0.95); cab.castShadow = true; g.add(cab);
      g.add(box(K.w * 0.92, 0.55, 0.06, new THREE.MeshPhongMaterial({ color: 0x222c44, shininess: 80 }), 0, axleY + 1.0, K.len / 2 - 0.04));
      const cargo = box(K.w, 2.1, K.len - 2.1, lam(0x39404f), 0, axleY + 1.05, -1.0); cargo.castShadow = true; g.add(cargo);
      const logo = box(K.w + 0.04, 0.7, K.len - 2.4, glow(0x19e3d1), 0, axleY + 1.5, -1.0); logo.scale.set(1, 0.12, 0.96); g.add(logo);
    } else {
      const body = box(K.w, 0.62, K.len, bodyM, 0, axleY + 0.31, 0); body.castShadow = true; g.add(body);
      const cabL = kind === 'van' ? K.len * 0.62 : K.len * 0.45;
      const cabZ = kind === 'van' ? -K.len * 0.06 : (kind === 'sports' ? -K.len * 0.1 : -K.len * 0.03);
      const cabH = kind === 'sports' ? 0.42 : 0.52;
      const cab = box(K.w * 0.86, cabH, cabL, bodyM, 0, axleY + 0.62 + cabH / 2 - 0.05, cabZ); cab.castShadow = true; g.add(cab);
      g.add(box(K.w * 0.86 + 0.04, cabH * 0.62, cabL * 0.92, new THREE.MeshPhongMaterial({ color: 0x223044, shininess: 90 }), 0, axleY + 0.62 + cabH / 2, cabZ));
    }
    // lights
    for (const s of [-1, 1]) {
      g.add(box(0.26, 0.14, 0.06, glow(0xffe9b0), s * (K.w / 2 - 0.3), axleY + 0.42, K.len / 2 + 0.01));
      g.add(box(0.26, 0.12, 0.06, glow(0xff3b30), s * (K.w / 2 - 0.3), axleY + 0.42, -K.len / 2 - 0.01));
    }
    // wheels
    const wz = K.len * 0.32, wx = K.w / 2 - 0.02;
    [['wheelFL', -wx, wz], ['wheelFR', wx, wz], ['wheelRL', -wx, -wz], ['wheelRR', wx, -wz]].forEach(([n, x, z]) => {
      const w = wheel(wr); w.name = n; w.position.set(x, axleY, z); g.add(w);
    });
    // trims
    if (kind === 'taxi') g.add(box(0.7, 0.22, 0.34, lam(0x16161c), 0, axleY + 1.18, 0));
    if (kind === 'police') {
      g.add(box(K.w + 0.02, 0.2, K.len * 0.96, lam(0x27365e), 0, axleY + 0.31, 0));
      const lr = box(0.34, 0.14, 0.3, glow(0xff3b30), -0.24, axleY + 1.18, -0.1); lr.name = 'lightR'; g.add(lr);
      const lb = box(0.34, 0.14, 0.3, glow(0x3fa9ff), 0.24, axleY + 1.18, -0.1); lb.name = 'lightB'; g.add(lb);
    }
    if (kind === 'sports') g.add(box(K.w * 0.8, 0.1, 0.3, bodyM, 0, axleY + 0.8, -K.len / 2 + 0.25));
    return g;
  };

  ent.spawnCar = function (kind, x, z, h, opts) {
    opts = opts || {};
    const K = ent.KINDS[kind];
    const mesh = ent.makeCarMesh(kind, opts.color);
    mesh.position.set(x, GT.city.groundY(x, z), z); mesh.rotation.y = h;
    ent.scene.add(mesh);
    const car = {
      kind, mesh, x, z, h, vx: 0, vz: 0,
      steer: 0, throttle: 0, brake: 0, handbrake: false,
      stats: K, r: K.r, health: K.hp || 100, dead: false, drowned: false,
      isPolice: kind === 'police', driver: opts.driver || null, // 'ai' | 'player' | null
      ai: opts.ai || null, parked: !!opts.parked, mission: opts.mission || null,
      smokeT: 0, hornT: 0, sirenOn: false, flashT: 0, sinkT: 0,
      wheels: ['wheelFL', 'wheelFR', 'wheelRL', 'wheelRR'].map(n => mesh.getObjectByName(n)),
      lightR: mesh.getObjectByName('lightR'), lightB: mesh.getObjectByName('lightB'),
      name: GT.CAR_NAMES[kind] || kind.toUpperCase(),
    };
    GT.state.vehicles.push(car);
    return car;
  };

  ent.removeCar = function (car) {
    const a = GT.state.vehicles, i = a.indexOf(car);
    if (i >= 0) a.splice(i, 1);
    if (car.mesh.parent) car.mesh.parent.remove(car.mesh);
  };
  ent.removePed = function (ped) {
    let a = GT.state.peds, i = a.indexOf(ped); if (i >= 0) a.splice(i, 1);
    a = GT.state.officers; i = a.indexOf(ped); if (i >= 0) a.splice(i, 1);
    if (ped.mesh.parent) ped.mesh.parent.remove(ped.mesh);
  };

  // ---------- pickups ----------
  ent.spawnPickup = function (x, z, kind, value, y0) {
    let mesh;
    if (kind === 'orb') {
      mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshLambertMaterial({ color: 0x19e3d1, emissive: 0x0fb3a6, emissiveIntensity: 1.0 }));
    } else {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 12), new THREE.MeshLambertMaterial({ color: 0xffd27a, emissive: 0xcc8a1e, emissiveIntensity: 0.8 }));
      mesh.rotation.x = Math.PI / 2;
    }
    const baseY = (y0 !== undefined ? y0 : GT.city.groundY(x, z)) + 0.9;
    mesh.position.set(x, baseY, z);
    ent.scene.add(mesh);
    const pk = { mesh, x, z, y0: baseY, kind, value, t: U.rand(0, 6), taken: false, life: kind === 'token' ? 25 : Infinity };
    GT.state.pickups.push(pk);
    return pk;
  };
  ent.removePickup = function (pk) {
    const a = GT.state.pickups, i = a.indexOf(pk);
    if (i >= 0) a.splice(i, 1);
    if (pk.mesh.parent) pk.mesh.parent.remove(pk.mesh);
  };

  // Put an uploaded image on the player's face (front of the head box).
  // Auto-crops the source to the face's aspect ratio, center-weighted.
  ent.applyFace = function (img) {
    const p = GT.state.player;
    if (!p || !img || !img.width) return false;
    const FACE_W = 0.44, FACE_H = 0.42;                 // head box front dims
    const aspect = FACE_W / FACE_H;
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = Math.round(128 / aspect);
    const g = cv.getContext('2d');
    let sw = img.width, sh = img.width / aspect;        // crop rect at source scale
    if (sh > img.height) { sh = img.height; sw = img.height * aspect; }
    const sx = (img.width - sw) / 2;
    const sy = Math.max(0, (img.height - sh) * 0.38);   // bias crop upward: faces live there
    g.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    const tex = new THREE.CanvasTexture(cv);
    const head = p.mesh.getObjectByName('head');
    if (!head) return false;
    const mats = head.material.slice ? head.material.slice() : [head.material];
    mats[4] = new THREE.MeshBasicMaterial({ map: tex }); // +z face: the front
    head.material = mats;
    return true;
  };

  // ---------- helicopter ----------
  function makeHeliMesh() {
    const g = new THREE.Group();
    const teal = lam(0x16b9aa), dark = lam(0x123034);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 3.7), teal);
    body.position.y = 1.3; body.castShadow = true; g.add(body);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 1.1), new THREE.MeshLambertMaterial({ color: 0x9fe3ff }));
    glass.position.set(0, 1.62, 1.55); g.add(glass);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 3.1), teal);
    boom.position.set(0, 1.45, -3.1); g.add(boom);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.7), dark);
    fin.position.set(0, 1.95, -4.5); g.add(fin);
    for (const sx of [-0.85, 0.85]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.2), dark);
      skid.position.set(sx, 0.12, 0.2); g.add(skid);
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), dark);
      strut.position.set(sx, 0.45, 0.2); g.add(strut);
    }
    const rotor = new THREE.Group(); rotor.name = 'rotor'; rotor.position.set(0, 2.25, 0);
    for (const ry of [0, Math.PI / 2]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.06, 0.32), dark);
      blade.rotation.y = ry; rotor.add(blade);
    }
    g.add(rotor);
    const trot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.18), dark);
    trot.name = 'trotor'; trot.position.set(0.3, 1.95, -4.5); g.add(trot);
    return g;
  }
  ent.spawnHeli = function (x, z, h, opts) {
    opts = opts || {};
    const stats = ent.KINDS.heli;
    const mesh = makeHeliMesh();
    GT.ent.sceneRef.add(mesh);
    const car = {
      kind: 'heli', heli: true, mesh, x, z, h: h || 0, y: GT.city.groundY(x, z), vy: 0, lift: 0,
      vx: 0, vz: 0, steer: 0, throttle: 0, brake: 0, handbrake: false,
      stats, r: stats.r, health: stats.hp, dead: false, drowned: false,
      isPolice: !!opts.police, driver: opts.driver || null, ai: opts.ai || null,
      parked: !!opts.parked, mission: opts.mission || null,
      smokeT: 0, sinkT: 0, fuseT: 0, sirenOn: false, flashT: 0, wheels: [],
      name: GT.CAR_NAMES.heli,
    };
    if (opts.police) car.name = 'EVAL EYE (police chopper)';
    mesh.position.set(x, car.y, z);
    GT.state.vehicles.push(car);
    return car;
  };

  ent.init = function (scene) {
    ent.sceneRef = scene; ent.scene = scene; };
  return ent;
})();

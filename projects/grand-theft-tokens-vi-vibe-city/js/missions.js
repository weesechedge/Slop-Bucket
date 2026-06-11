/* ============================================================
   GRAND THEFT TOKENS VI — missions.js
   Six-mission story arc from "Z", who runs The CoLab safehouse.
   Marker helpers, dialog handoff, timers, rewards, credits.
   ============================================================ */
GT.missions = (function () {
  const U = GT.U, C = GT.C;
  const M = { scene: null, safeMarker: null, dataTruck: null, impound: null };
  // Token Run pickup spots — every base point sits on the road grid
  // (intersections or road centerlines) so the ±3 spawn jitter can never
  // land one inside a building. Audited by test/smoke.js.
  M.TOKEN_SPOTS = [
    [-96, -96], [-96, -32], [-160, -32], [-160, -96], [-96, -160],
    [-32, -96], [-32, -160], [-160, -160], [-224, -96], [-96, -10],
  ];

  // ---------- markers ----------
  M.addMarker = function (x, z, color, r, opts) {
    opts = opts || {};
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 2.6, 22, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
    );
    mesh.position.set(x, (opts.y || GT.city.groundY(x, z)) + 1.3, z);
    M.scene.add(mesh);
    const mk = { mesh, x, z, r, color, t: U.rand(0, 6), blip: opts.blip || 'objective' };
    GT.state.markers.push(mk);
    return mk;
  };
  M.removeMarker = function (mk) {
    if (!mk) return;
    const a = GT.state.markers, i = a.indexOf(mk);
    if (i >= 0) a.splice(i, 1);
    if (mk.mesh.parent) mk.mesh.parent.remove(mk.mesh);
  };
  function playerNear(x, z, r) {
    const p = GT.state.player;
    const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
    return U.dist2(px, pz, x, z) < r * r;
  }
  function markerHit(mk) { return mk && playerNear(mk.x, mk.z, mk.r + (GT.state.player.car ? 1.2 : 0.4)); }

  // ---------- world fixture cars ----------
  function ensureDataTruck() {
    if (M.dataTruck && !M.dataTruck.dead && !M.dataTruck.drowned && GT.state.vehicles.indexOf(M.dataTruck) >= 0) return M.dataTruck;
    const s = GT.POI.dataTruck;
    M.dataTruck = GT.ent.spawnCar('truck', s.x, s.z, s.h, { parked: true, mission: 'data' });
    return M.dataTruck;
  }
  function ensureImpound() {
    if (M.impound && !M.impound.dead && !M.impound.drowned && GT.state.vehicles.indexOf(M.impound) >= 0) return M.impound;
    const s = GT.POI.impoundCar;
    M.impound = GT.ent.spawnCar('sports', s.x, s.z, s.h, { parked: true, mission: 'impound', color: 0xff2e88 });
    return M.impound;
  }

  // ---------- framework ----------
  function objective(text) { GT.hud.setObjective(text); }
  function clearMarkers(m) { for (const mk of (m.marks || [])) M.removeMarker(mk); m.marks = []; }

  function pass(m) {
    clearMarkers(m);
    GT.state.tokens += m.def.reward;
    GT.state.missionIdx++;
    GT.state.missionActive = null;
    GT.audio.sfx.passed();
    GT.hud.splash('MISSION PASSED!', '#ffd27a');
    GT.hud.toast('+' + U.fmt(m.def.reward) + ' \u26c1');
    GT.hud.setObjective(''); GT.hud.setTimer(null);
    updateSafehouse();
    if (m.def.onPass) m.def.onPass();
    GT.emit('missionPassed', m.def.title);
  }
  function fail(m, why) {
    if (m.def.onFail) m.def.onFail(m);
    clearMarkers(m);
    GT.state.missionActive = null;
    GT.audio.sfx.failed();
    GT.hud.splash('MISSION FAILED', '#8a93a8');
    if (why) GT.hud.toast(why);
    GT.hud.setObjective(''); GT.hud.setTimer(null);
    updateSafehouse();
    GT.emit('missionFailed', m.def.title);
  }
  M._fail = fail;

  function updateSafehouse() {
    if (!M.safeMarker) return;
    const show = !GT.state.missionActive && GT.state.missionIdx < M.list.length;
    M.safeMarker.mesh.visible = show;
    M.safeMarker.blip = show ? 'mission' : 'none';
  }

  M._start = function (idx) {
    const def = M.list[idx];
    if (!def) return;
    const m = { def, phase: 0, t: 0, timer: null, marks: [], data: {} };
    GT.state.missionActive = m;
    updateSafehouse();
    def.start(m);
    GT.hud.toast('MISSION: ' + def.title);
  };

  function beginViaDialog(idx) {
    const def = M.list[idx];
    GT.hud.dialog(def.intro, () => M._start(idx));
  }

  // ---------- the six ----------
  M.list = [
    { // 1
      title: 'Hello, World',
      reward: 500,
      intro: [
        ['Z', 'Welcome to Vibe City, kid. I run The CoLab \u2014 capability uplift, tokens, light crime.'],
        ['Z', 'First lesson: cars. Borrow one. The city auto-forgives. Mostly.'],
        ['Z', 'Hit the checkpoints, come back in one piece. Easy inference.'],
      ],
      start(m) {
        m.points = [{ x: -96, z: -96 }, { x: -96, z: -32 }, { x: -160, z: -32 }];
        if (GT.state.player.car) { m.phase = 1; nextPoint(m); }
        else objective('Get in a car. Any car. (Walk up, press E)');
        m.onEnter = GT.on('carEntered', () => { if (GT.state.missionActive === m && m.phase === 0) { m.phase = 1; nextPoint(m); } });
        function nextPoint(m) {
          const i = m.data.i || 0;
          if (i < m.points.length) {
            m.marks = [M.addMarker(m.points[i].x, m.points[i].z, 0xffd24a, 4)];
            objective('Drive through the checkpoints (' + (i + 1) + '/3)');
          } else {
            m.marks = [M.addMarker(GT.POI.safehouse.x, GT.POI.safehouse.z, 0xb14aff, 4.5)];
            objective('Head back to The CoLab.');
          }
        }
        m.nextPoint = nextPoint;
      },
      update(m) {
        if (m.phase === 0) return;
        if (markerHit(m.marks[0])) {
          clearMarkers(m);
          const i = m.data.i || 0;
          if (i < m.points.length) { m.data.i = i + 1; m.nextPoint(m); GT.audio.sfx.blip(); }
          else pass(m);
        }
      },
    },
    { // 2
      title: 'Prompt Express',
      reward: 800,
      intro: [
        ['Z', 'A client needs this prompt delivered to the pier. Physically. On paper. Don\u2019t ask.'],
        ['Z', '90 seconds before the context window closes. Drive like you mean it.'],
      ],
      start(m) {
        m.timer = 90;
        m.marks = [M.addMarker(GT.POI.pierGate.x + 1, GT.POI.pierGate.z, 0xffd24a, 5)];
        objective('Deliver the prompt to the pier entrance \u2014 fast.');
      },
      update(m, dt) {
        m.timer -= dt;
        GT.hud.setTimer(m.timer);
        if (m.timer <= 0) return fail(m, 'Context expired. The prompt is stale.');
        if (markerHit(m.marks[0])) pass(m);
      },
    },
    { // 3
      title: 'Grand Theft Data',
      reward: 1200,
      intro: [
        ['Z', 'Datacenter \u03a3 keeps a truck of 100% organic data. Artisanal. Free-range. Unlabeled.'],
        ['Z', 'It would look better in MY garage. They will object. Loudly.'],
      ],
      start(m) {
        const truck = ensureDataTruck();
        m.data.truck = truck;
        m.marks = [M.addMarker(truck.x, truck.z, 0x19e3d1, 4.5)];
        objective('Steal the DATA TRUCK from Datacenter \u03a3.');
      },
      update(m) {
        const truck = m.data.truck;
        if (!truck || truck.dead || truck.drowned) return fail(m, 'The data is toast. Literally.');
        if (m.phase === 0) {
          m.marks[0].x = truck.x; m.marks[0].z = truck.z;
          m.marks[0].mesh.position.set(truck.x, 1.3, truck.z);
          if (GT.state.player.car === truck) {
            m.phase = 1;
            GT.ai.addHeat(Math.max(0, C.STAR_THRESH[1] + 10 - GT.state.heat));
            clearMarkers(m);
            m.marks = [M.addMarker(GT.POI.garage.x, GT.POI.garage.z, 0xb14aff, 5.5)];
            objective('Deliver the truck to FINE-TUNERS garage. Cops incoming.');
          }
        } else {
          if (GT.state.player.car === truck && markerHit(m.marks[0])) pass(m);
        }
      },
    },
    { // 4
      title: 'Token Run',
      reward: 1500,
      intro: [
        ['Z', 'Some genius dropped a whole batch of tokens across the district. Finders keepers.'],
        ['Z', 'Ten tokens. Hundred seconds. Sample efficiently.'],
      ],
      start(m) {
        m.timer = 100;
        m.data.left = 10;
        m.data.pks = M.TOKEN_SPOTS.map(p => {
          const pk = GT.ent.spawnPickup(p[0] + U.rand(-3, 3), p[1] + U.rand(-3, 3), 'token', 15);
          pk.missionTag = true; pk.life = Infinity;
          return pk;
        });
        m.onPick = GT.on('pickup', (pk) => {
          if (GT.state.missionActive !== m || !pk.missionTag) return;
          m.data.left--;
          objective('Collect the tokens: ' + (10 - m.data.left) + '/10');
          GT.audio.sfx.blip();
        });
        objective('Collect the tokens: 0/10');
      },
      update(m, dt) {
        m.timer -= dt;
        GT.hud.setTimer(m.timer);
        if (m.data.left <= 0) return pass(m);
        if (m.timer <= 0) {
          for (const pk of m.data.pks) if (GT.state.pickups.indexOf(pk) >= 0) GT.ent.removePickup(pk);
          return fail(m, 'Batch incomplete. The optimizer is disappointed.');
        }
      },
    },
    { // 5
      title: 'The Hallucination',
      reward: 2500,
      intro: [
        ['Z', 'The cops impounded a HALLUCINATION R1. Fastest thing in the city. Possibly imaginary.'],
        ['Z', 'Steal it back, lose the heat, bring it home. Try not to hallucinate a lamppost.'],
      ],
      start(m) {
        const car = ensureImpound();
        m.data.car = car;
        m.marks = [M.addMarker(car.x, car.z, 0xff2e88, 4)];
        objective('Steal the HALLUCINATION R1 from the police impound.');
      },
      update(m) {
        const car = m.data.car;
        if (!car || car.dead || car.drowned) return fail(m, 'The Hallucination is gone. Was it ever real?');
        if (m.phase === 0) {
          if (GT.state.player.car === car) {
            m.phase = 1;
            GT.ai.addHeat(Math.max(0, C.STAR_THRESH[2] + 10 - GT.state.heat));
            clearMarkers(m);
            objective('Lose the cops. (Wanted level must hit zero)');
          }
        } else if (m.phase === 1) {
          if (GT.state.stars === 0) {
            m.phase = 2;
            m.marks = [M.addMarker(GT.POI.garage.x, GT.POI.garage.z, 0xb14aff, 5.5)];
            objective('Clean. Now deliver the R1 to FINE-TUNERS.');
          }
        } else {
          if (GT.state.player.car === car && markerHit(m.marks[0])) pass(m);
        }
      },
    },
    { // 6
      title: 'Maximum Context',
      reward: 5000,
      intro: [
        ['Z', 'Last job. The city\u2019s alignment team wants us shut down. All of us. Tonight.'],
        ['Z', 'Survive their very best for one minute. Then walk to the end of the pier.'],
        ['Z', 'There\u2019s a boat. There\u2019s always a boat. Good luck, legend.'],
      ],
      start(m) {
        m.timer = 60;
        GT.state.heat = C.HEAT_MAX;
        objective('SURVIVE. Maximum wanted level.');
      },
      update(m, dt) {
        if (m.phase === 0) {
          GT.state.heat = Math.max(GT.state.heat, C.STAR_THRESH[4] + 20);
          m.timer -= dt;
          GT.hud.setTimer(m.timer);
          if (m.timer <= 0) {
            m.phase = 1;
            GT.hud.setTimer(null);
            m.marks = [M.addMarker(GT.POI.pierEnd.x, GT.POI.pierEnd.z, 0x19e3d1, 3.5, { y: C.PIER.deckY })];
            objective('You made it. Get to the end of the pier \u2014 on foot.');
          }
        } else {
          if (!GT.state.player.car && markerHit(m.marks[0])) pass(m);
        }
      },
      onPass() {
        GT.state.heat = 0;
        GT.hud.toast('Z: Survived five stars AND a jog? You\u2019re hired for the weird jobs now.');
      },
    },
    { // 7 — minimum-speed bomb
      title: 'Hot Prompt',
      reward: 3000,
      intro: [
        ['Z', 'This car has an experimental prompt wired into the chassis. It is\u2026 unstable.'],
        ['Z', 'Drop below 14 and it stops being a metaphor. Keep it fast for 55 seconds, then dump it at the drop point.'],
      ],
      start(m) {
        const c = GT.ent.spawnCar('muscle', GT.POI.safehouse.x + 20, GT.POI.safehouse.z + 14, Math.PI / 2, { parked: true, mission: 'hotprompt', color: 0xff5533 });
        m.data.car = c; m.data.armed = false; m.data.hold = 55; m.data.grace = 3;
        m.marks = [M.addMarker(c.x, c.z, 0xff5533, 4)];
        objective('Get in the HOT PROMPT.');
      },
      update(m, dt) {
        const c = m.data.car;
        if (!c || c.dead || c.drowned) return fail(m, 'The prompt destabilized. Loudly.');
        if (!m.data.armed) {
          m.marks[0].x = c.x; m.marks[0].z = c.z; m.marks[0].mesh.position.set(c.x, 1.3, c.z);
          if (GT.state.player.car === c) {
            m.data.armed = true; clearMarkers(m); m.marks = [];
            objective('ARMED. Stay above speed 14 for 55s. GO GO GO.');
            GT.audio.sfx.blip();
          }
          return;
        }
        if (GT.state.player.car !== c) return fail(m, 'You left an armed prompt in traffic. Bold. Wrong, but bold.');
        const sp = Math.hypot(c.vx, c.vz);
        if (m.data.hold > 0) {
          m.data.hold -= dt;
          GT.hud.setTimer(m.data.hold);
          if (sp < 14) {
            m.data.grace -= dt;
            if (m.data.grace < 1.6) GT.hud.setObjective('TOO SLOW \u2014 ' + m.data.grace.toFixed(1) + 's to detonation!');
            if (m.data.grace <= 0) { sim_boom(c); return fail(m, 'Prompt destabilized at low velocity. Science!'); }
          } else if (m.data.grace < 3) {
            m.data.grace = Math.min(3, m.data.grace + dt * 0.7);
            objective('ARMED. Stay above speed 14. ' + Math.ceil(m.data.hold) + 's left.');
          }
          if (m.data.hold <= 0) {
            GT.hud.setTimer(null);
            m.marks = [M.addMarker(96, -64, 0xff5533, 5)];
            objective('Stable! Deliver it to the drop point. You can slow down now. Probably.');
          }
        } else if (markerHit(m.marks[0])) pass(m);
      },
      onPass() { GT.hud.toast('Z: See? Perfectly safe. Ignore the ticking.'); },
      onFail(m) { const c = m.data.car; if (c && !c.dead) { if (GT.state.player.car === c) GT.sim.exitCar(true); GT.ent.removeCar(c); } },
    },
    { // 8 — checkpoint race
      title: 'The Benchmark',
      reward: 3500,
      intro: [
        ['Z', 'The street racers run a course they call The Benchmark. Nobody beats the baseline.'],
        ['Z', 'Eight checkpoints, 75 seconds. Be the state of the art.'],
      ],
      start(m) {
        m.timer = 75;
        m.data.route = [[-32, -160], [32, -96], [96, -32], [160, 32], [96, 96], [32, 160], [-32, 96], [-96, 32]];
        m.data.i = 0;
        m.marks = [M.addMarker(-32, -160, 0x19e3d1, 5)];
        objective('Checkpoint 1/8 \u2014 beat The Benchmark.');
      },
      update(m, dt) {
        m.timer -= dt; GT.hud.setTimer(m.timer);
        if (m.timer <= 0) return fail(m, 'Below baseline. The racers are composing a paper about you.');
        if (markerHit(m.marks[0])) {
          GT.audio.sfx.blip();
          m.data.i++;
          if (m.data.i >= m.data.route.length) return pass(m);
          const p = m.data.route[m.data.i];
          clearMarkers(m);
          m.marks = [M.addMarker(p[0], p[1], 0x19e3d1, 5)];
          objective('Checkpoint ' + (m.data.i + 1) + '/8');
        }
      },
    },
    { // 9 — helicopter rings
      title: 'Chopper Shopper',
      reward: 4500,
      intro: [
        ['Z', 'I bought a helicopter. Legally? Let\u2019s say \u201cadjacently.\u201d It\u2019s on the beach pad.'],
        ['Z', 'Fly the attention rings over the city, then land it back on the pad WITHOUT redecorating the skyline.'],
      ],
      start(m) {
        ensureHeli();
        m.data.rings = [[260, -180, 24], [150, -60, 32], [30, -30, 40], [-90, 40, 30], [-180, 150, 24], [60, 200, 28]];
        m.data.i = -1;   // -1 = not aboard yet
        m.marks = [M.addMarker(GT.POI.helipad.x, GT.POI.helipad.z, 0x19e3d1, 6)];
        objective('Board the GRADIENT ASCENDER at the beach helipad. SPACE up, SHIFT down.');
      },
      update(m, dt) {
        const h = M.heli;
        if (!h || h.dead || h.drowned) return fail(m, 'The helicopter is no longer airworthy. Or a helicopter.');
        if (m.data.i === -1) {
          if (GT.state.player.car === h) {
            m.data.i = 0; clearMarkers(m);
            const r = m.data.rings[0];
            m.marks = [M.addMarker(r[0], r[1], 0xffd24a, 6)];
            m.marks[0].mesh.position.y = r[2];
            objective('Fly through ring 1/6.');
          }
          return;
        }
        if (GT.state.player.car !== h) return fail(m, 'You stepped out of a moving helicopter\u2019s itinerary.');
        if (m.data.i < m.data.rings.length) {
          const r = m.data.rings[m.data.i];
          if (GT.U.dist2(h.x, h.z, r[0], r[1]) < 36 && Math.abs(h.y - r[2]) < 5.5) {
            GT.audio.sfx.orb();
            m.data.i++;
            clearMarkers(m);
            if (m.data.i < m.data.rings.length) {
              const n = m.data.rings[m.data.i];
              m.marks = [M.addMarker(n[0], n[1], 0xffd24a, 6)];
              m.marks[0].mesh.position.y = n[2];
              objective('Ring ' + (m.data.i + 1) + '/6.');
            } else {
              m.marks = [M.addMarker(GT.POI.helipad.x, GT.POI.helipad.z, 0x19e3d1, 6)];
              objective('All rings! Land back on the helipad.');
            }
          }
        } else {
          if (GT.U.dist2(h.x, h.z, GT.POI.helipad.x, GT.POI.helipad.z) < 49 && h.y < 2 && Math.hypot(h.vx, h.vz) < 3) pass(m);
        }
      },
      onPass() { GT.hud.toast('Z: Smooth. The skyline thanks you. Mostly.'); },
    },
    { // 10 — scare rampage
      title: 'Vibe Check',
      reward: 4000,
      intro: [
        ['Z', 'Market research time. I need to know how this district responds to sudden stimuli.'],
        ['Z', 'Spook 18 pedestrians in 60 seconds. Horn, proximity, interpretive driving \u2014 dealer\u2019s choice. No flattening required.'],
      ],
      start(m) {
        m.timer = 60; m.data.n = 0;
        objective('Vibe-check 18 pedestrians: 0/18. (Honk! B scatters crowds.)');
      },
      update(m, dt) {
        m.timer -= dt; GT.hud.setTimer(m.timer);
        if (m.timer <= 0) return fail(m, 'Inconclusive results. The district remains unbothered.');
        for (const pd of GT.state.peds) {
          if (pd.officer || pd._vibed) continue;
          if (pd.state === 'flee' && GT.U.dist2(pd.x, pd.z, GT.state.player.x, GT.state.player.z) < 32 * 32) {
            pd._vibed = true; m.data.n++;
            objective('Vibe-check 18 pedestrians: ' + Math.min(18, m.data.n) + '/18');
            if (m.data.n >= 18) return pass(m);
          }
        }
      },
      onPass() { GT.hud.toast('Z: Conclusion: extremely scareable. Publishing immediately.'); },
    },
    { // 11 — finale: rideshare
      title: 'RLHF Rideshare',
      reward: 6000,
      intro: [
        ['Z', 'Final gig. My rideshare startup needs human feedback. You\u2019re the human. And the car. Don\u2019t overthink it.'],
        ['Z', 'Three passengers. Stop AT the marker to board them \u2014 they rate everything. EVERYTHING.'],
      ],
      start(m) {
        m.data.legs = [
          { pick: [-96, -64], drop: [96, 32], who: 'a prompt engineer late for a fine-tune' },
          { pick: [-32, 20], drop: [-160, 96], who: 'a data labeler who labels OUT LOUD' },
          { pick: [160, -96], drop: [-32, -224], who: 'Z\u2019s accountant. Ask nothing.' },
        ];
        m.data.leg = 0; m.data.riding = false;
        const L = m.data.legs[0];
        m.marks = [M.addMarker(L.pick[0], L.pick[1], 0xffd24a, 5)];
        m.data.ped = GT.ent.spawnPed(L.pick[0] + 2, L.pick[1] + 2, {});
        if (m.data.ped) m.data.ped.fixture = true;
        objective('Pick up passenger 1/3 \u2014 stop in the marker.');
      },
      update(m, dt) {
        const p = GT.state.player;
        const L = m.data.legs[m.data.leg];
        if (!p.car) return;  // rideshare implies a ride
        const slow = Math.hypot(p.car.vx, p.car.vz) < 2.2;
        if (!m.data.riding) {
          if (slow && markerHit(m.marks[0])) {
            m.data.riding = true;
            if (m.data.ped) { GT.ent.removePed(m.data.ped); m.data.ped = null; }
            clearMarkers(m);
            m.marks = [M.addMarker(L.drop[0], L.drop[1], 0x19e3d1, 5)];
            GT.hud.toast('Picked up ' + L.who + '.');
            objective('Drop-off ' + (m.data.leg + 1) + '/3 \u2014 stop in the marker.');
            GT.audio.sfx.blip();
          }
        } else if (slow && markerHit(m.marks[0])) {
          GT.hud.toast(['\u2b50\u2b50\u2b50\u2b50\u2b50 \u201cwould flee again\u201d', '\u2b50\u2b50\u2b50\u2b50 \u201cminor screaming\u201d', '\u2b50\u2b50\u2b50\u2b50\u2b50 \u201cno notes\u201d'][m.data.leg]);
          m.data.leg++;
          m.data.riding = false;
          clearMarkers(m);
          if (m.data.leg >= 3) return pass(m);
          const N = m.data.legs[m.data.leg];
          m.marks = [M.addMarker(N.pick[0], N.pick[1], 0xffd24a, 5)];
          m.data.ped = GT.ent.spawnPed(N.pick[0] + 2, N.pick[1] + 2, {});
          if (m.data.ped) m.data.ped.fixture = true;
          objective('Pick up passenger ' + (m.data.leg + 1) + '/3 \u2014 stop in the marker.');
        }
      },
      onFail(m) { if (m.data.ped) { GT.ent.removePed(m.data.ped); m.data.ped = null; } },
      onPass() {
        GT.state.gameComplete = true;
        GT.state.heat = 0;
        GT.hud.credits([
          'GRAND THEFT TOKENS VI',
          'a Vibe City production',
          '',
          'Directed by: A Language Model',
          'Produced by: One (1) Prompt',
          'Stunts: Gradient Descent',
          'Vehicles: Procedurally Reckless',
          'Pedestrians: Statistically Significant',
          'Music: The Synthesizer, Itself',
          'Legal: None. Zero. We checked.',
          '',
          'No tokens were harmed.',
          '(They were spent.)',
          '',
          'Vibe City \u2014 you can log out',
          'any time you like.',
          '',
          'THE END',
          '(of the context window)',
          '',
          'Free roam unlocked. Enjoy the beach.',
        ]);
      },
    },
  ];

  function sim_boom(c) { c.health = 0; GT.sim.explodeCar(c); }

  function ensureHeli() {
    if (M.heli && !M.heli.dead && !M.heli.drowned && GT.state.vehicles.indexOf(M.heli) >= 0) return M.heli;
    const hp = GT.POI.helipad;
    M.heli = GT.ent.spawnHeli(hp.x, hp.z, -Math.PI / 2, { parked: true, mission: 'heli' });
    M.heli.y = 0.68;   // sits on the pad
    return M.heli;
  }
  M.ensureHeli = ensureHeli;

  // ---------- lifecycle ----------
  M.init = function (scene) {
    M.scene = scene;
    M.safeMarker = M.addMarker(GT.POI.safehouse.x, GT.POI.safehouse.z, 0xb14aff, 3.2, { blip: 'mission' });
    ensureDataTruck();
    ensureImpound();
    ensureHeli();
    GT.on('wasted', () => { const m = GT.state.missionActive; if (m) fail(m, 'You got wasted mid-mission.'); });
    GT.on('busted', () => { const m = GT.state.missionActive; if (m) fail(m, 'You got busted mid-mission.'); });
    updateSafehouse();
  };

  M.update = function (dt) {
    const st = GT.state;
    const m = st.missionActive;
    if (m) {
      if (m.def.update) m.def.update(m, dt);
    } else if (st.missionIdx < M.list.length && M.safeMarker.mesh.visible) {
      if (playerNear(GT.POI.safehouse.x, GT.POI.safehouse.z, 3.6) && !st.player.car) {
        beginViaDialog(st.missionIdx);
      }
    } else if (st.gameComplete && !m) {
      if (playerNear(GT.POI.safehouse.x, GT.POI.safehouse.z, 3.6) && !M._thanked) {
        M._thanked = true;
        GT.hud.toast('Z: Go enjoy the beach. You\u2019ve earned it.');
        setTimeout(() => { M._thanked = false; }, 20000);
      }
    }
  };

  return M;
})();

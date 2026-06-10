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

  // ---------- lifecycle ----------
  M.init = function (scene) {
    M.scene = scene;
    M.safeMarker = M.addMarker(GT.POI.safehouse.x, GT.POI.safehouse.z, 0xb14aff, 3.2, { blip: 'mission' });
    ensureDataTruck();
    ensureImpound();
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

/* ============================================================
   GRAND THEFT TOKENS VI — ai.js
   Traffic brains, pedestrian lattice walkers, the wanted/heat
   system, cop cars + on-foot officers, and spawn management.
   AI sets car control inputs (throttle/brake/steer); sim.js
   integrates physics for every car uniformly.
   ============================================================ */
GT.ai = (function () {
  const U = GT.U, C = GT.C;
  const ai = {};
  let spawnCool = 0, pedCool = 0, copCool = 0, heliCool = 0;

  // right-hand traffic lane: cross-coordinate for a road line c
  ai.laneCross = (axis, c, dir) => axis === 'z' ? c + dir * C.LANE_OFF : c - dir * C.LANE_OFF;
  const axisHeading = (axis, dir) => axis === 'z' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);

  // ---------- heat / wanted ----------
  ai.addHeat = function (n) {
    const st = GT.state;
    st.heat = U.clamp(st.heat + n, 0, C.HEAT_MAX);
  };
  ai.witnessNearby = function (x, z, r) {
    r = r || 15; const r2 = r * r, st = GT.state;
    for (const o of st.officers) if (U.dist2(o.x, o.z, x, z) < r2) return true;
    for (const p of st.peds) if (p.state !== 'down' && U.dist2(p.x, p.z, x, z) < r2) return true;
    for (const v of st.vehicles) if (v.isPolice && !v.dead && U.dist2(v.x, v.z, x, z) < (r + 25) * (r + 25)) return true;
    return false;
  };

  function updateHeat(dt) {
    const st = GT.state, p = st.player;
    let copNear = false;
    for (const v of st.vehicles) if (v.isPolice && !v.dead && U.dist2(v.x, v.z, p.x, p.z) < 6400) { copNear = true; break; }
    if (!copNear) for (const o of st.officers) if (U.dist2(o.x, o.z, p.x, p.z) < 6400) { copNear = true; break; }
    st.heat = Math.max(0, st.heat - (copNear ? 0.5 : 3) * dt);
    let s = 0; for (const t of C.STAR_THRESH) if (st.heat >= t) s++;
    if (s !== st.stars) { st.stars = s; GT.emit('stars', s); }
  }

  // ---------- traffic ----------
  function nodeAhead(axis, along, dir) {
    const kf = (along + C.HALF) / C.PITCH;
    return dir > 0 ? Math.ceil(kf - 0.001) : Math.floor(kf + 0.001);
  }

  function trafficControl(car, dt) {
    const a = car.ai;
    const along = a.axis === 'z' ? car.z : car.x;
    const vAlong = car.vx * Math.sin(car.h) + car.vz * Math.cos(car.h);

    // intersection decision
    const k = nodeAhead(a.axis, along, a.dir);
    if (k >= 0 && k <= C.BLOCKS) {
      const nodeC = GT.roadC(k);
      const key = a.axis + k;
      if (a.dir * (along - nodeC) > -3 && a.lastKey !== key) {
        a.lastKey = key;
        const canStraight = a.dir > 0 ? k < C.BLOCKS : k > 0;
        const kc = GT.roadK(a.c);
        const turns = [];
        if (kc < C.BLOCKS) turns.push(1);
        if (kc > 0) turns.push(-1);
        if (canStraight && (Math.random() < 0.6 || !turns.length)) {
          // keep going
        } else if (turns.length) {
          const nd = U.pick(turns);
          const oldC = a.c;
          a.axis = a.axis === 'z' ? 'x' : 'z';
          a.c = nodeC; a.dir = nd;
          a.lastKey = a.axis + GT.roadK(oldC);
        } else {
          a.dir = -a.dir; a.lastKey = null; // dead corner: U-turn
        }
      }
    } else { a.dir = -a.dir; a.lastKey = null; }

    // steer toward a point ahead in our lane
    const lane = ai.laneCross(a.axis, a.c, a.dir);
    let tAlong = (a.axis === 'z' ? car.z : car.x) + a.dir * (6 + Math.abs(vAlong) * 0.6);
    tAlong = U.clamp(tAlong, -C.HALF + 3, C.HALF - 3);
    const tx = a.axis === 'z' ? lane : tAlong;
    const tz = a.axis === 'z' ? tAlong : lane;
    const desired = U.angTo(car.x, car.z, tx, tz);
    const err = U.wrapAngle(desired - car.h);
    car.steer = U.clamp(err * 2.2, -1, 1);

    // ahead probe: brake for cars / peds / player
    const probe = 4 + Math.abs(vAlong) * 0.55;
    const f = U.fwd(car.h);
    const px = car.x + f.x * probe, pz = car.z + f.z * probe;
    let blocked = false;
    const st = GT.state;
    for (const v of st.vehicles) {
      if (v === car || v.dead) continue;
      if (U.dist2(v.x, v.z, px, pz) < 12 || U.dist2(v.x, v.z, car.x + f.x * 3, car.z + f.z * 3) < 9) { blocked = true; break; }
    }
    if (!blocked) for (const p of st.peds) {
      if (p.state === 'down') continue;
      if (U.dist2(p.x, p.z, px, pz) < 7) { blocked = true; break; }
    }
    if (!blocked) {
      const pl = st.player;
      if (!pl.car && U.dist2(pl.x, pl.z, px, pz) < 8) blocked = true;
    }

    const targetSpeed = (car.kind === 'van' || car.kind === 'truck') ? 7.5 : 9;
    if (blocked) {
      car.throttle = 0; car.brake = 1;
      a.blockedT = (a.blockedT || 0) + dt;
      if (a.blockedT > 2) {
        a.blockedT = 0;
        if (U.dist2(car.x, car.z, st.player.x, st.player.z) < 3600) GT.audio.sfx.hornShort();
      }
    } else {
      a.blockedT = 0;
      const slow = Math.abs(err) > 0.6 ? 0.45 : 1;
      car.throttle = vAlong < targetSpeed * slow ? 0.7 : 0;
      car.brake = vAlong > targetSpeed * slow + 3 ? 0.6 : 0;
    }
    car.handbrake = false;
  }

  // ---------- cop cars ----------
  function copControl(car, dt) {
    const st = GT.state, p = st.player, a = car.ai;
    car.sirenOn = st.stars > 0;

    if (a.leaving || st.stars === 0) {
      a.leaving = true;
      car.throttle = 0.5; car.brake = 0; car.steer = 0; car.sirenOn = false;
      a.leaveT = (a.leaveT || 0) + dt;
      if (a.leaveT > 6 || U.dist2(car.x, car.z, p.x, p.z) > C.DESPAWN * C.DESPAWN) GT.ent.removeCar(car);
      return;
    }

    const pvx = p.car ? p.car.vx : p.vx, pvz = p.car ? p.car.vz : p.vz;
    const d2 = U.dist2(car.x, car.z, p.x, p.z);

    // --- trail & ram rhythm: hang back off the rear quarter, then lunge ---
    if (a.side === undefined) a.side = Math.random() < 0.5 ? -1 : 1;
    if (a.ramT === undefined) a.ramT = U.rand(1.5, 4);
    let ramming = false;
    if (p.car) {
      if (a.ramming > 0) {
        a.ramming -= dt;
        ramming = true;
        // contact or whiff ends the lunge; cool down before the next one
        if (d2 < (car.r + p.car.r + 0.5) * (car.r + p.car.r + 0.5) || a.ramming <= 0) {
          a.ramming = 0; a.ramT = U.rand(2.5, 5.5); a.side = -a.side;
        }
      } else {
        a.ramT -= dt;
        if (a.ramT <= 0 && d2 < 45 * 45) a.ramming = U.rand(1.5, 2.4);
      }
    } else { a.ramming = 0; }

    let tx, tz;
    if (ramming) {
      // PIT-style: aim at the rear quarter, slightly leading
      const pf = U.fwd(p.car.h);
      tx = p.car.x + pvx * 0.5 - pf.x * 1.6 + (-pf.z) * a.side * 0.9;
      tz = p.car.z + pvz * 0.5 - pf.z * 1.6 + (pf.x) * a.side * 0.9;
    } else if (p.car) {
      // trail: a point behind and offset to one side of the player's car
      const pf = U.fwd(p.car.h);
      tx = p.car.x + pvx * 0.25 - pf.x * 11 + (-pf.z) * a.side * 4.5;
      tz = p.car.z + pvz * 0.25 - pf.z * 11 + (pf.x) * a.side * 4.5;
    } else {
      tx = p.x + pvx * 0.45;
      tz = p.z + pvz * 0.45;
    }

    // obstacle probe: if a building is dead ahead, aim back at the road grid
    const f = U.fwd(car.h);
    const ox = car.x + f.x * 7, oz = car.z + f.z * 7;
    const cols = GT.city.query(ox, oz, 1);
    let wallAhead = false;
    for (const c of cols) if (ox > c.x0 - 0.6 && ox < c.x1 + 0.6 && oz > c.z0 - 0.6 && oz < c.z1 + 0.6) { wallAhead = true; break; }
    if (wallAhead) {
      const nr = GT.city.nearestRoad(car.x, car.z);
      if (nr.axis === 'z') { tx = nr.c; tz = car.z + Math.sign(tz - car.z || 1) * 14; }
      else { tz = nr.c; tx = car.x + Math.sign(tx - car.x || 1) * 14; }
    }

    const desired = U.angTo(car.x, car.z, tx, tz);
    const err = U.wrapAngle(desired - car.h);
    const vAlong = car.vx * Math.sin(car.h) + car.vz * Math.cos(car.h);

    // stuck → three-point turn
    if (a.revT > 0) {
      a.revT -= dt;
      car.throttle = -0.7; car.brake = 0;
      car.steer = -U.clamp(err * 2.2, -1, 1);
      return;
    }
    if (Math.abs(vAlong) < 1.4 && d2 > 36) {
      a.stuckT = (a.stuckT || 0) + dt;
      if (a.stuckT > 1.1) { a.stuckT = 0; a.revT = 1.1; return; }
    } else a.stuckT = 0;

    car.steer = U.clamp(err * 2.4, -1, 1);
    if (!p.car && d2 < 36) {
      // player on foot and we're close: stop, let an officer out once
      car.throttle = 0; car.brake = 1;
      if (!a.dropped && st.stars >= 1) {
        a.dropped = true;
        const s = U.fwd(car.h + Math.PI / 2);
        GT.ent.spawnOfficer(car.x + s.x * 2.2, car.z + s.z * 2.2);
      }
    } else if (ramming || !p.car) {
      const chase = Math.abs(err) > 1.2 ? 0.4 : 1;
      car.throttle = chase; car.brake = 0;
    } else {
      // trailing: match the player's pace plus a little, don't glue to the bumper
      const pSpeed = Math.hypot(pvx, pvz);
      const cap = pSpeed + 2.5 + (d2 > 30 * 30 ? 6 : 0);   // catch up if far behind
      if (vAlong > cap) { car.throttle = 0; car.brake = 0.35; }
      else { car.throttle = Math.abs(err) > 1.2 ? 0.4 : 1; car.brake = 0; }
    }
    car.handbrake = Math.abs(err) > 1.9 && Math.abs(vAlong) > 10;
  }

  // ---------- pedestrians ----------
  function pedLattice(ped) {
    const nr = GT.city.nearestRoad(ped.x, ped.z);
    ped.axis = nr.axis; ped.c = nr.c;
    const cross = ped.axis === 'z' ? ped.x : ped.z;
    ped.side = (cross - nr.c) >= 0 ? 1 : -1;
    ped.dir = Math.random() < 0.5 ? 1 : -1;
    ped.lastKey = null;
  }

  function pedControl(ped, dt) {
    const st = GT.state;
    if (ped.state === 'down') return;

    if (ped.state === 'flee') {
      ped.fleeT -= dt;
      const desired = U.angTo(ped.threatX, ped.threatZ, ped.x, ped.z);
      ped.h = U.approachAngle(ped.h, desired, 7 * dt);
      const sp = 4.6;
      ped.x += Math.sin(ped.h) * sp * dt; ped.z += Math.cos(ped.h) * sp * dt;
      if (ped.x > C.WATER_X - 5) ped.x = C.WATER_X - 5;
      ped.t += dt * 11;
      if (ped.fleeT <= 0) { ped.state = 'walk'; pedLattice(ped); }
      return;
    }

    if (ped.officer) { officerControl(ped, dt); return; }

    // sidewalk lattice walk
    if (ped.axis == null) pedLattice(ped);
    const along = ped.axis === 'z' ? ped.z : ped.x;
    const k = nodeAhead(ped.axis, along, ped.dir);
    if (k < 0 || k > C.BLOCKS) { ped.dir = -ped.dir; ped.lastKey = null; }
    else {
      const nodeC = GT.roadC(k), key = ped.axis + k;
      if (ped.dir * (along - nodeC) > -1.2 && ped.lastKey !== key) {
        ped.lastKey = key;
        if (Math.random() < 0.45) {
          const oldC = ped.c;
          ped.axis = ped.axis === 'z' ? 'x' : 'z';
          ped.c = nodeC;
          ped.dir = Math.random() < 0.5 ? 1 : -1;
          const kc = GT.roadK(oldC);
          if (kc >= C.BLOCKS) ped.dir = -1; if (kc <= 0) ped.dir = 1;
          ped.side = Math.random() < 0.5 ? 1 : -1;
          ped.lastKey = ped.axis + GT.roadK(oldC);
        }
      }
    }
    const lane = ped.c + ped.side * 10.4;
    let tAlong = along + ped.dir * 5;
    tAlong = U.clamp(tAlong, -C.HALF + 4, C.HALF - 4);
    const tx = ped.axis === 'z' ? lane : tAlong;
    const tz = ped.axis === 'z' ? tAlong : lane;
    ped.h = U.approachAngle(ped.h, U.angTo(ped.x, ped.z, tx, tz), 5 * dt);
    ped.x += Math.sin(ped.h) * ped.speed * dt;
    ped.z += Math.cos(ped.h) * ped.speed * dt;
    ped.t += dt * ped.speed * 2.6;
  }

  ai.scare = function (x, z, r) {
    const r2 = r * r;
    for (const p of GT.state.peds) {
      if (p.officer || p.state === 'down') continue;
      if (U.dist2(p.x, p.z, x, z) < r2) { p.state = 'flee'; p.fleeT = U.rand(4, 7); p.threatX = x; p.threatZ = z; }
    }
  };

  // ---------- on-foot officers ----------
  function officerControl(o, dt) {
    const st = GT.state, p = st.player;
    if (st.stars === 0) {
      o.leaveT = (o.leaveT || 0) + dt;
      o.h = U.approachAngle(o.h, U.angTo(p.x, p.z, o.x, o.z), 4 * dt);
      o.x += Math.sin(o.h) * 2 * dt; o.z += Math.cos(o.h) * 2 * dt; o.t += dt * 5;
      if (o.leaveT > 3.5) GT.ent.removePed(o);
      return;
    }
    const d2 = U.dist2(o.x, o.z, p.x, p.z);
    o.h = U.approachAngle(o.h, U.angTo(o.x, o.z, p.x, p.z), 8 * dt);
    const sp = p.car ? 5.4 : 6.4;
    if (d2 > 1.2) {
      o.x += Math.sin(o.h) * sp * dt;
      o.z += Math.cos(o.h) * sp * dt;
      o.t += dt * sp * 2.2;
    }
    // arrest: cumulative contact while player is on foot
    if (!p.car && d2 < 1.96 && !p.dead) {
      st.arrestT += dt;
      if (st.arrestT > 1.2) GT.sim.bust();
    }
  }

  // ---------- spawning ----------
  function spawnTraffic() {
    const st = GT.state, p = st.player;
    const pt = GT.city.randomRoadPoint();
    const d2 = U.dist2(pt.x, pt.z, p.x, p.z);
    if (d2 < C.SPAWN_NEAR * C.SPAWN_NEAR || d2 > C.SPAWN_FAR * C.SPAWN_FAR) return false;
    const axis = pt.axis, c = axis === 'z' ? pt.x : pt.z;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const lane = ai.laneCross(axis, c, dir);
    const x = axis === 'z' ? lane : pt.x;
    const z = axis === 'z' ? pt.z : lane;
    for (const v of st.vehicles) if (U.dist2(v.x, v.z, x, z) < 110) return false;
    const kind = U.pick(['sedan', 'sedan', 'sedan', 'taxi', 'taxi', 'beater', 'beater', 'van', 'sports', 'muscle', 'pickup', 'pickup', 'supercar', 'bus']);
    GT.ent.spawnCar(kind, x, z, axisHeading(axis, dir), { driver: 'ai', ai: { axis, c, dir } });
    return true;
  }

  function spawnPedNear() {
    const st = GT.state, p = st.player;
    const ang = U.rand(0, U.TAU), d = U.rand(55, 140);
    let x = p.x + Math.sin(ang) * d, z = p.z + Math.cos(ang) * d;
    if (GT.city.isWater(x, z) || x > C.SAND_X0 + 40) return false;
    x = U.clamp(x, -C.HALF + 6, C.SAND_X0 + 30); z = U.clamp(z, -C.HALF + 6, C.HALF - 6);
    const nr = GT.city.nearestRoad(x, z);
    if (nr.axis === 'z') x = nr.c + (Math.random() < 0.5 ? 1 : -1) * 10.4;
    else z = nr.c + (Math.random() < 0.5 ? 1 : -1) * 10.4;
    GT.ent.spawnPed(x, z);
    return true;
  }

  function spawnCopCar() {
    const st = GT.state, p = st.player;
    const pt = GT.city.randomRoadPoint();
    const d2 = U.dist2(pt.x, pt.z, p.x, p.z);
    // higher heat: the net closes in — spawns get nearer
    const near = Math.max(34, 62 - st.stars * 6), far = 140 + st.stars * 5;
    if (d2 < near * near || d2 > far * far) return false;
    const axis = pt.axis, c = axis === 'z' ? pt.x : pt.z;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const lane = ai.laneCross(axis, c, dir);
    const x = axis === 'z' ? lane : pt.x;
    const z = axis === 'z' ? pt.z : lane;
    for (const v of st.vehicles) if (U.dist2(v.x, v.z, x, z) < 90) return false;
    const heavy = st.stars >= 4 && Math.random() < (st.stars >= 5 ? 0.7 : 0.45);
    const car = GT.ent.spawnCar(heavy ? 'interceptor' : 'police', x, z, U.angTo(x, z, p.x, p.z), { driver: 'ai', ai: { police: true } });
    car.isPolice = true;
    car.sirenOn = true;
    return true;
  }

  // ---------- police helicopter (5 stars) ----------
  function spawnCopHeli() {
    const st = GT.state, p = st.player;
    const ang = Math.random() * U.TAU;
    const h = GT.ent.spawnHeli(p.x + Math.sin(ang) * 170, p.z + Math.cos(ang) * 170,
      U.angTo(p.x + Math.sin(ang) * 170, p.z + Math.cos(ang) * 170, p.x, p.z), { police: true, driver: 'ai', ai: { copHeli: true } });
    h.y = 42; h.sirenOn = true;
    return h;
  }
  function copHeliControl(h, dt) {
    const st = GT.state, p = st.player, a = h.ai;
    if (st.stars < 5 || h.dead) {
      a.leaveT = (a.leaveT || 0) + dt;
      h.lift = 0.7; h.throttle = 1; h.steer = 0;     // climb out and leave, decisively
      if (a.leaveT > 3 && U.dist2(h.x, h.z, p.x, p.z) > 200 * 200) GT.ent.removeCar(h);
      return;
    }
    const pvx = p.car ? p.car.vx : p.vx, pvz = p.car ? p.car.vz : p.vz;
    const tx = p.x + pvx * 0.7, tz = p.z + pvz * 0.7;
    const desired = U.angTo(h.x, h.z, tx, tz);
    h.steer = U.clamp(U.wrapAngle(desired - h.h) * 1.6, -1, 1);
    const d = Math.sqrt(U.dist2(h.x, h.z, tx, tz));
    h.throttle = U.clamp((d - 17) / 14, -0.4, 1);     // hold a hover ring ~17u out
    // fly high on approach so downtown towers can't wall it off; drop to gun height on station
    const wantY = 24 + Math.min(24, Math.max(0, d - 30) * 0.6) + Math.sin(st.time * 0.7) * 2.5;
    h.lift = U.clamp((wantY - h.y) * 0.5, -1, 1);
    a.gunT = (a.gunT || 1.2) - dt;
    if (a.gunT <= 0 && d < 80) {
      a.gunT = 0.85;
      const lead = p.car ? 0.55 : 0.35;
      GT.sim.spawnShot(h.x, h.y - 0.6, h.z,
        p.x + pvx * lead + U.rand(-1.2, 1.2), 0.9, p.z + pvz * lead + U.rand(-1.2, 1.2));
    }
  }

  // ---------- main update ----------
  ai.update = function (dt) {
    const st = GT.state, p = st.player;
    if (!p) return;
    updateHeat(dt);

    // entity brains
    for (let i = st.vehicles.length - 1; i >= 0; i--) {
      const v = st.vehicles[i];
      if (v.dead || v.driver !== 'ai') continue;
      if (v.ai && v.ai.copHeli) copHeliControl(v, dt);
      else if (v.isPolice) copControl(v, dt);
      else if (v.ai) trafficControl(v, dt);
    }
    for (let i = st.peds.length - 1; i >= 0; i--) pedControl(st.peds[i], dt);

    // census + spawning
    spawnCool -= dt; pedCool -= dt; copCool -= dt;
    let traffic = 0, copCars = 0, civilians = 0;
    for (const v of st.vehicles) {
      if (v.dead) continue;
      if (v.isPolice && v.driver === 'ai' && !v.heli) copCars++;
      else if (v.driver === 'ai') traffic++;
    }
    for (const pd of st.peds) if (!pd.officer && pd.state !== 'down') civilians++;

    if (traffic < Math.round(C.TRAFFIC_TARGET * st.densityCars) && spawnCool <= 0) { spawnCool = spawnTraffic() ? 0.35 : 0.08; }
    if (civilians < Math.round(C.PED_TARGET * st.densityPeds) && pedCool <= 0) { pedCool = spawnPedNear() ? 0.25 : 0.07; }

    const copCarTarget = [0, 2, 3, 4, 6, 8][st.stars] || 0;
    if (copCars < copCarTarget && copCool <= 0) { copCool = spawnCopCar() ? (st.stars >= 4 ? 0.9 : 1.4) : 0.12; }
    const copHelis = st.vehicles.filter(v => v.heli && v.isPolice && !v.dead).length;
    if (st.stars >= 5 && copHelis < 1 && heliCool <= 0) { spawnCopHeli(); heliCool = 6; }
    heliCool = Math.max(0, heliCool - dt);

    // despawn far entities (never mission cars, parked cars, or the player's ride)
    for (let i = st.vehicles.length - 1; i >= 0; i--) {
      const v = st.vehicles[i];
      if (v.mission || v.parked || v === (p.car || null)) continue;
      if (v.driver !== 'ai' && !v.dead) continue;
      if (U.dist2(v.x, v.z, p.x, p.z) > C.DESPAWN * C.DESPAWN) GT.ent.removeCar(v);
    }
    for (let i = st.peds.length - 1; i >= 0; i--) {
      const pd = st.peds[i];
      if (U.dist2(pd.x, pd.z, p.x, p.z) > C.DESPAWN * C.DESPAWN) GT.ent.removePed(pd);
    }
  };

  return ai;
})();

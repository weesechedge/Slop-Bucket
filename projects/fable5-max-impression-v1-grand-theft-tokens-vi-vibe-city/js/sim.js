/* ============================================================
   GRAND THEFT TOKENS VI — sim.js
   Physics + consequences. Integrates every car with the same
   arcade model (lateral grip + handbrake drift), resolves
   collisions against the city and each other, runs pickups,
   particles, fire/explosions, drowning, death and respawns.
   ============================================================ */
GT.sim = (function () {
  const U = GT.U, C = GT.C;
  const sim = { scene: null, shake: 0 };
  let healCool = 0;

  // ================= particles =================
  sim.burst = function (x, y, z, o) {
    o = o || {};
    const n = o.n || 14;
    const pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      const a = U.rand(0, U.TAU), r = U.rand(0.2, o.spread || 2.4);
      vel.push({ x: Math.sin(a) * r, y: U.rand(0.4, o.up || 3), z: Math.cos(a) * r });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: o.color || 0xffc27a, size: o.size || 0.5, transparent: true, opacity: 1, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    sim.scene.add(pts);
    const P = { pts, vel, life: o.life || 1.0, maxLife: o.life || 1.0, g: o.g !== undefined ? o.g : 7 };
    if (o.light) {
      P.light = new THREE.PointLight(o.lightColor || 0xff9a3d, 2.4, 30);
      P.light.position.set(x, y + 1, z); sim.scene.add(P.light);
    }
    GT.state.particles.push(P);
    return P;
  };

  function updateParticles(dt) {
    const arr = GT.state.particles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const P = arr[i];
      P.life -= dt;
      const a = P.pts.geometry.attributes.position.array;
      for (let j = 0; j < P.vel.length; j++) {
        const v = P.vel[j];
        a[j * 3] += v.x * dt; a[j * 3 + 1] += v.y * dt; a[j * 3 + 2] += v.z * dt;
        v.y -= P.g * dt;
      }
      P.pts.geometry.attributes.position.needsUpdate = true;
      P.pts.material.opacity = Math.max(0, P.life / P.maxLife);
      if (P.light) P.light.intensity = 2.4 * (P.life / P.maxLife);
      if (P.life <= 0) {
        sim.scene.remove(P.pts); if (P.light) sim.scene.remove(P.light);
        P.pts.geometry.dispose(); P.pts.material.dispose();
        arr.splice(i, 1);
      }
    }
  }

  // ================= damage =================
  sim.damageCar = function (car, n) {
    if (car.dead) return;
    car.health -= n;
    if (car.health <= 0 && !car.fuseT) car.fuseT = U.rand(0.25, 0.6);
  };

  sim.explodeCar = function (car) {
    if (car.dead) return;
    car.dead = true; car.fuseT = 0; car.sirenOn = false;
    GT.audio.sfx.explosion();
    sim.burst(car.x, 1.2, car.z, { n: 26, color: 0xff9a3d, up: 7, spread: 5, size: 0.9, life: 0.9, light: true });
    sim.burst(car.x, 1.0, car.z, { n: 18, color: 0x33312e, up: 4, spread: 3, size: 1.3, life: 1.6, g: -0.6 });
    car.mesh.traverse(m => {
      if (m.isMesh) { m.material = m.material.clone(); m.material.color.setHex(0x1d1b19); if (m.material.emissive) m.material.emissive.setHex(0x000000); }
    });
    car.mesh.position.y += 0.12;
    sim.shake = Math.max(sim.shake, 0.8);
    const wasPolice = car.isPolice;
    const st = GT.state;
    // blast radius
    for (const pd of st.peds.slice()) {
      if (pd.state !== 'down' && U.dist2(pd.x, pd.z, car.x, car.z) < 49) GT.ent.setDown(pd);
    }
    for (const v of st.vehicles) {
      if (v === car || v.dead) continue;
      if (U.dist2(v.x, v.z, car.x, car.z) < 49) sim.damageCar(v, 60);
    }
    const p = st.player;
    if (p && !p.dead) {
      const inThis = p.car === car;
      if (inThis || U.dist2(p.x, p.z, car.x, car.z) < 49) sim.damagePlayer(inThis ? 110 : 65);
      if (inThis && !p.dead) sim.exitCar(true);
    }
    GT.ai.scare(car.x, car.z, 30);
    if (wasPolice && p && U.dist2(car.x, car.z, p.x, p.z) < 2500) GT.ai.addHeat(70);
    GT.emit('carDestroyed', car);
  };

  sim.damagePlayer = function (n) {
    const p = GT.state.player;
    if (!p || p.dead) return;
    p.health -= n;
    GT.emit('playerHurt');
    if (p.health <= 0) { p.health = 0; sim.wasted(); }
  };

  // ================= death / respawn =================
  sim.wasted = function () {
    const st = GT.state, p = st.player;
    if (p.dead) return;
    p.dead = true; st.deaths++;
    st.deathKind = 'wasted'; st.deathT = 3.4;
    st.timescale = 0.3;
    GT.audio.sfx.wasted();
    GT.hud.splash('WASTED', '#d33d63');
    GT.hud.wastedFx(true);
    GT.emit('wasted');
  };

  sim.bust = function () {
    const st = GT.state, p = st.player;
    if (p.dead) return;
    p.dead = true; st.busts++;
    st.deathKind = 'busted'; st.deathT = 2.8;
    GT.audio.sfx.busted();
    GT.hud.splash('BUSTED', '#3fa9ff');
    GT.emit('busted');
  };

  function finishDeath() {
    const st = GT.state, p = st.player;
    const busted = st.deathKind === 'busted';
    const fee = busted ? C.BAIL : C.HOSPITAL_FEE;
    st.tokens = Math.max(0, st.tokens - fee);
    if (p.car) sim.exitCar(true);
    const at = busted ? GT.POI.policeSpawn : GT.POI.hospitalSpawn;
    p.x = at.x; p.z = at.z; p.h = Math.PI; p.vx = p.vz = 0;
    p.health = 100; p.dead = false;
    st.heat = 0; st.stars = 0; st.arrestT = 0; st.timescale = 1;
    GT.hud.wastedFx(false);
    GT.hud.toast(busted
      ? 'Bailed out. \u2212' + fee + ' \u26c1 (lawyer was an LLM)'
      : 'Respawned at Mercy General. \u2212' + fee + ' \u26c1');
    GT.emit('respawn');
  }

  // ================= enter / exit =================
  sim.exitCar = function (silent) {
    const p = GT.state.player, car = p.car;
    if (!car) return;
    p.car = null; car.driver = null;
    car.throttle = 0; car.brake = 0.4; car.handbrake = true;
    const s = U.fwd(car.h + Math.PI / 2);
    p.x = car.x - s.x * (car.stats.w / 2 + 0.8);
    p.z = car.z - s.z * (car.stats.w / 2 + 0.8);
    p.vx = p.vz = 0;
    p.mesh.visible = true;
    if (!silent) GT.emit('carExited', car);
  };

  // ================= heal marker =================
  function buildHealMarker() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.18, 20),
      new THREE.MeshLambertMaterial({ color: 0x4fe08a, emissive: 0x2c8a52, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 }));
    ring.position.y = 0.1; g.add(ring);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.22), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x99ffbb, emissiveIntensity: 0.7 }));
    cross.position.y = 1.3; g.add(cross);
    const cross2 = cross.clone(); cross2.rotation.y = Math.PI / 2; g.add(cross2);
    g.position.set(GT.POI.hospitalHeal.x, 0, GT.POI.hospitalHeal.z);
    sim.scene.add(g);
    sim.healMesh = g;
  }

  // ================= car physics =================
  function stepCar(car, dt) {
    if (car.fuseT) { car.fuseT -= dt; if (car.fuseT <= 0) sim.explodeCar(car); }

    // drowning
    if (GT.city.isWater(car.x, car.z)) {
      if (!car.drowned) {
        car.drowned = true; car.dead = true; car.sirenOn = false;
        GT.audio.sfx.splash();
        sim.burst(car.x, 0.4, car.z, { n: 20, color: 0xbfe8ff, up: 5, spread: 3, size: 0.6, life: 0.8 });
        if (GT.state.player.car === car) { GT.hud.toast('Hard context boundary: the ocean.'); }
      }
      car.sinkT += dt;
      car.mesh.position.y = -car.sinkT * 0.7;
      car.vx *= 0.92; car.vz *= 0.92;
      car.x += car.vx * dt; car.z += car.vz * dt;
      car.mesh.position.x = car.x; car.mesh.position.z = car.z;
      if (GT.state.player.car === car && car.sinkT > 1.6) sim.wasted();
      if (car.sinkT > 5 && !car.mission) GT.ent.removeCar(car);
      return;
    }

    if (car.dead) {
      // burnt husk: slight smoke, coast to a stop
      car.smokeT += dt;
      if (car.smokeT > 0.5) { car.smokeT = 0; sim.burst(car.x, 1.4, car.z, { n: 3, color: 0x44403c, up: 1.6, spread: 0.6, size: 1.1, life: 1.4, g: -0.5 }); }
      car.vx *= (1 - Math.min(1, 3 * dt)); car.vz *= (1 - Math.min(1, 3 * dt));
      car.x += car.vx * dt; car.z += car.vz * dt;
      car.mesh.position.x = car.x; car.mesh.position.z = car.z;
      return;
    }

    const sH = Math.sin(car.h), cH = Math.cos(car.h);
    let vAlong = car.vx * sH + car.vz * cH;
    let vPerp = car.vx * cH - car.vz * sH;

    // engine + brakes + drag
    const acc = car.stats.acc;
    vAlong += car.throttle * acc * dt;
    if (car.brake > 0) {
      const dec = car.brake * 24 * dt;
      vAlong = Math.abs(vAlong) <= dec ? 0 : vAlong - Math.sign(vAlong) * dec;
    }
    vAlong -= vAlong * 0.45 * dt;
    vAlong = U.clamp(vAlong, -8, car.stats.max);

    // lateral grip (handbrake = drift)
    const grip = car.handbrake ? 1.8 : 7;
    vPerp -= vPerp * Math.min(1, grip * dt);

    // steering
    const steerRate = 2.4 * (car.handbrake ? 1.5 : 1);
    car.h += car.steer * steerRate * U.clamp(vAlong / 10, -1, 1) * dt;
    car.h = U.wrapAngle(car.h);

    const sH2 = Math.sin(car.h), cH2 = Math.cos(car.h);
    car.vx = sH2 * vAlong + cH2 * vPerp;
    car.vz = cH2 * vAlong - sH2 * vPerp;
    car.x += car.vx * dt;
    car.z += car.vz * dt;

    // static collisions (circle vs AABB/circle, slide + damage)
    const cols = GT.city.query(car.x, car.z, car.r + 1);
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      let nx, nz, pen;
      if (c.circle) {
        const dx = car.x - c.cx, dz = car.z - c.cz;
        const d = Math.sqrt(dx * dx + dz * dz) || 0.001;
        pen = c.r + car.r * 0.8 - d;
        if (pen <= 0) continue;
        nx = dx / d; nz = dz / d;
      } else {
        const qx = U.clamp(car.x, c.x0, c.x1), qz = U.clamp(car.z, c.z0, c.z1);
        const dx = car.x - qx, dz = car.z - qz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > car.r * 0.85) continue;
        if (d > 0.001) { nx = dx / d; nz = dz / d; pen = car.r * 0.85 - d; }
        else { // center inside box: push out the thinnest side
          const l = car.x - c.x0, r = c.x1 - car.x, t = car.z - c.z0, b = c.z1 - car.z;
          const m = Math.min(l, r, t, b);
          nx = m === l ? -1 : m === r ? 1 : 0; nz = m === t ? -1 : m === b ? 1 : 0; pen = car.r * 0.85 + m;
        }
      }
      car.x += nx * pen; car.z += nz * pen;
      const vn = car.vx * nx + car.vz * nz;
      if (vn < 0) {
        const impact = -vn;
        car.vx -= nx * vn * 1.25; car.vz -= nz * vn * 1.25;
        if (impact > 7) {
          sim.damageCar(car, impact * 1.5);
          GT.audio.sfx.crash(impact);
          sim.burst(car.x + nxOff(nx, car), 0.8, car.z + nzOff(nz, car), { n: 8, color: 0xffe9b0, up: 2, spread: 2, size: 0.28, life: 0.4 });
          if (GT.state.player.car === car) sim.shake = Math.max(sim.shake, Math.min(0.7, impact / 22));
        }
      }
    }

    // visuals
    car.mesh.position.set(car.x, GT.city.groundY(car.x, car.z), car.z);
    car.mesh.rotation.y = car.h;
    const roll = vAlong / 0.34 * dt;
    for (const w of car.wheels) if (w) w.rotation.x += roll;
    if (car.isPolice && car.lightR) {
      car.flashT += dt;
      const on = Math.sin(car.flashT * 12) > 0;
      car.lightR.material.emissiveIntensity = car.sirenOn ? (on ? 1.6 : 0.1) : 0.3;
      car.lightB.material.emissiveIntensity = car.sirenOn ? (on ? 0.1 : 1.6) : 0.3;
    }
    // damage smoke / fire
    if (car.health < 40) {
      car.smokeT += dt;
      const rate = car.health < 15 ? 0.12 : 0.2;
      if (car.smokeT > rate) {
        car.smokeT = 0;
        const f = U.fwd(car.h);
        const ex = car.x + f.x * car.stats.len * 0.35, ez = car.z + f.z * car.stats.len * 0.35;
        if (car.health < 15) {
          sim.burst(ex, 0.9, ez, { n: 4, color: 0xff7a2e, up: 2.6, spread: 0.5, size: 0.5, life: 0.4, g: -1 });
          sim.damageCar(car, 4 * rate * 6);
        } else {
          sim.burst(ex, 1.0, ez, { n: 3, color: 0x55504a, up: 1.8, spread: 0.5, size: 0.9, life: 1.2, g: -0.6 });
        }
      }
    }
  }
  function nxOff(nx, car) { return -nx * car.r * 0.7; }
  function nzOff(nz, car) { return -nz * car.r * 0.7; }

  // car vs car
  function carPairs(dt) {
    const vs = GT.state.vehicles;
    for (let i = 0; i < vs.length; i++) {
      const a = vs[i];
      for (let j = i + 1; j < vs.length; j++) {
        const b = vs[j];
        const dx = b.x - a.x, dz = b.z - a.z;
        const rr = a.r + b.r - 0.6;
        const d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr || d2 < 0.0001) continue;
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, pen = rr - d;
        const ma = a.stats.w * a.stats.len, mb = b.stats.w * b.stats.len;
        const ta = mb / (ma + mb), tb = ma / (ma + mb);
        a.x -= nx * pen * ta; a.z -= nz * pen * ta;
        b.x += nx * pen * tb; b.z += nz * pen * tb;
        const rvx = b.vx - a.vx, rvz = b.vz - a.vz;
        const vn = rvx * nx + rvz * nz;
        if (vn < 0) {
          const imp = -vn;
          a.vx += nx * vn * tb * 1.1; a.vz += nz * vn * tb * 1.1;
          b.vx -= nx * vn * ta * 1.1; b.vz -= nz * vn * ta * 1.1;
          if (imp > 7) {
            sim.damageCar(a, imp * ta * 1.6); sim.damageCar(b, imp * tb * 1.6);
            GT.audio.sfx.crash(imp);
            sim.burst((a.x + b.x) / 2, 0.9, (a.z + b.z) / 2, { n: 7, color: 0xffe9b0, up: 2, spread: 2, size: 0.28, life: 0.35 });
            const p = GT.state.player;
            const mine = p.car === a || p.car === b;
            if (mine) {
              sim.shake = Math.max(sim.shake, Math.min(0.7, imp / 22));
              const other = p.car === a ? b : a;
              if (other.isPolice && GT.state.time - (other.heatTick || 0) > 1.2) { other.heatTick = GT.state.time; GT.ai.addHeat(50); }
            }
          }
        }
      }
    }
  }

  // car vs people
  function carVsPeople(dt) {
    const st = GT.state, p = st.player;
    for (const car of st.vehicles) {
      const sp = Math.sqrt(car.vx * car.vx + car.vz * car.vz);
      const mine = p.car === car;
      // peds + officers
      for (let i = st.peds.length - 1; i >= 0; i--) {
        const pd = st.peds[i];
        if (pd.state === 'down') continue;
        const rr = car.r * 0.8 + 0.45;
        if (U.dist2(pd.x, pd.z, car.x, car.z) > rr * rr) continue;
        if (sp > 6) {
          GT.ent.setDown(pd);
          GT.audio.sfx.thud();
          sim.burst(pd.x, 1.2, pd.z, { n: 8, color: 0xffd27a, up: 4, spread: 1.6, size: 0.3, life: 0.7 });
          GT.ai.scare(pd.x, pd.z, 18);
          if (mine) {
            GT.ai.addHeat(pd.officer ? 90 : 40);
            if (Math.random() < 0.55) sim.spawnTokenDrops(pd.x, pd.z, U.randi(1, 3));
            GT.emit('pedFlattened', pd);
          }
        } else {
          const d = Math.sqrt(U.dist2(pd.x, pd.z, car.x, car.z)) || 0.01;
          const nx = (pd.x - car.x) / d, nz = (pd.z - car.z) / d;
          pd.x += nx * (rr - d + 0.05); pd.z += nz * (rr - d + 0.05);
        }
      }
      // player on foot
      if (!p.car && !p.dead) {
        const rr = car.r * 0.8 + 0.5;
        const d2 = U.dist2(p.x, p.z, car.x, car.z);
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 0.01;
          const nx = (p.x - car.x) / d, nz = (p.z - car.z) / d;
          p.x += nx * (rr - d + 0.05); p.z += nz * (rr - d + 0.05);
          if (sp > 6) {
            sim.damagePlayer(sp * 2.2);
            p.vx += nx * sp * 0.8; p.vz += nz * sp * 0.8;
            GT.audio.sfx.thud(); sim.shake = Math.max(sim.shake, 0.45);
          }
        }
      }
    }
  }

  // people vs static colliders
  function personVsWorld(o, r) {
    const cols = GT.city.query(o.x, o.z, r + 0.5);
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (c.circle) {
        const dx = o.x - c.cx, dz = o.z - c.cz;
        const d = Math.sqrt(dx * dx + dz * dz) || 0.001;
        const pen = c.r + r - d;
        if (pen > 0) { o.x += dx / d * pen; o.z += dz / d * pen; }
      } else {
        const qx = U.clamp(o.x, c.x0, c.x1), qz = U.clamp(o.z, c.z0, c.z1);
        const dx = o.x - qx, dz = o.z - qz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < r) {
          if (d > 0.001) { o.x += dx / d * (r - d); o.z += dz / d * (r - d); }
          else o.z = c.z1 + r;
        }
      }
    }
  }

  // ================= player on foot =================
  function stepPlayer(dt) {
    const st = GT.state, p = st.player;
    if (p.car || p.dead) { p.mesh.visible = !p.car; if (p.car) { p.x = p.car.x; p.z = p.car.z; } return; }
    const sp = p.sprint ? C.SPRINT : C.WALK;
    const ix = p.inX || 0, iz = p.inZ || 0;
    const mag = Math.sqrt(ix * ix + iz * iz);
    p.moving = mag > 0.05;
    const tx = p.moving ? ix / Math.max(1, mag) * sp : 0;
    const tz = p.moving ? iz / Math.max(1, mag) * sp : 0;
    p.vx = U.lerp(p.vx, tx, Math.min(1, 12 * dt));
    p.vz = U.lerp(p.vz, tz, Math.min(1, 12 * dt));
    p.x += p.vx * dt; p.z += p.vz * dt;
    if (p.moving) p.h = U.approachAngle(p.h, Math.atan2(p.vx, p.vz), 12 * dt);
    personVsWorld(p, 0.42);
    p.x = U.clamp(p.x, -C.HALF - 8, 470); p.z = U.clamp(p.z, -C.HALF - 8, C.HALF + 8);

    // drowning
    const inWater = GT.city.isWater(p.x, p.z);
    if (inWater) {
      if (!p.wet) { p.wet = true; GT.audio.sfx.splash(); sim.burst(p.x, 0.4, p.z, { n: 10, color: 0xbfe8ff, up: 3.5, spread: 1.4, size: 0.4, life: 0.6 }); }
      sim.damagePlayer(30 * dt);
    } else p.wet = false;

    // anim
    const y = inWater ? -0.55 : GT.city.groundY(p.x, p.z);
    p.mesh.position.set(p.x, y, p.z);
    p.mesh.rotation.y = p.h;
    if (p.punchT > 0) {
      p.punchT -= dt;
      const aR = p.mesh.getObjectByName('armR');
      if (aR) aR.rotation.x = -2.1 * Math.sin(Math.PI * Math.min(1, 1 - p.punchT / 0.32));
      GT.ent.animHuman(p.mesh, p.t, 0);
      const aR2 = p.mesh.getObjectByName('armR');
      if (aR2) aR2.rotation.x = -2.1 * Math.sin(Math.PI * Math.min(1, 1 - p.punchT / 0.32));
    } else if (p.moving) {
      p.t += dt * sp * 2.2;
      GT.ent.animHuman(p.mesh, p.t, p.sprint ? 1.0 : 0.7);
    } else {
      GT.ent.animHuman(p.mesh, 0, 0);
    }

    // hospital heal
    healCool -= dt;
    if (healCool <= 0 && U.dist2(p.x, p.z, GT.POI.hospitalHeal.x, GT.POI.hospitalHeal.z) < 4) {
      if (p.health < 100 && st.tokens >= 100) {
        st.tokens -= 100; p.health = 100; healCool = 4;
        GT.audio.sfx.heal();
        GT.hud.toast('Patched up. \u2212100 \u26c1 \u2014 "drink water, avoid explosions"');
      } else if (p.health < 100 && st.tokens < 100) {
        healCool = 4; GT.hud.toast('Mercy General: healing costs 100 \u26c1. No tokens, no triage.');
      }
    }
  }

  // ================= punch =================
  sim.punch = function () {
    const st = GT.state, p = st.player;
    if (p.car || p.dead || p.punchT > 0) return;
    p.punchT = 0.32;
    GT.audio.sfx.punch();
    const f = U.fwd(p.h);
    let hit = false;
    for (const pd of st.peds) {
      if (pd.state === 'down') continue;
      const dx = pd.x - p.x, dz = pd.z - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 3.4) continue;
      const d = Math.sqrt(d2) || 0.01;
      if (dx / d * f.x + dz / d * f.z < 0.45) continue;
      hit = true;
      pd.health -= 40;
      GT.audio.sfx.thud();
      sim.burst(pd.x, 1.3, pd.z, { n: 6, color: 0xffd27a, up: 3, spread: 1, size: 0.26, life: 0.5 });
      if (pd.health <= 0) {
        GT.ent.setDown(pd);
        if (Math.random() < 0.5) sim.spawnTokenDrops(pd.x, pd.z, U.randi(1, 2));
      } else if (!pd.officer) { pd.state = 'flee'; pd.fleeT = 6; pd.threatX = p.x; pd.threatZ = p.z; }
      GT.ai.addHeat(pd.officer ? 60 : 15);
      GT.ai.scare(p.x, p.z, 12);
    }
    if (!hit) {
      // swing at cars for fun
      for (const car of st.vehicles) {
        if (car.dead) continue;
        if (U.dist2(car.x, car.z, p.x + f.x, p.z + f.z) < (car.r + 0.6) * (car.r + 0.6)) {
          sim.damageCar(car, 6); GT.audio.sfx.thud();
          sim.burst(p.x + f.x * 1.2, 1.1, p.z + f.z * 1.2, { n: 4, color: 0xffe9b0, up: 2, spread: 1, size: 0.24, life: 0.3 });
          break;
        }
      }
    }
  };

  // ================= peds (down anim, drowning) =================
  function stepPeds(dt) {
    const st = GT.state;
    for (let i = st.peds.length - 1; i >= 0; i--) {
      const pd = st.peds[i];
      if (pd.state === 'down') {
        pd.downT += dt;
        const k = Math.min(1, pd.downT * 3.2);
        pd.mesh.rotation.y = pd.fallDir || pd.h;
        pd.mesh.rotation.x = -Math.PI / 2 * k;
        if (pd.downT > 5) pd.mesh.position.y -= dt * 0.5;
        if (pd.downT > 7) { GT.ent.removePed(pd); continue; }
      } else {
        personVsWorld(pd, 0.35);
        if (GT.city.isWater(pd.x, pd.z)) { GT.ent.setDown(pd); GT.audio.sfx.splash(); }
        pd.mesh.position.set(pd.x, GT.city.groundY(pd.x, pd.z), pd.z);
        pd.mesh.rotation.y = pd.h;
        GT.ent.animHuman(pd.mesh, pd.t, pd.state === 'flee' || pd.officer && st.stars > 0 ? 1.0 : 0.6);
      }
    }
  }

  // ================= pickups =================
  sim.spawnTokenDrops = function (x, z, n) {
    for (let i = 0; i < n; i++) {
      GT.ent.spawnPickup(x + U.rand(-1.4, 1.4), z + U.rand(-1.4, 1.4), 'token', 10 * U.randi(1, 3));
    }
  };

  function stepPickups(dt) {
    const st = GT.state, p = st.player;
    for (let i = st.pickups.length - 1; i >= 0; i--) {
      const pk = st.pickups[i];
      pk.t += dt;
      pk.life -= dt;
      pk.mesh.position.y = pk.y0 + Math.sin(pk.t * 3) * 0.15;
      pk.mesh.rotation.y += dt * 2.2;
      if (pk.life < 4 && pk.kind === 'token') pk.mesh.visible = Math.sin(pk.t * 14) > -0.4;
      if (pk.life <= 0) { GT.ent.removePickup(pk); continue; }
      const rr = p.car ? 2.8 : 1.7;
      if (!p.dead && U.dist2(pk.x, pk.z, p.x, p.z) < rr * rr) {
        st.tokens += pk.value;
        if (pk.kind === 'orb') {
          st.orbsFound++;
          GT.audio.sfx.orb();
          GT.hud.toast('Compute orb ' + st.orbsFound + '/' + st.orbsTotal + '  (+' + pk.value + ' \u26c1)');
          if (st.orbsFound === st.orbsTotal) { st.tokens += 5000; GT.hud.toast('ALL ORBS FOUND! +5,000 \u26c1 \u2014 you are now GPU-rich.'); }
          GT.emit('orb');
        } else {
          GT.audio.sfx.pickup();
        }
        GT.emit('pickup', pk);
        GT.ent.removePickup(pk);
      }
    }
  }

  // ================= ambient world =================
  function stepWorld(dt) {
    const st = GT.state, p = st.player;
    const city = GT.city;
    if (city.water && city.water.material.map) {
      city.water.material.map.offset.x += dt * 0.013;
      city.water.material.map.offset.y += dt * 0.007;
    }
    if (city.yacht) {
      city.yacht.position.y = Math.sin(st.time * 0.8) * 0.16;
      city.yacht.rotation.z = Math.sin(st.time * 0.6) * 0.025;
      city.yacht.rotation.x = Math.sin(st.time * 0.5 + 1) * 0.02;
    }
    if (city.sun && p) {
      city.sun.position.set(p.x + 120, 60, p.z + 40);
      city.sun.target.position.set(p.x, 0, p.z);
      city.sun.target.updateMatrixWorld();
    }
    if (sim.healMesh) sim.healMesh.rotation.y += dt * 1.2;
    // mission markers pulse
    for (const mk of st.markers) {
      mk.t = (mk.t || 0) + dt;
      const s = 1 + Math.sin(mk.t * 4) * 0.07;
      mk.mesh.scale.set(s, 1, s);
      if (mk.mesh.material) mk.mesh.material.opacity = 0.55 + Math.sin(mk.t * 4) * 0.18;
    }
    // arrest pressure cools off
    if (st.arrestT > 0) {
      let near = false;
      for (const o of st.officers) if (U.dist2(o.x, o.z, p.x, p.z) < 4) { near = true; break; }
      if (!near) st.arrestT = Math.max(0, st.arrestT - dt * 1.5);
    }
  }

  // ================= main update =================
  sim.update = function (dt, rawDt) {
    const st = GT.state;

    if (st.deathT > 0) {
      st.deathT -= rawDt;
      if (st.deathT <= 0) finishDeath();
    }

    const vs = st.vehicles;
    for (let i = vs.length - 1; i >= 0; i--) stepCar(vs[i], dt);
    carPairs(dt);
    carVsPeople(dt);
    stepPlayer(dt);
    stepPeds(dt);
    stepPickups(dt);
    updateParticles(dt);
    stepWorld(dt);
    sim.shake = Math.max(0, sim.shake - rawDt * 2.2);
  };

  sim.init = function (scene) {
    sim.scene = scene;
    buildHealMarker();
  };

  return sim;
})();

/* ============================================================
   GRAND THEFT TOKENS VI — city.js
   Procedural Vibe City: golden-hour sky, ocean, beach + pier,
   instanced art-deco blocks, POI buildings, palms, billboards,
   joke ads, colliders + spatial hash, and the minimap baker.
   ============================================================ */
GT.city = (function () {
  const U = GT.U, C = GT.C;
  const city = {
    colliders: [], hash: new Map(), CELL: 32,
    blocks: [], parkedSpots: [], orbSpots: [], K: [],
    water: null, yacht: null, sun: null, mapInfo: null,
  };
  for (let k = 0; k <= C.BLOCKS; k++) city.K.push(GT.roadC(k));

  // ---------- collision registry ----------
  function cellKey(cx, cz) { return cx + '_' + cz; }
  function addCollider(c) {
    c.id = city.colliders.length; city.colliders.push(c);
    const cs = city.CELL;
    const x0 = Math.floor(c.x0 / cs), x1 = Math.floor(c.x1 / cs);
    const z0 = Math.floor(c.z0 / cs), z1 = Math.floor(c.z1 / cs);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const k = cellKey(cx, cz);
      let arr = city.hash.get(k); if (!arr) { arr = []; city.hash.set(k, arr); }
      arr.push(c);
    }
  }
  function addBox(cx, cz, w, d) { addCollider({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 }); }
  function addCircle(cx, cz, r) { addCollider({ x0: cx - r, x1: cx + r, z0: cz - r, z1: cz + r, circle: true, cx, cz, r }); }
  const _qbuf = []; let _qstamp = 0;
  city.query = function (x, z, r) {
    _qbuf.length = 0; _qstamp++;
    const cs = city.CELL;
    const x0 = Math.floor((x - r) / cs), x1 = Math.floor((x + r) / cs);
    const z0 = Math.floor((z - r) / cs), z1 = Math.floor((z + r) / cs);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const arr = city.hash.get(cellKey(cx, cz));
      if (arr) for (let i = 0; i < arr.length; i++) { const c = arr[i]; if (c._st !== _qstamp) { c._st = _qstamp; _qbuf.push(c); } }
    }
    return _qbuf;
  };

  // ---------- texture helpers ----------
  function canvasTex(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(cv);
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  function windowTex(rows, cols) {
    return canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#efece4'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, h - 10, w, 10);
      const mw = w / cols, mh = h / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const lit = Math.random() < 0.3;
        g.fillStyle = lit ? (Math.random() < 0.5 ? '#ffd9a0' : '#ffc27a') : '#33405e';
        g.fillRect(c * mw + mw * 0.22, r * mh + mh * 0.25, mw * 0.56, mh * 0.5);
      }
    });
  }
  function textPanelTex(lines, opts) {
    opts = opts || {};
    return canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = opts.bg || '#15102e'; g.fillRect(0, 0, w, h);
      g.strokeStyle = opts.border || '#ff2e88'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const n = lines.length;
      for (let i = 0; i < n; i++) {
        const size = opts.size || (n > 1 ? 46 : 60);
        g.font = '900 ' + size + 'px Arial, sans-serif';
        g.shadowColor = opts.glow || '#19e3d1'; g.shadowBlur = 18;
        g.fillStyle = opts.fg || '#ffffff';
        g.fillText(lines[i], w / 2, h * (i + 0.55) / (n + 0.1), w - 50);
      }
    });
  }

  // ---------- main build ----------
  city.build = function (scene) {
    const rng = U.seeded(20260610);
    const lambert = (color) => new THREE.MeshLambertMaterial({ color });

    // ----- sky dome -----
    const sunDir = new THREE.Vector3(0.92, 0.18, 0.3).normalize();
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x241a52) }, mid: { value: new THREE.Color(0xff8e63) },
        bot: { value: new THREE.Color(0x2a1638) }, sunDir: { value: sunDir },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 sunDir;',
        'void main(){',
        '  float h = vP.y;',
        '  vec3 col = h > 0.0 ? mix(mid, top, pow(min(h*1.7,1.0), 0.75)) : mix(mid, bot, min(-h*3.0,1.0));',
        '  float d = max(dot(vP, sunDir), 0.0);',
        '  col += vec3(1.0, 0.55, 0.3) * pow(d, 7.0) * 0.55;',
        '  col += vec3(1.0, 0.85, 0.65) * smoothstep(0.9986, 0.9996, d);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}',
      ].join('\n'),
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(880, 24, 16), skyMat));

    // stars
    {
      const n = 220, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = rng() * U.TAU, e = 0.25 + rng() * 1.2, r = 840;
        pos[i * 3] = Math.cos(a) * Math.cos(e) * r; pos[i * 3 + 1] = Math.sin(e) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff6e8, size: 2.2, transparent: true, opacity: 0.65, fog: false, sizeAttenuation: false })));
    }

    // ----- lights -----
    scene.add(new THREE.HemisphereLight(0x8d7cd8, 0x46284a, 0.62));
    const sun = new THREE.DirectionalLight(0xffb37a, 1.15);
    sun.position.set(140, 52, 46);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
    sun.shadow.camera.near = 10; sun.shadow.camera.far = 420;
    sun.shadow.bias = -0.0006;
    scene.add(sun); scene.add(sun.target);
    city.sun = sun;
    scene.fog = new THREE.Fog(0xc7768f, 150, 560);

    // ----- ground / sand / water -----
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), lambert(0x3a3444));
    ground.rotation.x = -Math.PI / 2; ground.position.set(-160, -0.02, 0); ground.receiveShadow = true;
    scene.add(ground);

    const sandTex = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#e0cf9a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(120,95,50,' + (0.04 + Math.random() * 0.08) + ')'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    });
    sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping; sandTex.repeat.set(8, 40);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(C.WATER_X - C.SAND_X0 + 14, 612), new THREE.MeshLambertMaterial({ map: sandTex, color: 0xffffff }));
    sand.rotation.x = -Math.PI / 2; sand.position.set((C.SAND_X0 + C.WATER_X) / 2 - 2, 0.02, 0); sand.receiveShadow = true;
    scene.add(sand);

    const waterTex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#123a78'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        g.fillStyle = 'rgba(180,220,255,' + (0.05 + Math.random() * 0.12) + ')';
        g.fillRect(Math.random() * w, Math.random() * h, 30 + Math.random() * 90, 1.6);
      }
      g.fillStyle = 'rgba(255,150,90,0.10)'; for (let i = 0; i < 18; i++) g.fillRect(Math.random() * w, Math.random() * h, 50 + Math.random() * 100, 2);
    });
    waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.repeat.set(7, 7);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1300),
      new THREE.MeshPhongMaterial({ map: waterTex, color: 0x9bb8ff, specular: 0xffb37a, shininess: 80, transparent: true, opacity: 0.97 }));
    water.rotation.x = -Math.PI / 2; water.position.set(C.WATER_X + 548, -0.18, 0);
    scene.add(water); city.water = water;

    // ----- lane dashes (instanced) -----
    {
      const dashGeo = new THREE.BoxGeometry(0.3, 0.04, 2.4);
      const dashes = [];
      const isIntersection = (alongC) => { for (const k of city.K) if (Math.abs(alongC - k) < 10) return true; return false; };
      for (const c of city.K) {
        for (let t = -C.HALF + 4; t < C.HALF - 4; t += 6) {
          if (isIntersection(t)) continue;
          dashes.push({ x: c, z: t, rot: 0 });      // vertical road (along Z) at x=c
          dashes.push({ x: t, z: c, rot: Math.PI / 2 }); // horizontal road
        }
      }
      const im = new THREE.InstancedMesh(dashGeo, new THREE.MeshBasicMaterial({ color: 0xd9b96e }), dashes.length);
      const d = new THREE.Object3D();
      dashes.forEach((p, idx) => { d.position.set(p.x, 0.02, p.z); d.rotation.set(0, p.rot, 0); d.scale.set(1, 1, 1); d.updateMatrix(); im.setMatrixAt(idx, d.matrix); });
      im.instanceMatrix.needsUpdate = true; scene.add(im);
    }

    // ----- block slabs + buildings -----
    const special = {};
    const mark = (i, j, type) => { special[i + '_' + j] = type; };
    mark(4, 4, 'park'); mark(2, 3, 'safehouse'); mark(6, 2, 'police');
    mark(2, 6, 'hospital'); mark(6, 6, 'data'); mark(1, 1, 'garage');

    const slabGeo = new THREE.BoxGeometry(1, 0.24, 1);
    const slabMat = lambert(0x8d86a0);
    const slabIM = new THREE.InstancedMesh(slabGeo, slabMat, C.BLOCKS * C.BLOCKS);
    slabIM.receiveShadow = true;
    const texShort = windowTex(4, 5), texMid = windowTex(7, 6), texTall = windowTex(12, 7);
    const mkBMat = (tex) => new THREE.MeshLambertMaterial({ map: tex });
    const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
    const classes = {
      short: { im: new THREE.InstancedMesh(bGeo, mkBMat(texShort), 260), n: 0 },
      mid: { im: new THREE.InstancedMesh(bGeo, mkBMat(texMid), 260), n: 0 },
      tall: { im: new THREE.InstancedMesh(bGeo, mkBMat(texTall), 160), n: 0 },
    };
    const roofGeo = new THREE.BoxGeometry(1, 1, 1); roofGeo.translate(0, 0.5, 0);
    const roofIM = new THREE.InstancedMesh(roofGeo, lambert(0x4e3f55), 680); let roofN = 0;
    const dummy = new THREE.Object3D();
    const PALETTE = [0xf7c4cf, 0xbfe8e0, 0xf3e2b8, 0xcfd8f5, 0xffd9a8, 0xdec9f0, 0xc9ecc4, 0xf5b8a0];
    const tint = new THREE.Color();

    function addBuilding(cx, cz, w, d, h) {
      const cls = h < 15 ? classes.short : (h < 32 ? classes.mid : classes.tall);
      dummy.position.set(cx, 0.12, cz); dummy.rotation.set(0, 0, 0); dummy.scale.set(w, h, d); dummy.updateMatrix();
      cls.im.setMatrixAt(cls.n, dummy.matrix);
      tint.setHex(PALETTE[Math.floor(rng() * PALETTE.length)]);
      cls.im.setColorAt(cls.n, tint);
      cls.n++;
      dummy.position.set(cx, 0.12 + h, cz); dummy.scale.set(w + 0.5, 0.8, d + 0.5); dummy.updateMatrix();
      roofIM.setMatrixAt(roofN, dummy.matrix); roofN++;
      addBox(cx, cz, w, d);
    }

    let slabN = 0;
    for (let i = 0; i < C.BLOCKS; i++) for (let j = 0; j < C.BLOCKS; j++) {
      const bc = GT.blockCenter(i, j);
      const type = special[i + '_' + j] || (i === 8 ? 'beach' : 'normal');
      city.blocks.push({ i, j, x: bc.x, z: bc.z, type });
      // slab (park keeps grass instead)
      if (type !== 'park') {
        dummy.position.set(bc.x, 0, bc.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(46, 1, 46); dummy.updateMatrix();
        slabIM.setMatrixAt(slabN++, dummy.matrix);
      }
      if (type === 'normal' || type === 'beach') {
        const distC = Math.max(Math.abs(i - 4), Math.abs(j - 4));
        const pat = rng();
        const hFor = () => {
          if (type === 'beach') return 9 + rng() * 8;
          const tallP = U.clamp(0.85 - distC * 0.2, 0.05, 0.85);
          const r = rng();
          if (r < tallP * 0.45) return 34 + rng() * 24;
          if (r < tallP) return 16 + rng() * 15;
          return 8 + rng() * 7;
        };
        if (pat < 0.4) {
          addBuilding(bc.x + (rng() - 0.5) * 6, bc.z + (rng() - 0.5) * 6, 22 + rng() * 11, 22 + rng() * 11, hFor());
        } else if (pat < 0.75) {
          for (const sx of [-10.5, 10.5]) for (const sz of [-10.5, 10.5])
            if (rng() < 0.92) addBuilding(bc.x + sx, bc.z + sz, 14 + rng() * 4, 14 + rng() * 4, hFor());
        } else {
          const vert = rng() < 0.5;
          for (const s of [-11, 11]) {
            const w = vert ? 16 + rng() * 3 : 38 + rng() * 3;
            const d = vert ? 38 + rng() * 3 : 16 + rng() * 3;
            addBuilding(bc.x + (vert ? s : 0), bc.z + (vert ? 0 : s), w, d, hFor());
          }
        }
      }
    }
    slabIM.count = slabN;
    for (const k in classes) { const c = classes[k]; c.im.count = c.n; c.im.instanceMatrix.needsUpdate = true; if (c.im.instanceColor) c.im.instanceColor.needsUpdate = true; c.im.castShadow = true; c.im.receiveShadow = true; scene.add(c.im); }
    roofIM.count = roofN; roofIM.instanceMatrix.needsUpdate = true; scene.add(roofIM);
    slabIM.instanceMatrix.needsUpdate = true; scene.add(slabIM);

    // ----- POI buildings -----
    function sign(tex, w, h, x, y, z, ry) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: false }));
      m.position.set(x, y, z); m.rotation.y = ry || 0; scene.add(m); return m;
    }
    function building(x, z, w, h, d, color) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
      m.position.set(x, h / 2 + 0.12, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
      addBox(x, z, w, d); return m;
    }
    // Safehouse — The CoLab
    {
      const p = GT.blockCenter(2, 3);
      building(p.x, p.z - 4, 18, 9, 14, 0x352a55);
      sign(textPanelTex(['THE CoLAB', 'tokens \u00b7 vibes \u00b7 jobs'], { fg: '#ffffff', border: '#ff2e88', glow: '#ff2e88', size: 52 }), 13, 6, p.x, 6, p.z + 3.2, Math.PI);
      building(p.x - 14, p.z + 12, 12, 6, 12, 0x4a3a66);
    }
    // Police HQ + impound
    {
      const p = GT.blockCenter(6, 2);
      building(p.x, p.z + 6, 34, 15, 22, 0x3c4a72);
      sign(textPanelTex(['VIBE CITY P.D.', 'Dept. of Alignment'], { border: '#19e3d1', glow: '#3fa9ff', size: 46 }), 16, 7, p.x, 8.5, p.z - 5.2, Math.PI);
      // impound fence posts
      for (let fx = -20; fx <= 20; fx += 5) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), lambert(0x666e88)); post.position.set(p.x + fx, 1.2, p.z - 22); scene.add(post); }
    }
    // Hospital
    {
      const p = GT.blockCenter(2, 6);
      building(p.x, p.z + 4, 30, 13, 20, 0xf4c9d4);
      sign(textPanelTex(['+ MERCY GENERAL', 'walk-ins & respawns'], { bg: '#fdf3f5', fg: '#d33d63', border: '#d33d63', glow: '#ffffff', size: 42 }), 15, 6.5, p.x, 7, p.z - 6.2, Math.PI);
    }
    // DataCenter
    {
      const p = GT.blockCenter(6, 6);
      building(p.x - 6, p.z + 2, 30, 19, 30, 0x59607a);
      sign(textPanelTex(['DATACENTER \u03a3', '100% organic data'], { bg: '#1a2030', fg: '#9fe3ff', border: '#3fa9ff', glow: '#3fa9ff', size: 48 }), 16, 7, p.x - 6, 11, p.z - 13.2, Math.PI);
    }
    // Garage — FINE-TUNERS compound: shop at the back, open delivery
    // forecourt facing the z=-160 road so mission cars can drive onto the marker.
    {
      const p = GT.blockCenter(1, 1);                              // (-192, -192)
      building(p.x, p.z - 6, 34, 8, 20, 0x6e5a4a);                 // shop, collider z [-208,-188]
      building(p.x - 15, p.z + 12, 4, 3.2, 18, 0x5a4a3e);          // west wing wall
      building(p.x + 15, p.z + 12, 4, 3.2, 18, 0x5a4a3e);          // east wing wall
      // glowing roller door + sign on the forecourt-facing wall (visual only)
      const door = new THREE.Mesh(new THREE.BoxGeometry(11, 5.2, 0.4),
        new THREE.MeshLambertMaterial({ color: 0x2a2018, emissive: 0xff9a3d, emissiveIntensity: 0.22 }));
      door.position.set(p.x, 2.72, p.z + 4.1); scene.add(door);
      sign(textPanelTex(['FINE-TUNERS', 'auto & model shop'], { bg: '#241a14', fg: '#ffd9a0', border: '#ff9a3d', glow: '#ff9a3d', size: 50 }), 15, 5.5, p.x, 6.9, p.z + 4.35, 0);
      // forecourt pad (no collider) — the delivery zone
      const pad = new THREE.Mesh(new THREE.BoxGeometry(26, 0.06, 16), lambert(0xa39bb4));
      pad.position.set(p.x, 0.28, p.z + 12); pad.receiveShadow = true; scene.add(pad);
    }
    // Beach welcome sign
    sign(textPanelTex(['VIBE CITY', 'pop. 7,000,000,000 params'], { size: 52 }), 20, 9, 318, 6, -64, -Math.PI / 2).position.y = 6;
    { const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 6, 6), lambert(0x4a4258)); pole1.position.set(318, 3, -72); scene.add(pole1); const pole2 = pole1.clone(); pole2.position.z = -56; scene.add(pole2); }

    // ----- billboards -----
    const ADS = [
      ['DRINK CONTEXT\u2122', 'now with 1M windows'],
      ['EPOCH ENERGY', 'feel the convergence'],
      ['GRADIENT DESCENT', 'driving school \u2014 downhill fast'],
      ['LOSS LANDSCAPE', 'mini-golf \u00b7 18 local minima'],
      ['ATTENTION!', 'is all you need \u2014 Billboards Inc.'],
      ['MOVE FAST', 'and break priors'],
    ];
    const adSpots = [
      { x: -32, z: -96, ry: 0 }, { x: 96, z: 32, ry: Math.PI / 2 }, { x: -160, z: 96, ry: Math.PI },
      { x: 32, z: -224, ry: 0 }, { x: 224, z: -32, ry: -Math.PI / 2 }, { x: -224, z: 224, ry: Math.PI },
    ];
    adSpots.forEach((s, i) => {
      const tex = textPanelTex(ADS[i % ADS.length], { bg: '#1c1438', size: 44, border: ['#ff2e88', '#19e3d1', '#ff9a3d'][i % 3], glow: '#ffffff' });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 0.5), [lambert(0x222), lambert(0x222), lambert(0x222), lambert(0x222), new THREE.MeshBasicMaterial({ map: tex }), new THREE.MeshBasicMaterial({ map: tex })]);
      panel.position.set(s.x, 10.5, s.z); panel.rotation.y = s.ry; panel.castShadow = true; scene.add(panel);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 7, 8), lambert(0x4a4258));
      pole.position.set(s.x, 3.5, s.z); scene.add(pole);
      addCircle(s.x, s.z, 0.7);
    });

    // ----- park -----
    {
      const grass = new THREE.Mesh(new THREE.BoxGeometry(46, 0.3, 46), lambert(0x2f6b4f));
      grass.position.set(0, 0, 0); grass.receiveShadow = true; scene.add(grass);
      const f1 = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.8, 1, 16), lambert(0x9a93a8)); f1.position.set(0, 0.6, 0); scene.add(f1);
      const f2 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 2.4, 10), lambert(0x9a93a8)); f2.position.set(0, 1.6, 0); scene.add(f2);
      const fw = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.2, 16), new THREE.MeshBasicMaterial({ color: 0x6fd8ff })); fw.position.set(0, 1.05, 0); scene.add(fw);
      addCircle(0, 0, 4);
      for (const b of [[-14, -10], [14, 8], [-8, 16]]) { const bench = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 1.1), lambert(0x7a5a3a)); bench.position.set(b[0], 0.6, b[1]); scene.add(bench); addBox(b[0], b[1], 3.4, 1.1); }
    }

    // ----- palms (instanced) -----
    const palmSpots = [];
    for (let z = -270; z <= 270; z += 15) { palmSpots.push({ x: 300 + (rng() - 0.5) * 3, z: z + (rng() - 0.5) * 6 }); if (rng() < 0.7) palmSpots.push({ x: 322 + (rng() - 0.5) * 12, z: z + 7 + (rng() - 0.5) * 6 }); }
    for (const p of [[-16, -16], [16, -14], [-15, 12], [13, 15], [0, -19], [-19, 0]]) palmSpots.push({ x: p[0], z: p[1] });
    for (let i = 0; i < 14; i++) { const b = U.pick(city.blocks.filter(bl => bl.type === 'normal')); palmSpots.push({ x: b.x + (rng() < 0.5 ? -21 : 21), z: b.z + (rng() - 0.5) * 38 }); }
    {
      const trunkIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.34, 7, 6), lambert(0x8a6a4a), palmSpots.length);
      const frondGeo = new THREE.IcosahedronGeometry(2.3, 0);
      const frondIM = new THREE.InstancedMesh(frondGeo, lambert(0x2e7d4f), palmSpots.length);
      palmSpots.forEach((p, i) => {
        const lean = (rng() - 0.5) * 0.16;
        dummy.position.set(p.x, 3.5, p.z); dummy.rotation.set(lean, rng() * U.TAU, lean); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
        trunkIM.setMatrixAt(i, dummy.matrix);
        dummy.position.set(p.x + lean * 7, 7.2, p.z + lean * 7); dummy.rotation.set(0, rng() * U.TAU, 0); dummy.scale.set(1, 0.5, 1); dummy.updateMatrix();
        frondIM.setMatrixAt(i, dummy.matrix);
        addCircle(p.x, p.z, 0.45);
      });
      trunkIM.instanceMatrix.needsUpdate = true; frondIM.instanceMatrix.needsUpdate = true;
      trunkIM.castShadow = true; frondIM.castShadow = true;
      scene.add(trunkIM); scene.add(frondIM);
    }

    // ----- streetlights (instanced) -----
    {
      const spots = [];
      for (const kx of city.K) for (const kz of city.K) spots.push({ x: kx + 10.6, z: kz + 10.6 });
      const poleIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 5.6, 5), lambert(0x3c3650), spots.length);
      const bulbIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), spots.length);
      spots.forEach((p, i) => {
        dummy.position.set(p.x, 2.8, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); poleIM.setMatrixAt(i, dummy.matrix);
        dummy.position.set(p.x, 5.7, p.z); dummy.updateMatrix(); bulbIM.setMatrixAt(i, dummy.matrix);
        addCircle(p.x, p.z, 0.25);
      });
      poleIM.instanceMatrix.needsUpdate = true; bulbIM.instanceMatrix.needsUpdate = true;
      scene.add(poleIM); scene.add(bulbIM);
    }

    // ----- beach props -----
    for (let i = 0; i < 9; i++) {
      const x = U.lerp(C.SAND_X0 + 12, C.WATER_X - 8, rng()), z = U.lerp(-260, 260, rng());
      const um = new THREE.Mesh(new THREE.ConeGeometry(2, 1.4, 8), lambert([0xff2e88, 0x19e3d1, 0xff9a3d][i % 3]));
      um.position.set(x, 2.2, z); um.rotation.z = 0.12; scene.add(um);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 5), lambert(0xddd5c0)); stick.position.set(x, 1.1, z); scene.add(stick);
      const towel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshBasicMaterial({ color: [0xffe1ec, 0xd2fff8, 0xfff0d8][i % 3] }));
      towel.rotation.x = -Math.PI / 2; towel.position.set(x + 2.2, 0.06, z + 0.6); scene.add(towel);
    }

    // ----- pier + yacht -----
    {
      const P = C.PIER;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(P.x1 - P.x0, 0.4, P.z1 - P.z0), lambert(0xb89a6a));
      deck.position.set((P.x0 + P.x1) / 2, P.deckY - 0.2, 0); deck.receiveShadow = true; scene.add(deck);
      for (let x = P.x0 + 6; x < P.x1; x += 16) for (const z of [P.z0 + 1, P.z1 - 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 3.2, 6), lambert(0x6e573a)); post.position.set(x, 0, z); scene.add(post);
      }
      for (const z of [P.z0 + 0.3, P.z1 - 0.3]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(P.x1 - P.x0, 0.9, 0.18), lambert(0x6e573a));
        rail.position.set((P.x0 + P.x1) / 2, P.deckY + 0.7, z); scene.add(rail);
        addCollider({ x0: P.x0, x1: P.x1, z0: z - 0.4, z1: z + 0.4 });
      }
      addCollider({ x0: P.x1 - 0.5, x1: P.x1 + 0.5, z0: P.z0, z1: P.z1 }); // end rail
      for (const bz of [-2.3, 2.3]) { const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.1, 8), lambert(0xd9b96e)); bol.position.set(P.x0 + 2.5, P.deckY + 0.5, bz); scene.add(bol); addCircle(P.x0 + 2.5, bz, 0.42); }
      // yacht
      const yacht = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(19, 3, 6.4), lambert(0xf4f2ec)); hull.position.y = 1.1; yacht.add(hull);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(3.2, 5, 4), lambert(0xf4f2ec)); bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(11.4, 1.1, 0); yacht.add(bow);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(8, 2.4, 4.6), lambert(0xe8ecf4)); cab.position.set(-2, 3.6, 0); yacht.add(cab);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1, 4.7), new THREE.MeshPhongMaterial({ color: 0x2a3550, shininess: 90 })); glass.position.set(-2, 4.1, 0); yacht.add(glass);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 5), lambert(0xcccccc)); mast.position.set(-7, 6, 0); yacht.add(mast);
      yacht.position.set(GT.POI.yacht.x, 0, GT.POI.yacht.z); yacht.rotation.y = -0.5;
      scene.add(yacht); city.yacht = yacht;
    }

    // ----- perimeter hedges -----
    function hedge(cx, cz, w, d) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, d), lambert(0x23433a));
      m.position.set(cx, 1.2, cz); scene.add(m); addBox(cx, cz, w, d);
    }
    hedge(-C.HALF - 11, 0, 3, 620);                              // west
    hedge((-C.HALF + C.WATER_X) / 2 - 6, -C.HALF - 11, C.WATER_X + C.HALF + 14, 3);  // north (z = -)
    hedge((-C.HALF + C.WATER_X) / 2 - 6, C.HALF + 11, C.WATER_X + C.HALF + 14, 3);   // south

    // ----- parked car spots (deterministic) -----
    for (let n = 0; n < C.PARKED_COUNT; n++) {
      const vert = rng() < 0.5;
      const c = city.K[1 + Math.floor(rng() * (city.K.length - 2))];
      let t = U.lerp(-C.HALF + 14, C.HALF - 14, rng());
      const kNear = GT.roadC(GT.roadK(t));
      if (Math.abs(t - kNear) < 13) t = kNear + 15 * (t > kNear ? 1 : -1);
      const side = rng() < 0.5 ? 1 : -1;
      const off = c + side * (C.ROAD_W / 2 - 2.0);
      city.parkedSpots.push(vert
        ? { x: off, z: t, h: side > 0 ? 0 : Math.PI }
        : { x: t, z: off, h: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
    }
    // impound + data truck spots are mission cars (entities spawns them)

    // ----- compute orbs (deterministic spots) -----
    const orbRng = U.seeded(1337);
    const goodBlocks = city.blocks.filter(b => b.type === 'normal' || b.type === 'beach');
    for (let n = 0; n < 18; n++) {
      const b = goodBlocks[Math.floor(orbRng() * goodBlocks.length)];
      const side = Math.floor(orbRng() * 4);
      const o = 21.8, t = (orbRng() - 0.5) * 40;
      const p = side === 0 ? { x: b.x + t, z: b.z - o } : side === 1 ? { x: b.x + o, z: b.z + t } : side === 2 ? { x: b.x + t, z: b.z + o } : { x: b.x - o, z: b.z + t };
      city.orbSpots.push(p);
    }
    for (const p of [[-10, -6], [8, 10], [0, 17], [16, -4]]) city.orbSpots.push({ x: p[0], z: p[1] });
    city.orbSpots.push({ x: 330, z: 120 }, { x: 340, z: -180 }, { x: 410, z: 0, y: C.PIER.deckY });
    GT.state.orbsTotal = city.orbSpots.length;

    // ----- bake minimap -----
    bakeMap();
  };

  // ---------- minimap prerender ----------
  function bakeMap() {
    const minX = -312, maxX = 478, minZ = -312, maxZ = 312;
    const scale = 1024 / (maxX - minX);
    const H = Math.ceil((maxZ - minZ) * scale);
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = H;
    const g = cv.getContext('2d');
    const X = (x) => (x - minX) * scale, Z = (z) => (z - minZ) * scale;
    g.fillStyle = '#14306b'; g.fillRect(0, 0, cv.width, cv.height);                      // water
    g.fillStyle = '#d8c08a'; g.fillRect(0, Z(-300), X(C.WATER_X) - 0, (600) * scale);    // sand strip background (will overdraw west)
    g.fillStyle = '#48425a'; g.fillRect(0, 0, X(C.SAND_X0), cv.height);                  // asphalt city base
    for (const b of city.blocks) {
      const colors = { normal: '#7d7694', beach: '#9a8fae', park: '#2f6b4f', safehouse: '#8a4fd0', police: '#3c5aa0', hospital: '#d77b97', data: '#5a6680', garage: '#8a6a4a' };
      g.fillStyle = colors[b.type] || '#7d7694';
      g.fillRect(X(b.x - 23), Z(b.z - 23), 46 * scale, 46 * scale);
    }
    // pier
    g.fillStyle = '#b89a6a'; g.fillRect(X(C.PIER.x0), Z(C.PIER.z0), (C.PIER.x1 - C.PIER.x0) * scale, (C.PIER.z1 - C.PIER.z0) * scale);
    city.mapInfo = { canvas: cv, scale, minX, minZ };
  }

  // ---------- spatial / world queries ----------
  city.onPier = (x, z) => x > C.PIER.x0 && x < C.PIER.x1 + 2 && z > C.PIER.z0 && z < C.PIER.z1;
  city.isWater = (x, z) => x > C.WATER_X && !city.onPier(x, z);
  city.groundY = (x, z) => city.onPier(x, z) ? C.PIER.deckY : 0;
  city.randomRoadPoint = () => {
    const vert = Math.random() < 0.5;
    const c = U.pick(city.K);
    const t = U.rand(-C.HALF + 6, C.HALF - 6);
    return vert ? { x: c, z: t, axis: 'z' } : { x: t, z: c, axis: 'x' };
  };
  city.randomSidewalkPoint = () => {
    const b = U.pick(city.blocks);
    const side = U.randi(0, 3), o = 21.6, t = U.rand(-20, 20);
    if (side === 0) return { x: b.x + t, z: b.z - o };
    if (side === 1) return { x: b.x + o, z: b.z + t };
    if (side === 2) return { x: b.x + t, z: b.z + o };
    return { x: b.x - o, z: b.z + t };
  };
  city.nearestRoad = (x, z) => {
    let best = null, bd = 1e9;
    for (const c of city.K) {
      const dx = Math.abs(x - c); if (dx < bd) { bd = dx; best = { axis: 'z', c, d: dx }; }
      const dz = Math.abs(z - c); if (dz < bd) { bd = dz; best = { axis: 'x', c, d: dz }; }
    }
    return best;
  };

  return city;
})();

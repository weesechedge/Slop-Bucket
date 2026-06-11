/* ============================================================
   GRAND THEFT TOKENS VI — hud.js
   DOM + canvas HUD: rotating minimap with health arcs and
   blips, token counter, wanted stars, objective/timer line,
   toast queue, letterbox dialog, WASTED/BUSTED splashes,
   title / pause / credits screens.
   ============================================================ */
GT.hud = (function () {
  const U = GT.U, C = GT.C;
  const hud = { dialogActive: false };
  let el = {};
  let toasts = [];
  let splashT = 0, creditsT = 0;
  let dlg = null;
  let mapCtx = null, mapSize = 150, dpr = 1;

  function $(id) { return document.getElementById(id); }

  hud.init = function () {
    ['title', 'titleStart', 'pause', 'pauseTip', 'hud', 'tokens', 'stars', 'objective', 'timer',
      'minimap', 'toasts', 'dialog', 'dlgName', 'dlgText', 'dlgHint', 'splash', 'hurt',
      'credits', 'creditsInner', 'helpPanel'].forEach(id => { el[id] = $(id); });
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (el.minimap) {
      mapSize = el.minimap.clientWidth || 150;
      el.minimap.width = mapSize * dpr; el.minimap.height = mapSize * dpr;
      mapCtx = el.minimap.getContext('2d');
    }
  };

  // ---------- basic setters ----------
  hud.setObjective = function (t) { if (el.objective) el.objective.textContent = t || ''; };
  hud.setTimer = function (sec) {
    if (!el.timer) return;
    if (sec == null) { el.timer.textContent = ''; el.timer.classList.remove('urgent'); return; }
    sec = Math.max(0, sec);
    const m = Math.floor(sec / 60), s = sec % 60;
    el.timer.textContent = m > 0 ? m + ':' + (s < 10 ? '0' : '') + Math.floor(s) : s.toFixed(1);
    el.timer.classList.toggle('urgent', sec < 10);
  };

  hud.toast = function (text) {
    if (!el.toasts) return;
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = text;
    el.toasts.appendChild(d);
    toasts.push({ d, t: 4.2 });
    if (toasts.length > 4) { const old = toasts.shift(); old.d.remove(); }
  };

  hud.splash = function (text, color) {
    if (!el.splash) return;
    el.splash.textContent = text;
    el.splash.style.color = color || '#ffd27a';
    el.splash.classList.remove('show');
    void el.splash.offsetWidth; // restart animation
    el.splash.classList.add('show');
    splashT = 2.4;
  };

  hud.wastedFx = function (on) { document.body.classList.toggle('wasted', !!on); };

  // ---------- dialog ----------
  hud.dialog = function (lines, onDone) {
    dlg = { lines, i: 0, onDone };
    hud.dialogActive = true;
    GT.state.mode = 'dialog';
    el.dialog.classList.add('show');
    showLine();
  };
  function showLine() {
    const [name, text] = dlg.lines[dlg.i];
    el.dlgName.textContent = name;
    el.dlgText.textContent = text;
    el.dlgHint.textContent = (dlg.i < dlg.lines.length - 1 ? '\u25b8 ' : '\u25a0 ') + 'tap / SPACE';
  }
  hud.advanceDialog = function () {
    if (!dlg) return;
    GT.audio.sfx.blip();
    dlg.i++;
    if (dlg.i >= dlg.lines.length) {
      el.dialog.classList.remove('show');
      hud.dialogActive = false;
      GT.state.mode = 'play';
      const done = dlg.onDone; dlg = null;
      if (done) done();
    } else showLine();
  };

  // ---------- screens ----------
  hud.hideTitle = function () { if (el.title) el.title.classList.add('hide'); if (el.hud) el.hud.classList.add('show'); };
  hud.showPause = function (on) {
    if (!el.pause) return;
    el.pause.classList.toggle('show', on);
    if (on && el.pauseTip) el.pauseTip.textContent = U.pick(GT.TIPS);
  };
  hud.toggleHelp = function () { if (el.helpPanel) el.helpPanel.classList.toggle('show'); };
  hud.credits = function (lines) {
    GT.state.mode = 'credits';
    el.creditsInner.innerHTML = '';
    for (const ln of lines) {
      const d = document.createElement('div');
      d.className = ln === lines[0] ? 'cr-title' : 'cr-line';
      d.textContent = ln || '\u00a0';
      el.creditsInner.appendChild(d);
    }
    el.credits.classList.add('show');
    el.creditsInner.style.animation = 'none';
    void el.creditsInner.offsetWidth;
    const dur = 6 + lines.length * 1.1;
    el.creditsInner.style.animation = 'crScroll ' + dur + 's linear forwards';
    creditsT = dur + 1;
  };
  hud.endCredits = function () {
    el.credits.classList.remove('show');
    if (GT.state.mode === 'credits') GT.state.mode = 'play';
    creditsT = 0;
  };

  // ---------- minimap ----------
  const POI_BLIPS = [
    ['safehouse', '#b14aff'], ['hospital', '#ff7ea0'], ['policeHQ', '#3fa9ff'],
    ['dataCenter', '#19e3d1'], ['garage', '#ff9a3d'],
  ];
  function drawMap() {
    if (!mapCtx || !GT.city.mapInfo) return;
    const st = GT.state, p = st.player;
    const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
    const h = p.car ? p.car.h : p.h;
    const g = mapCtx, S = mapSize * dpr, cx = S / 2, cy = S / 2, R = S / 2 - 5 * dpr;
    const k = 0.78 * dpr; // px per world unit
    const ch = Math.cos(h), sh = Math.sin(h);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(cx, cy, R, 0, U.TAU); g.clip();
    g.fillStyle = '#0d1226'; g.fillRect(0, 0, S, S);
    // baked city image, rotated so "up" = facing
    const mi = GT.city.mapInfo;
    g.translate(cx, cy);
    g.transform(-ch, -sh, sh, -ch, 0, 0); // pure rotation: facing maps to screen-up
    g.scale(k, k);
    g.translate(-px, -pz);
    g.drawImage(mi.canvas, mi.minX, mi.minZ, mi.canvas.width / mi.scale, mi.canvas.height / mi.scale);
    g.restore();

    // dynamic blips (manual transform, clamped to rim)
    function w2s(wx, wz) {
      const dx = wx - px, dz = wz - pz;
      return { x: (-dx * ch + dz * sh) * k + cx, y: (-dx * sh - dz * ch) * k + cy };
    }
    function blip(wx, wz, color, r, clampRim, shape) {
      let s = w2s(wx, wz);
      const dx = s.x - cx, dy = s.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > R - 6 * dpr) {
        if (!clampRim) return;
        const f = (R - 6 * dpr) / d;
        s = { x: cx + dx * f, y: cy + dy * f };
      }
      g.fillStyle = color;
      if (shape === 'sq') g.fillRect(s.x - r, s.y - r, r * 2, r * 2);
      else { g.beginPath(); g.arc(s.x, s.y, r, 0, U.TAU); g.fill(); }
    }
    g.save();
    for (const [key, col] of POI_BLIPS) blip(GT.POI[key].x, GT.POI[key].z, col, 3 * dpr, false, 'sq');
    for (const mk of st.markers) {
      if (mk.blip === 'none' || !mk.mesh.visible) continue;
      blip(mk.x, mk.z, '#' + mk.color.toString(16).padStart(6, '0'), 3.6 * dpr, true);
    }
    if (st.stars > 0) {
      for (const v of st.vehicles) if (v.isPolice && !v.dead) blip(v.x, v.z, '#ff4d5e', 2.6 * dpr, false);
      for (const o of st.officers) blip(o.x, o.z, '#ff4d5e', 2 * dpr, false);
    }
    g.restore();

    // player triangle (always center, pointing up)
    g.save();
    g.translate(cx, cy);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#101426'; g.lineWidth = 1.5 * dpr;
    g.beginPath();
    g.moveTo(0, -6 * dpr); g.lineTo(4.4 * dpr, 5 * dpr); g.lineTo(-4.4 * dpr, 5 * dpr); g.closePath();
    g.fill(); g.stroke();
    g.restore();

    // health arc(s) around the rim
    function arc(frac, radius, color, w) {
      g.beginPath();
      g.lineWidth = w; g.strokeStyle = color; g.lineCap = 'round';
      g.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + frac * U.TAU);
      g.stroke();
    }
    g.beginPath(); g.lineWidth = 4 * dpr; g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.arc(cx, cy, R + 2 * dpr, 0, U.TAU); g.stroke();
    const hp = U.clamp(p.health / 100, 0, 1);
    arc(hp, R + 2 * dpr, hp > 0.5 ? '#4fe08a' : hp > 0.25 ? '#ffd24a' : '#ff4d5e', 4 * dpr);
    if (p.car && !p.car.dead) {
      const chp = U.clamp(p.car.health / 100, 0, 1);
      arc(chp, R - 3 * dpr, '#6fc3ff', 2.5 * dpr);
    }
  }

  // ---------- per-frame ----------
  let lastTokens = -1, lastStars = -1;
  hud.update = function (rawDt) {
    const st = GT.state;
    if (st.tokens !== lastTokens && el.tokens) { lastTokens = st.tokens; el.tokens.textContent = '\u26c1 ' + U.fmt(st.tokens); }
    if (st.stars !== lastStars && el.stars) {
      lastStars = st.stars;
      let s = '';
      for (let i = 0; i < 5; i++) s += i < st.stars ? '\u2605' : '\u2606';
      el.stars.textContent = s;
      el.stars.classList.toggle('hot', st.stars > 0);
    }
    for (let i = toasts.length - 1; i >= 0; i--) {
      const t = toasts[i];
      t.t -= rawDt;
      if (t.t < 1) t.d.style.opacity = Math.max(0, t.t);
      if (t.t <= 0) { t.d.remove(); toasts.splice(i, 1); }
    }
    if (splashT > 0) { splashT -= rawDt; if (splashT <= 0) el.splash.classList.remove('show'); }
    if (creditsT > 0) { creditsT -= rawDt; if (creditsT <= 0) hud.endCredits(); }
    if (st.mode === 'play' || st.mode === 'dialog') drawMap();
  };

  return hud;
})();

/* 全屏特效画布：金色水纹、船尾航迹、墨晕、金粉。没有东西要画时自动停下，省电。 */
(function (NV) {
  const { clamp, rand } = NV;
  const COLORS = {
    gold: [226, 194, 128],
    pale: [244, 234, 212],
    ink: [6, 16, 22],
    warm: [255, 214, 150],
  };
  let cv, ctx, dpr = 1, W = 0, H = 0;
  let ripples = [], puffs = [], motes = [];
  const trails = new Map();
  let running = false, last = 0;
  const fx = { enabled: true };

  fx.init = () => {
    cv = document.getElementById('fx');
    ctx = cv.getContext('2d');
    resize();
    addEventListener('resize', resize);
    if (NV.finePointer && !NV.reduced) ambient();
  };

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, NV.isMobile() ? 1.5 : 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function wake() {
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }

  /* 一圈水纹。opts: r0 r1 life alpha width color squash delay */
  fx.ripple = (x, y, o = {}) => {
    ripples.push({
      x, y,
      r0: o.r0 ?? 2, r1: o.r1 ?? 60, life: o.life ?? 2.2, age: -(o.delay ?? 0),
      alpha: o.alpha ?? 0.55, width: o.width ?? 1.1, col: COLORS[o.color || 'gold'],
      squash: o.squash ?? 0.62, ph: rand(0, 6.28), ph2: rand(0, 6.28), rings: o.rings ?? 1,
    });
    wake();
  };

  /* 船尾两道细金线：每帧给某条船报一次位置 */
  fx.trail = (id, x, y, ang, o = {}) => {
    let t = trails.get(id);
    if (!t) { t = { pts: [], col: COLORS[o.color || 'gold'], spread: o.spread ?? 26, life: o.life ?? 2.4, alpha: o.alpha ?? 0.7 }; trails.set(id, t); }
    const p = t.pts[t.pts.length - 1];
    if (!p || Math.hypot(p.x - x, p.y - y) > 3) t.pts.push({ x, y, a: ang, age: 0 });
    wake();
  };
  fx.clearTrail = (id) => trails.delete(id);

  fx.ink = (x, y, o = {}) => {
    puffs.push({ x, y, r0: o.r0 ?? 6, r1: o.r1 ?? rand(40, 70), life: o.life ?? 1.8, age: 0, alpha: o.alpha ?? 0.09, col: COLORS[o.color || 'ink'] });
    wake();
  };

  /* 金粉：缓慢上升、闪烁、消散 */
  fx.motes = (x, y, n = 20, o = {}) => {
    for (let i = 0; i < n; i++) {
      motes.push({
        x: x + rand(-1, 1) * (o.spread ?? 60), y: y + rand(-1, 1) * (o.spread ?? 60) * 0.4,
        vx: rand(-8, 8), vy: -rand(10, 38), life: rand(2.2, 4.5), age: -rand(0, o.stagger ?? 0.6),
        size: rand(0.6, 1.8), tw: rand(0, 6.28),
      });
    }
    wake();
  };

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    drawPuffs(dt);
    drawTrails(dt);
    drawRipples(dt);
    drawMotes(dt);
    if (ripples.length || puffs.length || motes.length || trails.size) requestAnimationFrame(loop);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }

  function drawRipples(dt) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.age += dt;
      if (r.age < 0) continue;
      const t = r.age / r.life;
      if (t >= 1) { ripples.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - t, 2.2);
      for (let k = 0; k < r.rings; k++) {
        const kt = clamp(e - k * 0.18, 0, 1);
        if (kt <= 0) continue;
        const rad = r.r0 + (r.r1 - r.r0) * kt;
        const a = r.alpha * Math.pow(1 - t, 1.4) * (k ? 0.55 : 1);
        ctx.strokeStyle = `rgba(${r.col[0]},${r.col[1]},${r.col[2]},${a.toFixed(3)})`;
        ctx.lineWidth = r.width * (1 - t * 0.5);
        ctx.beginPath();
        const N = 44;
        for (let j = 0; j <= N; j++) {
          const th = (j / N) * Math.PI * 2;
          const wob = 1 + 0.035 * Math.sin(3 * th + r.ph + t * 2) + 0.02 * Math.sin(5 * th + r.ph2);
          const px = r.x + Math.cos(th) * rad * wob;
          const py = r.y + Math.sin(th) * rad * wob * r.squash;
          j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
    }
  }

  function drawTrails(dt) {
    trails.forEach((t, id) => {
      t.pts.forEach((p) => (p.age += dt));
      while (t.pts.length && t.pts[0].age > t.life) t.pts.shift();
      if (t.pts.length < 2) { if (!t.pts.length) trails.delete(id); return; }
      for (const side of [-1, 1]) {
        for (let i = 1; i < t.pts.length; i++) {
          const a = t.pts[i - 1], b = t.pts[i];
          const fa = a.age / t.life, fb = b.age / t.life;
          const oa = 5 + Math.sqrt(fa) * t.spread, ob = 5 + Math.sqrt(fb) * t.spread;
          const nax = -Math.sin(a.a) * side, nay = Math.cos(a.a) * side;
          const nbx = -Math.sin(b.a) * side, nby = Math.cos(b.a) * side;
          const alpha = t.alpha * Math.pow(1 - fa, 1.6) * clamp(a.age * 6);
          ctx.strokeStyle = `rgba(${t.col[0]},${t.col[1]},${t.col[2]},${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x + nax * oa, a.y + nay * oa);
          ctx.lineTo(b.x + nbx * ob, b.y + nby * ob);
          ctx.stroke();
        }
      }
    });
  }

  function drawPuffs(dt) {
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) { puffs.splice(i, 1); continue; }
      const rad = p.r0 + (p.r1 - p.r0) * (1 - Math.pow(1 - t, 3));
      const a = p.alpha * Math.sin(Math.PI * Math.min(1, t * 1.6 + 0.05)) * (1 - t);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      g.addColorStop(0, `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${a.toFixed(3)})`);
      g.addColorStop(0.6, `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${(a * 0.45).toFixed(3)})`);
      g.addColorStop(1, `rgba(${p.col[0]},${p.col[1]},${p.col[2]},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawMotes(dt) {
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.age += dt;
      if (m.age < 0) continue;
      const t = m.age / m.life;
      if (t >= 1) { motes.splice(i, 1); continue; }
      m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 0.99;
      const a = Math.sin(Math.PI * t) * (0.55 + 0.45 * Math.sin(m.age * 7 + m.tw));
      ctx.fillStyle = `rgba(240,212,150,${(a * 0.9).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* 鼠标经过：水面泛起涟漪，山水间晕开一点墨 */
  function ambient() {
    let lx = 0, ly = 0, lt = 0;
    addEventListener('pointermove', (e) => {
      if (!fx.enabled || document.body.classList.contains('is-quiet')) return;
      const now = performance.now();
      const d = Math.hypot(e.clientX - lx, e.clientY - ly);
      if (now - lt < 90 || d < 14) return;
      lx = e.clientX; ly = e.clientY; lt = now;
      if (e.target.closest && e.target.closest('button, a, .jian, .envelope')) return;
      if (e.clientY > NV.world.horizonY() + 8) {
        fx.ripple(e.clientX, e.clientY, { r1: rand(26, 46), life: 1.8, alpha: 0.28, color: 'pale', width: 0.9 });
      } else {
        fx.ink(e.clientX, e.clientY);
      }
    }, { passive: true });
  }

  NV.fx = fx;
})(window.NV);

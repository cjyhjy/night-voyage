/* 第七幕「相逢」：两艘小舟走在不同的航线上，慢慢靠近，交汇成一条 */
(function (NV) {
  const { $, $$, el, clamp } = NV;
  const C = window.CONTENT.meeting;
  const M = window.CONTENT.meta;
  const mt = {};
  let svg, stage, pA, pB, pT, gA, gB, gT, boatA, boatB, lenA, lenB, lenT, L = 120;
  const state = { a: 0, t: 0 };
  let met = false, lastRing = 0;

  function paths(W, H) {
    const tall = NV.portrait();
    const m = tall ? [0.5 * W, 0.78 * H] : [0.6 * W, 0.74 * H];
    const A = tall
      ? `M${-0.15 * W} ${0.5 * H} C${0.35 * W} ${0.52 * H} ${0.05 * W} ${0.74 * H} ${m[0]} ${m[1]}`
      : `M${-0.06 * W} ${0.52 * H} C${0.18 * W} ${0.48 * H} ${0.3 * W} ${0.7 * H} ${m[0]} ${m[1]}`;
    const B = tall
      ? `M${-0.15 * W} ${1.02 * H} C${0.25 * W} ${0.98 * H} ${0.15 * W} ${0.78 * H} ${m[0]} ${m[1]}`
      : `M${-0.06 * W} ${0.98 * H} C${0.2 * W} ${0.98 * H} ${0.36 * W} ${0.78 * H} ${m[0]} ${m[1]}`;
    const T = tall
      ? `M${m[0]} ${m[1]} C${0.62 * W} ${0.78 * H} ${0.7 * W} ${0.7 * H} ${0.78 * W} ${0.64 * H}`
      : `M${m[0]} ${m[1]} C${0.7 * W} ${0.74 * H} ${0.78 * W} ${0.66 * H} ${0.86 * W} ${0.6 * H}`;
    return { A, B, T, m };
  }

  function build() {
    stage = $('#meeting .stage');
    svg = $('.routes');
    const mk = (cls) => { const p = NV.svg('path', { class: cls }); svg.appendChild(p); return p; };
    gA = mk('route-glow'); gB = mk('route-glow'); gT = mk('route-glow');
    pA = mk('route'); pB = mk('route'); pT = mk('route');
    boatA = NV.boat.create({ canopy: true, lantern: true });
    boatB = NV.boat.create({ canopy: false, lantern: true });
    [boatA, boatB].forEach((b) => { b.style.position = 'absolute'; b.style.left = b.style.top = '0'; b.style.transformOrigin = '58.33% 50%'; stage.appendChild(b); });

    const box = $('.meeting-lines');
    C.lines.forEach((g) => {
      const d = el('div', 'group');
      g.forEach((l) => d.appendChild(el('p', '', l)));
      box.appendChild(d);
    });
    if (M.metOn) {
      const d0 = new Date(M.metOn + 'T00:00:00');
      if (!isNaN(d0)) {
        const days = Math.floor((Date.now() - d0) / 864e5) + 1;
        $('.meeting-days').innerHTML = `${M.metLabel}<b>${days}</b>天`;
      }
    }
  }

  function layout() {
    const W = innerWidth, H = innerHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const P = paths(W, H);
    [[pA, gA, P.A], [pB, gB, P.B], [pT, gT, P.T]].forEach(([p, g, d]) => { p.setAttribute('d', d); g.setAttribute('d', d); });
    lenA = pA.getTotalLength(); lenB = pB.getTotalLength(); lenT = pT.getTotalLength();
    L = clamp(Math.min(W, H) * 0.15, 70, 140);
    [boatA, boatB].forEach((b) => { b.style.width = L * 1.5 + 'px'; b.style.height = L * 0.48 + 'px'; });
    render();
  }

  function at(path, len, t) {
    const d = clamp(t) * len;
    const p = path.getPointAtLength(d), q = path.getPointAtLength(Math.min(len, d + 2)), o = path.getPointAtLength(Math.max(0, d - 2));
    return { x: p.x, y: p.y, a: Math.atan2(q.y - o.y, q.x - o.x) };
  }

  function place(b, p, off, id, moving) {
    const nx = -Math.sin(p.a), ny = Math.cos(p.a);
    const x = p.x + nx * off, y = p.y + ny * off;
    const bw = L * 1.5, bh = L * 0.48;
    b.style.transform = `translate(${x - bw * 0.5833}px, ${y - bh * 0.5}px) rotate(${p.a}rad) scale(.82)`;
    if (moving) {
      const r = stage.getBoundingClientRect();
      NV.fx.trail(id, r.left + x + Math.cos(p.a) * L * 0.3, r.top + y + Math.sin(p.a) * L * 0.3, p.a, { spread: L * 0.22, life: 2, alpha: 0.6 });
    }
  }

  let prev = { a: -1, t: -1 };
  function render() {
    const moving = Math.abs(state.a - prev.a) + Math.abs(state.t - prev.t) > 0.0005 && stage.getBoundingClientRect().top <= 1;
    prev = { a: state.a, t: state.t };
    // 航线只画到船走过的地方
    const show = (p, g, len, t) => { const off = len * (1 - clamp(t)); [p, g].forEach((e) => { e.style.strokeDasharray = len; e.style.strokeDashoffset = off; }); };
    show(pA, gA, lenA, state.a); show(pB, gB, lenB, state.a); show(pT, gT, lenT, state.t);
    if (state.t <= 0) {
      place(boatA, at(pA, lenA, state.a), 0, 'mA', moving);
      place(boatB, at(pB, lenB, state.a), 0, 'mB', moving);
    } else {
      const p = at(pT, lenT, state.t);
      const gap = Math.min(1, state.t * 6) * L * 0.2;
      place(boatA, p, -gap, 'mA', moving);
      place(boatB, p, gap, 'mB', moving);
    }
    const vis = state.a > 0.001 ? 1 : 0;
    boatA.style.opacity = boatB.style.opacity = vis;
    if (state.a >= 0.999 && !met) {
      met = true;
      const r = stage.getBoundingClientRect(), m = at(pA, lenA, 1);
      NV.fx.ripple(r.left + m.x, r.top + m.y, { r1: Math.max(innerWidth, innerHeight) * 0.45, rings: 3, life: 4.5, alpha: 0.6, width: 1.3 });
      NV.fx.motes(r.left + m.x, r.top + m.y - 20, 30, { spread: 50 });
      NV.sound.chime(3);
    }
    if (state.a < 0.95) met = false;
    if (moving && performance.now() - lastRing > 900) {
      lastRing = performance.now();
      const r = stage.getBoundingClientRect();
      [boatA, boatB].forEach((b) => {
        const br = b.getBoundingClientRect();
        NV.fx.ripple(br.left + br.width * 0.3, br.top + br.height / 2, { r1: L * 0.5, alpha: 0.35, life: 2.2, color: 'pale' });
      });
      void r;
    }
  }

  mt.init = () => {
    build();
    layout();
    addEventListener('resize', layout);
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#meeting', start: 'top top', end: 'bottom bottom', scrub: 1 },
      onUpdate: render,
    });
    tl.fromTo(state, { a: 0 }, { a: 1, duration: 58, ease: 'none' }, 4)
      .fromTo(state, { t: 0 }, { t: 1, duration: 34, ease: 'none' }, 62);
    const groups = $$('.meeting-lines .group');
    const starts = [2, 16, 30, 44, 68];
    groups.forEach((g, i) => {
      const ps = $$('p', g), s = starts[i] ?? 2 + i * 14;
      tl.fromTo(ps, { opacity: 0, y: 16, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 3.5, stagger: 2.5 }, s);
      if (i < groups.length - 1) tl.to(ps, { opacity: 0, filter: 'blur(8px)', duration: 3 }, (starts[i + 1] ?? s + 14) - 4);
    });
    tl.fromTo('.meeting-days', { opacity: 0 }, { opacity: 1, duration: 4 }, 84)
      .to({}, { duration: 4 }, 96);
  };

  NV.meeting = mt;
})(window.NV);

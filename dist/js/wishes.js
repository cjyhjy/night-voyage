/* 第六幕「愿」：夜色转向黎明。最后湖上四盏河灯，由她亲手点亮、许愿 */
(function (NV) {
  const { $, $$, el, rand } = NV;
  const C = window.CONTENT.wishes;
  const L = C.lantern;
  const w = {};
  let lanterns = [], lit = 0, finished = false;

  function lanternSVG(i) {
    const svg = NV.svg('svg', { viewBox: '0 0 100 110' });
    const petal = 'M50 84 C37 72 39 52 50 38 C61 52 63 72 50 84Z';
    svg.innerHTML = `
      <ellipse cx="50" cy="85" rx="36" ry="6" fill="#203038" stroke="rgba(201,169,106,.5)" stroke-width=".8"/>
      <path d="M22 86 Q36 80 50 86 Q64 80 78 86" fill="none" stroke="rgba(201,169,106,.35)" stroke-width=".8"/>
      ${[-64, -34, 34, 64].map((a) => `<path class="l-petal" d="${petal}" transform="rotate(${a} 50 84)"/>`).join('')}
      <path class="l-petal in" d="${petal}" transform="rotate(-14 50 84)"/>
      <path class="l-petal in" d="${petal}" transform="rotate(14 50 84)"/>
      <path class="l-petal" d="${petal}"/>
      <path class="l-flame" d="M50 34 C46 40 46 45 50 47 C54 45 54 40 50 34Z" fill="#fff1c4"/>`;
    return svg;
  }

  function build() {
    $('.wish-title').textContent = C.title;
    const box = $('.wish-lines');
    C.lines.forEach((g) => {
      const d = el('div', 'wish-line');
      g.forEach((l) => d.appendChild(el('p', '', l)));
      box.appendChild(d);
    });
    $('.wish-final p').textContent = C.final;
    $('.lantern-intro').textContent = L.intro;
    NV.text($('.lantern-sub'), L.sub);
    const row = $('.lantern-row');
    lanterns = L.items.map((it, i) => {
      const b = el('button', 'lantern');
      b.type = 'button';
      b.setAttribute('aria-label', `${it.label}：${it.hint}`);
      b.appendChild(el('i', 'lantern-halo'));
      b.appendChild(lanternSVG(i));
      b.appendChild(el('span', 'lantern-label', it.label));
      b.appendChild(el('span', 'lantern-hint', it.hint));
      b.addEventListener('click', () => light(i));
      row.appendChild(b);
      return b;
    });
    const done = $('.lantern-done');
    L.done.forEach((l) => done.appendChild(el('p', '', l)));
    status();
  }

  function status() {
    $('.lantern-status').textContent = lit && lit < lanterns.length ? L.progress.replace('{n}', lanterns.length - lit) : '';
  }

  function center(elm, fy = 0.75) {
    const r = elm.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * fy };
  }

  function light(i) {
    const b = lanterns[i];
    if (finished || b.classList.contains('lit')) return;
    b.classList.add('lit');
    $('.lantern-hint', b).textContent = L.lit;
    lit++;
    const p = center(b, 0.62);
    NV.fx.ripple(p.x, p.y + 20, { r1: 110, rings: 3, alpha: 0.6, life: 3, color: 'warm' });
    NV.fx.motes(p.x, p.y - 20, 14, { spread: 24 });
    NV.sound.chime(i * 2);
    gsap.fromTo($('svg', b), { y: 0 }, { y: -6, duration: 0.5, yoyo: true, repeat: 1, ease: 'sine.inOut' });
    status();
    if (lit === lanterns.length) setTimeout(celebrate, 900);
  }

  /* 金色墨梅：一朵花从中心绽开，停一会儿，花瓣随风散去 */
  function bloom(x, y, size, delay) {
    const svg = NV.svg('svg', { viewBox: '-50 -50 100 100', class: 'gold-bloom' });
    Object.assign(svg.style, { left: x - size / 2 + 'px', top: y - size / 2 + 'px', width: size + 'px', height: size + 'px' });
    const id = 'gg' + Math.random().toString(36).slice(2, 7);
    svg.innerHTML = `<defs><radialGradient id="${id}"><stop offset="0" stop-color="#fff3cf"/><stop offset=".6" stop-color="#e6c27e"/><stop offset="1" stop-color="#b98d4a" stop-opacity=".85"/></radialGradient></defs>`;
    const petals = NV.blossomPaths().map((p) => {
      const e = NV.svg('ellipse', { cx: p.cx.toFixed(1), cy: p.cy.toFixed(1), rx: 13, ry: 16, transform: `rotate(${p.rot.toFixed(0)} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)})`, fill: `url(#${id})`, stroke: 'rgba(255,236,190,.9)', 'stroke-width': '.6' });
      svg.appendChild(e);
      return e;
    });
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      svg.appendChild(NV.svg('line', { x1: 0, y1: 0, x2: (Math.cos(a) * 11).toFixed(1), y2: (Math.sin(a) * 11).toFixed(1), stroke: '#fff1c8', 'stroke-width': '.7' }));
    }
    svg.appendChild(NV.svg('circle', { r: 3, fill: '#fff6dc' }));
    document.body.appendChild(svg);
    gsap.timeline({ delay, onComplete: () => svg.remove() })
      .fromTo(svg, { scale: 0, rotation: -40, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 1.6, ease: 'back.out(1.6)' })
      .to(petals, {
        x: () => rand(-60, 60), y: () => rand(30, 120), rotation: () => rand(-180, 180), opacity: 0,
        duration: 3.5, stagger: 0.15, ease: 'sine.in', transformOrigin: 'center',
      }, '+=1.6')
      .to(svg, { opacity: 0, duration: 1.5 }, '-=2');
  }

  function celebrate() {
    finished = true;
    status();
    NV.sound.bloom();
    NV.world.flash();
    const W = innerWidth, H = innerHeight;
    const pts = lanterns.map((b) => center(b, 0.62));
    // 一圈一圈的金色水纹，铺满整个湖面
    pts.forEach((p, i) => {
      NV.fx.ripple(p.x, p.y + 20, { r1: Math.max(W, H) * 0.7, life: 5.5, rings: 3, alpha: 0.55, delay: i * 0.25, width: 1.3 });
      NV.fx.motes(p.x, p.y - 30, 26, { spread: 50, stagger: 1.2 });
    });
    // 河灯顺水漂向远方
    lanterns.forEach((b, i) => {
      let lastR = 0;
      gsap.to(b, {
        y: -(H * 0.32 + i * 18), x: (1.5 - i) * W * 0.05, scale: 0.4, opacity: 0, duration: 7, delay: 0.6 + i * 0.35, ease: 'sine.inOut',
        onUpdate() {
          const t = this.time();
          if (t - lastR > 0.7) { lastR = t; const p = center(b, 0.8); NV.fx.ripple(p.x, p.y, { r1: 50, alpha: 0.35, color: 'warm', life: 2 }); }
        },
      });
    });
    // 金色的花，从水面上开出来
    const count = NV.isMobile() ? 7 : 11;
    for (let k = 0; k < count; k++) {
      const x = rand(0.1, 0.9) * W, y = rand(0.15, 0.85) * H;
      bloom(x, y, rand(36, NV.isMobile() ? 64 : 92), 0.8 + k * 0.32);
    }
    gsap.to(['.lantern-head', '.lantern-status'], { opacity: 0, duration: 1.5, delay: 0.4 });
    gsap.fromTo('.lantern-done p', { opacity: 0, y: 16, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 2, stagger: 1.6, delay: 3.2 });
  }

  w.init = () => {
    build();
    gsap.fromTo('.wish-title', { opacity: 0, scale: 0.92, filter: 'blur(12px)' }, {
      opacity: 1, scale: 1, filter: 'blur(0px)', ease: 'none',
      scrollTrigger: { trigger: '.wish-title', start: 'top 85%', end: 'top 45%', scrub: 1 },
    });
    $$('.wish-line, .wish-final').forEach((d) => {
      const ps = $$('p', d);
      gsap.timeline({ scrollTrigger: { trigger: d, start: 'top 80%', end: 'bottom 20%', scrub: 1 } })
        .fromTo(ps, { opacity: 0, y: 20, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 3, stagger: 1.2 })
        .to(ps, { opacity: 1, duration: 3 })
        .to(ps, { opacity: 0, y: -14, filter: 'blur(8px)', duration: 3 });
    });
    gsap.from(['.lantern-head > *', '.lantern'], {
      opacity: 0, y: 30, duration: 1.6, stagger: 0.2, ease: 'power2.out',
      scrollTrigger: { trigger: '.lanterns', start: 'top 65%' },
    });
  };

  NV.wishes = w;
})(window.NV);

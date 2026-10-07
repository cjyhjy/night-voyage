/* 第四幕「二十」：巨大的 20 是一扇窗，窗里是天亮以后的山水；镜头穿过它 */
(function (NV) {
  const { $, el } = NV;
  const C = window.CONTENT.twenty;
  const tw = {};
  let svg, clipPath, outline, img, fogImg, dim, win, zoom = { s: 1 };
  // 「0」左侧笔画中间的一点：镜头从这里穿过去
  const FOCUS = [588, 430];
  const BOX = { x: 0, y: 43, w: 1029, h: 773 };

  function build() {
    svg = $('.window20');
    svg.innerHTML = `
      <defs>
        <clipPath id="clip20"><path class="c20"/></clipPath>
        <linearGradient id="w20sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff2d6" stop-opacity=".0"/>
          <stop offset=".5" stop-color="#fff2d6" stop-opacity=".35"/>
          <stop offset="1" stop-color="#fff2d6" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect class="w20-dim" x="0" y="0" width="100%" height="100%" fill="#050c1c"/>
      <g class="w20-win" clip-path="url(#clip20)">
        <image class="w20-img" href="assets/img/scene-dawn.webp" preserveAspectRatio="xMidYMid slice" style="filter:saturate(1.35) contrast(1.08)"/>
        <image class="w20-fog" href="assets/img/fog.webp" preserveAspectRatio="none" opacity=".28"/>
        <rect class="w20-sheen" x="0" y="0" width="100%" height="100%" fill="url(#w20sheen)"/>
        <g class="w20-motes"></g>
      </g>
      <path class="w20-outline"/>`;
    clipPath = $('.c20', svg);
    outline = $('.w20-outline', svg);
    img = $('.w20-img', svg);
    fogImg = $('.w20-fog', svg);
    dim = $('.w20-dim', svg);
    win = $('.w20-win', svg);
    clipPath.setAttribute('d', NV.glyph20);
    outline.setAttribute('d', NV.glyph20);
    const motes = $('.w20-motes', svg);
    for (let i = 0; i < 26; i++) {
      const c = NV.svg('circle', { r: NV.rand(1, 2.6).toFixed(1), fill: '#f6d89a', class: 'w20-mote' });
      motes.appendChild(c);
    }

    const box = $('.twenty-lines');
    C.groups.forEach((g) => {
      const d = el('div', 'group');
      g.forEach((l) => d.appendChild(el('p', '', l)));
      box.appendChild(d);
    });
  }

  function layout() {
    const W = innerWidth, H = innerHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    img.setAttribute('width', W); img.setAttribute('height', H);
    fogImg.setAttribute('width', W * 2); fogImg.setAttribute('height', H * 0.6); fogImg.setAttribute('y', H * 0.35);
    NV.$$('.w20-mote', svg).forEach((c) => {
      c.setAttribute('cx', NV.rand(0, W).toFixed(0));
      c.setAttribute('cy', NV.rand(H * 0.2, H).toFixed(0));
    });
    apply();
  }

  /* 根据当前缩放，计算 20 的变换：以 FOCUS 点为中心放大 */
  function apply() {
    const W = innerWidth, H = innerHeight;
    const base = Math.min((H * 0.62) / BOX.h, (W * 0.86) / BOX.w);
    const cx = W / 2 - (BOX.x + BOX.w / 2) * base;
    const cy = H / 2 - (BOX.y + BOX.h / 2) * base;
    // 焦点在屏幕上的位置
    const fx = cx + FOCUS[0] * base, fy = cy + FOCUS[1] * base;
    const s = base * zoom.s;
    // 放大时把焦点逐渐移到屏幕中央
    const k = Math.min(1, (zoom.s - 1) / 6);
    const tx = NV.lerp(fx, W / 2, k) - FOCUS[0] * s;
    const ty = NV.lerp(fy, H / 2, k) - FOCUS[1] * s;
    const m = `matrix(${s} 0 0 ${s} ${tx} ${ty})`;
    clipPath.setAttribute('transform', m);
    outline.setAttribute('transform', m);
  }

  tw.init = () => {
    build();
    layout();
    addEventListener('resize', layout);

    // 窗里的雾与金粉，一直缓慢流动
    gsap.to(fogImg, { attr: { x: -innerWidth }, duration: 40, repeat: -1, ease: 'none' });
    NV.$$('.w20-mote', svg).forEach((c) => {
      gsap.to(c, { attr: { cy: '-=' + NV.rand(80, 200).toFixed(0) }, opacity: 0, duration: NV.rand(5, 10), repeat: -1, delay: NV.rand(0, 6), ease: 'sine.out' });
    });
    gsap.fromTo('.w20-sheen', { attr: { x: -innerWidth } }, { attr: { x: innerWidth }, duration: 7, repeat: -1, ease: 'sine.inOut', repeatDelay: 2 });

    gsap.set([win, outline], { opacity: 0 });
    gsap.set(dim, { opacity: 0 });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#twenty', start: 'top top', end: 'bottom bottom', scrub: 1 },
    });
    tl.to(dim, { opacity: 0.55, duration: 6 }, 0)
      .fromTo(zoom, { s: 0.9 }, { s: 1, duration: 10, onUpdate: apply, ease: 'power1.out' }, 0)
      .to([win, outline], { opacity: 1, duration: 6 }, 1)
      .to(zoom, { s: 60, duration: 24, onUpdate: apply, ease: 'power3.in' }, 14)
      .to(outline, { opacity: 0, duration: 4 }, 32)
      .to(dim, { opacity: 0, duration: 6 }, 30)
      .to(win, { opacity: 0, duration: 10, ease: 'power1.inOut' }, 38);

    NV.$$('.twenty-lines .group').forEach((g, i) => {
      const at = 48 + i * 13;
      const ps = NV.$$('p', g);
      tl.fromTo(ps, { opacity: 0, y: 18, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 3.5, stagger: 2.5 }, at);
      if (i < C.groups.length - 1) tl.to(ps, { opacity: 0, y: -12, filter: 'blur(8px)', duration: 3 }, at + 9.5);
    });
    tl.to('.twenty-lines .group:last-child p', { opacity: 0, filter: 'blur(8px)', duration: 3 }, 98);
  };

  NV.twenty = tw;
})(window.NV);

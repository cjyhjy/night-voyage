/* 第九幕「天明」：小舟独自驶向晨光；以及藏在最后的彩蛋 */
(function (NV) {
  const { $, $$, el, clamp } = NV;
  const C = window.CONTENT.dawn;
  const S = window.CONTENT.secret;
  const d = {};
  let boat, stage, L = 140;
  const st = { t: 0 };
  let prevT = -1, lastRing = 0;

  function build() {
    stage = $('#dawn .stage');
    const lines = $('.dawn-lines');
    C.lines.forEach((l) => lines.appendChild(el('p', '', l)));
    const t = $('.dawn-title');
    C.title.forEach((l) => t.appendChild(el('span', '', l)));
    $('.dawn-en').textContent = C.en;
    $('.dawn-tbc').textContent = C.tbc;
    $('.replay span').textContent = C.replay;
    boat = NV.boat.create({ canopy: true, lantern: false });
    stage.prepend(boat);

    const sl = $('.secret-lines');
    S.lines.forEach((l) => sl.appendChild(el('p', '', l)));
    $('.secret-final').textContent = S.final;
  }

  function layout() {
    L = clamp(Math.min(innerWidth, innerHeight) * 0.2, 90, 180);
    boat.style.width = L * 1.5 + 'px';
    boat.style.height = L * 0.48 + 'px';
    render();
  }

  /* 小舟从近处驶向远方：越来越小，最后消失在晨光里 */
  function render() {
    const W = innerWidth, H = innerHeight, t = st.t;
    const tall = NV.portrait();
    const x0 = tall ? 0.2 * W : 0.12 * W, y0 = 0.9 * H, x1 = tall ? 0.7 * W : 0.76 * W, y1 = 0.7 * H;
    const e = 1 - Math.pow(1 - t, 1.6);
    const x = NV.lerp(x0, x1, e), y = NV.lerp(y0, y1, e) - Math.sin(e * Math.PI) * H * 0.04;
    const sc = NV.lerp(1, 0.16, e);
    const a = Math.atan2(y1 - y0, x1 - x0) * 0.7;
    const bw = L * 1.5, bh = L * 0.48;
    boat.style.transform = `translate(${x - bw * 0.5833}px, ${y - bh * 0.5}px) rotate(${a}rad) scale(${sc})`;
    boat.style.opacity = t <= 0 ? 0 : clamp((1 - t) * 6) * clamp(t * 20);
    const moving = Math.abs(t - prevT) > 0.0004 && t > 0 && t < 1 && stage.getBoundingClientRect().top <= 1;
    prevT = t;
    if (moving) {
      NV.fx.trail('dawn', x + Math.cos(a) * L * 0.3 * sc, y + Math.sin(a) * L * 0.3 * sc, a, { spread: L * 0.3 * sc, life: 2.4, alpha: 0.8 });
      if (performance.now() - lastRing > 800) {
        lastRing = performance.now();
        NV.fx.ripple(x - Math.cos(a) * L * 0.4 * sc, y, { r1: L * 0.7 * sc, rings: 2, alpha: 0.55, life: 2.6 });
      }
    }
  }

  /* 彩蛋：一滴墨落进水里，晕开，然后说一句话 */
  function secret() {
    const svg = $('.ink-drop');
    const fid = 'inkEdge';
    svg.innerHTML = `
      <defs>
        <filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="3" seed="20"/>
          <feDisplacementMap in="SourceGraphic" scale="9"/>
          <feGaussianBlur stdDeviation=".6"/>
        </filter>
        <radialGradient id="inkFill"><stop offset="0" stop-color="#0a141a" stop-opacity=".96"/><stop offset=".8" stop-color="#0c1820" stop-opacity=".92"/><stop offset="1" stop-color="#0c1820" stop-opacity=".5"/></radialGradient>
      </defs>
      <circle class="blot" r="0" fill="url(#inkFill)" filter="url(#${fid})"/>
      <path class="drop" d="M0 -2.6 C1.3 -0.5 1.7 0.9 0 2.1 C-1.7 0.9 -1.3 -0.5 0 -2.6Z" fill="#0a141a" opacity="0"/>`;
    const flower = $('.gold-flower');
    flower.innerHTML = `<defs><radialGradient id="gf"><stop offset="0" stop-color="#fff3cf"/><stop offset=".7" stop-color="#e2bd78"/><stop offset="1" stop-color="#b98d4a"/></radialGradient></defs>`;
    const petals = NV.blossomPaths().map((p) => {
      const e = NV.svg('ellipse', { cx: (p.cx * 1.1).toFixed(1), cy: (p.cy * 1.1).toFixed(1), rx: 12, ry: 15, fill: 'url(#gf)', transform: `rotate(${p.rot.toFixed(0)} ${(p.cx * 1.1).toFixed(1)} ${(p.cy * 1.1).toFixed(1)})` });
      flower.appendChild(e);
      return e;
    });
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      flower.appendChild(NV.svg('line', { class: 'stm', x1: 0, y1: 0, x2: (Math.cos(a) * 12).toFixed(1), y2: (Math.sin(a) * 12).toFixed(1), stroke: '#fff1c8', 'stroke-width': '.8' }));
    }
    flower.appendChild(NV.svg('circle', { r: 3.2, fill: '#fff7de' }));
    gsap.set(flower, { opacity: 0 });
    gsap.set(petals, { scale: 0, transformOrigin: '0px 0px' });

    let played = false;
    ScrollTrigger.create({
      trigger: '#secret', start: 'top 35%',
      onEnter: () => {
        if (played) return;
        played = true;
        const drop = $('.drop', svg), blot = $('.blot', svg);
        gsap.timeline()
          .fromTo(drop, { attr: { transform: 'translate(0 -48) scale(1)' }, opacity: 1 }, { attr: { transform: 'translate(0 0) scale(1)' }, duration: 0.9, ease: 'power2.in' })
          .add(() => {
            NV.sound.drop();
            const r = svg.getBoundingClientRect();
            NV.fx.ripple(r.left + r.width / 2, r.top + r.height / 2, { r1: Math.min(innerWidth, innerHeight) * 0.5, rings: 3, life: 3.5, alpha: 0.5, color: 'pale' });
          })
          .to(drop, { opacity: 0, duration: 0.2 })
          .to(blot, { attr: { r: 30 }, duration: 3.4, ease: 'power3.out' }, '<')
          .fromTo('.secret-lines p', { opacity: 0, y: 10, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, stagger: 1.5 }, '-=2.2')
          .fromTo('.secret-final', { opacity: 0, scale: 0.9, filter: 'blur(10px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 2 }, '+=0.8')
          .to(flower, { opacity: 1, duration: 0.3 }, '+=0.3')
          .to(petals, { scale: 1, duration: 1, stagger: 0.12, ease: 'back.out(2.2)' }, '<')
          .add(() => {
            NV.sound.chime(4);
            const r = flower.getBoundingClientRect();
            NV.fx.motes(r.left + r.width / 2, r.top + r.height / 2, 18, { spread: 20 });
          }, '-=0.6')
          .to(flower, { rotation: 20, duration: 6, ease: 'sine.inOut' });
      },
    });
  }

  d.init = () => {
    build();
    layout();
    addEventListener('resize', layout);
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#dawn', start: 'top top', end: 'bottom bottom', scrub: 1 },
      onUpdate: render,
    });
    tl.fromTo(st, { t: 0 }, { t: 1, duration: 80, ease: 'none' }, 2)
      .fromTo('.dawn-lines p', { opacity: 0, y: 16, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 5, stagger: 3 }, 4)
      .to('.dawn-lines p', { opacity: 0, filter: 'blur(8px)', duration: 4 }, 24)
      .fromTo('.dawn-title span', { opacity: 0, y: 20, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 6, stagger: 3 }, 30)
      .set('.dawn-title', { opacity: 1 }, 30)
      .fromTo('.dawn-en', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 5 }, 46)
      .fromTo('.dawn-tbc', { opacity: 0 }, { opacity: 1, duration: 5 }, 54)
      .fromTo('.replay', { opacity: 0 }, { opacity: 1, duration: 5 }, 64)
      .to({}, { duration: 10 }, 90);
    $('.replay').addEventListener('click', () => NV.opening.replay());
    secret();
  };

  NV.dawn = d;
})(window.NV);

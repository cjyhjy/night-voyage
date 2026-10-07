/* 第三幕「她」：词语从山水里“长”出来，最后汇向中央，拼成二十岁的你 */
(function (NV) {
  const { $, el } = NV;
  const C = window.CONTENT.her;

  // 每个词在画面中的位置（百分比）。'moon' 表示贴着月亮放。
  const POS_WIDE = [[82, 57], [45, 49], ['moon'], [17, 56], [30, 81], [62, 72], [80, 85]];
  const POS_TALL = [[70, 52], [36, 60], ['moon'], [28, 42], [27, 79], [66, 70], [70, 88]];
  const SIZE = ['big', '', 'big', 'small', '', 'small', ''];

  const her = {};
  let words = [];

  function branchSVG() {
    // 一枝从右侧探进画面的梅花
    const svg = NV.svg('svg', { viewBox: '0 0 320 220', class: 'deco deco-branch' });
    svg.innerHTML = `
      <path class="twig" stroke-width="5" d="M330 70 C290 78 250 96 214 118 C180 139 150 150 108 156 C80 160 58 170 38 188"/>
      <path class="twig" stroke-width="3" d="M214 118 C206 96 210 76 226 56"/>
      <path class="twig" stroke-width="2.4" d="M150 148 C140 128 126 116 106 110"/>
      <path class="twig" stroke-width="2" d="M108 156 C100 176 104 192 116 206"/>
      <path class="twig" stroke-width="2.2" d="M268 88 C262 110 266 128 280 140"/>`;
    const buds = [[226, 56, 9], [206, 84, 7], [106, 110, 8], [126, 122, 6], [38, 188, 7], [116, 206, 7], [280, 140, 8], [258, 98, 6], [176, 140, 7], [70, 168, 6]];
    buds.forEach(([x, y, r], i) => {
      const g = NV.svg('g', { class: 'flower', transform: `translate(${x} ${y})` });
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + i;
        g.appendChild(NV.svg('circle', { class: 'bud', cx: (Math.cos(a) * r * 0.62).toFixed(1), cy: (Math.sin(a) * r * 0.62).toFixed(1), r: (r * 0.55).toFixed(1) }));
      }
      g.appendChild(NV.svg('circle', { class: 'bud-c', r: (r * 0.28).toFixed(1) }));
      svg.appendChild(g);
    });
    return svg;
  }

  function build() {
    const stage = $('#her .stage');
    const intro = $('.her-intro');
    C.intro.forEach((l) => intro.appendChild(el('p', '', l)));

    const box = $('.her-words');
    const branch = branchSVG();
    box.appendChild(branch);

    words = C.words.map((w, i) => {
      const d = el('div', 'her-word ' + (SIZE[i % SIZE.length] || ''));
      d.appendChild(el('span', 'w-text', w.text));
      const st = NV.svg('svg', { class: 'w-stroke', viewBox: '0 0 200 14', preserveAspectRatio: 'none' });
      st.appendChild(NV.svg('path', { d: 'M4 9 C50 3 120 13 196 5' }));
      d.appendChild(st);
      let deco = null;
      if (w.deco === 'moon') { deco = el('i', 'deco deco-glow'); Object.assign(deco.style, { width: '240%', aspectRatio: '1', left: '-70%', top: '50%', transform: 'translateY(-50%)' }); }
      if (w.deco === 'fog') { deco = el('i', 'deco deco-wisp'); Object.assign(deco.style, { width: '220%', height: '160%', left: '-60%', top: '-30%' }); }
      if (w.deco === 'ripple') {
        deco = NV.svg('svg', { class: 'deco', viewBox: '-100 -40 200 80', style: 'width:260%;left:-80%;top:40%;' });
        [30, 55, 82].forEach((r) => deco.appendChild(NV.svg('ellipse', { class: 'deco-ring', rx: r, ry: r * 0.32 })));
      }
      if (w.deco === 'petal') {
        deco = el('i', 'deco');
        Object.assign(deco.style, { left: '90%', top: '-80%', width: '1px', height: '1px' });
        for (let k = 0; k < 3; k++) {
          const p = el('i', 'deco-petal');
          Object.assign(p.style, { position: 'absolute', left: k * 18 - 10 + 'px', top: '0' });
          deco.appendChild(p);
          gsap.to(p, { y: 120 + k * 30, x: -40 + k * 25, rotation: 260 + k * 60, opacity: 0, duration: 5 + k, repeat: -1, delay: k * 1.7, ease: 'sine.inOut' });
        }
      }
      if (deco) d.prepend(deco);
      d.dataset.deco = w.deco;
      gsap.set(d, { xPercent: -50, yPercent: -50 });
      box.appendChild(d);
      return d;
    });

    const g = $('.her-gather');
    C.gather.forEach((l) => g.appendChild(el('p', '', l)));
    g.appendChild(el('p', 'strong', C.gather2));

    const f = el('p', '');
    // 把「二十」挑出来上金色，作为下一幕的引子
    const txt = C.final;
    const k = txt.indexOf('二十');
    if (k >= 0) {
      f.append(txt.slice(0, k));
      const em = document.createElement('em'); em.textContent = '二十'; f.append(em);
      f.append(txt.slice(k + 2));
    } else f.textContent = txt;
    $('.her-final').appendChild(f);
    return { stage, branch };
  }

  function place() {
    const tall = NV.portrait();
    const P = tall ? POS_TALL : POS_WIDE;
    const m = NV.world.moonScreen();
    words.forEach((w, i) => {
      const p = P[i % P.length];
      if (p[0] === 'moon') {
        w.style.left = Math.min(innerWidth * 0.86, Math.max(innerWidth * 0.14, m.x - (tall ? 10 : 70))) + 'px';
        w.style.top = Math.max(innerHeight * 0.3, m.y + (tall ? 70 : 110)) + 'px';
      } else {
        w.style.left = p[0] + '%';
        w.style.top = p[1] + '%';
      }
    });
  }

  her.init = () => {
    const { branch } = build();
    place();
    addEventListener('resize', place);
    NV.on('opened', place);

    const twigs = NV.$$('.twig', branch);
    twigs.forEach((t) => { const L = t.getTotalLength(); gsap.set(t, { strokeDasharray: L, strokeDashoffset: L }); });
    gsap.set(NV.$$('.flower', branch), { scale: 0, transformOrigin: 'center', transformBox: 'fill-box' });

    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: { trigger: '#her', start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true },
    });
    tl.fromTo('.her-intro p', { opacity: 0, y: 24, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 4, stagger: 2.5 }, 2);

    words.forEach((w, i) => {
      const at = 12 + i * 5.5;
      tl.fromTo(w, { opacity: 0, scale: 0.86, filter: 'blur(12px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 4.5 }, at);
      const deco = w.dataset.deco;
      if (deco === 'branch') {
        tl.to(twigs, { strokeDashoffset: 0, duration: 6, stagger: 0.6, ease: 'power1.inOut' }, at - 4)
          .to(NV.$$('.flower', branch), { scale: 1, duration: 2.5, stagger: 0.25, ease: 'back.out(2)' }, at - 1);
      }
      if (deco === 'ripple') {
        tl.fromTo(NV.$$('.deco-ring', w), { opacity: 0, scale: 0.4, transformOrigin: 'center' }, { opacity: 1, scale: 1, duration: 4, stagger: 0.8 }, at);
        tl.call(() => {
          const r = w.getBoundingClientRect();
          NV.fx.ripple(r.left + r.width / 2, r.top + r.height * 0.8, { r1: 90, rings: 3, alpha: 0.45, color: 'pale', life: 3 });
        }, null, at + 1);
      }
    });

    // 汇向中央
    tl.to(['.her-intro p', '.deco-branch'], { opacity: 0, filter: 'blur(8px)', duration: 4, stagger: 0.5 }, 56);
    words.forEach((w, i) => {
      tl.to(w, {
        x: () => innerWidth / 2 - w.offsetLeft,
        y: () => innerHeight / 2 - w.offsetTop,
        scale: 0.4, opacity: 0, filter: 'blur(6px)', duration: 6, ease: 'power2.inOut',
      }, 58 + i * 0.6);
    });
    tl.fromTo('.her-gather p', { opacity: 0, y: 16, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 4, stagger: 3 }, 65)
      .to('.her-gather p', { opacity: 0, filter: 'blur(8px)', duration: 3 }, 82)
      .fromTo('.her-final p', { opacity: 0, scale: 0.94, filter: 'blur(10px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 5 }, 85)
      .to('.her-final p', { scale: 1.5, opacity: 0, filter: 'blur(6px)', duration: 5, ease: 'power2.in' }, 95);
  };

  NV.her = her;
})(window.NV);

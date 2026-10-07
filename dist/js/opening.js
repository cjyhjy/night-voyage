/* 入卷 + 启舟：小舟划过黑暗，船尾墨色晕开，把整幅山水“渲染”出来 */
(function (NV) {
  const { $, rand, clamp } = NV;
  const C = window.CONTENT;
  const op = {};
  let cv, ctx, dpr = 1, W = 0, H = 0;
  let brushes = [], softBrush = null, seeds = [], paper = null;
  let raf = 0, revealing = false;

  /* ---------- 墨晕笔刷：几张随机生成的“墨团”，用来擦开黑幕 ---------- */
  function makeBrushes() {
    brushes = [];
    for (let b = 0; b < 6; b++) {
      const S = 256, c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      const blob = (x, y, r, a) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(255,255,255,${a})`);
        gr.addColorStop(0.55, `rgba(255,255,255,${a * 0.6})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      };
      blob(S / 2, S / 2, S * 0.36, 0.9);
      for (let i = 0; i < 16; i++) {
        const a = rand(0, Math.PI * 2), d = rand(0, S * 0.24);
        blob(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, rand(S * 0.08, S * 0.2), rand(0.3, 0.7));
      }
      // 墨顺着纸纤维渗出去的细枝
      for (let i = 0; i < 46; i++) {
        const a = rand(0, Math.PI * 2), d = rand(S * 0.26, S * 0.46);
        blob(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, rand(S * 0.012, S * 0.05), rand(0.25, 0.6));
      }
      brushes.push(c);
    }
    // 一张没有细枝的柔和笔刷（月晕用）
    const S = 256, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.5, 'rgba(255,255,255,.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    softBrush = c;
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, NV.isMobile() ? 1.25 : 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* 黑幕：深夜的墨色 + 宣纸纹理 */
  function paintCover() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(W * 0.55, H * 0.42, 0, W * 0.55, H * 0.42, Math.max(W, H) * 0.8);
    g.addColorStop(0, '#0d1820');
    g.addColorStop(1, '#05090d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (paper) {
      ctx.globalAlpha = 0.035;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = ctx.createPattern(paper, 'repeat');
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }

  function seed(x, y, o) {
    seeds.push({
      x, y, r0: o.r0 ?? 10, r1: o.r1, t0: performance.now() + (o.delay ?? 0) * 1000,
      dur: (o.dur ?? 3) * 1000, rot: rand(0, Math.PI * 2), b: o.soft ? softBrush : brushes[(Math.random() * brushes.length) | 0], str: o.str ?? 0.05,
    });
    if (!raf) raf = requestAnimationFrame(erase);
  }

  function erase(now) {
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = seeds.length - 1; i >= 0; i--) {
      const s = seeds[i];
      if (now < s.t0) continue;
      const t = (now - s.t0) / s.dur;
      if (t >= 1) { seeds.splice(i, 1); continue; }
      const r = s.r0 + (s.r1 - s.r0) * (1 - Math.pow(1 - t, 3));
      ctx.globalAlpha = s.str * (1 - t * 0.6);
      ctx.save();
      ctx.translate(s.x, s.y); ctx.rotate(s.rot + t * 0.4);
      ctx.drawImage(s.b, -r, -r, r * 2, r * 2);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    raf = seeds.length ? requestAnimationFrame(erase) : 0;
  }

  /* ---------- 航线 ---------- */
  function route() {
    // 归一化的三次贝塞尔控制点
    const P = NV.portrait()
      ? [[-0.25, 0.86], [0.55, 0.92], [0.35, 0.56], [1.3, 0.62]]
      : [[-0.08, 0.8], [0.3, 0.6], [0.62, 0.95], [1.1, 0.7]];
    return P.map(([x, y]) => [x * W, y * H]);
  }
  function bez(P, t) {
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    const x = a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0];
    const y = a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1];
    const dx = 3 * u * u * (P[1][0] - P[0][0]) + 6 * u * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]);
    const dy = 3 * u * u * (P[1][1] - P[0][1]) + 6 * u * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]);
    return { x, y, a: Math.atan2(dy, dx) };
  }

  /* ---------- 小舟划过 ---------- */
  function sail(done) {
    const holder = $('#voyager');
    holder.innerHTML = '';
    const boat = NV.boat.create({ canopy: true, lantern: true });
    holder.appendChild(boat);
    const L = clamp(Math.min(W, H) * 0.24, 120, 220); // 船身长度(px)
    const bw = L * 1.5, bh = bw * 0.32;
    Object.assign(boat.style, { width: bw + 'px', height: bh + 'px' });
    const P = route();
    const R = Math.max(W, H) * 0.2;
    const dur = NV.portrait() ? 6.4 : 7.6;
    let start = 0, lastSeed = null, lastBig = null, lastRing = 0, lastOar = 0;

    gsap.to(holder, { opacity: 1, duration: 1.2 });

    function frame(now) {
      if (!start) start = now;
      const raw = (now - start) / 1000 / dur;
      const t = clamp(raw);
      const e = t < 0.5 ? 2 * t * t * 0.6 + t * 0.4 : 1 - (2 * (1 - t) * (1 - t) * 0.6 + (1 - t) * 0.4); // 起止稍缓
      const p = bez(P, e);
      const dx = Math.cos(p.a), dy = Math.sin(p.a);
      const sway = Math.sin(now / 900) * 0.025;
      boat.style.transform = `translate(${p.x - bw * 0.5833}px, ${p.y - bh * 0.5}px) rotate(${p.a + sway}rad)`;

      const stern = { x: p.x - dx * L * 0.42, y: p.y - dy * L * 0.42 };
      const bow = { x: p.x + dx * L * 0.35, y: p.y + dy * L * 0.35 };
      // 船尾墨晕：把黑幕擦开
      if (!lastSeed || Math.hypot(stern.x - lastSeed.x, stern.y - lastSeed.y) > 12) {
        const j = rand(-1, 1) * L * 0.2;
        seed(stern.x - dy * j, stern.y + dx * j, { r0: L * 0.12, r1: R * rand(0.45, 0.9), dur: rand(2.4, 3.8), str: 0.055 });
        lastSeed = stern;
      }
      if (!lastBig || Math.hypot(stern.x - lastBig.x, stern.y - lastBig.y) > 110) {
        seed(stern.x + rand(-1, 1) * R * 0.3, stern.y + rand(-1, 1) * R * 0.3, { r0: R * 0.2, r1: R * rand(1.1, 1.6), dur: 4.2, str: 0.03 });
        lastBig = stern;
      }
      // 金色航迹
      NV.fx.trail('voyager', bow.x, bow.y, p.a, { spread: L * 0.28, life: 2.6, alpha: 0.75 });
      if (now - lastRing > 520) {
        NV.fx.ripple(stern.x, stern.y, { r1: L * 0.75, life: 2.8, alpha: 0.5, rings: 2, width: 1 });
        lastRing = now;
      }
      if (now - lastOar > 1600) {
        const ox = p.x - dx * L * 0.85, oy = p.y - dy * L * 0.85;
        NV.fx.ripple(ox, oy, { r1: L * 0.3, life: 1.8, alpha: 0.4, color: 'pale' });
        lastOar = now;
      }
      if (raw < 1) requestAnimationFrame(frame);
      else { holder.style.opacity = 0; done(P, R); }
    }
    requestAnimationFrame(frame);
  }

  /* 小舟过后，墨色从航线向四周晕开，整幅画展开 */
  function flood(P, R, then) {
    for (let i = 0; i <= 12; i++) {
      const p = bez(P, i / 12);
      seed(p.x, p.y, { r0: R * 0.5, r1: R * rand(2.2, 3), dur: 3, str: 0.04, delay: i * 0.06 });
    }
    const pts = [[0.1, 0.1], [0.5, 0.05], [0.9, 0.12], [0.2, 0.45], [0.8, 0.4], [0.5, 0.35], [0.05, 0.95], [0.95, 0.95]];
    pts.forEach(([x, y], i) => seed(x * W, y * H, { r0: R * 0.3, r1: R * 2.4, dur: 3.2, str: 0.035, delay: 0.5 + i * 0.08 }));
    gsap.to(cv, { opacity: 0, duration: 1.6, delay: 2.6, ease: 'power1.inOut', onComplete: () => { cv.style.display = 'none'; seeds = []; } });
    setTimeout(then, 1100);
  }

  /* 月亮先从黑暗里透出来 */
  function moonrise() {
    const m = NV.world.moonScreen();
    seed(m.x, m.y, { r0: m.r * 2, r1: m.r * 10, dur: 3.6, str: 0.006, soft: true });
    seed(m.x, m.y, { r0: m.r, r1: m.r * 5, dur: 2.6, str: 0.022, soft: true });
  }

  /* ---------- 标题「二十」：金线描出，再由墨染满 ---------- */
  function buildTitle() {
    const svg = $('.twenty-svg');
    svg.innerHTML = '';
    const fills = NV.svg('g', { class: 'g-fills' });
    const lines = NV.svg('g', { class: 'g-lines' });
    [...NV.glyphs.er, ...NV.glyphs.shi].forEach((d) => {
      fills.appendChild(NV.svg('path', { d, class: 'g-fill' }));
      lines.appendChild(NV.svg('path', { d, class: 'g-line' }));
    });
    svg.append(fills, lines);
  }

  function writeTitle() {
    const lines = NV.$$('.g-line');
    const tl = gsap.timeline();
    lines.forEach((p, i) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
      tl.to(p, { strokeDashoffset: 0, duration: i < 2 ? 1.5 : 2, ease: 'power1.inOut' }, i * 0.7);
    });
    tl.fromTo('.g-fills', { opacity: 0, filter: 'blur(14px)' }, { opacity: 1, filter: 'blur(0px)', duration: 2.4, ease: 'power2.out' }, '-=0.6')
      .to('.g-lines', { opacity: 0.32, duration: 2.2 }, '-=1.2')
      .fromTo('.hero-sub', { opacity: 0, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.6 }, '-=1.6')
      .fromTo('.hero-small', { opacity: 0 }, { opacity: 1, duration: 1.4 }, '-=0.6')
      .add(() => document.body.classList.add('is-open'))
      .fromTo('.scroll-cue', { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 1.4 }, '+=0.2');
    return tl;
  }

  /* ---------- 入卷 ---------- */
  op.init = () => {
    cv = $('#reveal');
    ctx = cv.getContext('2d');
    resize();
    makeBrushes();
    paintCover();
    const img = new Image();
    img.onload = () => { paper = img; if (!revealing) paintCover(); };
    img.src = 'assets/img/paper.webp';
    addEventListener('resize', () => { if (cv.style.display !== 'none' && !revealing) { resize(); paintCover(); } });

    const lines = $('.entrance-lines');
    C.entrance.lines.forEach((l) => lines.appendChild(NV.el('span', 'line', l)));
    $('.enter-text').textContent = C.entrance.button;
    $('.entrance-note').textContent = C.entrance.note;
    $('.hero-sub').textContent = C.hero.sub;
    $('.hero-small').textContent = C.hero.small;
    $('.scroll-cue span').textContent = C.hero.cue;
    buildTitle();

    gsap.timeline({ delay: 0.4 })
      .fromTo('.entrance-lines .line', { opacity: 0, y: 12, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 2, stagger: 0.9, ease: 'power2.out' })
      .fromTo('#enter', { opacity: 0 }, { opacity: 1, duration: 1.4 }, '-=0.6')
      .fromTo('.entrance-note', { opacity: 0 }, { opacity: 1, duration: 1.4 }, '<');

    $('#enter').addEventListener('click', enter, { once: true });

    // 调试：地址后加 ?skip 直接跳过开场
    if (/[?&]skip/.test(location.search)) {
      $('#entrance').remove();
      cv.style.display = 'none';
      writeTitle().progress(1);
      unlock();
    }
  };

  function enter() {
    NV.sound.start();
    gsap.to('#entrance', {
      opacity: 0, duration: 1.1, ease: 'power1.in',
      onComplete: () => { $('#entrance').remove(); },
    });
    play(1.8);
  }

  /* 播放开卷（入卷时 / 再看一遍时） */
  function play(delay) {
    revealing = true;
    if (NV.reduced) {
      gsap.to(cv, { opacity: 0, duration: 1.5, delay, onComplete: () => (cv.style.display = 'none') });
      gsap.delayedCall(delay + 0.8, () => { writeTitle().progress(1); unlock(); });
      return;
    }
    gsap.delayedCall(delay, () => {
      NV.sound.drop();
      NV.fx.ripple(W * 0.5, H * 0.62, { r1: Math.min(W, H) * 0.3, life: 3.2, alpha: 0.35, color: 'pale', rings: 3 });
      NV.sound.mood('water');
    });
    gsap.delayedCall(delay + 1.2, moonrise);
    gsap.delayedCall(delay + 3.2, () => {
      NV.sound.mood('boat');
      sail((P, R) => flood(P, R, () => {
        writeTitle().eventCallback('onComplete', unlock);
      }));
    });
  }

  function unlock() {
    revealing = false;
    document.body.classList.remove('is-waiting');
    document.body.classList.add('is-open');
    ScrollTrigger.refresh();
    NV.world.measure();
    NV.emit('opened');
  }

  /* 再看一遍：回到开头重新开卷 */
  op.replay = () => {
    document.body.classList.add('is-waiting');
    document.body.classList.remove('is-open');
    scrollTo(0, 0);
    gsap.set(['.g-fills', '.g-lines', '.hero-sub', '.hero-small', '.scroll-cue'], { opacity: 0 });
    cv.style.display = 'block';
    gsap.set(cv, { opacity: 1 });
    resize();
    paintCover();
    play(0.6);
  };

  NV.opening = op;
})(window.NV);

/* 第五幕「二十笺」：二十张花笺散落在夜色里，远近不一、轻轻浮动；拆开时飞到中央展开 */
(function (NV) {
  const { $, $$, el, clamp } = NV;
  const C = window.CONTENT.notes;
  // 宣纸白 · 薛涛笺的浅绯 · 竹青 · 缃色 · 藕荷
  const TINTS = ['#f1e9d6', '#efd6cc', '#dce6d8', '#f1e1bb', '#e6dbe4', '#f3ece0'];
  const n = {};
  let notes = [], read = new Set(), cur = -1, busy = false;
  let field, modal, card, mouse = { x: 0, y: 0, tx: 0, ty: 0 }, visible = false;

  function edge(rnd) {
    // 毛边：沿四边取一些微微错开的点
    const pts = [];
    const j = () => (rnd() * 1.6).toFixed(2);
    for (let i = 0; i <= 6; i++) pts.push(`${(i / 6 * 100).toFixed(1)}% ${j()}%`);
    for (let i = 1; i <= 10; i++) pts.push(`${(100 - rnd() * 2.2).toFixed(2)}% ${(i / 10 * 100).toFixed(1)}%`);
    for (let i = 5; i >= 0; i--) pts.push(`${(i / 6 * 100).toFixed(1)}% ${(100 - rnd() * 1.6).toFixed(2)}%`);
    for (let i = 9; i >= 1; i--) pts.push(`${(rnd() * 2.2).toFixed(2)}% ${(i / 10 * 100).toFixed(1)}%`);
    return `polygon(${pts.join(',')})`;
  }

  function build() {
    field = $('.notes-field');
    $('#notes .brush-title').textContent = C.title;
    $('.notes-sub').textContent = C.sub;
    const rnd = NV.seeded(20);
    notes = C.items.map((it, i) => {
      const b = el('button', 'jian');
      b.type = 'button';
      b.setAttribute('aria-label', `第${NV.cnNum(i + 1)}笺 · ${it.k}`);
      const tint = TINTS[Math.floor(rnd() * TINTS.length)];
      b.style.setProperty('--tint', tint);
      b.style.setProperty('--edge', edge(rnd));
      b.style.setProperty('--bob', (4 + rnd() * 3).toFixed(2) + 's');
      b.style.setProperty('--delay', (-rnd() * 6).toFixed(2) + 's');
      b.innerHTML = `<span class="jian-move"><span class="jian-float"><span class="jian-paper">
          <span class="jian-no">第${NV.cnNum(i + 1)}笺</span>
          <span class="jian-key"></span>
          <span class="jian-seal">笺</span>
        </span></span></span>`;
      $('.jian-key', b).textContent = it.k;
      if (it.k.length > 2) $('.jian-key', b).style.fontSize = `calc(var(--w) * ${(0.84 / it.k.length).toFixed(2)})`;
      b.addEventListener('click', () => open(i));
      field.appendChild(b);
      return { b, tint, z: 1, r: 0, move: $('.jian-move', b), paper: $('.jian-paper', b) };
    });
  }

  /* 随手摆放：打散的网格 + 远近 + 旋转 */
  function layout() {
    const mobile = NV.isMobile();
    const fw = field.clientWidth;
    const w = mobile ? 58 : 76, h = mobile ? 150 : 200;
    const cols = mobile ? 4 : 7;
    const rows = Math.ceil(notes.length / cols);
    const cw = fw / cols, ch = h * (mobile ? 1.12 : 1.18);
    field.style.height = rows * ch + h * 0.5 + 'px';
    const rnd = NV.seeded(7);
    // 打乱格子顺序，让纸笺不是按顺序排
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([r, c]);
    for (let i = cells.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [cells[i], cells[k]] = [cells[k], cells[i]]; }
    notes.forEach((o, i) => {
      const [r, c] = cells[i];
      const x = (c + 0.5) * cw + (rnd() - 0.5) * cw * 0.55;
      const y = (r + 0.5) * ch + h * 0.25 + (rnd() - 0.5) * ch * 0.35 + (c % 2 ? ch * 0.18 : 0);
      o.z = 0.76 + rnd() * 0.38;
      o.r = (rnd() - 0.5) * 26;
      const far = o.z < 0.86;
      Object.assign(o.b.style, { left: clamp(x, w * 0.7, fw - w * 0.7) + 'px', top: y + 'px' });
      o.b.style.setProperty('--w', w + 'px');
      o.b.style.setProperty('--h', h + 'px');
      o.b.style.setProperty('--z', o.z.toFixed(3));
      o.b.style.setProperty('--r', o.r.toFixed(1) + 'deg');
      o.b.style.setProperty('--zi', Math.round(o.z * 100));
      o.b.style.setProperty('--blur', far ? 'blur(.7px)' : 'none');
      o.b.style.setProperty('--dim', far ? '.86' : '1');
    });
  }

  /* 视差：鼠标 + 滚动，越近的纸笺移动越多 */
  function parallax() {
    if (visible) {
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      const r = field.getBoundingClientRect();
      const sp = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // 区块相对屏幕中央的位置
      notes.forEach((o) => {
        const d = o.z - 0.95;
        o.move.style.transform = `translate3d(${(mouse.x * d * 60).toFixed(1)}px, ${(mouse.y * d * 40 + sp * d * 160).toFixed(1)}px, 0)`;
      });
    }
    requestAnimationFrame(parallax);
  }

  function setCount() {
    $('.notes-count').textContent = read.size === notes.length ? C.done : read.size ? `已拆 ${read.size} / ${notes.length}` : C.hint;
  }

  function fill(i) {
    const it = C.items[i];
    $('.jian-open-no', card).textContent = `第${NV.cnNum(i + 1)}笺`;
    $('.jian-open-key', card).textContent = it.k;
    NV.text($('.jian-open-text', card), it.t);
    $('.jian-open-sign', card).textContent = '写给二十岁的你';
    card.style.setProperty('--tint', notes[i].tint);
    $('.jian-prev', card).disabled = i === 0;
    $('.jian-next', card).disabled = i === notes.length - 1;
  }

  const inner = () => $$('.jian-open > *', card);

  function open(i) {
    if (busy) return;
    busy = true; cur = i;
    const o = notes[i];
    fill(i);
    modal.hidden = false;
    document.body.classList.add('is-quiet');
    NV.sound.chime(i);
    const nr = o.paper.getBoundingClientRect();
    gsap.set(card, { clearProps: 'transform' });
    const fr = card.getBoundingClientRect();
    const dx = nr.left + nr.width / 2 - (fr.left + fr.width / 2);
    const dy = nr.top + nr.height / 2 - (fr.top + fr.height / 2);
    const sx = (o.paper.offsetWidth * o.z) / fr.width, sy = (o.paper.offsetHeight * o.z) / fr.height;
    o.b.style.visibility = 'hidden';
    gsap.set(inner(), { opacity: 0 });
    gsap.timeline({ onComplete: () => { busy = false; $('.jian-close', card).focus({ preventScroll: true }); } })
      .to('.jian-backdrop', { opacity: 1, duration: 0.6 }, 0)
      .fromTo(card, { x: dx, y: dy, scaleX: sx, scaleY: sy, rotation: o.r }, { x: 0, y: 0, scaleY: 1, rotation: 0, duration: 0.7, ease: 'power3.inOut' }, 0)
      .to(card, { scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, 0.55)
      .fromTo(inner(), { opacity: 0, y: 10, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, stagger: 0.12 }, 1.0);
  }

  function close() {
    if (busy || cur < 0) return;
    busy = true;
    const o = notes[cur];
    o.b.style.visibility = 'hidden';
    const fr = card.getBoundingClientRect();
    gsap.set(card, { clearProps: 'transform' });
    const base = card.getBoundingClientRect();
    const nr = o.paper.getBoundingClientRect();
    const dx = nr.left + nr.width / 2 - (base.left + base.width / 2);
    const dy = nr.top + nr.height / 2 - (base.top + base.height / 2);
    const sx = (o.paper.offsetWidth * o.z) / base.width, sy = (o.paper.offsetHeight * o.z) / base.height;
    void fr;
    gsap.timeline({
      onComplete: () => {
        modal.hidden = true; busy = false;
        document.body.classList.remove('is-quiet');
        o.b.style.visibility = '';
        if (!read.has(cur)) markRead(cur);
        o.b.focus({ preventScroll: true });
        cur = -1;
      },
    })
      .to(inner(), { opacity: 0, duration: 0.3 }, 0)
      .to(card, { scaleX: sx, duration: 0.45, ease: 'power2.inOut' }, 0.15)
      .to(card, { x: dx, y: dy, scaleY: sy, rotation: o.r, duration: 0.65, ease: 'power3.inOut' }, 0.5)
      .to('.jian-backdrop', { opacity: 0, duration: 0.5 }, 0.6);
  }

  function markRead(i) {
    read.add(i);
    const o = notes[i];
    o.b.classList.add('read');
    $('.jian-seal', o.b).textContent = '阅';
    gsap.fromTo($('.jian-seal', o.b), { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(3)' });
    const r = o.paper.getBoundingClientRect();
    NV.fx.motes(r.left + r.width / 2, r.top + r.height / 2, 10, { spread: 30 });
    setCount();
    if (read.size === notes.length) {
      // 二十笺都拆完：每一张依次亮一下
      notes.forEach((x, k) => gsap.fromTo(x.paper, { filter: 'brightness(1.25)' }, { filter: 'brightness(1)', duration: 1.2, delay: k * 0.06 }));
      NV.sound.bloom();
    }
  }

  function step(d) {
    if (busy) return;
    const ni = cur + d;
    if (ni < 0 || ni >= notes.length) return;
    busy = true;
    gsap.to(inner(), {
      opacity: 0, x: -20 * d, duration: 0.3,
      onComplete: () => {
        if (!read.has(cur)) markRead(cur);
        cur = ni; fill(ni);
        NV.sound.chime(ni);
        gsap.fromTo(inner(), { opacity: 0, x: 20 * d }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.05, onComplete: () => (busy = false) });
      },
    });
  }

  n.init = () => {
    build();
    modal = $('#jian-modal');
    card = $('.jian-open');
    layout();
    setCount();
    addEventListener('resize', layout);
    $('.jian-close').addEventListener('click', close);
    $('.jian-backdrop').addEventListener('click', close);
    $('.jian-prev').addEventListener('click', () => step(-1));
    $('.jian-next').addEventListener('click', () => step(1));
    addEventListener('keydown', (e) => {
      if (modal.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
    if (NV.finePointer) addEventListener('pointermove', (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
    new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '20% 0px' }).observe(field);
    if (!NV.reduced) parallax();

    // 入场：纸笺从雾里浮出来
    gsap.from('.notes-head > *', { opacity: 0, y: 24, filter: 'blur(8px)', duration: 1.6, stagger: 0.25, scrollTrigger: { trigger: '.notes-head', start: 'top 80%' } });
    gsap.from(notes.map((o) => o.b), {
      opacity: 0, y: 60, duration: 1.6, ease: 'power2.out', stagger: { each: 0.06, from: 'random' },
      scrollTrigger: { trigger: field, start: 'top 85%' },
    });
  };

  NV.notes = n;
})(window.NV);

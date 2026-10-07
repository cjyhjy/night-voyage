/* 第八幕「给你」：一封信漂到湖心。拆开时，一切安静下来，只剩宣纸和字 */
(function (NV) {
  const { $, el } = NV;
  const C = window.CONTENT.letter;
  const lt = {};
  let sheet, opened = false, busy = false;

  function build() {
    $('.env-title').textContent = C.cover;
    $('.env-sub').textContent = C.coverSub;
    $('.env-hint').textContent = C.open;
    sheet = $('#letter-sheet');
    $('.sheet-greeting').textContent = NV.fill(C.greeting);
    const body = $('.sheet-body');
    C.body.forEach((p) => body.appendChild(el('p', '', p)));
    const cl = $('.sheet-closing');
    C.closing.forEach((p) => cl.appendChild(el('p', '', p)));
    $('.sheet-sign').textContent = '—— ' + window.CONTENT.meta.signature;
    $('.sheet-close span').textContent = C.close;
  }

  function open() {
    if (busy || opened) return;
    busy = opened = true;
    const r = $('.env-paper').getBoundingClientRect();
    NV.sound.mood('letter');
    NV.sound.chime(1);
    document.body.classList.add('is-reading', 'is-quiet');
    NV.world.pause(true);
    sheet.hidden = false;
    $('.sheet-scroll').scrollTop = 0;
    const cx = ((r.left + r.width / 2) / innerWidth) * 100, cy = ((r.top + r.height / 2) / innerHeight) * 100;
    const parts = $$parts();
    gsap.set(parts, { opacity: 0 });
    gsap.timeline({ onComplete: () => (busy = false) })
      .to('.env-seal', { scale: 1.4, opacity: 0, duration: 0.5 })
      .fromTo(sheet, { clipPath: `circle(0% at ${cx}% ${cy}%)` }, { clipPath: `circle(150% at ${cx}% ${cy}%)`, duration: 1.6, ease: 'power2.inOut' }, 0.2)
      .fromTo(parts, { opacity: 0, y: 12, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, stagger: 0.35, ease: 'power2.out' }, 1.4);
  }
  const $$parts = () => NV.$$('.sheet-greeting, .sheet-body p, .sheet-closing p, .sheet-sign, .sheet-close');

  /* 合卷：宣纸向上卷起，露出已经快要天亮的山水 */
  function close() {
    if (busy) return;
    busy = true;
    gsap.timeline({
      onComplete: () => {
        sheet.hidden = true;
        document.body.classList.remove('is-reading', 'is-quiet');
        NV.world.pause(false);
        gsap.set('.env-seal', { scale: 1, opacity: 1 });
        busy = false; opened = false;
        const dawn = $('#dawn');
        scrollTo({ top: dawn.getBoundingClientRect().top + scrollY + innerHeight * 0.05, behavior: 'smooth' });
        NV.sound.mood('dawn');
      },
    })
      .to($$parts(), { opacity: 0, duration: 0.6, stagger: 0.03 })
      .fromTo(sheet, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.4, ease: 'power3.inOut' }, 0.4);
  }

  lt.init = () => {
    build();
    $('.envelope').addEventListener('click', open);
    $('.sheet-close').addEventListener('click', close);
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && opened) close(); });
    // 信从湖面漂过来
    gsap.fromTo('.envelope', { opacity: 0, y: 120, rotation: -8 }, {
      opacity: 1, y: 0, rotation: 0, ease: 'power2.out',
      scrollTrigger: { trigger: '#letter', start: 'top 85%', end: 'center 55%', scrub: 1.2 },
    });
  };

  NV.letter = lt;
})(window.NV);

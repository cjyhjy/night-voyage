/* 启动：按顺序初始化各章节，并处理声音按钮、进度线、章节标签、配乐切换 */
(function (NV) {
  const { $, $$ } = NV;
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });
  document.title = window.CONTENT.meta.title;
  history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  const MOOD = { voyage: 'boat', her: 'her', twenty: 'twenty', notes: 'notes', wishes: 'wishes', meeting: 'meeting', letter: 'meeting', dawn: 'dawn' };

  function boot() {
    NV.world.init();
    NV.fx.init();
    NV.opening.init();
    ['her', 'twenty', 'notes', 'wishes', 'meeting', 'letter', 'dawn'].forEach((k) => NV[k] && NV[k].init());

    // 声音按钮
    const btn = $('#sound');
    btn.addEventListener('click', () => NV.sound.toggle());
    NV.on('sound', (on) => btn.setAttribute('aria-pressed', String(on)));

    // 右侧细金线：整卷的进度
    const bar = $('.progress i');
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => (bar.style.transform = `scaleY(${s.progress.toFixed(4)})`) });

    // 章节标签 + 配乐情绪
    const tag = $('.act-tag');
    let tagTimer = 0;
    $$('.chapter').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 45%',
        onToggle: (s) => {
          if (!s.isActive) return;
          if (!document.body.classList.contains('is-reading')) NV.sound.mood(MOOD[sec.id] || 'her');
          if (sec.id === 'voyage') { tag.classList.remove('show'); return; }
          tag.textContent = sec.dataset.act;
          tag.classList.add('show');
          clearTimeout(tagTimer);
          tagTimer = setTimeout(() => tag.classList.remove('show'), 4200);
        },
      });
    });

    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { ScrollTrigger.refresh(); NV.world.measure(); }, 200); });
    NV.on('opened', () => NV.world.measure());
    ScrollTrigger.refresh();
    NV.world.measure();

  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.NV);

/* 背景世界：一整幅山水 + 月亮 + 雾 + 晨光，随滚动从深夜走向清晨 */
(function (NV) {
  const { $, clamp, lerp, smooth } = NV;
  const IMG_W = 1536, IMG_H = 1024;
  const MOON = { x: 1165 / IMG_W, y: 268 / IMG_H };
  const HORIZON = 0.69;

  /* 天色关键帧：[章节, 章节内位置(0~1，指该位置处于屏幕中央时), 参数]
     blue：夜→蓝调；dawn：蓝调→清晨；fog：雾浓度；shade：压暗程度（保证文字可读） */
  const KEYS = [
    ['#voyage', 0.5, { blue: 0, dawn: 0, fog: 0.3, shade: 0.15 }],
    ['#her', 0.1, { blue: 0, dawn: 0, fog: 0.95, shade: 0.3 }],
    ['#her', 0.45, { blue: 0, dawn: 0, fog: 0.4, shade: 0.35 }],
    ['#twenty', 0.55, { blue: 0.02, dawn: 0, fog: 0.35, shade: 0.4 }],
    ['#twenty', 1.0, { blue: 0.22, dawn: 0, fog: 0.4, shade: 0.4 }],
    ['#notes', 0.5, { blue: 0.25, dawn: 0, fog: 0.3, shade: 0.5 }],
    ['#wishes', 0.05, { blue: 0.3, dawn: 0, fog: 0.4, shade: 0.4 }],
    ['#wishes', 0.55, { blue: 1, dawn: 0.05, fog: 0.5, shade: 0.35 }],
    ['#meeting', 0.2, { blue: 1, dawn: 0.15, fog: 0.35, shade: 0.35 }],
    ['#meeting', 1.0, { blue: 1, dawn: 0.38, fog: 0.4, shade: 0.3 }],
    ['#letter', 0.5, { blue: 1, dawn: 0.5, fog: 0.45, shade: 0.25 }],
    ['#dawn', 0.25, { blue: 1, dawn: 0.88, fog: 0.4, shade: 0.12 }],
    ['#dawn', 0.85, { blue: 1, dawn: 1, fog: 0.3, shade: 0 }],
    ['#secret', 0.5, { blue: 1, dawn: 1, fog: 0.5, shade: 0.05 }],
  ];

  const world = {};
  let els, keys = [], rect = { x: 0, y: 0, w: 1, h: 1, s: 1 };
  let state = { blue: 0, dawn: 0, fog: 0.3, shade: 0.15, p: 0 };
  let boost = 0; // 许愿完成后的一次晨光
  let dirty = true;

  world.init = () => {
    els = {
      world: $('#world'),
      scene: $('#world .scene'),
      night: $('.scene-img.night'),
      blue: $('.scene-img.blue'),
      dawn: $('.scene-img.dawn'),
      moon: $('.moon'),
      halo: $('.moon-halo'),
      sun: $('.sun'),
      fogFar: $('.fog-far'),
      fogNear: $('.fog-near'),
      shade: $('.world-shade'),
      haze: $('.dawn-haze'),
    };
    layout();
    addEventListener('resize', () => { layout(); measure(); dirty = true; });
    addEventListener('scroll', () => (dirty = true), { passive: true });
    tick();
  };

  function layout() {
    const vw = innerWidth, vh = innerHeight;
    const s = Math.max(vw / IMG_W, vh / IMG_H) * 1.1;
    const w = IMG_W * s, h = IMG_H * s;
    // 竖屏时把画面往右挪，让月亮和右侧山峰留在画里
    const ax = NV.portrait() ? 0.66 : 0.5;
    let x = vw / 2 - w * ax;
    x = clamp(x, vw - w, 0);
    const y = (vh - h) / 2;
    rect = { x, y, w, h, s };
    Object.assign(els.scene.style, { width: w + 'px', height: h + 'px', left: x + 'px', top: y + 'px' });
    document.documentElement.style.setProperty('--fog-h', Math.round(vh * 0.55) + 'px');
  }

  function measure() {
    const vh = innerHeight;
    keys = KEYS.map(([sel, f, v]) => {
      const el = $(sel);
      if (!el) return null;
      const top = el.getBoundingClientRect().top + scrollY;
      return { y: Math.max(0, top + f * el.offsetHeight - vh / 2), v };
    }).filter(Boolean).sort((a, b) => a.y - b.y);
  }
  world.measure = () => { measure(); dirty = true; };

  function sample(y) {
    if (!keys.length) return KEYS[0][2];
    if (y <= keys[0].y) return keys[0].v;
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (y <= b.y) {
        const t = smooth(clamp((y - a.y) / Math.max(1, b.y - a.y)));
        const o = {};
        for (const k in a.v) o[k] = lerp(a.v[k], b.v[k], t);
        return o;
      }
    }
    return keys[keys.length - 1].v;
  }

  function tick() {
    if (dirty) {
      dirty = false;
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const p = clamp(scrollY / max);
      state = Object.assign(sample(scrollY), { p });
      apply();
    }
    requestAnimationFrame(tick);
  }

  function apply() {
    const { blue, fog, shade, p } = state;
    const dawn = clamp(state.dawn + boost * (1 - state.dawn));
    els.blue.style.opacity = blue.toFixed(3);
    els.dawn.style.opacity = dawn.toFixed(3);
    const moonFade = 1 - smooth(clamp(dawn * 1.15));
    els.moon.style.opacity = moonFade.toFixed(3);
    els.halo.style.opacity = (moonFade * (0.75 + fog * 0.25)).toFixed(3);
    const sink = (blue * 0.35 + dawn * 0.65) * 0.07 * rect.h; // 月亮慢慢西沉
    els.moon.style.transform = els.halo.style.transform = `translate(-50%, calc(-50% + ${sink.toFixed(1)}px))`;
    els.sun.style.opacity = smooth(clamp((dawn - 0.3) / 0.7)).toFixed(3);
    els.haze.style.opacity = (smooth(clamp((dawn - 0.25) / 0.75)) * 0.7).toFixed(3);
    els.fogFar.style.opacity = (0.18 + fog * 0.42).toFixed(3);
    els.fogNear.style.opacity = (fog * 0.6).toFixed(3);
    els.fogNear.style.transform = `translate3d(0, ${(18 - p * 34).toFixed(2)}vh, 0)`;
    els.fogFar.style.transform = `translate3d(0, ${(6 - p * 10).toFixed(2)}vh, 0)`;
    els.shade.style.opacity = shade.toFixed(3);
    els.scene.style.transform = `translate3d(0, ${(-p * 4).toFixed(3)}%, 0)`;
    document.documentElement.style.setProperty('--dawn', dawn.toFixed(3));
    world.state = Object.assign({}, state, { dawn });
  }

  world.flash = () => {
    // 四个愿望都许下：天色提前亮一点，然后慢慢回到原本的节奏
    gsap.to({ v: 0 }, {
      v: 1, duration: 6, ease: 'none',
      onUpdate() { const t = this.targets()[0].v; boost = Math.sin(t * Math.PI) * 0.35; dirty = true; },
      onComplete() { boost = 0; dirty = true; },
    });
  };

  /* 月亮在屏幕上的位置（给「明亮」等文字定位用） */
  world.moonScreen = () => {
    const r = els.scene.getBoundingClientRect();
    return { x: r.left + MOON.x * r.width, y: r.top + MOON.y * r.height, r: r.width * 0.016 };
  };
  world.horizonY = () => {
    const r = els.scene.getBoundingClientRect();
    return r.top + HORIZON * r.height;
  };
  world.pause = (on) => els.world.classList.toggle('paused', on);
  world.state = state;

  NV.world = world;
})(window.NV);

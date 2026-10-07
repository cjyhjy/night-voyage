/* 通用小工具 + 全局命名空间 NV */
window.NV = window.NV || {};
(function (NV) {
  const C = window.CONTENT;

  NV.$ = (s, r = document) => r.querySelector(s);
  NV.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  NV.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  NV.lerp = (a, b, t) => a + (b - a) * t;
  NV.invLerp = (a, b, v) => NV.clamp((v - a) / (b - a));
  NV.smooth = (t) => t * t * (3 - 2 * t);
  NV.rand = (a, b) => a + Math.random() * (b - a);

  // 可复现的伪随机（让纸笺每次打开都是同一种“随手摆放”）
  NV.seeded = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  NV.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  NV.finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  NV.isMobile = () => innerWidth < 760;
  NV.portrait = () => innerHeight > innerWidth * 1.05;

  NV.herName = () => (C.meta.herName || '').trim();
  NV.fill = (s) => String(s).replace('{name}', NV.herName() || '亲爱的你');

  /* 把文字放进元素：\n 变成换行，可选按行包裹 span */
  NV.text = (el, s) => {
    el.textContent = '';
    String(s).split('\n').forEach((line, i) => {
      if (i) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(line));
    });
    return el;
  };
  NV.el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) NV.text(e, text);
    return e;
  };

  const NUM = '零一二三四五六七八九十';
  NV.cnNum = (n) => {
    if (n <= 10) return NUM[n];
    if (n < 20) return '十' + (n % 10 ? NUM[n % 10] : '');
    return NUM[Math.floor(n / 10)] + '十' + (n % 10 ? NUM[n % 10] : '');
  };

  /* 简单的事件中心 */
  const bus = {};
  NV.on = (k, f) => (bus[k] = bus[k] || []).push(f);
  NV.emit = (k, v) => (bus[k] || []).forEach((f) => f(v));

  NV.svg = (tag, attrs = {}) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };

  /* 一个金色墨梅（五瓣），用于愿望集齐与彩蛋 */
  NV.blossomPaths = () => {
    const petals = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const r = 17;
      const cx = Math.cos(a) * r, cy = Math.sin(a) * r;
      const rot = (a * 180) / Math.PI + 90;
      petals.push({ cx, cy, rot });
    }
    return petals;
  };
})(window.NV);

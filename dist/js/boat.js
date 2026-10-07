/* 俯视小舟：船身与船橹是两张图（tools/build_boat.py 生成），船橹单独摇动，船头灯叠一层光晕。
   船头朝 +x。整个元素对应一个 300×96 的坐标框（x: -175~125，y: -48~48），船身中心在 (0,0)，
   这样开场、相逢、天明里的定位代码不用关心图片尺寸。
   opts.canopy：true 为她的船（墨绿）；false 为相逢里“我”的船（墨蓝）
   opts.lantern：是否叠加船头灯光晕 */
(function (NV) {
  // 原图（tools/src-img/boat-top.webp）中的像素位置，由 build_boat.py 输出
  const PX = { hull: [451, 168, 1955, 478], oar: [42, 308, 454, 440], pivot: [452, 323], lamp: [1751, 317], cy: 323 };
  const HULL_X = [-99, 103];                       // 船身在坐标框里的左右端
  const k = (HULL_X[1] - HULL_X[0]) / (PX.hull[2] - PX.hull[0]);
  const ux = (px) => HULL_X[0] + (px - PX.hull[0]) * k;
  const uy = (py) => (py - PX.cy) * k;
  const box = (x0, y0, x1, y1) => ({
    left: ((ux(x0) + 175) / 3).toFixed(3) + '%',
    top: ((uy(y0) + 48) / 0.96).toFixed(3) + '%',
    width: (((x1 - x0) * k) / 3).toFixed(3) + '%',
    height: (((y1 - y0) * k) / 0.96).toFixed(3) + '%',
  });
  const HULL = box(...PX.hull);
  const OAR = box(...PX.oar);
  const OAR_ORIGIN = `${(((PX.pivot[0] - PX.oar[0]) / (PX.oar[2] - PX.oar[0])) * 100).toFixed(1)}% ${(((PX.pivot[1] - PX.oar[1]) / (PX.oar[3] - PX.oar[1])) * 100).toFixed(1)}%`;
  const LAMP = { left: ((ux(PX.lamp[0]) + 175) / 3).toFixed(3) + '%', top: ((uy(PX.lamp[1]) + 48) / 0.96).toFixed(3) + '%' };

  function img(cls, src, pos) {
    const i = document.createElement('img');
    i.className = cls;
    i.src = src;
    i.alt = '';
    i.decoding = 'async';
    i.draggable = false;
    Object.assign(i.style, pos);
    return i;
  }

  NV.boat = {
    create(opts = {}) {
      const el = document.createElement('div');
      el.className = 'boat boat-img' + (opts.cls ? ' ' + opts.cls : '');
      el.setAttribute('aria-hidden', 'true');
      const shadow = document.createElement('i');
      shadow.className = 'boat-shadow';
      const oar = img('oar', 'assets/img/oar.webp', OAR);
      oar.style.transformOrigin = OAR_ORIGIN;
      const hull = img('hull', opts.canopy === false ? 'assets/img/boat-blue.webp' : 'assets/img/boat.webp', HULL);
      el.append(shadow, oar, hull);
      if (opts.lantern !== false) {
        const lamp = document.createElement('i');
        lamp.className = 'boat-lamp';
        Object.assign(lamp.style, LAMP);
        el.appendChild(lamp);
      }
      return el;
    },
  };
})(window.NV);

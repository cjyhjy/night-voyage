/* 俯视的水墨小舟（SVG）。船头朝 +x，船长约 200 个单位。 */
(function (NV) {
  let uid = 0;

  NV.boat = {
    /* opts.canopy：有没有乌篷；opts.lantern：船头小灯 */
    create(opts = {}) {
      const id = 'b' + uid++;
      const canopy = opts.canopy !== false;
      const svg = NV.svg('svg', { viewBox: '-175 -48 300 96', class: 'boat' + (opts.cls ? ' ' + opts.cls : '') });
      svg.innerHTML = `
        <defs>
          <linearGradient id="${id}h" x1="0" y1="-1" x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stop-color="#0a1214"/><stop offset=".5" stop-color="#22302f"/><stop offset="1" stop-color="#0a1214"/>
          </linearGradient>
          <radialGradient id="${id}s"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
          <radialGradient id="${id}l"><stop offset="0" stop-color="#ffe7b0" stop-opacity=".95"/><stop offset=".25" stop-color="#f3c77c" stop-opacity=".5"/><stop offset="1" stop-color="#f3c77c" stop-opacity="0"/></radialGradient>
          <pattern id="${id}w" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 3h6M3 0v6" stroke="#c9a96a" stroke-opacity=".28" stroke-width=".7"/>
          </pattern>
        </defs>
        <ellipse class="boat-shadow" cx="-2" cy="6" rx="118" ry="30" fill="url(#${id}s)"/>
        <g class="oar">
          <path d="M-92 7 L-158 24" stroke="#c9a96a" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>
          <path d="M-150 21 q-14 6 -20 9 q4 -8 12 -14z" fill="#162224" stroke="#c9a96a" stroke-width=".8"/>
        </g>
        <path class="hull" d="M100 0 C72 -17 12 -20 -58 -18 C-86 -17 -97 -10 -98 0 C-97 10 -86 17 -58 18 C12 20 72 17 100 0Z"
              fill="url(#${id}h)" stroke="#c9a96a" stroke-width="1.3"/>
        <path d="M88 0 C64 -12 12 -14.5 -55 -13 C-78 -12.5 -87 -7 -88 0 C-87 7 -78 12.5 -55 13 C12 14.5 64 12 88 0Z"
              fill="none" stroke="#c9a96a" stroke-opacity=".45" stroke-width=".8"/>
        <path d="M70 0 H-80 M60 -5 H-70 M60 5 H-70" stroke="#000" stroke-opacity=".35" stroke-width=".8"/>
        <path d="M58 -11 V11 M-62 -12 V12" stroke="#c9a96a" stroke-opacity=".8" stroke-width="1.1"/>
        ${canopy ? `
        <g class="canopy">
          <rect x="-36" y="-19.5" width="64" height="39" rx="9" fill="#17140f" stroke="#c9a96a" stroke-width="1.1"/>
          <rect x="-36" y="-19.5" width="64" height="39" rx="9" fill="url(#${id}w)"/>
          <path d="M-26 -19 V19 M-12 -19.5 V19.5 M2 -19.5 V19.5 M16 -19 V19" stroke="#c9a96a" stroke-opacity=".7" stroke-width=".9"/>
          <path d="M-36 0 H28" stroke="#f2e9d3" stroke-opacity=".12" stroke-width="5"/>
        </g>` : `
        <g class="sail">
          <path d="M18 0 L18 0" stroke="#c9a96a"/>
          <path d="M22 -15 Q4 0 22 15" fill="none" stroke="#f2e9d3" stroke-opacity=".75" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M22 -15 V15" stroke="#c9a96a" stroke-width="1.2"/>
          <circle cx="22" cy="0" r="2.4" fill="#c9a96a"/>
        </g>`}
        ${opts.lantern !== false ? `
        <g class="boat-lamp">
          <circle cx="78" cy="0" r="34" fill="url(#${id}l)" class="lantern-glow"/>
          <circle cx="78" cy="0" r="3" fill="#fff3cf"/>
        </g>` : ''}
      `;
      return svg;
    },
  };
})(window.NV);

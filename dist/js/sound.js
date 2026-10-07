/* 声音：全部用 Web Audio 实时合成（水声 + 类古琴拨弦 + 很轻的铺底），
   只在点击「入卷」之后开始。content.js 里填了 sound.bgm 的话，会用那首音乐代替合成旋律。 */
(function (NV) {
  const S = { on: false, started: false };
  let ac, master, music, sfx, verb, water, waterLP, pad, padNotes = [];
  let bgm = null, timer = 0, mood = 'water';
  const cache = new Map();

  // D 宫五声音阶（MIDI）
  const SCALE = [50, 52, 54, 57, 59, 62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86];
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const MOODS = {
    //        旋律音量 间隔(秒)      音区下限/上限  水声  铺底
    water:   { mus: 0,    gap: [3, 5],     lo: 3, hi: 8,  wat: 0.55, pad: 0 },
    boat:    { mus: 0.5,  gap: [2.4, 4.2], lo: 3, hi: 9,  wat: 0.45, pad: 0.0 },
    her:     { mus: 0.6,  gap: [1.7, 3.4], lo: 4, hi: 10, wat: 0.32, pad: 0.035 },
    twenty:  { mus: 0.7,  gap: [1.2, 2.6], lo: 5, hi: 11, wat: 0.28, pad: 0.05 },
    notes:   { mus: 0.6,  gap: [1.6, 3.2], lo: 5, hi: 11, wat: 0.3,  pad: 0.045 },
    wishes:  { mus: 0.65, gap: [1.5, 3],   lo: 5, hi: 12, wat: 0.3,  pad: 0.085 },
    meeting: { mus: 0.65, gap: [1.4, 3],   lo: 4, hi: 11, wat: 0.3,  pad: 0.07 },
    letter:  { mus: 0.12, gap: [4, 7],     lo: 3, hi: 8,  wat: 0.12, pad: 0.015 },
    dawn:    { mus: 0.8,  gap: [1.1, 2.4], lo: 6, hi: 13, wat: 0.3,  pad: 0.08 },
  };

  function impulse(sec = 3.4) {
    const len = ac.sampleRate * sec, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return b;
  }

  /* Karplus-Strong 拨弦：听起来接近古琴 / 古筝 */
  function string(f) {
    const key = Math.round(f * 10);
    if (cache.has(key)) return cache.get(key);
    const sr = ac.sampleRate, len = Math.floor(sr * 4.5), N = Math.max(2, Math.round(sr / f));
    const b = ac.createBuffer(1, len, sr), y = b.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < N; i++) { lp = lp * 0.55 + (Math.random() * 2 - 1) * 0.45; y[i] = lp; }
    const damp = 0.9972 - f / 120000;
    for (let i = N; i < len; i++) y[i] = (y[i - N] + y[i - N + 1]) * 0.5 * damp;
    cache.set(key, b);
    return b;
  }

  function pluck(m, vel = 0.5, when = 0, pan = 0, bus = music) {
    const src = ac.createBufferSource();
    src.buffer = string(hz(m));
    const g = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : null;
    const t = ac.currentTime + when;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.006);
    g.gain.setTargetAtTime(0, t + 2.6, 0.9);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    src.connect(lp).connect(g);
    if (p) { p.pan.value = pan; g.connect(p).connect(bus); } else g.connect(bus);
    src.start(t);
    src.stop(t + 4.6);
  }

  function buildWater() {
    const len = ac.sampleRate * 6, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02; d[i] = last * 3.2; }
    }
    const src = ac.createBufferSource();
    src.buffer = b; src.loop = true;
    waterLP = ac.createBiquadFilter();
    waterLP.type = 'lowpass'; waterLP.frequency.value = 420;
    const lfo = ac.createOscillator(), lfoG = ac.createGain();
    lfo.frequency.value = 0.07; lfoG.gain.value = 160;
    lfo.connect(lfoG).connect(waterLP.frequency);
    water = ac.createGain(); water.gain.value = 0;
    src.connect(waterLP).connect(water).connect(master);
    src.start(); lfo.start();
  }

  function buildPad() {
    pad = ac.createGain(); pad.gain.value = 0;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    pad.connect(lp).connect(music);
    [50, 57, 62, 66].forEach((m, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = i ? 'sine' : 'triangle';
      o.frequency.value = hz(m); o.detune.value = (i - 1.5) * 4;
      g.gain.value = i === 3 ? 0.35 : 0.6;
      o.connect(g).connect(pad); o.start();
      padNotes.push(g);
    });
  }

  /* 随机漫步式的旋律：五声音阶，小步进行，偶尔停顿 */
  let idx = 7, phrase = 0;
  function schedule() {
    const M = MOODS[mood];
    if (!bgm && M.mus > 0 && S.on) {
      const step = [-2, -1, -1, 1, 1, 2, 0, -3, 3][(Math.random() * 9) | 0];
      idx = Math.max(M.lo, Math.min(M.hi, idx + step));
      const pan = (Math.random() - 0.5) * 0.6;
      pluck(SCALE[idx], 0.3 * M.mus + Math.random() * 0.08, 0, pan);
      if (Math.random() < 0.18 && idx - 3 >= 0) pluck(SCALE[idx - 3], 0.16 * M.mus, 0.02, -pan);
      if (Math.random() < 0.12) pluck(SCALE[Math.min(SCALE.length - 1, idx + 1)], 0.12 * M.mus, 0.22, pan);
      phrase++;
    }
    let gap = M.gap[0] + Math.random() * (M.gap[1] - M.gap[0]);
    if (phrase > 3 + Math.random() * 4) { gap *= 2.2; phrase = 0; }
    timer = setTimeout(schedule, gap * 1000);
  }

  S.start = () => {
    if (S.started) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0;
      master.connect(ac.destination);
      verb = ac.createConvolver(); verb.buffer = impulse();
      const wet = ac.createGain(); wet.gain.value = 0.55;
      verb.connect(wet).connect(master);
      music = ac.createGain(); music.gain.value = 1;
      music.connect(master); music.connect(verb);
      sfx = ac.createGain(); sfx.gain.value = 1;
      sfx.connect(master); sfx.connect(verb);
      buildWater();
      buildPad();
      const src = window.CONTENT.sound.bgm;
      if (src) {
        bgm = new Audio(src);
        bgm.loop = true; bgm.crossOrigin = 'anonymous';
        const node = ac.createMediaElementSource(bgm), g = ac.createGain();
        g.gain.value = 0.7;
        node.connect(g).connect(music);
        bgm.play().catch(() => {});
      }
      S.started = S.on = true;
      master.gain.setTargetAtTime(0.9, ac.currentTime, 1.2);
      S.mood('water');
      schedule();
      NV.emit('sound', true);
    } catch (e) {
      console.warn('sound unavailable', e);
    }
  };

  S.mood = (name) => {
    if (!ac || !MOODS[name]) return;
    mood = name;
    const M = MOODS[name], t = ac.currentTime;
    water.gain.setTargetAtTime(M.wat, t, 1.5);
    pad.gain.setTargetAtTime(M.pad, t, 2.5);
    music.gain.setTargetAtTime(name === 'letter' ? 0.25 : 1, t, 1.2);
    if (bgm) bgm.volume = name === 'letter' ? 0.25 : 1;
    // 天亮时铺底多一个音，更暖
    padNotes[3] && padNotes[3].gain.setTargetAtTime(name === 'dawn' || name === 'wishes' ? 0.5 : 0.2, t, 3);
  };

  S.toggle = () => {
    if (!S.started) { S.start(); return true; }
    S.on = !S.on;
    master.gain.setTargetAtTime(S.on ? 0.9 : 0, ac.currentTime, 0.4);
    if (bgm) S.on ? bgm.play().catch(() => {}) : bgm.pause();
    NV.emit('sound', S.on);
    return S.on;
  };

  /* 一滴水 */
  S.drop = () => {
    if (!ac || !S.on) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(1500, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.14);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(sfx);
    o.start(t); o.stop(t + 0.4);
  };

  /* 点灯 / 拆笺时的一声 */
  S.chime = (i = 0) => {
    if (!ac || !S.on) return;
    const base = 9 + (i % 5);
    pluck(SCALE[Math.min(SCALE.length - 1, base)], 0.42, 0, 0, sfx);
    pluck(SCALE[Math.min(SCALE.length - 1, base - 2)], 0.18, 0.09, 0.2, sfx);
  };
  S.tick = () => { if (ac && S.on) pluck(SCALE[11 + ((Math.random() * 3) | 0)], 0.16, 0, 0, sfx); };

  /* 四个愿望集齐：一串上行的琶音 */
  S.bloom = () => {
    if (!ac || !S.on) return;
    [5, 7, 8, 9, 10, 12, 13, 15].forEach((k, i) => pluck(SCALE[k], 0.34 - i * 0.02, i * 0.13, (i % 2 ? 0.3 : -0.3), sfx));
    pad.gain.setTargetAtTime(0.14, ac.currentTime, 0.8);
    setTimeout(() => S.mood(mood), 4000);
  };

  NV.sound = S;
})(window.NV);

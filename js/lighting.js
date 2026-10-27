/* ============ 삼분의숲 — lighting ============
   시간대 색보정(아침→한낮→노을→밤)과 광원(모닥불·황금 자원·유령·캐릭터).
   저해상도 빛 캔버스를 multiply로 덮고, 뜨거운 빛은 additive로 한 번 더 번지게 한다. */
'use strict';
const Light = (() => {
  const LW = 240, LH = 180, SC = 720 / LW;
  const lcv = document.createElement('canvas'); lcv.width = LW; lcv.height = LH;
  const lc = lcv.getContext('2d');
  // 비네트(가장자리 어둡게)
  const vig = document.createElement('canvas'); vig.width = LW; vig.height = LH;
  { const g = vig.getContext('2d'), gr = g.createRadialGradient(LW / 2, LH / 2, LH * 0.35, LW / 2, LH / 2, LW * 0.68);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(150,140,170,1)'); g.fillStyle = gr; g.fillRect(0, 0, LW, LH); }

  // [진행도(0~1), 색]
  const KEYS = [
    [0.00, [255, 246, 232]], [0.12, [255, 252, 246]], [0.40, [255, 255, 252]],
    [0.56, [255, 242, 220]], [0.68, [255, 226, 192]], [0.78, [250, 202, 178]],
    [0.86, [214, 168, 190]], [0.93, [140, 132, 192]], [1.00, [92, 100, 166]],
  ];
  function lerpKeys(ph) {
    ph = Math.max(0, Math.min(1, ph));
    for (let i = 1; i < KEYS.length; i++) if (ph <= KEYS[i][0]) {
      const [a, ca] = KEYS[i - 1], [b, cb] = KEYS[i], t = (ph - a) / (b - a);
      return [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t];
    }
    return KEYS[KEYS.length - 1][1].slice();
  }
  let stormK = 0, sunK = 0, flash = 0;
  function ambient(t, weather, dt) {
    const tgtS = weather === 'storm' ? 1 : 0, tgtU = weather === 'sunny' ? 1 : 0;
    stormK += (tgtS - stormK) * Math.min(1, dt * 1.5); sunK += (tgtU - sunK) * Math.min(1, dt * 1.5);
    const c = lerpKeys(t / GAME_LEN);
    const sm = [1 - 0.36 * stormK, 1 - 0.3 * stormK, 1 - 0.16 * stormK];
    c[0] *= sm[0]; c[1] *= sm[1]; c[2] *= sm[2];
    c[0] = Math.min(255, c[0] * (1 + 0.03 * sunK)); c[1] = Math.min(255, c[1] * (1 + 0.01 * sunK)); c[2] *= (1 - 0.05 * sunK);
    if (flash > 0) { const f = Math.min(1, flash); c[0] += (255 - c[0]) * f; c[1] += (255 - c[1]) * f; c[2] += (255 - c[2]) * f; }
    return c;
  }
  const lum = c => (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;

  /* lights: [{x,y,r,c:[r,g,b],i, glow}] */
  function apply(ctx, t, weather, lights, dt) {
    flash = Math.max(0, flash - dt * 3.2);
    const amb = ambient(t, weather, dt), L = lum(amb), dark = Math.max(0, Math.min(1, (0.97 - L) / 0.55));
    const ph = t / GAME_LEN;
    // 1) 색보정: 노을빛·밤빛 (soft-light)
    const warm = Math.max(0, 1 - Math.abs(ph - 0.72) / 0.16) * 0.22 * (1 - stormK * 0.7);
    if (warm > 0.01) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,140,70,' + warm.toFixed(3) + ')'; ctx.fillRect(0, 0, 720, 540); }
    const cool = Math.max(0, (ph - 0.84) / 0.16) * 0.3 + stormK * 0.18;
    if (cool > 0.01) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(40,70,170,' + Math.min(0.45, cool).toFixed(3) + ')'; ctx.fillRect(0, 0, 720, 540); }
    ctx.globalCompositeOperation = 'source-over';
    // 2) 주변광 + 광원 (multiply)
    if (L < 0.985 || lights.length) {
      lc.globalCompositeOperation = 'source-over';
      lc.fillStyle = 'rgb(' + (amb[0] | 0) + ',' + (amb[1] | 0) + ',' + (amb[2] | 0) + ')';
      lc.fillRect(0, 0, LW, LH);
      lc.globalCompositeOperation = 'multiply'; lc.globalAlpha = 0.25 + dark * 0.55; lc.drawImage(vig, 0, 0); lc.globalAlpha = 1;
      lc.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        const k = l.i * (0.12 + dark * 0.95);
        if (k < 0.02) continue;
        const x = l.x / SC, y = l.y / SC, r = l.r / SC;
        const g = lc.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(' + l.c[0] + ',' + l.c[1] + ',' + l.c[2] + ',' + Math.min(1, k).toFixed(3) + ')');
        g.addColorStop(0.45, 'rgba(' + l.c[0] + ',' + l.c[1] + ',' + l.c[2] + ',' + Math.min(1, k * 0.45).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + l.c[0] + ',' + l.c[1] + ',' + l.c[2] + ',0)');
        lc.fillStyle = g; lc.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingEnabled = true;
      ctx.drawImage(lcv, 0, 0, 720, 540); ctx.restore();
    }
    // 3) 뜨거운 빛 번짐 (additive)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      if (!l.glow) continue;
      const k = l.glow * (0.25 + dark * 0.75);
      if (k < 0.02) continue;
      const r = l.r * 0.55, g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
      g.addColorStop(0, 'rgba(' + l.c[0] + ',' + l.c[1] + ',' + l.c[2] + ',' + Math.min(0.5, k * 0.35).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + l.c[0] + ',' + l.c[1] + ',' + l.c[2] + ',0)');
      ctx.fillStyle = g; ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2);
    }
    ctx.restore();
    return dark;
  }
  return { apply, ambient, kick(f = 1) { flash = Math.max(flash, f); }, reset() { stormK = 0; sunK = 0; flash = 0; }, get storm() { return stormK; }, get sun() { return sunK; } };
})();

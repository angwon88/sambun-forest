/* ============ 삼분의숲 — weather ============
   구름 그림자, 비(두 겹)·물튀김, 햇살, 나비·반딧불 같은 분위기 연출. */
'use strict';
const Weather = (() => {
  const W = 720, H = 540;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // 구름 그림자 한 덩어리
  const cloudCv = mk(160, 100);
  { const g = cloudCv.getContext('2d');
    for (const [x, y, r] of [[80, 52, 42], [50, 58, 30], [112, 56, 32], [70, 40, 30], [100, 42, 26]]) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(10,20,40,0.55)'); gr.addColorStop(1, 'rgba(10,20,40,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 160, 100);
    } }
  // 햇살 줄기
  const rayCv = mk(W, H);
  { const g = rayCv.getContext('2d');
    for (const [x0, w] of [[90, 70], [260, 40], [420, 90], [610, 50]]) {
      const gr = g.createLinearGradient(x0, 0, x0 + w, 0);
      gr.addColorStop(0, 'rgba(255,240,190,0)'); gr.addColorStop(0.5, 'rgba(255,240,190,0.55)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0, -10); g.lineTo(x0 + w, -10); g.lineTo(x0 + w - 260, H + 10); g.lineTo(x0 - 260, H + 10); g.closePath(); g.fill();
    }
    const fade = g.createLinearGradient(0, 0, 0, H); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = fade; g.fillRect(0, 0, W, H); }

  const clouds = [], splashes = [], flies = [], butterflies = [];
  let rainK = 0, sunK = 0, wind = 0;
  function reset() {
    clouds.length = 0; splashes.length = 0; flies.length = 0; butterflies.length = 0;
    for (let i = 0; i < 5; i++) clouds.push({ x: vr() * (W + 300) - 150, y: vr() * H - 40, s: vrange(1.2, 2.4), v: vrange(0.7, 1.3) });
    for (let i = 0; i < 4; i++) butterflies.push({ hx: vrange(160, 560), hy: vrange(150, 390), ph: vr() * 9, sp: vrange(0.5, 0.9), col: ['#ffffff', '#ffe36b', '#9fd8ff', '#ffb0d0'][i % 4], x: 0, y: 0 });
    for (let i = 0; i < 14; i++) flies.push({ x: vrange(60, 660), y: vrange(60, 480), vx: 0, vy: 0, ph: vr() * 9 });
    rainK = 0; sunK = 0;
  }
  function update(dt, t, weather) {
    rainK += ((weather === 'storm' ? 1 : 0) - rainK) * Math.min(1, dt * 1.2);
    sunK += ((weather === 'sunny' ? 1 : 0) - sunK) * Math.min(1, dt * 1.2);
    wind = 14 + rainK * 40;
    for (const c of clouds) { c.x += wind * c.v * dt; if (c.x > W + 160) { c.x = -160 * c.s - vr() * 100; c.y = vr() * H - 40; } }
    // 빗방울 튀김
    if (rainK > 0.2) {
      const n = rainK * 70 * dt;
      for (let i = 0; i < n + (vr() < n % 1 ? 1 : 0); i++) {
        const x = vr() * W, y = vr() * H, water = Ground.isWaterPx(x, y);
        splashes.push({ x, y, t: 0, life: water ? 0.5 : 0.28, water });
      }
    }
    for (const s of splashes) s.t += dt;
    for (let i = splashes.length - 1; i >= 0; i--) if (splashes[i].t >= splashes[i].life) splashes.splice(i, 1);
    for (const b of butterflies) { b.ph += dt * b.sp; b.x = b.hx + Math.sin(b.ph * 1.3) * 60 + Math.sin(b.ph * 3.1) * 12; b.y = b.hy + Math.sin(b.ph * 0.9 + 1) * 34 + Math.sin(b.ph * 4.3) * 6; }
    for (const f of flies) {
      f.ph += dt; f.vx += (Math.sin(f.ph * 1.7 + f.x) * 14 - f.vx) * dt; f.vy += (Math.cos(f.ph * 1.3 + f.y * 0.01) * 10 - f.vy) * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x < 40 || f.x > 680) f.vx *= -1; if (f.y < 40 || f.y > 500) f.vy *= -1;
    }
  }
  // 구름 그림자 (조명 전에)
  function drawShadows(ctx) {
    const a = 0.10 + rainK * 0.28 - sunK * 0.06;
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = true;
    for (const c of clouds) ctx.drawImage(cloudCv, c.x, c.y, 160 * c.s, 100 * c.s);
    ctx.restore();
  }
  // 나비 (낮에만, 조명 전에)
  function drawLife(ctx, t) {
    const ph = t / GAME_LEN, a = Math.max(0, Math.min(1, (0.82 - ph) / 0.08)) * (1 - rainK);
    if (a <= 0.02) return;
    ctx.globalAlpha = a;
    for (const b of butterflies) {
      const x = Math.round(b.x), y = Math.round(b.y), up = Math.sin(t * 18 + b.ph * 5) > 0;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x - 1, y + 14, 3, 1);
      ctx.fillStyle = b.col;
      if (up) { ctx.fillRect(x - 3, y - 2, 2, 2); ctx.fillRect(x + 2, y - 2, 2, 2); }
      else { ctx.fillRect(x - 3, y, 2, 1); ctx.fillRect(x + 2, y, 2, 1); ctx.fillRect(x - 2, y + 1, 1, 1); ctx.fillRect(x + 2, y + 1, 1, 1); }
      ctx.fillStyle = '#3a2a30'; ctx.fillRect(x, y - 1, 1, 3);
    }
    ctx.globalAlpha = 1;
  }
  // 조명 위에: 비·햇살·반딧불
  function drawOver(ctx, t, dark) {
    if (sunK > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = sunK * (0.16 + 0.04 * Math.sin(t * 0.7));
      const off = (t * 6) % 80; ctx.drawImage(rayCv, off - 40, 0); ctx.restore();
    }
    if (rainK > 0.02) {
      ctx.save(); ctx.lineCap = 'butt';
      const slant = 0.22 + rainK * 0.12;
      // 먼 비 (가늘고 흐림)
      ctx.strokeStyle = 'rgba(190,210,240,' + (0.22 * rainK).toFixed(3) + ')'; ctx.lineWidth = 1; ctx.beginPath();
      const nFar = Math.floor(110 * rainK);
      for (let i = 0; i < nFar; i++) {
        const sp = 620 + (i % 5) * 70, len = 8 + (i % 3) * 3;
        const x = ((i * 97.3 + t * sp * slant) % (W + 60)) - 30, y = ((i * 53.7 + t * sp) % (H + 40)) - 20;
        ctx.moveTo(x, y); ctx.lineTo(x - len * slant, y + len);
      }
      ctx.stroke();
      // 가까운 비 (굵고 밝음)
      ctx.strokeStyle = 'rgba(214,230,255,' + (0.42 * rainK).toFixed(3) + ')'; ctx.lineWidth = 1.5; ctx.beginPath();
      const nNear = Math.floor(55 * rainK);
      for (let i = 0; i < nNear; i++) {
        const sp = 900 + (i % 4) * 90, len = 14 + (i % 4) * 4;
        const x = ((i * 151.7 + t * sp * slant) % (W + 80)) - 40, y = ((i * 89.1 + t * sp) % (H + 60)) - 30;
        ctx.moveTo(x, y); ctx.lineTo(x - len * slant, y + len);
      }
      ctx.stroke();
      // 튀김
      for (const s of splashes) {
        const k = s.t / s.life;
        ctx.strokeStyle = 'rgba(210,235,255,' + (0.55 * (1 - k) * rainK).toFixed(3) + ')'; ctx.lineWidth = 1;
        ctx.beginPath();
        if (s.water) ctx.ellipse(s.x, s.y, 1 + k * 6, 0.5 + k * 2.5, 0, 0, Math.PI * 2);
        else { ctx.moveTo(s.x - 1 - k * 3, s.y - k * 3); ctx.lineTo(s.x - 1, s.y); ctx.moveTo(s.x + 1 + k * 3, s.y - k * 3); ctx.lineTo(s.x + 1, s.y); }
        ctx.stroke();
      }
      ctx.restore();
    }
    // 반딧불 (어두워지면)
    const ph = t / GAME_LEN, fa = Math.max(0, Math.min(1, (ph - 0.8) / 0.08)) * (1 - rainK * 0.8);
    if (fa > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const f of flies) {
        const blink = 0.5 + 0.5 * Math.sin(t * 2.4 + f.ph * 3);
        const a = fa * blink;
        if (a < 0.05) continue;
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 7);
        g.addColorStop(0, 'rgba(210,255,140,' + (0.55 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(210,255,140,0)');
        ctx.fillStyle = g; ctx.fillRect(f.x - 7, f.y - 7, 14, 14);
        ctx.fillStyle = 'rgba(240,255,200,' + a.toFixed(3) + ')'; ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
      }
      ctx.restore();
    }
  }
  return { reset, update, drawShadows, drawLife, drawOver, get rain() { return rainK; } };
})();

/* ============ 삼분의숲 — art ============
   모든 스프라이트를 코드로 그린다 (외부 이미지 없음).
   각 스프라이트: {c:캔버스, w,h, ax,ay:발밑 기준점, hl:선택 강조용 외곽선 캔버스} */
'use strict';
const PAL = {
  leaf:   PIX.ramp('#173d2c', '#21573a', '#2e7344', '#3f8f4c', '#5aad55', '#80c95f', '#acdf7e'),
  leafG:  PIX.ramp('#5a3408', '#86520f', '#b27a1a', '#d9a52a', '#f2c843', '#ffe27a', '#fff3b8'),
  bush:   PIX.ramp('#123532', '#1b4d3f', '#256847', '#33834f', '#4a9f58', '#6abb66', '#93d883'),
  bark:   PIX.ramp('#33201a', '#4d3022', '#6a432c', '#87583a', '#a5734a', '#c08e5e'),
  stone:  PIX.ramp('#2c3140', '#424859', '#596072', '#747c8e', '#929aab', '#b5bcc9', '#d8dee8'),
  stoneG: PIX.ramp('#3a2c1c', '#5a4224', '#7e5c2c', '#a67c34', '#cfa344', '#efc85c', '#fff0a4'),
  moss:   PIX.ramp('#2f6b3a', '#4a8f45', '#6db352'),
  apple:  PIX.ramp('#4f0d1c', '#821a28', '#b52832', '#e0423a', '#ff7556', '#ffc3a3'),
  appleG: PIX.ramp('#6a3c06', '#a0640c', '#d4981c', '#f5c63c', '#ffe683', '#fffbd8'),
  shell:  PIX.ramp('#6e2a48', '#9a4466', '#c4628a', '#e68cb0', '#f8b9d1', '#ffe8f2'),
  shellG: PIX.ramp('#6a3c06', '#9c620c', '#cf961c', '#f2c43c', '#ffe683', '#fffbd8'),
  plank:  PIX.ramp('#3d2618', '#5c3b25', '#7d5233', '#9e6c43', '#be8a58', '#dcad78'),
  red:    PIX.ramp('#4e1418', '#7e2226', '#b03530', '#dc5141', '#f57d5f', '#ffb092'),
  cream:  PIX.ramp('#8f7f62', '#b9a886', '#dccdab', '#f2e8cf', '#fffaf0'),
  fire:   PIX.ramp('#6e1a10', '#b33a14', '#e86a14', '#ffa82a', '#ffd75a', '#fff6c8'),
  otter:  PIX.ramp('#2e1b12', '#48291b', '#663b25', '#845030', '#a2683e', '#bf8452'),
  otterF: PIX.ramp('#b9926c', '#d8b48c', '#efd4b0', '#fdeedb'),
  crow:   PIX.ramp('#0d0a12', '#18131f', '#251e30', '#362c45', '#4b3f60', '#655682'),
  ghost:  PIX.ramp('#55689c', '#7f96c8', '#a9bfe6', '#d2e2fa', '#f3f8ff'),
  gold:   PIX.ramp('#6e4208', '#a0680f', '#d39a22', '#f5c63c', '#ffe683', '#fffbd8'),
  flower: ['#ffd64a', '#ff8fb6', '#fff6e8', '#8fc8ff', '#ff6f5a', '#c9a0ff'],
};
const ART = { ready: false };

/* 공용: 원통(줄기·기둥) 셰이딩 */
function cylinder(p, cx, y0, y1, halfFn, rmp, opt = {}) {
  const n = rmp.length;
  for (let y = y0; y <= y1; y++) {
    const hw = halfFn(y);
    for (let x = Math.floor(cx - hw); x < Math.ceil(cx + hw); x++) {
      const nx = (x + 0.5 - cx) / hw;
      if (Math.abs(nx) > 1) continue;
      const nz = Math.sqrt(1 - nx * nx);
      let I = (nx * PIX.L[0] + nz * PIX.L[2]) * 0.5 + 0.5 + (opt.bias || 0);
      if (opt.noise) I += (PIX.hash(x, y, opt.seed || 3) - 0.5) * opt.noise;
      const f = PIX.clamp(I, 0, 0.999) * (n - 1), b = Math.floor(f);
      p.set(x, y, rmp[PIX.clamp(b + ((f - b) > 0.5 + (PIX.bayer(x, y) - 0.5) * 0.6 ? 1 : 0), 0, n - 1)]);
    }
  }
}
function sparkles(p, pts, col = '#fffbe0') {
  for (const [x, y, big] of pts) {
    p.set(x, y, col); p.set(x - 1, y, PIX.withAlpha(col, 200)); p.set(x + 1, y, PIX.withAlpha(col, 200));
    p.set(x, y - 1, PIX.withAlpha(col, 200)); p.set(x, y + 1, PIX.withAlpha(col, 200));
    if (big) { p.set(x - 2, y, PIX.withAlpha(col, 120)); p.set(x + 2, y, PIX.withAlpha(col, 120)); p.set(x, y - 2, PIX.withAlpha(col, 120)); p.set(x, y + 2, PIX.withAlpha(col, 120)); }
  }
}

/* ---------------- 자원 ---------------- */
function picTree(v, golden) {
  const p = PIX.pic(36, 48);
  const lf = golden ? PAL.leafG : PAL.leaf;
  const cx = 18, base = 45;
  // 줄기 + 뿌리
  const top = v === 2 ? 22 : 26;
  cylinder(p, cx, top, base, y => y > base - 3 ? 2.6 + (y - (base - 3)) * 0.9 : 2.4, PAL.bark, { noise: 0.25, seed: 7 });
  p.set(cx - 5, base, PAL.bark[1]); p.set(cx + 4, base, PAL.bark[0]); p.set(cx - 4, base, PAL.bark[2]);
  for (let y = top + 3; y < base - 2; y += 4) p.set(cx + (y % 8 ? 0 : 1), y, PAL.bark[1]);   // 나무결
  // 가지 (v1)
  if (v === 1) { p.line(cx - 1, top + 4, cx - 6, top - 1, PAL.bark[2]); p.line(cx + 1, top + 5, cx + 6, top, PAL.bark[1]); }
  // 수관: [x,y,rx,ry,bias]
  const B = [
    [[18, 27, 12, 6, -0.16], [9, 24, 7, 6, -0.1], [27, 24, 7, 6, -0.12], [18, 20, 13, 8, 0], [12, 13, 8, 7, 0.04], [24, 13, 8, 7, 0.02], [18, 8, 8, 6, 0.06]],
    [[18, 29, 10, 5, -0.16], [11, 24, 6, 6, -0.08], [25, 24, 6, 6, -0.1], [18, 21, 10, 7, 0], [13, 14, 7, 6, 0.04], [23, 14, 7, 6, 0.02], [18, 8, 7, 6, 0.06], [18, 3, 4, 3, 0.1]],
    [[18, 23, 15, 6, -0.14], [7, 20, 7, 5, -0.06], [29, 20, 7, 5, -0.08], [18, 17, 13, 6, 0.02], [12, 12, 8, 4, 0.06], [24, 12, 8, 4, 0.05]],
  ][v];
  const cp = PIX.pic(36, 48);
  B.forEach(([x, y, rx, ry, bias], i) => cp.blob(x, y, rx, ry, lf, { bias, noise: 0.16, noiseSeed: 11 + i + v * 7, dither: 0.7, ao: 0.26 }));
  // 잎 뭉치 하이라이트·그늘 점
  for (let i = 0; i < 30; i++) {
    const x = 6 + Math.floor(PIX.hash(i, v, 31) * 24), y = 4 + Math.floor(PIX.hash(i, v, 37) * 22);
    if (cp.a(x, y) === 0 || cp.a(x + 1, y) === 0) continue;
    const lit = (x + y) < 32;
    cp.set(x, y, lit ? lf[6] : lf[1]); if (lit) cp.set(x + 1, y, lf[5]); else cp.set(x, y + 1, lf[0]);
  }
  // 수관 가장자리: 위쪽은 밝게, 아래쪽은 어둡게
  cp.innerEdge((c, e, x) => e.up && x < 27 ? lf[6] : (e.dn ? lf[1] : null));
  p.stamp(cp, 0, 0);
  p.selout(0.45, 0.32);
  if (golden) sparkles(p, [[9, 10, 1], [27, 18, 0], [16, 4, 0]]);
  return p;
}
function picRock(v, golden) {
  const p = PIX.pic(32, 26);
  const st = golden ? PAL.stoneG : PAL.stone;
  const B = [
    [[16, 16, 13, 8, 0], [9, 18, 7, 5, -0.05], [23, 17, 7, 6, -0.03], [14, 11, 8, 6, 0.06], [20, 12, 6, 5, 0.04]],
    [[15, 17, 11, 7, 0], [24, 19, 6, 4, -0.08], [12, 12, 7, 6, 0.05], [19, 10, 6, 6, 0.07]],
  ][v];
  B.forEach(([x, y, rx, ry, bias], i) => p.blob(x, y, rx, ry, st, { bias, dither: 0.35, noise: 0.1, noiseSeed: 50 + i, ao: 0.3, flat: 0.8 }));
  // 균열
  const cr = v ? [[13, 13, 15, 16], [15, 16, 14, 19], [21, 14, 23, 17]] : [[11, 12, 13, 15], [13, 15, 12, 18], [20, 11, 22, 14], [22, 14, 24, 15]];
  for (const [a, b, c, d] of cr) p.line(a, b, c, d, (x, y) => p.a(x, y) ? st[1] : 0);
  // 이끼 (일반 돌만)
  if (!golden) {
    const ms = v ? [[11, 8], [12, 7], [13, 7], [14, 7], [10, 9], [18, 6], [19, 6], [20, 7]] : [[12, 7], [13, 6], [14, 6], [15, 6], [16, 7], [11, 8], [19, 8], [20, 8]];
    ms.forEach(([x, y], i) => { if (p.a(x, y + 1)) p.set(x, y + 1, PAL.moss[i % 3]); });
  } else {
    // 금광석 알갱이
    for (const [x, y] of [[10, 14], [18, 9], [22, 17], [14, 19], [25, 14]]) { p.set(x, y, PAL.gold[5]); p.set(x + 1, y, PAL.gold[4]); p.set(x, y + 1, PAL.gold[3]); }
  }
  p.selout(0.42, 0.3);
  if (golden) sparkles(p, [[8, 9, 1], [24, 8, 0]]);
  return p;
}
function picBush(v, golden) {
  const p = PIX.pic(34, 30);
  const B = [
    [[17, 21, 13, 7, -0.12], [8, 19, 7, 6, -0.06], [26, 19, 7, 6, -0.08], [17, 15, 12, 8, 0.02], [11, 10, 7, 6, 0.06], [23, 10, 7, 6, 0.04]],
    [[17, 22, 12, 6, -0.12], [9, 18, 7, 7, -0.05], [25, 18, 7, 7, -0.07], [17, 13, 10, 8, 0.04], [17, 7, 6, 4, 0.08]],
  ][v];
  B.forEach(([x, y, rx, ry, bias], i) => p.blob(x, y, rx, ry, PAL.bush, { bias, noise: 0.16, noiseSeed: 70 + i + v * 5, dither: 0.7, ao: 0.24 }));
  for (let i = 0; i < 18; i++) {
    const x = 5 + Math.floor(PIX.hash(i, v, 77) * 24), y = 5 + Math.floor(PIX.hash(i, v, 79) * 18);
    if (p.a(x, y) && p.a(x + 1, y)) { const lit = x + y < 30; p.set(x, y, lit ? PAL.bush[6] : PAL.bush[1]); }
  }
  p.innerEdge((c, e, x) => e.up && x < 26 ? PAL.bush[6] : (e.dn ? PAL.bush[1] : null));
  // 열매
  const ap = golden ? PAL.appleG : PAL.apple;
  const F = v ? [[10, 12], [23, 11], [16, 18], [8, 21], [26, 20], [18, 8]] : [[9, 15], [21, 9], [25, 17], [14, 20], [17, 12]];
  for (const [x, y] of F) {
    p.blob(x, y, 2.6, 2.6, ap, { dither: 0.2, bias: 0.05 });
    p.set(x - 1, y - 1, ap[5]);                    // 반짝
    p.set(x, y - 3, PAL.bark[2]); p.set(x + 1, y - 3, PAL.leaf[4]);   // 꼭지·잎
  }
  p.selout(0.45, 0.32);
  if (golden) sparkles(p, [[6, 8, 1], [28, 12, 0]]);
  return p;
}
function picShell(v, golden) {
  const p = PIX.pic(20, 16);
  const sh = golden ? PAL.shellG : PAL.shell;
  if (v === 0) {
    // 가리비: 아래 경첩에서 퍼지는 부채꼴 + 방사형 골
    const hx = 10, hy = 13.5;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 20; x++) {
      const dx = x + 0.5 - hx, dy = y + 0.5 - hy, r = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      const rib = Math.cos((ang + 1.57) * 15);
      const edge = 9.2 + rib * 0.55;
      if (dy > 0 || r > edge || ang > -0.28 || ang < -2.86) continue;
      let I = 0.62 + rib * 0.26 - (dx > 0 ? 0.1 : 0) - (r < 3.5 ? 0.12 : 0) - (ang > -0.8 || ang < -2.4 ? 0.06 : 0);
      if (r > edge - 1.3) I += 0.16;
      const f = PIX.clamp(I, 0, 0.999) * (sh.length - 1), b = Math.floor(f);
      p.set(x, y, sh[PIX.clamp(b + ((f - b) > 0.5 + (PIX.bayer(x, y) - 0.5) * 0.4 ? 1 : 0), 0, sh.length - 1)]);
    }
    p.rect(5, 12, 4, 3, sh[2]); p.rect(11, 12, 4, 3, sh[1]); p.rect(8, 12, 4, 3, sh[3]);   // 경첩 귀
    p.set(6, 12, sh[3]); p.set(12, 12, sh[2]);
  } else {
    // 소라: 큰 몸통 + 오른쪽 위로 줄어드는 나선탑
    p.blob(8, 10, 6.5, 4.6, sh, { dither: 0.4, ao: 0.28 });
    p.blob(13.5, 6.5, 4, 3.2, sh, { dither: 0.4, bias: 0.06 });
    p.blob(16.6, 4, 2.4, 2, sh, { dither: 0.4, bias: 0.1 });
    p.set(18, 2, sh[4]); p.set(18, 3, sh[3]);
    p.line(4, 8, 11, 5, (x, y) => p.a(x, y) ? sh[2] : 0);  // 나선 띠
    p.line(10, 8, 15, 4, (x, y) => p.a(x, y) ? sh[2] : 0);
    p.line(14, 5, 17, 3, (x, y) => p.a(x, y) ? sh[3] : 0);
    p.blob(5, 11, 3, 2.4, PIX.ramp('#9a4f45', '#d98a78', '#ffd0c0'), { dither: 0.3, bias: 0.1 });   // 입구
    p.set(9, 7, sh[5]); p.set(10, 7, sh[5]); p.set(14, 5, sh[5]);
  }
  p.selout(0.45, 0.35);
  if (golden) sparkles(p, [[4, 3, 0], [16, 2, 1]]);
  return p;
}

/* ---------------- 건물 ---------------- */
function picTent() {
  const p = PIX.pic(38, 36);
  const ax = 19, top = 5, bot = 32;
  // 줄·말뚝
  p.line(6, 22, 1, 32, PAL.plank[2]); p.line(32, 22, 37, 32, PAL.plank[1]);
  p.rect(0, 31, 2, 3, PAL.plank[3]); p.rect(36, 31, 2, 3, PAL.plank[2]);
  // 왼쪽 면(밝음) / 오른쪽 면(그늘) — 빨간 천 + 아래쪽 크림 띠
  const face = (lit) => (x, y) => {
    const band = y >= bot - 4, r = band ? PAL.cream : PAL.red;
    let t = lit ? 0.78 - (y - top) / (bot - top) * 0.22 - (ax - x) * 0.004 : 0.4 - (y - top) / (bot - top) * 0.16;
    if (band) t = lit ? 0.62 : 0.3;
    if (!band && (y - top) % 7 === 6) t -= 0.12;   // 천 주름
    const f = PIX.clamp(t, 0, 0.999) * (r.length - 1), b = Math.floor(f);
    return r[PIX.clamp(b + ((f - b) > 0.5 + (PIX.bayer(x, y) - 0.5) * 0.6 ? 1 : 0), 0, r.length - 1)];
  };
  p.poly([[ax, top], [3, bot], [ax, bot]], face(true));
  p.poly([[ax, top], [ax, bot], [35, bot]], face(false));
  // 입구 (어두운 삼각형) + 젖힌 천
  p.poly([[ax, 13], [ax - 6, bot], [ax + 6, bot]], (x, y) => y > 27 ? '#2a1712' : '#3a2018');
  p.poly([[ax, 13], [ax - 6, bot], [ax - 9, bot], [ax - 2, 15]], PAL.cream[3]);
  p.poly([[ax, 13], [ax + 6, bot], [ax + 9, bot], [ax + 2, 15]], PAL.cream[1]);
  p.line(ax - 2, 16, ax - 7, bot - 1, PAL.cream[2]);
  // 바닥 테두리, 꼭대기 기둥과 작은 깃발
  p.rect(3, bot, 33, 1, PAL.red[1]);
  p.rect(ax, 1, 1, 5, PAL.plank[2]); p.set(ax, 0, PAL.gold[4]);
  p.poly([[ax + 1, 1], [ax + 6, 2.5], [ax + 1, 4]], '#ffd64a');
  // 지붕선 하이라이트
  p.line(ax - 1, top + 1, 4, bot - 1, (x, y) => PAL.cream[4]);
  p.selout(0.45, 0.32);
  return p;
}
function picFire(f) {
  const p = PIX.pic(34, 38);
  const cx = 17, gy = 32;
  // 뒤쪽 돌
  const stones = [[-9, -2], [-4, -4], [2, -4], [8, -2], [10, 1], [-10, 1], [-6, 3], [0, 4], [6, 3]];
  const drawStone = ([dx, dy], i) => p.blob(cx + dx, gy + dy, 3.2, 2.4, PAL.stone, { dither: 0.3, bias: 0.06, ao: 0.3, noiseSeed: i });
  stones.slice(0, 6).forEach(drawStone);
  // 장작
  for (let i = 0; i < 3; i++) { p.line(cx - 8, gy + 1 - i, cx + 7, gy - 4 - i, PAL.plank[1 + i]); p.line(cx - 7, gy - 4 - i, cx + 8, gy + 1 - i, PAL.plank[2 + i]); }
  p.set(cx - 8, gy, PAL.plank[5]); p.set(cx + 8, gy, PAL.plank[5]);
  // 불꽃 (프레임마다 혀 모양이 다름)
  const H = [21, 23, 20, 24][f], ph = f * 1.7;
  for (let y = gy - H; y <= gy - 1; y++) for (let x = cx - 9; x <= cx + 9; x++) {
    const v = (gy - y) / H;                                // 0 아래 → 1 위
    const wob = Math.sin(v * 7 + ph) * 1.6 * v + Math.sin(v * 13 + ph * 2) * 0.6;
    const w = 7.5 * Math.pow(1 - v, 0.75) * (1 - v * 0.15);
    const dx = Math.abs(x + 0.5 - cx - wob);
    if (dx > w) continue;
    const tongue = Math.sin((x - cx) * 1.3 + ph * 2) * 0.12;
    let I = 1 - dx / (w + 0.01) * 0.8 - v * 0.55 + tongue + 0.15;
    if (v > 0.6 && dx > w * 0.5 && PIX.hash(x, y, f) > 0.6) continue;   // 혀끝 갈라짐
    const n = PAL.fire.length, fl = PIX.clamp(I, 0, 0.999) * (n - 1), b = Math.floor(fl);
    p.set(x, y, PAL.fire[PIX.clamp(b + ((fl - b) > PIX.bayer(x, y) ? 1 : 0), 0, n - 1)]);
  }
  // 불티
  for (let i = 0; i < 3; i++) { const x = cx - 6 + Math.floor(PIX.hash(i, f, 5) * 12), y = gy - H - 2 - Math.floor(PIX.hash(i, f, 9) * 6); p.set(x, y, i % 2 ? PAL.fire[4] : PAL.fire[3]); }
  // 앞쪽 돌
  stones.slice(6).forEach(drawStone);
  p.selout(0.5, 0.35);
  return p;
}
function picFence() {
  const p = PIX.pic(38, 30);
  const pk = PAL.plank;
  const rail = (y) => { for (let x = 1; x < 37; x++) { p.set(x, y, pk[3]); p.set(x, y + 1, pk[2]); p.set(x, y + 2, pk[1]); } };
  rail(11); rail(19);
  for (let i = 0; i < 5; i++) {
    const x0 = 2 + i * 7, h0 = i % 2 ? 6 : 4;
    p.poly([[x0, h0 + 3], [x0 + 2.5, h0], [x0 + 5, h0 + 3], [x0 + 5, 27], [x0, 27]], (x, y) => {
      const t = x - x0; return t === 0 ? pk[5] : t === 1 ? pk[4] : t >= 4 ? pk[2] : pk[3];
    });
    p.set(x0 + 2, h0 + 6, pk[1]); p.set(x0 + 2, h0 + 13, pk[1]);   // 못
    p.set(x0 + 1, 26, pk[1]); p.set(x0 + 3, 26, pk[1]);
  }
  p.selout(0.45, 0.3);
  return p;
}
function picFlower(f) {
  const p = PIX.pic(36, 30);
  const pk = PAL.plank;
  // 꽃 (상자 뒤에서 솟음)
  const FL = [[6, 9, 0], [11, 5, 1], [16, 8, 2], [21, 4, 3], [26, 8, 4], [30, 6, 0], [13, 11, 5], [24, 12, 1]];
  for (const [x, y, ci] of FL) {
    const sw = f ? (x % 2 ? 1 : 0) : (x % 2 ? 0 : 1);
    p.line(x, y + 2, x + sw, 17, PAL.leaf[3]);
    p.set(x + sw - 1, 13, PAL.leaf[4]); p.set(x + sw + 1, 12, PAL.leaf[3]);
    const c = PIX.hex(PAL.flower[ci]), hx = x + sw * (y < 8 ? 1 : 0);
    p.set(hx - 1, y, c); p.set(hx + 1, y, c); p.set(hx, y - 1, c); p.set(hx, y + 1, c);
    p.set(hx - 1, y - 1, PIX.darken(c, 0.85)); p.set(hx + 1, y + 1, PIX.darken(c, 0.75));
    p.set(hx, y, ci === 0 ? '#ff9a3c' : '#ffe680');
  }
  // 흙
  p.rect(3, 15, 30, 3, '#4a2e1e'); for (let x = 4; x < 32; x += 3) p.set(x, 15, '#6b4430');
  // 화분 상자 (앞면 판자)
  for (let y = 17; y < 27; y++) for (let x = 2; x < 34; x++) {
    let c = (y === 17) ? pk[5] : (y === 18) ? pk[4] : ((y - 19) % 4 === 3 ? pk[1] : pk[3]);
    if (x === 2 || x === 33) c = pk[2];
    if (x === 3 && y > 18) c = pk[4];
    p.set(x, y, c);
  }
  p.rect(2, 26, 32, 1, pk[1]);
  p.selout(0.45, 0.3);
  return p;
}
function picPalm(f) {
  const p = PIX.pic(44, 60);
  const base = [20, 57], top = [25, 19];
  // 줄기: 휘어진 마디
  for (let i = 0; i <= 38; i++) {
    const t = i / 38, x = base[0] + (top[0] - base[0]) * t + Math.sin(t * 3.0) * 2.5, y = base[1] - (base[1] - top[1]) * t;
    const hw = 2.8 - t * 0.6, seg = Math.floor(i / 3) % 2;
    for (let dx = -Math.ceil(hw); dx <= Math.ceil(hw); dx++) {
      const nx = dx / hw; if (Math.abs(nx) > 1.05) continue;
      const lit = nx < -0.2 ? 4 : nx < 0.4 ? 3 : 2;
      p.set(Math.round(x + dx), Math.round(y), PAL.bark[lit - (seg && i % 3 === 0 ? 1 : 0)]);
    }
  }
  // 코코넛
  for (const [x, y] of [[23, 21], [27, 22], [25, 24]]) p.blob(x, y, 2.4, 2.4, PIX.ramp('#3a2414', '#5c3a20', '#7e5430', '#a07040'), { dither: 0.3 });
  // 잎: 처지는 잎줄기 + 양옆으로 늘어진 작은 잎들 (깃털 모양)
  const sway = [0, 0.05, 0, -0.05][f];
  const cx = 25, cy = 17;
  // [각도, 길이, 앞쪽?]  뒤쪽 잎을 먼저 그린다
  const fronds = [[-1.9, 12, 0], [-1.2, 12, 0], [-2.6, 15, 1], [-0.5, 15, 1], [-3.3, 13, 1], [0.25, 13, 1]];
  for (const [a0, len, front] of fronds) {
    const a = a0 + sway * (front ? 1.4 : 0.8);
    const dark = front ? 0 : 1;
    for (let s = 0.5; s <= len; s += 0.5) {
      const t = s / len, droop = t * t * 8;
      const x = cx + Math.cos(a) * s, y = cy + Math.sin(a) * s * 0.7 + droop;
      const tx = Math.cos(a), ty = Math.sin(a) * 0.7 + 2 * t * 8 / len;
      const tm = Math.hypot(tx, ty) || 1, nx = -ty / tm, ny = tx / tm;
      const Lf = 3.4 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.6;
      for (let k = 0.5; k <= Lf; k += 0.5) {
        p.set(Math.round(x + nx * k * 0.8), Math.round(y + ny * k * 0.8 + k * 0.45), PAL.leaf[(k > Lf - 1 ? 3 : 4) - dark]);
        p.set(Math.round(x - nx * k * 0.8), Math.round(y - ny * k * 0.8 + k * 0.6), PAL.leaf[(k > Lf - 1 ? 2 : 3) - dark]);
      }
      p.set(Math.round(x), Math.round(y), PAL.leaf[t < 0.5 ? 6 - dark : 5 - dark]);
    }
  }
  p.blob(cx, cy, 3.2, 2.4, PAL.leaf, { bias: 0.12 });
  p.selout(0.45, 0.3);
  return p;
}
function picShellTower() {
  const p = PIX.pic(32, 46);
  const sand = PIX.ramp('#7d5f3a', '#9c7c4c', '#bc9a62', '#d6b87c', '#ead49c', '#f6e8c0');
  // 쌓은 둥근 돌 3단
  p.blob(16, 39, 12, 5.5, sand, { dither: 0.4, ao: 0.3, flat: 0.7 });
  p.blob(16, 31, 9, 4.6, sand, { dither: 0.4, ao: 0.3, flat: 0.7, bias: 0.04 });
  p.blob(16, 24.5, 6.6, 3.8, sand, { dither: 0.4, ao: 0.3, flat: 0.7, bias: 0.07 });
  // 돌에 붙인 가리비
  const sc = picShell(0, false);
  const putShell = (dx, dy) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 20; x++) { const c = sc.get(x, y); if (PIX.alphaOf(c) && y > 3) p.set(dx + Math.floor(x * 0.6), dy + Math.floor(y * 0.6), c); } };
  putShell(4, 34); putShell(18, 35); putShell(10, 26);
  // 꼭대기: 위로 솟은 큰 소라
  p.blob(16, 17.5, 5, 3.6, PAL.shell, { dither: 0.4, ao: 0.25 });
  p.blob(16, 13, 3.8, 3, PAL.shell, { dither: 0.4, bias: 0.06 });
  p.blob(16, 9.2, 2.7, 2.3, PAL.shell, { dither: 0.4, bias: 0.1 });
  p.blob(16, 6.2, 1.7, 1.6, PAL.shell, { dither: 0.4, bias: 0.14 });
  p.line(11, 17, 20, 15, PAL.shell[2]); p.line(13, 13, 19, 11, PAL.shell[2]); p.line(14, 9, 18, 8, PAL.shell[3]);
  p.set(14, 14, PAL.shell[5]); p.set(14, 10, PAL.shell[5]);
  // 진주
  p.blob(16, 3, 2.4, 2.4, PIX.ramp('#9aa8c8', '#cfd8ee', '#f2f6ff', '#ffffff'), { dither: 0.2, bias: 0.1 });
  p.set(15, 2, '#ffffff');
  p.selout(0.45, 0.32);
  return p;
}
function picFlag(f) {
  const p = PIX.pic(36, 50);
  // 받침 돌
  p.blob(10, 46, 6, 3, PAL.stone, { dither: 0.3, ao: 0.3 });
  // 깃대
  for (let y = 4; y < 46; y++) { p.set(9, y, PAL.plank[4]); p.set(10, y, PAL.plank[2]); }
  p.blob(9.5, 3, 2.2, 2.2, PAL.gold, { dither: 0.2, bias: 0.1 });
  // 깃발 천 (물결)
  const fy = 6, fh = 13, fw = 22;
  for (let x = 0; x < fw; x++) {
    const ph = x * 0.32 - f * Math.PI / 2, off = Math.sin(ph) * 1.8 * (x / fw + 0.2);
    const lit = Math.cos(ph);
    for (let y = 0; y < fh; y++) {
      const yy = Math.round(fy + y + off);
      let c = PIX.hex(lit > 0.3 ? '#ffe36b' : lit > -0.3 ? '#ffd23f' : '#e9b52a');
      // 엠블럼: 빨간 별 모양 (가운데)
      const ex = x - 9, ey = y - 6;
      if ((Math.abs(ex) + Math.abs(ey) <= 3) || (ey === 0 && Math.abs(ex) <= 4) || (ex === 0 && Math.abs(ey) <= 4)) c = PIX.hex(lit > 0 ? '#e9493e' : '#c13530');
      if (y === 0) c = PIX.lighten(c, 0.25);
      if (y === fh - 1) c = PIX.darken(c, 0.8);
      p.set(11 + x, yy, c);
    }
  }
  p.selout(0.45, 0.32);
  return p;
}

/* ---------------- NPC · 위험 ---------------- */
function picOtter(mode) {   // 0 기본, 1 눈깜빡, 2 기쁨
  const p = PIX.pic(32, 32);
  const o = PAL.otter, fc = PAL.otterF;
  // 꼬리
  p.blob(24, 27, 6, 2.6, o, { dither: 0.4, bias: -0.05 });
  // 몸통 + 배
  p.blob(16, 21, 9, 8.5, o, { dither: 0.5, ao: 0.2 });
  p.blob(16, 22, 6, 6.5, fc, { dither: 0.4, bias: 0.05 });
  // 발 (조개 들고 있음)
  if (mode === 2) { p.blob(9, 13, 2.4, 2.6, o, { bias: 0.1 }); p.blob(23, 13, 2.4, 2.6, o, { bias: 0.05 }); }
  else {
    p.blob(13, 20, 2.6, 2.2, o, { bias: 0.1 }); p.blob(19, 20, 2.6, 2.2, o, { bias: 0.05 });
    const s = picShell(0, false); for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) { const c = s.get(x + 4, y + 6); if (PIX.alphaOf(c)) p.set(x + 10, y + 15, c); }
  }
  // 머리
  p.set(9, 4, o[3]); p.blob(9.5, 5, 2.4, 2.2, o, { bias: 0.1 }); p.blob(22.5, 5, 2.4, 2.2, o, {});
  p.blob(16, 10, 8.6, 6.8, o, { dither: 0.5, bias: 0.05 });
  p.blob(16, 12.5, 6.4, 4.2, fc, { dither: 0.3, bias: 0.08 });
  // 눈·코·입
  if (mode === 1) { p.rect(11, 9, 3, 1, '#1a0f0a'); p.rect(18, 9, 3, 1, '#1a0f0a'); }
  else if (mode === 2) { p.set(11, 9, '#1a0f0a'); p.set(12, 8, '#1a0f0a'); p.set(13, 9, '#1a0f0a'); p.set(18, 9, '#1a0f0a'); p.set(19, 8, '#1a0f0a'); p.set(20, 9, '#1a0f0a'); }
  else { p.rect(11, 8, 2, 3, '#1a0f0a'); p.rect(19, 8, 2, 3, '#1a0f0a'); p.set(11, 8, '#ffffff'); p.set(19, 8, '#ffffff'); }
  p.rect(15, 11, 3, 2, '#2a1610'); p.set(15, 11, '#6a4a40');
  p.set(15, 14, '#7a4a3a'); p.set(16, 14, '#7a4a3a');
  p.set(9, 13, '#ff9aa8'); p.set(22, 13, '#ff9aa8');            // 볼터치
  // 수염
  p.set(10, 12, fc[1]); p.set(8, 12, fc[0]); p.set(22, 12, fc[1]); p.set(24, 12, fc[0]);
  p.selout(0.45, 0.3);
  return p;
}
function picCrow(mode) {   // 0 기본, 1 날개짓
  const p = PIX.pic(32, 32);
  const c = PAL.crow;
  // 꼬리
  p.poly([[20, 24], [29, 28], [27, 30], [18, 27]], (x, y) => c[(x + y) % 3 === 0 ? 1 : 2]);
  // 날개
  if (mode === 1) { p.blob(7, 14, 4, 7, c, { bias: 0.1 }); p.blob(25, 14, 4, 7, c, { bias: 0.02 }); }
  // 몸통
  p.blob(16, 20, 8, 7.5, c, { dither: 0.5, bias: 0.08, ao: 0.2 });
  p.blob(16, 22, 4.5, 4.5, c, { dither: 0.4, bias: 0.16 });
  if (mode !== 1) { p.blob(9.5, 20, 3, 6, c, { bias: 0.04 }); p.blob(22.5, 20, 3, 6, c, { bias: -0.02 }); }
  // 머리 + 깃털 뿔
  p.blob(16, 10, 6.4, 6, c, { dither: 0.5, bias: 0.12 });
  p.line(14, 4, 13, 1, c[3]); p.line(16, 4, 16, 0, c[4]); p.line(18, 4, 19, 1, c[3]);
  // 부리 · 눈
  p.poly([[11, 10], [6, 13], [11, 13]], (x, y) => y < 12 ? '#ffc04a' : '#e08a20');
  p.rect(12, 8, 2, 2, '#ff4a3a'); p.rect(18, 8, 2, 2, '#ff4a3a'); p.set(12, 8, '#ffd0c0'); p.set(18, 8, '#ffd0c0');
  // 다리
  p.rect(13, 27, 1, 3, '#e08a20'); p.rect(18, 27, 1, 3, '#e08a20'); p.rect(12, 29, 3, 1, '#e08a20'); p.rect(17, 29, 3, 1, '#e08a20');
  p.selout(0.6, 0.5);
  return p;
}
function picGhost(f) {
  const p = PIX.pic(32, 34);
  const g = PAL.ghost;
  const cx = 16;
  for (let y = 2; y < 32; y++) for (let x = 3; x < 29; x++) {
    const dx = x + 0.5 - cx;
    let inside;
    if (y < 14) inside = Math.hypot(dx, (y + 0.5 - 14) * 1.05) <= 12.2;
    else {
      const hem = 26 + Math.sin((x * 0.75) + f * 2.1) * 2.2;
      inside = Math.abs(dx) <= 12.2 - Math.max(0, y - 22) * 0.25 && y <= hem;
    }
    if (!inside) continue;
    const nx = dx / 12, ny = (y - 14) / 14;
    let I = 0.72 - nx * 0.28 - Math.max(0, ny) * 0.25 - Math.max(0, -ny) * 0.05;
    if (y < 14) I += (1 - Math.hypot(nx, (y - 14) / 12)) * 0.15;
    const fl = PIX.clamp(I, 0, 0.999) * (g.length - 1), b = Math.floor(fl);
    p.set(x, y, g[PIX.clamp(b + ((fl - b) > PIX.bayer(x, y) ? 1 : 0), 0, g.length - 1)]);
  }
  // 눈·입·볼
  p.rect(10, 11, 3, 5, '#1f2547'); p.rect(19, 11, 3, 5, '#1f2547');
  p.set(10, 11, '#9fd8ff'); p.set(19, 11, '#9fd8ff');
  p.rect(15, 18, 2, 3, '#1f2547'); p.set(14, 19, '#1f2547'); p.set(17, 19, '#1f2547');
  p.set(8, 16, '#c9b8ff'); p.set(23, 16, '#c9b8ff');
  p.outline('#3c4a78');
  return p;
}

/* ---------------- 아이콘 (HUD·말풍선) ---------------- */
function picIcon(kind) {
  const p = PIX.pic(16, 16);
  switch (kind) {
    case 'wood':
      p.poly([[2, 9], [10, 3], [14, 7], [6, 13]], (x, y) => PAL.plank[(x + y * 2) % 7 < 2 ? 2 : 3]);
      p.line(3, 9, 10, 4, PAL.plank[4]);
      p.blob(4.5, 11, 3.2, 3.2, PIX.ramp('#9e6c43', '#c99a62', '#e8c48a', '#f6dcaa'), { dither: 0.2, bias: 0.15 });
      p.set(4, 11, PAL.plank[2]); p.set(5, 10, PAL.plank[3]);
      p.selout(0.45, 0.32); break;
    case 'stone':
      p.blob(8, 9.5, 6, 4.6, PAL.stone, { dither: 0.3, bias: 0.05, ao: 0.3, flat: 0.8 });
      p.blob(6, 7.5, 3.4, 2.6, PAL.stone, { dither: 0.3, bias: 0.12 });
      p.line(9, 8, 10, 11, PAL.stone[1]);
      p.selout(0.45, 0.32); break;
    case 'fruit':
      p.blob(8, 9.5, 5.4, 5, PAL.apple, { dither: 0.3, bias: 0.05 });
      p.set(6, 7, PAL.apple[5]); p.set(6, 8, PAL.apple[4]);
      p.rect(8, 2, 1, 3, PAL.plank[2]); p.blob(11, 3.5, 2.2, 1.3, PAL.leaf, { bias: 0.1 });
      p.selout(0.45, 0.32); break;
    case 'shell': {
      const s = picShell(0, false); p.stamp(s, -2, 0); p.selout(0.5, 0.4); break;
    }
    case 'heart': case 'heartEmpty': case 'heartGold': {
      const R = kind === 'heart' ? PIX.ramp('#7a1222', '#c42436', '#ee4656', '#ff8090', '#ffc4cc')
        : kind === 'heartGold' ? PAL.gold : PIX.ramp('#2a2430', '#3c3446', '#4e455a', '#625870', '#7a7088');
      const H = ['..XX...XX..', '.XXXX.XXXX.', 'XXXXXXXXXXX', 'XXXXXXXXXXX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '..XXXXXXX..', '...XXXXX...', '....XXX....', '.....X.....'];
      H.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch !== 'X') return;
        const nx = (x - 5) / 6, ny = (y - 3.5) / 5; let I = 0.62 - nx * 0.25 - ny * 0.3;
        const f = PIX.clamp(I, 0, 0.999) * (R.length - 1), b = Math.floor(f);
        p.set(x + 2, y + 3, R[PIX.clamp(b + ((f - b) > PIX.bayer(x, y) ? 1 : 0), 0, R.length - 1)]);
      }));
      if (kind !== 'heartEmpty') { p.set(4, 5, '#ffffff'); p.set(5, 5, R[4]); p.set(4, 6, R[4]); }
      p.selout(0.45, 0.35); break;
    }
    case 'star': {
      const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.1 : 7; pts.push([8 + Math.cos(a) * r, 8.4 + Math.sin(a) * r]); }
      p.poly(pts, (x, y) => PAL.gold[(x + y) < 14 ? 4 : (x - y > 2 ? 2 : 3)]);
      p.set(6, 6, PAL.gold[5]); p.selout(0.45, 0.35); break;
    }
    case 'shield':
      p.poly([[3, 3], [13, 3], [13, 8], [8, 14], [3, 8]], (x, y) => x < 8 ? '#9fd8ff' : '#6aa8e0');
      p.poly([[5, 5], [8, 5], [8, 11], [5, 8]], '#d8f0ff'); p.selout(0.45, 0.35); break;
    case 'clock':
      p.circle(8, 8.5, 6, '#f2e8cf'); p.circle(8, 8.5, 4.6, '#fffaf0'); p.rect(8, 5, 1, 4, '#3a2a20'); p.rect(8, 8, 3, 1, '#3a2a20');
      p.rect(7, 1, 3, 1, '#c9a060'); p.selout(0.4, 0.3); break;
    case 'dash':
      for (let i = 0; i < 3; i++) p.rect(2 + i, 4 + i * 3, 9 - i * 2, 2, i === 1 ? '#ffffff' : '#bfe8ff');
      p.poly([[10, 3], [15, 8], [10, 13]], '#ffffff'); p.selout(0.45, 0.4); break;
    case 'dice':
      p.rect(3, 3, 10, 10, '#f6efff'); p.rect(3, 12, 10, 1, '#c8b8e8'); p.rect(12, 3, 1, 10, '#c8b8e8');
      for (const [x, y] of [[5, 5], [10, 5], [7, 8], [5, 10], [10, 10]]) p.rect(x, y, 2, 2, '#7a4ad8');
      p.selout(0.45, 0.35); break;
    case 'sun':
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.line(8 + Math.cos(a) * 5.5, 8 + Math.sin(a) * 5.5, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, '#ffb52e'); }
      p.blob(8, 8, 4.6, 4.6, PAL.gold, { dither: 0.3, bias: 0.15 }); p.selout(0.5, 0.4); break;
    case 'moon':
      p.ellipse(8, 8, 6, 6, (nx, ny, x, y) => Math.hypot(x + 0.5 - 11, y + 0.5 - 6) < 5 ? null : (nx + ny < -0.2 ? '#fffbe0' : '#f2e2a0'));
      p.set(5, 9, '#d8c278'); p.set(6, 12, '#d8c278'); p.selout(0.5, 0.4); break;
    case 'rain':
      p.blob(8, 6, 6, 3.6, PIX.ramp('#6a7a98', '#9aaac8', '#cfd8ea', '#eef3ff'), { bias: 0.1 });
      for (const [x, y] of [[4, 11], [8, 12], [12, 11], [6, 14], [10, 14]]) p.rect(x, y, 1, 2, '#8fd8ff');
      p.selout(0.45, 0.4); break;
  }
  return p;
}

/* ---------------- 건설바용 작은 건물 아이콘 (26x26) ---------------- */
function picBuildIcon(key) {
  const p = PIX.pic(26, 26);
  switch (key) {
    case 'tent':
      p.poly([[13, 3], [2, 23], [13, 23]], (x, y) => y > 19 ? PAL.cream[3] : PAL.red[3 + ((x + y) % 5 === 0 ? 1 : 0)]);
      p.poly([[13, 3], [13, 23], [24, 23]], (x, y) => y > 19 ? PAL.cream[1] : PAL.red[1]);
      p.poly([[13, 9], [9, 23], [17, 23]], '#3a2018');
      p.poly([[13, 9], [9, 23], [7, 23]], PAL.cream[3]);
      p.rect(13, 0, 1, 4, PAL.plank[2]); p.poly([[14, 0], [18, 1.5], [14, 3]], '#ffd64a');
      break;
    case 'fire': {
      p.blob(13, 21, 9, 3, PAL.stone, { dither: 0.3, ao: 0.3 });
      p.line(6, 21, 19, 17, PAL.plank[2]); p.line(6, 17, 19, 21, PAL.plank[3]);
      for (let y = 4; y < 20; y++) for (let x = 6; x < 21; x++) {
        const v = (20 - y) / 16, w = 6 * Math.pow(1 - v, 0.7), dx = Math.abs(x + 0.5 - 13 - Math.sin(v * 6) * v * 1.5);
        if (dx > w) continue;
        const I = 1 - dx / (w + 0.01) * 0.75 - v * 0.5 + 0.2, n = PAL.fire.length, f = PIX.clamp(I, 0, 0.999) * (n - 1), b = Math.floor(f);
        p.set(x, y, PAL.fire[PIX.clamp(b + ((f - b) > PIX.bayer(x, y) ? 1 : 0), 0, n - 1)]);
      }
      break;
    }
    case 'fence':
      for (let x = 1; x < 25; x++) { p.set(x, 9, PAL.plank[3]); p.set(x, 10, PAL.plank[2]); p.set(x, 16, PAL.plank[3]); p.set(x, 17, PAL.plank[2]); }
      for (let i = 0; i < 4; i++) { const x0 = 2 + i * 6; p.poly([[x0, 6], [x0 + 2, 3], [x0 + 4, 6], [x0 + 4, 23], [x0, 23]], (x) => x === x0 ? PAL.plank[5] : x >= x0 + 3 ? PAL.plank[2] : PAL.plank[4]); }
      break;
    case 'flower':
      for (const [x, y, c] of [[6, 7, 0], [12, 4, 1], [18, 7, 3], [9, 10, 2], [16, 10, 4]]) {
        p.line(x, y + 2, x, 14, PAL.leaf[3]);
        const col = PAL.flower[c]; p.set(x - 1, y, col); p.set(x + 1, y, col); p.set(x, y - 1, col); p.set(x, y + 1, col); p.set(x, y, '#ffe680');
      }
      p.rect(2, 13, 22, 2, '#4a2e1e');
      for (let y = 15; y < 23; y++) for (let x = 2; x < 24; x++) p.set(x, y, y === 15 ? PAL.plank[5] : (y - 16) % 3 === 2 ? PAL.plank[1] : PAL.plank[3]);
      break;
    case 'palm':
      for (let i = 0; i <= 16; i++) { const t = i / 16, x = 11 + t * 3 + Math.sin(t * 3) * 1.5, y = 24 - t * 15; for (let d = -1; d <= 1; d++) p.set(Math.round(x + d), Math.round(y), PAL.bark[d < 0 ? 4 : d > 0 ? 2 : 3]); if (i % 3 === 0) p.set(Math.round(x), Math.round(y), PAL.bark[1]); }
      for (const [a, len] of [[-2.7, 10], [-0.45, 10], [-1.9, 8], [-1.15, 8], [-3.3, 8], [0.2, 8]]) {
        for (let s = 0.5; s <= len; s += 0.5) { const t = s / len, x = 14 + Math.cos(a) * s, y = 8 + Math.sin(a) * s * 0.7 + t * t * 6; p.set(Math.round(x), Math.round(y), PAL.leaf[5]); p.set(Math.round(x), Math.round(y) + 1, PAL.leaf[3]); }
      }
      p.blob(15, 10, 1.6, 1.6, PIX.ramp('#3a2414', '#7e5430', '#a07040')); p.blob(12, 10, 1.6, 1.6, PIX.ramp('#3a2414', '#7e5430', '#a07040'));
      break;
    case 'shellart':
      p.blob(13, 21, 9, 3.6, PIX.ramp('#9c7c4c', '#bc9a62', '#d6b87c', '#ead49c'), { dither: 0.3, flat: 0.7, ao: 0.3 });
      p.blob(13, 15.5, 6, 3, PIX.ramp('#9c7c4c', '#bc9a62', '#d6b87c', '#ead49c'), { dither: 0.3, flat: 0.7, ao: 0.3, bias: 0.05 });
      p.blob(13, 10, 3.6, 2.8, PAL.shell, { dither: 0.3 }); p.blob(13, 6, 2.4, 2, PAL.shell, { dither: 0.3, bias: 0.08 }); p.blob(13, 3, 1.4, 1.4, PAL.shell, { bias: 0.12 });
      p.set(8, 20, PAL.shell[4]); p.set(9, 20, PAL.shell[3]); p.set(17, 21, PAL.shell[4]); p.set(18, 21, PAL.shell[3]);
      break;
    case 'flag':
      p.blob(7, 23, 4, 2, PAL.stone, { dither: 0.3 });
      for (let y = 2; y < 23; y++) { p.set(6, y, PAL.plank[4]); p.set(7, y, PAL.plank[2]); }
      p.blob(6.5, 2, 1.5, 1.5, PAL.gold, { bias: 0.1 });
      for (let x = 0; x < 15; x++) { const off = Math.round(Math.sin(x * 0.45) * 1); for (let y = 0; y < 9; y++) { const ex = x - 6, ey = y - 4; const red = (Math.abs(ex) + Math.abs(ey) <= 2); p.set(8 + x, 4 + y + off, red ? '#e9493e' : (y === 0 ? '#ffe36b' : y === 8 ? '#e9b52a' : '#ffd23f')); } }
      break;
  }
  p.selout(0.45, 0.32);
  return p;
}
// 비용 표시용 미니 아이콘 (10x10)
function picMini(kind) {
  const p = PIX.pic(10, 10);
  if (kind === 'wood') { p.rect(2, 3, 7, 4, PAL.plank[3]); p.rect(2, 3, 7, 1, PAL.plank[4]); p.blob(2.5, 5, 1.8, 2.2, PIX.ramp('#c99a62', '#e8c48a', '#f6dcaa'), { bias: 0.2 }); }
  else if (kind === 'stone') p.blob(5, 5.5, 4, 3.2, PAL.stone, { dither: 0.3, bias: 0.06, flat: 0.8 });
  else if (kind === 'fruit') { p.blob(5, 6, 3.4, 3.2, PAL.apple, { dither: 0.2, bias: 0.08 }); p.set(5, 1, PAL.plank[2]); p.set(5, 2, PAL.plank[2]); p.set(6, 1, PAL.leaf[4]); p.set(4, 5, PAL.apple[5]); }
  else if (kind === 'shell') {
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) { const dx = x + 0.5 - 5, dy = y + 0.5 - 8, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); if (dy > 0 || r > 5.4 || a > -0.3 || a < -2.84) continue; p.set(x, y, PAL.shell[Math.cos((a + 1.57) * 11) > 0 ? 4 : 2]); }
    p.rect(3, 8, 4, 1, PAL.shell[2]);
  }
  p.selout(0.45, 0.35);
  return p;
}

/* ---------------- 파티클 ---------------- */
function picParticle(kind, v = 0) {
  let p;
  switch (kind) {
    case 'leaf': p = PIX.pic(6, 5); p.rect(1, 1, 3, 2, PAL.leaf[4 + (v % 2)]); p.set(0, 2, PAL.leaf[3]); p.set(4, 1, PAL.leaf[3]); p.set(2, 1, PAL.leaf[6]); break;
    case 'leafG': p = PIX.pic(6, 5); p.rect(1, 1, 3, 2, PAL.gold[3 + (v % 2)]); p.set(0, 2, PAL.gold[2]); p.set(4, 1, PAL.gold[2]); p.set(2, 1, PAL.gold[5]); break;
    case 'chip': p = PIX.pic(3, 3); p.rect(0, 0, 2, 2, PAL.stone[4 + (v % 2)]); p.set(2, 1, PAL.stone[2]); p.set(1, 2, PAL.stone[2]); break;
    case 'petal': p = PIX.pic(3, 3); p.rect(0, 0, 2, 2, PAL.flower[v % PAL.flower.length]); p.set(2, 2, PIX.darken(PAL.flower[v % PAL.flower.length], 0.8)); break;
    case 'heart': p = PIX.pic(7, 6); ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'].forEach((r, y) => [...r].forEach((c, x) => c === 'X' && p.set(x + 1, y, y < 2 && x < 2 ? '#ffd0dc' : '#ff6f8f'))); p.outline('#8a1e3a'); break;
    case 'sparkle': p = PIX.pic(7, 7); { const c = v ? '#ffe683' : '#ffffff'; p.set(3, 0, c); p.set(3, 6, c); p.set(0, 3, c); p.set(6, 3, c); p.rect(3, 1, 1, 5, c); p.rect(1, 3, 5, 1, c); p.set(3, 3, '#ffffff'); } break;
    case 'drop': p = PIX.pic(2, 3); p.rect(0, 0, 2, 3, '#bfe9ff'); p.set(0, 0, '#ffffff'); break;
  }
  return p;
}

/* ---------------- 스프라이트 묶기 ---------------- */
function mkSprite(p, ax, ay) {
  return { c: p.canvas(), w: p.w, h: p.h, ax, ay, hl: p.silhouetteOutline('#ffffff').canvas(), pic: p };
}
function buildArt() {
  ART.res = {
    tree: [0, 1, 2].map(v => ({ n: mkSprite(picTree(v, false), 18, 45), g: mkSprite(picTree(v, true), 18, 45) })),
    rock: [0, 1].map(v => ({ n: mkSprite(picRock(v, false), 16, 23), g: mkSprite(picRock(v, true), 16, 23) })),
    fruit: [0, 1].map(v => ({ n: mkSprite(picBush(v, false), 17, 27), g: mkSprite(picBush(v, true), 17, 27) })),
    shell: [0, 1].map(v => ({ n: mkSprite(picShell(v, false), 10, 14), g: mkSprite(picShell(v, true), 10, 14) })),
  };
  // 건물: 프레임 배열 (애니메이션 없는 건물은 1프레임)
  ART.build = {
    tent: [mkSprite(picTent(), 19, 33)],
    fire: [0, 1, 2, 3].map(f => mkSprite(picFire(f), 17, 34)),
    fence: [mkSprite(picFence(), 19, 28)],
    flower: [0, 1].map(f => mkSprite(picFlower(f), 18, 27)),
    palm: [0, 1, 2, 3].map(f => mkSprite(picPalm(f), 20, 58)),
    shellart: [mkSprite(picShellTower(), 16, 44)],
    flag: [0, 1, 2, 3].map(f => mkSprite(picFlag(f), 10, 48)),
  };
  ART.otter = [0, 1, 2].map(m => mkSprite(picOtter(m), 16, 30));
  ART.crow = [0, 1].map(m => mkSprite(picCrow(m), 16, 30));
  ART.ghost = [0, 1, 2].map(f => mkSprite(picGhost(f), 16, 22));
  ART.icon = {};
  for (const k of ['wood', 'stone', 'fruit', 'shell', 'heart', 'heartEmpty', 'heartGold', 'star', 'shield', 'clock', 'dash', 'dice', 'rain', 'sun', 'moon']) {
    const p = picIcon(k); ART.icon[k] = { c: p.canvas(), w: p.w, h: p.h };
  }
  ART.bicon = {}; for (const k of ['tent', 'fire', 'fence', 'flower', 'palm', 'shellart', 'flag']) ART.bicon[k] = picBuildIcon(k).canvas();
  ART.mini = {}; for (const k of ['wood', 'stone', 'fruit', 'shell']) ART.mini[k] = picMini(k).canvas();
  ART.part = {
    leaf: [0, 1].map(v => picParticle('leaf', v).canvas()), leafG: [0, 1].map(v => picParticle('leafG', v).canvas()),
    chip: [0, 1].map(v => picParticle('chip', v).canvas()), petal: [0, 1, 2, 3, 4, 5].map(v => picParticle('petal', v).canvas()),
    heart: [picParticle('heart').canvas()], sparkle: [picParticle('sparkle', 0).canvas(), picParticle('sparkle', 1).canvas()],
    drop: [picParticle('drop').canvas()],
  };
  ART.ready = true;
}
// 아이콘 → DOM용 data URL (icon / bicon / mini)
const ICON_URL = {};
function iconURL(k, set = 'icon') {
  const key = set + ':' + k;
  if (ICON_URL[key]) return ICON_URL[key];
  const src = set === 'icon' ? ART.icon[k].c : ART[set][k];
  return (ICON_URL[key] = src.toDataURL());
}

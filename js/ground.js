/* ============ 삼분의숲 — ground ============
   지형·바다·밀물 렌더링 (720x540 논리 해상도, 1px = 픽셀아트 1칸)
   - 타일 경계를 노이즈로 흔들어 유기적인 해안선을 만든다 (게임 판정은 기존 타일 그대로)
   - 픽셀마다 '잠기는 시각'을 미리 계산해 두고, 시간이 흐를 때 바뀌는 픽셀만 갱신한다
     (젖음 → 거품 → 얕은 물 → 깊은 물). 잠긴 섬은 물속에 비쳐 보인다.
   - 해안 거품·얕은 물 띠는 반해상도 거리장으로 만들고, 밀물이 진행될 때만 다시 계산한다 */
'use strict';
const Ground = (() => {
  const W = 720, H = 540, N = W * H, HW = W >> 1, HH = H >> 1;
  const WARP = 5.5;                 // 해안선 흔들림 (px)
  const WARP2 = 9;                  // 잔디/모래 경계 흔들림 (px) — 판정과 무관해서 더 크게
  const LEAD = 1.25;                // 타일 하나를 물이 쓸고 지나가는 시간 (초)
  const WARN = 3.5, FOAM = 0.28, DEEP = 7;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const C = PIX.hex;

  const groundCv = mk(W, H), gx = groundCv.getContext('2d');
  const landCv = mk(W, H), lx = landCv.getContext('2d');
  const landImg = lx.createImageData(W, H), out = new Uint32Array(landImg.data.buffer);
  // 침수 예고 영역 (깜빡이는 하늘색 덮개) — 젖은 픽셀과 정확히 같은 모양
  const warnCv = mk(W, H), wx = warnCv.getContext('2d');
  const warnImg = wx.createImageData(W, H), wout = new Uint32Array(warnImg.data.buffer);
  const WARNC = PIX.pack(120, 214, 255, 255);
  const oceanCv = mk(W, H);
  const fxCv = { shallow: mk(HW, HH), edge: mk(HW, HH), rings: [0, 1, 2, 3, 4, 5].map(() => mk(HW, HH)) };

  // 정적 데이터
  const cls = new Uint8Array(N);       // 0 물, 1 모래, 2 잔디
  const owner = new Int16Array(N);     // 소속 타일 index
  const fxs = new Float32Array(N), fys = new Float32Array(N);   // 흔든 좌표
  const landCol = new Uint32Array(N);
  // 판마다 바뀌는 데이터
  const pft = new Float32Array(N);
  const wOff = new Float32Array(N);    // 젖기 시작 시각 오프셋 (유기적으로 번지게)
  const state = new Uint8Array(N);     // 0 마름 1 젖음 2 거품 3 잠김 4 깊이 잠김
  const dry = new Uint8Array(N);
  let order = new Uint32Array(0), ordT = new Float32Array(0), nOrd = 0;
  let p0 = 0, p1 = 0, p2 = 0, p3 = 0;
  const wq = [];                       // 젖음 대기열
  let ringsDirty = true, ringsAt = 0, inited = false;
  let wavePatA = null, wavePatB = null;
  const sparks = [];

  /* ---------- 유틸 ---------- */
  function chamfer(src, w, h) {        // src[i]=1 인 곳으로부터의 거리
    const d = new Float32Array(w * h), INF = 1e6, D2 = 1.4142;
    for (let i = 0; i < w * h; i++) d[i] = src[i] ? 0 : INF;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; let v = d[i]; if (v === 0) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) { v = Math.min(v, d[i - w] + 1); if (x > 0) v = Math.min(v, d[i - w - 1] + D2); if (x < w - 1) v = Math.min(v, d[i - w + 1] + D2); }
      d[i] = v;
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x; let v = d[i]; if (v === 0) continue;
      if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < h - 1) { v = Math.min(v, d[i + w] + 1); if (x < w - 1) v = Math.min(v, d[i + w + 1] + D2); if (x > 0) v = Math.min(v, d[i + w - 1] + D2); }
      d[i] = v;
    }
    return d;
  }
  const rgb = PIX.rgba, pack = PIX.pack;
  function mixc(a, b, t) { const A = rgb(a), B = rgb(b); return pack(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, 255); }

  /* ---------- 1회: 지형 생성 ---------- */
  function init() {
    if (inited) return; inited = true;
    // 흔들림(warp)은 4px 격자에서 노이즈를 구해 보간 (빠르게)
    const GS = 4, GW = W / GS + 2, GH = H / GS + 2, gwx = new Float32Array(GW * GH), gwy = new Float32Array(GW * GH);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      gwx[j * GW + i] = (NOISE.fbm(i * GS / 24, j * GS / 24, 101, 3) - 0.5) * 2 * WARP;
      gwy[j * GW + i] = (NOISE.fbm(i * GS / 24, j * GS / 24, 202, 3) - 0.5) * 2 * WARP;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const gxf = x / GS, gyf = y / GS, i0 = Math.floor(gxf), j0 = Math.floor(gyf), u = gxf - i0, v = gyf - j0;
      const k = j0 * GW + i0;
      const wx = (gwx[k] * (1 - u) + gwx[k + 1] * u) * (1 - v) + (gwx[k + GW] * (1 - u) + gwx[k + GW + 1] * u) * v;
      const wy = (gwy[k] * (1 - u) + gwy[k + 1] * u) * (1 - v) + (gwy[k + GW] * (1 - u) + gwy[k + GW + 1] * u) * v;
      const fx = x + 0.5 + wx, fy = y + 0.5 + wy;
      const tx = Math.max(0, Math.min(MW - 1, Math.floor(fx / TS))), ty = Math.max(0, Math.min(MH - 1, Math.floor(fy / TS)));
      const i = y * W + x;
      owner[i] = ty * MW + tx; fxs[i] = fx; fys[i] = fy;
      if (tileType(tx, ty) === 0) cls[i] = 0;
      else {
        // 잔디/모래 경계는 다른 노이즈로 더 크게 흔든다
        const k2 = WARP2 / WARP;
        const gx2 = x + 0.5 - wy * k2 * 0.9, gy2 = y + 0.5 + wx * k2 * 0.9;
        const ux = Math.max(0, Math.min(MW - 1, Math.floor(gx2 / TS))), uy = Math.max(0, Math.min(MH - 1, Math.floor(gy2 / TS)));
        cls[i] = Math.max(1, tileType(ux, uy));
      }
    }
    // 거리장
    const isW = new Uint8Array(N), isS = new Uint8Array(N), isL = new Uint8Array(N);
    for (let i = 0; i < N; i++) { isW[i] = cls[i] === 0; isS[i] = cls[i] === 1; isL[i] = cls[i] !== 0; }
    const dWater = chamfer(isW, W, H), dSand = chamfer(isS, W, H), dLand = chamfer(isL, W, H);
    buildLandColors(dWater, dSand);
    buildOcean(dLand);
    buildWaves();
  }

  function buildLandColors(dWater, dSand) {
    const G = ['#4b984f', '#52a055', '#59a85a', '#61b05f', '#68b663'].map(C);
    const S = ['#d7b87d', '#dfc289', '#e6cb94', '#ecd49f', '#f1dbaa'].map(C);
    const RIM = C('#3f8547'), RIML = C('#77c26a'), BLADE_T = C('#80c96d'), BLADE_B = C('#4a914d');
    const WET = C('#b48f5c'), WET2 = C('#c4a26b'), SHADOW = C('#c8a76c'), RIPPLE = C('#f5e3b8'), SPECK = C('#c7a66d');
    const FL = ['#f6f2e6', '#ffd95a', '#ff9ec0', '#a8d8ff'].map(C), FLC = C('#ffc93c');
    const H1 = NOISE.hash;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, c = cls[i];
      if (c === 0) { landCol[i] = 0; continue; }
      const n = NOISE.vnoise(x / 34, y / 34, 7) * 0.65 + NOISE.vnoise(x / 9, y / 9, 8) * 0.35;
      let col;
      if (c === 2) {
        const k = Math.max(0, Math.min(4, Math.floor(n * 5 + (H1(x, y, 3) - 0.5) * 0.9)));
        col = G[k];
        // 풀잎 (2px 세로): 윗칸 밝게, 아랫칸 어둡게
        if (H1(x, y, 7) > 0.982) col = BLADE_T;
        else if (H1(x, y - 1, 7) > 0.982) col = BLADE_B;
        else if (H1(x - 1, y - 1, 7) > 0.982) col = G[Math.max(0, k - 1)];
        // 작은 꽃 (십자 모양)
        const fc = (xx, yy) => H1(xx, yy, 9) > 0.99925;
        if (fc(x, y)) col = FLC;
        else if (fc(x - 1, y) || fc(x + 1, y) || fc(x, y - 1) || fc(x, y + 1)) {
          const cx = fc(x - 1, y) ? x - 1 : fc(x + 1, y) ? x + 1 : x, cy = fc(x, y - 1) ? y - 1 : fc(x, y + 1) ? y + 1 : y;
          col = FL[Math.floor(H1(cx, cy, 10) * FL.length)];
        }
        // 모래와 맞닿은 가장자리: 아래쪽(그늘)은 어둡게, 위쪽은 밝게
        const ds = dSand[i];
        if (ds <= 1.5) {
          const below = y + 2 < H && cls[i + 2 * W] === 1, above = y - 2 >= 0 && cls[i - 2 * W] === 1;
          col = below ? RIM : above ? RIML : mixc(col, RIM, 0.55);
        }
      } else {
        const k = Math.max(0, Math.min(4, Math.floor(n * 5 + (H1(x, y, 4) - 0.5) * 0.7)));
        col = S[k];
        // 바람 무늬: 낮은 빈도 + 덩어리 단위로만 보이게
        const patch = NOISE.vnoise(x / 70, y / 70, 12);
        const rip = Math.sin(x * 0.21 + y * 0.09 + NOISE.vnoise(x / 26, y / 26, 5) * 6);
        if (patch > 0.55 && rip > 0.94) col = S[Math.min(4, k + 1)];
        else if (patch > 0.62 && rip < -0.97) col = S[Math.max(0, k - 1)];
        const h = H1(x, y, 6);
        if (h > 0.988) col = SPECK; else if (h > 0.9975) col = RIPPLE;
        // 잔디 아래 그늘 (잔디가 살짝 높게 보이도록)
        if ((y - 1 >= 0 && cls[i - W] === 2) || (y - 2 >= 0 && cls[i - 2 * W] === 2) || (y - 3 >= 0 && cls[i - 3 * W] === 2 && H1(x, y, 2) > 0.4)) col = SHADOW;
        // 물가: 젖은 모래
        const dw = dWater[i];
        if (dw < 8) {
          const t = Math.pow(1 - dw / 8, 1.2);
          col = mixc(col, dw < 2.5 ? WET : WET2, Math.min(1, t * 1.05));
        }
      }
      landCol[i] = col;
    }
  }

  function buildOcean(dLand) {
    const g = oceanCv.getContext('2d'), img = g.createImageData(W, H), o = new Uint32Array(img.data.buffer);
    const DEEPC = C('#1b5687'), MID = C('#2873a6'), SHAL = C('#45a0cb'), LAG = C('#58b4d5');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, n = (NOISE.vnoise(x / 26, y / 18, 31) - 0.5) * 0.18;
      let col;
      if (cls[i] === 0) {
        const t = Math.min(1, dLand[i] / 30 + n);
        col = t < 0.45 ? mixc(SHAL, MID, t / 0.45) : mixc(MID, DEEPC, Math.min(1, (t - 0.45) / 0.55));
      } else col = mixc(LAG, SHAL, Math.max(0, Math.min(1, 0.35 + n * 2.2)));
      // 아주 옅은 물결 줄무늬
      if (Math.sin(y * 0.55 + x * 0.08 + NOISE.vnoise(x / 30, y / 30, 33) * 5) > 0.93) col = mixc(col, C('#7fcbe6'), 0.25);
      o[i] = col;
    }
    g.putImageData(img, 0, 0);
  }

  function buildWaves() {
    const mkTile = (seed, n, alpha) => {
      const c = mk(96, 96), g = c.getContext('2d');
      for (let k = 0; k < n; k++) {
        const x = Math.floor(NOISE.hash(k, 1, seed) * 96), y = Math.floor(NOISE.hash(k, 2, seed) * 96), len = 3 + Math.floor(NOISE.hash(k, 3, seed) * 6);
        g.fillStyle = 'rgba(214,244,255,' + alpha + ')'; g.fillRect(x, y, len, 1);
        g.fillStyle = 'rgba(214,244,255,' + (alpha * 0.5) + ')'; g.fillRect(x + 1, y + 1, Math.max(1, len - 3), 1);
        if (x + len > 96) { g.fillStyle = 'rgba(214,244,255,' + alpha + ')'; g.fillRect(x - 96, y, len, 1); }
      }
      return c;
    };
    wavePatA = gx.createPattern(mkTile(5, 26, 0.75), 'repeat');
    wavePatB = gx.createPattern(mkTile(9, 18, 0.55), 'repeat');
  }

  /* ---------- 판마다: 잠기는 시각 계산 ---------- */
  // floodTimeOf(tx,ty) → 그 타일이 잠기는 시각 (바다는 0)
  function reset(floodTimeOf) {
    init();
    const FT = new Float32Array(MW * MH);
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) FT[ty * MW + tx] = floodTimeOf(tx, ty);
    let nLand = 0;
    for (let i = 0; i < N; i++) {
      if (cls[i] === 0) { pft[i] = 0; continue; }
      nLand++;
      const o = owner[i], f = FT[o], tx = o % MW, ty = (o / MW) | 0, fx = fxs[i], fy = fys[i];
      let dmin = 1;
      for (let ny = ty - 1; ny <= ty + 1; ny++) for (let nx = tx - 1; nx <= tx + 1; nx++) {
        if ((nx === tx && ny === ty) || nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
        if (FT[ny * MW + nx] >= f - 0.01) continue;
        const rx0 = nx * TS, ry0 = ny * TS;
        const dx = Math.max(rx0 - fx, 0, fx - (rx0 + TS)), dy = Math.max(ry0 - fy, 0, fy - (ry0 + TS));
        const d = Math.hypot(dx, dy) / TS; if (d < dmin) dmin = d;
      }
      const x = i % W, y = (i / W) | 0;
      pft[i] = f - LEAD * (1 - dmin) + (NOISE.vnoise(x / 5, y / 5, 41) - 0.5) * 0.4;
      // 모든 픽셀이 '잠기기 최소 3.5초 전'부터 젖어 보이도록 (원본의 예고 시간 유지) + 경계는 유기적으로
      wOff[i] = WARN + 0.8 * NOISE.vnoise(x / 9, y / 9, 43) + (1 - dmin) * 0.6;
    }
    // 계수 정렬 (0.02초 단위)
    const BK = 0.02, NB = 12000, cnt = new Uint32Array(NB + 1);
    const bucket = t => Math.max(0, Math.min(NB - 1, Math.floor(t / BK)));
    for (let i = 0; i < N; i++) if (cls[i] !== 0) cnt[bucket(pft[i]) + 1]++;
    for (let b = 1; b <= NB; b++) cnt[b] += cnt[b - 1];
    if (order.length !== nLand) { order = new Uint32Array(nLand); ordT = new Float32Array(nLand); }
    for (let i = 0; i < N; i++) if (cls[i] !== 0) { const k = cnt[bucket(pft[i])]++; order[k] = i; }
    for (let k = 0; k < nLand; k++) ordT[k] = pft[order[k]];
    nOrd = nLand; p0 = p1 = p2 = p3 = 0; wq.length = 0;
    for (let i = 0; i < N; i++) { out[i] = landCol[i]; state[i] = 0; dry[i] = cls[i] !== 0 ? 1 : 0; }
    wout.fill(0);
    lx.putImageData(landImg, 0, 0); wx.putImageData(warnImg, 0, 0);
    ringsDirty = true; ringsAt = -1e9; sparks.length = 0;
    rebuildRings(true);
  }

  /* ---------- 매 프레임: 바뀐 픽셀만 갱신 ---------- */
  function wetCol(i) {
    const c = rgb(landCol[i]), l = (c[0] + c[1] + c[2]) / 3;
    const r = c[0] * 0.72 + l * 0.08, g = c[1] * 0.78 + l * 0.06, b = c[2] * 0.86 + l * 0.1 + 6;
    const x = i % W, y = (i / W) | 0;
    return ((x + y * 3) % 11 === 0 && NOISE.hash(x, y, 77) > 0.5) ? pack(r + 40, g + 46, b + 52, 255) : pack(r, g, b, 255);
  }
  function foamCol(i) { return (i * 2654435761 >>> 28) & 1 ? C('#f2fbff') : C('#d4f1fb'); }
  const TINT = rgb(C('#2f88b6'));
  function drownCol(i, deep) {
    const c = rgb(landCol[i]), t = deep ? 0.62 : 0.48;
    return pack(c[0] + (TINT[0] - c[0]) * t, c[1] + (TINT[1] - c[1]) * t, c[2] + (TINT[2] - c[2]) * t, deep ? 105 : 150);
  }
  function update(clock) {
    let minx = W, miny = H, maxx = -1, maxy = -1;
    const touch = i => { const x = i % W, y = (i / W) | 0; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; };
    // 젖음: 정렬 순서로 훑되 픽셀마다 시작 시각이 달라 뒤처진 픽셀은 대기열에 남긴다
    while (p0 < nOrd && ordT[p0] - (WARN + 1.5) <= clock) { wq.push(order[p0++]); }
    if (wq.length) {
      let j = 0;
      for (let q = 0; q < wq.length; q++) {
        const i = wq[q];
        if (state[i] >= 1) continue;
        if (pft[i] - wOff[i] <= clock) { state[i] = 1; out[i] = wetCol(i); wout[i] = WARNC; touch(i); }
        else wq[j++] = i;
      }
      wq.length = j;
    }
    while (p1 < nOrd && ordT[p1] <= clock) { const i = order[p1++]; if (state[i] < 2) { state[i] = 2; out[i] = foamCol(i); wout[i] = 0; dry[i] = 0; touch(i); ringsDirty = true; } }
    while (p2 < nOrd && ordT[p2] + FOAM <= clock) { const i = order[p2++]; if (state[i] < 3) { state[i] = 3; out[i] = drownCol(i, 0); touch(i); } }
    while (p3 < nOrd && ordT[p3] + DEEP <= clock) { const i = order[p3++]; if (state[i] < 4) { state[i] = 4; out[i] = drownCol(i, 1); touch(i); } }
    if (maxx >= 0) {
      lx.putImageData(landImg, 0, 0, minx, miny, maxx - minx + 1, maxy - miny + 1);
      wx.putImageData(warnImg, 0, 0, minx, miny, maxx - minx + 1, maxy - miny + 1);
    }
    const now = performance.now();
    if (ringsDirty && now - ringsAt > 140) rebuildRings();
  }

  /* ---------- 해안 효과 (반해상도 거리장) ---------- */
  const ringImgs = {};
  function rebuildRings() {
    ringsDirty = false; ringsAt = performance.now();
    const src = new Uint8Array(HW * HH);
    for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) {
      const i = (y * 2) * W + x * 2;
      src[y * HW + x] = (dry[i] + dry[i + 1] + dry[i + W] + dry[i + W + 1]) >= 2 ? 1 : 0;
    }
    const d = chamfer(src, HW, HH);
    if (!ringImgs.shallow) {
      const g = fxCv.shallow.getContext('2d');
      ringImgs.shallow = g.createImageData(HW, HH); ringImgs.edge = g.createImageData(HW, HH);
      ringImgs.rings = fxCv.rings.map(c => c.getContext('2d').createImageData(HW, HH));
    }
    const sh = new Uint32Array(ringImgs.shallow.data.buffer), ed = new Uint32Array(ringImgs.edge.data.buffer);
    const rg = ringImgs.rings.map(im => new Uint32Array(im.data.buffer));
    const SH = rgb(C('#8fe0f0')), WH = [255, 255, 255];
    for (let i = 0; i < HW * HH; i++) {
      const v = d[i];
      // 얕은 물 띠
      sh[i] = v > 0 && v < 9 ? pack(SH[0], SH[1], SH[2], 120 * Math.pow(1 - v / 9, 1.6)) : 0;
      // 물가 거품
      ed[i] = v > 0 && v <= 1.01 ? pack(255, 255, 255, 235) : (v > 1.01 && v <= 2.1 ? pack(225, 246, 255, 110) : 0);
      // 밀려오는 물결 링 (k=5 먼 곳 → k=0 물가)
      for (let k = 0; k < 6; k++) {
        const c0 = 1.6 + k * 1.15;
        rg[k][i] = (v > c0 && v <= c0 + 1.0 && NOISE.hash(i % HW >> 1, (i / HW | 0) >> 1, k + 3) > 0.28) ? pack(WH[0], WH[1], WH[2], 190 - k * 26) : 0;
      }
    }
    fxCv.shallow.getContext('2d').putImageData(ringImgs.shallow, 0, 0);
    fxCv.edge.getContext('2d').putImageData(ringImgs.edge, 0, 0);
    fxCv.rings.forEach((c, k) => c.getContext('2d').putImageData(ringImgs.rings[k], 0, 0));
  }

  /* ---------- 그리기 ---------- */
  function isWaterPx(x, y) { x |= 0; y |= 0; return x >= 0 && y >= 0 && x < W && y < H && !dry[y * W + x]; }
  function draw(ctx, t, dt) {
    gx.setTransform(1, 0, 0, 1, 0, 0);
    gx.globalAlpha = 1; gx.globalCompositeOperation = 'source-over'; gx.imageSmoothingEnabled = false;
    gx.drawImage(oceanCv, 0, 0);
    // 물결 무늬 두 겹 (정수 픽셀 단위로 흘러가게)
    const ax = Math.floor(t * 7) % 96, ay = Math.floor(t * 2.5) % 96, bx = Math.floor(-t * 5) % 96, by = Math.floor(t * 3.5) % 96;
    gx.globalAlpha = 0.45 + 0.15 * Math.sin(t * 0.9);
    gx.translate(ax, ay); gx.fillStyle = wavePatA; gx.fillRect(-ax, -ay, W, H); gx.setTransform(1, 0, 0, 1, 0, 0);
    gx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 1.3 + 1);
    gx.translate(bx, by); gx.fillStyle = wavePatB; gx.fillRect(-bx, -by, W, H); gx.setTransform(1, 0, 0, 1, 0, 0);
    gx.globalAlpha = 1;
    gx.drawImage(landCv, 0, 0);
    // 침수 예고: 젖은 땅 위로 하늘색이 깜빡인다 (원본의 파란 깜빡임과 같은 역할)
    gx.globalAlpha = 0.16 + 0.2 * (0.5 + 0.5 * Math.sin(t * 6));
    gx.drawImage(warnCv, 0, 0);
    gx.globalAlpha = 1;
    // 해안 효과
    gx.drawImage(fxCv.shallow, 0, 0, W, H);
    gx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 2.2);
    gx.drawImage(fxCv.edge, 0, 0, W, H);
    // 밀려오는 물결: 먼 곳(5)에서 물가(0)로
    const ph = (t * 0.55) % 1, kf = (1 - ph) * 6, k = Math.min(5, Math.floor(kf)), fr = kf - k;
    gx.globalAlpha = 0.55 * (1 - fr) * (0.4 + 0.6 * (1 - k / 6)); gx.drawImage(fxCv.rings[k], 0, 0, W, H);
    if (k + 1 < 6) { gx.globalAlpha = 0.55 * fr * (0.4 + 0.6 * (1 - (k + 1) / 6)); gx.drawImage(fxCv.rings[k + 1], 0, 0, W, H); }
    gx.globalAlpha = 1;
    // 반짝임
    if (vr() < dt * 10) {
      for (let tries = 0; tries < 6; tries++) {
        const x = vr() * W, y = vr() * H;
        if (isWaterPx(x, y)) { sparks.push({ x: x | 0, y: y | 0, t: 0, life: 0.35 + vr() * 0.3 }); break; }
      }
    }
    for (const s of sparks) {
      s.t += dt; const a = Math.sin(Math.PI * Math.min(1, s.t / s.life));
      gx.globalAlpha = a; gx.fillStyle = '#ffffff';
      gx.fillRect(s.x, s.y, 1, 1);
      if (a > 0.5) { gx.globalAlpha = a * 0.6; gx.fillRect(s.x - 1, s.y, 3, 1); gx.fillRect(s.x, s.y - 1, 1, 3); }
    }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].t >= sparks[i].life) sparks.splice(i, 1);
    gx.globalAlpha = 1;
    ctx.drawImage(groundCv, 0, 0, W, H);
  }

  return { init, reset, update, draw, isWaterPx, canvas: groundCv };
})();

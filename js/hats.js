/* ============ 삼분의숲 — hats ============
   꾸미기 소품: 모자. 모자 그림은 아이템마다 코드로 한 번만 그리고,
   캐릭터 애니메이션 프레임마다 머리 위치를 자동으로 찾아 얹는다.
   - 머리 꼭대기가 둥근 캐릭터: 머리 맨 위 가운데
   - 머리 위에 튀어나온 게 두 개인 캐릭터(개구리 눈, 흑기즈모 귀): 그 사이에 놓고
     튀어나온 부분을 모자 위에 다시 그려 가려지지 않게
   - 개구리 옆모습: 눈 뒤쪽 뒤통수
   그림만 바뀌고 점수·규칙은 그대로다.
   ▶ 모자 추가하기: HATS에 한 줄 (pal = 테두리·바탕·그늘·밝은 곳·띠·띠 그늘 색, shape = 'straw' | 'top' | 'beanie') */
'use strict';
const HATS = {
  basic: { name: '모자 없음' },
  straw: { name: '밀짚모자', price: 60, shape: 'straw', pal: ['#5c3a18', '#e8b04a', '#b97a2a', '#f8d688', '#d84a3a', '#962c24'] },
};

const Hats = (() => {
  // 캐릭터별 크기·놓는 방식 (크기 = 챙 폭 / 칸 크기)
  const CFG = {
    gizmo:  { brim: 0.36, between: false },
    monkey: { brim: 0.33, between: false },
    dark:   { brim: 0.36, head: true },
    frog:   { brim: 0.28, between: true, sideBehind: true },
  };
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];

  /* ---------- 모자 그림 (픽셀 배열) ---------- */
  // 앞모습. bw 챙 폭, cw 모자 몸통 폭, ch 몸통 높이. skew: 옆모습일 때 몸통을 뒤로 1px
  function sprite(def, bw, cw, ch, skew = 0) {
    const [OL, ST, SH, HI, BD, BDd] = def.pal.map(hex);
    const W = bw + 2, H = ch + 4, px = new Array(W * H).fill(null), cx = W / 2;
    const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = c; };
    const span = half => { const xs = []; for (let x = 0; x < W; x++) if (Math.abs(x + 0.5 - cx) <= half) xs.push(x); return xs; };
    const beanie = def.shape === 'beanie';
    for (let y = 0; y < ch; y++) {                                   // 몸통
      let half = cw / 2 - (y === 0 ? 1 : 0);
      if (beanie) half = Math.min(cw / 2, cw / 2 * Math.sqrt(Math.max(0.15, (y + 1) / ch)) + 0.5);
      const xs = span(half).map(x => x + (y < ch - 1 ? skew : 0)); if (!xs.length) continue;
      xs.forEach(x => set(x, y, ST));
      set(xs[0], y, OL); set(xs[xs.length - 1], y, OL);
      if (y === 0) xs.forEach(x => set(x, y, OL));
      else if (xs.length > 3) set(xs[1], y, HI);
    }
    const by = ch - 2;                                               // 띠
    span(cw / 2).slice(1, -1).forEach(x => { set(x + skew, by, BD); set(x + skew, by + 1, BDd); });
    if (beanie) {                                                    // 털모자: 챙 대신 접힌 단
      for (const [y, c] of [[ch, BD], [ch + 1, BDd]]) { const xs = span(cw / 2 + 0.5); xs.forEach(x => set(x, y, c)); set(xs[0], y, OL); set(xs[xs.length - 1], y, OL); }
      span(cw / 2 - 0.5).forEach(x => set(x, ch + 2, OL));
    } else {                                                         // 챙 (납작한 타원 3줄)
      const half = def.shape === 'top' ? bw / 2 - 2 : bw / 2;
      [[ch, half - 2, ST], [ch + 1, half, ST], [ch + 2, half - 1, SH]].forEach(([y, h, c]) => {
        const xs = span(h); xs.forEach(x => set(x, y, c)); set(xs[0], y, OL); set(xs[xs.length - 1], y, OL);
      });
      span(half - 2).forEach(x => set(x, ch + 3, OL));
    }
    return { W, H, px };
  }

  /* ---------- 머리 찾기 ---------- */
  // 프레임 한 칸의 열마다 가장 위 픽셀
  function profile(a, W, x0, y0, cell) {
    const t = new Array(cell).fill(999);
    for (let x = 0; x < cell; x++) for (let y = 0; y < cell; y++) if (a[((y0 + y) * W + x0 + x) * 4 + 3] > 40) { t[x] = y; break; }
    return t;
  }
  // 위로 튀어나온 두 봉우리 (사이가 2px 이상 파인 곳)
  function bumps(t) {
    const tm = Math.min(...t), cand = []; let best = null;
    t.forEach((v, i) => { if (v <= tm + 4) cand.push(i); });
    for (const a of cand) for (const b of cand) {
      if (b - a < 8) continue;
      let dip = 0; for (let i = a; i <= b; i++) dip = Math.max(dip, t[i]);
      const depth = dip - Math.max(t[a], t[b]);
      if (depth >= 2 && (!best || depth > best.depth || (depth === best.depth && b - a > best.b - best.a))) best = { depth, a, b, dip };
    }
    return best;
  }
  const grow = (t, i, lim) => { let l = i, r = i; while (l > 0 && t[l - 1] <= lim) l--; while (r < t.length - 1 && t[r + 1] <= lim) r++; const o = []; for (let k = l; k <= r; k++) o.push(k); return o; };

  // 프레임마다: 모자 가운데 x, 모자 아래끝 y, 모양(front/side), 위에 다시 그릴 열
  function anchor(t, cfg, dir, cell) {
    const tm = Math.min(...t); if (tm >= 999) return null;
    const bw = Math.round(cell * cfg.brim);
    if (cfg.head) {                                                // 귀가 솟은 캐릭터: 머리 폭 가운데에 앉히고, 더 높은 귀는 위에 다시
      const r = tm + Math.round(cell * 0.18), cols = []; t.forEach((v, i) => { if (v <= r) cols.push(i); });
      let best = [], cur = [];                                     // 머리 높이에서 가장 넓은 덩어리
      for (const x of cols) { if (cur.length && x !== cur[cur.length - 1] + 1) cur = []; cur.push(x); if (cur.length > best.length) best = cur.slice(); }
      const cx = (best[0] + best[best.length - 1]) / 2, c0 = Math.round(cx);
      let tc = 0; for (let x = c0 - 2; x <= c0 + 2; x++) tc = Math.max(tc, t[Math.max(0, Math.min(cell - 1, x))]);
      const bottom = tc + 3, over = [];
      for (let x = Math.floor(cx - bw / 2) - 1; x <= Math.ceil(cx + bw / 2) + 1; x++) if (x >= 0 && x < cell && t[x] < bottom - 5 && Math.abs(x + 0.5 - cx) > bw * 0.3) over.push(x);   // 모자 몸통 안쪽 귀 끝은 모자 속에
      return { cx, bottom, bw, side: 0, over, lim: bottom - 2 };
    }
    const bp = cfg.between ? bumps(t) : null;
    if (bp) {
      const g1 = grow(t, bp.a, bp.dip - 1), g2 = grow(t, bp.b, bp.dip - 1);
      return { cx: (g1[g1.length - 1] + 1 + g2[0]) / 2, bottom: bp.dip + 2, bw, side: 0, over: g1.concat(g2), lim: tm + 12 };
    }
    if (cfg.sideBehind) {                                          // 개구리 옆모습: 눈 뒤 뒤통수
      const i = t.indexOf(tm), g = grow(t, i, tm + 3), right = /e$/.test(dir);
      const cx = right ? g[0] - 2 : g[g.length - 1] + 2;
      return { cx, bottom: t[Math.max(0, Math.min(cell - 1, Math.round(cx)))] + 2, bw: Math.round(bw * 0.9), side: right ? -1 : 1, over: g, lim: tm + 12 };
    }
    const xs = []; t.forEach((v, i) => { if (v <= tm + 2) xs.push(i); });
    return { cx: (xs[0] + xs[xs.length - 1]) / 2, bottom: tm + 5, bw, side: 0, over: [], lim: 0 };
  }

  /* ---------- 아틀라스에 모자 씌우기 ---------- */
  const anchorCache = {};
  function anchors(key, d, img) {
    if (anchorCache[key]) return anchorCache[key];
    const c = mkCanvas(img.width, img.height), g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const a = g.getImageData(0, 0, c.width, c.height).data, cell = d.cell, cfg = CFG[key] || CFG.gizmo;
    const dirOf = {};
    for (const A of Object.values(d.anims)) for (const [dir, fr] of Object.entries(A.dirs)) fr.forEach(i => { dirOf[i] = dir; });
    const out = {};
    for (const i of Object.keys(dirOf)) {
      const x0 = (i % d.cols) * cell, y0 = Math.floor(i / d.cols) * cell;
      out[i] = anchor(profile(a, c.width, x0, y0, cell), cfg, dirOf[i], cell);
    }
    return (anchorCache[key] = out);
  }
  // base: 색칠까지 끝난 아틀라스(이미지나 캔버스). 모자를 그린 새 캔버스를 돌려준다
  function compose(key, d, img, base, hatKey) {
    const def = HATS[hatKey]; if (!def || !def.shape) return null;
    const an = anchors(key, d, img), cell = d.cell;
    const c = mkCanvas(base.width, base.height), g = c.getContext('2d');
    g.drawImage(base, 0, 0);
    const src = g.getImageData(0, 0, c.width, c.height), out = g.getImageData(0, 0, c.width, c.height);
    const W = c.width, sp = {};
    for (const [i, p] of Object.entries(an)) {
      if (!p) continue;
      const k = p.bw + '.' + p.side;
      const s = sp[k] || (sp[k] = sprite(def, p.bw, Math.round(p.bw * 0.55), Math.max(5, Math.round(p.bw * 0.36)), p.side));
      const x0 = (i % d.cols) * cell, y0 = Math.floor(i / d.cols) * cell;
      const hx = Math.round(p.cx - s.W / 2), hy = p.bottom - s.H;
      for (let y = 0; y < s.H; y++) for (let x = 0; x < s.W; x++) {
        const col = s.px[y * s.W + x], X = hx + x, Y = hy + y; if (!col || X < 0 || X >= cell || Y < 0 || Y >= cell) continue;
        const o = ((y0 + Y) * W + x0 + X) * 4; out.data[o] = col[0]; out.data[o + 1] = col[1]; out.data[o + 2] = col[2]; out.data[o + 3] = 255;
      }
      for (const x of p.over) for (let y = 0; y < p.lim; y++) {     // 눈·귀를 모자 위에 다시
        const o = ((y0 + y) * W + x0 + x) * 4;
        if (src.data[o + 3] > 40) for (let k = 0; k < 4; k++) out.data[o + k] = src.data[o + k];
      }
    }
    g.putImageData(out, 0, 0);
    return c;
  }
  // 꾸미기 창 카드용: 모자 그림만 크게 ('basic'은 빈 자리 표시)
  function icon(hatKey, k = 3) {
    const def = HATS[hatKey];
    if (!def || !def.shape) {                                       // 모자 없음: 점선 동그라미에 빗금
      const n = 24, c = mkCanvas(n * k, n * k), g = c.getContext('2d'); g.fillStyle = '#b8ad92';
      for (let a = 0; a < 40; a++) if (a % 3 !== 2) { const t = a / 40 * Math.PI * 2; g.fillRect(Math.round(12 + 9 * Math.cos(t)) * k, Math.round(12 + 9 * Math.sin(t)) * k, k, k); }
      for (let i = 6; i <= 18; i++) g.fillRect(i * k, (24 - i) * k, k, k);
      return c;
    }
    const s = sprite(def, 26, 14, 9), c = mkCanvas(s.W * k, s.H * k), g = c.getContext('2d');
    for (let y = 0; y < s.H; y++) for (let x = 0; x < s.W; x++) { const p = s.px[y * s.W + x]; if (p) { g.fillStyle = 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')'; g.fillRect(x * k, y * k, k, k); } }
    return c;
  }
  return { compose, sprite, icon, CFG };
})();

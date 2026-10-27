/* ============ 삼분의숲 — pixelart ============
   코드로 픽셀아트를 그리는 작은 엔진.
   - 색은 32bit 정수(ImageData와 같은 바이트 순서)로 다룬다.
   - blob(): 빛 방향을 반영해 입체로 칠하는 타원 (디더링으로 부드럽게)
   - selout(): 이웃 색을 어둡게 한 '선택적 외곽선' (캐릭터 스프라이트와 같은 느낌) */
'use strict';
const PIX = (() => {
  const LE = new Uint8Array(new Uint32Array([0x0a0b0c0d]).buffer)[0] === 0x0d;
  const pack = LE
    ? (r, g, b, a = 255) => (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0
    : (r, g, b, a = 255) => (((r & 255) << 24) | ((g & 255) << 16) | ((b & 255) << 8) | (a & 255)) >>> 0;
  const rgba = LE
    ? u => [u & 255, (u >>> 8) & 255, (u >>> 16) & 255, u >>> 24]
    : u => [u >>> 24, (u >>> 16) & 255, (u >>> 8) & 255, u & 255];
  const alphaOf = LE ? u => u >>> 24 : u => u & 255;
  const cache = {};
  function hex(s) {
    if (typeof s === 'number') return s;
    if (cache[s] !== undefined) return cache[s];
    let h = s.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const v = pack(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16),
      h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255);
    return (cache[s] = v);
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function mix(u1, u2, t) {
    const a = rgba(hex(u1)), b = rgba(hex(u2));
    return pack(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t);
  }
  // 어둡게 + 살짝 푸른/보랏빛으로 (픽셀아트식 hue shift)
  function darken(u, k = 0.55) {
    const c = rgba(hex(u));
    return pack(c[0] * k * 0.92, c[1] * k * 0.94, Math.min(255, c[2] * k * 1.05 + 10 * (1 - k)), c[3]);
  }
  function lighten(u, k = 0.3) {
    const c = rgba(hex(u));
    return pack(c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k * 0.85, c[3]);
  }
  function withAlpha(u, a) { const c = rgba(hex(u)); return pack(c[0], c[1], c[2], a); }
  function css(u) { const c = rgba(hex(u)); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (c[3] / 255).toFixed(3) + ')'; }
  const ramp = (...hs) => hs.map(hex);

  // 4x4 Bayer 행렬 (0~1)
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  // 결정적 해시 (스프라이트가 매번 같은 모양이 되도록)
  function hash(x, y, s = 0) {
    let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  // 빛: 왼쪽 위 앞쪽에서
  const L = (() => { const v = [-0.55, -0.72, 0.62]; const m = Math.hypot(...v); return v.map(x => x / m); })();

  class Pic {
    constructor(w, h) { this.w = w; this.h = h; this.px = new Uint32Array(w * h); }
    inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    get(x, y) { return this.inb(x, y) ? this.px[y * this.w + x] : 0; }
    a(x, y) { return alphaOf(this.get(x, y)); }
    set(x, y, c) { x |= 0; y |= 0; if (this.inb(x, y)) this.px[y * this.w + x] = hex(c); return this; }
    // 반투명 합성
    blend(x, y, c, t) {
      x |= 0; y |= 0; if (!this.inb(x, y)) return;
      const i = y * this.w + x, d = this.px[i];
      if (alphaOf(d) === 0) { this.px[i] = withAlpha(c, Math.round(alphaOf(hex(c)) * t)); return; }
      const m = mix(d, c, t); const dd = rgba(d); const mm = rgba(m);
      this.px[i] = pack(mm[0], mm[1], mm[2], dd[3]);
    }
    // 이미 칠해진 픽셀만 바꾸기
    paint(x, y, c) { if (this.a(x, y) > 0) this.set(x, y, c); }
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
    line(x0, y0, x1, y1, c) {
      x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.set(x0, y0, typeof c === 'function' ? c(x0, y0) : c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
      return this;
    }
    // 채운 타원. c는 색 또는 (nx,ny,x,y)=>색|null
    ellipse(cx, cy, rx, ry, c) {
      const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1), y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        const col = typeof c === 'function' ? c(nx, ny, x, y) : c;
        if (col != null) this.set(x, y, col);
      }
      return this;
    }
    circle(cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); }
    // 다각형 채우기 (짝홀 규칙)
    poly(pts, c) {
      let y0 = Infinity, y1 = -Infinity;
      for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2)
          for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++)
            this.set(x, y, typeof c === 'function' ? c(x, y) : c);
      }
      return this;
    }
    /* 입체 타원: ramp(어두운→밝은) 위에 빛 방향 셰이딩 + 디더링
       opt: {dither:0~1, bias, noise, noiseSeed, ao(아래쪽 그늘), flat(z 납작함)} */
    blob(cx, cy, rx, ry, rmp, opt = {}) {
      const n = rmp.length, dith = opt.dither ?? 0.6, bias = opt.bias ?? 0, nz0 = opt.noise ?? 0, seed = opt.noiseSeed ?? 1;
      const ao = opt.ao ?? 0.18, flat = opt.flat ?? 1;
      return this.ellipse(cx, cy, rx, ry, (nx, ny, x, y) => {
        const r2 = nx * nx + ny * ny, nz = Math.sqrt(Math.max(0, 1 - r2)) * flat;
        const m = Math.hypot(nx, ny, nz) || 1;
        let I = (nx * L[0] + ny * L[1] + nz * L[2]) / m;
        I = I * 0.5 + 0.5 + bias - Math.max(0, ny) * ao;
        if (nz0) I += (hash(x, y, seed) - 0.5) * nz0;
        const f = clamp(I, 0, 0.999) * (n - 1);
        const b = Math.floor(f), fr = f - b;
        const th = 0.5 + (bayer(x, y) - 0.5) * dith;
        return rmp[clamp(b + (fr > th ? 1 : 0), 0, n - 1)];
      });
    }
    // 바깥쪽 외곽선 (단색)
    outline(c, diag = false) {
      const w = this.w, h = this.h, src = this.px.slice(), C = hex(c);
      const A = (x, y) => (x >= 0 && y >= 0 && x < w && y < h) ? alphaOf(src[y * w + x]) > 0 : false;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (A(x, y)) continue;
        if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1) ||
          (diag && (A(x - 1, y - 1) || A(x + 1, y - 1) || A(x - 1, y + 1) || A(x + 1, y + 1)))) this.px[y * w + x] = C;
      }
      return this;
    }
    // 선택적 외곽선: 바깥 픽셀을 '안쪽 이웃 색의 어두운 버전'으로. 아래쪽은 더 어둡게.
    selout(k = 0.42, kBottom = 0.3) {
      const w = this.w, h = this.h, src = this.px.slice();
      const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h) ? src[y * w + x] : 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (alphaOf(at(x, y)) > 0) continue;
        let c = 0, kk = k;
        if (alphaOf(at(x, y - 1)) > 0) { c = at(x, y - 1); kk = kBottom; }
        else if (alphaOf(at(x - 1, y)) > 0) c = at(x - 1, y);
        else if (alphaOf(at(x + 1, y)) > 0) c = at(x + 1, y);
        else if (alphaOf(at(x, y + 1)) > 0) c = at(x, y + 1);
        if (c) this.px[y * w + x] = darken(withAlpha(c, 255), kk);
      }
      return this;
    }
    // 안쪽 테두리 하이라이트/그늘 (opaque 영역의 가장자리 픽셀)
    innerEdge(fn) {
      const w = this.w, h = this.h, src = this.px.slice();
      const A = (x, y) => (x >= 0 && y >= 0 && x < w && y < h) ? alphaOf(src[y * w + x]) > 0 : false;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!A(x, y)) continue;
        const up = !A(x, y - 1), dn = !A(x, y + 1), lf = !A(x - 1, y), rt = !A(x + 1, y);
        if (up || dn || lf || rt) { const c = fn(src[y * w + x], { up, dn, lf, rt }, x, y); if (c != null) this.px[y * w + x] = hex(c); }
      }
      return this;
    }
    // 다른 Pic 찍기
    stamp(o, dx, dy, opt = {}) {
      for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
        const c = o.px[y * o.w + (opt.flip ? o.w - 1 - x : x)];
        if (alphaOf(c) > 0) this.set(dx + x, dy + y, c);
      }
      return this;
    }
    // 모든 불투명 픽셀 색 변환
    map(fn) {
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x, c = this.px[i];
        if (alphaOf(c) > 0) { const r = fn(c, x, y); if (r != null) this.px[i] = hex(r); }
      }
      return this;
    }
    clone() { const p = new Pic(this.w, this.h); p.px.set(this.px); return p; }
    // 외곽선만 남긴 실루엣 (선택 강조용)
    silhouetteOutline(c) {
      const p = new Pic(this.w + 2, this.h + 2);
      p.stamp(this, 1, 1);
      const src = p.px.slice(), w = p.w, h = p.h, C = hex(c);
      const A = (x, y) => (x >= 0 && y >= 0 && x < w && y < h) ? alphaOf(src[y * w + x]) > 0 : false;
      p.px.fill(0);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (A(x, y)) continue;
        if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) p.px[y * w + x] = C;
      }
      return p;
    }
    canvas() {
      const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
      const g = c.getContext('2d');
      const id = g.createImageData(this.w, this.h);
      new Uint32Array(id.data.buffer).set(this.px);
      g.putImageData(id, 0, 0);
      return c;
    }
  }
  const pic = (w, h, fn) => { const p = new Pic(w, h); if (fn) fn(p); return p; };
  return { Pic, pic, hex, pack, rgba, alphaOf, mix, darken, lighten, withAlpha, css, ramp, bayer, hash, clamp, L };
})();

/* ---------- 노이즈 (지형 텍스처용) ---------- */
const NOISE = (() => {
  const H = PIX.hash;
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = H(xi, yi, s), b = H(xi + 1, yi, s), c = H(xi, yi + 1, s), d = H(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s, oct = 3) {
    let sum = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { sum += vnoise(x * f, y * f, s + i * 17) * amp; n += amp; amp *= 0.5; f *= 2; }
    return sum / n;
  }
  return { vnoise, fbm, hash: H };
})();

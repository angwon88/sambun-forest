/* ============ 삼분의숲 — fx ============
   파티클·떠오르는 글자·바닥 자국 같은 '보이기만 하는' 효과.
   게임 규칙에 영향을 주지 않도록 별도 난수(vr)를 쓴다. */
'use strict';
const vr = (() => { let s = (Date.now() ^ 0x9e3779b9) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; })();
const vrange = (a, b) => a + vr() * (b - a);

const FX = {
  decals: [],    // 바닥 자국 (벼락 그을음 등)
  pops: [],      // 사라지는 자원 잔상
  rings: [],     // 물결·충격파 링
  reset() { this.decals.length = 0; this.pops.length = 0; this.rings.length = 0; },
};

/* ---------- 파티클 ---------- */
// kind: sq(색 사각형) leaf leafG chip petal heart sparkle drop dust ember
function addParticle(o) {
  if (!S) return;
  S.particles.push(Object.assign({ t: 0, life: 0.6, vx: 0, vy: 0, g: 420, drag: 0, size: 3, rot: 0, kind: 'sq', col: '#fff' }, o));
  if (S.particles.length > 420) S.particles.splice(0, S.particles.length - 420);
}
// 기존 호출부 호환: burst(x,y,색|색배열,n)
function burst(x, y, col, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = vr() * Math.PI * 2, sp = vrange(40, 150);
    addParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - vrange(60, 140), col: Array.isArray(col) ? col[i % col.length] : col,
      life: vrange(0.45, 0.8), size: vr() < 0.3 ? 4 : 3, g: 480 });
  }
}
FX.leaves = (x, y, n = 6, gold = false) => { for (let i = 0; i < n; i++) addParticle({ kind: gold ? 'leafG' : 'leaf', v: i % 2, x: x + vrange(-12, 12), y: y + vrange(-18, 4), vx: vrange(-50, 50), vy: vrange(-120, -30), g: 160, drag: 1.6, life: vrange(0.8, 1.3), rot: vr() * 6 }); };
FX.chips = (x, y, n = 7) => { for (let i = 0; i < n; i++) addParticle({ kind: 'chip', v: i % 2, x: x + vrange(-6, 6), y: y + vrange(-8, 2), vx: vrange(-110, 110), vy: vrange(-200, -80), g: 620, life: vrange(0.4, 0.7) }); };
FX.sparkle = (x, y, n = 6, gold = true, spread = 16) => { for (let i = 0; i < n; i++) addParticle({ kind: 'sparkle', v: gold ? 1 : 0, x: x + vrange(-spread, spread), y: y + vrange(-spread, spread * 0.6), vx: vrange(-20, 20), vy: vrange(-60, -20), g: 0, drag: 1, life: vrange(0.4, 0.8) }); };
FX.hearts = (x, y, n = 4) => { for (let i = 0; i < n; i++) addParticle({ kind: 'heart', x: x + vrange(-10, 10), y: y + vrange(-6, 2), vx: vrange(-25, 25), vy: vrange(-80, -45), g: -10, drag: 0.8, life: vrange(0.8, 1.2) }); };
FX.dust = (x, y, n = 2, col = 'rgba(240,226,190,') => { for (let i = 0; i < n; i++) addParticle({ kind: 'dust', col, x: x + vrange(-5, 5), y: y + vrange(-2, 2), vx: vrange(-25, 25), vy: vrange(-22, -6), g: 0, drag: 2.2, life: vrange(0.35, 0.55), size: vrange(2.5, 4.5) }); };
FX.splash = (x, y, n = 8) => { for (let i = 0; i < n; i++) addParticle({ kind: 'drop', x: x + vrange(-6, 6), y, vx: vrange(-70, 70), vy: vrange(-190, -90), g: 650, life: vrange(0.35, 0.6) }); FX.ring(x, y + 2, '#dff6ff', 16); };
FX.embers = (x, y, n = 1, cols) => { for (let i = 0; i < n; i++) addParticle({ kind: 'ember', x: x + vrange(-5, 5), y, vx: vrange(-12, 12), vy: vrange(-55, -30), g: -8, drag: 0.4, life: vrange(0.7, 1.3), col: vr() < 0.5 ? (cols ? cols[0] : '#ffd75a') : (cols ? cols[1] : '#ff8a2a') }); };
FX.petals = (x, y, n = 6) => { for (let i = 0; i < n; i++) addParticle({ kind: 'petal', v: Math.floor(vr() * 6), x: x + vrange(-10, 10), y: y + vrange(-10, 0), vx: vrange(-40, 40), vy: vrange(-110, -50), g: 140, drag: 1.4, life: vrange(0.8, 1.2) }); };
FX.ring = (x, y, col = '#ffffff', r = 18, life = 0.45, flat = 0.45) => FX.rings.push({ x, y, col, r, life, t: 0, flat });
FX.decal = (x, y, kind = 'scorch', life = 4) => FX.decals.push({ x, y, kind, life, t: 0 });
FX.pop = (spr, x, y) => FX.pops.push({ spr, x, y, t: 0 });

function updateParticles(dt) {
  for (const p of S.particles) {
    p.t += dt;
    if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 6;
  }
  S.particles = S.particles.filter(p => p.t < p.life);
  for (const f of S.floats) f.t += dt;
  S.floats = S.floats.filter(f => f.t < 1.25);
  for (const a of [FX.decals, FX.pops, FX.rings]) { for (const d of a) d.t += dt; }
  FX.decals = FX.decals.filter(d => d.t < d.life);
  FX.pops = FX.pops.filter(d => d.t < 0.32);
  FX.rings = FX.rings.filter(d => d.t < d.life);
}

function drawParticles(ctx) {
  for (const p of S.particles) {
    const k = p.t / p.life, a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    const x = Math.round(p.x), y = Math.round(p.y);
    ctx.globalAlpha = Math.max(0, a);
    switch (p.kind) {
      case 'sq': ctx.fillStyle = p.col; ctx.fillRect(x - 1, y - 1, p.size, p.size); break;
      case 'leaf': case 'leafG': case 'chip': case 'petal': {
        const arr = ART.part[p.kind], img = arr[(p.v || 0) % arr.length];
        if (Math.sin(p.rot) > 0) ctx.drawImage(img, x - (img.width >> 1), y - (img.height >> 1));
        else { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(img, -(img.width >> 1), -(img.height >> 1)); ctx.restore(); }
        break;
      }
      case 'heart': ctx.drawImage(ART.part.heart[0], x - 3, y - 3); break;
      case 'sparkle': { const img = ART.part.sparkle[p.v || 0]; const s = k < 0.5 ? 1 : 0.6; ctx.drawImage(img, x - 3 * s, y - 3 * s, 7 * s, 7 * s); break; }
      case 'drop': ctx.drawImage(ART.part.drop[0], x, y); break;
      case 'dust': ctx.fillStyle = p.col + (0.55 * a).toFixed(3) + ')'; ctx.globalAlpha = 1;
        { const r = p.size * (0.7 + k * 0.8); ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); } break;
      case 'ember': ctx.fillStyle = p.col; ctx.fillRect(x, y, 1, 1); if (k < 0.5) { ctx.globalAlpha = 0.4 * a; ctx.fillRect(x - 1, y, 3, 1); } break;
    }
  }
  ctx.globalAlpha = 1;
}
function drawRings(ctx) {
  for (const r of FX.rings) {
    const k = r.t / r.life, rad = 3 + r.r * Math.sqrt(k);
    ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = r.col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * r.flat, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawDecals(ctx) {
  for (const d of FX.decals) {
    const a = Math.min(1, (d.life - d.t) / 1.2);
    if (d.kind === 'scorch') {
      ctx.globalAlpha = 0.45 * a; ctx.fillStyle = '#1d140f';
      ctx.beginPath(); ctx.ellipse(d.x, d.y + 4, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.35 * a; ctx.beginPath(); ctx.ellipse(d.x, d.y + 4, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      if (d.t < 1.4) { ctx.globalAlpha = (1 - d.t / 1.4) * 0.9; ctx.fillStyle = '#ffb347'; ctx.fillRect(d.x - 4, d.y + 3, 2, 1); ctx.fillRect(d.x + 3, d.y + 5, 2, 1); ctx.fillRect(d.x, d.y + 2, 1, 1); }
    }
  }
  ctx.globalAlpha = 1;
}
function drawPops(ctx) {
  for (const p of FX.pops) {
    const k = p.t / 0.32, s = 1 + k * 0.35, a = 1 - k;
    ctx.globalAlpha = a; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, 1 - k * 0.5);
    ctx.drawImage(p.spr.c, -p.spr.ax, -p.spr.ay); ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/* ---------- 떠오르는 글자 (픽셀 폰트 + 아이콘) ---------- */
const FLOAT_ICON = { '🪵': 'wood', '🪨': 'stone', '🍎': 'fruit', '🐚': 'shell', '❤️': 'heart', '⭐': 'star', '🛡️': 'shield', '⏱️': 'clock', '💨': 'dash', '🎲': 'dice', '☔': 'rain' };
const FLOAT_RE = new RegExp('(' + Object.keys(FLOAT_ICON).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')');
const PIXFONT = "'Galmuri11', 'NeoDunggeunmo', ui-monospace, monospace";
function drawRichText(ctx, txt, x, y, col, size = 11, outline = '#1a1420') {
  ctx.font = 'bold ' + size + 'px ' + PIXFONT;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const parts = String(txt).split(FLOAT_RE).filter(s => s !== '');
  const isz = Math.round(size * 1.15);
  let w = 0; const ws = parts.map(p => FLOAT_ICON[p] ? isz + 1 : ctx.measureText(p).width); ws.forEach(v => w += v);
  let cx = x - w / 2;
  parts.forEach((p, i) => {
    if (FLOAT_ICON[p]) {
      const ic = ART.icon[FLOAT_ICON[p]];
      ctx.drawImage(ic.c, Math.round(cx), Math.round(y - isz / 2), isz, isz);
    } else {
      ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = outline; ctx.strokeText(p, cx, y);
      ctx.fillStyle = col; ctx.fillText(p, cx, y);
    }
    cx += ws[i];
  });
  return w;
}
function drawFloats(ctx) {
  // 같은 자리에 거의 동시에 뜬 글자는 위로 한 줄씩 쌓는다
  for (let i = 0; i < S.floats.length; i++) {
    const f = S.floats[i];
    if (f.oy !== undefined) continue;
    let n = 0;
    for (let j = 0; j < i; j++) { const g = S.floats[j]; if (g.t - f.t < 0.5 && Math.abs(g.x - f.x) < 90 && Math.abs((g.y + (g.oy || 0)) - f.y) < 16) n++; }
    f.oy = -n * 15;
  }
  for (const f of S.floats) {
    const k = f.t / 1.25, rise = (1 - Math.pow(1 - Math.min(1, f.t / 0.9), 3)) * 26 - (f.oy || 0);
    const s = f.t < 0.12 ? 1.35 - f.t / 0.12 * 0.35 : 1;
    ctx.globalAlpha = k < 0.72 ? 1 : 1 - (k - 0.72) / 0.28;
    ctx.save(); ctx.translate(f.x, f.y - rise); ctx.scale(s, s);
    drawRichText(ctx, f.txt, 0, 0, f.col, 11);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

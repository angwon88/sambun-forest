/* ============ 삼분의숲 — render ============
   한 프레임 그리기 순서
   지형/바다 → 바닥 자국·침수 예고 → 그림자 → (y정렬) 자원·건물·NPC·캐릭터 → 유령·파티클
   → 구름 그림자 → 조명 → 비·햇살·반딧불 → 표시물(벼락 조준·유령 경로·선택 강조·말풍선·글자)
   논리 좌표는 720x540 그대로, 실제 캔버스는 RS배(2~3배) 해상도로 그려 글자와 캐릭터가 선명하다. */
'use strict';
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const VW = 720, VH = 540;
let RS = 2, RT = 0;            // RS: 해상도 배율, RT: 화면용 시계(게임이 멈춰도 흐름)
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/* ---------- 해상도 ---------- */
const CHAR_CV = {};
function prepCharCanvases() {
  for (const k of Object.keys(CHAR_IMGS)) {
    const img = CHAR_IMGS[k];
    if (!img || !img.complete || !img.naturalWidth) continue;
    const s = Math.round(48 * RS);
    const n = mkCanvas(s, s), g = n.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (s < 128) { const m = mkCanvas(s * 2 > 128 ? 128 : s * 2, s * 2 > 128 ? 128 : s * 2); const gm = m.getContext('2d'); gm.imageSmoothingQuality = 'high'; gm.drawImage(img, 0, 0, m.width, m.height); g.drawImage(m, 0, 0, s, s); }
    else g.drawImage(img, 0, 0, s, s);
    const flip = (src) => { const c = mkCanvas(s, s), q = c.getContext('2d'); q.translate(s, 0); q.scale(-1, 1); q.drawImage(src, 0, 0); return c; };
    const white = mkCanvas(s, s), gw = white.getContext('2d'); gw.drawImage(n, 0, 0); gw.globalCompositeOperation = 'source-in'; gw.fillStyle = '#fff'; gw.fillRect(0, 0, s, s);
    CHAR_CV[k] = { n, f: flip(n), w: white, wf: flip(white) };
  }
}
function resizeCanvas() {
  const cw = cv.getBoundingClientRect().width || VW, dpr = window.devicePixelRatio || 1;
  let rs = Math.ceil(cw * dpr / VW - 0.08);
  rs = Math.max(2, Math.min(isTouch ? 2 : 3, rs));
  if (rs !== RS || cv.width !== VW * rs) { RS = rs; cv.width = VW * RS; cv.height = VH * RS; prepCharCanvases(); }
}
addEventListener('resize', resizeCanvas);

/* ---------- 새 판 / 데모 ---------- */
let skipVisualReset = false;
function onNewGameVisuals() {
  if (skipVisualReset) return;
  Ground.reset((tx, ty) => S.floodTime[tx + ',' + ty]);
  FX.reset(); Weather.reset(); Light.reset();
}
function setupDemo() {
  skipVisualReset = true; newGame(); skipVisualReset = false;
  S.demo = true; S.t = 0;
  Ground.reset((tx, ty) => ringOf(tx, ty) <= 0 ? 0 : 1e9);
  FX.reset(); Weather.reset(); Light.reset();
  S.px = MW * TS / 2; S.py = MH * TS / 2 + 30; S.dir = 2;
  const spots = [['tent', 7, 5], ['fire', 9, 6], ['flag', 12, 5], ['palm', 14, 7], ['flower', 6, 9], ['shellart', 13, 9]];
  for (const [type, x, y] of spots) { S.buildings.push({ type, x, y, anim: 1 }); S.resources = S.resources.filter(r => !(r.x === x && r.y === y)); }
  S.otter.req = { type: 'shell', n: 3 };
}

/* ---------- 도우미 ---------- */
const easeOutBack = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const easeOutBounce = k => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375; return n * (k -= 2.625 / d) * k + 0.984375; };
const snapPx = v => Math.round(v * RS) / RS;
function resFoot(r) { return { x: r.x * TS + 18, y: r.y * TS + (r.type === 'shell' ? 25 : 29) }; }
function resSprite(r) {
  const set = ART.res[r.type];
  if (r.v === undefined) r.v = r.type === 'shell' ? (vr() < 0.7 ? 0 : 1) : Math.floor(vr() * set.length);
  return set[r.v][r.golden ? 'g' : 'n'];
}
function buildFrame(b, rt) {
  const fr = ART.build[b.type]; if (fr.length === 1) return fr[0];
  const fps = b.type === 'fire' ? 9 : b.type === 'flag' ? 7 : b.type === 'palm' ? 2.2 : 1.6;
  return fr[Math.floor(rt * fps + b.x * 3 + b.y) % fr.length];
}
function shadow(c, x, y, rx, ry, a = 0.26) {
  c.fillStyle = 'rgba(20,30,25,' + a + ')';
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}
function drawSpr(c, spr, x, y, sx = 1, sy = 1) {
  if (sx === 1 && sy === 1) { c.drawImage(spr.c, Math.round(x - spr.ax), Math.round(y - spr.ay)); return; }
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(sx, sy); c.drawImage(spr.c, -spr.ax, -spr.ay); c.restore();
}
// 지금 스페이스를 누르면 무엇과 상호작용하는지 (doAction과 같은 규칙, 읽기 전용)
function currentTarget() {
  if (S.cmd) return { res: S.cmd.res, active: true };
  let best = null, bd = 40;
  for (const r of S.resources) { if (r.cool > 0) continue; const d = Math.hypot(r.x * TS + 18 - S.px, r.y * TS + 18 - S.py); if (d < bd) { bd = d; best = r; } }
  if (best) return { res: best };
  const o = S.otter;
  if (!o.gone && !o.leaving && o.req && Math.hypot(o.tx * TS + 18 - S.px, o.ty * TS + 18 - S.py) < 54) return { otter: true, ok: S.inv[o.req.type] >= o.req.n };
  return null;
}

/* ---------- 메인 ---------- */
let snapMode = false;            // 결과 화면 '기념사진'을 찍는 중이면 UI 표시를 빼고 노을빛으로
function render(dt = 0.016) {
  const t = S.t, tod = S.demo ? 104 : (snapMode ? Math.min(t, 151) : t), clock = S.demo ? 0 : (S.tideClock || S.t);
  Ground.update(clock);
  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
  if (shakeT > 0) { const m = Math.min(1, shakeT / 0.3) * 3.5; ctx.translate(Math.round((vr() - 0.5) * 2 * m), Math.round((vr() - 0.5) * 2 * m)); }

  Ground.draw(ctx, RT, dt);
  drawDecals(ctx);
  drawFloodWarn(ctx);
  drawRings(ctx);
  drawLightningShadows(ctx);
  drawShadows(ctx);
  drawEntities(ctx, dt);
  drawPops(ctx);
  drawGhosts(ctx);
  drawParticles(ctx);
  Weather.drawLife(ctx, tod);
  Weather.drawShadows(ctx);
  const dark = Light.apply(ctx, tod, S.weather, collectLights(), dt);
  Weather.drawOver(ctx, RT, dark);
  drawBolts(ctx);
  if (snapMode) { ctx.setTransform(1, 0, 0, 1, 0, 0); return; }
  drawBuildPreview(ctx);
  drawTelegraphs(ctx);
  drawTargetHint(ctx);
  drawNpcBubble(ctx);
  drawFloats(ctx);
  if (S.hitFlash > 0) {
    const a = S.hitFlash / 0.4;
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.25, VW / 2, VH / 2, VW * 0.65);
    g.addColorStop(0, 'rgba(255,40,30,' + (a * 0.12).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,30,20,' + (a * 0.55).toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fillRect(-10, -10, VW + 20, VH + 20);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
// 결과 카드용 한 장: 흔들림·붉은 번쩍임·UI 없이 그려서 복사
function drawSnapshot(snap) {
  const keepShake = shakeT, keepFlash = S.hitFlash;
  shakeT = 0; S.hitFlash = 0; snapMode = true;
  try { render(0); } finally { snapMode = false; shakeT = keepShake; S.hitFlash = keepFlash; }
  snap.width = cv.width; snap.height = cv.height;
  snap.getContext('2d').drawImage(cv, 0, 0);
}
// 매 프레임 (게임이 멈춰 있어도) 흐르는 화면 효과
function tickVisuals(dt) {
  RT += dt;
  if (!S) return;
  updateParticles(dt);
  Weather.update(dt, RT, S.weather);
  if (!running) {   // 결과·타이틀 화면에서 흔들림/붉은 번쩍임이 남지 않도록
    if (shakeT > 0) shakeT -= dt;
    if (S.hitFlash > 0) S.hitFlash -= dt;
    if (S.invuln > 0) S.invuln -= dt;
    for (const L of S.lightnings) if (L.struck > 0) L.struck -= dt;
  }
}

/* ---------- 게임 로직에서 부르는 연출 훅 (점수·판정에는 영향 없음) ---------- */
function fxCmdHit(r) {
  r.hitAt = RT; r.hitDur = 0.15;
  const f = resFoot(r);
  if (r.type === 'tree') FX.leaves(f.x, f.y - 24, 2, r.golden);
  else if (r.type === 'rock') FX.chips(f.x, f.y - 8, 3);
  else if (r.type === 'fruit') FX.leaves(f.x, f.y - 12, 1, r.golden);
  else FX.sparkle(f.x, f.y - 6, 1, r.golden, 6);
}
function fxHarvest(r) {
  const f = resFoot(r), spr = resSprite(r);
  FX.pop(spr, f.x, f.y);
  if (r.type === 'tree') FX.leaves(f.x, f.y - 22, 9, r.golden);
  else if (r.type === 'rock') { FX.chips(f.x, f.y - 8, 9); FX.dust(f.x, f.y - 2, 3, 'rgba(200,200,210,'); }
  else if (r.type === 'fruit') { FX.leaves(f.x, f.y - 12, 5, r.golden); burst(f.x, f.y - 12, r.golden ? ['#ffe683', '#f5c63c'] : ['#e0423a', '#ff7556'], 6); }
  else { FX.sparkle(f.x, f.y - 6, 4, r.golden, 10); if (Ground.isWaterPx(f.x, f.y - 2)) FX.splash(f.x, f.y - 3, 6); }
  if (r.golden) FX.sparkle(f.x, f.y - spr.ay * 0.5, 10, true, 18);
  FX.ring(f.x, f.y - 2, r.golden ? '#ffe683' : '#ffffff', 20, 0.35);
}
function fxCmdFail(r) {
  r.hitAt = RT; r.hitDur = 0.3;
  const f = resFoot(r);
  FX.dust(f.x, f.y - 4, 3, 'rgba(255,140,120,');
}
function fxDeliver(o) {
  CharAnim.playOnce('happy');
  FX.hearts(o.tx * TS + 18, o.ty * TS + 4, 6);
  FX.sparkle(o.tx * TS + 18, o.ty * TS + 6, 5, true, 14);
}

/* ---------- 바닥 표시 ---------- */
function drawFloodWarn(c) {
  if (S.demo) return;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (tileType(x, y) === 0 || !willFloodSoon(x, y)) continue;
    const ph = (RT * 0.9 + (x * 0.37 + y * 0.53)) % 1, cx = x * TS + 18, cy = y * TS + 18;
    c.strokeStyle = 'rgba(160,225,255,' + (0.55 * (1 - ph)).toFixed(3) + ')'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(cx, cy, 3 + ph * 13, 1.5 + ph * 6, 0, 0, Math.PI * 2); c.stroke();
  }
}
function drawLightningShadows(c) {
  for (const L of S.lightnings) if (L.warn > 0) {
    const p = 1 - L.warn / 1.3, cx = L.x * TS + 18, cy = L.y * TS + 22;
    c.fillStyle = 'rgba(15,15,35,' + (0.12 + 0.3 * p).toFixed(3) + ')';
    c.beginPath(); c.ellipse(cx, cy, 6 + 12 * p, 3 + 5 * p, 0, 0, Math.PI * 2); c.fill();
  }
}
function drawShadows(c) {
  for (const r of S.resources) {
    const f = resFoot(r);
    if (r.type === 'shell') { if (!Ground.isWaterPx(f.x, f.y - 2)) shadow(c, f.x, f.y, 7, 2.5, 0.2); }
    else shadow(c, f.x, f.y - 1, r.type === 'tree' ? 12 : 13, r.type === 'tree' ? 4 : 4.5);
  }
  for (const b of S.buildings) shadow(c, b.x * TS + 18, b.y * TS + 29, b.type === 'flag' ? 9 : 15, 4.5, 0.24);
  if (!S.otter.gone && !S.otter.leaving) shadow(c, S.otter.tx * TS + 18, S.otter.ty * TS + 28, 11, 3.5, 0.22);
}

/* ---------- 엔티티 ---------- */
function drawEntities(c, dt) {
  const ents = [];
  for (const r of S.resources) ents.push({ y: resFoot(r).y, r });
  for (const b of S.buildings) ents.push({ y: b.y * TS + 30, b });
  if (!S.otter.gone) ents.push({ y: S.otter.ty * TS + 29, o: 1 });
  ents.push({ y: S.py + 13.5, p: 1 });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (e.r) drawResource(c, e.r); else if (e.b) drawBuilding(c, e.b); else if (e.o) drawNpc(c); else drawPlayer(c, dt);
  }
}
function drawResource(c, r) {
  const spr = resSprite(r), f = resFoot(r);
  if (r.born === undefined) r.born = RT;
  const age = RT - r.born;
  let sx = 1, sy = 1, ox = 0, oy = 0;
  if (age < 0.45) { const k = easeOutBack(Math.min(1, age / 0.45)); sx = Math.max(0.05, k); sy = Math.max(0.05, k); }
  if (r.hitAt !== undefined && RT - r.hitAt < r.hitDur) { const k = 1 - (RT - r.hitAt) / r.hitDur; ox = Math.round(Math.sin(RT * 70) * 1.8 * k); }
  const water = r.type === 'shell' && Ground.isWaterPx(f.x, f.y - 2);
  if (water) oy = Math.round(Math.sin(RT * 2.4 + r.x) * 1);
  if (r.cool > 0) c.globalAlpha = 0.45;
  if (r.golden) {
    const pulse = 0.35 + 0.2 * Math.sin(RT * 5 + r.x);
    c.fillStyle = 'rgba(255,220,90,' + (pulse * 0.45).toFixed(3) + ')';
    c.beginPath(); c.ellipse(f.x, f.y - spr.h * 0.35, spr.w * 0.62, spr.h * 0.5, 0, 0, Math.PI * 2); c.fill();
    if (vr() < 0.04) FX.sparkle(f.x, f.y - spr.h * 0.5, 1, true, spr.w * 0.4);
  }
  if (water) {
    c.save(); c.beginPath(); c.rect(f.x - 20, f.y - 30, 40, 26 + oy); c.clip();
    drawSpr(c, spr, f.x + ox, f.y + oy, sx, sy); c.restore();
    c.strokeStyle = 'rgba(220,245,255,0.7)'; c.lineWidth = 1;
    const ph = (RT * 0.8 + r.x * 0.3) % 1;
    c.beginPath(); c.ellipse(f.x, f.y - 4, 8 + ph * 6, 2.5 + ph * 2, 0, 0, Math.PI * 2); c.globalAlpha = (r.cool > 0 ? 0.45 : 1) * (1 - ph); c.stroke();
  } else drawSpr(c, spr, f.x + ox, f.y + oy, sx, sy);
  c.globalAlpha = 1;
}
function drawBuilding(c, b) {
  const spr = buildFrame(b, RT), fx = b.x * TS + 18, fy = b.y * TS + 30;
  if (b.born === undefined) b.born = S.demo ? RT - 9 : RT;
  const age = RT - b.born;
  let dy = 0, sx = 1, sy = 1;
  if (age < 0.5) { const k = age / 0.5; dy = -(1 - easeOutBounce(k)) * 26; }
  else if (age < 0.7) { const k = (age - 0.5) / 0.2; sy = 1 - Math.sin(k * Math.PI) * 0.12; sx = 1 + Math.sin(k * Math.PI) * 0.08; }
  if (!b.landed && age >= 0.36) { b.landed = true; if (!S.demo) { FX.dust(fx - 10, fy, 3); FX.dust(fx + 10, fy, 3); FX.ring(fx, fy, '#fff6d8', 22, 0.4); } }
  const flooded = !S.demo && isFlooded(b.x, b.y);
  if (flooded) { c.save(); c.beginPath(); c.rect(fx - 30, fy - 70, 60, 63 + Math.sin(RT * 2 + b.x)); c.clip(); }
  drawSpr(c, spr, fx, fy + dy, sx, sy);
  if (flooded) {
    c.restore();
    c.strokeStyle = 'rgba(220,245,255,0.75)'; c.lineWidth = 1;
    const ph = (RT * 0.7 + b.x * 0.2) % 1;
    c.beginPath(); c.ellipse(fx, fy - 6, 14 + ph * 6, 3 + ph * 2, 0, 0, Math.PI * 2); c.globalAlpha = 1 - ph; c.stroke(); c.globalAlpha = 1;
  }
  if (b.type === 'fire' && !flooded && vr() < 0.18) FX.embers(fx, fy - 16, 1);
}
function drawNpc(c) {
  const o = S.otter, crow = curChar().key === 'dark', frames = crow ? ART.crow : ART.otter;
  let f = 0;
  if (o.moodT > 0 && o.mood === '❤️') f = crow ? (Math.sin(RT * 14) > 0 ? 1 : 0) : 2;
  else if (crow) f = Math.sin(RT * 3.3) > 0.85 ? 1 : 0;
  else f = (RT % 3.4) < 0.14 ? 1 : 0;
  const spr = frames[f];
  const fx = o.tx * TS + 18, fy = o.ty * TS + 29;
  let bob = Math.round(Math.sin(RT * 3) * 0.8);
  if (o.moodT > 0 && o.mood === '❤️') bob = -Math.round(Math.abs(Math.sin(RT * 10)) * 3);
  const flip = crow && S.px > fx;
  if (o.leaving) {
    const k = Math.min(1, o.leaving / 2.2);
    if (!o.splashed) { o.splashed = true; FX.splash(fx, fy - 4, 10); }
    c.save(); c.globalAlpha = 1 - k; c.beginPath(); c.rect(fx - 20, fy - 40, 40, 36 - k * 30); c.clip();
    c.translate(Math.round(fx), Math.round(fy + k * 22)); if (flip) c.scale(-1, 1); c.drawImage(spr.c, -spr.ax, -spr.ay); c.restore();
    c.strokeStyle = 'rgba(220,245,255,' + (0.8 * (1 - k)).toFixed(3) + ')'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(fx, fy - 4, 10 + k * 14, 3 + k * 4, 0, 0, Math.PI * 2); c.stroke();
    return;
  }
  c.save(); c.translate(Math.round(fx), Math.round(fy + bob)); if (flip) c.scale(-1, 1); c.drawImage(spr.c, -spr.ax, -spr.ay); c.restore();
}
function drawPlayer(c, dt) {
  const ch = curChar(), cc = CHAR_CV[ch.key];
  const footX = S.px, footY = S.py + 13.5;
  const inWater = !walkable(S.px, S.py), swim = inWater && ch.waterFree;
  const moving = S.moving && running && !S.cmd;
  const anim = CharAnim.has(ch.key);           // PixelLab 8방향 애니메이션이 있으면 그것으로
  if (anim) CharAnim.update(dt);
  let hop = 0, sx = 1, sy = 1, rot = 0;
  if (moving) {
    if (!anim) {
      const ph = S.walk * 0.85;
      hop = Math.abs(Math.sin(ph)) * 3.2; const q = Math.cos(ph * 2);
      sy = 1 + 0.045 * q; sx = 1 - 0.03 * q; rot = Math.sin(ph) * 0.05;
    }
    S._dust = (S._dust || 0) - dt;
    if (S._dust <= 0) { S._dust = 0.15; if (inWater) FX.ring(footX, footY - 2, '#e8f8ff', 12, 0.5); else FX.dust(footX, footY - 1, 1); }
  } else if (S.cmd && !anim) {
    const r = S.cmd.res, dir = Math.sign(r.x * TS + 18 - S.px) || 1, w = Math.abs(Math.sin(RT * 16));
    rot = dir * 0.07 * w; hop = w * 1.4; sy = 1 - 0.03 * w;
  } else if (!anim) {
    const b = Math.sin(RT * 2.6); sy = 1 + 0.018 * b; sx = 1 - 0.012 * b;
    if (ch.key === 'monkey') rot = Math.sin(RT * 3.2) * 0.045;        // 원숭이: 살랑살랑
  }
  // 그림자 · 콤보 오라 (발밑)
  if (!swim) shadow(c, footX, footY, 12 - hop * 0.6, 4, 0.28);
  if (S.combo >= 5) drawComboAura(c, footX, footY, false);
  // 개구리: 몸빛
  if (ch.key === 'frog') {
    const g = c.createRadialGradient(footX, footY - 18, 2, footX, footY - 18, swim ? 32 : 26);
    g.addColorStop(0, swim ? 'rgba(143,216,255,0.35)' : 'rgba(110,224,76,0.28)'); g.addColorStop(1, 'rgba(110,224,76,0)');
    c.fillStyle = g; c.fillRect(footX - 34, footY - 52, 68, 68);
  }
  const blink = S.invuln > 0 && Math.floor(RT * 12) % 2 === 0;
  const flash = S.hitFlash > 0 ? Math.min(1, S.hitFlash / 0.4) * 0.85 : 0;
  if (anim) {
    CharAnim.draw(c, footX, footY + (swim ? 7 : 0), { alpha: blink ? 0.45 : 1, flash, clipBelow: swim ? 8 : undefined });
  } else if (!cc) { c.fillStyle = ch.accent; c.fillRect(footX - 14, footY - 30, 28, 28); return; }
  else {
    const flip = S.dir === 3;
    c.save();
    c.translate(snapPx(footX), snapPx(footY - hop + (swim ? 7 : 0)));
    if (swim) { c.beginPath(); c.rect(-40, -70, 80, 70 - 8); c.clip(); }
    c.rotate(rot); c.scale(sx, sy);
    c.imageSmoothingEnabled = true;
    if (blink) c.globalAlpha = 0.45;
    c.drawImage(flip ? cc.f : cc.n, -24, -46.5, 48, 48);
    // 개구리 볼 부풀리기
    if (ch.key === 'frog') {
      const pump = Math.sin(RT * 3);
      if (pump > 0) { c.globalAlpha = (blink ? 0.45 : 1) * pump * 0.5; const src = flip ? cc.f : cc.n, s = src.width; c.drawImage(src, 0, s * 0.42, s, s * 0.22, -25.5, -46.5 + 48 * 0.42, 51, 48 * 0.22); }
    }
    if (flash > 0) { c.globalAlpha = flash; c.drawImage(flip ? cc.wf : cc.w, -24, -46.5, 48, 48); }
    c.restore();
  }
  if (swim) {
    const ph = (RT * 1.4) % 1;
    c.strokeStyle = 'rgba(220,245,255,0.8)'; c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(footX, footY - 1, 13, 4, 0, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1 - ph; c.beginPath(); c.ellipse(footX, footY - 1, 13 + ph * 12, 4 + ph * 4, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
  }
  if (S.combo >= 5) drawComboAura(c, footX, footY, true);
}
function drawComboAura(c, x, y, front) {
  const gold = S.combo >= 10, col = gold ? [255, 215, 70] : [110, 200, 255];
  if (!front) {
    const p = 0.55 + 0.25 * Math.sin(RT * (gold ? 9 : 6));
    c.strokeStyle = 'rgba(' + col + ',' + p.toFixed(3) + ')'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(x, y, 19, 6.5, 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(' + col + ',' + (p * 0.22).toFixed(3) + ')'; c.fill();
    const g = c.createRadialGradient(x, y - 20, 4, x, y - 20, 34);
    g.addColorStop(0, 'rgba(' + col + ',' + (p * 0.28).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
    c.fillStyle = g; c.fillRect(x - 36, y - 56, 72, 72);
  }
  // 도는 별빛 (앞/뒤를 나눠 깊이감)
  const n = gold ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const a = RT * (gold ? 3.4 : 2.4) + i * Math.PI * 2 / n, sx = Math.cos(a) * 21, sy = Math.sin(a) * 7;
    if ((sy > 0) !== front) continue;
    const px = Math.round(x + sx), py = Math.round(y - 14 + sy);
    c.fillStyle = 'rgba(' + col + ',0.95)'; c.fillRect(px - 1, py, 3, 1); c.fillRect(px, py - 1, 1, 3);
    c.fillStyle = '#ffffff'; c.fillRect(px, py, 1, 1);
  }
  if (front && gold && vr() < 0.12) FX.sparkle(x, y - 20, 1, true, 16);
}

/* ---------- 위험 요소 ---------- */
function drawGhosts(c) {
  for (const g of S.ghosts) {
    if (g.warn > 0) continue;
    const gx = g.x * TS + 18, gy = g.y * TS + 18 + Math.sin(RT * 6 + g.y) * 2;
    const spr = ART.ghost[Math.floor(RT * 8) % 3], flip = g.vx < 0;
    for (let k = 2; k >= 0; k--) {
      const off = k * 0.32;
      c.globalAlpha = k ? 0.14 / k : 0.88;
      c.save(); c.translate(Math.round(gx - g.vx * off * 2), Math.round(gy - g.vy * off * 2)); if (flip) c.scale(-1, 1);
      c.drawImage(spr.c, -spr.ax, -spr.ay); c.restore();
    }
    c.globalAlpha = 1;
  }
}
function drawTelegraphs(c) {
  // 유령 예고: 지나갈 길을 점선 + 화살표로
  for (const g of S.ghosts) if (g.warn > 0) {
    const a = 0.35 + 0.3 * Math.abs(Math.sin(RT * 10)), horiz = g.vx !== 0;
    const gx = g.x * TS + 18, gy = g.y * TS + 18;
    c.strokeStyle = 'rgba(200,220,255,' + a.toFixed(3) + ')'; c.lineWidth = 2; c.setLineDash([6, 6]);
    c.lineDashOffset = -RT * 40 * Math.sign(horiz ? g.vx : g.vy);
    c.beginPath();
    if (horiz) { c.moveTo(0, gy); c.lineTo(VW, gy); } else { c.moveTo(gx, 0); c.lineTo(gx, VH); }
    c.stroke(); c.setLineDash([]);
    // 화면 가장자리에 반투명 유령 + 방향 표시
    const ex = horiz ? (g.vx > 0 ? 16 : VW - 16) : gx, ey = horiz ? gy : (g.vy > 0 ? 18 : VH - 12);
    const spr = ART.ghost[Math.floor(RT * 8) % 3];
    c.globalAlpha = 0.5 + 0.3 * Math.sin(RT * 12);
    c.drawImage(spr.c, Math.round(ex - spr.ax), Math.round(ey - spr.ay));
    c.globalAlpha = 1;
    const dx = Math.sign(g.vx), dy = Math.sign(g.vy);
    for (let i = 0; i < 3; i++) {
      const s = ((RT * 2 + i / 3) % 1) * 60 + 22;
      const ax = ex + dx * s, ay = ey + dy * s;
      c.fillStyle = 'rgba(220,235,255,' + (0.8 - i * 0.2).toFixed(2) + ')';
      c.beginPath();
      if (horiz) { c.moveTo(ax + dx * 5, ay); c.lineTo(ax - dx * 2, ay - 5); c.lineTo(ax - dx * 2, ay + 5); }
      else { c.moveTo(ax, ay + dy * 5); c.lineTo(ax - 5, ay - dy * 2); c.lineTo(ax + 5, ay - dy * 2); }
      c.closePath(); c.fill();
    }
  }
  // 벼락 예고: 줄어드는 조준 원
  for (const L of S.lightnings) if (L.warn > 0) {
    const p = 1 - L.warn / 1.3, cx = L.x * TS + 18, cy = L.y * TS + 18;
    const blink = Math.sin(RT * (10 + p * 18)) > 0;
    const r = 22 - p * 12;
    c.strokeStyle = blink ? 'rgba(255,90,70,0.95)' : 'rgba(255,217,77,0.9)'; c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + RT * 1.5;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * (r + 3), cy + Math.sin(a) * (r + 3)); c.lineTo(cx + Math.cos(a) * (r + 8), cy + Math.sin(a) * (r + 8)); c.stroke();
    }
    c.fillStyle = 'rgba(255,217,77,' + (0.12 + 0.18 * p).toFixed(3) + ')'; c.fillRect(L.x * TS + 3, L.y * TS + 3, TS - 6, TS - 6);
  }
}
function drawBolts(c) {
  for (const L of S.lightnings) if (L.struck > 0) {
    const cx = L.x * TS + 18, cy = L.y * TS + 22;
    if (!L.pts) {
      L.pts = [[cx + vrange(-30, 30), -10]];
      let x = L.pts[0][0];
      for (let y = 0; y < cy; y += 14) { x += (cx - x) * 0.18 + vrange(-9, 9); L.pts.push([x, y]); }
      L.pts.push([cx, cy]);
      const bi = 2 + Math.floor(vr() * Math.max(1, L.pts.length - 4));
      L.branch = [L.pts[bi]]; let bx = L.pts[bi][0], by = L.pts[bi][1];
      for (let k = 0; k < 4; k++) { bx += vrange(-14, 14) + (vr() < 0.5 ? -8 : 8); by += 12; L.branch.push([bx, by]); }
      FX.decal(cx, cy - 4, 'scorch', 4.5); FX.chips(cx, cy - 2, 6); FX.sparkle(cx, cy - 6, 5, true, 10);
      Light.kick(0.55);
    }
    const a = Math.min(1, L.struck / 0.35);
    const path = (pts) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); c.stroke(); };
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = 'rgba(150,190,255,' + (0.45 * a).toFixed(3) + ')'; c.lineWidth = 9; path(L.pts);
    c.strokeStyle = 'rgba(210,230,255,' + (0.8 * a).toFixed(3) + ')'; c.lineWidth = 4; path(L.pts); c.lineWidth = 2; path(L.branch);
    c.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; c.lineWidth = 1.6; path(L.pts);
    c.restore();
    c.fillStyle = 'rgba(255,255,255,' + (a * 0.18).toFixed(3) + ')'; c.fillRect(-10, -10, VW + 20, VH + 20);
  }
}

/* ---------- 조명 목록 ---------- */
function collectLights() {
  const L = [];
  L.push({ x: S.px, y: S.py - 6, r: 78, c: [255, 236, 205], i: 0.55 });
  for (const b of S.buildings) {
    const x = b.x * TS + 18, y = b.y * TS + 18;
    if (!S.demo && isFlooded(b.x, b.y)) continue;
    if (b.type === 'fire') { const fl = 0.9 + 0.1 * Math.sin(RT * 13 + b.x) + 0.06 * Math.sin(RT * 29); L.push({ x, y: y + 2, r: 165 * fl, c: [255, 168, 78], i: 1.1 * fl, glow: 1 }); }
    else if (b.type === 'tent') L.push({ x, y: y + 6, r: 62, c: [255, 196, 120], i: 0.6, glow: 0.35 });
    else if (b.type === 'shellart') L.push({ x, y: y - 22, r: 46, c: [205, 225, 255], i: 0.55, glow: 0.45 });
    else if (b.type === 'flag') L.push({ x: x - 8, y: y - 26, r: 26, c: [255, 220, 120], i: 0.35 });
  }
  for (const r of S.resources) if (r.golden) L.push({ x: r.x * TS + 18, y: r.y * TS + 12, r: 46, c: [255, 214, 92], i: 0.6, glow: 0.55 });
  for (const g of S.ghosts) if (g.warn <= 0) L.push({ x: g.x * TS + 18, y: g.y * TS + 18, r: 60, c: [150, 200, 255], i: 0.75, glow: 0.5 });
  for (const B of S.lightnings) {
    if (B.struck > 0) L.push({ x: B.x * TS + 18, y: B.y * TS + 18, r: 240, c: [215, 230, 255], i: 1.8 * (B.struck / 0.35), glow: 1 });
    else if (B.warn > 0) L.push({ x: B.x * TS + 18, y: B.y * TS + 18, r: 44, c: [255, 110, 80], i: 0.5 + 0.3 * Math.sin(RT * 14) });
  }
  if (S.combo >= 5) L.push({ x: S.px, y: S.py, r: 90, c: S.combo >= 10 ? [255, 215, 90] : [120, 200, 255], i: 0.55, glow: 0.4 });
  if (curChar().key === 'frog') L.push({ x: S.px, y: S.py - 6, r: 56, c: [140, 255, 120], i: 0.4 });
  return L;
}

/* ---------- UI 성격의 표시 (조명 위) ---------- */
const tintCache = {};
function tinted(spr, col, key) {
  if (tintCache[key]) return tintCache[key];
  const c = mkCanvas(spr.w, spr.h), g = c.getContext('2d'); g.drawImage(spr.c, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, spr.w, spr.h);
  return (tintCache[key] = c);
}
function drawBuildPreview(c) {
  if (S.demo || S.sel < 0 || S.cmd || !running) return;
  const a = 0.08 + 0.04 * Math.sin(RT * 4);
  c.fillStyle = 'rgba(255,217,77,' + a.toFixed(3) + ')';
  c.strokeStyle = 'rgba(255,217,77,0.28)'; c.lineWidth = 1; c.setLineDash([2, 3]);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (tileType(x, y) === 2 && !isFlooded(x, y)) {
    c.fillRect(x * TS, y * TS, TS, TS); c.strokeRect(x * TS + 0.5, y * TS + 0.5, TS - 1, TS - 1);
  }
  c.setLineDash([]);
  const b = BUILDS[S.sel], ft = facingTile(), ok = placeable(ft.x, ft.y) && canAfford(b.cost) && !hasBuild(b.key);
  const spr = ART.build[b.key][0], fx = ft.x * TS + 18, fy = ft.y * TS + 30;
  c.strokeStyle = ok ? 'rgba(130,255,150,0.95)' : 'rgba(255,90,80,0.95)'; c.lineWidth = 2;
  c.strokeRect(ft.x * TS + 2, ft.y * TS + 2, TS - 4, TS - 4);
  c.globalAlpha = 0.55 + 0.15 * Math.sin(RT * 6);
  c.drawImage(spr.c, Math.round(fx - spr.ax), Math.round(fy - spr.ay));
  if (!ok) { c.globalAlpha = 0.55; c.drawImage(tinted(spr, 'rgba(255,60,50,0.7)', b.key + '_bad'), Math.round(fx - spr.ax), Math.round(fy - spr.ay)); }
  c.globalAlpha = 1;
}
function drawTargetHint(c) {
  if (S.demo || !running) return;
  const tg = currentTarget(); if (!tg) return;
  const bob = Math.round(Math.abs(Math.sin(RT * 4)) * -3);
  let ax, ay;
  if (tg.res) {
    const r = tg.res, spr = resSprite(r), f = resFoot(r);
    c.globalAlpha = tg.active ? 0.95 : 0.55 + 0.35 * Math.abs(Math.sin(RT * 4));
    c.drawImage(spr.hl, Math.round(f.x - spr.ax - 1), Math.round(f.y - spr.ay - 1));
    c.globalAlpha = 1;
    ax = f.x; ay = f.y - spr.ay - 6;
    if (tg.active) return;
  } else {
    ax = S.otter.tx * TS + 18; ay = S.otter.ty * TS - 22;
    if (!tg.ok) return;
  }
  // 콕 집는 화살표
  c.fillStyle = '#1a1420'; c.beginPath(); c.moveTo(ax - 5, ay - 7 + bob); c.lineTo(ax + 5, ay - 7 + bob); c.lineTo(ax, ay - 1 + bob); c.closePath(); c.fill();
  c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(ax - 3.5, ay - 6.2 + bob); c.lineTo(ax + 3.5, ay - 6.2 + bob); c.lineTo(ax, ay - 2.2 + bob); c.closePath(); c.fill();
}
function bubble(c, x, y, w, h, bg, border) {
  x = Math.round(x); y = Math.round(y);
  c.fillStyle = border; c.fillRect(x + 1, y, w - 2, h); c.fillRect(x, y + 1, w, h - 2);
  c.fillStyle = bg; c.fillRect(x + 2, y + 1, w - 4, h - 2); c.fillRect(x + 1, y + 2, w - 2, h - 4);
  c.fillStyle = border; c.fillRect(x + w / 2 - 3, y + h, 6, 1); c.fillRect(x + w / 2 - 2, y + h + 1, 4, 1); c.fillRect(x + w / 2 - 1, y + h + 2, 2, 1);
  c.fillStyle = bg; c.fillRect(x + w / 2 - 2, y + h - 1, 4, 1); c.fillRect(x + w / 2 - 1, y + h, 2, 1);
}
function drawNpcBubble(c) {
  const o = S.otter, crow = curChar().key === 'dark';
  const ox = o.tx * TS + 18, oy = o.ty * TS + 29;
  if (o.leaving) {
    if (o.leaving < 1.5) { c.globalAlpha = 1 - o.leaving / 1.5; drawRichText(c, crow ? '까악…' : '먼저 갈게~', ox, oy - 40, '#f6efd9'); c.globalAlpha = 1; }
    return;
  }
  if (o.gone || !(o.req || o.moodT > 0)) return;
  const bg = crow ? '#3a3145' : '#fbf4e2', fg = crow ? '#f6efd9' : '#2a1f1a';
  const ready = !o.moodT && o.req && S.inv[o.req.type] >= o.req.n;
  const border = ready ? '#ffcf3a' : (crow ? '#160f1c' : '#3a2a20');
  const by = oy - 52 + (ready ? Math.round(Math.abs(Math.sin(RT * 5)) * -2) : 0);
  if (o.moodT > 0) {
    const moodIcon = o.mood === '❤️' ? 'heart' : null;
    bubble(c, ox - 12, by, 24, 18, bg, border);
    if (moodIcon) c.drawImage(ART.icon.heart.c, ox - 8, by + 1);
    else { c.font = '13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.mood, ox, by + 10); }
    return;
  }
  c.font = 'bold 11px ' + PIXFONT;
  const txt = '×' + o.req.n, tw = Math.ceil(c.measureText(txt).width);
  const w = 16 + tw + 9;
  bubble(c, ox - w / 2, by, w, 18, bg, border);
  c.drawImage(ART.icon[o.req.type].c, Math.round(ox - w / 2 + 3), by + 1);
  c.fillStyle = fg; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, Math.round(ox - w / 2 + 19), by + 10);
}

/* ---------- 결과 화면 불꽃놀이 ---------- */
function playFireworks() {
  const snap = $('snapshot'), sctx = snap.getContext('2d');
  const W = snap.width, H = snap.height, k = W / VW;
  let parts = [], frame = 0;
  const cols = ['#ffd700', '#ff6f8f', '#8fd8ff', '#6ee04c', '#ffb04d', '#ff5d47'];
  function boom() {
    const cx = W * (0.2 + vr() * 0.6), cy = H * (0.15 + vr() * 0.4);
    const col = cols[Math.floor(vr() * cols.length)];
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, sp = (2 + vr() * 3) * k; parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col, life: 1 }); }
    try { tone(900 + vr() * 400, .3, 'sine', .08, -400); } catch (e) {}
  }
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  base.getContext('2d').drawImage(snap, 0, 0);
  boom();
  const iv = setInterval(() => {
    frame++;
    sctx.drawImage(base, 0, 0);
    if (frame % 14 === 0 && frame < 70) boom();
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.08 * k; p.life -= 0.02;
      sctx.globalAlpha = Math.max(0, p.life); sctx.fillStyle = p.col; sctx.fillRect(p.x, p.y, 3 * k, 3 * k);
    }
    sctx.globalAlpha = 1;
    parts = parts.filter(p => p.life > 0);
    if (frame > 120) { clearInterval(iv); sctx.drawImage(base, 0, 0); }
  }, 40);
}

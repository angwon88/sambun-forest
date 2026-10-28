/* ============ 삼분의숲 — charanim ============
   PixelLab으로 만든 8방향 캐릭터 애니메이션 재생기.
   - 데이터는 js/char-anims.js (CHAR_ANIMS, tools/pack_anims.py가 자동 생성)
   - 동작: idle(서 있기) · walk(걷기) · act(채집) · happy(기쁨) · hurt(피격)
   - 방향: e se s sw w nw n ne. 없는 방향은 좌우 반전 → 가까운 방향 순으로 대체
   - 데이터가 없는 캐릭터는 지금처럼 한 장짜리 그림으로 그린다 (render.js)
   게임 규칙(S의 값)은 읽기만 하고 바꾸지 않는다. */
'use strict';
const DIR8 = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
const MIRROR = { e: 'w', w: 'e', se: 'sw', sw: 'se', ne: 'nw', nw: 'ne', s: 's', n: 'n' };
function dir8(dx, dy) { return DIR8[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8]; }

const CharAnim = (() => {
  const sets = {};                                   // key → { d, img, white, ready }
  const FALLBACK = { walk: ['idle'], act: ['idle'], happy: ['idle'], hurt: ['idle'] };
  const st = { key: null, face: 's', anim: 'idle', t: 0, once: null, onceT: 0, lastFlash: 0 };

  function load() {
    if (typeof CHAR_ANIMS === 'undefined') return;
    for (const k of Object.keys(CHAR_ANIMS)) {
      const d = CHAR_ANIMS[k], img = new Image(), set = { d, img, white: null, ready: false, skin: null, rules: null, vimg: null, vcache: {}, hat: null, himg: null, hwhite: null, hcache: {} };
      set.key = k; sets[k] = set;
      img.onload = () => {
        const c = mkCanvas(img.width, img.height), g = c.getContext('2d');
        g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        set.white = c; set.ready = true;
        buildSkin(set);
      };
      img.src = d.src;
    }
  }
  const has = key => !!(sets[key] && sets[key].ready);
  // 꾸미기 색 (js/deco.js): 아틀라스 전체를 한 번 색칠해 두고 그것으로 그린다
  function setSkin(key, rules, name) {
    const set = sets[key]; if (!set) return;
    set.rules = rules; set.skin = rules ? name : null;
    buildSkin(set);
  }
  function buildSkin(set) {
    if (!set.ready) return;
    if (!set.rules) set.vimg = null;
    else set.vimg = set.vcache[set.skin] || (set.vcache[set.skin] = Deco.recolor(set.img, set.rules));
    buildHat(set);
  }
  // 꾸미기 모자 (js/hats.js): 색칠한 아틀라스 위에 모자를 그려 둔 것으로 그린다
  function setHat(hat) { for (const set of Object.values(sets)) { set.hat = hat && hat !== 'basic' ? hat : null; buildHat(set); } }
  function buildHat(set) {
    if (!set.ready || !set.hat || typeof Hats === 'undefined') { set.himg = set.hwhite = null; return; }
    const ck = (set.skin || 'basic') + '.' + set.hat;
    if (!set.hcache[ck]) {
      let h = null;
      try { h = Hats.compose(set.key, set.d, set.img, set.vimg || set.img, set.hat); } catch (e) { console.error(e); }
      let w = null;
      if (h) { w = mkCanvas(h.width, h.height); const g = w.getContext('2d'); g.drawImage(h, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, w.width, w.height); }
      set.hcache[ck] = { h, w };
    }
    set.himg = set.hcache[ck].h; set.hwhite = set.hcache[ck].w;
  }
  // 정지(rot) 그림 한 장 (꾸미기 창 미리보기용)
  function frameCanvas(key, dir, withHat) {
    const set = sets[key]; if (!set || !set.ready) return null;
    const d = set.d, A = d.anims.rot || d.anims.idle || d.anims.walk; if (!A) return null;
    const fr = (A.dirs[dir] || Object.values(A.dirs)[0])[0], cell = d.cell;
    const c = mkCanvas(cell, cell);
    c.getContext('2d').drawImage(withHat ? (Hats.compose(key, d, set.img, set.img, withHat) || set.img) : set.img, (fr % d.cols) * cell, Math.floor(fr / d.cols) * cell, cell, cell, 0, 0, cell, cell);
    return c;
  }

  // 동작+방향에 맞는 프레임 찾기 (없으면 반전·가까운 방향·대체 동작 순)
  function pick(d, anim, face) {
    for (const a of [anim, ...(FALLBACK[anim] || []), 'idle', 'rot']) {
      const A = d.anims[a]; if (!A) continue;
      if (A.dirs[face]) return { A, frames: A.dirs[face], flip: false, name: a };
      if (A.dirs[MIRROR[face]]) return { A, frames: A.dirs[MIRROR[face]], flip: true, name: a };
      const i = DIR8.indexOf(face);
      for (let k = 1; k <= 4; k++) for (const j of [i + k, i - k]) {
        const dd = DIR8[(j + 8) % 8];
        if (A.dirs[dd]) return { A, frames: A.dirs[dd], flip: false, name: a };
      }
    }
    return null;
  }
  function playOnce(name) { st.once = name; st.onceT = 0; }

  // 매 프레임: 바라보는 방향과 동작 정하기
  function update(dt) {
    const ch = curChar();
    if (st.key !== ch.key) { st.key = ch.key; st.face = 's'; st.once = null; st.t = 0; }
    if (S.hitFlash > 0.3 && st.lastFlash <= 0) playOnce('hurt');     // 피격 순간
    st.lastFlash = S.hitFlash;
    if (S.cmd) {                                                       // 채집 중: 자원 쪽을 본다
      const r = S.cmd.res; st.face = dir8(r.x * TS + 18 - S.px, r.y * TS + 18 - S.py);
    } else if (S.moving && running) {                                  // 이동 중: 입력 방향을 본다
      let dx = S.joy.x, dy = S.joy.y;
      if (S.keys['arrowup'] || S.keys['w']) dy -= 1;
      if (S.keys['arrowdown'] || S.keys['s']) dy += 1;
      if (S.keys['arrowleft'] || S.keys['a']) dx -= 1;
      if (S.keys['arrowright'] || S.keys['d']) dx += 1;
      if (Math.hypot(dx, dy) > 0.15) st.face = dir8(dx, dy);
    }
    const anim = S.cmd ? 'act' : (S.moving && running ? 'walk' : 'idle');
    let mul = 1;
    if (anim === 'walk') {
      const inWater = ch.waterFree && !walkable(S.px, S.py);
      mul = ch.speed * (S.speedBuffT > 0 ? 2 : 1) * (inWater ? 1.6 : 1);
    }
    if (anim !== st.anim) { st.anim = anim; st.t = 0; } else st.t += dt * mul;
    if (st.once) {
      st.onceT += dt;
      const set = sets[st.key], p = set && set.ready ? pick(set.d, st.once, st.face) : null;
      const len = p && p.name === st.once ? p.frames.length / p.A.fps + (p.A.hold || 0.12) : 0;
      if (st.onceT >= len) st.once = null;
    }
  }

  // 그리기. 성공하면 true
  function draw(c, footX, footY, o = {}) {
    const set = sets[st.key]; if (!set || !set.ready) return false;
    const d = set.d, p = pick(d, st.once || st.anim, st.face); if (!p) return false;
    const n = p.frames.length;
    const i = (st.once && p.name === st.once) ? Math.min(n - 1, Math.floor(st.onceT * p.A.fps)) : Math.floor(st.t * p.A.fps) % n;
    const idx = p.frames[i], cell = d.cell, sc = d.draw / cell;
    const sx = (idx % d.cols) * cell, sy = Math.floor(idx / d.cols) * cell;
    c.save();
    c.translate(d.smooth ? snapPx(footX) : Math.round(footX), d.smooth ? snapPx(footY) : Math.round(footY));
    if (o.clipBelow !== undefined) { c.beginPath(); c.rect(-80, -160, 160, 160 - o.clipBelow); c.clip(); }
    if (p.flip) c.scale(-1, 1);
    c.imageSmoothingEnabled = !!d.smooth;
    c.globalAlpha = o.alpha ?? 1;
    const dx = -d.foot[0] * sc, dy = -d.foot[1] * sc, dw = cell * sc;
    c.drawImage(set.himg || set.vimg || set.img, sx, sy, cell, cell, dx, dy, dw, dw);
    if (o.flash > 0) { c.globalAlpha = o.flash; c.drawImage(set.hwhite || set.white, sx, sy, cell, cell, dx, dy, dw, dw); }
    c.restore();
    return true;
  }
  return { load, has, update, draw, playOnce, setSkin, setHat, frameCanvas, st, sets };
})();

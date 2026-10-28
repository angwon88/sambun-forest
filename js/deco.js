/* ============ 삼분의숲 — deco ============
   꾸미기: 건물 스킨 · 캐릭터 색 목록, 장착 적용, 꾸미기 창(가게·도감), 결과 화면 보상 표시.
   그림만 바뀌고 점수·규칙은 그대로다. 저장(진주·가진 것·장착)은 js/meta.js.
   ▶ 아이템 추가하기
     - 건물: SKINS의 건물 아래에 한 줄. art에 바꿀 색(ramp)·무늬를 적는다 (art.js의 SKIN0 참고)
     - 캐릭터: CHAR_SKINS에 한 줄. rules = 어떤 색(색상 hue·채도·밝기 범위)을 어떻게 바꿀지
     - price가 있으면 가게에서 판다. price가 없으면 meta.js의 ACH(도감)·FRIEND(우정) 보상으로만 얻는다
       (보상에 '슬롯.스킨' 형식으로 적기, 예: 'tent.gold') */
'use strict';
const R6 = PIX.ramp;
const SKINS = {
  tent: {
    basic: { name: '빨간 텐트' },
    sky: { name: '하늘 텐트', price: 50, art: { cloth: R6('#16304e', '#1f4f7a', '#2f74a8', '#4a9bd0', '#7cc3ea', '#bfe6fa') } },
    forest: { name: '숲 텐트', price: 50, art: { cloth: R6('#173a22', '#22582e', '#2f7a3a', '#45a04c', '#74c466', '#b4e39a'), pennant: '#ff8a5a' } },
    pink: { name: '벚꽃 텐트', price: 60, art: { cloth: R6('#5a1a34', '#8a2a52', '#c04878', '#e870a0', '#f8a0c4', '#ffd6e6'), pennant: '#fff6e8' } },
    stripe: { name: '서커스 텐트', price: 70, art: { pattern: 'stripe', pennant: '#8fd8ff' } },
    night: { name: '별밤 텐트', price: 90, art: { cloth: R6('#0f1230', '#1b2050', '#2a3274', '#3c4a98', '#5a6cba', '#8e9edc'), band: R6('#3a3a5a', '#5a5a80', '#8080a8', '#b0b0d0', '#dcdcf0'), pattern: 'stars', pennant: '#ffe683' } },
    otter: { name: '해달 텐트', art: { cloth: R6('#2e1b12', '#4a2c1c', '#6b4128', '#8c5a38', '#b07b52', '#d6a67c'), band: R6('#a88a68', '#c8a880', '#e2c8a0', '#f2e2c4', '#fff4e2'), pattern: 'paws', pennant: '#8fd8ff' } },
    gold: { name: '황금 텐트', art: { cloth: PAL.gold, pennant: '#e9493e' } },
  },
  fire: {
    basic: { name: '모닥불' },
    blue: { name: '푸른 불꽃', price: 70, art: { flame: R6('#0e1a5a', '#1a3a9a', '#2a6ad8', '#4aa8ff', '#9ad8ff', '#eefaff'), light: [110, 170, 255] } },
    green: { name: '도깨비불', price: 70, art: { flame: R6('#0c3a1a', '#167a2a', '#2ab848', '#5ae070', '#a8f7a0', '#effff0'), light: [110, 255, 140] } },
    violet: { name: '보랏빛 불꽃', price: 80, art: { flame: R6('#2a0e4a', '#4e1a8a', '#7a30c8', '#a860f0', '#d0a0ff', '#f6eaff'), light: [180, 120, 255] } },
    pink: { name: '분홍 불꽃', art: { flame: R6('#5a0e2a', '#9a1a4a', '#d83a78', '#ff70a8', '#ffb0d0', '#fff0f6'), light: [255, 130, 190] } },
    gold: { name: '황금 불꽃', art: { flame: R6('#7a5208', '#b8860b', '#e8b830', '#ffe066', '#fff3b0', '#ffffff'), light: [255, 225, 120] } },
  },
  fence: {
    basic: { name: '나무 울타리' },
    white: { name: '하얀 울타리', price: 40, art: { wood: R6('#5a5e6a', '#8a8f9c', '#b5bac4', '#d6dae0', '#eef0f2', '#ffffff') } },
    drift: { name: '유목 울타리', price: 40, art: { wood: R6('#3a3632', '#5a5450', '#7a726a', '#9a9088', '#bab0a4', '#d8d0c4') } },
    bamboo: { name: '대나무 울타리', price: 50, art: { wood: R6('#2e3a12', '#4a5e1a', '#6a8424', '#8aa834', '#aecb52', '#d2e88a'), pattern: 'bamboo' } },
    red: { name: '빨간 울타리', price: 50, art: { wood: R6('#3a0e0e', '#6a1a16', '#9a2a20', '#c43c2c', '#e0604a', '#f49478') } },
  },
  flower: {
    basic: { name: '알록달록 화단' },
    tulip: { name: '튤립 화단', price: 40, art: { cols: ['#ff4a5a', '#ff8fb6', '#ffd0dc', '#e8304a', '#ff6f8a', '#ffb0c0'] } },
    white: { name: '안개꽃 화단', price: 40, art: { cols: ['#ffffff', '#f4f0ff', '#fff6e8', '#e8f4ff', '#fffbe0', '#f0e8ff'] } },
    sunny: { name: '해바라기 화단', price: 50, art: { cols: ['#ffd23a', '#ffb800', '#ffe680', '#ffcc33', '#f5a623', '#fff0a0'], center: '#7a4a1a' } },
    blue: { name: '수국 화단', price: 50, art: { cols: ['#8fc8ff', '#a0a8ff', '#c9a0ff', '#6aa8f0', '#b0d8ff', '#d8c0ff'], center: '#ffffff' } },
  },
  palm: {
    basic: { name: '야자수' },
    autumn: { name: '단풍 야자', price: 60, art: { leaf: R6('#4a1c0c', '#6e2c10', '#9a4416', '#c4621e', '#e08a2a', '#f2b24a', '#ffd88a') } },
    blossom: { name: '꽃분홍 야자', price: 70, art: { leaf: R6('#5a1a34', '#8a2a52', '#b84a78', '#e070a0', '#f498c0', '#ffc4dc', '#ffe6f0') } },
    lights: { name: '꼬마전구 야자', art: { pattern: 'lights' } },
  },
  shellart: {
    basic: { name: '조개탑' },
    mint: { name: '청록 소라탑', price: 60, art: { shell: R6('#0e3a3a', '#1a5a5a', '#2a8a80', '#48b8a8', '#88e0d0', '#d0fff4') } },
    coral: { name: '산호탑', price: 70, art: { shell: R6('#6a1a12', '#9a2c1a', '#cc4a2a', '#f07048', '#ffa070', '#ffd0b0') } },
    gold: { name: '황금 조개탑', price: 120, art: { shell: PAL.gold } },
    pearl: { name: '진주탑', art: { shell: R6('#4a5a7a', '#6a7ea0', '#9aaccc', '#c4d2ea', '#e4ecf8', '#ffffff'), pearl: R6('#c88aa8', '#f0c0d8', '#ffe6f2', '#ffffff') } },
  },
  flag: {
    basic: { name: '별 깃발' },
    heart: { name: '하트 깃발', price: 50, art: { cloth: ['#ffd6e6', '#ffb8d2', '#f08cb4'], emb: ['#e9304a', '#b8203a'], emblem: 'heart' } },
    wave: { name: '파도 깃발', price: 50, art: { cloth: ['#7cc3ea', '#4a9bd0', '#2f74a8'], emb: ['#ffffff', '#d8f0ff'], emblem: 'wave' } },
    pirate: { name: '해적 깃발', price: 80, art: { cloth: ['#3a3440', '#2a2430', '#1a1620'], emb: ['#f6f2e8', '#d8d2c4'], emb2: '#1a1620', emblem: 'skull' } },
    otter: { name: '해달 깃발', art: { cloth: ['#e8f6ff', '#cfeaff', '#a8d0f0'], emb: ['#8c5a38', '#6b4128'], emb2: '#2e1b12', emb3: '#fdeedb', emblem: 'otter' } },
    crown: { name: '왕관 깃발', art: { cloth: ['#a070e0', '#8050c8', '#6038a8'], emb: ['#ffd23f', '#e9b52a'], emb2: '#e9493e', emblem: 'crown' } },
  },
};
/* 캐릭터 색: 규칙에 맞는 픽셀만 색을 바꾼다 (눈·배 같은 다른 색은 그대로)
   hue:[시작,끝](도, 360을 넘어가면 감싸기) smin/smax 채도 lmin/lmax 밝기 범위
   set: 새 색상 / dh: 색상 이동, sm·sa 채도 ×·+, lm·la 밝기 ×·+ */
const CHAR_SKINS = {
  gizmo: {
    basic: { name: '기본 털' },
    cocoa: { name: '코코아', price: 120, rules: [{ hue: [20, 70], smin: 0.15, lmin: 0.45, set: 26, sm: 0.55, lm: 0.62 }, { hue: [345, 20], smin: 0.1, lmin: 0.45, set: 18, sm: 0.7, lm: 0.72 }] },
    mint: { name: '민트', price: 120, rules: [{ hue: [20, 70], smin: 0.15, lmin: 0.45, set: 160, sm: 0.7, lm: 0.97 }, { hue: [345, 20], smin: 0.1, lmin: 0.45, set: 175, sm: 0.5 }] },
    berry: { name: '딸기우유', price: 140, rules: [{ hue: [20, 70], smin: 0.15, lmin: 0.45, set: 340, sm: 0.9, lm: 0.98 }, { hue: [345, 20], smin: 0.1, lmin: 0.45, set: 330, sm: 0.8 }] },
  },
  monkey: {
    basic: { name: '빨간 털' },
    blue: { name: '파란 원숭이', price: 120, rules: [{ hue: [330, 25], smin: 0.35, set: 212, sm: 0.85 }] },
    purple: { name: '보라 원숭이', price: 140, rules: [{ hue: [330, 25], smin: 0.35, set: 275, sm: 0.8 }] },
    gold: { name: '황금 원숭이', rules: [{ hue: [330, 25], smin: 0.35, set: 42, la: 0.06 }] },
  },
  frog: {
    basic: { name: '초록 개구리' },
    sky: { name: '하늘 개구리', price: 120, rules: [{ hue: [65, 170], smin: 0.2, dh: 95, sm: 0.95 }] },
    orange: { name: '귤 개구리', price: 120, rules: [{ hue: [65, 170], smin: 0.2, dh: -75 }] },
    pink: { name: '딸기 개구리', price: 140, rules: [{ hue: [65, 170], smin: 0.2, dh: 225, sm: 0.85 }] },
  },
  dark: {
    basic: { name: '밤빛' },
    ash: { name: '잿빛', price: 120, rules: [{ hue: [200, 320], lmax: 0.6, sm: 0.1, lm: 1.7, la: 0.05 }] },
    teal: { name: '심해빛', price: 120, rules: [{ hue: [200, 320], lmax: 0.6, set: 188, sm: 2.4, lm: 1.45, la: 0.03 }] },
    forest: { name: '숲그늘', price: 140, rules: [{ hue: [200, 320], lmax: 0.6, set: 140, sm: 2.0, lm: 1.4, la: 0.03 }] },
  },
};

const Deco = (() => {
  const table = slot => SKINS[slot] || CHAR_SKINS[slot] || (slot === 'hat' ? HATS : null);   // 모자: js/hats.js
  const isChar = slot => !!CHAR_SKINS[slot];
  // 장착 중인 스킨 (가진 것만 인정, 목록에서 사라진 아이템이면 기본)
  function cur(slot) {
    const s = Meta.equipped(slot), t = table(slot);
    return (t && t[s] && Meta.owns(slot + '.' + s)) ? s : 'basic';
  }
  const artSkin = key => { const s = cur(key); return s === 'basic' ? undefined : SKINS[key][s].art; };
  const charRules = key => { const s = cur(key); return s === 'basic' ? null : CHAR_SKINS[key][s].rules; };

  /* ---------- 색 바꾸기 (캐릭터) ---------- */
  const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const inHue = (h, [a, b]) => a <= b ? (h >= a && h <= b) : (h >= a || h <= b);
  const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l <= 0.5 ? d / (mx + mn) : d / (2 - mx - mn);
    let h = mx === r ? (g - b) / d : mx === g ? 2 + (b - r) / d : 4 + (r - g) / d;
    h = ((h / 6) % 1 + 1) % 1;
    return [h * 360, s, l];
  }
  function hsl2rgb(h, s, l) {
    if (!s) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, hk = h / 360;
    const f = t => { t = (t % 1 + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [Math.round(f(hk + 1 / 3) * 255), Math.round(f(hk) * 255), Math.round(f(hk - 1 / 3) * 255)];
  }
  function recolor(src, rules) {
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
    const c = cnv(w, h), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    const id = g.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const [H, S, L] = rgb2hsl(d[i], d[i + 1], d[i + 2]);
      for (const R of rules) {
        if (!inHue(H, R.hue) || S < (R.smin || 0) || S > (R.smax ?? 1) || L < (R.lmin || 0) || L > (R.lmax ?? 1)) continue;
        const h2 = R.set !== undefined ? R.set : ((H + (R.dh || 0)) % 360 + 360) % 360;
        const rgb = hsl2rgb(h2, c01(S * (R.sm ?? 1) + (R.sa || 0)), c01(L * (R.lm ?? 1) + (R.la || 0)));
        d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2];
        break;
      }
    }
    g.putImageData(id, 0, 0);
    return c;
  }
  // 옛 한 장짜리 그림(캐릭터 선택 화면·애니메이션 없는 캐릭터)에도 같은 색을
  const legacyCache = {};
  function legacyImg(key) {
    const rules = charRules(key), img = CHAR_IMGS[key];
    if (!rules || !img || !img.complete || !img.naturalWidth) return null;
    const ck = key + '.' + cur(key);
    return legacyCache[ck] || (legacyCache[ck] = recolor(img, rules));
  }
  const portraitCache = {};
  function portrait(key) {
    const c = legacyImg(key); if (!c) return SPRITE_DATA[key];
    const ck = key + '.' + cur(key);
    return portraitCache[ck] || (portraitCache[ck] = c.toDataURL());
  }

  /* ---------- 장착 적용 ---------- */
  function applyChar(key) { if (typeof CharAnim !== 'undefined') CharAnim.setSkin(key, charRules(key), cur(key)); }
  function applyHat() { if (typeof CharAnim !== 'undefined' && CharAnim.setHat) CharAnim.setHat(cur('hat')); }
  function applySlot(slot) {
    if (slot === 'hat') applyHat();
    else if (isChar(slot)) {
      applyChar(slot);
      if (typeof prepCharCanvases === 'function') prepCharCanvases();
      if ($('charrow').children.length) buildCharSelect();
    } else {
      refreshBuildingArt(slot);
      buildBuildBar(); if (S) updateHUD();
    }
  }
  function init() { for (const c of CHARACTERS) applyChar(c.key); applyHat(); refreshTitle(); }

  /* ---------- 미리보기 그림 ---------- */
  const prevCache = {}, CROP = { palm: [0, 0, 44, 40], flag: [4, 0, 32, 32] };
  // 그림이 있는 부분만 잘라 칸(88x84)에 맞게: 들어가면 정수배(최대 2배), 크면 부드럽게 줄임
  function fitPixel(src, maxW = 88, maxH = 84) {
    const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 16) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0) return src;
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1, r = Math.min(maxW / cw, maxH / ch), k = r >= 1 ? Math.min(2, Math.floor(r)) : r;
    const c = cnv(Math.round(cw * k), Math.round(ch * k)), g = c.getContext('2d');
    g.imageSmoothingEnabled = k < 1;
    g.drawImage(src, x0, y0, cw, ch, 0, 0, c.width, c.height);
    return c;
  }
  function preview(slot, skin) {
    const ck = slot + '.' + skin;
    if (prevCache[ck]) return prevCache[ck];
    let c;
    if (slot === 'hat') {
      return (prevCache[ck] = Hats.icon(skin).toDataURL());          // 모자: 모자 그림만
    }
    if (isChar(slot)) {
      const rules = skin === 'basic' ? null : CHAR_SKINS[slot][skin].rules;
      const fr = CharAnim.frameCanvas(slot, 's');                    // PixelLab 정면 그림
      if (fr) c = fitPixel(rules ? recolor(fr, rules) : fr);
      else {                                                         // 애니메이션이 없으면 옛 그림
        const img = CHAR_IMGS[slot];
        if (!img || !img.naturalWidth) return SPRITE_DATA[slot];
        c = fitPixel(rules ? recolor(img, rules) : recolor(img, []));
      }
    } else {                                                         // 건물: 2배로 (키 큰 건 윗부분만)
      const spr = buildingFrames(slot, skin === 'basic' ? undefined : SKINS[slot][skin].art)[0];
      const [x0, y0, w, h] = CROP[slot] || [0, 0, spr.w, spr.h];
      c = cnv(w * 2, h * 2); const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      g.drawImage(spr.c, x0, y0, w, h, 0, 0, w * 2, h * 2);
    }
    return (prevCache[ck] = c.toDataURL());
  }

  /* ---------- 아이템 상태 ---------- */
  function unlockText(id) {
    const a = Meta.ACH.find(x => x.reward.item === id);
    if (a) return '도감 「' + a.name + '」 달성 — ' + a.desc;
    const i = Meta.FRIEND.findIndex(f => f.item === id);
    if (i >= 0) return '해달 우정 Lv.' + (i + 1) + ' 선물 (누적 부탁 ' + Meta.FRIEND[i].n + '번)';
    return '아직 얻을 수 없어';
  }
  function stateOf(slot, skin) {
    const id = slot + '.' + skin, it = table(slot)[skin];
    if (cur(slot) === skin) return 'eq';
    if (Meta.owns(id)) return 'own';
    return it.price ? 'buy' : 'lock';
  }
  const fresh = new Set();                    // 이번 접속에서 새로 얻은 아이템 (NEW 표시)
  const nameOf = id => { const [s, k] = id.split('.'), t = table(s); return t && t[k] ? t[k].name : id; };

  /* ---------- 꾸미기 창 ---------- */
  let tab = 'camp', armed = null;
  const pearlImg = () => '<img class="pi" src="' + iconURL('pearl') + '" alt="진주">';
  function open(t) {
    if (t) tab = t;
    armed = null; $('decomsg').textContent = '';
    $('decomodal').classList.add('open');
    render(); SFX.select();
  }
  function close() { $('decomodal').classList.remove('open'); armed = null; fresh.clear(); refreshTitle(); }
  function say(msg, bad) { const m = $('decomsg'); m.textContent = msg; m.classList.toggle('bad', !!bad); m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); }
  function card(slot, skin) {
    const it = table(slot)[skin], st = stateOf(slot, skin), id = slot + '.' + skin;
    const label = st === 'eq' ? '장착 중' : st === 'own' ? '장착하기'
      : st === 'buy' ? (armed === id ? '구매할까? ' : '') + pearlImg() + it.price : '🔒';
    return '<button class="ditem ' + st + (armed === id ? ' armed' : '') + '" data-slot="' + slot + '" data-skin="' + skin + '">' +
      (fresh.has(id) ? '<i class="dnew">NEW</i>' : '') +
      '<span class="dpic"><img src="' + preview(slot, skin) + '" alt=""></span>' +
      '<span class="dname">' + it.name + '</span><span class="dstate">' + label + '</span></button>';
  }
  function render() {
    $('decopearls').textContent = Meta.pearls();
    const fi = Meta.friendInfo();
    $('decofriend').innerHTML = '🦦 우정 Lv.' + fi.level + (fi.next ? ' <small>(' + fi.total + '/' + fi.next.n + ')</small>' : ' <small>MAX</small>');
    document.querySelectorAll('#decotabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    let h = '';
    if (tab === 'camp') {
      for (const b of BUILDS) {
        h += '<div class="dsec"><div class="dhead"><img src="' + iconURL(b.key, 'bicon') + '" alt="">' + b.name + '</div><div class="drow">';
        for (const sk of Object.keys(SKINS[b.key])) h += card(b.key, sk);
        h += '</div></div>';
      }
    } else if (tab === 'hat') {
      h += '<div class="dsec"><div class="dhead">🎩 모자 <small>· 네 캐릭터가 같이 써요</small></div><div class="drow">';
      for (const sk of Object.keys(HATS)) h += card('hat', sk);
      h += '</div></div>';
    } else if (tab === 'char') {
      for (const c of CHARACTERS) {
        h += '<div class="dsec"><div class="dhead">' + c.name + '</div><div class="drow">';
        for (const sk of Object.keys(CHAR_SKINS[c.key])) h += card(c.key, sk);
        h += '</div></div>';
      }
    } else {
      const D = Meta.data(), done = Meta.ACH.filter(a => Meta.achDone(a.id)).length;
      h += '<div class="dstats">🏝️ 캠프 ' + D.runs + '번 · ⭐ 최고 ' + D.stats.best + '점 · ' + pearlImg() + ' 누적 ' + D.earned + '</div>';
      // 우정도
      const nextGift = fi.next ? (fi.next.item ? nameOf(fi.next.item) : '진주 ' + fi.next.pearls) : '';
      const pct = fi.next ? Math.round((fi.total - fi.prev) / (fi.next.n - fi.prev) * 100) : 100;
      h += '<div class="dfriend"><div>🦦 해달 우정 <b>Lv.' + fi.level + '</b>' + (fi.next ? ' — 다음 선물 <b>' + nextGift + '</b>까지 부탁 ' + Math.max(0, fi.next.n - fi.total) + '번' : ' — 최고 단계!') +
        '</div><div class="dbar"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div></div>';
      h += '<div class="dhead">📖 도감 ' + done + '/' + Meta.ACH.length + '</div>';
      for (const a of Meta.ACH) {
        const ok = Meta.achDone(a.id), pr = !ok && a.prog ? a.prog(D) : null;
        const rw = a.reward.item ? '🎁 ' + nameOf(a.reward.item) : pearlImg() + '+' + a.reward.pearls;
        h += '<div class="dach' + (ok ? ' ok' : '') + '"><span class="dic">' + (ok ? a.ic : '❔') + '</span><span class="dtx"><b>' + a.name + '</b><br>' + a.desc +
          (pr ? ' <small>(' + Math.min(pr[0], pr[1]) + '/' + pr[1] + ')</small>' : '') + '</span><span class="drw">' + (ok ? '✅' : rw) + '</span></div>';
      }
    }
    $('decobody').innerHTML = h;
  }
  function clickItem(slot, skin) {
    const id = slot + '.' + skin, st = stateOf(slot, skin), it = table(slot)[skin];
    if (st === 'eq') { armed = null; say(it.name + ' — 이미 장착 중이야'); }
    else if (st === 'own') { armed = null; Meta.equip(slot, skin); applySlot(slot); SFX.select(); say(it.name + ' 장착!'); }
    else if (st === 'lock') { armed = null; SFX.deny(); say('🔒 ' + unlockText(id), true); }
    else if (Meta.pearls() < it.price) { armed = null; SFX.deny(); say('진주가 ' + (it.price - Meta.pearls()) + '개 부족해. 한 판 더 해볼까?', true); }
    else if (armed !== id) { armed = id; SFX.select(); say(it.name + ' — 한 번 더 누르면 진주 ' + it.price + '개로 구매'); }
    else {
      armed = null;
      if (Meta.buy(id, it.price)) { Meta.equip(slot, skin); applySlot(slot); fresh.add(id); SFX.ding(); say('🎉 ' + it.name + ' 구매 · 장착!'); }
    }
    render();
  }
  $('decobody').addEventListener('click', e => {
    const b = e.target.closest('.ditem'); if (b) clickItem(b.dataset.slot, b.dataset.skin);
  });
  $('decotabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    tab = b.dataset.tab; armed = null; $('decomsg').textContent = ''; render(); SFX.select();
    $('decobody').scrollTop = 0;
  });
  $('decoclose').addEventListener('click', close);
  $('decomodal').addEventListener('click', e => { if (e.target === $('decomodal')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && $('decomodal').classList.contains('open')) close(); });

  /* ---------- 타이틀 · 결과 화면 ---------- */
  function refreshTitle() { const el = $('titlepearls'); if (el) el.textContent = Meta.pearls(); }
  // 판이 끝났을 때 (game.js endGame): 정산 + 결과 카드에 표시
  function onRunEnd(grade, cause) {
    const rep = Meta.runEnd(grade, cause);
    rep.items.forEach(id => fresh.add(id));
    let h = '<div class="rwhead">' + pearlImg() + ' 진주 <b>+' + rep.pearls + '</b><small>보유 ' + Meta.pearls() + '</small></div>' +
      '<div class="rwparts">' + rep.parts.map(([l, n]) => l + ' +' + n).join(' · ') + '</div>';
    const gift = r => r.item ? '🎁 ' + nameOf(r.item) : pearlImg() + '+' + r.pearls;
    for (const a of rep.ach) h += '<div class="rwline">' + a.ic + ' 도감 달성: <b>' + a.name + '</b> → ' + gift(a.reward) + '</div>';
    for (const g of rep.gifts) h += '<div class="rwline">🦦 해달 우정 <b>Lv.' + g.level + '</b> → ' + gift(g) + '</div>';
    if (rep.items.length) h += '<div class="rwline rwhint">새 아이템은 🎨 꾸미기에서 장착할 수 있어!</div>';
    $('reward').innerHTML = h;
    const nb = rep.ach.length + rep.gifts.length;
    $('decobtn2').classList.toggle('glow', rep.items.length > 0 || canBuySomething());
    return nb;
  }
  function canBuySomething() {
    const p = Meta.pearls();
    for (const t of [SKINS, CHAR_SKINS, { hat: HATS }]) for (const slot of Object.keys(t)) for (const [k, it] of Object.entries(t[slot]))
      if (it.price && it.price <= p && !Meta.owns(slot + '.' + k)) return true;
    return false;
  }

  return { artSkin, charRules, recolor, legacyImg, portrait, init, open, close, onRunEnd, refreshTitle, SKINS, CHAR_SKINS };
})();

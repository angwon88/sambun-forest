/* ============ 삼분의숲 — meta ============
   판과 판 사이에 쌓이는 것: 진주(꾸미기 화폐) · 도감(업적) · 해달 우정도 · 가진/장착한 꾸미기.
   - 저장은 이 브라우저의 localStorage (기기·브라우저마다 따로). 못 쓰는 환경이면 이번 접속 동안만 기억.
   - 게임 규칙(S)은 읽기만 하고 바꾸지 않는다. Math.random도 쓰지 않는다 → 점수·랭킹에 영향 없음.
   보상 숫자를 바꾸고 싶으면 아래 GRADE_PEARL · ACH · FRIEND만 고치면 된다. */
'use strict';
const Meta = (() => {
  const KEY = 'sambun_meta_v1';
  const GRADE_PEARL = { S: 25, A: 18, B: 12, C: 8, D: 5, F: 3 };   // 등급별 기본 진주
  const GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1, F: 0 };
  const DAILY_BONUS = 10;                                            // 그날 첫 캠프 보너스
  const rankOf = g => (g in GRADE_RANK ? GRADE_RANK[g] : -1);
  const goodChars = d => CHARACTERS.filter(c => rankOf(d.stats.charBest[c.key]) >= GRADE_RANK.C).length;

  /* 도감: test(이번 판, 누적 기록) → 달성?  prog: 누적형이면 [현재, 목표]
     reward: {pearls: n} 또는 {item: '슬롯.스킨'} (아이템 이름은 js/deco.js의 SKINS) */
  const ACH = [
    { id: 'first', ic: '🏝️', name: '첫 상륙', desc: '첫 캠프를 마치기', test: () => true, reward: { pearls: 10 } },
    { id: 'grade_b', ic: '⛺', name: '그럴듯한 캠프', desc: 'B등급 이상 받기', test: r => rankOf(r.grade) >= GRADE_RANK.B, reward: { pearls: 15 } },
    { id: 'grade_s', ic: '🏆', name: '전설의 개척자', desc: 'S등급 받기', test: r => r.grade === 'S', reward: { item: 'tent.gold' } },
    { id: 'camp7', ic: '🏘️', name: '정착 완성', desc: '한 판에 건물 7종 모두 짓기', test: r => r.types >= 7, reward: { item: 'flag.crown' } },
    { id: 'nohit', ic: '🛡️', name: '무사 귀환', desc: '한 번도 다치지 않고 3분 버티기', test: r => r.cause === 'time' && !r.hit, reward: { pearls: 30 } },
    { id: 'combo10', ic: '⚡', name: '황금 오라', desc: '콤보 10 달성', test: r => r.maxCombo >= 10, reward: { item: 'fire.gold' } },
    { id: 'otter5', ic: '🦦', name: '해달의 단골', desc: '한 판에 부탁 5번 들어주기', test: r => r.otter >= 5, reward: { pearls: 25 } },
    { id: 'golden20', ic: '✨', name: '황금 손', desc: '황금 자원 누적 20번 채집', test: (r, d) => d.stats.golden >= 20, prog: d => [d.stats.golden, 20], reward: { item: 'monkey.gold' } },
    { id: 'score1k', ic: '⭐', name: '천 점 캠프', desc: '한 판에 1,000점', test: r => r.score >= 1000, reward: { pearls: 30 } },
    { id: 'storm10', ic: '⛈️', name: '폭풍 속 채집', desc: '한 판에 폭풍우 속에서 10번 채집', test: r => r.storm >= 10, reward: { pearls: 25 } },
    { id: 'runs10', ic: '🏡', name: '섬 주민', desc: '캠프 10번 마치기', test: (r, d) => d.runs >= 10, prog: d => [d.runs, 10], reward: { pearls: 30 } },
    { id: 'allchar', ic: '🤝', name: '네 친구', desc: '네 캐릭터 모두 C등급 이상', test: (r, d) => goodChars(d) >= 4, prog: d => [goodChars(d), 4], reward: { item: 'palm.lights' } },
  ];
  // 해달 우정도: 누적 부탁 수(흑기즈모의 까마귀 포함) → 단계별 선물
  const FRIEND = [
    { n: 3, item: 'flag.otter' },
    { n: 10, item: 'tent.otter' },
    { n: 20, item: 'shellart.pearl' },
    { n: 35, item: 'fire.pink' },
    { n: 55, pearls: 100 },
  ];

  /* ---------- 저장 ---------- */
  function fresh() {
    return { v: 1, pearls: 0, earned: 0, runs: 0, daily: '', friend: 0,
      stats: { otter: 0, golden: 0, builds: 0, best: 0, grades: {}, charBest: {} },
      ach: {}, owned: {}, equip: {} };
  }
  // 저장된 값은 믿지 않고 하나씩 검사해서 옮긴다 (고장 난 값이 있어도 게임은 돈다)
  function sanitize(o) {
    const d = fresh();
    if (!o || typeof o !== 'object') return d;
    const num = v => (typeof v === 'number' && isFinite(v) && v >= 0) ? Math.floor(v) : 0;
    const obj = v => (v && typeof v === 'object') ? v : {};
    d.pearls = num(o.pearls); d.earned = num(o.earned); d.runs = num(o.runs); d.friend = Math.min(FRIEND.length, num(o.friend));
    d.daily = typeof o.daily === 'string' ? o.daily.slice(0, 12) : '';
    const st = obj(o.stats);
    for (const k of ['otter', 'golden', 'builds', 'best']) d.stats[k] = num(st[k]);
    for (const g of Object.keys(GRADE_RANK)) d.stats.grades[g] = num(obj(st.grades)[g]);
    for (const c of CHARACTERS) { const g = obj(st.charBest)[c.key]; if (g in GRADE_RANK) d.stats.charBest[c.key] = g; }
    for (const k of Object.keys(obj(o.ach))) if (ACH.some(a => a.id === k)) d.ach[k] = 1;
    for (const k of Object.keys(obj(o.owned))) if (/^[a-z]+\.[a-z]+$/.test(k)) d.owned[k] = 1;
    for (const [k, v] of Object.entries(obj(o.equip))) if (/^[a-z]+$/.test(k) && typeof v === 'string' && /^[a-z]+$/.test(v)) d.equip[k] = v;
    return d;
  }
  function load() {
    try { const s = localStorage.getItem(KEY); if (s) return sanitize(JSON.parse(s)); } catch (e) {}
    return fresh();
  }
  let D = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }
  const localDay = () => { const t = new Date(); return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate(); };

  /* ---------- 이번 판 기록 (도감용) ---------- */
  let R = null;
  function runStart() { R = { golden: 0, storm: 0, maxCombo: 0, hit: false, lastHp: S ? S.hp : 3 }; }
  function track() {                          // 게임 중 매 프레임 (ui.js hudTick)
    if (!R || !S) return;
    if (S.combo > R.maxCombo) R.maxCombo = S.combo;
    if (S.hp < R.lastHp) R.hit = true;
    R.lastHp = S.hp;
  }
  function onHarvest(r) {                     // 채집 성공 순간 (game.js cmdSuccess)
    if (!R) return;
    if (r.golden) R.golden++;
    if (S.weather === 'storm') R.storm++;
  }

  /* ---------- 판이 끝났을 때: 진주·도감·우정도 정산 → 결과 화면용 보고서 ---------- */
  function grant(id, rep) { if (!D.owned[id]) { D.owned[id] = 1; rep.items.push(id); } }
  function runEnd(grade, cause) {
    if (!R) runStart();
    track();
    const ch = curChar();
    const run = { grade, cause, score: S.score, otter: S.otter.done, builds: S.buildings.length,
      types: new Set(S.buildings.map(b => b.type)).size, maxCombo: R.maxCombo, hit: R.hit || cause === 'death',
      golden: R.golden, storm: R.storm, char: ch.key };
    R = null;
    const rep = { pearls: 0, parts: [], ach: [], gifts: [], items: [] };
    const add = (n, label) => { if (n > 0) { rep.pearls += n; rep.parts.push([label, n]); } };
    add(GRADE_PEARL[grade] || 0, grade + '등급');
    add(Math.min(20, Math.floor(run.score / 100)), '점수');
    add(Math.min(20, run.otter * 2), (ch.key === 'dark' ? '까마귀' : '해달') + ' 부탁');
    const today = localDay();
    if (D.daily !== today) { D.daily = today; add(DAILY_BONUS, '오늘 첫 캠프'); }
    // 누적 기록
    D.runs++;
    D.stats.otter += run.otter; D.stats.golden += run.golden; D.stats.builds += run.builds;
    D.stats.best = Math.max(D.stats.best, run.score);
    D.stats.grades[grade] = (D.stats.grades[grade] || 0) + 1;
    if (rankOf(grade) > rankOf(D.stats.charBest[run.char])) D.stats.charBest[run.char] = grade;
    // 도감
    let achPearls = 0, giftPearls = 0;
    for (const a of ACH) if (!D.ach[a.id] && a.test(run, D)) {
      D.ach[a.id] = 1; rep.ach.push(a);
      achPearls += a.reward.pearls || 0;
      if (a.reward.item) grant(a.reward.item, rep);
    }
    add(achPearls, '도감');
    // 해달 우정도
    while (D.friend < FRIEND.length && D.stats.otter >= FRIEND[D.friend].n) {
      const f = FRIEND[D.friend]; D.friend++;
      rep.gifts.push(Object.assign({ level: D.friend }, f));
      giftPearls += f.pearls || 0;
      if (f.item) grant(f.item, rep);
    }
    add(giftPearls, '우정 선물');
    D.pearls += rep.pearls; D.earned += rep.pearls;
    save();
    return rep;
  }

  /* ---------- 가게·장착 ---------- */
  const owns = id => id.endsWith('.basic') || !!D.owned[id];
  function buy(id, price) {
    if (owns(id) || !(price > 0) || D.pearls < price) return false;
    D.pearls -= price; D.owned[id] = 1; save(); return true;
  }
  function equip(slot, skin) { if (skin === 'basic') delete D.equip[slot]; else D.equip[slot] = skin; save(); }
  const equipped = slot => D.equip[slot] || 'basic';
  const friendInfo = () => ({ level: D.friend, total: D.stats.otter, next: FRIEND[D.friend] || null, prev: D.friend ? FRIEND[D.friend - 1].n : 0 });

  return { ACH, FRIEND, GRADE_RANK, runStart, track, onHarvest, runEnd, owns, buy, equip, equipped, friendInfo,
    data: () => D, pearls: () => D.pearls, achDone: id => !!D.ach[id], save,
    _reset: () => { D = fresh(); save(); } };
})();

/* ============ 삼분의숲 — config ============
   상수·데이터 테이블 (자원, 건물, 캐릭터) */
'use strict';
const TS=36, MW=20, MH=15, GAME_LEN=180;
const $=id=>document.getElementById(id);

const RES_DEFS={
  tree :{give:'wood', base:2, zone:'grass', cmd:3, pts:5},
  rock :{give:'stone',base:2, zone:'grass', cmd:3, pts:5},
  fruit:{give:'fruit',base:2, zone:'grass', cmd:2, pts:3},
  shell:{give:'shell',base:2, zone:'shore', cmd:2, pts:3},
};
const RES_EMOJI={wood:'🪵',stone:'🪨',fruit:'🍎',shell:'🐚'};
const BUILDS=[
  {key:'tent',  name:'텐트',   ic:'⛺', cost:{wood:4,stone:2,shell:1}, pts:40, fx:'커맨드 1키 짧아짐'},
  {key:'fire',  name:'모닥불', ic:'🔥', cost:{wood:3,stone:2},        pts:25, fx:'자원 리스폰 빨라짐'},
  {key:'fence', name:'울타리', ic:'🚧', cost:{wood:3,stone:2},        pts:20, fx:'밀물이 조금 늦게 들어옴'},
  {key:'flower',name:'화단',   ic:'🌼', cost:{fruit:4,shell:1},       pts:25, fx:'콤보 지속 +1초'},
  {key:'palm',  name:'야자수', ic:'🌴', cost:{wood:3,fruit:3},        pts:30, fx:'나무·과일 더 자주 등장'},
  {key:'shellart',name:'조개탑',ic:'🐚',cost:{shell:5,stone:1},       pts:35, fx:'황금자원 확률 ↑'},
  {key:'flag',  name:'깃발',   ic:'🚩', cost:{wood:2,stone:2,fruit:1,shell:1}, pts:45, fx:'모든 채집 점수 +15%'},
];
const DIRS=['up','right','down','left'];
const ARROW={up:'↑',right:'→',down:'↓',left:'←'};
// 지어진 건물 종류 집합 헬퍼
function hasBuild(key){return S.buildings.some(b=>b.type===key);}
const ringOf=(x,y)=>Math.min(x,y,MW-1-x,MH-1-y);
function tileType(x,y){const r=ringOf(x,y);return r<=0?0:(r<=2?1:2);}

const CHARACTERS=[
  {key:'gizmo', name:'기즈모', desc:'순수한 털뭉치',
   accent:'#f2c088', accentDim:'#d89a5a',
   speed:1.0, cmdMod:-1, tideBonus:0, scoreMul:1.0, otterOk:true,
   res2x:[], rainMul:1.0, randomMul:false,
   special:'채집 커맨드 1키 짧음 (쉬움)',
   failMsg:['앗, 놓쳤다…','우웅…'], overMsg:'으아…', deliverMsg:['고마워!','기뻐!']},
  {key:'monkey', name:'빨간 원숭이', desc:'날쌘 숲의 채집꾼',
   accent:'#e5473b', accentDim:'#b5342a',
   speed:1.15, cmdMod:0, tideBonus:0, scoreMul:1.0, otterOk:true,
   res2x:['wood','fruit'], rainMul:1.0, randomMul:false,
   special:'나무·과일 채집 2배 · 이동 빠름',
   failMsg:['바나나가 아니잖아!','우끼끼…'], overMsg:'꺅!', deliverMsg:['우끼!','좋아좋아!']},
  {key:'frog', name:'발광 개구리', desc:'후반형 · 물의 지배자',
   accent:'#6ee04c', accentDim:'#4caf2c',
   speed:1.0, cmdMod:0, tideBonus:1.0, scoreMul:1.0, otterOk:true,
   res2x:['shell'], rainMul:1.5, randomMul:false, waterFree:true,
   special:'물에서 피해 없음 · 물 위 이동 2배 · 조개 2배 · 비 올 때 1.5배',
   failMsg:['손이 미끄러워…','개굴…'], overMsg:'꿀꺽…', deliverMsg:['개굴!','고마워개굴!']},
  {key:'dark', name:'흑기즈모', desc:'사악한 도박꾼 천재',
   accent:'#8a5ad8', accentDim:'#6a3ab8',
   speed:1.0, cmdMod:0, tideBonus:0, scoreMul:1.0, otterOk:true,
   res2x:[], rainMul:1.0, randomMul:true,
   special:'채집 랜덤 배율 x1~x3 · 까마귀가 찾아옴 🐦‍⬛',
   failMsg:['흥, 내 능력 밖이군','쯧…'], overMsg:'...치', deliverMsg:['...흥','까악']},
];

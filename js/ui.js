/* ============ 삼분의숲 — ui ============
   HUD·화면 전환·캐릭터 선택 */
'use strict';
/* ---------- HUD ---------- */
// 건설바: 픽셀 건물 아이콘 + 비용(미니 아이콘). ART가 만들어진 뒤 main.js에서 호출
function buildBuildBar(){
  const bar=$('buildbar'); bar.innerHTML='';
  BUILDS.forEach((b,i)=>{
    const d=document.createElement('div');
    d.className='slot'; d.id='slot'+i; d.title=b.name+' — '+b.fx;
    d.innerHTML='<div class="key">'+(i+1)+'</div><img class="ic" src="'+iconURL(b.key,'bicon')+'" alt="'+b.name+'"><div class="cost">'+costStr(b.cost)+'</div><div class="done">✓</div>';
    d.addEventListener('pointerdown',e=>{e.preventDefault();selectBuild(i);});
    bar.appendChild(d);
  });
}
function costStr(c){return Object.entries(c).map(([k,v])=>'<span class="cc"><img src="'+iconURL(k,'mini')+'" alt="">'+v+'</span>').join('');}
// data-icon 이미지들에 픽셀 아이콘 채우기
function fillIcons(){ document.querySelectorAll('img[data-icon]').forEach(el=>{ el.src=iconURL(el.dataset.icon); }); }
function canAfford(c){return Object.entries(c).every(([k,v])=>S.inv[k]>=v);}
function selectBuild(i){ if(!running||S.cmd)return; S.sel=(S.sel===i)?-1:i; SFX.select(); updateHUD(); }
function updateHUD(){
  for(const k of ['wood','stone','fruit','shell'])
    $('r-'+k).querySelector('span').textContent=S.inv[k];
  $('scoretxt').textContent=S.score;
  BUILDS.forEach((b,i)=>{
    const el=$('slot'+i); if(!el)return;
    const built=hasBuild(b.key);
    el.classList.toggle('sel',S.sel===i);
    el.classList.toggle('no',!canAfford(b.cost) || built);
    el.classList.toggle('built',built);
  });
}
function renderHearts(){
  if(!ART.ready){return;}
  let h='';
  for(let i=0;i<S.maxhp;i++){
    if(i<S.hp) h+='<img src="'+iconURL(i>=3?'heartGold':'heart')+'" alt="♥">';
    else if(i<3) h+='<img src="'+iconURL('heartEmpty')+'" alt="♡">';
  }
  $('hearts').innerHTML=h;
}
function heartPulse(){const el=$('hearts');el.classList.remove('hpop');void el.offsetWidth;el.classList.add('hpop');}
function bumpRes(k){const el=$('r-'+k);el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}
// 매 프레임 HUD (낮/밤 게이지, 콤보 지속 막대, 마지막 30초 경고)
let _dayIcon='';
function hudTick(){
  if(!S||S.demo)return;
  try{Meta.track();}catch(e){}                // 도감용 기록 (최고 콤보·피격 여부)
  const ph=Math.min(1,S.t/GAME_LEN);
  $('daybar').firstElementChild.style.width=((1-ph)*100).toFixed(2)+'%';
  const ic=ph>0.86?'moon':'sun';
  if(ic!==_dayIcon){_dayIcon=ic;$('dayicon').src=iconURL(ic);}
  $('timerwrap').classList.toggle('danger',GAME_LEN-S.t<=30);
  // 캐릭터가 HUD 뒤로 가면 HUD를 반투명하게
  $('buildbar').classList.toggle('ghost',S.py>446&&Math.abs(S.px-360)<215);
  $('hud').classList.toggle('fadetop',S.py<100);
  const cb=$('combobar');
  if(S.combo>=2&&S.comboT>0){
    const dur=hasBuild('flower')?6:5;
    cb.style.opacity=1; cb.firstElementChild.style.width=Math.max(0,Math.min(1,S.comboT/dur))*100+'%';
    cb.className=S.combo>=10?'gold':(S.combo>=5?'blue':'');
  } else cb.style.opacity=0;
}

/* ---------- 인트로 스토리 ---------- */
const STORY_LINES=[
  '우리가 살던 섬이, 오늘 밤 사라진대.',
  '',
  '마지막 3분.',
  '이 섬에서 보낸 시간을 캠프에 남기자.',
  '물이 다 차오르기 전에.'
];
let storyTimer=null, storyDone=false;
function showStory(){
  audio();
  $('title').style.display='none';
  $('intro').style.display='flex';
  $('introtext').textContent='';
  $('introhint').textContent=isTouch?'화면을 터치하세요':'아무 키나 누르세요';
  storyDone=false;
  const full=STORY_LINES.join('\n');
  let i=0;
  const step=()=>{
    if(i>=full.length){ finishStoryTyping(); return; }
    const ch=full[i++];
    $('introtext').textContent+=ch;
    if(ch!==' '&&ch!=='\n'&&i%2===0)SFX.type&&SFX.type();
    // 문장 끝에서는 살짝 쉬어간다
    const delay = (ch==='.'||ch==='!') ? 260 : (ch==='\n' ? 190 : 42);
    storyTimer=setTimeout(step,delay);
  };
  step();
}
function finishStoryTyping(){
  if(storyTimer){clearTimeout(storyTimer);storyTimer=null;}
  $('introtext').textContent=STORY_LINES.join('\n');
  storyDone=true;
  $('introhint').textContent=isTouch?'▶ 터치해서 시작':'▶ 아무 키나 눌러 시작';
}
function storyAdvance(){
  if(!storyDone){ finishStoryTyping(); SFX.select(); return; }
  $('intro').style.display='none';
  start();
}
function start(){
  audio(); newGame(); Meta.runStart();
  $('rankmodal').classList.remove('open'); Deco.close();
  $('tidewarn').style.opacity=0; $('tidewarn').classList.remove('urgent');
  $('title').style.display='none'; $('result').style.display='none'; $('hud').style.display='block';
  applyCharTheme();
  running=true; lastT=0; SFX.ding(); startBGM();
}
function goHome(){
  running=false; stopBGM();
  if(storyTimer){clearTimeout(storyTimer);storyTimer=null;}
  $('intro').style.display='none';
  $('result').style.display='none'; $('hud').style.display='none';
  $('tidewarn').style.opacity=0; $('tidewarn').classList.remove('urgent');
  document.documentElement.style.setProperty('--sun','#ffb04d');   // reset accent
  buildCharSelect(); showCharInfo(); Deco.refreshTitle();
  setupDemo();                                                      // 타이틀 뒤 섬 다시 띄우기
  $('title').style.display='flex';
  SFX.select();
}

/* ---------- character selector ---------- */
function buildCharSelect(){
  const row=$('charrow'); row.innerHTML='';
  CHARACTERS.forEach((c,i)=>{
    const d=document.createElement('div');
    d.className='charopt'+(i===selectedChar?' sel':'');
    d.innerHTML='<img src="'+Deco.portrait(c.key)+'" alt="'+c.name+'">';   // 꾸미기 색 반영
    d.addEventListener('pointerdown',e=>{e.preventDefault();selectedChar=i;setChar(i);buildCharSelect();showCharInfo();SFX.select();});
    row.appendChild(d);
  });
}
function showCharInfo(){
  const c=curChar();
  $('charinfo').innerHTML='<b>'+c.name+'</b> · '+c.desc+'<br>✨ '+c.special;
}
function setChar(i){ try{localStorage.setItem('sambun_char',i);}catch(e){} }
function applyCharTheme(){
  const c=curChar();
  document.documentElement.style.setProperty('--sun', c.accent);
}

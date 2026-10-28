/* ============ 삼분의숲 — game ============
   게임 상태·규칙·업데이트 (점수 로직 포함) */
'use strict';
/* ---------- state ---------- */
let S=null, running=false, lastT=0, shakeT=0, isTouch=('ontouchstart' in window);
if(isTouch)document.body.classList.add('touch');
const CHAR_IMGS={};
let charsLoaded=0;
function loadSprites(cb){
  const keys=Object.keys(SPRITE_DATA);
  keys.forEach(k=>{
    const img=new Image();
    img.onload=()=>{charsLoaded++; if(charsLoaded>=keys.length&&cb)cb();};
    img.onerror=()=>{charsLoaded++; if(charsLoaded>=keys.length&&cb)cb();};
    img.src=SPRITE_DATA[k];
    CHAR_IMGS[k]=img;
  });
}
let selectedChar=0;
function curChar(){return CHARACTERS[selectedChar];}

function newGame(){
  S={
    t:0, over:false,
    px:MW*TS/2, py:MH*TS/2, dir:2, walk:0, moving:false,
    inv:{wood:0,stone:0,fruit:0,shell:0},
    score:0, combo:0, comboT:0, comboBonus:0,
    hp:3, maxhp:5, invuln:0, hitFlash:0,
    resources:[], buildings:[], particles:[], floats:[],
    warned:false, warned2:false, floodTime:{}, tideDir:{x:0,y:0},
    sel:-1, cmd:null, completeBonus:false,
    otterBuff:null, speedBuffT:0, cmdTimeBonus:0, failShield:0,
    lightnings:[], ghosts:[],
    nextBolt:8+Math.random()*6, nextGhost:14+Math.random()*8,
    weather:'clear', weatherT:0, nextWeather:20+Math.random()*15, tideGrace:0,
    otter:{tx:10,ty:12,gone:false,leaving:0,mood:'',moodT:0,req:null,reqT:4,done:0},
    keys:{}, joy:{x:0,y:0}, actQ:false,
  };
  buildTideField();
  for(let i=0;i<6;i++)spawnRes('tree');
  for(let i=0;i<5;i++)spawnRes('rock');
  for(let i=0;i<5;i++)spawnRes('fruit');
  for(let i=0;i<7;i++)spawnRes('shell');
  updateHUD(); renderHearts();
  onNewGameVisuals();                       // 그래픽: 지형/밀물·효과 초기화
}

function buildTideField(){
  const wx=(Math.random()*2-1), wy=(Math.random()*2-1);
  const norm=Math.hypot(wx,wy)||1; const dirx=wx/norm, diry=wy/norm;
  S.tideDir={x:dirx,y:diry};
  // flooding is compressed into the final phase so the player has room until near the end.
  // outer rings (1) flood around t=128, and it eats inward, finishing ~t=176.
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    const r=ringOf(x,y);
    if(r<=0){S.floodTime[x+','+y]=0;continue;}
    // ring 1 floods ~128s, each inner ring ~9s later → ring5 ~164, ring6 ~173
    let base=119+r*9;
    const cx=x-(MW-1)/2, cy=y-(MH-1)/2;
    const proj=cx*dirx+cy*diry;
    base-=proj*2.4;                 // directional bias (which side comes first)
    base+=(Math.random()*2-1)*4;    // small jitter
    S.floodTime[x+','+y]=base;      // NOTHING is permanently safe now — fully submerges by end
  }
}
const isFlooded=(x,y)=>(S.tideClock||S.t)>=S.floodTime[x+','+y];
const willFloodSoon=(x,y)=>{const f=S.floodTime[x+','+y];const tc=(S.tideClock||S.t);return !isFlooded(x,y) && f-tc<=3.5;};

function freeTile(x,y,zone){
  const tt=tileType(x,y);
  if(zone==='grass'&&tt!==2)return false;
  if(zone==='sand'&&tt!==1)return false;
  if(zone==='shore'&&tt!==1&&tt!==2)return false;   // 조개: 모래·잔디 모두 가능
  // 조개는 물에 잠긴 타일에도 생성된다 (바다 생물)
  if(isFlooded(x,y)&&zone!=='shore')return false;
  if(!isFlooded(x,y)&&S.floodTime[x+','+y]<132&&zone!=='shore')return false;
  if(Math.abs(x*TS+18-S.px)<40&&Math.abs(y*TS+18-S.py)<40)return false;
  if(x===S.otter.tx&&y===S.otter.ty)return false;
  if(S.resources.some(r=>r.x===x&&r.y===y))return false;
  if(S.buildings.some(b=>b.x===x&&b.y===y))return false;
  return true;
}
function spawnRes(type){
  const zone=RES_DEFS[type].zone;
  for(let tries=0;tries<80;tries++){
    const x=1+Math.floor(Math.random()*(MW-2)), y=1+Math.floor(Math.random()*(MH-2));
    if(freeTile(x,y,zone)){
      let gchance=0.08;
      if(S&&S.buildings){ if(hasBuild('shellart'))gchance+=0.07; if(S.completeBonus)gchance+=0.15; }
      S.resources.push({type,x,y,bob:Math.random()*6,cool:0,golden:Math.random()<gchance});return;
    }
  }
}

function floatText(x,y,txt,col='#ffd94d'){S.floats.push({x,y,txt,col,t:0});}
// burst()는 js/fx.js로 이동 (그래픽 전용)

/* ---------- damage / heal ---------- */
function damage(reason){
  if(S.invuln>0||S.over)return;
  S.hp--; S.invuln=1.4; S.hitFlash=.4; shakeT=.3;
  SFX.hurt(); renderHearts(); heartPulse();
  floatText(S.px,S.py-24,'-1 ❤️','#ff5d47');
  if(S.hp<=0)endGame('death');
}
function heal(){
  if(S.hp>=S.maxhp){S.score+=20;floatText(S.otter.tx*TS+18,S.otter.ty*TS-6,'+20⭐ (만렙!)','#ffd94d');return;}
  S.hp++; SFX.heal(); renderHearts(); heartPulse();
  floatText(S.otter.tx*TS+18,S.otter.ty*TS-6,'+1 ❤️','#ff6f8f');
}

/* ---------- command minigame ---------- */
function startCmd(res){
  const def=RES_DEFS[res.type];
  let len=Math.max(1, def.cmd + (S.t>=120?1:0) + curChar().cmdMod + (hasBuild('tent')?-1:0));
  const seq=[]; for(let i=0;i<len;i++)seq.push(DIRS[Math.floor(Math.random()*4)]);
  const cmdT = 1.5 + (S.cmdTimeBonus||0);
  S.cmd={res, seq, idx:0, time:cmdT, max:cmdT};
  S.sel=-1; updateHUD();
  $('cmdbox').style.display='block';
  $('cmdlbl').innerHTML='<img class="pi" src="'+iconURL(def.give)+'" alt=""> 채집! 순서대로 입력';
  const kd=$('cmdkeys'); kd.innerHTML='';
  seq.forEach((d,i)=>{const el=document.createElement('div');el.className='k'+(i===0?' now':'');el.textContent=ARROW[d];kd.appendChild(el);});
  $('cmdtime').firstElementChild.style.width='100%';
  if(isTouch)$('cmdpad').classList.add('on');
}
function cmdPress(d){
  const c=S.cmd; if(!c)return;
  if(d===c.seq[c.idx]){
    const el=$('cmdkeys').children[c.idx];
    el.classList.remove('now');el.classList.add('hit');
    c.idx++; SFX.key(); fxCmdHit(c.res);
    if(c.idx<c.seq.length)$('cmdkeys').children[c.idx].classList.add('now');
    if(c.idx>=c.seq.length)cmdSuccess();
  }else{ cmdFail(); }
}
function endCmdUI(){$('cmdbox').style.display='none';$('cmdpad').classList.remove('on');}
function cmdSuccess(){
  const r=S.cmd.res, def=RES_DEFS[r.type];
  const ch=curChar();
  const golden=r.golden;
  let amt=def.base+(S.combo>=3?1:0);
  if(golden)amt*=3;
  S.inv[def.give]+=amt;
  fxHarvest(r);                                        // 그래픽: 채집 연출
  try{Meta.onHarvest(r);}catch(e){}                    // 기록: 황금·폭풍 채집 수 (도감용, 점수 무관)
  const ri=S.resources.indexOf(r); if(ri>=0)S.resources.splice(ri,1);
  const respawnDelay = hasBuild('fire') ? (2500+Math.random()*2500) : (5000+Math.random()*5000);
  setTimeout(()=>{if(S&&!S.over)spawnRes(r.type);},respawnDelay);
  const comboDur = hasBuild('flower') ? 6 : 5;
  S.combo=(S.comboT>0)?S.combo+1:1; S.comboT=comboDur;
  const COMBO_CAP=10;                                  // 배수는 10회에서 상한
  const effCombo=Math.min(S.combo,COMBO_CAP);
  const basePts=def.pts||3;                            // 3키 자원(나무·돌)은 5점, 2키는 3점
  let bonus=basePts;
  if(S.combo>=2){
    bonus=basePts*effCombo; S.comboBonus+=bonus-basePts;
    const capMark=S.combo>COMBO_CAP?' MAX!':'';
    $('combo').textContent='콤보 x'+effCombo+capMark;
    $('combo').style.opacity=1;
    $('combo').style.color = effCombo>=COMBO_CAP ? '#ffd700' : (effCombo>=5 ? '#6ec8ff' : '');
  }
  if(golden)bonus*=3;
  // ----- character multipliers -----
  let mul=1, tags=[];
  if(ch.res2x.includes(def.give)){mul*=2; tags.push('x2');}          // 원숭이 나무·과일 / 개구리 조개
  if(ch.rainMul>1 && S.weather==='storm'){mul*=ch.rainMul; tags.push('☔x'+ch.rainMul);}  // 개구리 비
  if(ch.randomMul){
    // 흑기즈모: 해달 버프가 있으면 x3 확정, 없으면 랜덤 x1~x3
    if(S.otterBuff==='darkLucky'){ mul*=3; tags.push('🎲x3 확정!'); S.otterBuff=null; updateBuffUI(); }
    else { const rnd=1+Math.random()*2; mul*=rnd; tags.push('🎲x'+rnd.toFixed(1)); }
  }
  if(hasBuild('flag')){mul*=1.15; tags.push('🚩+15%');} // 깃발 효과
  const gained=Math.round(bonus*mul);
  S.score+=gained;
  const cols={tree:['#3f8f4f','#6abf5e'],rock:['#9a9a9a','#c4c4c4'],fruit:['#e5473b','#ffd94d'],shell:['#f2a9c4','#ffe6ee']};
  burst(r.x*TS+18,r.y*TS+18, golden?['#ffd700','#fff3a0','#ffb800']:cols[r.type], golden?16:8);
  const tagStr=tags.length?' '+tags.join(' '):'';
  floatText(r.x*TS+18,r.y*TS, (golden?'✨황금! ':'')+'+'+amt+' '+RES_EMOJI[def.give]+tagStr, golden?'#ffd700':(tags.length?ch.accent:'#ffd94d'));
  bumpRes(def.give); if(golden)SFX.ding(); else SFX.harvest(); shakeT=Math.max(shakeT, golden?.18:.08);
  S.cmd=null; endCmdUI(); updateHUD();
}
const FAIL_MSG={tree:'벌에 쏘였다…🐝',rock:'돌에 발을 찧었다…',fruit:'가시에 찔렸다…🌵',shell:'손이 미끄러졌다…'};
function cmdFail(){
  const r=S.cmd.res;
  r.cool=0.8; SFX.fail(); shakeT=.15; fxCmdFail(r);
  // 🛡️ 보호막이 있으면 생명·콤보 유지하고 보호막 1개 소모
  if(S.failShield>0){
    S.failShield--;
    floatText(r.x*TS+18,r.y*TS,'🛡️ 보호막! (남은 '+S.failShield+'개)','#8fd8ff');
    S.cmd=null; endCmdUI(); updateBuffUI();
    return;
  }
  const cf=curChar().failMsg;
  const msg = Math.random()<0.5 ? (FAIL_MSG[r.type]||'실패!') : cf[Math.floor(Math.random()*cf.length)];
  floatText(r.x*TS+18,r.y*TS,msg,'#ff8877');
  S.combo=0;S.comboT=0;$('combo').style.opacity=0;$('combo').style.color='';
  S.cmd=null; endCmdUI();
  damage('cmdfail');
}

/* ---------- actions ---------- */
function facingTile(){const d=[[0,-1],[1,0],[0,1],[-1,0]][S.dir];return {x:Math.floor(S.px/TS)+d[0],y:Math.floor(S.py/TS)+d[1]};}
function doAction(){
  if(S.cmd)return;
  let best=null,bd=40;
  for(const r of S.resources){ if(r.cool>0)continue;
    const d=Math.hypot(r.x*TS+18-S.px,r.y*TS+18-S.py); if(d<bd){bd=d;best=r;} }
  if(best){startCmd(best);return;}
  const o=S.otter;
  if(!o.gone&&!o.leaving&&o.req&&Math.hypot(o.tx*TS+18-S.px,o.ty*TS+18-S.py)<54){
    if(S.inv[o.req.type]>=o.req.n)deliver(); else{SFX.deny();o.mood='💦';o.moodT=1.2;}
    return;
  }
  if(S.sel>=0){tryBuild();return;}
  SFX.deny();
}
function tryBuild(){
  const b=BUILDS[S.sel], t=facingTile();
  if(hasBuild(b.key)){SFX.deny();floatText(S.px,S.py-20,'이미 지었어!','#ff8877');return;}
  if(!canAfford(b.cost)){SFX.deny();floatText(S.px,S.py-20,'자원 부족!','#ff8877');return;}
  if(!placeable(t.x,t.y)){SFX.deny();floatText(S.px,S.py-20,'안쪽 안전지대에만!','#ff8877');return;}
  for(const[k,v]of Object.entries(b.cost))S.inv[k]-=v;
  S.buildings.push({type:b.key,x:t.x,y:t.y,anim:0});
  S.score+=Math.round(b.pts*curChar().scoreMul);
  burst(t.x*TS+18,t.y*TS+18,['#d8c49a','#b5a077'],10);
  floatText(t.x*TS+18,t.y*TS,'+'+b.pts+'⭐ '+b.fx,'#ffd94d'); SFX.build(); shakeT=Math.max(shakeT,.1);
  S.sel=-1;
  // 7종 완성 보너스
  if(S.buildings.length>=7 && !S.completeBonus){
    S.completeBonus=true; S.score+=200;
    floatText(S.px,S.py-30,'🏝️ 정착 완성! +200 & 황금자원 급증!','#ffd700');
    SFX.ding(); shakeT=.35;
    for(let i=0;i<24;i++)burst(S.px,S.py,['#ffd700','#fff3a0'],1);
  }
  updateHUD();
}
function placeable(x,y){
  if(x<0||y<0||x>=MW||y>=MH)return false;
  // 건물은 밀물이 닿지 않는 안쪽 잔디(타입 2)에만 지을 수 있다
  if(tileType(x,y)!==2)return false;
  if(isFlooded(x,y))return false;
  if(S.resources.some(r=>r.x===x&&r.y===y))return false;
  if(S.buildings.some(b=>b.x===x&&b.y===y))return false;
  if(x===S.otter.tx&&y===S.otter.ty)return false;
  return true;
}
function newRequest(){
  if(!curChar().otterOk){S.otter.req=null;S.otter.reqT=99;S.otter.mood='😱';S.otter.moodT=1.5;return;}
  const t=['wood','stone','fruit','shell'];S.otter.req={type:t[Math.floor(Math.random()*4)],n:2+Math.floor(Math.random()*3)};
}
function deliver(){
  const o=S.otter, ch=curChar();
  S.inv[o.req.type]-=o.req.n; o.done++; S.score+=Math.round(30*ch.scoreMul);
  const dm=ch.deliverMsg; o.mood='❤️'; o.moodT=2;
  floatText(o.tx*TS+18,o.ty*TS-6,'+30⭐ '+dm[Math.floor(Math.random()*dm.length)],'#ff9ad5');
  burst(o.tx*TS+18,o.ty*TS+8,['#ff9ad5','#ffd94d'],12); fxDeliver(o);
  SFX.ding(); heal();
  applyOtterBuff(ch);                       // 캐릭터별 해달 버프
  o.req=null; o.reqT=7+Math.random()*4; updateHUD();
}
/* ---------- 해달 버프 (캐릭터별) ---------- */
function applyOtterBuff(ch){
  const px=S.px, py=S.py-34;
  if(ch.key==='gizmo'){
    S.cmdTimeBonus=(S.cmdTimeBonus||0)+0.5;      // 커맨드 제한시간 +0.5초 (누적)
    S.failShield=(S.failShield||0)+1;            // 실패 보호막 +1 (누적)
    floatText(px,py,'⏱️ +0.5초 · 🛡️ 보호막 +1!','#f2c088');
    S.otterBuff='gizmoTime';
  } else if(ch.key==='monkey'){
    S.speedBuffT=10;                              // 10초간 이동속도 2배
    floatText(px,py,'💨 이동속도 2배! (10초)','#e5473b');
    S.otterBuff='monkeySpeed';
  } else if(ch.key==='frog'){
    S.weather='storm'; S.weatherT=15;             // 폭풍우 15초 즉시 발동
    $('tidewarn').textContent='⛈️ 개구리의 비! (15초)';
    $('tidewarn').classList.add('urgent'); $('tidewarn').style.opacity=1;
    setTimeout(()=>{$('tidewarn').style.opacity=0;},2500);
    floatText(px,py,'☔ 폭풍우 소환! (15초)','#6ee04c');
    S.otterBuff='frogRain';
  } else if(ch.key==='dark'){
    S.otterBuff='darkLucky';                      // 다음 채집 x3 확정
    floatText(px,py,'🎲 다음 채집 x3 확정!','#8a5ad8');
  }
  updateBuffUI();
  SFX.select(); shakeT=Math.max(shakeT,.15);
}
function updateBuffUI(){
  const el=$('buffbar'); if(!el)return;
  const parts=[];
  if(S.failShield>0) parts.push('🛡️×'+S.failShield);
  if(S.cmdTimeBonus>0) parts.push('⏱️+'+S.cmdTimeBonus.toFixed(1)+'s');
  if(S.speedBuffT>0) parts.push('💨'+S.speedBuffT.toFixed(1)+'s');
  if(S.otterBuff==='darkLucky') parts.push('🎲x3');
  const txt=parts.join('  ');
  el.textContent=txt;
  el.style.opacity=txt?1:0;
}

/* ---------- hazards ---------- */
function spawnBolt(){
  let x,y,tries=0;
  do{ x=1+Math.floor(Math.random()*(MW-2)); y=1+Math.floor(Math.random()*(MH-2)); tries++; }
  while(isFlooded(x,y)&&tries<20);
  S.lightnings.push({x,y,warn:1.3,struck:0});
  SFX.warn();
}
function spawnGhost(){
  const horiz=Math.random()<.5; let g;
  if(horiz){const fromLeft=Math.random()<.5; const y=1+Math.random()*(MH-2);
    g={x:fromLeft?-1:MW, y, vx:(fromLeft?1:-1)*(5+Math.random()*2), vy:0, warn:1.0};}
  else{const fromTop=Math.random()<.5; const x=1+Math.random()*(MW-2);
    g={x, y:fromTop?-1:MH, vx:0, vy:(fromTop?1:-1)*(5+Math.random()*2), warn:1.0};}
  S.ghosts.push(g); SFX.ghost();
}

/* ---------- update ---------- */
function update(dt){
  S.t+=dt;
  S.tideClock=(S.tideClock||0)+dt*(S.weather==='storm'?1.8:1)*(hasBuild('fence')?0.8:1);
  const remain=Math.max(0,GAME_LEN-S.t);
  const m=Math.floor(remain/60), sec=Math.floor(remain%60);
  const tEl=$('timer'); tEl.textContent=m+':'+String(sec).padStart(2,'0');
  tEl.classList.toggle('danger',remain<=30);
  if(remain<=10&&Math.floor(remain)!==Math.floor(remain+dt))SFX.tick();

  if(S.invuln>0)S.invuln-=dt;
  if(S.hitFlash>0)S.hitFlash-=dt;

  if(S.cmd){
    S.cmd.time-=dt;
    $('cmdtime').firstElementChild.style.width=Math.max(0,S.cmd.time/S.cmd.max*100)+'%';
    if(S.cmd.time<=0)cmdFail();
  }

  for(const r of S.resources)if(r.cool>0)r.cool-=dt;

  // first warning when tide begins (~t=124)
  if(!S.warned&&S.t>=124){S.warned=true;$('tidewarn').textContent='🌊 밀물이 밀려오기 시작한다!';$('tidewarn').style.opacity=1;SFX.warn();setTimeout(()=>$('tidewarn').style.opacity=0,3500);}
  // final warning when the island is almost gone (~t=160)
  if(!S.warned2&&S.t>=160){S.warned2=true;$('tidewarn').textContent='⚠️ 곧 밀물이 가득 찹니다!';$('tidewarn').classList.add('urgent');$('tidewarn').style.opacity=1;SFX.warn();setTimeout(()=>SFX.warn(),400);}
  if(S.warned2&&S.t<178)$('tidewarn').style.opacity=(0.5+0.5*Math.abs(Math.sin(S.t*4)));
  if(S.t>=124){
    // 건물은 안전지대(안쪽 잔디)에만 지을 수 있으므로 침수 페널티 없음.
    // 마지막에 섬이 잠겨도 지어둔 캠프는 기록으로 남는다.
    // 조개는 바다 생물 — 물에 잠겨도 남는다 (개구리 후반 영역)
    S.resources=S.resources.filter(r=>r.type==='shell'||!isFlooded(r.x,r.y));
    if(!S.otter.gone&&!S.otter.leaving&&isFlooded(S.otter.tx,S.otter.ty))S.otter.leaving=.001;
  }

  // weather events
  if(S.weatherT>0){S.weatherT-=dt; if(S.weatherT<=0){S.weather='clear';$('tidewarn').classList.remove('urgent');}}
  else if(S.t>20&&S.t<150){
    S.nextWeather-=dt;
    if(S.nextWeather<=0){
      if(Math.random()<0.5){S.weather='storm';S.weatherT=12;SFX.warn();
        $('tidewarn').textContent='⛈️ 폭풍우! 밀물이 빨라진다';$('tidewarn').classList.add('urgent');$('tidewarn').style.opacity=1;
        setTimeout(()=>{if(S&&S.weather!=='storm')return;$('tidewarn').style.opacity=0;},3000);}
      else{S.weather='sunny';S.weatherT=12;
        $('tidewarn').textContent='☀️ 맑음! 자원이 빨리 자란다';$('tidewarn').style.opacity=1;
        setTimeout(()=>{$('tidewarn').style.opacity=0;},3000);}
      S.nextWeather=25+Math.random()*15;
    }
  }
  const stormMul=S.weather==='storm'?1.8:1;
  // sunny: occasionally spawn a bonus resource
  if(S.weather==='sunny'){
    S.sunnySpawn=(S.sunnySpawn||0)+dt;
    if(S.sunnySpawn>=1.5){S.sunnySpawn=0;
      const types=['tree','rock','fruit','shell'];
      if(S.resources.length<28)spawnRes(types[Math.floor(Math.random()*4)]);
    }
  }
  // palm(야자수): 나무·과일을 주기적으로 추가 스폰
  if(hasBuild('palm')){
    S.palmSpawn=(S.palmSpawn||0)+dt;
    if(S.palmSpawn>=3){S.palmSpawn=0;
      if(S.resources.length<28)spawnRes(Math.random()<0.5?'tree':'fruit');
    }
  }

  if(S.t>25){
    S.nextBolt-=dt;
    if(S.nextBolt<=0){spawnBolt(); const freq=(S.t>120?3.5:S.t>60?5:7)/(S.weather==='storm'?1.8:1); S.nextBolt=freq+Math.random()*freq;}
    S.nextGhost-=dt;
    if(S.nextGhost<=0){spawnGhost(); const freq=S.t>120?6:S.t>60?9:13; S.nextGhost=freq+Math.random()*freq;}
  }
  for(const L of S.lightnings){
    if(L.warn>0){L.warn-=dt; if(L.warn<=0){L.struck=.35;SFX.thunder();SFX.zap();shakeT=.28;
      burst(L.x*TS+18,L.y*TS+18,['#fff','#ffd94d','#8fd8ff'],14);
      if(Math.floor(S.px/TS)===L.x&&Math.floor(S.py/TS)===L.y)damage('bolt');
    }} else if(L.struck>0)L.struck-=dt;
  }
  S.lightnings=S.lightnings.filter(L=>L.warn>0||L.struck>0);
  for(const g of S.ghosts){
    if(g.warn>0){g.warn-=dt;continue;}
    g.x+=g.vx*dt; g.y+=g.vy*dt;
    if(Math.hypot(g.x*TS+18-S.px,g.y*TS+18-S.py)<22)damage('ghost');
  }
  S.ghosts=S.ghosts.filter(g=>g.x>-2&&g.x<MW+2&&g.y>-2&&g.y<MH+2);

  const o=S.otter;
  if(o.leaving){o.leaving+=dt;if(o.leaving>2.2)o.gone=true;}
  else if(!o.gone){ if(o.req===null){o.reqT-=dt;if(o.reqT<=0)newRequest();} if(o.moodT>0)o.moodT-=dt; }

  if(!S.cmd){
    let dx=0,dy=0;
    if(S.keys['arrowup']||S.keys['w'])dy-=1;
    if(S.keys['arrowdown']||S.keys['s'])dy+=1;
    if(S.keys['arrowleft']||S.keys['a'])dx-=1;
    if(S.keys['arrowright']||S.keys['d'])dx+=1;
    dx+=S.joy.x; dy+=S.joy.y;
    const mag=Math.hypot(dx,dy); S.moving=mag>0.15;
    if(S.moving){
      dx/=Math.max(1,mag); dy/=Math.max(1,mag);
      if(Math.abs(dx)>Math.abs(dy))S.dir=dx>0?1:3; else S.dir=dy>0?2:0;
      const ch=curChar();
      const inWater = ch.waterFree && !walkable(S.px,S.py);
      const spMul = (S.speedBuffT>0 ? 2 : 1) * (inWater ? 2 : 1);
      const sp=145*ch.speed*spMul*dt, nx=S.px+dx*sp, ny=S.py+dy*sp;
      // 개구리는 물 위도 헤엄쳐 다닌다 (맵 밖으로만 못 나감)
      const canGo=(x,y)=> ch.waterFree ? inBounds(x,y) : walkable(x,y);
      if(canGo(nx,S.py))S.px=nx;
      if(canGo(S.px,ny))S.py=ny;
      S.walk+=dt*10;
    }
    if(S.actQ){S.actQ=false;doAction();}
  } else S.actQ=false;

  if(!walkable(S.px,S.py)){
    if(curChar().waterFree){
      // 개구리: 물에서 피해도 없고 밀려나지도 않는다 (물이 곧 활동 무대)
      S.tideGrace=0;
    } else {
      S.tideGrace=(S.tideGrace||0)+dt;
      if(S.tideGrace>=curChar().tideBonus && S.invuln<=0){
        damage('tide');floatText(S.px,S.py-24,'🌊 -1 ❤️','#8fd8ff');
      }
      let gx=(MW*TS/2-S.px), gy=(MH*TS/2-S.py);
      S.px+=Math.sign(gx)*110*dt; S.py+=Math.sign(gy)*110*dt;
    }
  } else S.tideGrace=0;

  if(S.comboT>0){S.comboT-=dt;if(S.comboT<=0){S.combo=0;$('combo').style.opacity=0;$('combo').style.color='';}}
  if(S.speedBuffT>0){S.speedBuffT-=dt; updateBuffUI(); if(S.speedBuffT<=0){S.speedBuffT=0;updateBuffUI();}}
  // 파티클·떠오르는 글자 갱신은 tickVisuals()(render.js)에서
  if(shakeT>0)shakeT-=dt;

  if(remain<=0)endGame('time');
}
function walkable(px,py){
  const x=Math.floor(px/TS), y=Math.floor(py/TS);
  if(x<0||y<0||x>=MW||y>=MH)return false;
  return tileType(x,y)!==0 && !isFlooded(x,y);
}
// 맵 경계 안인지만 판정 (개구리 수영용)
function inBounds(px,py){
  const x=Math.floor(px/TS), y=Math.floor(py/TS);
  return x>=0&&y>=0&&x<MW&&y<MH;
}

/* ---------- end & grade ---------- */
function endGame(cause){
  if(S.over)return;
  S.over=true; running=false; S.cmd=null; endCmdUI(); stopBGM();
  SFX.splash();
  const types=new Set(S.buildings.map(b=>b.type));
  const variety=types.size*10; S.score+=variety;
  const req=S.otter.done, survived=S.buildings.length;
  let grade,word,story;
  const ch=curChar();
  if(cause==='death'){
    grade='F'; word='조난… 캠프는 미완성으로 남았다.';
    story='"'+ch.overMsg+'" '+ch.name+'은(는) 끝내 섬에서 버티지 못했다. 벼락과 유령을 피하지 못했고, 지어둔 캠프도 파도에 흩어졌다. 다음엔 위험 표시를 잘 보고 피하자.';
  } else if(types.size>=5 && (req>=3 || (!ch.otterOk&&S.score>=600)) && S.hp>0){
    grade='S'; word='전설의 개척자!! 완벽한 정착!';
    story='🏝️ 밀물이 섬을 삼키는 3분 동안, '+ch.name+'은(는) 완벽한 캠프를 세웠다. '+(ch.key==='dark'?'까마귀는 만족스럽게 날개를 펴고 떠났다. ':'해달은 만족스럽게 헤엄쳐 떠나며 다음에도 놀러 오겠다 약속했다. ')+'이 섬은 전설로 남았다.';
  } else if(S.score>=380){
    grade='A'; word='해달도 감동한 캠프!';
    story='🦦 아늑한 캠프가 완성됐다. '+ch.name+'의 솜씨에 모두가 감탄했다. 밀물이 밀려와도 이 하루는 오래 기억될 것이다.';
  } else if(S.score>=240){
    grade='B'; word='제법 그럴듯한 캠프!';
    story='⛺ 텐트와 모닥불이 노을 아래 자리 잡았다. 완벽하진 않아도, '+ch.name+'은(는) 무사히 밤을 맞이했다. 나쁘지 않은 하루였다.';
  } else if(S.score>=130){
    grade='C'; word='살아남긴 했다…';
    story='🌊 물이 발치까지 차오른 순간에야 겨우 몸을 피했다. 캠프는 초라했지만, 살아남았다는 것만으로 충분한 하루였다.';
  } else {
    grade='D'; word='밀물이 다 가져갔다…';
    story='💧 서두르다 아무것도 제대로 짓지 못했다. 밀물은 섬의 흔적을 지웠고, '+ch.name+'만 겨우 뭍으로 헤엄쳤다.';
  }
  const snap=$('snapshot');
  drawSnapshot(snap);                         // 그래픽: 노을빛 '기념사진' 한 장
  const bpts=S.buildings.reduce((a,b)=>a+BUILDS.find(x=>x.key===b.type).pts,0);
  $('stats').innerHTML=
    '🏠 살아남은 건물 '+survived+'개 ('+types.size+'/7종)<b>+'+(bpts+variety)+'</b>'+
    '<br>🦦 해달 부탁 완료 '+req+'개<b>+'+(req*30)+'</b>'+
    '<br>❤️ 남은 생명 '+Math.max(0,S.hp)+'칸'+
    '<br>⚡ 콤보 보너스<b>+'+S.comboBonus+'</b>'+
    '<br>⭐ 최종 점수<b>'+S.score+'</b>';
  $('story').textContent=story;
  // leaderboard hookup
  lastRun={score:S.score, grade, builds:survived, character:curChar().key};
  submitted=false;
  const sbtn=$('submitbtn'); sbtn.disabled=false; sbtn.textContent='🏆 랭킹에 등록';
  fetchLeaderboard();
  $('gradeword').textContent='';
  const g=$('grade'); g.textContent=grade; g.classList.remove('stamp'); void g.offsetWidth;
  const col=grade==='S'?'#e5b93b':(cause==='death'||grade==='D'?'#5a6b7a':'#d84a3a');
  g.style.borderColor=col; g.style.color=col;
  $('result').style.display='flex'; g.classList.add('stamp');
  try{Deco.onRunEnd(grade,cause);}catch(e){console.error(e);}   // 꾸미기: 진주·도감·우정도 정산 (점수 무관)
  setTimeout(()=>{SFX.stamp();shakeT=.3;$('gradeword').textContent=word;},950);
  if(grade==='S')playFireworks();
  $('sharebtn').onclick=()=>{
    const txt='삼분의숲 🏝️ '+grade+'등급! ⭐'+S.score+'점 · 건물 '+types.size+'/7종 · '+curChar().name+' 🦦';
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject())
      .then(()=>$('shareok').textContent='복사 완료! 자랑하러 가자').catch(()=>{$('shareok').textContent=txt;});
  };
}

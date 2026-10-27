/* ============ 삼분의숲 — input ============
   키보드·터치 입력 */
'use strict';
/* ---------- input ---------- */
addEventListener('keydown',e=>{
  // 스토리 화면에서는 아무 키나 눌러 진행
  if($('intro').style.display==='flex'){
    e.preventDefault(); storyAdvance(); return;
  }
  if(!running)return;
  const k=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright'].includes(k)||e.key===' ')e.preventDefault();
  S.keys[k]=true;
  if(S.cmd){
    let d=null;
    if(k==='arrowup'||k==='w')d='up'; else if(k==='arrowdown'||k==='s')d='down';
    else if(k==='arrowleft'||k==='a')d='left'; else if(k==='arrowright'||k==='d')d='right';
    if(d&&!e.repeat)cmdPress(d);
    return;
  }
  if(e.key===' '&&!e.repeat)S.actQ=true;
  if(/^[1-7]$/.test(e.key))selectBuild(+e.key-1);
  if(e.key==='Escape'||e.key==='0'){S.sel=-1;updateHUD();}
});
addEventListener('keyup',e=>{if(S)S.keys[e.key.toLowerCase()]=false;});

const joyzone=$('joyzone'),knob=$('joyknob');
let joyId=null;
joyzone.addEventListener('touchstart',e=>{e.preventDefault();joyId=e.changedTouches[0].identifier;joyMove(e);},{passive:false});
joyzone.addEventListener('touchmove',e=>{e.preventDefault();joyMove(e);},{passive:false});
function joyEnd(e){for(const t of e.changedTouches)if(t.identifier===joyId){joyId=null;S.joy={x:0,y:0};knob.style.left='37px';knob.style.top='37px';}}
joyzone.addEventListener('touchend',joyEnd);joyzone.addEventListener('touchcancel',joyEnd);
function joyMove(e){
  if(!S)return;
  for(const t of e.touches)if(t.identifier===joyId){
    const r=joyzone.getBoundingClientRect();
    let dx=t.clientX-(r.left+60), dy=t.clientY-(r.top+60);
    const m=Math.hypot(dx,dy)||1, cl=Math.min(m,40);
    dx=dx/m*cl; dy=dy/m*cl; S.joy={x:dx/40,y:dy/40};
    knob.style.left=(37+dx)+'px'; knob.style.top=(37+dy)+'px';
  }
}
$('actbtn').addEventListener('touchstart',e=>{e.preventDefault();if(S)S.actQ=true;},{passive:false});
$('actbtn').addEventListener('pointerdown',e=>{if(!isTouch&&S)S.actQ=true;});
document.querySelectorAll('#cmdpad button').forEach(b=>{
  b.addEventListener('touchstart',e=>{e.preventDefault();if(S&&S.cmd)cmdPress(b.dataset.d);},{passive:false});
  b.addEventListener('pointerdown',e=>{if(!isTouch&&S&&S.cmd)cmdPress(b.dataset.d);});
});

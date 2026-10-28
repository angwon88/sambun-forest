/* ============ 삼분의숲 — main ============
   부팅·메인 루프 */
'use strict';
/* ---------- loop ---------- */
function loop(ts){
  if(!lastT)lastT=ts;
  const dt=Math.min(.05,(ts-lastT)/1000); lastT=ts;
  if(running){update(dt);hudTick();}
  tickVisuals(dt);
  if(S&&ART.ready)render(dt);
  requestAnimationFrame(loop);
}

(function(){ try{const s=localStorage.getItem('sambun_char'); if(s!==null)selectedChar=Math.max(0,Math.min(CHARACTERS.length-1,+s));}catch(e){} })();

// load saved nickname into the input
(function(){const n=getNick(); if(n)$('nickin').value=n;})();
$('nickin').addEventListener('input',e=>{setNick(e.target.value.trim());});
$('submitbtn').addEventListener('click',submitScore);
$('cornerrank').addEventListener('click',()=>{
  $('rankmodal').classList.add('open');
  fetchLeaderboard('tlbrows','tlbstatus');
});
$('rankclose').addEventListener('click',()=>$('rankmodal').classList.remove('open'));
$('rankmodal').addEventListener('click',e=>{ if(e.target===$('rankmodal'))$('rankmodal').classList.remove('open'); });
$('cornerhelp').addEventListener('click',()=>{ $('helpmodal').classList.add('open'); SFX.select(); });
$('helpclose').addEventListener('click',()=>$('helpmodal').classList.remove('open'));
$('helpmodal').addEventListener('click',e=>{ if(e.target===$('helpmodal'))$('helpmodal').classList.remove('open'); });
$('startbtn').addEventListener('click',showStory);
$('againbtn').addEventListener('click',start);
$('homebtn').addEventListener('click',goHome);
$('intro').addEventListener('click',storyAdvance);

/* ---------- boot ---------- */
buildArt();            // 코드 픽셀아트 스프라이트 생성
fillIcons(); buildBuildBar();
(function(){ const l=document.createElement('link'); l.rel='icon'; l.href=iconURL('shell'); document.head.appendChild(l); })();  // 탭 아이콘
resizeCanvas();        // 화면 해상도에 맞춘 캔버스 배율
setupDemo();           // 타이틀 뒤에 보이는 섬
loadSprites(()=>{ prepCharCanvases(); buildCharSelect(); showCharInfo(); });
CharAnim.load();      // PixelLab 8방향 애니메이션 (js/char-anims.js)
Deco.init();          // 꾸미기: 장착한 캐릭터 색 적용, 타이틀 진주 표시
$('decobtn').addEventListener('click',()=>Deco.open('camp'));
$('decobtn2').addEventListener('click',()=>Deco.open('camp'));
if(document.fonts&&document.fonts.load){ document.fonts.load("bold 11px 'Galmuri11'").catch(()=>{}); document.fonts.load("11px 'Galmuri11'").catch(()=>{}); }
requestAnimationFrame(loop);

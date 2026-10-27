/* ============ 삼분의숲 — leaderboard ============
   랭킹 (Supabase 조회 / Cloudflare Worker 등록) */
'use strict';
/* ---------- leaderboard (Supabase) ---------- */
const SB_URL='https://ecvpykecmttcjdorldgg.supabase.co';
const SB_KEY='sb_publishable_xgSQO1prDN5tP99XzcRn2A_LhfPxaAs';
const SB_HEAD={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'};
let lastRun=null, submitted=false;

let nickMem='';
function getNick(){ try{return (localStorage.getItem('sambun_nick')||'').trim();}catch(e){return nickMem;} }
function setNick(n){ nickMem=n; try{localStorage.setItem('sambun_nick',n);}catch(e){} }

async function fetchLeaderboard(rowsId='lbrows', statusId='lbstatus'){
  $(statusId).textContent='랭킹 불러오는 중…';
  try{
    const r=await fetch(SB_URL+'/rest/v1/scores?select=nickname,score,grade,builds,character&order=score.desc&limit=10',{headers:SB_HEAD});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const rows=await r.json();
    renderLeaderboard(rows, rowsId);
    $(statusId).textContent = rows.length? '' : '아직 등록된 기록이 없어. 1등이 되어보자!';
  }catch(e){ $(rowsId).innerHTML=''; $(statusId).textContent='랭킹을 불러오지 못했어 (네트워크 확인)'; }
}
function renderLeaderboard(rows, rowsId='lbrows'){
  const gEmoji={S:'🏆',A:'🥇',B:'🥈',C:'🥉',D:'🔹',F:'💧'};
  const cEmoji={gizmo:'🤍',monkey:'🐒',frog:'💚',dark:'🖤',unknown:'❓'};
  const myNick=getNick();
  $(rowsId).innerHTML=rows.map((r,i)=>{
    const mine = lastRun && submitted && r.nickname===myNick && r.score===lastRun.score;
    const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
    const ch = cEmoji[r.character]||'❓';
    return '<div class="lbrow'+(mine?' me':'')+'">'+
      '<span class="rk">'+medal+'</span>'+
      '<span class="ch">'+ch+'</span>'+
      '<span class="nm">'+escapeHtml(r.nickname)+'</span>'+
      '<span class="gd">'+(gEmoji[r.grade]||'')+'</span>'+
      '<span class="sc">⭐'+r.score+'</span>'+
      '<span class="bd">🏠'+r.builds+'</span></div>';
  }).join('');
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);}

const WORKER_URL='https://sambun-score.gwon8300.workers.dev';
async function submitScore(){
  if(submitted||!lastRun)return;
  let nick=getNick();
  if(!nick){nick='익명섬주민'; setNick(nick);}
  const btn=$('submitbtn'); btn.disabled=true; btn.textContent='등록 중…';
  try{
    // 점수 등록은 Worker를 거친다 (검증 + service_role로 저장). 게임 키로 직접 insert는 차단됨.
    const r=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({nickname:nick.slice(0,12),score:lastRun.score,grade:lastRun.grade,builds:lastRun.builds,character:lastRun.character})});
    if(!r.ok)throw new Error('HTTP '+r.status);
    submitted=true; btn.textContent='✅ 등록 완료!';
    await fetchLeaderboard();
  }catch(e){ btn.disabled=false; btn.textContent='🏆 랭킹에 등록 (다시 시도)'; $('lbstatus').textContent='등록 실패 — 다시 눌러줘'; }
}

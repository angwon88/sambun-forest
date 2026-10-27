/* ============ 삼분의숲 — audio ============
   효과음·BGM (Web Audio) */
'use strict';
/* ---------- audio ---------- */
let AC=null;
function audio(){ if(!AC) AC=new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==='suspended')AC.resume(); }
function tone(f,dur,type='square',vol=.12,slide=0,when=0){
  if(!AC)return;
  const t=AC.currentTime+when, o=AC.createOscillator(), g=AC.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t+dur+.02);
}
function noise(dur,vol=.2,when=0){
  if(!AC)return;
  const t=AC.currentTime+when, n=Math.floor(AC.sampleRate*dur);
  const buf=AC.createBuffer(1,n,AC.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const s=AC.createBufferSource(); s.buffer=buf;
  const g=AC.createGain(); g.gain.setValueAtTime(vol,t);
  s.connect(g).connect(AC.destination); s.start(t);
}
const SFX={
  key(){tone(660,.05,'square',.09);},
  harvest(){tone(660,.08,'square',.1);tone(990,.12,'square',.09,0,.06);},
  build(){tone(180,.1,'square',.14);tone(240,.12,'square',.12,0,.09);tone(320,.14,'triangle',.1,0,.18);},
  ding(){tone(880,.12,'sine',.14);tone(1175,.16,'sine',.12,0,.1);tone(1568,.28,'sine',.12,0,.2);},
  deny(){tone(160,.14,'sawtooth',.1,-60);},
  fail(){tone(220,.2,'sawtooth',.12,-120);},
  warn(){tone(440,.22,'triangle',.14,-120);},
  tick(){tone(1200,.04,'square',.07);},
  thunder(){noise(.5,.3);tone(70,.5,'sawtooth',.18,-30);},
  zap(){tone(1800,.06,'square',.12,-600);},
  ghost(){tone(200,.5,'sine',.06,120);tone(260,.6,'sine',.05,90,.1);},
  hurt(){tone(320,.25,'sawtooth',.16,-180);noise(.15,.12);},
  heal(){tone(660,.1,'sine',.12);tone(880,.14,'sine',.12,0,.08);tone(1320,.2,'sine',.1,0,.16);},
  stamp(){tone(90,.22,'square',.2,-40);tone(60,.3,'sawtooth',.16,-20,.05);},
  splash(){noise(.35,.14);tone(300,.3,'sine',.08,-200);},
  select(){tone(520,.06,'square',.08);},
  type(){tone(1150+Math.random()*180,.022,'square',.018);}
};

/* ---------- BGM (Web Audio, gentle island loop) ---------- */
let bgmTimer=null, bgmStep=0;
const BGM_NOTES=[523,587,659,784,659,587,523,440, 494,523,587,659,587,523,494,440];
const BGM_BASS =[131,131,165,165,147,147,110,110, 123,123,131,131,147,147,110,110];
function bgmTick(){
  if(!AC||!running)return;
  const tempo = S&&S.weather==='storm' ? 0.22 : (S&&(GAME_LEN-S.t)<=30 ? 0.24 : 0.34);
  const n=BGM_NOTES[bgmStep%BGM_NOTES.length];
  const b=BGM_BASS[bgmStep%BGM_BASS.length];
  tone(n,tempo*0.9,'triangle',0.05);
  tone(b,tempo*0.95,'sine',0.05);
  if(bgmStep%2===0)tone(n*2,tempo*0.4,'square',0.015);
  bgmStep++;
  bgmTimer=setTimeout(bgmTick,tempo*1000);
}
function startBGM(){ if(bgmTimer)clearTimeout(bgmTimer); bgmStep=0; bgmTick(); }
function stopBGM(){ if(bgmTimer){clearTimeout(bgmTimer);bgmTimer=null;} }

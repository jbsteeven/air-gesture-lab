(()=>{
if(typeof engine==='undefined')return;
const PROFILE_KEY='air_personal',CHECK_KEY='air_transfer_check';
const $=s=>document.querySelector(s);
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const median=a=>{if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2};
let profile=read(PROFILE_KEY),stamp=Number(profile?.createdAt)||0,ratios=[],factors=[],qualities=[],currentPose='neutral',done=false,result=null,lastProfilePoll=0;
const MIN_SAMPLES=90,MAX_SAMPLES=150;
function imported(){return !!(profile&&Number.isFinite(Number(profile.importedAt))&&Number(profile.importedAt)>0)}
function validProfile(){return profile&&Number.isFinite(Number(profile.refScale))&&profile.refScale>=.10&&profile.refScale<=.28}
function loadSaved(){const s=read(CHECK_KEY);if(s&&s.profileStamp===stamp&&s.status){done=true;result=s;return s}done=false;result=null;return null}
function resetFor(p){profile=p;stamp=Number(p?.createdAt)||0;ratios=[];factors=[];qualities=[];done=false;result=null;loadSaved();render()}
function snapshot(){
 if(!validProfile())return{mode:'NONE',status:'NO PROFILE',samples:0,progress:0,score:0};
 if(!imported())return{mode:'LOCAL',status:'LOCAL',samples:0,progress:1,score:1};
 if(done&&result)return{mode:'IMPORTED',...result,progress:1};
 const n=ratios.length,progress=clamp(n/MIN_SAMPLES,0,1);
 if(!n)return{mode:'IMPORTED',status:'WAITING',samples:0,progress:0,score:0};
 const ratio=median(ratios),spread=median(ratios.map(v=>Math.abs(v-ratio))),capRate=factors.length?factors.filter(v=>v<=.705||v>=1.445).length/factors.length:0,quality=qualities.length?qualities.reduce((s,v)=>s+v,0)/qualities.length:0;
 const centerScore=1-clamp(Math.abs(ratio-1)/.42,0,1),spreadScore=1-clamp(spread/.20,0,1),rangeScore=1-clamp(capRate/.35,0,1),qualityScore=clamp(quality,0,1),score=clamp(centerScore*.38+spreadScore*.24+rangeScore*.20+qualityScore*.18,0,1);
 return{mode:'IMPORTED',status:'VERIFYING',samples:n,progress,score,ratio,spread,capRate,quality};
}
function finalize(){
 const s=snapshot();if(s.mode!=='IMPORTED'||s.samples<MIN_SAMPLES)return;
 const compatible=s.ratio>=.78&&s.ratio<=1.22&&s.spread<=.13&&s.capRate<=.12&&s.quality>=.62;
 const adaptable=s.ratio>=.62&&s.ratio<=1.38&&s.spread<=.20&&s.capRate<=.32&&s.quality>=.48;
 const status=compatible?'COMPATIBLE':adaptable?'ADAPTED':'RECALIBRATE';
 result={profileStamp:stamp,status,score:s.score,ratio:s.ratio,spread:s.spread,capRate:s.capRate,quality:s.quality,samples:s.samples,checkedAt:Date.now()};done=true;write(CHECK_KEY,result);render();
 if(typeof feedback==='function')feedback(status==='COMPATIBLE'?'TRANSFER · COMPATIBILE':status==='ADAPTED'?'TRANSFER · AUTOTUNE OK':'TRANSFER · RICALIBRA');
}
function shouldSample(){if(!validProfile()||!imported()||done)return false;if(typeof calibrator!=='undefined'&&calibrator?.active)return false;if(window.AirHandRecovery?.state&&(window.AirHandRecovery.state.pendingLoss||window.AirHandRecovery.state.active))return false;return currentPose==='neutral'}
function observe(q){
 if(!shouldSample()||!Number.isFinite(q?.scale))return;
 const ratio=q.scale/profile.refScale;if(!Number.isFinite(ratio)||ratio<.35||ratio>2.5)return;
 ratios.push(ratio);factors.push(Number.isFinite(q.factor)?q.factor:1);qualities.push(Number.isFinite(q.quality)?clamp(q.quality,0,1):0);
 if(ratios.length>MAX_SAMPLES){ratios.shift();factors.shift();qualities.shift()}
 render();if(ratios.length>=MIN_SAMPLES)finalize();
}
function panelHtml(){return `<div class="transferPanel" id="transferPanel"><span>TRANSFER CHECK</span><b id="transferName">—</b><p id="transferHint">Verifica compatibilità del profilo importato con questo dispositivo, senza cambiare le soglie.</p><div class="transferBar"><i id="transferBar"></i></div><small id="transferMeta">—</small></div>`}
function render(){
 const panel=$('#transferPanel');if(!panel)return;const s=snapshot(),name=$('#transferName'),hint=$('#transferHint'),bar=$('#transferBar'),meta=$('#transferMeta');panel.dataset.state=s.status;
 if(name)name.textContent=s.status;
 if(bar)bar.style.width=Math.round((s.progress||0)*100)+'%';
 if(s.mode==='NONE'){if(hint)hint.textContent='Crea o importa prima un profilo personale.';if(meta)meta.textContent='NESSUN PROFILO';return}
 if(s.mode==='LOCAL'){if(hint)hint.textContent='Profilo creato su questo dispositivo: nessun controllo di trasferimento necessario.';if(meta)meta.textContent='ORIGINE · LOCALE';return}
 if(s.status==='WAITING'||s.status==='VERIFYING'){if(hint)hint.textContent='Tieni la mano in posizione neutrale durante l’uso normale: il controllo raccoglie campioni passivi.';if(meta)meta.textContent=`CAMPIONI ${s.samples}/${MIN_SAMPLES} · ${Math.round((s.progress||0)*100)}%`;return}
 const labels={COMPATIBLE:'Profilo importato coerente con questo dispositivo.',ADAPTED:'Il profilo è utilizzabile, ma AutoTune sta compensando una differenza misurabile.',RECALIBRATE:'Lo scostamento è elevato: è consigliata una nuova Personal Calibration su questo dispositivo.'};
 if(hint)hint.textContent=labels[s.status]||'Controllo completato.';
 if(meta)meta.textContent=`FIT ${Math.round((s.score||0)*100)}% · SCALA ×${Number(s.ratio||1).toFixed(2)} · ${s.samples||0} CAMPIONI`;
}
function inject(){const box=$('#detailText');if(!box)return;const personalOpen=(typeof openId!=='undefined'&&openId==='personal')||$('#detailCode')?.textContent==='08 / PERSONAL';if(!personalOpen)return;if(!$('#transferPanel'))box.insertAdjacentHTML('beforeend',panelHtml());render()}
function pollProfile(){const now=performance.now();if(now-lastProfilePoll<900)return;lastProfilePoll=now;const p=read(PROFILE_KEY),newStamp=Number(p?.createdAt)||0;if(newStamp!==stamp||Number(p?.importedAt||0)!==Number(profile?.importedAt||0))resetFor(p)}
engine.on('pose',p=>{currentPose=p?.name||'neutral'}).on('tracking',q=>{pollProfile();observe(q)}).on('calibration',()=>{setTimeout(()=>resetFor(read(PROFILE_KEY)),0)});
const box=$('#detailText');if(box)new MutationObserver(()=>queueMicrotask(inject)).observe(box,{childList:true,subtree:true});setInterval(()=>{pollProfile();inject();render()},900);
loadSaved();inject();
window.AirTransferCheck={snapshot,reset(){localStorage.removeItem(CHECK_KEY);resetFor(read(PROFILE_KEY))}};
})();
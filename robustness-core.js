(()=>{
const $=s=>document.querySelector(s);
if(typeof engine==='undefined')return;
const listeners=new Set();
let lastKey='',lastSnapshot=null;
const priorities={READY:0,'LOW LIGHT':1,DEGRADED:2,RECOVERING:3,'NO HAND':4};
const info={
 READY:{label:'READY',hint:'Sistema affidabile · comandi attivi'},
 'LOW LIGHT':{label:'LOW LIGHT',hint:'Tracking operativo · aumenta la luce frontale'},
 DEGRADED:{label:'DEGRADED',hint:'Tracking instabile · comandi protetti'},
 RECOVERING:{label:'RECOVERING',hint:'Stabilizza la mano · ritorno a Neutral Gate'},
 'NO HAND':{label:'NO HAND',hint:'Mostra la mano e rientra in posizione neutra'}
};
function ensureUi(){
 if(!$('#robustnessCore')){
  const el=document.createElement('aside');el.id='robustnessCore';el.dataset.state='READY';el.hidden=true;
  el.innerHTML='<span>ROBUSTNESS CORE</span><b id="robustnessName">READY</b><small id="robustnessHint">Sistema affidabile · comandi attivi</small><small id="robustnessMeta">RECOVERY 0 · GUARD 0 · LIGHT —</small>';
  document.body.appendChild(el)
 }
 document.body.classList.add('robustness-core')
}
function derive(){
 const recovery=window.AirHandRecovery?.state||{pendingLoss:false,active:false,recoveries:0};
 const guard=window.AirTrackingQualityGuard?.state||{guarding:false,badFrames:0,goodFrames:0,triggers:0};
 const light=window.AirLightMonitor?.state||{level:'WAIT',luminance:0,low:false,dim:false};
 let state='READY',source='nominal';
 if(light.dim){state='LOW LIGHT';source='light'}
 if((guard.badFrames||0)>0&&!guard.guarding){state='DEGRADED';source='quality'}
 if(guard.guarding||recovery.active){state='RECOVERING';source=guard.guarding?'quality+recovery':'recovery'}
 if(recovery.pendingLoss&&!recovery.active){state='NO HAND';source='hand'}
 const commandSafe=state==='READY'||state==='LOW LIGHT';
 return{state,source,commandSafe,recovery:{...recovery},guard:{...guard},light:{...light},priority:priorities[state]||0,timestamp:Date.now()}
}
function render(force=false){
 ensureUi();const s=derive(),lightLabel=s.light.level==='WAIT'?'—':`${s.light.level} ${Math.round(s.light.luminance||0)}`;
 const lab=$('#lab'),box=$('#robustnessCore');if(box)box.hidden=!!lab?.hidden;
 const key=[s.state,s.recovery.recoveries||0,s.guard.triggers||0,lightLabel,s.commandSafe,box?.hidden?'0':'1'].join('|');
 if(!force&&key===lastKey)return s;lastKey=key;lastSnapshot=s;
 const name=$('#robustnessName'),hint=$('#robustnessHint'),meta=$('#robustnessMeta');
 if(box)box.dataset.state=s.state;
 if(name)name.textContent=info[s.state]?.label||s.state;
 if(hint)hint.textContent=info[s.state]?.hint||'';
 if(meta)meta.textContent=`RECOVERY ${s.recovery.recoveries||0} · GUARD ${s.guard.triggers||0} · LIGHT ${lightLabel}`;
 document.body.dataset.robustness=s.state.toLowerCase().replace(/\s+/g,'-');
 window.dispatchEvent(new CustomEvent('airrobustnesschange',{detail:{...s}}));
 for(const fn of listeners){try{fn({...s})}catch(e){}}
 return s
}
function snapshot(){return lastSnapshot?{...lastSnapshot}:derive()}
function subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);try{fn(snapshot())}catch(e){}return()=>listeners.delete(fn)}
engine.on('recovery',()=>render(true)).on('qualityguard',()=>render(true));
window.addEventListener('airlightchange',()=>render(true));
setInterval(()=>render(false),220);
ensureUi();render(true);
window.AirRobustnessCore={snapshot,subscribe,get state(){return snapshot().state},get commandSafe(){return snapshot().commandSafe}};
})();
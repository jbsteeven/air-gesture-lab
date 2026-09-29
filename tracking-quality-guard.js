(()=>{
if(typeof engine==='undefined')return;
const $=s=>document.querySelector(s);
const baseProcess=engine.process.bind(engine);
let badFrames=0,goodFrames=0,guarding=false,lastCenter=null,lastRaw=0,triggers=0,hideTimer=0;
const BAD_FRAMES=4,GOOD_CONFIRM=2,DIST_MIN=.50,DIST_MAX=1.80,EDGE_LIMIT=8;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ensureUi(){
 if(!$('#trackingGuardBadge')){const el=document.createElement('div');el.id='trackingGuardBadge';el.hidden=true;el.innerHTML='<span>TRACKING QUALITY</span><b id="trackingGuardName">READY</b><small id="trackingGuardHint">—</small><div><i id="trackingGuardBar"></i></div>';document.body.appendChild(el)}
 if(!$('#trackingGuardStyle')){const st=document.createElement('style');st.id='trackingGuardStyle';st.textContent='#trackingGuardBadge{position:fixed;left:50%;top:205px;transform:translateX(-50%);width:min(78vw,260px);padding:8px 11px;border:1px solid #ffd27a44;border-radius:13px;background:#071018e8;backdrop-filter:blur(10px);z-index:29;text-align:center;box-shadow:0 0 24px #06101988}#trackingGuardBadge[hidden]{display:none}#trackingGuardBadge span,#trackingGuardBadge small{display:block;font-size:6px;letter-spacing:.13em;color:#71818a}#trackingGuardBadge b{display:block;margin:3px 0;font-size:9px;letter-spacing:.1em;color:#ffd27a}#trackingGuardBadge div{height:2px;margin-top:5px;background:#ffffff10;border-radius:3px;overflow:hidden}#trackingGuardBadge i{display:block;height:100%;width:0;background:#ffd27a;box-shadow:0 0 7px #ffd27a;transition:width .12s}';document.head.appendChild(st)}
}
function show(name,hint='',progress=0,linger=0){ensureUi();clearTimeout(hideTimer);const box=$('#trackingGuardBadge');if(!box)return;box.hidden=false;const n=$('#trackingGuardName'),h=$('#trackingGuardHint'),bar=$('#trackingGuardBar');if(n)n.textContent=name;if(h)h.textContent=hint;if(bar)bar.style.width=Math.round(clamp(progress,0,1)*100)+'%';if(linger)hideTimer=setTimeout(()=>{box.hidden=true},linger)}
function hide(delay=0){ensureUi();clearTimeout(hideTimer);const box=$('#trackingGuardBadge');if(!box)return;if(delay)hideTimer=setTimeout(()=>{box.hidden=true},delay);else box.hidden=true}
function centerOf(l){return engine.palmCenter?engine.palmCenter(l):{x:(l[0].x+l[9].x)/2,y:(l[0].y+l[9].y)/2}}
function inspect(l){
 const raw=engine.dist(l[0],l[9]),ref=Math.max(.001,Number(engine.refScale)||.18),ratio=raw/ref,center=centerOf(l);
 const move=lastCenter?Math.hypot(center.x-lastCenter.x,center.y-lastCenter.y):0,scaleJump=lastRaw?Math.abs(raw-lastRaw)/Math.max(lastRaw,.001):0;
 let edge=0;for(const p of l){if(!p)continue;if(p.x<.012||p.x>.988||p.y<.012||p.y>.988)edge++}
 const distanceBad=!Number.isFinite(ratio)||ratio<DIST_MIN||ratio>DIST_MAX;
 const discontinuity=(move>.22&&scaleJump>.25)||scaleJump>.60;
 const clipped=edge>=EDGE_LIMIT;
 let reason='';if(distanceBad)reason=ratio<DIST_MIN?'MANO TROPPO LONTANA':'MANO TROPPO VICINA';else if(clipped)reason='MANO FUORI INQUADRATURA';else if(discontinuity)reason='TRACKING INSTABILE';
 return{bad:distanceBad||clipped||discontinuity,reason,ratio,raw,center,move,scaleJump,edge};
}
function softReset(reason='tracking-quality'){
 const hadScroll=!!(engine.scrollActive||engine.scrollAt);
 engine.hist=[];engine.pinch=false;engine.pinchAt=0;engine.palmAt=0;engine.fistAt=0;engine.commandReady=false;engine.restAt=0;engine.poseMotion=0;engine.lastPalmCenter=null;engine.scrollAt=0;engine.scrollActive=false;engine.scrollLastY=null;engine.scrollLastFire=0;engine.last=Date.now();
 if(typeof engine.clearIntent==='function')engine.clearIntent();if(hadScroll)engine.emit('mode',{name:'scroll',active:false,reason});
 if(typeof neutralReady!=='undefined')neutralReady=false;if(typeof resetDwell==='function')resetDwell(false);
}
function triggerGuard(info){
 guarding=true;triggers++;softReset('tracking-guard');show('COMANDI SOSPESI',info.reason||'TRACKING DEGRADATO',1);
 try{engine.emit('qualityguard',{phase:'trigger',triggers,...info})}catch(e){}
 if(window.AirHandRecovery?.forceReset){window.AirHandRecovery.forceReset();return true}
 return false;
}
engine.process=function(l){
 if(guarding)return baseProcess(l);
 if(typeof calibrator!=='undefined'&&calibrator?.active){badFrames=0;goodFrames=0;lastCenter=null;lastRaw=0;hide();return baseProcess(l)}
 const info=inspect(l);
 if(info.bad){
  badFrames++;goodFrames=0;softReset('tracking-warning');
  if(badFrames>=2)show('QUALITY CHECK',info.reason,clamp(badFrames/BAD_FRAMES,0,1));
  lastCenter=info.center;lastRaw=info.raw;
  if(badFrames>=BAD_FRAMES){const handed=triggerGuard(info);if(handed)return baseProcess(l)}
  return;
 }
 if(badFrames>0){
  goodFrames++;lastCenter=info.center;lastRaw=info.raw;
  if(goodFrames<GOOD_CONFIRM){show('STABILIZZA','QUALITÀ IN RIPRISTINO',goodFrames/GOOD_CONFIRM);return}
  badFrames=0;goodFrames=0;show('TRACKING OK','COMANDI RIATTIVATI',1,500);
 }
 lastCenter=info.center;lastRaw=info.raw;
 return baseProcess(l);
};
engine.on('recovery',r=>{if(!guarding)return;if(r?.phase==='ready'){guarding=false;badFrames=0;goodFrames=0;lastCenter=null;lastRaw=0;show('TRACKING OK','ATTENDI NEUTRAL · READY',1,650);try{engine.emit('qualityguard',{phase:'ready',triggers})}catch(e){}}});
window.AirTrackingQualityGuard={get state(){return{guarding,badFrames,goodFrames,triggers}},inspect};
ensureUi();
})();
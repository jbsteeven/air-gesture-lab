(()=>{
if(typeof engine==='undefined'||typeof metrics==='undefined')return;
const $=s=>document.querySelector(s);
const originalProcess=engine.process.bind(engine),originalLost=metrics.lost.bind(metrics),originalObserve=typeof calibrator!=='undefined'&&calibrator?.observe?calibrator.observe.bind(calibrator):null;
let pendingLoss=false,active=false,startedAt=0,stableFrames=0,lastCenter=null,recoveries=0,hideTimer=0;
const MIN_TIME=430,MIN_STABLE_FRAMES=5,MAX_MOVE=.030;
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function ensureUi(){if(!$('#handRecoveryBadge')){const el=document.createElement('div');el.id='handRecoveryBadge';el.hidden=true;el.innerHTML='<span>HAND RECOVERY</span><b id="handRecoveryName">READY</b><small id="handRecoveryHint">—</small><div><i id="handRecoveryBar"></i></div>';document.body.appendChild(el)}if(!$('#handRecoveryStyle')){const st=document.createElement('style');st.id='handRecoveryStyle';st.textContent='#handRecoveryBadge{position:fixed;left:50%;top:142px;transform:translateX(-50%);width:min(78vw,260px);padding:9px 12px;border:1px solid #6eeaff55;border-radius:14px;background:#071018ee;backdrop-filter:blur(10px);z-index:30;text-align:center;box-shadow:0 0 30px #06101999}#handRecoveryBadge[hidden]{display:none}#handRecoveryBadge span,#handRecoveryBadge small{display:block;font-size:6px;letter-spacing:.14em;color:#71818a}#handRecoveryBadge b{display:block;margin:3px 0;font-size:10px;letter-spacing:.11em;color:#8ff1ff}#handRecoveryBadge div{height:2px;margin-top:6px;background:#ffffff10;border-radius:3px;overflow:hidden}#handRecoveryBadge i{display:block;height:100%;width:0;background:#6eeaff;box-shadow:0 0 8px #6eeaff;transition:width .1s}';document.head.appendChild(st)}}
function show(name,hint='',progress=0,linger=0){ensureUi();clearTimeout(hideTimer);const box=$('#handRecoveryBadge'),n=$('#handRecoveryName'),h=$('#handRecoveryHint'),bar=$('#handRecoveryBar');if(!box)return;box.hidden=false;if(n)n.textContent=name;if(h)h.textContent=hint;if(bar)bar.style.width=Math.round(clamp(progress,0,1)*100)+'%';if(linger)hideTimer=setTimeout(()=>{box.hidden=true},linger)}
function emit(phase,data={}){try{engine.emit('recovery',{phase,recoveries,...data})}catch(e){}}
function resetEngine(reason='hand-lost'){
const hadScroll=!!(engine.scrollActive||engine.scrollAt);
engine.hist=[];engine.pinch=false;engine.pinchAt=0;engine.palmAt=0;engine.fistAt=0;engine.palmArmed=true;engine.fistArmed=true;engine.commandReady=false;engine.restAt=0;engine.poseMotion=0;engine.lastPalmCenter=null;engine.scrollAt=0;engine.scrollActive=false;engine.scrollLastY=null;engine.scrollLastFire=0;engine.poseName='neutral';engine.last=Date.now();
if(typeof engine.clearIntent==='function')engine.clearIntent();if(hadScroll)engine.emit('mode',{name:'scroll',active:false,reason});emit('reset',{reason});
}
function markLost(){pendingLoss=true;active=false;startedAt=0;stableFrames=0;lastCenter=null;if(typeof neutralReady!=='undefined')neutralReady=false;if(typeof resetDwell==='function')resetDwell(false);show('MANO PERSA','RIENTRA CON MANO RILASSATA',0);emit('lost')}
function centerOf(l){return engine.palmCenter?engine.palmCenter(l):{x:(l[0].x+l[9].x)/2,y:(l[0].y+l[9].y)/2}}
function recoverySample(l){
const now=performance.now();if(!active){active=true;pendingLoss=false;startedAt=now;stableFrames=0;lastCenter=null;resetEngine('reacquire');emit('start')}
const center=centerOf(l),raw=engine.dist(l[0],l[9]);if(Number.isFinite(raw)&&raw>.03){engine.handScale=engine.handScale*.55+raw*.45;engine.scaleFactor=clamp(engine.handScale/engine.refScale,.70,1.45)}
const move=lastCenter?Math.hypot(center.x-lastCenter.x,center.y-lastCenter.y):0;lastCenter=center;
const ratio=engine.refScale?engine.handScale/engine.refScale:1,distanceOk=ratio>=.52&&ratio<=1.78;
const sf=engine.adaptiveScale?engine.scaleFactor:1,pf=engine.personal?.pinchFactor||1,pOut=(engine.o?.pinchOut||.083)*sf*pf,pinchNear=engine.dist(l[4],l[8])<pOut*1.03;
const palm=engine.isPalm?engine.isPalm(l):false,fist=engine.isFist?engine.isFist(l):false,scrollPose=engine.isScrollPose?engine.isScrollPose(l):false,neutralPose=!palm&&!fist&&!scrollPose&&!pinchNear,steady=!lastCenter||move<MAX_MOVE;
if(distanceOk&&neutralPose&&steady)stableFrames++;else stableFrames=Math.max(0,stableFrames-1);
const elapsed=now-startedAt,timeProgress=clamp(elapsed/MIN_TIME,0,1),frameProgress=clamp(stableFrames/MIN_STABLE_FRAMES,0,1),progress=Math.min(timeProgress,frameProgress);
let hint='MANTIENI LA MANO RILASSATA';if(!distanceOk)hint=ratio<.52?'AVVICINA LEGGERMENTE LA MANO':'ALLONTANA LEGGERMENTE LA MANO';else if(!neutralPose)hint='TORNA IN POSIZIONE NEUTRA';else if(!steady)hint='FERMA LA MANO UN ISTANTE';show('RECOVERY · '+Math.round(progress*100)+'%',hint,progress);
if(elapsed<MIN_TIME||stableFrames<MIN_STABLE_FRAMES)return;
const idx=l[8];engine.sx=1-idx.x;engine.sy=idx.y;engine.lastPalmCenter=center;engine.poseMotion=0;engine.commandReady=false;engine.restAt=0;engine.last=Date.now();active=false;pendingLoss=false;stableFrames=0;recoveries++;if(typeof neutralReady!=='undefined')neutralReady=false;show('MANO RECUPERATA','ATTENDI NEUTRAL · READY',1,850);emit('ready',{ratio,move});return originalProcess(l)
}
metrics.lost=function(){const wasHand=!!this.hadHand;const out=originalLost();this.lastPointer=null;if(active){startedAt=0;stableFrames=0;lastCenter=null;show('MANO PERSA','RIENTRA CON MANO RILASSATA',0)}if(wasHand&&!pendingLoss)markLost();return out};
engine.process=function(l){if(pendingLoss||active)return recoverySample(l);return originalProcess(l)};
if(originalObserve){calibrator.observe=function(l){if(pendingLoss||active)return;return originalObserve(l)}}
window.AirHandRecovery={get state(){return{pendingLoss,active,recoveries}},forceReset(){markLost()}};
ensureUi();
})();
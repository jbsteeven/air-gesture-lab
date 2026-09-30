export const VOCABULARY_DICTIONARY=Object.freeze([
 {token:'PALM',label:'Palm',symbol:'✋',kind:'pose'},
 {token:'FIST',label:'Fist',symbol:'✊',kind:'pose'},
 {token:'POINT',label:'Point',symbol:'☝',kind:'pose'},
 {token:'V_SIGN',label:'V Sign',symbol:'✌',kind:'pose'},
 {token:'PINCH',label:'Pinch',symbol:'🤏',kind:'gesture'},
 {token:'SWIPE_LEFT',label:'Swipe Left',symbol:'←',kind:'gesture'},
 {token:'SWIPE_RIGHT',label:'Swipe Right',symbol:'→',kind:'gesture'}
]);

export const DEFAULT_VOCABULARY_MAPPING=Object.freeze({
 PALM:'BACK',FIST:'PAUSE',POINT:'POINT',V_SIGN:'SCROLL',PINCH:'SELECT',SWIPE_LEFT:'PREVIOUS',SWIPE_RIGHT:'NEXT'
});

const TOKENS=new Set(VOCABULARY_DICTIONARY.map(x=>x.token));

export class AirGestureVocabulary{
 constructor(engine,options={}){
  if(!engine)throw new Error('AirGestureVocabulary richiede un engine');
  this.engine=engine;
  this.enabled=options.enabled===true;
  this.holdMs=Number.isFinite(options.holdMs)?Math.max(250,options.holdMs):650;
  this.maxMove=Number.isFinite(options.maxMove)?Math.max(.005,options.maxMove):.035;
  this.mapping={...DEFAULT_VOCABULARY_MAPPING,...(options.mapping||{})};
  this.listeners=new Set();this.triggerListeners=new Set();
  this.candidate='NEUTRAL';this.candidateAt=0;this.candidateFired=false;this.lastCenter=null;this.lastTrigger=null;
 }
 clamp(v,a,b){return Math.max(a,Math.min(b,v))}
 centerOf(l){return this.engine.palmCenter?this.engine.palmCenter(l):{x:(l[0].x+l[9].x)/2,y:(l[0].y+l[9].y)/2}}
 classify(l){
  const e=this.engine;
  if(e.isPalm?.(l))return'PALM';
  if(e.isFist?.(l))return'FIST';
  const sf=e.adaptiveScale?e.scaleFactor:1,pf=e.personal?.pinchFactor||1,pOut=(e.o?.pinchOut||.083)*sf*pf;
  if(e.dist?.(l[4],l[8])<pOut*1.03)return'PINCH';
  if(e.isScrollPose?.(l))return'V_SIGN';
  if(e.isPointerPose?.(l))return'POINT';
  return'NEUTRAL'
 }
 subscribe(fn){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);try{fn(this.snapshot())}catch(e){}return()=>this.listeners.delete(fn)}
 onTrigger(fn){if(typeof fn!=='function')return()=>{};this.triggerListeners.add(fn);return()=>this.triggerListeners.delete(fn)}
 emitState(){const s=this.snapshot();for(const fn of this.listeners){try{fn(s)}catch(e){}}return s}
 fire(token,source='gesture',extra={}){
  if(!this.enabled||!TOKENS.has(token))return null;
  const payload={token,action:this.mapping[token]||token,source,timestamp:Date.now(),...extra};
  this.lastTrigger=payload;for(const fn of this.triggerListeners){try{fn({...payload})}catch(e){}}return payload
 }
 enable(){if(this.enabled)return this.snapshot();this.enabled=true;this.resetPose();return this.emitState()}
 disable(){if(!this.enabled)return this.snapshot();this.enabled=false;this.resetPose();return this.emitState()}
 setEnabled(v){return v?this.enable():this.disable()}
 setMapping(token,action){if(!TOKENS.has(token)||typeof action!=='string'||!action.trim())return false;this.mapping[token]=action.trim().toUpperCase();this.emitState();return true}
 resetMapping(){this.mapping={...DEFAULT_VOCABULARY_MAPPING};return this.emitState()}
 resetPose(){this.candidate='NEUTRAL';this.candidateAt=0;this.candidateFired=false;this.lastCenter=null}
 observeLandmarks(l){
  if(!this.enabled||!Array.isArray(l)||l.length<21)return null;
  const token=this.classify(l),now=performance.now(),center=this.centerOf(l),move=this.lastCenter?Math.hypot(center.x-this.lastCenter.x,center.y-this.lastCenter.y):0;this.lastCenter=center;
  if(token!=='POINT'&&token!=='V_SIGN'){if(this.candidate!=='NEUTRAL')this.resetPose();return token}
  if(token!==this.candidate){this.candidate=token;this.candidateAt=now;this.candidateFired=false;return token}
  if(move>this.maxMove){this.candidateAt=now;this.candidateFired=false;return token}
  const held=now-this.candidateAt;
  if(!this.candidateFired&&held>=this.holdMs){this.candidateFired=true;this.fire(token,'pose',{held,stable:true})}
  return token
 }
 handleGesture(g){
  if(!this.enabled||!g)return null;
  if(g.type==='pinch')return this.fire('PINCH','gesture',{gesture:g});
  if(g.type==='palm')return this.fire('PALM','gesture',{gesture:g});
  if(g.type==='fist')return this.fire('FIST','gesture',{gesture:g});
  if(g.type==='swipe'&&g.direction==='left')return this.fire('SWIPE_LEFT','gesture',{gesture:g});
  if(g.type==='swipe'&&g.direction==='right')return this.fire('SWIPE_RIGHT','gesture',{gesture:g});
  return null
 }
 snapshot(){return{enabled:this.enabled,holdMs:this.holdMs,mapping:{...this.mapping},dictionary:VOCABULARY_DICTIONARY.map(x=>({...x})),candidate:this.candidate,lastTrigger:this.lastTrigger?{...this.lastTrigger}:null}}
}

export default AirGestureVocabulary;

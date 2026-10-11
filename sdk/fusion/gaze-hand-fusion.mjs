const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const median=values=>{const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};

export class AirIrisGazeEstimator{
 constructor(options={}){
  this.smoothing=Number.isFinite(options.smoothing)?clamp(options.smoothing,.05,.8):.28;
  this.minEyeWidth=Number.isFinite(options.minEyeWidth)?options.minEyeWidth:.014;
  this.calibration=null;
  this.last=null;
  if(options.calibration)this.setCalibration(options.calibration);
 }
 eye(landmarks,{iris,corners,top,bottom}){
  const i=landmarks[iris],a=landmarks[corners[0]],b=landmarks[corners[1]],t=landmarks[top],bt=landmarks[bottom];
  if(!i||!a||!b||!t||!bt)return null;
  const minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minY=Math.min(t.y,bt.y),maxY=Math.max(t.y,bt.y);
  const width=maxX-minX,height=maxY-minY;
  if(width<this.minEyeWidth||height<.002)return null;
  return{x:(i.x-minX)/width,y:(i.y-minY)/height,width,height};
 }
 rawFromLandmarks(landmarks){
  if(!Array.isArray(landmarks)||landmarks.length<478)return null;
  const e1=this.eye(landmarks,{iris:468,corners:[33,133],top:159,bottom:145});
  const e2=this.eye(landmarks,{iris:473,corners:[362,263],top:386,bottom:374});
  if(!e1||!e2)return null;
  const symmetry=clamp(1-Math.hypot(e1.x-e2.x,e1.y-e2.y)/.48);
  const size=clamp(((e1.width+e2.width)/2-this.minEyeWidth)/.035);
  return{x:(e1.x+e2.x)/2,y:(e1.y+e2.y)/2,confidence:clamp(.35+symmetry*.4+size*.25),eyeWidth:(e1.width+e2.width)/2};
 }
 setCalibration(points){
  const p=points||{},required=['center','left','right','top','bottom'];
  if(!required.every(k=>p[k]&&Number.isFinite(p[k].x)&&Number.isFinite(p[k].y)))return false;
  const dxL=Math.abs(p.center.x-p.left.x),dxR=Math.abs(p.right.x-p.center.x),dyT=Math.abs(p.center.y-p.top.y),dyB=Math.abs(p.bottom.y-p.center.y);
  if(Math.min(dxL,dxR,dyT,dyB)<.006)return false;
  this.calibration=JSON.parse(JSON.stringify(p));
  this.last=null;
  return true;
 }
 clearCalibration(){this.calibration=null;this.last=null}
 mapAxis(value,aRaw,cRaw,bRaw,aScreen=.12,cScreen=.5,bScreen=.88){
  if(value===cRaw)return cScreen;
  if((value-cRaw)*(aRaw-cRaw)>=0){
   const d=aRaw-cRaw;if(Math.abs(d)<1e-6)return cScreen;
   return cScreen+(value-cRaw)/d*(aScreen-cScreen);
  }
  const d=bRaw-cRaw;if(Math.abs(d)<1e-6)return cScreen;
  return cScreen+(value-cRaw)/d*(bScreen-cScreen);
 }
 mapRaw(raw){
  if(!raw||!this.calibration)return null;
  const p=this.calibration;
  const x=this.mapAxis(raw.x,p.left.x,p.center.x,p.right.x);
  const y=this.mapAxis(raw.y,p.top.y,p.center.y,p.bottom.y);
  return{x:clamp(x),y:clamp(y)};
 }
 estimate(landmarks){
  const raw=this.rawFromLandmarks(landmarks);
  if(!raw)return null;
  const mapped=this.mapRaw(raw);
  const sample={rawX:raw.x,rawY:raw.y,confidence:raw.confidence,eyeWidth:raw.eyeWidth,calibrated:!!mapped,x:mapped?.x??null,y:mapped?.y??null};
  if(mapped){
   if(this.last){sample.x=this.last.x*(1-this.smoothing)+sample.x*this.smoothing;sample.y=this.last.y*(1-this.smoothing)+sample.y*this.smoothing}
   this.last={x:sample.x,y:sample.y};
  }
  return sample;
 }
 snapshot(){return{calibrated:!!this.calibration,calibration:this.calibration?JSON.parse(JSON.stringify(this.calibration)):null,last:this.last?{...this.last}:null}}
 static medianSamples(samples){
  if(!Array.isArray(samples)||!samples.length)return null;
  const x=median(samples.map(s=>s.rawX??s.x)),y=median(samples.map(s=>s.rawY??s.y));
  return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
 }
}

export class AirGazeHandFusion{
 constructor(options={}){
  this.mode=['off','assist','fusion'].includes(String(options.mode||'off').toLowerCase())?String(options.mode||'off').toLowerCase():'off';
  this.maxGazeAge=Number.isFinite(options.maxGazeAge)?options.maxGazeAge:480;
  this.gaze=null;this.last=null;this.listeners=new Set();
 }
 setMode(mode){
  mode=String(mode||'off').toLowerCase();
  if(!['off','assist','fusion'].includes(mode))return false;
  this.mode=mode;this.emit();return true;
 }
 updateGaze(gaze){
  if(!gaze||!Number.isFinite(gaze.x)||!Number.isFinite(gaze.y)){this.gaze=null;return null}
  this.gaze={x:clamp(gaze.x),y:clamp(gaze.y),confidence:clamp(Number(gaze.confidence)||0),timestamp:Number(gaze.timestamp)||Date.now()};
  return{...this.gaze};
 }
 pointIn(p,t){return p.x>=t.left&&p.x<=t.right&&p.y>=t.top&&p.y<=t.bottom}
 distanceToRect(p,t){
  const dx=p.x<t.left?t.left-p.x:p.x>t.right?p.x-t.right:0;
  const dy=p.y<t.top?t.top-p.y:p.y>t.bottom?p.y-t.bottom:0;
  return Math.hypot(dx,dy);
 }
 scoreTarget(hand,gaze,t){
  const hd=this.distanceToRect(hand,t),gd=this.distanceToRect(gaze,t);
  const handScore=this.pointIn(hand,t)?1:Math.exp(-(hd*hd)/(2*.105*.105));
  const gazeScore=this.pointIn(gaze,t)?1:Math.exp(-(gd*gd)/(2*.17*.17));
  const combined=handScore*.68+gazeScore*.32*gaze.confidence;
  return{target:t,handScore,gazeScore,combined};
 }
 resolve(hand,targets=[]){
  const base={x:clamp(Number(hand?.x)||0),y:clamp(Number(hand?.y)||0)};
  const gaze=this.gaze,age=gaze?Date.now()-gaze.timestamp:Infinity;
  if(this.mode==='off'||!gaze||age>this.maxGazeAge||gaze.confidence<.28){
   this.last={...base,mode:this.mode,assisted:false,target:null,agreement:0,gazeAvailable:false};return{...this.last};
  }
  const clean=Array.isArray(targets)?targets.filter(t=>t&&Number.isFinite(t.left)&&Number.isFinite(t.top)&&Number.isFinite(t.right)&&Number.isFinite(t.bottom)): [];
  if(!clean.length){
   if(this.mode==='fusion'){
    const w=.08+.12*gaze.confidence;
    this.last={x:base.x*(1-w)+gaze.x*w,y:base.y*(1-w)+gaze.y*w,mode:this.mode,assisted:true,target:null,agreement:gaze.confidence,gazeAvailable:true};
   }else this.last={...base,mode:this.mode,assisted:false,target:null,agreement:gaze.confidence,gazeAvailable:true};
   return{...this.last};
  }
  const ranked=clean.map(t=>this.scoreTarget(base,gaze,t)).sort((a,b)=>b.combined-a.combined),best=ranked[0],second=ranked[1];
  const margin=best.combined-(second?.combined||0);
  const agree=clamp((best.handScore*.55+best.gazeScore*.45)*gaze.confidence);
  const eligible=best.handScore>.16&&best.gazeScore>.28&&best.combined>.38&&margin>.025;
  if(!eligible){
   this.last={...base,mode:this.mode,assisted:false,target:null,agreement:agree,gazeAvailable:true};return{...this.last};
  }
  const cx=(best.target.left+best.target.right)/2,cy=(best.target.top+best.target.bottom)/2;
  const alreadyInside=this.pointIn(base,best.target);
  let snap=0;
  if(!alreadyInside)snap=(this.mode==='fusion'?.34:.18)*(.55+.45*gaze.confidence);
  else if(this.mode==='fusion')snap=.06*gaze.confidence;
  const out={x:clamp(base.x+(cx-base.x)*snap),y:clamp(base.y+(cy-base.y)*snap),mode:this.mode,assisted:snap>0,target:best.target.id??null,agreement:agree,gazeAvailable:true,score:best.combined};
  this.last=out;this.emit();return{...out};
 }
 snapshot(){return{mode:this.mode,gaze:this.gaze?{...this.gaze}:null,last:this.last?{...this.last}:null}}
 subscribe(fn){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);return()=>this.listeners.delete(fn)}
 emit(){const s=this.snapshot();for(const fn of this.listeners){try{fn(s)}catch(e){}}}
}

export default {AirIrisGazeEstimator,AirGazeHandFusion};

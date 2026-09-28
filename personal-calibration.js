window.AirPersonalCalibration=class{
constructor(){this.listeners={};this.active=false;this.stage='idle';this.stageAt=0;this.scales=[];this.pinchSamples=[];this.pinching=false;this.currentMin=Infinity;this.result=null;}
on(n,f){(this.listeners[n]??=[]).push(f);return this}
emit(n,d={}){(this.listeners[n]||[]).forEach(f=>f(d))}
dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
median(a){if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2}
clamp(v,a,b){return Math.max(a,Math.min(b,v))}
start(){this.active=true;this.stage='neutral';this.stageAt=performance.now();this.scales=[];this.pinchSamples=[];this.pinching=false;this.currentMin=Infinity;this.result=null;this.emit('stage',{stage:'neutral',progress:0,text:'Tieni la mano rilassata nella tua posizione naturale.'});}
stop(){this.active=false;this.stage='idle';this.emit('stage',{stage:'idle',progress:0,text:'Calibrazione interrotta.'})}
observe(l){if(!this.active||!l)return;const now=performance.now(),scale=this.dist(l[0],l[9]);if(this.stage==='neutral'){if(Number.isFinite(scale)&&scale>.06&&scale<.36)this.scales.push(scale);const p=this.clamp((now-this.stageAt)/2200,0,1);this.emit('stage',{stage:'neutral',progress:p,text:'Tieni la mano rilassata nella tua posizione naturale.'});if(p>=1&&this.scales.length>12){this.stage='pinch';this.stageAt=now;this.emit('stage',{stage:'pinch',progress:0,count:0,text:'Esegui lentamente 3 pinch completi: pollice e indice insieme, poi separali.'})}return}
if(this.stage==='pinch'){const hs=Math.max(.06,scale),ratio=this.dist(l[4],l[8])/hs;if(!this.pinching&&ratio<.40){this.pinching=true;this.currentMin=ratio}else if(this.pinching){this.currentMin=Math.min(this.currentMin,ratio);if(ratio>.58){this.pinching=false;if(Number.isFinite(this.currentMin))this.pinchSamples.push(this.currentMin);this.currentMin=Infinity}}
const count=Math.min(3,this.pinchSamples.length),p=count/3;this.emit('stage',{stage:'pinch',progress:p,count,text:`Pinch riconosciuti: ${count}/3`});if(count>=3){const refScale=this.clamp(this.median(this.scales),.10,.28),pinchRatio=this.median(this.pinchSamples),baseline=.050/.18,pinchFactor=this.clamp(pinchRatio/baseline,.86,1.14);this.result={refScale,pinchFactor,pinchRatio,samples:this.pinchSamples.length,createdAt:Date.now()};this.active=false;this.stage='done';this.emit('done',{...this.result});this.emit('stage',{stage:'done',progress:1,text:'Profilo personale pronto.'})}}
}
};
export class AirRobustnessCore{
 constructor({recovery=null,guard=null,light=null}={}){this.recovery=recovery;this.guard=guard;this.light=light;this.listeners=new Set();this.unsub=[];this.last=null;this.priorities={READY:0,'LOW LIGHT':1,DEGRADED:2,RECOVERING:3,'NO HAND':4};for(const source of [recovery,guard,light]){if(source?.subscribe)this.unsub.push(source.subscribe(()=>this.refresh()))}this.refresh()}
 derive(){const recovery=this.recovery?.snapshot?.()||{pendingLoss:false,active:false,recoveries:0},guard=this.guard?.snapshot?.()||{guarding:false,badFrames:0,goodFrames:0,triggers:0},light=this.light?.snapshot?.()||{level:'WAIT',luminance:0,low:false,dim:false};let state='READY',source='nominal';if(light.dim){state='LOW LIGHT';source='light'}if((guard.badFrames||0)>0&&!guard.guarding){state='DEGRADED';source='quality'}if(guard.guarding||recovery.active){state='RECOVERING';source=guard.guarding?'quality+recovery':'recovery'}if(recovery.pendingLoss&&!recovery.active){state='NO HAND';source='hand'}const commandSafe=state==='READY'||state==='LOW LIGHT';return{state,source,commandSafe,recovery:{...recovery},guard:{...guard},light:{...light},priority:this.priorities[state]||0,timestamp:Date.now()}}
 refresh(){const next=this.derive(),key=JSON.stringify([next.state,next.recovery.recoveries||0,next.guard.triggers||0,next.guard.badFrames||0,next.light.level,next.light.luminance,next.commandSafe]),prevKey=this.last?.__key;if(prevKey===key)return this.snapshot();this.last={...next,__key:key};for(const fn of this.listeners){try{fn(this.snapshot())}catch(e){}}return this.snapshot()}
 snapshot(){if(!this.last)this.last={...this.derive(),__key:''};const {__key,...out}=this.last;return{...out,recovery:{...out.recovery},guard:{...out.guard},light:{...out.light}}}
 subscribe(fn){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);try{fn(this.snapshot())}catch(e){}return()=>this.listeners.delete(fn)}
 get state(){return this.snapshot().state}
 get commandSafe(){return this.snapshot().commandSafe}
 destroy(){for(const fn of this.unsub){try{fn()}catch(e){}}this.unsub=[];this.listeners.clear()}
}

export default AirRobustnessCore;

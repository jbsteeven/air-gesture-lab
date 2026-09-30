export class AirLowLightMonitor{
 constructor(options={}){this.low=Number.isFinite(options.low)?options.low:44;this.dim=Number.isFinite(options.dim)?options.dim:66;this.alpha=Number.isFinite(options.alpha)?options.alpha:.30;this.lowConfirm=Number.isFinite(options.lowConfirm)?options.lowConfirm:3;this.goodConfirm=Number.isFinite(options.goodConfirm)?options.goodConfirm:2;this.ema=null;this.level='WAIT';this.samples=0;this.lowStreak=0;this.goodStreak=0;this.listeners=new Set()}
 classify(v){if(v<this.low)return'LOW';if(v<this.dim)return'DIM';return'OK'}
 updateLuminance(value){const v=Number(value);if(!Number.isFinite(v)||v<0)return this.snapshot();this.ema=this.ema===null?v:this.ema*(1-this.alpha)+v*this.alpha;this.samples++;const proposed=this.classify(this.ema);if(proposed==='OK'){this.goodStreak++;this.lowStreak=0;if(this.goodStreak>=this.goodConfirm)this.level='OK'}else{this.lowStreak++;this.goodStreak=0;if(this.lowStreak>=this.lowConfirm)this.level=proposed}const s=this.snapshot();this.emit(s);return s}
 updateImageData(data){if(!data||!data.length)return this.snapshot();let sum=0,n=0;for(let i=0;i<data.length;i+=4){sum+=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];n++}return n?this.updateLuminance(sum/n):this.snapshot()}
 snapshot(){return{level:this.level,luminance:Math.round(this.ema||0),low:this.level==='LOW',dim:this.level==='LOW'||this.level==='DIM',samples:this.samples}}
 subscribe(fn){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);try{fn(this.snapshot())}catch(e){}return()=>this.listeners.delete(fn)}
 emit(s){for(const fn of this.listeners){try{fn({...s})}catch(e){}}}
 reset(){this.ema=null;this.level='WAIT';this.samples=0;this.lowStreak=0;this.goodStreak=0;const s=this.snapshot();this.emit(s);return s}
}

export default AirLowLightMonitor;

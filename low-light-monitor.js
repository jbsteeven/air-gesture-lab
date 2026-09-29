(()=>{
const video=document.querySelector('#camera');if(!video)return;
const W=24,H=18,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return;
let ema=null,level='WAIT',samples=0,lowStreak=0,goodStreak=0,hideTimer=0;
const state={level:'WAIT',luminance:0,low:false,dim:false,samples:0};
function ensureUi(){if(document.querySelector('#lightMonitorBadge'))return;const el=document.createElement('div');el.id='lightMonitorBadge';el.hidden=true;el.innerHTML='<span>AMBIENT LIGHT</span><b id="lightMonitorName">WAIT</b><small id="lightMonitorHint">—</small>';document.body.appendChild(el);const st=document.createElement('style');st.id='lightMonitorStyle';st.textContent='#lightMonitorBadge{position:fixed;right:12px;bottom:58px;min-width:138px;padding:7px 9px;border:1px solid #ffd27a3b;border-radius:11px;background:#071018df;backdrop-filter:blur(8px);z-index:28;text-align:right;box-shadow:0 0 20px #06101977}#lightMonitorBadge[hidden]{display:none}#lightMonitorBadge span,#lightMonitorBadge small{display:block;font-size:6px;letter-spacing:.11em;color:#71818a}#lightMonitorBadge b{display:block;margin:2px 0;font-size:8px;letter-spacing:.09em;color:#ffd27a}';document.head.appendChild(st)}
function show(name,hint){ensureUi();clearTimeout(hideTimer);const box=document.querySelector('#lightMonitorBadge');if(!box)return;box.hidden=false;const n=document.querySelector('#lightMonitorName'),h=document.querySelector('#lightMonitorHint');if(n)n.textContent=name;if(h)h.textContent=hint}
function hide(delay=0){const box=document.querySelector('#lightMonitorBadge');if(!box)return;clearTimeout(hideTimer);if(delay)hideTimer=setTimeout(()=>{box.hidden=true},delay);else box.hidden=true}
function publish(){state.level=level;state.luminance=Math.round(ema||0);state.low=level==='LOW';state.dim=level==='LOW'||level==='DIM';state.samples=samples;window.dispatchEvent(new CustomEvent('airlightchange',{detail:{...state}}))}
function classify(v){if(v<44)return'LOW';if(v<66)return'DIM';return'OK'}
function sample(){
 if(document.hidden||video.readyState<2||!video.videoWidth||!video.videoHeight)return;
 try{ctx.drawImage(video,0,0,W,H);const d=ctx.getImageData(0,0,W,H).data;let sum=0;for(let i=0;i<d.length;i+=4)sum+=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];const mean=sum/(d.length/4);ema=ema===null?mean:ema*.70+mean*.30;samples++;
 const proposed=classify(ema);
 if(proposed==='OK'){goodStreak++;lowStreak=0;if(goodStreak>=2)level='OK'}else{lowStreak++;goodStreak=0;if(lowStreak>=3)level=proposed}
 if(level==='LOW')show('LIGHT LOW · '+Math.round(ema),'AUMENTA LA LUCE FRONTALE');else if(level==='DIM')show('LIGHT DIM · '+Math.round(ema),'PIÙ LUCE MIGLIORA IL TRACKING');else if(level==='OK')hide(700);
 publish();
 }catch(e){}
}
ensureUi();setInterval(sample,850);setTimeout(sample,1200);window.AirLightMonitor={get state(){return{...state}},sample};
})();
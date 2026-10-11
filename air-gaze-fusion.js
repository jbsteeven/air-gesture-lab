(()=>{
const ENABLE_KEY='air_gaze_enabled',MODE_KEY='air_gaze_mode',CAL_KEY='air_gaze_calibration';
const FRAME_INTERVAL=80,CAL_TARGET=7,CAL_MIN=3,CAL_TIMEOUT=3200;
let enabled=localStorage.getItem(ENABLE_KEY)==='1';
let mode=['assist','fusion'].includes(localStorage.getItem(MODE_KEY))?localStorage.getItem(MODE_KEY):'assist';
let calibration=loadCalibration(),estimator=null,fusion=null,faceMesh=null,initPromise=null,busy=false,lastProcess=0,lastGaze=null,lastFusion=null,statusText='OFF',calRun=0,calCapture=null;
const listeners=new Set(),gazeListeners=new Set(),fusionListeners=new Set();
function loadCalibration(){try{const v=JSON.parse(localStorage.getItem(CAL_KEY)||'null');return v&&v.center&&v.left&&v.right&&v.top&&v.bottom?v:null}catch(e){return null}}
function save(){try{localStorage.setItem(ENABLE_KEY,enabled?'1':'0');localStorage.setItem(MODE_KEY,mode);if(calibration)localStorage.setItem(CAL_KEY,JSON.stringify(calibration));else localStorage.removeItem(CAL_KEY)}catch(e){}}
function snapshot(){return{enabled,mode,calibrated:!!calibration,status:statusText,gaze:lastGaze?{...lastGaze}:null,fusion:lastFusion?{...lastFusion}:null}}
function emitState(){const s=snapshot();for(const fn of listeners){try{fn(s)}catch(e){}}try{window.dispatchEvent(new CustomEvent('airgazechange',{detail:s}))}catch(e){}renderState();return s}
function emitGaze(g){for(const fn of gazeListeners){try{fn({...g})}catch(e){}}try{window.dispatchEvent(new CustomEvent('airgaze',{detail:{...g}}))}catch(e){}}
function emitFusion(f){for(const fn of fusionListeners){try{fn({...f})}catch(e){}}try{window.dispatchEvent(new CustomEvent('airgazefusion',{detail:{...f}}))}catch(e){}}
function setStatus(s){if(statusText===s)return;statusText=s;emitState()}
function loadScript(src,id){return new Promise((resolve,reject)=>{if(window.FaceMesh)return resolve();const old=document.getElementById(id);if(old){old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return}const sc=document.createElement('script');sc.id=id;sc.src=src;sc.async=true;sc.onload=resolve;sc.onerror=()=>reject(new Error('Face Mesh non disponibile'));document.head.appendChild(sc)})}
async function ensureRuntime(){
 if(estimator&&fusion&&faceMesh)return true;
 if(initPromise)return initPromise;
 initPromise=(async()=>{
  setStatus('CARICAMENTO');
  const mod=await import('./sdk/fusion/index.mjs?v=251');
  estimator=new mod.AirIrisGazeEstimator({smoothing:.30,minEyeWidth:.008,calibration});
  fusion=new mod.AirGazeHandFusion({mode:enabled?mode:'off',maxGazeAge:520});
  await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js','airFaceMeshScript');
  faceMesh=new FaceMesh({locateFile:f=>'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/'+f});
  faceMesh.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:.45,minTrackingConfidence:.45});
  faceMesh.onResults(onFaceResults);
  setStatus(calibration?'READY':'DA CALIBRARE');
  return true;
 })().catch(e=>{initPromise=null;statusText='ERRORE';emitState();throw e});
 return initPromise;
}
function onFaceResults(r){
 if(!enabled||!estimator)return;
 const lm=r.multiFaceLandmarks&&r.multiFaceLandmarks[0];
 if(!lm){
  lastGaze=null;if(fusion)fusion.updateGaze(null);
  if(calCapture?.collecting)setCalPhase('VOLTO NON RILEVATO · RESTA DAVANTI ALLA CAMERA');
  setStatus(calCapture?'CALIBRAZIONE':calibration?'VOLTO NON RILEVATO':'DA CALIBRARE');
  return;
 }
 if(lm.length<478){
  if(calCapture?.collecting)setCalPhase('IRIDE NON DISPONIBILE SU QUESTO FRAME');
  setStatus('IRIDE NON DISPONIBILE');
  return;
 }
 const g=estimator.estimate(lm);
 if(!g){
  if(calCapture?.collecting)setCalPhase('OCCHI NON LEGGIBILI · MIGLIORA LA LUCE');
  return;
 }
 if(calCapture&&calCapture.collecting&&Number.isFinite(g.rawX)&&Number.isFinite(g.rawY)&&g.confidence>=.30){
  calCapture.samples.push({rawX:g.rawX,rawY:g.rawY,confidence:g.confidence});
 }
 if(g.calibrated&&Number.isFinite(g.x)&&Number.isFinite(g.y)){
  lastGaze={x:g.x,y:g.y,confidence:g.confidence,timestamp:Date.now(),rawX:g.rawX,rawY:g.rawY};
  fusion.updateGaze(lastGaze);if(!calCapture)setStatus('READY');emitGaze(lastGaze);
 }else if(!calCapture)setStatus('DA CALIBRARE');
}
async function processFrame(video){
 if(!enabled||!video)return false;
 const now=performance.now();if(busy||now-lastProcess<FRAME_INTERVAL)return false;lastProcess=now;
 try{await ensureRuntime()}catch(e){return false}
 if(!faceMesh)return false;
 busy=true;
 try{await faceMesh.send({image:video});return true}
 catch(e){setStatus('ERRORE');return false}
 finally{busy=false}
}
function targetRects(elements){
 const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);
 return (Array.isArray(elements)?elements:[]).filter(el=>el&&!el.hidden&&el.getBoundingClientRect).map((el,i)=>{const r=el.getBoundingClientRect();return{id:el.dataset?.id||el.id||String(i),left:r.left/w,top:r.top/h,right:r.right/w,bottom:r.bottom/h}}).filter(t=>t.right>0&&t.left<1&&t.bottom>0&&t.top<1);
}
function resolvePointer(hand,elements=[]){
 if(!enabled||!fusion||!calibration)return hand;
 const out=fusion.resolve(hand,targetRects(elements));lastFusion=out;
 if(out.gazeAvailable)emitFusion(out);
 updateHud();
 return{x:out.x,y:out.y,fusion:out};
}
function setEnabled(v){
 enabled=!!v;save();
 if(!enabled){fusion?.setMode('off');lastFusion=null;statusText='OFF';emitState();return snapshot()}
 statusText=calibration?'AVVIO':'DA CALIBRARE';emitState();ensureRuntime().then(()=>{fusion?.setMode(mode);emitState()}).catch(()=>{});
 return snapshot()
}
function setMode(v){
 v=String(v||'').toLowerCase();if(!['assist','fusion'].includes(v))return false;
 mode=v;save();if(fusion)fusion.setMode(enabled?mode:'off');emitState();return true
}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
function setCalUi(name,x,y,phase){
 const dot=document.querySelector('#airGazeDot'),label=document.querySelector('#airGazeCalLabel'),phaseEl=document.querySelector('#airGazeCalPhase');
 if(dot){dot.style.left=(x*100)+'%';dot.style.top=(y*100)+'%'}
 if(label)label.textContent=name;
 if(phaseEl)phaseEl.textContent=phase;
}
function setCalPhase(phase){const phaseEl=document.querySelector('#airGazeCalPhase');if(phaseEl)phaseEl.textContent=phase}
async function collectPoint(name,x,y,key,run){
 if(run!==calRun)throw new Error('cancel');
 calCapture={collecting:false,samples:[],name,x,y,key};
 setCalUi(name,x,y,'GUARDA IL PUNTO');
 await wait(700);
 if(run!==calRun)throw new Error('cancel');
 calCapture.collecting=true;
 const started=performance.now();
 while(run===calRun&&performance.now()-started<CAL_TIMEOUT&&calCapture.samples.length<CAL_TARGET){
  setCalPhase('ACQUISIZIONE '+calCapture.samples.length+'/'+CAL_TARGET);
  await wait(140);
 }
 calCapture.collecting=false;
 const count=calCapture.samples.length;
 setCalPhase('CAMPIONI '+count+' · ELABORAZIONE');
 if(count<CAL_MIN)throw new Error('samples');
 const point=estimator.constructor.medianSamples(calCapture.samples);
 if(!point)throw new Error('samples');
 await wait(220);
 return point;
}
async function startCalibration(){
 const video=document.querySelector('#camera');
 if(!video||video.readyState<2){setStatus('ATTIVA PRIMA I GESTI');return false}
 if(!enabled)setEnabled(true);
 try{await ensureRuntime()}catch(e){return false}
 const overlay=document.querySelector('#airGazeCalibration');if(!overlay)return false;
 const run=++calRun;overlay.hidden=false;document.body.classList.add('air-gaze-calibrating');setStatus('CALIBRAZIONE');
 const steps=[['CENTRO',.5,.5,'center'],['SINISTRA',.14,.5,'left'],['DESTRA',.86,.5,'right'],['ALTO',.5,.14,'top'],['BASSO',.5,.86,'bottom']],points={};
 try{
  setCalUi('PREPARAZIONE',.5,.5,'RILEVAMENTO OCCHI…');
  await wait(650);
  for(const [name,x,y,key] of steps)points[key]=await collectPoint(name,x,y,key,run);
  if(!estimator.setCalibration(points))throw new Error('geometry');
  calibration=points;save();lastGaze=null;fusion.updateGaze(null);
  setCalUi('OK',.5,.5,'CALIBRAZIONE COMPLETATA');setStatus('READY');await wait(850);
  return true;
 }catch(e){
  if(e.message!=='cancel'){
   const msg=e.message==='samples'?'POCHI CAMPIONI · RESTA FERMO, AVVICINA IL VISO O MIGLIORA LA LUCE':'MOVIMENTO DELLO SGUARDO TROPPO RIDOTTO · RIPROVA';
   setCalUi('RIPROVA',.5,.5,msg);setStatus('DA CALIBRARE');await wait(1700);
  }
  return false;
 }finally{
  if(run===calRun){overlay.hidden=true;document.body.classList.remove('air-gaze-calibrating');calCapture=null}
 }
}
function cancelCalibration(){calRun++;calCapture=null;const o=document.querySelector('#airGazeCalibration');if(o)o.hidden=true;document.body.classList.remove('air-gaze-calibrating');setStatus(calibration?'READY':'DA CALIBRARE')}
function resetCalibration(){calibration=null;estimator?.clearCalibration();lastGaze=null;fusion?.updateGaze(null);save();setStatus(enabled?'DA CALIBRARE':'OFF');return snapshot()}
function ensureUi(){
 const panel=document.querySelector('#airSettingsPanel');if(!panel||document.querySelector('#airGazeToggle'))return;
 const row=document.createElement('div');row.className='airGazeSettings';row.innerHTML='<div class="airSettingRow airGazeMain"><div><b>Gaze-Hand Fusion <em>EXPERIMENTAL</em></b><small>Usa lo sguardo come segnale aggiuntivo per affinare il bersaglio della mano. OFF di default.</small></div><button type="button" id="airGazeToggle" role="switch" aria-checked="false"><span></span><em>OFF</em></button></div><div id="airGazeOptions"><div class="airGazeMode"><label for="airGazeMode">MODALITÀ</label><select id="airGazeMode"><option value="assist">ASSIST</option><option value="fusion">FUSION</option></select></div><div class="airGazeCalActions"><button type="button" id="airGazeCalibrate">CALIBRA SGUARDO</button><button type="button" id="airGazeReset">AZZERA</button></div><small id="airGazeSettingsState">OFF</small></div>';
 const vocab=document.querySelector('#airVocabularySection');panel.insertBefore(row,vocab||null);
 document.querySelector('#airGazeToggle').addEventListener('click',()=>setEnabled(!enabled));
 document.querySelector('#airGazeMode').addEventListener('change',e=>setMode(e.target.value));
 document.querySelector('#airGazeCalibrate').addEventListener('click',startCalibration);
 document.querySelector('#airGazeReset').addEventListener('click',resetCalibration);
 const cal=document.createElement('div');cal.id='airGazeCalibration';cal.hidden=true;cal.innerHTML='<button type="button" id="airGazeCalCancel" aria-label="Annulla">×</button><div id="airGazeDot"></div><div id="airGazeCalCopy"><span id="airGazeCalLabel">CENTRO</span><b id="airGazeCalPhase">GUARDA IL PUNTO</b><small>Tieni il telefono fermo. Guarda ogni punto senza muovere la testa; la fase avanza quando ha raccolto abbastanza campioni.</small></div>';document.body.appendChild(cal);
 document.querySelector('#airGazeCalCancel').addEventListener('click',cancelCalibration);
 const hud=document.createElement('div');hud.id='airGazeHud';hud.hidden=true;hud.innerHTML='<span>GAZE + HAND</span><b id="airGazeHudMode">ASSIST</b><small id="airGazeHudState">DA CALIBRARE</small>';document.body.appendChild(hud);
 renderState()
}
function renderState(){
 const t=document.querySelector('#airGazeToggle'),opts=document.querySelector('#airGazeOptions'),sel=document.querySelector('#airGazeMode'),s=document.querySelector('#airGazeSettingsState'),hud=document.querySelector('#airGazeHud');
 if(t){t.classList.toggle('on',enabled);t.setAttribute('aria-checked',enabled?'true':'false');const e=t.querySelector('em');if(e)e.textContent=enabled?'ON':'OFF'}
 if(opts)opts.classList.toggle('disabled',!enabled);if(sel)sel.value=mode;if(s)s.textContent=statusText+(calibration?' · CALIBRATO':'');
 if(hud)hud.hidden=!enabled;updateHud()
}
function updateHud(){
 const m=document.querySelector('#airGazeHudMode'),s=document.querySelector('#airGazeHudState');if(m)m.textContent=mode.toUpperCase();
 if(s){const c=lastGaze?Math.round(lastGaze.confidence*100):0,a=lastFusion?Math.round((lastFusion.agreement||0)*100):0;s.textContent=statusText+(lastGaze?' · G '+c+'%':'')+(lastFusion?.target?' · '+String(lastFusion.target).toUpperCase()+' '+a+'%':'')}
}
ensureUi();
if(enabled){statusText=calibration?'AVVIO':'DA CALIBRARE';ensureRuntime().catch(()=>{})}
window.AirGazeFusion=Object.freeze({
 get enabled(){return enabled},get mode(){return mode},get calibrated(){return!!calibration},get state(){return snapshot()},
 setEnabled,setMode,startCalibration,cancelCalibration,resetCalibration,processFrame,resolvePointer,snapshot,
 subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);try{fn(snapshot())}catch(e){}return()=>listeners.delete(fn)},
 onGaze(fn){if(typeof fn!=='function')return()=>{};gazeListeners.add(fn);return()=>gazeListeners.delete(fn)},
 onFusion(fn){if(typeof fn!=='function')return()=>{};fusionListeners.add(fn);return()=>fusionListeners.delete(fn)}
});
emitState();
})();

import {AirGestureEngine} from './core/gesture-engine.mjs';
import {AirCommandRouter} from './core/command-router.mjs';
import {AirHandRecovery,AirTrackingQualityGuard,AirLowLightMonitor,AirRobustnessCore} from './robustness/index.mjs';

export {AirGestureEngine,AirCommandRouter,AirHandRecovery,AirTrackingQualityGuard,AirLowLightMonitor,AirRobustnessCore};
export const VERSION='2.2.0';

const BASE_EVENTS=['gesture','pointer','pose','intent','tracking','mode','profile','adaptive','calibration','command','context'];
const ROBUST_EVENTS=['recovery','qualityguard','light','robustness'];

export function createGestureRuntime(options={}){
 const engineOptions=options.engine||options.engineOptions||{};
 const engine=new AirGestureEngine(engineOptions);
 const router=new AirCommandRouter();
 const listeners=new Map();
 const routeGestures=options.routeGestures!==false;
 const robustEnabled=options.robustness===true;
 const setFor=name=>{if(!listeners.has(name))listeners.set(name,new Set());return listeners.get(name)};
 const emit=(name,payload)=>{for(const fn of setFor(name)){try{fn(payload)}catch(e){}}};
 const on=(name,fn)=>{if(typeof fn!=='function')return()=>{};setFor(name).add(fn);return()=>setFor(name).delete(fn)};
 const once=(name,fn)=>{let off=()=>{};off=on(name,p=>{off();fn(p)});return off};
 ['gesture','pointer','pose','intent','tracking','mode','profile','adaptive','calibration'].forEach(name=>engine.on(name,p=>emit(name,p)));
 router.on('command',p=>emit('command',p)).on('context',p=>emit('context',p));
 if(routeGestures)engine.on('gesture',g=>router.route(g));
 if(options.context)router.setContext(options.context);
 let recovery=null,guard=null,light=null,robustness=null;
 if(robustEnabled){
  recovery=new AirHandRecovery(engine,options.recovery||{});
  light=new AirLowLightMonitor(options.light||{});
  guard=new AirTrackingQualityGuard(engine,options.guard||{}).attachRecovery(recovery);
  robustness=new AirRobustnessCore({recovery,guard,light});
  recovery.subscribe(e=>{if(e.phase!=='snapshot')emit('recovery',e)});
  guard.subscribe(e=>{if(e.phase!=='snapshot')emit('qualityguard',e)});
  light.subscribe(s=>emit('light',s));
  robustness.subscribe(s=>emit('robustness',s));
 }
 function processLandmarks(landmarks){
  if(!Array.isArray(landmarks)||landmarks.length<21)return false;
  if(robustEnabled){
   const rs=recovery.snapshot(),gs=guard.snapshot();
   if(rs.pendingLoss||rs.active||gs.guarding){const rr=recovery.process(landmarks);if(rr.recovered)guard.markRecoveryReady();if(!rr.allow)return false}
   else{const calibrating=typeof options.isCalibrating==='function'?!!options.isCalibrating():false,gr=guard.observe(landmarks,{dim:light.snapshot().dim,calibrating});if(!gr.allow)return false}
  }
  engine.process(landmarks);return true
 }
 const api={
  VERSION,
  engine,
  router,
  recovery,
  guard,
  light,
  robustness,
  events:[...BASE_EVENTS,...(robustEnabled?ROBUST_EVENTS:[])],
  on,
  once,
  processLandmarks,
  markHandLost(reason='detector-no-hand'){if(!recovery)return false;recovery.markLost(reason);return true},
  updateLuminance(value){return light?light.updateLuminance(value):null},
  updateImageData(data){return light?light.updateImageData(data):null},
  setContext(name){return router.setContext(name)},
  setProfile(name){return engine.setProfile(name)},
  setAdaptiveScale(value){return engine.setAdaptiveScale(value)},
  setPersonalCalibration(profile){return engine.setPersonalCalibration(profile)},
  snapshot(){return{version:VERSION,context:router.context,profile:engine.profile,adaptiveScale:!!engine.adaptiveScale,personal:{...engine.personal},refScale:engine.refScale,commandReady:!!engine.commandReady,stats:{...engine.stats},robustness:robustness?.snapshot?.()||null}},
  destroy(){robustness?.destroy?.();listeners.clear()}
 };
 return Object.freeze(api)
}

export function createRobustGestureRuntime(options={}){return createGestureRuntime({...options,robustness:true})}

export function getBrowserSDK(){return globalThis.AirGestureSDK||null}

export function whenBrowserSDK({timeout=5000}={}){
 const current=getBrowserSDK();if(current)return Promise.resolve(current);
 return new Promise((resolve,reject)=>{
  let timer=0;
  const done=()=>{globalThis.removeEventListener?.('airgesture:sdkready',ready);if(timer)clearTimeout(timer)};
  const ready=()=>{const sdk=getBrowserSDK();if(!sdk)return;done();resolve(sdk)};
  globalThis.addEventListener?.('airgesture:sdkready',ready,{once:true});
  if(timeout>0)timer=setTimeout(()=>{done();reject(new Error('AirGestureSDK non disponibile entro il timeout'))},timeout)
 })
}

export default {VERSION,AirGestureEngine,AirCommandRouter,AirHandRecovery,AirTrackingQualityGuard,AirLowLightMonitor,AirRobustnessCore,createGestureRuntime,createRobustGestureRuntime,getBrowserSDK,whenBrowserSDK};

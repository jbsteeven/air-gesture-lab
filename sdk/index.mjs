import {AirGestureEngine} from './core/gesture-engine.mjs';
import {AirCommandRouter} from './core/command-router.mjs';

export {AirGestureEngine,AirCommandRouter};
export const VERSION='2.1.0';

const EVENTS=['gesture','pointer','pose','intent','tracking','mode','profile','adaptive','calibration','command','context'];

export function createGestureRuntime(options={}){
 const engineOptions=options.engine||options.engineOptions||{};
 const engine=new AirGestureEngine(engineOptions);
 const router=new AirCommandRouter();
 const listeners=new Map();
 const routeGestures=options.routeGestures!==false;
 const setFor=name=>{if(!listeners.has(name))listeners.set(name,new Set());return listeners.get(name)};
 const emit=(name,payload)=>{for(const fn of setFor(name)){try{fn(payload)}catch(e){}}};
 const on=(name,fn)=>{if(typeof fn!=='function')return()=>{};setFor(name).add(fn);return()=>setFor(name).delete(fn)};
 const once=(name,fn)=>{let off=()=>{};off=on(name,p=>{off();fn(p)});return off};
 ['gesture','pointer','pose','intent','tracking','mode','profile','adaptive','calibration'].forEach(name=>engine.on(name,p=>emit(name,p)));
 router.on('command',p=>emit('command',p)).on('context',p=>emit('context',p));
 if(routeGestures)engine.on('gesture',g=>router.route(g));
 if(options.context)router.setContext(options.context);
 const api={
  VERSION,
  engine,
  router,
  events:[...EVENTS],
  on,
  once,
  processLandmarks(landmarks){if(!Array.isArray(landmarks)||landmarks.length<21)return false;engine.process(landmarks);return true},
  setContext(name){return router.setContext(name)},
  setProfile(name){return engine.setProfile(name)},
  setAdaptiveScale(value){return engine.setAdaptiveScale(value)},
  setPersonalCalibration(profile){return engine.setPersonalCalibration(profile)},
  snapshot(){return{version:VERSION,context:router.context,profile:engine.profile,adaptiveScale:!!engine.adaptiveScale,personal:{...engine.personal},refScale:engine.refScale,commandReady:!!engine.commandReady,stats:{...engine.stats}}}
 };
 return Object.freeze(api)
}

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

export default {VERSION,AirGestureEngine,AirCommandRouter,createGestureRuntime,getBrowserSDK,whenBrowserSDK};

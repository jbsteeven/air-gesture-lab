(()=>{
if(typeof engine==='undefined'||typeof router==='undefined')return;
const VERSION='2.4.0';
const events=new Map();
let enabled=true;
const originalRoute=router.route.bind(router);
const validEvents=['gesture','pointer','pose','intent','tracking','command','context','robustness','enabled','profile','adaptive','calibration','recovery','qualityguard','vocabulary','vocabularychange'];
const clone=v=>{if(v==null||typeof v!=='object')return v;try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
function setFor(name){if(!events.has(name))events.set(name,new Set());return events.get(name)}
function emit(name,payload){const data=clone(payload);for(const fn of setFor(name)){try{fn(data)}catch(e){}}try{window.dispatchEvent(new CustomEvent('airgesture:'+name,{detail:data}))}catch(e){}}
function on(name,fn){if(!validEvents.includes(name)||typeof fn!=='function')return()=>{};setFor(name).add(fn);return()=>setFor(name).delete(fn)}
function once(name,fn){if(typeof fn!=='function')return()=>{};let off=()=>{};off=on(name,data=>{off();fn(data)});return off}
function safePersonal(){const p=typeof personalProfile!=='undefined'&&personalProfile?personalProfile:null;if(!p)return null;return{refScale:Number(p.refScale)||null,pinchFactor:Number(p.pinchFactor)||null,pinchRatio:Number.isFinite(Number(p.pinchRatio))?Number(p.pinchRatio):null,createdAt:Number(p.createdAt)||0,importedAt:Number(p.importedAt)||0}}
function robustness(){return window.AirRobustnessCore?.snapshot?.()||{state:'READY',commandSafe:true}}
function vocabulary(){return window.AirGestureVocabulary?.snapshot?.()||{enabled:false,mapping:{},dictionary:[]}}
function metricsSnapshot(){try{return metrics?.snapshot?.()||null}catch(e){return null}}
function snapshot(){return{sdkVersion:VERSION,enabled,context:router.context,profile:engine.profile,adaptiveScale:!!engine.adaptiveScale,personal:safePersonal(),robustness:robustness(),vocabulary:vocabulary(),metrics:metricsSnapshot(),capabilities:{pointer:true,pinch:true,swipe:true,palm:true,fist:true,scroll:true,personalProfile:true,profilePassport:!!window.AirProfilePassport,robustnessCore:!!window.AirRobustnessCore,handRecovery:!!window.AirHandRecovery,qualityGuard:!!window.AirTrackingQualityGuard,lowLight:!!window.AirLightMonitor,vocabulary:!!window.AirGestureVocabulary,esmPackage:!!window.AirGestureESM}}}
function enable(){if(enabled)return snapshot();enabled=true;emit('enabled',{enabled:true});return snapshot()}
function disable(){if(!enabled)return snapshot();enabled=false;if(typeof engine.clearIntent==='function')engine.clearIntent();if(typeof engine.disarm==='function')engine.disarm();if(typeof resetDwell==='function')resetDwell(false);emit('enabled',{enabled:false});return snapshot()}
function setProfile(name){const ok=engine.setProfile(name);if(ok){try{localStorage.setItem('air_profile',name)}catch(e){}}return ok}
function setAdaptiveScale(value){const result=engine.setAdaptiveScale(!!value);try{localStorage.setItem('air_autotune',result?'1':'0')}catch(e){}return result}
function setPersonalCalibration(profile,{persist=true}={}){if(!profile||!Number.isFinite(Number(profile.refScale))||!Number.isFinite(Number(profile.pinchFactor)))return false;const clean={...profile,refScale:Number(profile.refScale),pinchFactor:Number(profile.pinchFactor),createdAt:Number(profile.createdAt)||Date.now()};engine.setPersonalCalibration(clean);if(typeof personalProfile!=='undefined')personalProfile=clean;if(persist){try{localStorage.setItem('air_personal',JSON.stringify(clean))}catch(e){return false}}return true}
function exportProfilePacket(){try{return window.AirProfilePassport?.packet?.()||null}catch(e){return null}}
function importProfilePacket(packet){if(!window.AirProfilePassport?.importPacket)throw new Error('Profile Passport non disponibile');return window.AirProfilePassport.importPacket(packet)}
function downloadProfile(){if(!window.AirProfilePassport?.exportProfile)return false;window.AirProfilePassport.exportProfile();return true}
function setContext(name){return router.setContext(name)}
function processLandmarks(landmarks){if(!Array.isArray(landmarks)||landmarks.length<21)return false;engine.process(landmarks);return true}
function setVocabularyEnabled(value){return window.AirGestureVocabulary?.setEnabled?.(!!value)||null}
function setVocabularyMapping(token,action){return window.AirGestureVocabulary?.setMapping?.(token,action)||false}
router.route=function(g){if(enabled)return originalRoute(g);const payload={command:'ignore',context:router.context,gesture:g,suppressed:true,reason:'sdk-disabled'};router.emit('command',payload);return payload};
engine.on('gesture',g=>emit('gesture',{...g,enabled,robustness:robustness().state}));
engine.on('pointer',p=>emit('pointer',{...p,enabled}));
engine.on('pose',p=>emit('pose',p));
engine.on('intent',i=>emit('intent',i));
engine.on('tracking',t=>emit('tracking',t));
engine.on('profile',p=>emit('profile',p));
engine.on('adaptive',a=>emit('adaptive',a));
engine.on('calibration',c=>emit('calibration',c));
engine.on('recovery',r=>emit('recovery',r));
engine.on('qualityguard',q=>emit('qualityguard',q));
router.on('command',c=>emit('command',c));
router.on('context',c=>emit('context',c));
if(window.AirRobustnessCore?.subscribe)window.AirRobustnessCore.subscribe(s=>emit('robustness',s));
else window.addEventListener('airrobustnesschange',e=>emit('robustness',e.detail));
if(window.AirGestureVocabulary?.subscribe)window.AirGestureVocabulary.subscribe(s=>emit('vocabularychange',s));
if(window.AirGestureVocabulary?.onTrigger)window.AirGestureVocabulary.onTrigger(t=>emit('vocabulary',t));
const api={VERSION,events:[...validEvents],on,once,enable,disable,get enabled(){return enabled},snapshot,setProfile,setAdaptiveScale,setPersonalCalibration,setContext,get context(){return router.context},get robustness(){return robustness()},get vocabulary(){return vocabulary()},get metrics(){return metricsSnapshot()},processLandmarks,setVocabularyEnabled,setVocabularyMapping,exportProfilePacket,importProfilePacket,downloadProfile,onGesture:fn=>on('gesture',fn),onPointer:fn=>on('pointer',fn),onStateChange:fn=>on('robustness',fn),onVocabulary:fn=>on('vocabulary',fn),onVocabularyChange:fn=>on('vocabularychange',fn),onTracking:fn=>on('tracking',fn),onPose:fn=>on('pose',fn),onIntent:fn=>on('intent',fn),onCommand:fn=>on('command',fn)};
window.AirGestureSDK=Object.freeze(api);
try{window.dispatchEvent(new CustomEvent('airgesture:sdkready',{detail:{version:VERSION,snapshot:snapshot()}}))}catch(e){}
})();
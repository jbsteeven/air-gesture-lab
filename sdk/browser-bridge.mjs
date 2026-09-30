import {VERSION,AirGestureEngine,AirCommandRouter,AirHandRecovery,AirTrackingQualityGuard,AirLowLightMonitor,AirRobustnessCore,createGestureRuntime,createRobustGestureRuntime,getBrowserSDK,whenBrowserSDK} from './index.mjs';

const api=Object.freeze({VERSION,AirGestureEngine,AirCommandRouter,AirHandRecovery,AirTrackingQualityGuard,AirLowLightMonitor,AirRobustnessCore,createGestureRuntime,createRobustGestureRuntime,getBrowserSDK,whenBrowserSDK});
globalThis.AirGestureESM=api;
try{globalThis.dispatchEvent(new CustomEvent('airgesture:esmready',{detail:{version:VERSION,robustness:true}}))}catch(e){}

export default api;

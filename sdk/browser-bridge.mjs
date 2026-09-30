import {VERSION,AirGestureEngine,AirCommandRouter,createGestureRuntime,getBrowserSDK,whenBrowserSDK} from './index.mjs';

const api=Object.freeze({VERSION,AirGestureEngine,AirCommandRouter,createGestureRuntime,getBrowserSDK,whenBrowserSDK});
globalThis.AirGestureESM=api;
try{globalThis.dispatchEvent(new CustomEvent('airgesture:esmready',{detail:{version:VERSION}}))}catch(e){}

export default api;

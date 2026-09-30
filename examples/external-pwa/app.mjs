import {VERSION,createRobustGestureRuntime} from '../../sdk/index.mjs';

const $=s=>document.querySelector(s),video=$('#camera'),start=$('#start'),demo=$('#demo'),activate=$('#activate'),cursor=$('#cursor'),fpsEl=$('#fps'),robustBox=$('#reliability'),robustName=$('#robustName'),robustHint=$('#robustHint'),gestureName=$('#gestureName'),trackingText=$('#trackingText'),lastGesture=$('#lastGesture'),contextEl=$('#context'),lightEl=$('#light'),safeEl=$('#safe'),eventLog=$('#eventLog');
const runtime=createRobustGestureRuntime({engine:{profile:'balanced',adaptiveScale:true},context:'workspace'});
let frames=0,fpsT=performance.now(),missFrames=0,hadHand=false,lastLightSample=0;
const lightCanvas=document.createElement('canvas');lightCanvas.width=24;lightCanvas.height=18;const lightCtx=lightCanvas.getContext('2d',{willReadFrequently:true});

function log(t){eventLog.textContent=t}
function robustnessHint(s){if(s.state==='LOW LIGHT')return'Più luce frontale migliora il tracking';if(s.state==='DEGRADED')return'Tracking instabile · comandi protetti';if(s.state==='RECOVERING')return'Stabilizza la mano in posizione neutrale';if(s.state==='NO HAND')return'Mostra nuovamente la mano';return'Runtime ESM affidabile · comandi attivi'}

runtime.on('pointer',p=>{cursor.style.display='block';cursor.style.left=p.x*innerWidth+'px';cursor.style.top=p.y*innerHeight+'px'});
runtime.on('gesture',g=>{lastGesture.textContent=g.type.toUpperCase();gestureName.textContent=g.type.toUpperCase()+(g.direction?' · '+g.direction.toUpperCase():'');log(`gesture · ${g.type}${g.direction?' · '+g.direction:''}`)});
runtime.on('tracking',t=>{trackingText.textContent=`${t.label} · qualità ${Math.round(t.quality*100)}% · scala ${t.scale.toFixed(3)}`});
runtime.on('context',c=>{contextEl.textContent=c.name.toUpperCase()});
runtime.on('light',s=>{lightEl.textContent=`${s.level} ${s.luminance||''}`.trim()});
runtime.on('robustness',s=>{robustBox.dataset.state=s.state;robustName.textContent=s.state;robustHint.textContent=robustnessHint(s);safeEl.textContent=s.commandSafe?'YES':'NO'});
runtime.on('recovery',e=>{if(e.phase!=='progress')log(`recovery · ${e.phase}`)});
runtime.on('qualityguard',e=>{if(e.phase==='trigger'||e.phase==='warning')log(`quality guard · ${e.phase}`)});

function sampleLight(){if(!lightCtx||video.readyState<2||!video.videoWidth)return;try{lightCtx.drawImage(video,0,0,24,18);runtime.updateImageData(lightCtx.getImageData(0,0,24,18).data)}catch(e){}}
function results(r){frames++;const now=performance.now();if(now-fpsT>=1000){fpsEl.textContent=`${frames} FPS`;frames=0;fpsT=now}if(now-lastLightSample>850){lastLightSample=now;sampleLight()}const l=r.multiHandLandmarks;if(!l?.length){missFrames++;const grace=runtime.light?.snapshot?.().dim?4:3;if(hadHand&&missFrames>=grace){hadHand=false;runtime.markHandLost('mediapipe-no-hand');cursor.style.display='none';gestureName.textContent='MANO PERSA'}return}missFrames=0;hadHand=true;runtime.processLandmarks(l[0])}

activate.onclick=async()=>{try{activate.disabled=true;activate.textContent='ATTIVAZIONE…';const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:.66,minTrackingConfidence:.64});hands.onResults(results);const cam=new Camera(video,{onFrame:async()=>hands.send({image:video}),width:640,height:480,facingMode:'user'});await cam.start();start.hidden=true;demo.hidden=false;log(`Air Gesture SDK ${VERSION} · runtime esterno attivo`);if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js')}catch(e){activate.disabled=false;activate.textContent='RIPROVA';alert('Impossibile avviare la camera. Verifica il permesso fotocamera e usa HTTPS.')}};

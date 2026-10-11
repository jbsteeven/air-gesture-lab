import test from 'node:test';
import assert from 'node:assert/strict';
import {VERSION,AirGestureEngine,AirHandRecovery,AirTrackingQualityGuard,AirLowLightMonitor,AirRobustnessCore,AirGestureVocabulary,AirIrisGazeEstimator,AirGazeHandFusion,createGestureRuntime,createRobustGestureRuntime} from '../sdk/index.mjs';

test('SDK version contract',()=>{assert.equal(VERSION,'2.5.1')});

test('base runtime preserves command routing contract',()=>{const runtime=createGestureRuntime({context:'detail'});let command=null;runtime.on('command',c=>command=c);runtime.router.route({type:'scroll',direction:'down'});assert.equal(command.command,'scroll');assert.equal(command.context,'detail');assert.equal(runtime.snapshot().profile,'balanced')});

test('gesture vocabulary is opt-in by default',()=>{const engine=new AirGestureEngine();const vocabulary=new AirGestureVocabulary(engine);assert.equal(vocabulary.snapshot().enabled,false);let trigger=null;vocabulary.onTrigger(t=>trigger=t);vocabulary.handleGesture({type:'pinch'});assert.equal(trigger,null);vocabulary.enable();vocabulary.handleGesture({type:'pinch'});assert.equal(trigger.token,'PINCH');assert.equal(trigger.action,'SELECT')});

test('runtime vocabulary remains off unless explicitly enabled',()=>{const runtime=createGestureRuntime();assert.equal(runtime.vocabulary.snapshot().enabled,false);runtime.setVocabularyEnabled(true);assert.equal(runtime.snapshot().vocabulary.enabled,true);runtime.setVocabularyMapping('PALM','TRIGGER_1');assert.equal(runtime.snapshot().vocabulary.mapping.PALM,'TRIGGER_1')});

test('gaze fusion is opt-in and does not move the pointer while off',()=>{const fusion=new AirGazeHandFusion();fusion.updateGaze({x:.8,y:.5,confidence:1,timestamp:Date.now()});const out=fusion.resolve({x:.25,y:.5},[{id:'A',left:.7,top:.3,right:.9,bottom:.7}]);assert.equal(fusion.snapshot().mode,'off');assert.equal(out.x,.25);assert.equal(out.assisted,false)});

test('gaze estimator accepts small but valid mobile gaze spans',()=>{const estimator=new AirIrisGazeEstimator();assert.equal(estimator.setCalibration({center:{x:.5,y:.5},left:{x:.497,y:.5},right:{x:.503,y:.5},top:{x:.5,y:.497},bottom:{x:.5,y:.503}}),true)});

test('gaze calibration maps calibrated center and fusion can assist a nearby hand target',()=>{const estimator=new AirIrisGazeEstimator({smoothing:1});assert.equal(estimator.setCalibration({center:{x:.5,y:.5},left:{x:.36,y:.5},right:{x:.64,y:.5},top:{x:.5,y:.38},bottom:{x:.5,y:.62}}),true);const mapped=estimator.mapRaw({x:.5,y:.5});assert.ok(Math.abs(mapped.x-.5)<1e-9);assert.ok(Math.abs(mapped.y-.5)<1e-9);const fusion=new AirGazeHandFusion({mode:'assist'});fusion.updateGaze({x:.8,y:.5,confidence:.95,timestamp:Date.now()});const out=fusion.resolve({x:.66,y:.5},[{id:'target',left:.7,top:.35,right:.9,bottom:.65}]);assert.equal(out.target,'target');assert.equal(out.assisted,true);assert.ok(out.x>.66)});

test('runtime gaze layer remains off unless explicitly enabled',()=>{const runtime=createGestureRuntime();assert.equal(runtime.gazeFusion.snapshot().mode,'off');assert.equal(runtime.setGazeFusionMode('assist'),true);assert.equal(runtime.snapshot().gaze.fusion.mode,'assist');assert.equal(runtime.setGazeCalibration({center:{x:.5,y:.5},left:{x:.36,y:.5},right:{x:.64,y:.5},top:{x:.5,y:.38},bottom:{x:.5,y:.62}}),true)});

test('low light monitor classifies LOW and recovers to OK',()=>{const light=new AirLowLightMonitor({alpha:1,lowConfirm:1,goodConfirm:1});assert.equal(light.updateLuminance(30).level,'LOW');assert.equal(light.snapshot().dim,true);assert.equal(light.updateLuminance(90).level,'OK');assert.equal(light.snapshot().dim,false)});

test('robustness core applies state priority',()=>{const engine=new AirGestureEngine();const recovery=new AirHandRecovery(engine);const guard=new AirTrackingQualityGuard(engine);const light=new AirLowLightMonitor({alpha:1,lowConfirm:1,goodConfirm:1});const core=new AirRobustnessCore({recovery,guard,light});light.updateLuminance(30);assert.equal(core.snapshot().state,'LOW LIGHT');assert.equal(core.snapshot().commandSafe,true);recovery.markLost('test');assert.equal(core.snapshot().state,'NO HAND');assert.equal(core.snapshot().commandSafe,false);core.destroy()});

test('quality guard blocks an extreme scale frame and requests recovery',()=>{const runtime=createRobustGestureRuntime({guard:{badFrames:1,lowLightBadFrames:1}});const landmarks=Array.from({length:21},()=>({x:.5,y:.5,z:0}));landmarks[9]={x:.5,y:.51,z:0};const allowed=runtime.processLandmarks(landmarks);assert.equal(allowed,false);assert.equal(runtime.guard.snapshot().triggers,1);assert.equal(runtime.recovery.snapshot().pendingLoss,true);assert.equal(runtime.robustness.snapshot().commandSafe,false);runtime.destroy()});

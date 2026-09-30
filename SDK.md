# Air Gesture SDK v2.2

`air-gesture-sdk.js` resta la facade browser compatibile con la demo, mentre `sdk/` espone ora un package ESM progressivamente autonomo.

## Novità v2.2

La v2.2 estrae anche la logica di robustezza in moduli ES indipendenti dal DOM:

- `AirHandRecovery`
- `AirTrackingQualityGuard`
- `AirLowLightMonitor`
- `AirRobustnessCore`

Questi moduli non creano HUD, non accedono a `window` e non richiedono la UI di Air Gesture Lab.

## Import ESM

```js
import {
  AirGestureEngine,
  AirCommandRouter,
  AirHandRecovery,
  AirTrackingQualityGuard,
  AirLowLightMonitor,
  AirRobustnessCore,
  createGestureRuntime,
  createRobustGestureRuntime
} from './sdk/index.mjs';
```

## Runtime base

```js
const runtime = createGestureRuntime({
  engine: { profile: 'balanced' },
  context: 'workspace'
});

runtime.on('gesture', g => console.log(g));
runtime.processLandmarks(landmarks);
```

Il runtime base mantiene il comportamento v2.1 e non attiva automaticamente i guardrail modulari.

## Robust runtime

```js
const runtime = createRobustGestureRuntime({
  engine: {
    profile: 'balanced',
    adaptiveScale: true
  }
});

runtime.on('robustness', state => {
  console.log(state.state, state.commandSafe);
});

runtime.on('recovery', event => console.log(event.phase));
runtime.on('qualityguard', event => console.log(event.phase));

runtime.processLandmarks(landmarks);
```

`createRobustGestureRuntime()` costruisce Engine, Router, Hand Recovery, Tracking Quality Guard, Low Light Monitor e Robustness Core come un solo runtime headless.

## Perdita mano

Un detector esterno deve notificare la perdita della mano dopo il proprio eventuale grace period:

```js
runtime.markHandLost('detector-no-hand');
```

Al rientro della mano, i successivi `processLandmarks()` vengono usati dal recovery finché non viene raggiunta una posa neutrale stabile. Soltanto dopo il frame torna al Gesture Engine.

## Low Light

Il package non accede direttamente alla fotocamera. L'app ospite può fornire una luminanza media:

```js
runtime.updateLuminance(58);
```

oppure un buffer RGBA già letto dal proprio canvas:

```js
runtime.updateImageData(imageData.data);
```

Le soglie di default restano coerenti con la demo: `LOW < 44`, `DIM < 66`, altrimenti `OK`, con smoothing e conferma su più campioni.

## Tracking Quality Guard

Il guard mantiene i criteri conservativi validati nella demo: distanza estrema, molti landmark sui bordi e grandi discontinuità geometriche. In luce ridotta richiede più frame consecutivi prima di passare a recovery.

Il modulo non modifica `pinchIn`, `pinchOut`, hold, swipe distance o scroll step.

## Robustness Core

Gli stati modulari sono:

- `READY`
- `LOW LIGHT`
- `DEGRADED`
- `RECOVERING`
- `NO HAND`

```js
const s = runtime.robustness.snapshot();
console.log(s.state, s.commandSafe);
```

`commandSafe` è `true` per `READY` e `LOW LIGHT`; è `false` per gli stati degradati.

## Uso dei singoli moduli

```js
const engine = new AirGestureEngine();
const recovery = new AirHandRecovery(engine);
const light = new AirLowLightMonitor();
const guard = new AirTrackingQualityGuard(engine).attachRecovery(recovery);
const robustness = new AirRobustnessCore({ recovery, guard, light });
```

Questa forma consente di sostituire selettivamente detector, UI, metriche o command routing mantenendo il core gesture.

## Browser facade

La demo continua a esporre:

```js
window.AirGestureSDK
```

con eventi `airgesture:*`, Profile Passport, metriche e Robustness Core classico. La v2.2 non sostituisce ancora il runtime della demo con i moduli ESM: li mantiene affiancati per evitare regressioni.

## Browser ESM bridge

Quando viene caricato `sdk/browser-bridge.mjs`:

```js
window.AirGestureESM
```

espone le classi ESM e `createRobustGestureRuntime()` per test e integrazioni dirette nel browser.

## Package exports

Il package espone ora anche:

```json
{
  "./robustness": "./sdk/robustness/index.mjs",
  "./robustness/hand-recovery": "./sdk/robustness/hand-recovery.mjs",
  "./robustness/tracking-quality-guard": "./sdk/robustness/tracking-quality-guard.mjs",
  "./robustness/low-light-monitor": "./sdk/robustness/low-light-monitor.mjs",
  "./robustness/core": "./sdk/robustness/robustness-core.mjs"
}
```

## Compatibilità

La v2.2 mantiene il contratto pubblico 2.x e aggiunge API senza rimuovere quelle della v2.0/v2.1. Il package resta `private` e non viene pubblicato automaticamente su registry esterni.

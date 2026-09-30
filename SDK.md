# Air Gesture SDK v2.3

`air-gesture-sdk.js` resta la facade browser compatibile con la demo principale, mentre `sdk/` espone il package ESM autonomo. La v2.3 aggiunge una vera mini-PWA esterna e una suite di contract test automatizzati.

## Novità v2.3

La release verifica che il package possa essere usato fuori dalla UI originale:

- `examples/external-pwa/` importa direttamente `createRobustGestureRuntime()`;
- la mini-PWA usa MediaPipe soltanto come detector di landmark;
- pointer, gesture, routing, Low Light, Quality Guard, Hand Recovery e Robustness provengono dal package ESM;
- `tests/sdk-contract.test.mjs` verifica il contratto pubblico con il test runner nativo di Node;
- `.github/workflows/sdk-contract.yml` esegue i test su GitHub Actions con Node 20.

La versione pubblica del contratto è `2.3.0`.

## Import ESM

```js
import {
  VERSION,
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

Il runtime base non abilita automaticamente i guardrail modulari.

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
runtime.on('light', state => console.log(state.level));

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

Le soglie di default sono `LOW < 44`, `DIM < 66`, altrimenti `OK`, con smoothing e conferma su più campioni.

## Tracking Quality Guard

Il guard usa i criteri già validati nella demo: distanza estrema, molti landmark sui bordi e grandi discontinuità geometriche. In luce ridotta richiede più frame consecutivi prima di passare a recovery.

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

## External Integration Demo

La demo esterna vive in:

```text
examples/external-pwa/
```

L'entrypoint applicativo usa soltanto il package ESM:

```js
import { VERSION, createRobustGestureRuntime } from '../../sdk/index.mjs';

const runtime = createRobustGestureRuntime({
  engine: {
    profile: 'balanced',
    adaptiveScale: true
  },
  context: 'workspace'
});
```

MediaPipe viene inizializzato dalla mini-PWA e invia i 21 landmark a:

```js
runtime.processLandmarks(landmarks);
```

Quando il detector perde la mano per il proprio grace period:

```js
runtime.markHandLost('mediapipe-no-hand');
```

La mini-PWA dispone di manifest e service worker propri e quindi verifica l'integrazione come applicazione separata su GitHub Pages.

## Contract tests

La suite corrente verifica:

- `VERSION === '2.3.0'`;
- routing contestuale del Command Router;
- transizione Low Light `LOW -> OK`;
- precedenza degli stati del Robustness Core;
- attivazione del Quality Guard su scala estrema;
- hand-off dal Quality Guard a Hand Recovery;
- `commandSafe = false` durante uno stato non affidabile.

Esecuzione:

```bash
npm test
```

La suite usa soltanto Node e non richiede dipendenze npm esterne.

## GitHub Actions

La workflow:

```text
.github/workflows/sdk-contract.yml
```

viene eseguita sui push a `main` e sulle pull request quando cambiano `sdk/**`, `tests/**` o `package.json`.

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

La demo principale continua a esporre:

```js
window.AirGestureSDK
```

con eventi `airgesture:*`, Profile Passport, metriche e Robustness Core classico. Il valore `VERSION` è sincronizzato a `2.3.0`.

## Browser ESM bridge

Quando viene caricato `sdk/browser-bridge.mjs`, `window.AirGestureESM` espone le classi ESM e `createRobustGestureRuntime()` per test e integrazioni dirette nel browser.

## Package exports

Il package espone:

```json
{
  ".": "./sdk/index.mjs",
  "./core/gesture-engine": "./sdk/core/gesture-engine.mjs",
  "./core/command-router": "./sdk/core/command-router.mjs",
  "./robustness": "./sdk/robustness/index.mjs",
  "./robustness/hand-recovery": "./sdk/robustness/hand-recovery.mjs",
  "./robustness/tracking-quality-guard": "./sdk/robustness/tracking-quality-guard.mjs",
  "./robustness/low-light-monitor": "./sdk/robustness/low-light-monitor.mjs",
  "./robustness/core": "./sdk/robustness/robustness-core.mjs",
  "./browser-facade": "./air-gesture-sdk.js"
}
```

## Compatibilità

La v2.3 mantiene il contratto pubblico 2.x e aggiunge test e integrazione esterna senza rimuovere API della v2.0/v2.1/v2.2. Il package resta `private` e non viene pubblicato automaticamente su registry esterni.

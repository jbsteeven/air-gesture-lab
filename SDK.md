# Air Gesture SDK v2.5

La v2.5 aggiunge **Gaze-Hand Fusion Experimental**, un secondo layer opzionale che combina il puntatore della mano con una stima dello sguardo derivata dai landmark di viso e iride.

Il principio resta non distruttivo:

- Gaze-Hand Fusion è `OFF` per default;
- Air Gesture Vocabulary resta indipendente e `OFF` per default;
- le soglie del Gesture Engine non vengono modificate;
- senza calibrazione valida lo sguardo non sposta il puntatore;
- se il segnale gaze manca o diventa troppo vecchio, il controllo torna automaticamente alla sola mano.

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
  AirGestureVocabulary,
  AirIrisGazeEstimator,
  AirGazeHandFusion,
  createGestureRuntime,
  createRobustGestureRuntime
} from './sdk/index.mjs';
```

Versione corrente:

```js
VERSION === '2.5.0';
```

## AirIrisGazeEstimator

`AirIrisGazeEstimator` riceve landmark Face Mesh con raffinamento iride. Il core non apre la camera e non dipende dal DOM.

```js
const estimator = new AirIrisGazeEstimator();

estimator.setCalibration({
  center: { x: 0.50, y: 0.50 },
  left:   { x: 0.36, y: 0.50 },
  right:  { x: 0.64, y: 0.50 },
  top:    { x: 0.50, y: 0.38 },
  bottom: { x: 0.50, y: 0.62 }
});

const gaze = estimator.estimate(faceLandmarks);
```

I punti di calibrazione contengono coordinate **raw dell'iride**, non coordinate dello schermo. La demo browser raccoglie questi campioni automaticamente durante la calibrazione a cinque punti.

Il risultato, quando calibrato, contiene:

```js
{
  x: 0.63,
  y: 0.41,
  rawX: 0.54,
  rawY: 0.47,
  confidence: 0.82,
  calibrated: true
}
```

## AirGazeHandFusion

Modalità supportate:

- `off` — nessuna modifica al puntatore;
- `assist` — correzione conservativa quando mano e sguardo convergono sullo stesso target;
- `fusion` — correzione più forte e una piccola componente gaze anche senza target.

```js
const fusion = new AirGazeHandFusion({ mode: 'assist' });

fusion.updateGaze({
  x: 0.72,
  y: 0.38,
  confidence: 0.88,
  timestamp: Date.now()
});

const pointer = fusion.resolve(
  { x: 0.66, y: 0.40 },
  [
    { id: 'target-a', left: 0.68, top: 0.30, right: 0.88, bottom: 0.48 }
  ]
);
```

Il risultato include, quando disponibile, `target`, `agreement`, `score` e `assisted`.

## Runtime ESM

`createGestureRuntime()` e `createRobustGestureRuntime()` espongono:

```js
runtime.gazeEstimator;
runtime.gazeFusion;

runtime.processFaceLandmarks(faceLandmarks);
runtime.setGazeCalibration(points);
runtime.clearGazeCalibration();
runtime.setGazeFusionMode('assist');
runtime.resolvePointer(handPointer, normalizedTargets);

runtime.on('gaze', gaze => {});
runtime.on('fusedpointer', pointer => {});
```

Il runtime resta compatibile con le applicazioni hand-only: la modalità gaze iniziale è `off`.

## Browser integration

La demo principale usa lo stesso stream della fotocamera frontale già aperto per le mani. Il browser adapter:

```js
window.AirGazeFusion
```

espone:

```js
AirGazeFusion.setEnabled(true);
AirGazeFusion.setMode('assist');
AirGazeFusion.startCalibration();
AirGazeFusion.resetCalibration();
AirGazeFusion.snapshot();
AirGazeFusion.onGaze(callback);
AirGazeFusion.onFusion(callback);
```

L'attivazione avviene dalle **Impostazioni**. Il Face Mesh viene caricato dinamicamente solo quando la funzione è attiva. Il video resta invisibile.

La calibrazione browser usa cinque punti:

```text
CENTER
LEFT
RIGHT
TOP
BOTTOM
```

e viene conservata in `localStorage` sul dispositivo.

## Browser SDK facade

```js
const sdk = window.AirGestureSDK;

sdk.VERSION; // 2.5.0
sdk.setGazeEnabled(true);
sdk.setGazeMode('assist');
await sdk.startGazeCalibration();

sdk.onGaze(g => console.log(g));
sdk.onFusion(f => console.log(f));
sdk.onGazeChange(state => console.log(state));
```

Lo snapshot include:

```js
sdk.snapshot().gaze
sdk.snapshot().capabilities.gazeFusion
```

## Relazione con Air Gesture Vocabulary

Gaze-Hand Fusion e Air Gesture Vocabulary sono due layer distinti.

```text
HAND LANDMARKS
   -> GESTURE ENGINE
   -> VOCABULARY (optional)

FACE / IRIS LANDMARKS
   -> GAZE ESTIMATOR
   -> GAZE-HAND FUSION (optional)

HAND POINTER + FUSED TARGET
   -> APPLICATION UI / COMMAND ROUTER
```

L'attivazione di uno non attiva automaticamente l'altro.

## Robustness e fallback

Il Gesture Engine e i guardrail hand restano la fonte primaria del controllo. Gaze-Hand Fusion non modifica le soglie di pinch, swipe, palm, fist o scroll.

Il segnale gaze viene ignorato quando:

- non è calibrato;
- il volto o l'iride non sono rilevati;
- la confidence è insufficiente;
- il campione è più vecchio della finestra ammessa.

Questo impedisce che una perdita temporanea del face tracking interrompa la navigazione tramite mano.

## Precisione

La v2.5 usa una normale camera frontale e realizza **fusione visiva monoculare**, non eye tracking IR dedicato e non triangolazione stereoscopica.

La qualità può variare con distanza, illuminazione, movimento della testa, occhiali, riflessi, qualità dell'ottica e posizione del dispositivo. Per questo lo sguardo viene usato come segnale ausiliario e non come unico comando di selezione.

## Contract tests

La suite verifica:

- versione `2.5.0`;
- Gaze-Hand Fusion `off` per default;
- puntatore invariato quando il layer è spento;
- calibrazione e mapping del centro;
- assistenza verso un target quando mano e gaze concordano;
- contratti precedenti di Vocabulary, Command Router, Low Light, Robustness Core e Quality Guard.

Esecuzione:

```bash
npm test
```

## Package exports

`package.json` espone inoltre:

```json
{
  "./fusion": "./sdk/fusion/index.mjs",
  "./fusion/gaze-hand-fusion": "./sdk/fusion/gaze-hand-fusion.mjs",
  "./browser-gaze-fusion": "./air-gaze-fusion.js"
}
```

Il package resta `private: true`.

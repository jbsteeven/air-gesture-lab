# Air Gesture Lab

PWA **gesture-native** controllata tramite la fotocamera frontale senza mostrare il flusso video nell'interfaccia.

## Stato del progetto

- **v0.1–v1.9** — evoluzione del motore gesture, Safe Neutral, Personal Calibration, Profile Passport, Hand Recovery, Tracking Quality Guard, Low Light Resilience e Robustness Core.
- **v2.0** — Gesture SDK Core: facade pubblica `window.AirGestureSDK`.
- **v2.1** — ESM Package Core: Gesture Engine e Command Router diventano moduli ES importabili.
- **v2.2** — Modular Robustness SDK: Hand Recovery, Tracking Quality Guard, Low Light Monitor e Robustness Core diventano moduli ESM headless.
- **v2.3** — External Integration Demo & Contract Tests.
- **v2.4** — Air Gesture Vocabulary: trigger layer opzionale e configurabile, **OFF di default**.
- **v2.5.2** — Gaze-Hand Fusion Experimental: lo sguardo diventa un secondo segnale opzionale per affinare il bersaglio indicato dalla mano.

## Architettura

Runtime PWA principale:

`Front Camera -> MediaPipe Hands -> AirGestureEngine -> Guardrails -> AirRobustnessCore -> AirCommandRouter -> Application UI`

Layer opzionali:

`Validated Hand Geometry -> Air Gesture Vocabulary -> Abstract Trigger`

`MediaPipe Face Mesh + Iris -> Gaze Calibration -> Gaze-Hand Fusion -> Assisted Pointer`

Package ESM:

`Hand Landmarks + optional Face Landmarks -> Gesture Engine + Robustness + Vocabulary + Gaze-Hand Fusion -> Host Application`

## Hand Continuity v2.5.2

La v2.5.2 interviene sulla continuità della mano prima ancora che sulle gesture: una perdita di uno o pochi frame non fa più sparire subito il cursore, il Quality Guard non azzera più il motore al primo frame anomalo, la riacquisizione è più rapida e il detector Hands usa soglie più tolleranti. Quando Gaze-Hand Fusion è attivo, il face tracking viene campionato a frequenza ridotta per lasciare priorità computazionale alla mano.

## Gaze-Hand Fusion v2.5.2

La v2.5.2 corregge la calibrazione: acquisizione adattiva dei campioni, tempi più lunghi sui telefoni lenti, feedback sul numero di campioni, soglie più tolleranti per movimenti oculari piccoli e riconoscimento più permissivo in condizioni difficili.

La funzione è **OFF di default** e viene attivata esclusivamente dalle **Impostazioni**.

Sono disponibili due modalità:

- `ASSIST` — la mano resta il segnale principale; lo sguardo interviene soltanto quando mano e occhi convergono sullo stesso target.
- `FUSION` — lo sguardo partecipa maggiormente alla correzione del puntatore, pur mantenendo la mano come controllo primario.

Prima di contribuire alla selezione lo sguardo deve essere calibrato con una sequenza a cinque punti: centro, sinistra, destra, alto e basso.

La camera resta invisibile. Face tracking e hand tracking utilizzano lo stesso stream della fotocamera frontale. Il Face Mesh viene caricato e processato soltanto quando Gaze-Hand Fusion è attivo; il campionamento del volto è limitato per non sostituire né rallentare intenzionalmente il Gesture Engine principale.

La v2.5.2 implementa **fusione visiva monoculare**, non triangolazione stereoscopica. La precisione dipende da fotocamera, distanza, stabilità della testa, illuminazione, occhiali e riflessi. Se lo sguardo non è disponibile o è stale, il puntatore ritorna automaticamente al controllo della sola mano.

## Air Gesture Vocabulary

Il Vocabulary rimane indipendente da Gaze-Hand Fusion e resta **OFF di default**.

Vocabolario iniziale:

| Token | Forma | Mapping standard |
| --- | --- | --- |
| `PALM` | ✋ | `BACK` |
| `FIST` | ✊ | `PAUSE` |
| `POINT` | ☝ | `POINT` |
| `V_SIGN` | ✌ | `SCROLL` |
| `PINCH` | 🤏 | `SELECT` |
| `SWIPE_LEFT` | ← | `PREVIOUS` |
| `SWIPE_RIGHT` | → | `NEXT` |

I nomi sono volutamente neutri e non dipendono da uno scenario applicativo specifico.

## Browser API

```js
const sdk = window.AirGestureSDK;

sdk.VERSION; // 2.5.2
sdk.snapshot();

sdk.setGazeEnabled(true);
sdk.setGazeMode('assist');
await sdk.startGazeCalibration();

sdk.onGaze(g => console.log(g));
sdk.onFusion(f => console.log(f.target, f.agreement));
```

API browser dirette:

```js
window.AirGazeFusion.snapshot();
window.AirGazeFusion.setEnabled(true);
window.AirGazeFusion.setMode('fusion');
window.AirGazeFusion.startCalibration();
```

## ESM Package v2.5.2

```js
import {
  VERSION,
  AirGestureEngine,
  AirCommandRouter,
  AirGestureVocabulary,
  AirIrisGazeEstimator,
  AirGazeHandFusion,
  createGestureRuntime,
  createRobustGestureRuntime
} from './sdk/index.mjs';
```

Esempio headless:

```js
const runtime = createRobustGestureRuntime({
  gaze: { mode: 'assist' }
});

runtime.setGazeCalibration(calibrationPoints);
runtime.processFaceLandmarks(faceLandmarks);

runtime.on('fusedpointer', pointer => {
  console.log(pointer.x, pointer.y, pointer.target);
});
```

Il core ESM non dipende dal DOM: l'applicazione ospite decide come ottenere i face landmarks e quali rettangoli normalizzati rappresentano i target interattivi.

## Contract Tests

`tests/sdk-contract.test.mjs` verifica anche:

- `VERSION === '2.5.2'`;
- Gaze-Hand Fusion `OFF` per default;
- nessuna alterazione del puntatore quando il layer è `OFF`;
- mapping della calibrazione;
- assistenza del target quando mano e sguardo concordano;
- i contratti precedenti di routing, Vocabulary, Low Light, Robustness e Quality Guard.

Esecuzione:

```bash
npm test
```

## Package metadata

`package.json` è alla versione `2.5.2` ed espone anche `./fusion`. Il package resta `private: true`.

## Privacy

Il video della camera non viene mostrato nell'interfaccia. Il codice dell'app non registra né carica esplicitamente i frame. Hand tracking, face/iris tracking, calibrazione dello sguardo e fusione vengono elaborati nel browser. I dati di calibrazione della demo sono salvati localmente nel browser.

## Documentazione

La documentazione API completa è in `SDK.md`.

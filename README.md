# Air Gesture Lab

PWA **gesture-native** controllata tramite la fotocamera frontale senza mostrare il flusso video nell'interfaccia.

## Stato del progetto

- **v0.1** — proof of concept: hand tracking, cursore, pinch, swipe, palmo.
- **v0.2** — calibrazione, stabilizzazione, cooldown e feedback delle gesture.
- **v0.3** — mini-app touchless completa con Workspace e moduli.
- **v0.4** — motore riutilizzabile `gesture-engine.js`, telemetria e scroll verticale.
- **v0.5** — Intent Engine con anteprima del gesto e profili Precise/Balanced/Fast.
- **v0.6** — dwell selection, preferenze persistenti e Safety Lock tramite pugno.
- **v0.6.1** — dwell con isteresi e grace period.
- **v0.7** — Smart Dwell + `command-router.js`.
- **v0.8** — AutoTune della scala della mano.
- **v0.9** — Session Metrics.
- **v0.9.1** — Guarded Poses.
- **v0.9.2** — Safe Neutral.
- **v1.0** — Practice Mode.
- **v1.1** — Personal Calibration.
- **v1.2** — Profile Health.
- **v1.3** — Profile Memory.
- **v1.4** — Drift Guard.
- **v1.5** — Profile Passport.
- **v1.5.1** — Personal Controls hotfix.
- **v1.6** — Hand Recovery.
- **v1.7** — Transfer Check.
- **v1.7.1** — Personal Freeze Fix.
- **v1.8** — Tracking Quality Guard.
- **v1.8.1** — Low Light Resilience.
- **v1.9** — Robustness Core.
- **v2.0** — Gesture SDK Core: facade pubblica `window.AirGestureSDK`.
- **v2.1** — ESM Package Core: Gesture Engine e Command Router diventano moduli ES importabili, con runtime headless e package metadata.

## Architettura

Runtime PWA:

`Front Camera -> MediaPipe Hands -> AirGestureEngine -> Guardrails -> AirRobustnessCore -> AirCommandRouter -> AirGestureSDK -> Application UI`

Package ESM:

`Landmarks -> sdk/core/AirGestureEngine -> sdk/core/AirCommandRouter -> createGestureRuntime() -> External PWA`

Componenti principali:

- `gesture-engine.js` — runtime classico del Gesture Engine.
- `command-router.js` — router contestuale classico.
- `session-metrics.js` — telemetria diagnostica locale.
- `personal-calibration.js` — profilo personale.
- `profile-health.js`, `profile-memory.js`, `drift-monitor.js` — validazione storica del profilo.
- `profile-passport.js` — import/export JSON del profilo.
- `personal-controls.js` — gestione Personal separata dalla calibrazione.
- `hand-recovery.js` — perdita e riacquisizione della mano.
- `low-light-monitor.js` — stima locale della luminanza.
- `tracking-quality-guard.js` — guardia sul degrado geometrico.
- `transfer-check.js` — verifica passiva dei profili importati.
- `robustness-core.js` — stato operativo unificato.
- `air-gesture-sdk.js` — facade browser pubblica.
- `sdk/index.mjs` — entrypoint ESM pubblico.
- `sdk/core/gesture-engine.mjs` — Gesture Engine importabile senza `window`.
- `sdk/core/command-router.mjs` — Command Router importabile senza `window`.
- `sdk/browser-bridge.mjs` — bridge ESM della demo.

## Safe Neutral

I comandi discreti richiedono prima una breve posizione neutrale. Dopo un comando il motore torna disarmato finché non viene nuovamente raggiunto `NEUTRAL · READY`.

Palmo e pugno hanno hold lunghi; lo swipe richiede movimento orizzontale netto; lo scroll usa indice + medio distesi.

## Personal Calibration e Profile Passport

La calibrazione misura scala della mano e geometria del pinch e salva i valori soltanto nel browser. Profile Passport consente di esportare/importare scala personale, fattore del pinch e preferenze essenziali. Non trasferisce frame, immagini o landmark.

## Hand Recovery e Tracking Quality Guard

Hand Recovery neutralizza gli stati residui quando la mano viene persa e richiede una riacquisizione neutrale stabile. Tracking Quality Guard intercetta distanza estrema, uscita dal frame e grandi discontinuità geometriche prima che possano generare comandi involontari.

Le soglie gesture (`pinchIn`, `pinchOut`, hold, swipe distance, scroll step) non vengono modificate dai guardrail.

## Low Light Resilience

La v1.8.1 usa:

- `minDetectionConfidence = 0.66`;
- `minTrackingConfidence = 0.64`;
- grace period sui dropout brevi;
- tolleranza leggermente maggiore in luce ridotta;
- monitor locale della luminanza su una miniatura temporanea 24×18.

Il monitor non salva né trasmette immagini.

## Robustness Core

`robustness-core.js` aggrega i guardrail negli stati `NO HAND`, `RECOVERING`, `DEGRADED`, `LOW LIGHT` e `READY`.

Espone `window.AirRobustnessCore` con `snapshot()`, `state`, `commandSafe` e `subscribe(callback)`, più l'evento browser `airrobustnesschange`.

## Gesture SDK Browser

`window.AirGestureSDK` è il contratto pubblico sopra il runtime completo della demo.

API essenziale:

```js
const sdk = window.AirGestureSDK;

sdk.VERSION;             // 2.1.0
sdk.snapshot();
sdk.enable();
sdk.disable();
sdk.setProfile('balanced');
sdk.setAdaptiveScale(true);
sdk.setContext('workspace');

const off = sdk.onGesture(g => console.log(g));
off();
```

Gli eventi vengono pubblicati anche come `CustomEvent` browser con namespace `airgesture:*`.

## ESM Package Core v2.1

Il nuovo entrypoint importabile è:

```js
import {
  VERSION,
  AirGestureEngine,
  AirCommandRouter,
  createGestureRuntime
} from './sdk/index.mjs';
```

Per un'integrazione semplice:

```js
const runtime = createGestureRuntime({
  engine: {
    profile: 'balanced',
    adaptiveScale: true
  },
  context: 'workspace'
});

runtime.on('gesture', g => console.log(g));
runtime.on('command', c => console.log(c));
runtime.on('pointer', p => console.log(p));

runtime.processLandmarks(landmarks);
```

Il runtime ESM non richiede DOM, camera o `window`. Riceve landmark dall'esterno e produce gli stessi eventi semantici del motore della PWA.

Import diretto delle classi:

```js
import { AirGestureEngine } from './sdk/core/gesture-engine.mjs';
import { AirCommandRouter } from './sdk/core/command-router.mjs';
```

La demo carica anche `sdk/browser-bridge.mjs`, che pubblica `window.AirGestureESM` ed emette `airgesture:esmready`. Questo consente di verificare che la catena ESM sia realmente caricabile dal browser senza sostituire il runtime classico.

## Package metadata

Il repository contiene `package.json` con `exports` verso:

- `./sdk/index.mjs`;
- `./sdk/core/gesture-engine.mjs`;
- `./sdk/core/command-router.mjs`;
- `./air-gesture-sdk.js` come browser facade.

Il package è ancora marcato `private: true`: la struttura è pronta per essere testata e successivamente distribuita, ma non viene pubblicata automaticamente su un registry.

## Transfer Check

Transfer Check si attiva sui profili importati e raccoglie almeno 90 campioni neutrali. Classifica il risultato come `COMPATIBLE`, `ADAPTED` o `RECALIBRATE` senza modificare automaticamente il profilo.

## Session Quality

La telemetria locale misura qualità del tracking, stabilità, intent annullati, perdite mano, gesture e dwell. I dati non vengono inviati né persistiti.

## PWA e cache

Il service worker gestisce risorse same-origin e applica il fallback HTML solo alle navigazioni. Gli asset MediaPipe restano caricati da jsDelivr. Dalla v2.1 vengono messi in cache anche gli entrypoint ESM usati dalla demo.

## Privacy

Il video della camera non viene mostrato nell'interfaccia. Il codice dell'app non registra né carica esplicitamente i frame. Tracking e logica gesture vengono elaborati nel browser. Il monitor luce calcola soltanto una luminanza media locale. Profilo personale, Profile Health, Profile Memory e Transfer Check restano nel browser.

## Documentazione

La documentazione API completa è in `SDK.md`.

## Roadmap

Estrarre progressivamente in ESM anche Robustness Core e guardrail, aggiungere esempi di integrazione esterna e test automatici del contratto pubblico SDK 2.x.
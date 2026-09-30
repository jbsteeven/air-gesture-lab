# Air Gesture Lab

PWA **gesture-native** controllata tramite la fotocamera frontale senza mostrare il flusso video nell'interfaccia.

## Stato del progetto

- **v0.1** — proof of concept: hand tracking, cursore, pinch, swipe, palmo.
- **v0.2** — calibrazione, stabilizzazione, cooldown e feedback delle gesture.
- **v0.3** — mini-app touchless completa con Workspace e moduli.
- **v0.4** — motore riutilizzabile `gesture-engine.js`, telemetria e scroll verticale.
- **v0.5** — Intent Engine con profili Precise/Balanced/Fast.
- **v0.6** — dwell selection e Safety Lock.
- **v0.7** — Smart Dwell + Command Router.
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
- **v2.1** — ESM Package Core: Gesture Engine e Command Router diventano moduli ES importabili.
- **v2.2** — Modular Robustness SDK: Hand Recovery, Tracking Quality Guard, Low Light Monitor e Robustness Core diventano moduli ESM headless riutilizzabili.

## Architettura

Runtime PWA:

`Front Camera -> MediaPipe Hands -> AirGestureEngine -> Guardrails -> AirRobustnessCore -> AirCommandRouter -> AirGestureSDK -> Application UI`

Package ESM:

`Landmarks -> AirGestureEngine -> Modular Guardrails -> AirRobustnessCore -> AirCommandRouter -> createRobustGestureRuntime() -> External PWA`

## Moduli principali

- `gesture-engine.js` / `sdk/core/gesture-engine.mjs` — Gesture Engine classico ed ESM.
- `command-router.js` / `sdk/core/command-router.mjs` — routing contestuale.
- `hand-recovery.js` / `sdk/robustness/hand-recovery.mjs` — perdita e riacquisizione della mano.
- `tracking-quality-guard.js` / `sdk/robustness/tracking-quality-guard.mjs` — protezione dal tracking degradato.
- `low-light-monitor.js` / `sdk/robustness/low-light-monitor.mjs` — stima della luminanza.
- `robustness-core.js` / `sdk/robustness/robustness-core.mjs` — stato operativo unificato.
- `air-gesture-sdk.js` — facade browser completa.
- `sdk/index.mjs` — entrypoint ESM pubblico.
- `sdk/browser-bridge.mjs` — bridge ESM per il browser.

## Safe Neutral

I comandi discreti richiedono prima una breve posizione neutrale. Dopo un comando il motore torna disarmato finché non viene nuovamente raggiunto `NEUTRAL · READY`.

Palmo e pugno hanno hold lunghi; lo swipe richiede movimento orizzontale netto; lo scroll usa indice + medio distesi.

## Low Light Resilience

La demo usa `minDetectionConfidence = 0.66`, `minTrackingConfidence = 0.64`, grace period sui dropout brevi e monitor locale della luminanza su una miniatura temporanea 24×18. Il monitor non salva né trasmette immagini.

## Robustness Core

Gli stati operativi sono `NO HAND`, `RECOVERING`, `DEGRADED`, `LOW LIGHT` e `READY`.

Il runtime browser continua a esporre `window.AirRobustnessCore`; il package ESM v2.2 espone anche `AirRobustnessCore` come classe indipendente dal DOM.

## Gesture SDK Browser

```js
const sdk = window.AirGestureSDK;

sdk.VERSION;
sdk.snapshot();
sdk.enable();
sdk.disable();
sdk.setProfile('balanced');
sdk.setAdaptiveScale(true);
sdk.setContext('workspace');
sdk.onGesture(g => console.log(g));
```

Gli eventi vengono pubblicati anche come `CustomEvent` con namespace `airgesture:*`.

## ESM Package v2.2

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

Runtime completo con guardrail:

```js
const runtime = createRobustGestureRuntime({
  engine: {
    profile: 'balanced',
    adaptiveScale: true
  }
});

runtime.on('gesture', g => console.log(g));
runtime.on('robustness', s => console.log(s.state, s.commandSafe));

runtime.processLandmarks(landmarks);
```

Quando il detector non vede più la mano:

```js
runtime.markHandLost();
```

Per alimentare il monitor luce da una PWA esterna:

```js
runtime.updateLuminance(58);
// oppure
runtime.updateImageData(imageData.data);
```

Il package ESM non dipende dalla UI della demo e non modifica le soglie gesture validate.

## Package metadata

`package.json` espone gli entrypoint core e robustness. Il package resta `private: true`: è pronto per test e distribuzione controllata, ma non viene pubblicato automaticamente su registry esterni.

## Personal Calibration e Profile Passport

La calibrazione misura scala della mano e geometria del pinch e salva i valori soltanto nel browser. Profile Passport consente di esportare/importare scala personale, fattore del pinch e preferenze essenziali. Non trasferisce frame, immagini o landmark.

## Transfer Check

Transfer Check si attiva sui profili importati e classifica il risultato come `COMPATIBLE`, `ADAPTED` o `RECALIBRATE` senza modificare automaticamente il profilo.

## Privacy

Il video della camera non viene mostrato nell'interfaccia. Il codice dell'app non registra né carica esplicitamente i frame. Tracking e logica gesture vengono elaborati nel browser. Il monitor luce calcola soltanto una luminanza media locale.

## Documentazione

La documentazione API completa è in `SDK.md`.

## Roadmap

Esempi di integrazione esterna, test automatici del contratto SDK 2.x, separazione dei moduli applicativi rimanenti e successiva preparazione di una distribuzione package pubblicabile.

# Air Gesture Lab

PWA **gesture-native** controllata tramite la fotocamera frontale senza mostrare il flusso video nell'interfaccia.

## Stato del progetto

- **v0.1–v1.9** — evoluzione del motore gesture, Safe Neutral, Personal Calibration, Profile Passport, Hand Recovery, Tracking Quality Guard, Low Light Resilience e Robustness Core.
- **v2.0** — Gesture SDK Core: facade pubblica `window.AirGestureSDK`.
- **v2.1** — ESM Package Core: Gesture Engine e Command Router diventano moduli ES importabili.
- **v2.2** — Modular Robustness SDK: Hand Recovery, Tracking Quality Guard, Low Light Monitor e Robustness Core diventano moduli ESM headless riutilizzabili.
- **v2.3** — External Integration Demo & Contract Tests: una seconda PWA usa direttamente il package ESM e GitHub Actions verifica automaticamente il contratto SDK 2.x.

## Architettura

Runtime PWA principale:

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
- `sdk/browser-bridge.mjs` — bridge ESM della demo principale.

## Safe Neutral

I comandi discreti richiedono prima una breve posizione neutrale. Dopo un comando il motore torna disarmato finché non viene nuovamente raggiunto `NEUTRAL · READY`.

Le soglie gesture validate non vengono modificate dai moduli di robustezza.

## Low Light Resilience

La demo usa `minDetectionConfidence = 0.66`, `minTrackingConfidence = 0.64`, grace period sui dropout brevi e monitor locale della luminanza su una miniatura temporanea 24×18. Il monitor non salva né trasmette immagini.

## Robustness Core

Gli stati operativi sono `NO HAND`, `RECOVERING`, `DEGRADED`, `LOW LIGHT` e `READY`.

Il runtime browser espone `window.AirRobustnessCore`; il package ESM espone anche `AirRobustnessCore` come classe indipendente dal DOM.

## Gesture SDK Browser

```js
const sdk = window.AirGestureSDK;

sdk.VERSION; // 2.3.0
sdk.snapshot();
sdk.enable();
sdk.disable();
sdk.setProfile('balanced');
sdk.setAdaptiveScale(true);
sdk.setContext('workspace');
sdk.onGesture(g => console.log(g));
```

## ESM Package v2.3

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

Per il monitor luce:

```js
runtime.updateLuminance(58);
// oppure
runtime.updateImageData(imageData.data);
```

## External Integration Demo

`examples/external-pwa/` è una seconda mini-PWA indipendente dall'interfaccia principale. Importa direttamente:

```js
import { VERSION, createRobustGestureRuntime } from '../../sdk/index.mjs';
```

La demo usa MediaPipe soltanto come detector di landmark; pointer, gesture, routing e Robustness provengono dal package ESM. Ha un proprio manifest e service worker, quindi costituisce un test reale di integrazione esterna su GitHub Pages.

## Contract Tests

`tests/sdk-contract.test.mjs` usa il test runner nativo di Node per verificare:

- versione e caricamento dell'entrypoint ESM;
- command routing;
- classificazione Low Light;
- priorità degli stati Robustness;
- attivazione del Quality Guard e hand-off a Recovery.

Esecuzione locale:

```bash
npm test
```

La workflow `.github/workflows/sdk-contract.yml` esegue gli stessi test con Node 20 su GitHub Actions a ogni modifica di `sdk/**`, `tests/**` o `package.json`.

## Package metadata

`package.json` espone gli entrypoint core e robustness ed è alla versione `2.3.0`. Il package resta `private: true`: è pronto per test e distribuzione controllata, ma non viene pubblicato automaticamente su registry esterni.

## Personal Calibration e Profile Passport

La calibrazione misura scala della mano e geometria del pinch e salva i valori soltanto nel browser. Profile Passport consente di esportare/importare scala personale, fattore del pinch e preferenze essenziali. Non trasferisce frame, immagini o landmark.

## Privacy

Il video della camera non viene mostrato nell'interfaccia. Il codice dell'app non registra né carica esplicitamente i frame. Tracking e logica gesture vengono elaborati nel browser. Il monitor luce calcola soltanto una luminanza media locale.

## Documentazione

La documentazione API completa è in `SDK.md`.

## Roadmap

Stabilizzazione del contratto SDK 2.x, test di integrazione più estesi, separazione dei moduli applicativi rimanenti e successiva preparazione di una distribuzione package pubblicabile.

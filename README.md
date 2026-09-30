# Air Gesture Lab

PWA **gesture-native** controllata tramite la fotocamera frontale senza mostrare il flusso video nell'interfaccia.

## Stato del progetto

- **v0.1–v1.9** — evoluzione del motore gesture, Safe Neutral, Personal Calibration, Profile Passport, Hand Recovery, Tracking Quality Guard, Low Light Resilience e Robustness Core.
- **v2.0** — Gesture SDK Core: facade pubblica `window.AirGestureSDK`.
- **v2.1** — ESM Package Core: Gesture Engine e Command Router diventano moduli ES importabili.
- **v2.2** — Modular Robustness SDK: Hand Recovery, Tracking Quality Guard, Low Light Monitor e Robustness Core diventano moduli ESM headless.
- **v2.3** — External Integration Demo & Contract Tests: una seconda PWA usa direttamente il package ESM e GitHub Actions verifica automaticamente il contratto SDK 2.x.
- **v2.4** — Air Gesture Vocabulary: livello touchless opzionale che traduce pose e gesture validate in trigger astratti configurabili. È **OFF di default** e nella demo principale si abilita soltanto dalle Impostazioni.

## Architettura

Runtime PWA principale:

`Front Camera -> MediaPipe Hands -> AirGestureEngine -> Guardrails -> AirRobustnessCore -> AirCommandRouter -> AirGestureSDK -> Application UI`

Vocabulary opzionale:

`Validated Hand Geometry -> Air Gesture Vocabulary -> Abstract Trigger -> Host Application Mapping`

Package ESM:

`Landmarks -> AirGestureEngine -> Modular Guardrails -> AirRobustnessCore -> AirGestureVocabulary -> AirCommandRouter -> External PWA`

## Air Gesture Vocabulary

Il Vocabulary non sostituisce il Gesture Engine e non modifica il comportamento stabile dell'app quando è disattivato.

Nella demo principale:

1. il valore iniziale è `OFF`;
2. l'attivazione avviene dal pannello **Impostazioni**;
3. ogni simbolo produce un trigger astratto;
4. il mapping può essere modificato senza cambiare le soglie gesture;
5. disattivando il Vocabulary, nessun trigger del vocabolario viene interpretato o emesso.

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

I nomi sono volutamente neutri e non dipendono da un settore o da uno scenario applicativo specifico.

## Browser API

```js
const sdk = window.AirGestureSDK;

sdk.VERSION; // 2.4.0
sdk.snapshot();
sdk.onGesture(g => console.log(g));
sdk.onVocabulary(t => console.log(t.token, t.action));
```

Il Vocabulary browser espone anche:

```js
window.AirGestureVocabulary.snapshot();
window.AirGestureVocabulary.setMapping('PALM', 'TRIGGER_1');
```

L'attivazione programmatica resta disponibile all'SDK per le applicazioni ospiti; nella demo Air Gesture Lab l'utente la controlla dal pannello Impostazioni.

## ESM Package v2.4

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
  createGestureRuntime,
  createRobustGestureRuntime
} from './sdk/index.mjs';
```

Il runtime crea sempre l'oggetto `runtime.vocabulary`, ma lo mantiene disabilitato per default:

```js
const runtime = createRobustGestureRuntime();

runtime.vocabulary.snapshot().enabled; // false
runtime.setVocabularyEnabled(true);
runtime.setVocabularyMapping('PINCH', 'SELECT');
runtime.on('vocabulary', t => console.log(t));
```

## Robustness Core

Gli stati operativi sono `NO HAND`, `RECOVERING`, `DEGRADED`, `LOW LIGHT` e `READY`.

Il Vocabulary lavora a valle dei guardrail nel runtime ESM: i frame bloccati dal Quality Guard o dal Recovery non vengono usati per costruire trigger.

## External Integration Demo

`examples/external-pwa/` resta una mini-PWA indipendente dalla UI principale e importa direttamente il package ESM.

## Contract Tests

`tests/sdk-contract.test.mjs` verifica ora anche:

- `VERSION === '2.4.0'`;
- Vocabulary disattivato per default;
- nessun trigger quando è OFF;
- emissione del trigger dopo attivazione;
- mapping personalizzabile;
- routing, Low Light, Robustness e Quality Guard già coperti dalla v2.3.

Esecuzione:

```bash
npm test
```

## Package metadata

`package.json` è alla versione `2.4.0` e aggiunge l'export `./vocabulary`. Il package resta `private: true` e non viene pubblicato automaticamente su registry esterni.

## Privacy

Il video della camera non viene mostrato nell'interfaccia. Il codice dell'app non registra né carica esplicitamente i frame. Tracking, Vocabulary e logica gesture vengono elaborati nel browser.

## Documentazione

La documentazione API completa è in `SDK.md`.

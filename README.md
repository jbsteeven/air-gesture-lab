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
- **v2.0** — Gesture SDK Core: facade pubblica `window.AirGestureSDK`, eventi stabili, enable/disable del command routing, accesso a profili, Robustness Core e Profile Passport.

## Architettura

`Front Camera -> MediaPipe Hands -> AirGestureEngine -> Guardrails -> AirRobustnessCore -> AirCommandRouter -> AirGestureSDK -> Application UI / External PWA`

Componenti principali:

- `gesture-engine.js` traduce i landmark in eventi semantici (`pointer`, `pinch`, `swipe`, `scroll`, `palm`, `fist`).
- `command-router.js` assegna a ogni evento un significato in base al contesto.
- `session-metrics.js` produce telemetria diagnostica locale.
- `personal-calibration.js` genera il profilo personale.
- `profile-health.js`, `profile-memory.js`, `drift-monitor.js` validano nel tempo il profilo personale.
- `profile-passport.js` esporta/importa il profilo personale in JSON.
- `personal-controls.js` separa gestione del profilo e calibrazione.
- `hand-recovery.js` gestisce perdita e riacquisizione della mano.
- `low-light-monitor.js` stima la luminanza media locale.
- `tracking-quality-guard.js` intercetta condizioni geometriche anomale.
- `transfer-check.js` valida passivamente un profilo importato.
- `robustness-core.js` pubblica un unico stato operativo di affidabilità.
- `air-gesture-sdk.js` espone il runtime attraverso una API pubblica stabile.

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

`robustness-core.js` aggrega i guardrail negli stati:

1. `NO HAND`
2. `RECOVERING`
3. `DEGRADED`
4. `LOW LIGHT`
5. `READY`

Espone `window.AirRobustnessCore` con `snapshot()`, `state`, `commandSafe` e `subscribe(callback)`, più l'evento browser `airrobustnesschange`.

## Gesture SDK Core v2.0

La v2.0 introduce `window.AirGestureSDK` come contratto pubblico sopra il runtime già validato. La demo continua a funzionare con gli stessi moduli; l'SDK aggiunge una facade senza riscrivere il motore e quindi riduce il rischio di regressioni.

API essenziale:

```js
const sdk = window.AirGestureSDK;

sdk.VERSION;             // 2.0.0
sdk.snapshot();
sdk.enable();
sdk.disable();
sdk.setProfile('balanced');
sdk.setAdaptiveScale(true);
sdk.setContext('workspace');

const off = sdk.onGesture(g => console.log(g));
off();

sdk.onPointer(p => console.log(p.x, p.y));
sdk.onStateChange(s => console.log(s.state, s.commandSafe));
```

Eventi disponibili: `gesture`, `pointer`, `pose`, `intent`, `tracking`, `command`, `context`, `robustness`, `enabled`, `profile`, `adaptive`, `recovery`, `qualityguard`.

Gli stessi eventi vengono pubblicati anche come `CustomEvent` browser con namespace `airgesture:*`, per esempio `airgesture:gesture`. Quando l'SDK è pronto viene emesso `airgesture:sdkready`.

`disable()` mantiene tracking e diagnostica attivi ma sopprime il command routing dell'app, permettendo a una PWA ospite di sospendere le azioni senza spegnere camera o detector.

L'SDK espone inoltre:

- `processLandmarks(landmarks)` per future integrazioni con detector esterni;
- `setPersonalCalibration(profile)`;
- `exportProfilePacket()`;
- `importProfilePacket(packet)`;
- `downloadProfile()`;
- `robustness` e `metrics` come snapshot correnti.

La documentazione completa è in `SDK.md`.

## Transfer Check

Transfer Check si attiva sui profili importati e raccoglie almeno 90 campioni neutrali. Classifica il risultato come `COMPATIBLE`, `ADAPTED` o `RECALIBRATE` senza modificare automaticamente il profilo.

## Session Quality

La telemetria locale misura qualità del tracking, stabilità, intent annullati, perdite mano, gesture e dwell. I dati non vengono inviati né persistiti.

## PWA e cache

Il service worker gestisce risorse same-origin e applica il fallback HTML solo alle navigazioni. Gli asset MediaPipe restano caricati da jsDelivr.

## Privacy

Il video della camera non viene mostrato nell'interfaccia. Il codice dell'app non registra né carica esplicitamente i frame. Tracking e logica gesture vengono elaborati nel browser. Il monitor luce calcola soltanto una luminanza media locale. Profilo personale, Profile Health, Profile Memory e Transfer Check restano nel browser.

## Roadmap

Separazione progressiva del core in moduli importabili ESM, pacchetto distributivo riutilizzabile, esempi di integrazione in PWA esterne e stabilizzazione del contratto pubblico SDK 2.x.
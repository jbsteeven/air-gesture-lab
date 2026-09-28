# Air Gesture Lab

PWA **gesture-native** controllata tramite la fotocamera frontale senza visualizzare né registrare il flusso video.

## Stato del progetto

- **v0.1** — proof of concept: hand tracking, cursore, pinch, swipe, palmo.
- **v0.2** — calibrazione, stabilizzazione, cooldown e feedback delle gesture.
- **v0.3** — mini-app touchless completa con Workspace e moduli.
- **v0.4** — motore riutilizzabile `gesture-engine.js`, telemetria e scroll verticale.
- **v0.5** — Intent Engine con anteprima del gesto e profili Precise/Balanced/Fast.
- **v0.6** — dwell selection, preferenze persistenti e Safety Lock tramite pugno.
- **v0.6.1** — dwell con isteresi e grace period per tollerare il naturale tremolio della mano.
- **v0.7** — Smart Dwell adattivo alla stabilità e `command-router.js` per la gestione contestuale dei comandi.
- **v0.8** — AutoTune della scala della mano: soglie pinch compensate in funzione della distanza mano-camera, tracking quality e toggle persistente.
- **v0.9** — `session-metrics.js`: misure locali su qualità tracking, stabilità del puntatore, intent annullati, perdite della mano, gesture e dwell completati.

## Architettura

`Front Camera -> MediaPipe Hands -> AirGestureEngine -> AirCommandRouter -> Application UI`

Componenti principali:

- `gesture-engine.js` traduce i landmark in eventi semantici (`pointer`, `pinch`, `swipe`, `scroll`, `palm`, `fist`).
- `command-router.js` assegna a ogni evento un significato in base al contesto (`workspace`, `detail`, `locked`).
- `session-metrics.js` osserva la sessione e produce indicatori diagnostici senza intervenire sui comandi.

## Smart Dwell

Il dwell valuta la stabilità del puntatore, mantiene il target attraverso piccole uscite dal bordo e applica isteresi e grace period. L'obiettivo è rendere la selezione senza pinch più naturale su smartphone reali.

## AutoTune

Il motore misura in continuo una scala geometrica della mano dai landmark e la usa per compensare le soglie del pinch. Questo riduce la dipendenza dalla distanza fra mano e camera. L'interfaccia mostra anche qualità, distanza indicativa e fattore di scala applicato. AutoTune può essere disattivato e la preferenza viene salvata localmente.

## Session Quality

La v0.9 aggiunge una telemetria locale di sessione: qualità media del tracking, stabilità del puntatore, rapporto fra intent completati e annullati, numero di perdite della mano, gesture eseguite e selezioni dwell. I dati non vengono inviati né persistiti: vengono azzerati a ogni nuova sessione.

## Privacy

Il video della camera non viene mostrato nell'interfaccia né salvato dall'app. L'elaborazione del tracking avviene nel browser sul dispositivo. L'accesso alla fotocamera richiede HTTPS e consenso esplicito.

## Roadmap

Profili personali di calibrazione, test cross-device, componenti gesture-native riutilizzabili e pacchetto SDK/documentazione per integrare il motore in altre PWA.
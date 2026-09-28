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

## Architettura

`Front Camera -> MediaPipe Hands -> AirGestureEngine -> AirCommandRouter -> Application UI`

`AirGestureEngine` traduce i landmark in eventi semantici (`pointer`, `pinch`, `swipe`, `scroll`, `palm`, `fist`). `AirCommandRouter` assegna a ogni evento un significato in base al contesto attivo (`workspace`, `detail`, `locked`). La UI non deve conoscere la logica di computer vision.

## Smart Dwell

Il dwell non usa più soltanto un timer fisso. Valuta la stabilità del puntatore, mantiene il target attraverso piccole uscite dal bordo e applica isteresi e grace period. L'obiettivo è rendere la selezione senza pinch più naturale su smartphone reali.

## Privacy

Il video della camera non viene mostrato nell'interfaccia né salvato dall'app. L'elaborazione del tracking avviene nel browser sul dispositivo. L'accesso alla fotocamera richiede HTTPS e consenso esplicito.

## Roadmap

Componenti gesture-native riutilizzabili, calibrazione personale, metriche su falsi positivi, persistenza dei profili utente e test cross-device.
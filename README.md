# Air Gesture Lab

PWA **gesture-native** controllata tramite la fotocamera frontale senza visualizzare né registrare il flusso video.

## Stato del progetto

- **v0.1** — proof of concept: hand tracking, cursore, pinch, swipe, palmo.
- **v0.2** — calibrazione, stabilizzazione, cooldown e feedback delle gesture.
- **v0.3** — mini-app touchless completa: Workspace, apertura moduli con pinch, navigazione e ritorno con palmo.
- **v0.4** — separazione del motore riutilizzabile `gesture-engine.js`, telemetria locale e supporto a gesture verticali/scroll.

## Architettura

`Front Camera -> MediaPipe Hands -> AirGestureEngine -> semantic events -> Application UI`

Il motore emette eventi semantici (`pointer`, `pinch`, `swipe`, `scroll`, `palm`) e non conosce la UI. In questo modo può essere riutilizzato in PWA differenti.

## Privacy

Il video della camera non viene mostrato nell'interfaccia né salvato dall'app. L'elaborazione del tracking avviene nel browser sul dispositivo. L'accesso alla fotocamera richiede HTTPS e consenso esplicito.

## Roadmap

Configurazione gesture, gesture mantenute, diagnostica precisione/FPS, profili di sensibilità, componenti gesture-native riutilizzabili e test cross-device.
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
- **v0.8** — AutoTune della scala della mano: soglie pinch compensate in funzione della distanza mano-camera.
- **v0.9** — `session-metrics.js`: misure locali su qualità tracking, stabilità, intent annullati, perdite mano, gesture e dwell.
- **v0.9.1** — Guarded Poses: palmo e pugno richiedono una posa più stabile e mantenuta.
- **v0.9.2** — Safe Neutral: gate neutrale prima dei comandi, dwell rallentato e scroll dedicato a due dita.
- **v1.0** — Practice Mode: sandbox gesture-safe che riconosce pinch, swipe, scroll e pugno senza eseguire azioni reali.

## Architettura

`Front Camera -> MediaPipe Hands -> AirGestureEngine -> AirCommandRouter -> Session Metrics -> Application UI`

Componenti principali:

- `gesture-engine.js` traduce i landmark in eventi semantici (`pointer`, `pinch`, `swipe`, `scroll`, `palm`, `fist`) e gestisce lo stato neutrale.
- `command-router.js` assegna a ogni evento un significato in base al contesto (`workspace`, `detail`, `practice`, `locked`).
- `session-metrics.js` osserva la sessione e produce indicatori diagnostici senza intervenire sui comandi.

## Safe Neutral

I comandi discreti non sono immediatamente disponibili: la mano deve prima restare per un breve periodo in una configurazione che non corrisponde a palmo, pugno, pinch o scroll. Solo allora il motore espone `NEUTRAL · READY` e arma il comando successivo. Dopo un comando il sistema torna disarmato fino a un nuovo periodo neutrale.

Il palmo e il pugno hanno hold lunghi e geometrie più severe. Lo swipe richiede un gesto orizzontale netto con posa a indice singolo.

## Slow Dwell

Il dwell introduce prima una fase `SETTLE`, poi un riempimento che non può accelerare oltre il tempo reale. A mano stabile la selezione richiede circa 2,5 secondi complessivi; con maggiore jitter il tempo aumenta ulteriormente. Il dwell progredisce soltanto quando il motore è in `NEUTRAL · READY`.

## 2-Finger Scroll

Lo scroll verticale usa una modalità dedicata: indice e medio distesi, anulare e mignolo non distesi. Dopo un breve armamento la UI mostra `SCROLL MODE · ACTIVE`; da quel momento piccoli movimenti verticali della mano generano lo scroll nella pagina di dettaglio.

## Practice Mode

La v1.0 introduce un contesto `practice`. In questa modalità pinch, swipe, scroll e pugno vengono riconosciuti e mostrati nell'interfaccia, ma il router non esegue navigazione, lock o altre azioni. Il palmo aperto e mantenuto viene usato soltanto per uscire dal Practice Mode. Questo permette di imparare la posizione neutrale e le gesture in sicurezza prima di usarle nell'applicazione reale.

## AutoTune

Il motore misura in continuo una scala geometrica della mano dai landmark e la usa per compensare le soglie del pinch. Questo riduce la dipendenza dalla distanza fra mano e camera. AutoTune può essere disattivato e la preferenza viene salvata localmente.

## Session Quality

La telemetria locale misura qualità media del tracking, stabilità del puntatore, rapporto fra intent completati e annullati, numero di perdite della mano, gesture eseguite e selezioni dwell. I dati non vengono inviati né persistiti: vengono azzerati a ogni nuova sessione.

## Privacy

Il video della camera non viene mostrato nell'interfaccia né salvato dall'app. L'elaborazione del tracking avviene nel browser sul dispositivo. L'accesso alla fotocamera richiede HTTPS e consenso esplicito.

## Roadmap

Profili personali di calibrazione, test cross-device, componenti gesture-native riutilizzabili e pacchetto SDK/documentazione per integrare il motore in altre PWA.
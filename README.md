# Air Gesture Lab

PWA **gesture-native** controllata tramite la fotocamera frontale senza mostrare il flusso video nell'interfaccia.

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
- **v1.1** — Personal Calibration: profilo locale guidato che apprende distanza naturale della mano e geometria personale del pinch.
- **v1.2** — Profile Health: validazione passiva del profilo personale attraverso più sessioni, senza modificare automaticamente le soglie già stabilizzate.
- **v1.3** — Profile Memory: memoria locale delle ultime sessioni validate per distinguere una variazione occasionale da una deriva persistente del profilo.
- **v1.4** — Drift Guard: analisi del trend cross-session per distinguere profilo centrato, deriva progressiva e spostamento persistente, senza modificare il Gesture Engine.
- **v1.5** — Profile Passport: esportazione/importazione portabile del profilo personale e delle preferenze essenziali tra dispositivi, senza trasferire immagini, frame o landmark.
- **v1.5.1** — Personal Controls hotfix: la schermata Personal non avvia più automaticamente la calibrazione, introduce un contesto dedicato e aggiunge selezione con pinch oppure hold assistito per i comandi di gestione.

## Architettura

`Front Camera -> MediaPipe Hands -> AirGestureEngine -> AirCommandRouter -> Session Metrics -> Application UI`

Componenti principali:

- `gesture-engine.js` traduce i landmark in eventi semantici (`pointer`, `pinch`, `swipe`, `scroll`, `palm`, `fist`), gestisce Safe Neutral e applica opzionalmente un profilo personale.
- `command-router.js` assegna a ogni evento un significato in base al contesto (`workspace`, `detail`, `practice`, `calibration`, `personal`, `locked`).
- `session-metrics.js` osserva la sessione e produce indicatori diagnostici senza intervenire sui comandi.
- `personal-calibration.js` esegue una procedura guidata in due passaggi e restituisce i parametri personali da applicare al motore.
- `profile-health.js` confronta nel tempo l'uso reale con il profilo personale e produce un indicatore di coerenza cross-session senza cambiare autonomamente il Gesture Engine.
- `profile-memory.js` conserva una sintesi delle ultime sessioni validate e ne calcola l'andamento storico senza modificare le soglie del motore.
- `drift-monitor.js` analizza lo storico già disponibile e calcola tendenza della scala, variazione della qualità e scostamento persistente rispetto al profilo personale.
- `profile-passport.js` esporta/importa il profilo personale in un formato JSON validato e riapplica in modo controllato le preferenze essenziali.
- `personal-controls.js` separa la gestione del profilo dalla calibrazione e fornisce un'alternativa hold al pinch senza modificare le soglie del Gesture Engine.

## Safe Neutral

I comandi discreti non sono immediatamente disponibili: la mano deve prima restare per un breve periodo in una configurazione che non corrisponde a palmo, pugno, pinch o scroll. Solo allora il motore espone `NEUTRAL · READY` e arma il comando successivo. Dopo un comando il sistema torna disarmato fino a un nuovo periodo neutrale.

Il palmo e il pugno hanno hold lunghi e geometrie più severe. Lo swipe richiede un gesto orizzontale netto con posa a indice singolo.

## Slow Dwell

Il dwell introduce prima una fase `SETTLE`, poi un riempimento che non può accelerare oltre il tempo reale. A mano stabile la selezione richiede circa 2,5 secondi complessivi; con maggiore jitter il tempo aumenta ulteriormente. Il dwell progredisce soltanto quando il motore è in `NEUTRAL · READY`.

## 2-Finger Scroll

Lo scroll verticale usa una modalità dedicata: indice e medio distesi, anulare e mignolo non distesi. Dopo un breve armamento la UI mostra `SCROLL MODE · ACTIVE`; da quel momento piccoli movimenti verticali della mano generano lo scroll nella pagina di dettaglio.

## Practice Mode

La v1.0 introduce un contesto `practice`. In questa modalità pinch, swipe, scroll e pugno vengono riconosciuti e mostrati nell'interfaccia, ma il router non esegue navigazione, lock o altre azioni. Il palmo aperto e mantenuto viene usato soltanto per uscire dal Practice Mode.

## Personal Calibration

La v1.1 aggiunge il modulo `Personal`. La procedura è volutamente conservativa e non modifica palmo, pugno o logica di sicurezza già validati.

La calibrazione misura:

1. la scala media della mano nella distanza d'uso naturale;
2. tre pinch completi, da cui ricava un piccolo fattore personale per la soglia thumb-index.

I valori sono limitati a un intervallo sicuro e vengono salvati in `localStorage` come `air_personal`. Alla sessione successiva vengono applicati automaticamente insieme ad AutoTune.

Dalla v1.5.1 l'apertura di `Personal` non avvia più automaticamente la calibrazione: viene mostrata una modalità di gestione separata e la nuova calibrazione parte soltanto tramite il comando `AVVIA CALIBRAZIONE`.

## Personal Controls

La v1.5.1 risolve l'interferenza tra i pinch usati come comandi e i pinch usati come campioni di calibrazione.

Nel nuovo contesto `personal`:

- il pinch può selezionare i comandi di gestione;
- il palmo mantenuto torna al Workspace;
- lo scroll a due dita resta disponibile;
- il pugno non attiva il Safety Lock, così la gestione del profilo è più sicura;
- i comandi principali possono essere attivati anche mantenendo il cursore sul controllo per circa due secondi, senza dipendere dal riconoscimento del pinch.

`AVVIA CALIBRAZIONE` passa temporaneamente al contesto `calibration`, dove i pinch vengono osservati come campioni e non come comandi UI. Al termine della procedura il contesto `personal` viene ripristinato automaticamente.

L'esportazione JSON può essere preparata tramite pinch/hold o tocco. L'importazione continua a richiedere un tocco reale perché il file picker del browser richiede un'attivazione utente attendibile.

## Profile Health

La v1.2 aggiunge una validazione passiva del profilo personale. `profile-health.js` osserva soltanto grandezze già prodotte dal motore e calcola tre aspetti:

- scostamento della scala d'uso rispetto alla calibrazione personale;
- consistenza della distanza della mano durante la sessione;
- frequenza con cui AutoTune raggiunge i limiti del proprio intervallo di compensazione.

Dopo un numero minimo di campioni il profilo viene classificato come `VALID`, `ADAPT` o `RECALIBRATE`. Il risultato non modifica automaticamente le soglie: serve come guardrail diagnostico e come indicazione per decidere quando rifare `Personal Calibration`.

Una sintesi della validazione viene salvata in `localStorage` come `air_profile_health`, insieme al numero di sessioni validate. Non vengono salvati landmark, immagini o frame della fotocamera.

## Profile Memory

La v1.3 aggiunge `profile-memory.js`. Ogni sessione sufficientemente validata aggiorna una sola voce locale identificata tramite `sessionStorage`; ricaricamenti e aggiornamenti della stessa sessione non generano duplicati. Vengono mantenute al massimo le ultime otto sessioni associate all'attuale profilo personale.

Il pannello `PROFILE MEMORY` mostra fino a sei barre storiche e classifica l'andamento come:

- `LEARNING` — è disponibile una sola sessione e non c'è ancora uno storico sufficiente;
- `STABLE` — il profilo è rimasto coerente nel tempo;
- `WATCH` — esiste uno scostamento moderato da osservare nelle sessioni successive;
- `REVIEW` — lo storico suggerisce di valutare una nuova calibrazione.

La memoria storica viene azzerata automaticamente quando viene creato un nuovo profilo personale. Anche in questa fase nessuna soglia viene cambiata automaticamente: la memoria serve soltanto a distinguere un episodio isolato da una deriva ripetuta.

## Drift Guard

La v1.4 aggiunge `drift-monitor.js`, che usa esclusivamente lo storico già registrato in `air_profile_memory` e non osserva direttamente i frame o i landmark.

Dopo almeno tre sessioni validate calcola:

- trend della scala d'uso da una sessione alla successiva;
- trend della qualità del profilo;
- scostamento recente rispetto alla scala personale di riferimento;
- persistenza di uno spostamento nelle ultime sessioni.

Il risultato viene mostrato nel pannello `PROFILE MEMORY` come:

- `CENTERED` / `CENTRATO` — storico coerente, senza deriva significativa;
- `DRIFTING` / `IN OSSERVAZIONE` — è presente una tendenza da monitorare;
- `SHIFTED` / `SPOSTATO` — lo scostamento appare persistente e può essere opportuno rifare la calibrazione.

Anche Drift Guard è soltanto diagnostico: **non cambia automaticamente alcuna soglia del motore**.

## Profile Passport

La v1.5 aggiunge `profile-passport.js`. All'interno della schermata `Personal` compare un pannello che consente di esportare il profilo in un file JSON e di importarlo su un altro browser o dispositivo.

Il pacchetto contiene soltanto:

- scala personale di riferimento;
- fattore personale del pinch;
- metadati minimi della calibrazione;
- preferenze `Precise/Balanced/Fast`, AutoTune e Dwell.

Non vengono esportati Profile Health, Profile Memory, frame, immagini o landmark. Durante l'importazione il file viene validato, i parametri vengono limitati agli intervalli ammessi dal motore e viene assegnato un nuovo `createdAt`, così la validazione cross-session riparte correttamente sul nuovo dispositivo.

L'apertura del selettore file richiede un tocco reale sul dispositivo per ragioni di sicurezza del browser.

## AutoTune

Il motore misura in continuo una scala geometrica della mano dai landmark e la usa per compensare le soglie del pinch. Con un profilo personale attivo, la scala di riferimento viene sostituita con quella misurata durante la calibrazione. AutoTune può essere disattivato e la preferenza viene salvata localmente.

## Session Quality

La telemetria locale misura qualità media del tracking, stabilità del puntatore, rapporto fra intent completati e annullati, numero di perdite della mano, gesture eseguite e selezioni dwell. I dati non vengono inviati né persistiti: vengono azzerati a ogni nuova sessione.

## PWA e cache

Dalla v1.4 il service worker applica il fallback HTML soltanto alle navigazioni same-origin. Le richieste esterne, come gli asset MediaPipe caricati da jsDelivr, non vengono più sostituite erroneamente con `index.html` in caso di errore di rete. Il manifest include `id`, `scope`, orientamento portrait e lingua italiana.

## Privacy

Il video della camera non viene mostrato nell'interfaccia. Il codice dell'app non registra né carica esplicitamente i frame della fotocamera; il tracking e la logica gesture vengono elaborati nel browser. Le librerie MediaPipe vengono caricate da jsDelivr. Il profilo personale, la sintesi Profile Health e lo storico Profile Memory sono conservati soltanto nel browser (`localStorage`/`sessionStorage`). Profile Passport trasferisce soltanto parametri numerici del profilo e preferenze applicative.

## Roadmap

Recovery robusta quando la mano esce dall'inquadratura, confronto del profilo dopo importazione su più dispositivi, componenti gesture-native riutilizzabili e pacchetto SDK/documentazione per integrare il motore in altre PWA.
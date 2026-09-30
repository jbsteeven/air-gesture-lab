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
- **v1.6** — Hand Recovery: perdita e riacquisizione della mano gestite con reset degli stati residui, blocco temporaneo dei comandi e ritorno obbligatorio a una posa neutrale stabile.
- **v1.7** — Transfer Check: verifica passiva del profilo dopo importazione su un nuovo dispositivo, con classificazione `COMPATIBLE`, `ADAPTED` o `RECALIBRATE`, senza cambiare le soglie del motore.
- **v1.7.1** — Personal Freeze Fix: Transfer Check aggiorna il DOM in modo limitato e non ricorsivo, eliminando il freeze della schermata Personal.
- **v1.8** — Tracking Quality Guard: sospensione preventiva dei comandi quando il tracking degrada prima della perdita completa della mano.
- **v1.8.1** — Low Light Resilience: soglie MediaPipe più tolleranti, grace period sui dropout brevi e monitor locale della luminanza.
- **v1.9** — Robustness Core: stato centrale di affidabilità che unifica Hand Recovery, Tracking Quality Guard e Low Light Resilience in una sola API/HUD.

## Architettura

`Front Camera -> MediaPipe Hands -> AirGestureEngine -> Guardrails -> AirRobustnessCore -> AirCommandRouter -> Application UI`

Componenti principali:

- `gesture-engine.js` traduce i landmark in eventi semantici (`pointer`, `pinch`, `swipe`, `scroll`, `palm`, `fist`), gestisce Safe Neutral e applica opzionalmente un profilo personale.
- `command-router.js` assegna a ogni evento un significato in base al contesto (`workspace`, `detail`, `practice`, `calibration`, `personal`, `locked`).
- `session-metrics.js` osserva la sessione e produce indicatori diagnostici senza intervenire sui comandi.
- `personal-calibration.js` esegue una procedura guidata in due passaggi e restituisce i parametri personali da applicare al motore.
- `profile-health.js`, `profile-memory.js` e `drift-monitor.js` validano nel tempo il profilo personale senza cambiare autonomamente le soglie.
- `profile-passport.js` esporta/importa il profilo personale in un formato JSON validato.
- `personal-controls.js` separa la gestione del profilo dalla calibrazione e fornisce un'alternativa hold al pinch.
- `hand-recovery.js` gestisce perdita e riacquisizione della mano neutralizzando gli stati residui.
- `low-light-monitor.js` stima localmente la luminanza media su un frame fortemente ridotto e segnala condizioni `DIM`/`LOW`.
- `tracking-quality-guard.js` intercetta condizioni geometriche anomale prima del riconoscimento delle gesture.
- `transfer-check.js` valida passivamente un profilo importato senza fingerprint del dispositivo.
- `robustness-core.js` aggrega gli stati dei guardrail e pubblica un unico stato operativo riutilizzabile anche da future integrazioni.

## Safe Neutral

I comandi discreti non sono immediatamente disponibili: la mano deve prima restare per un breve periodo in una configurazione che non corrisponde a palmo, pugno, pinch o scroll. Solo allora il motore espone `NEUTRAL · READY` e arma il comando successivo. Dopo un comando il sistema torna disarmato fino a un nuovo periodo neutrale.

Il palmo e il pugno hanno hold lunghi e geometrie più severe. Lo swipe richiede un gesto orizzontale netto con posa a indice singolo.

## Slow Dwell

Il dwell introduce prima una fase `SETTLE`, poi un riempimento che non può accelerare oltre il tempo reale. A mano stabile la selezione richiede circa 2,5 secondi complessivi; con maggiore jitter il tempo aumenta ulteriormente. Il dwell progredisce soltanto quando il motore è in `NEUTRAL · READY`.

## Personal Calibration e Profile Passport

La calibrazione misura la scala media della mano alla distanza d'uso naturale e tre pinch completi. I valori sono limitati a un intervallo sicuro e salvati soltanto nel browser come `air_personal`.

Profile Passport consente di esportare/importare scala personale, fattore del pinch e preferenze essenziali. Non vengono esportati frame, immagini o landmark. L'importazione assegna un nuovo `createdAt`, così Profile Health, Profile Memory, Drift Guard e Transfer Check ripartono correttamente sul dispositivo ricevente.

## Hand Recovery

Quando la mano viene persa dopo che il tracking era attivo, il sistema azzera history di swipe, pinch pendenti, hold di palmo/pugno e stato dello scroll; cancella l'intent ancora aperto; interrompe dwell e riferimenti del puntatore; sospende eventuali campioni di calibrazione e richiede una breve riacquisizione neutrale e stabile.

## Tracking Quality Guard

Il guard controlla in modo conservativo distanza estrema dalla scala di riferimento, presenza di molti landmark sul bordo dell'inquadratura e grandi discontinuità geometriche. Un'anomalia breve non avvia subito Hand Recovery; se persiste, i comandi vengono sospesi e il controllo passa al recovery già validato.

Le soglie gesture (`pinchIn`, `pinchOut`, hold, swipe distance, scroll step) non vengono modificate.

## Low Light Resilience

La v1.8.1 rende il detector meno fragile in condizioni sfavorevoli senza cambiare la logica delle gesture:

- `minDetectionConfidence` passa da `0.72` a `0.66`;
- `minTrackingConfidence` passa da `0.70` a `0.64`;
- brevi dropout di pochi frame vengono assorbiti da un grace period prima di dichiarare la mano persa;
- in luce ridotta il grace period aumenta leggermente;
- `low-light-monitor.js` analizza ogni ~850 ms una miniatura 24×18 del frame per stimare soltanto la luminanza media.

Il monitor non salva né trasmette immagini. Se la luce è insufficiente può segnalare `LIGHT DIM` o `LIGHT LOW`.

## Robustness Core

La v1.9 introduce `robustness-core.js`, che non sostituisce i guardrail ma ne coordina la lettura in un unico stato operativo. La priorità è:

1. `NO HAND` — la mano è realmente persa dopo il grace period;
2. `RECOVERING` — è in corso Hand Recovery o un recovery richiesto dal Quality Guard;
3. `DEGRADED` — il tracking mostra frame geometricamente sospetti ma non è ancora in recovery;
4. `LOW LIGHT` — il tracking è operativo, ma l'illuminazione è ridotta;
5. `READY` — nessun guardrail segnala criticità.

L'HUD centrale sostituisce visivamente i tre badge separati di Hand Recovery, Tracking Quality Guard e Low Light Monitor, evitando messaggi sovrapposti. I moduli originali rimangono attivi come fail-safe e continuano a svolgere la propria funzione.

Il core espone `window.AirRobustnessCore` con:

- `snapshot()` — fotografia dello stato corrente;
- `state` — stato sintetico;
- `commandSafe` — `true` per `READY` e `LOW LIGHT`, `false` per stati degradati/recovery;
- `subscribe(callback)` — sottoscrizione agli aggiornamenti;
- evento browser `airrobustnesschange` per integrazioni esterne.

Il Robustness Core è deliberatamente **osservativo**: non cambia le soglie del Gesture Engine e non introduce nuovi automatismi sui comandi.

## Transfer Check

La verifica si attiva soltanto quando il profilo corrente proviene da un'importazione Profile Passport. Raccoglie passivamente almeno 90 campioni in posa neutrale e valuta rapporto di scala, dispersione, saturazione AutoTune e qualità geometrica media. Il risultato può essere `COMPATIBLE`, `ADAPTED` o `RECALIBRATE` e non modifica automaticamente il profilo.

## Session Quality

La telemetria locale misura qualità media del tracking, stabilità del puntatore, intent annullati, numero di perdite della mano, gesture eseguite e selezioni dwell. I dati non vengono inviati né persistiti e vengono azzerati a ogni nuova sessione.

## PWA e cache

Il service worker gestisce soltanto risorse same-origin e applica il fallback HTML esclusivamente alle navigazioni. Gli asset MediaPipe caricati da jsDelivr restano richieste esterne e non vengono sostituiti con `index.html` in caso di errore di rete.

## Privacy

Il video della camera non viene mostrato nell'interfaccia. Il codice dell'app non registra né carica esplicitamente i frame della fotocamera; tracking e logica gesture vengono elaborati nel browser. MediaPipe viene caricato da jsDelivr. Il monitor di luminosità calcola soltanto una luminanza media locale da una miniatura temporanea 24×18 e non salva immagini. Profilo personale, Profile Health, Profile Memory e Transfer Check restano nel browser.

## Roadmap

API pubblica del motore, componenti gesture-native riutilizzabili, pacchetto SDK/documentazione e successiva separazione del core in moduli importabili per integrare Air Gesture Lab in altre PWA.
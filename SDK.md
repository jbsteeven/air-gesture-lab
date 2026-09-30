# Air Gesture SDK v2.4

La v2.4 introduce **Air Gesture Vocabulary**, un livello opzionale sopra il motore gesture che traduce pose e gesture già validate in trigger astratti configurabili.

Il principio è deliberatamente non distruttivo:

- il Vocabulary è `OFF` per default;
- il Gesture Engine continua a funzionare come prima;
- le soglie di pinch, palm, fist, swipe e scroll non vengono cambiate;
- il Vocabulary non esegue automaticamente azioni dell'app: produce trigger e mapping;
- nella demo principale l'attivazione utente avviene dal pannello **Impostazioni**.

## Import ESM

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
  VOCABULARY_DICTIONARY,
  DEFAULT_VOCABULARY_MAPPING,
  createGestureRuntime,
  createRobustGestureRuntime
} from './sdk/index.mjs';
```

Versione corrente:

```js
VERSION === '2.4.0';
```

## Vocabulary ESM

```js
const engine = new AirGestureEngine();
const vocabulary = new AirGestureVocabulary(engine);

vocabulary.snapshot().enabled; // false
```

Attivazione esplicita:

```js
vocabulary.enable();
```

Disattivazione:

```js
vocabulary.disable();
```

Il modulo può osservare i landmark senza eseguire comandi:

```js
vocabulary.observeLandmarks(landmarks);
```

Le gesture discrete validate dal Gesture Engine possono essere inoltrate con:

```js
vocabulary.handleGesture({ type: 'pinch' });
```

## Dizionario iniziale

```js
VOCABULARY_DICTIONARY
```

contiene:

- `PALM`
- `FIST`
- `POINT`
- `V_SIGN`
- `PINCH`
- `SWIPE_LEFT`
- `SWIPE_RIGHT`

Il mapping standard è:

```js
DEFAULT_VOCABULARY_MAPPING
```

con valori astratti `BACK`, `PAUSE`, `POINT`, `SCROLL`, `SELECT`, `PREVIOUS`, `NEXT`.

## Trigger

```js
const off = vocabulary.onTrigger(trigger => {
  console.log(trigger.token, trigger.action, trigger.source);
});
```

Esempio payload:

```js
{
  token: 'PINCH',
  action: 'SELECT',
  source: 'gesture',
  timestamp: 0
}
```

Il mapping può essere modificato:

```js
vocabulary.setMapping('PALM', 'TRIGGER_1');
```

## Runtime ESM

`createGestureRuntime()` e `createRobustGestureRuntime()` espongono sempre `runtime.vocabulary`, ma il Vocabulary resta disattivato finché non viene richiesto.

```js
const runtime = createRobustGestureRuntime();

runtime.snapshot().vocabulary.enabled; // false
runtime.setVocabularyEnabled(true);
runtime.setVocabularyMapping('PINCH', 'SELECT');

runtime.on('vocabulary', trigger => {
  console.log(trigger);
});
```

È possibile abilitarlo alla creazione del runtime:

```js
const runtime = createRobustGestureRuntime({
  vocabulary: {
    enabled: true,
    holdMs: 650
  }
});
```

Per la demo principale Air Gesture Lab questa attivazione automatica non viene usata: l'utente decide dal pannello Impostazioni.

## Ordine con Robustness

Nel runtime ESM il flusso è:

```text
Landmarks
  -> Tracking Quality Guard / Hand Recovery
  -> Air Gesture Vocabulary
  -> Gesture Engine
  -> Command Router
```

Di conseguenza un frame bloccato dai guardrail non viene usato per costruire un trigger del Vocabulary.

## Browser API

La demo principale espone:

```js
window.AirGestureVocabulary
```

con:

```js
AirGestureVocabulary.enabled;
AirGestureVocabulary.snapshot();
AirGestureVocabulary.setEnabled(true);
AirGestureVocabulary.setMapping('PINCH', 'SELECT');
AirGestureVocabulary.resetMapping();
AirGestureVocabulary.subscribe(callback);
AirGestureVocabulary.onTrigger(callback);
```

La facade browser principale espone inoltre:

```js
window.AirGestureSDK.VERSION; // 2.4.0
window.AirGestureSDK.vocabulary;
window.AirGestureSDK.onVocabulary(callback);
window.AirGestureSDK.onVocabularyChange(callback);
```

Gli eventi browser disponibili sono:

```text
airvocabularychange
airvocabularytrigger
airgesture:vocabulary
airgesture:vocabularychange
```

## Impostazioni della demo principale

Il pulsante Impostazioni apre il pannello dedicato. L'utente può:

- attivare/disattivare Air Gesture Vocabulary;
- visualizzare il vocabolario corrente;
- cambiare il mapping di ciascun token;
- ripristinare il mapping standard.

Non sono presenti preset legati a settori o scenari applicativi specifici.

## Robustness Core

Gli stati restano:

- `READY`
- `LOW LIGHT`
- `DEGRADED`
- `RECOVERING`
- `NO HAND`

Il Vocabulary non modifica questi stati e non modifica `commandSafe`.

## Contract tests

La suite `tests/sdk-contract.test.mjs` verifica:

- versione `2.4.0`;
- Vocabulary OFF per default;
- assenza di trigger quando è OFF;
- trigger dopo attivazione;
- mapping personalizzato;
- Command Router;
- Low Light;
- Robustness Core;
- Quality Guard -> Hand Recovery.

Esecuzione:

```bash
npm test
```

## Package exports

`package.json` espone anche:

```json
{
  "./vocabulary": "./sdk/vocabulary/index.mjs",
  "./browser-vocabulary": "./air-gesture-vocabulary.js"
}
```

Il package resta `private: true`; la v2.4 prepara il Vocabulary alla riutilizzazione nelle applicazioni senza pubblicazione automatica su registry esterni.

# Air Gesture SDK v2.0

`air-gesture-sdk.js` espone una facade pubblica stabile sopra il runtime già usato da Air Gesture Lab.

## Obiettivo

Separare l'uso applicativo dal dettaglio interno di Gesture Engine, Command Router e Robustness Core. La demo continua a funzionare come prima, mentre una PWA esterna può leggere eventi e stato tramite `window.AirGestureSDK`.

## Requisiti runtime

La build corrente usa ancora script browser classici e presuppone che siano già presenti:

- `gesture-engine.js`
- `command-router.js`
- i guardrail opzionali (`hand-recovery.js`, `tracking-quality-guard.js`, `low-light-monitor.js`)
- `robustness-core.js`
- `profile-passport.js` se servono import/export del profilo

`air-gesture-sdk.js` va caricato per ultimo.

## API principale

```js
const sdk = window.AirGestureSDK;

sdk.VERSION;              // "2.0.0"
sdk.enabled;              // true / false
sdk.context;              // workspace, detail, personal, ...
sdk.robustness;           // snapshot del Robustness Core
sdk.metrics;              // snapshot Session Metrics
sdk.snapshot();            // stato complessivo
```

## Eventi

```js
const offGesture = sdk.onGesture(g => {
  console.log(g.type, g);
});

const offPointer = sdk.onPointer(p => {
  console.log(p.x, p.y);
});

const offState = sdk.onStateChange(state => {
  console.log(state.state, state.commandSafe);
});

// disiscrizione
offGesture();
offPointer();
offState();
```

Eventi generici disponibili:

`gesture`, `pointer`, `pose`, `intent`, `tracking`, `command`, `context`, `robustness`, `enabled`, `profile`, `adaptive`, `recovery`, `qualityguard`.

Ogni evento viene anche pubblicato sul browser con namespace `airgesture:*`, per esempio:

```js
window.addEventListener('airgesture:gesture', e => {
  console.log(e.detail);
});
```

Quando l'SDK è pronto viene emesso `airgesture:sdkready`.

## Enable / Disable

```js
sdk.disable();
sdk.enable();
```

`disable()` non spegne la camera e non interrompe il tracking. Sospende il command routing pubblico e disarma gli intent transitori; questo permette a un'app ospite di mantenere il puntatore/diagnostica attivi senza eseguire comandi.

## Profili

```js
sdk.setProfile('balanced');      // precise | balanced | fast
sdk.setAdaptiveScale(true);

sdk.setPersonalCalibration({
  refScale: 0.18,
  pinchFactor: 1.0,
  createdAt: Date.now()
});
```

Le soglie gesture interne non vengono cambiate dall'SDK al di fuori delle API già previste dal motore.

## Profile Passport

```js
const packet = sdk.exportProfilePacket();

// Richiede Profile Passport disponibile nel runtime
sdk.importProfilePacket(packet);

// Il download browser deve essere chiamato da una vera interazione utente
sdk.downloadProfile();
```

## Contesto

```js
sdk.setContext('workspace');
sdk.setContext('detail');
```

Il contesto continua a essere gestito da `AirCommandRouter`; l'SDK ne espone soltanto l'interfaccia pubblica.

## Landmark injection

Per integrazioni future con un detector diverso dal flusso camera della demo:

```js
sdk.processLandmarks(landmarks);
```

L'array deve contenere almeno i 21 landmark della mano attesi dal Gesture Engine.

## Robustness

```js
const { state, commandSafe } = sdk.robustness;
```

Stati correnti:

- `READY`
- `LOW LIGHT`
- `DEGRADED`
- `RECOVERING`
- `NO HAND`

`commandSafe` è `true` per `READY` e `LOW LIGHT`, `false` per gli stati degradati.

## Compatibilità v2.0

La v2.0 introduce una **facade API** senza riscrivere il motore già validato. Questo riduce il rischio di regressioni. La separazione in veri moduli importabili ESM/package verrà affrontata in una fase successiva, mantenendo questa API come contratto pubblico.
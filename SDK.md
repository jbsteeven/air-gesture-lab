# Air Gesture SDK v2.1

Air Gesture Lab espone ora **due livelli di integrazione** compatibili tra loro:

1. `window.AirGestureSDK` — facade browser sopra il runtime completo della PWA;
2. `sdk/index.mjs` — package ESM importabile con Gesture Engine e Command Router indipendenti dal DOM.

La demo continua a usare il runtime già validato. La v2.1 non cambia le soglie gesture.

## 1. Browser facade

La facade classica resta disponibile come prima:

```js
const sdk = window.AirGestureSDK;

sdk.VERSION;              // "2.1.0"
sdk.enabled;              // true / false
sdk.context;              // workspace, detail, personal, ...
sdk.robustness;           // snapshot Robustness Core
sdk.metrics;              // snapshot Session Metrics
sdk.snapshot();
```

Eventi principali:

```js
const offGesture = sdk.onGesture(g => console.log(g.type, g));
const offPointer = sdk.onPointer(p => console.log(p.x, p.y));
const offState = sdk.onStateChange(s => console.log(s.state, s.commandSafe));

// disiscrizione
offGesture();
offPointer();
offState();
```

Eventi generici: `gesture`, `pointer`, `pose`, `intent`, `tracking`, `command`, `context`, `robustness`, `enabled`, `profile`, `adaptive`, `calibration`, `recovery`, `qualityguard`.

Ogni evento viene pubblicato anche come `CustomEvent` browser con namespace `airgesture:*`. Quando la facade è pronta viene emesso `airgesture:sdkready`.

## 2. Package ESM

Il nuovo entrypoint è:

```js
import {
  VERSION,
  AirGestureEngine,
  AirCommandRouter,
  createGestureRuntime
} from './sdk/index.mjs';
```

Versione corrente:

```js
console.log(VERSION); // 2.1.0
```

### Runtime headless

`createGestureRuntime()` crea Engine + Router senza dipendere dalla UI di Air Gesture Lab:

```js
import { createGestureRuntime } from './sdk/index.mjs';

const runtime = createGestureRuntime({
  engine: {
    profile: 'balanced',
    adaptiveScale: true
  },
  context: 'workspace'
});

runtime.on('gesture', g => console.log('gesture', g));
runtime.on('command', c => console.log('command', c));
runtime.on('pointer', p => console.log('pointer', p));

runtime.processLandmarks(landmarks);
```

`processLandmarks()` richiede almeno 21 landmark nel formato atteso dal Gesture Engine.

### API del runtime ESM

```js
runtime.engine;
runtime.router;
runtime.events;
runtime.on(name, callback);
runtime.once(name, callback);
runtime.processLandmarks(landmarks);
runtime.setContext('detail');
runtime.setProfile('precise');
runtime.setAdaptiveScale(true);
runtime.setPersonalCalibration(profile);
runtime.snapshot();
```

Per default gli eventi `gesture` vengono inviati automaticamente al Command Router. Per usare Engine e Router separatamente:

```js
const runtime = createGestureRuntime({
  routeGestures: false
});
```

## Import diretto dei moduli core

È possibile importare le classi senza il runtime helper:

```js
import { AirGestureEngine } from './sdk/core/gesture-engine.mjs';
import { AirCommandRouter } from './sdk/core/command-router.mjs';

const engine = new AirGestureEngine({ profile: 'balanced' });
const router = new AirCommandRouter();

engine.on('gesture', g => router.route(g));
router.on('command', c => console.log(c));
```

Le soglie presenti nel modulo ESM sono le stesse del Gesture Engine browser validato.

## Browser ESM bridge

La demo carica anche:

```html
<script type="module" src="sdk/browser-bridge.mjs"></script>
```

Il bridge espone:

```js
window.AirGestureESM
```

con:

```js
AirGestureESM.VERSION;
AirGestureESM.AirGestureEngine;
AirGestureESM.AirCommandRouter;
AirGestureESM.createGestureRuntime;
AirGestureESM.getBrowserSDK;
AirGestureESM.whenBrowserSDK;
```

Quando il bridge è importato viene emesso l'evento `airgesture:esmready`.

## Collegamento fra ESM e runtime completo

Da un modulo ESM è possibile recuperare la facade browser già attiva:

```js
import { whenBrowserSDK } from './sdk/index.mjs';

const sdk = await whenBrowserSDK();
sdk.onGesture(g => console.log(g));
```

Oppure:

```js
import { getBrowserSDK } from './sdk/index.mjs';

const sdk = getBrowserSDK();
```

## Enable / Disable della facade browser

```js
sdk.disable();
sdk.enable();
```

`disable()` non spegne camera o tracking: sospende il command routing applicativo e disarma gli intent transitori.

## Profili

```js
sdk.setProfile('balanced');
sdk.setAdaptiveScale(true);

sdk.setPersonalCalibration({
  refScale: 0.18,
  pinchFactor: 1.0,
  createdAt: Date.now()
});
```

Nel runtime ESM puro gli stessi metodi sono disponibili tramite `runtime.setProfile()`, `runtime.setAdaptiveScale()` e `runtime.setPersonalCalibration()`.

## Profile Passport

Profile Passport appartiene ancora al runtime browser completo:

```js
const packet = sdk.exportProfilePacket();
sdk.importProfilePacket(packet);
sdk.downloadProfile();
```

Il package ESM core non importa automaticamente `localStorage`, UI Personal, Profile Health, Transfer Check o altri moduli applicativi.

## Robustness Core

La facade browser completa espone:

```js
const { state, commandSafe } = sdk.robustness;
```

Stati correnti:

- `READY`
- `LOW LIGHT`
- `DEGRADED`
- `RECOVERING`
- `NO HAND`

Il package ESM v2.1 separa per ora Engine e Router. Hand Recovery, Low Light, Quality Guard e Robustness Core resteranno moduli browser fino alla successiva fase di estrazione.

## Package metadata

Il repository contiene ora `package.json` con entrypoint ESM:

```json
{
  "exports": {
    ".": "./sdk/index.mjs",
    "./core/gesture-engine": "./sdk/core/gesture-engine.mjs",
    "./core/command-router": "./sdk/core/command-router.mjs",
    "./browser-facade": "./air-gesture-sdk.js"
  }
}
```

Il package è volutamente marcato `private: true`: la struttura è pronta per distribuzione e test, ma non viene ancora pubblicata su un registry.

## Compatibilità v2.1

La v2.1 è una fase **non distruttiva**:

- la PWA esistente continua a usare i file classici;
- `window.AirGestureSDK` continua a funzionare;
- il nuovo package ESM vive in parallelo;
- Gesture Engine e Command Router sono ora realmente importabili senza `window`;
- nessuna soglia di pinch, swipe, palm, fist o scroll viene cambiata.

La fase successiva potrà estrarre in ESM anche Robustness Core e guardrail, mantenendo `sdk/index.mjs` come contratto pubblico.
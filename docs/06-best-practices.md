# 06 — Best practices (resumen local)

Resumen operativo de las 10 páginas oficiales de
[Best practice](https://docs.zepp.com/docs/guides/best-practice/debug/) (v3+),
con ejemplos tal como se aplican en `ZeppAI/` y `ZeppNotes/`.
Si hay conflicto entre este resumen y la doc oficial, manda la oficial.

## 1. Debug — logs por entorno

No hay breakpoints: el log es la herramienta de debug.
[debug](https://docs.zepp.com/docs/guides/best-practice/debug/)

- **Device App** (reloj): `log` de `@zos/utils` con niveles (filtrables en el simulador).
- **Side Service** y **Settings App**: `console.log`.
- Ver logs: botón `Console` del simulador (Device y Settings tienen consola propia;
  el Side Service abre su propia ventana) o modo desarrollador de la Zepp App en real.

```js
// Reloj (page/*.page.js, app.js)
import { log } from '@zos/utils'
const logger = log.getLogger('chat')
logger.log('[lifecycle] chat build')
logger.error('[chat] petición fallida', message)

// Side Service (app-side/index.js) y Settings: console.log está bien
console.log('[zeppai][service] onInit')
```

## 2. Organización de código

Separar estructura / estilo / comportamiento; la lógica pura vive en `utils/`
y se testea en Node sin simulador.
[code-organization](https://docs.zepp.com/docs/guides/best-practice/code-organization/)

- `page/*.page.js`: solo render UI + despacho de eventos.
- `utils/*.js`: funciones puras, sin `@zos/*` (ej. `note-utils.js`, `message-utils.js`).
- Tests: `node tests/*.test.js` con `node:assert` + `import()` dinámico (sin jest).
- Sin código muerto: en `ZeppAI/` se eliminaron restos de plantilla
  (`page/index.js`, `utils/index.js`, `utils/fs.js`, `watchface/`, `app-side/i18n/`).

## 3. Comunicación entre páginas

[​cross-page-communications](https://docs.zepp.com/docs/guides/best-practice/cross-page-communications/)

- Ida con `push({ url, params })`; los params llegan como string JSON → parsear en `onInit`.
- `back()` **no** admite params: a la vuelta se relee del store (o de `globalData`/`sessionStorage`).

```js
// Ida: lista → detalle
import { push } from '@zos/router'
push({ url: 'page/detail.page', params: { id } })

// Vuelta: detail hace back() y la lista recarga con loadNotes() en onInit
import { back } from '@zos/router'
back()
```

En este repo `parsePageParams` (`ZeppNotes/utils/note-utils.js`) acepta objeto,
string JSON y basura (→ `{}`).

## 4. Comunicación Bluetooth (MessageBuilder)

Reloj ↔ móvil solo por BLE, con eventos sobre datos binarios. No reinventar:
usar `shared/message.js` (reloj) + `shared/message-side.js` (móvil).
[bluetooth-communication](https://docs.zepp.com/docs/guides/best-practice/bluetooth-communication/)

1. `import './shared/device-polyfill'` lo primero en `app.js`.
2. `MessageBuilder` en `globalData`: `connect()` en `onCreate`, **`disConnect()` en `onDestroy`**.
3. Side Service: `new MessageBuilder()` + `listen(() => {})`.
4. Eventos: `on('call')` / `call()` / `buf2Json()`; páginas lo leen con
   `getApp()._options.globalData.messageBuilder`.

Puertos fijos: `appDevicePort: 20`, `appSidePort: 0`. Tipos del protocolo
`CHAT`, `CHAT_CHUNK`, `CHAT_DONE`, `CHAT_ERROR`: cambiarlos en ambos lados a la vez.

## 5. Persistencia de datos

[persistence-storage](https://docs.zepp.com/docs/guides/best-practice/persistence-storage/)

- `localStorage` de `@zos/storage` antes que ficheros crudos.
- Patrón: leer en `build`/`onInit`, guardar en `onDestroy` o al mutar.

`ZeppNotes/utils/store.js`: `localStorage` (clave `zeppnotes.v1`) como principal +
fichero `@zos/fs` como respaldo best-effort. `ZeppAI`: historial solo en RAM
(se borra al salir, a propósito).

## 6. Captura de errores

El framework **no** captura errores de lifecycle y los logs se truncan sin
source-maps: envolver lifecycles en `try/catch` e imprimir la pila línea por línea.
[error-catch](https://docs.zepp.com/docs/guides/best-practice/error-catch/)

```js
// utils/error-utils.js (ambas apps)
import { reportError } from '../utils/error-utils.js'
try {
  this.buildUI()
} catch (error) {
  reportError(logger, '[list] build', error) // mensaje + stack línea a línea
}
```

Además cada `build()` con catch pinta una pantalla de error en vez de
dejar el reloj en negro. `buf2Json` en handlers BLE también va en `try/catch`.

## 7. i18n

[i18n](https://docs.zepp.com/docs/guides/best-practice/i18n/) ·
[language-list](https://docs.zepp.com/docs/reference/related-resources/language-list/)

- Textos de widgets con `getText()` de `@zos/i18n`, claves en `page/i18n/<lang>.po`
  (`es-ES.po` + `en-US.po`, **ambos completos**: toda key usada debe existir en los dos).
- `appName` traducido en `app.json` (`i18n` + `defaultLanguage: es-ES`).
- RTL si hiciera falta: `relayoutRtl` (no necesario hoy: solo ES/EN).
- Los logs se quedan en español (no son UI). Cabecera `Language:` del `.po`
  debe coincidir con el idioma del fichero (hubo un `es_ES` copiado en `en-US.po`, ya corregido).

## 8. Adaptación de pantalla

[multi-screen-adaption](https://docs.zepp.com/docs/guides/best-practice/multi-screen-adaption/)

- Todo con `px()` de `@zos/utils` + `designWidth` en `app.json` (aquí `466`, solo target round).
- UI circular: nada interactivo en las esquinas. Cuantías: `VIEW_CONTAINER` + `getTextLayout`
  para scroll de textos largos.
- Si algún día se soporta cuadrada: estilos por forma con `getDeviceInfo().screenShape`
  (`SCREEN_SHAPE_ROUND` / `SCREEN_SHAPE_SQUARE`) y barra de estado de 64 px
  (`setStatusBarVisible`, `updateStatusBarTitle`).

## 9. Gestión de widgets por GROUP

[widget-group](https://docs.zepp.com/docs/guides/best-practice/widget-group/)

- `widget.GROUP` para mostrar/ocultar una zona de un golpe y para un único
  `CLICK_DOWN` con área táctil grande (mejor UX en reloj que N listeners).
- Ojo: dentro del grupo las coordenadas son **relativas** al grupo.
- Hoy no se usa (las páginas se reconstruyen al navegar y no hay regiones
  que alternen visibilidad); aplicarlo si aparece ese caso.

## 10. Adaptación a más dispositivos

[code-adaptations-for-new-devices](https://docs.zepp.com/docs/guides/best-practice/code-adaptations-for-new-devices/)

- Un `target` por familia en `app.json` (aquí solo `round` con sus 6 `platforms`/`deviceSource`);
  recursos por target en `assets/<target>/`.
- Teclas/corona varían por modelo:
  [physical-keys](https://docs.zepp.com/docs/reference/related-resources/physical-keys/).
- No subir `MAX_COMPLETION_TOKENS` ni chunks BLE sin motivo: la Zepp App puede
  suspenderse en el móvil y matar peticiones largas (respuestas cortas a propósito).

# AGENTS.md — ZeppNotes

Notas 100% locales para Amazfit Active 2 Round. **Sin móvil, sin BLE, sin `app-side/`, sin `setting/`**: no añadirlos.

## Arquitectura

- `app.js` — solo importa `./shared/device-polyfill` primero y registra `App`. No añadir lógica.
- `page/index.page.js` — lista; `page/detail.page.js` — ver/borrar; `page/editor.page.js` — crear/editar. Navegación con `push`/`replace` de `@zos/router` y params vía `parsePageParams` (acepta objeto o JSON string).
- `utils/note-utils.js` — lógica pura, sin APIs Zepp, testeable en Node. `noteTitle(content, emptyLabel?)`: pasar `getText('emptyNote')` desde las páginas.
- `utils/store.js` — única capa de persistencia: `@zos/storage` (`localStorage`, clave `zeppnotes.v1`) como principal + fichero `@zos/fs` (`zeppnotes.v1.json`) como respaldo best-effort.
- `utils/constants.js` — límites: `MAX_NOTES=20`, `MAX_CHARS=1500`, `TITLE_PREVIEW_CHARS=32`. No subirlos sin comprobar RAM/`/data` del reloj.
- `shared/device-polyfill.js` — polyfill de Promises del runtime; debe seguir siendo el primer import de `app.js`.
- `app.json` — `appId 20502`, páginas registradas en `targets.round.module.page.pages`, `designWidth 466`, `debug: true`. Al añadir una página hay que registrarla ahí.

## Comandos (cwd = `ZeppNotes/`)

```bash
npm run dev        # zeus dev al simulador
npm run build      # zeus build -> .zab
npm test           # node tests/note-utils.test.js, lógica pura sin simulador
```

## Convenciones / gotchas

- `Page.state` es un objeto de datos plano, **no hay `this.setState()`**: se muta `this.state.x` directamente.
- Coordenadas con `px()` de `@zos/utils`; UI circular 466×466: no poner controles en las esquinas.
- `createNote` devuelve `null` si el contenido queda vacío tras trim; `upsertNote` devuelve `{ notes, ok, reason }` con `reason` `'empty'|'full'` — respetar esos casos en UI.
- Orden siempre por `updatedAt` descendente vía `sortNotes` (no muta); título derivado de la primera línea en `note-utils.js:noteTitle`.
- Tests: asserts con `node:assert` + `import()` dinámico de los módulos ESM (sin jest). Si cambias límites o `note-utils.js`, actualiza `tests/note-utils.test.js`.
- i18n (best practice): todo texto visible vía `getText()` con claves en `page/i18n/es-ES.po` y `en-US.po` (ambos completos). Los logs siguen en español, no son UI.
- Errores (best practice): catches de lifecycles con `reportError` de `utils/error-utils.js` (pila línea por línea); `app.js` usa `log.getLogger`, nunca `console`.

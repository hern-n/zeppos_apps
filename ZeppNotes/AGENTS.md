# AGENTS.md — ZeppNotes

Notas 100% locales para Amazfit Active 2 Round. **Sin móvil, sin BLE, sin `app-side/`, sin `setting/`**: no añadirlos.

## Arquitectura

- `app.js` — solo importa `./shared/device-polyfill` primero y registra `App`. No añadir lógica.
- `page/index.page.js` — lista (con estrella para fijar); `page/detail.page.js` — ver/fijar/borrar; `page/editor.page.js` — crear/editar. Navegación con `push`/`replace` de `@zos/router` y params vía `parsePageParams` (acepta objeto o JSON string).
- `secondary-widget/index.js` — **Widget** (`SecondaryWidget`, pantalla completa al deslizar desde la esfera): 3 notas. `app-widget/index.js` — **Shortcut Card** (`AppWidget`, tarjeta de la pantalla negativa): 2 notas. Ambos sólo responden a clics (`push` a `page/index.page`), re-renderizan en `onResume` si cambió la firma de los datos y están registrados en `app.json` (`module.secondary-widget` y `module.app-widget`).
- `utils/note-utils.js` — lógica pura, sin APIs Zepp, testeable en Node. `noteTitle(content, emptyLabel?)`: pasar `getText('emptyNote')` desde las páginas. Favoritas: `orderedNotes`/`selectNotes(notes, count)` (fijadas primero y después por recencia), `importantCount`, `canMarkImportant`.
- `utils/store.js` — única capa de persistencia: `@zos/storage` (`localStorage`, clave `zeppnotes.v1`) como principal + fichero `@zos/fs` (`zeppnotes.v1.json`) como respaldo best-effort. `toggleImportant(id)` devuelve `{ notes, ok, reason }` con `reason 'limit'` al llegar a 3 fijadas; `persist` recorta el exceso por si acaso.
- `utils/constants.js` — límites: `MAX_NOTES=20`, `MAX_CHARS=1500`, `TITLE_PREVIEW_CHARS=32`, `MAX_IMPORTANT=3`, `WIDGET_NOTES=3`, `CARD_NOTES=2`. No subirlos sin comprobar RAM/`/data` del reloj.
- `utils/theme.js` — paleta (`C`) y rutas de iconos (`IMG`): solo datos, sin APIs Zepp. Páginas, Widget y tarjeta comparten estos colores.
- `shared/device-polyfill.js` — polyfill de Promises del runtime; debe seguir siendo el primer import de `app.js`.
- `app.json` — `appId 20502`, páginas en `targets.round.module.page.pages`, `secondary-widget` y `app-widget` en el mismo `module`, `designWidth 466`, `debug: true`. Al añadir una página hay que registrarla ahí.
- `assets/round/` — recursos: `icon.png`, `preview_es-ES.png` + `preview_en-US.png` (el build **exige** el preview localizado por idioma cuando `apiVersion > 3.0`; `preview.png` es el de respaldo) e `icons/*.png` (FAB y estrellas) referenciados como `icons/xxx.png` desde `@zos/ui`.

## Comandos (cwd = `ZeppNotes/`)

```bash
npm run dev        # zeus dev al simulador
npm run build      # zeus build -> .zab
npm test           # node tests/note-utils.test.js, lógica pura sin simulador
zeus build         # alternativa si el zeus local de node_modules falla
```

## Convenciones / gotchas

- `Page.state` es un objeto de datos plano, **no hay `this.setState()`**: se muta `this.state.x` directamente.
- Coordenadas con `px()` de `@zos/utils`; UI circular 466×466: no poner controles en las esquinas.
- `createNote` devuelve `null` si el contenido queda vacío tras trim; `upsertNote` devuelve `{ notes, ok, reason }` con `reason` `'empty'|'full'` — respetar esos casos en UI.
- Orden siempre por `updatedAt` descendente vía `sortNotes` (no muta); título derivado de la primera línea en `note-utils.js:noteTitle`.
- Tests: asserts con `node:assert` + `import()` dinámico de los módulos ESM (sin jest). Si cambias límites o `note-utils.js`, actualiza `tests/note-utils.test.js`.
- UI de Zepp OS: `press_color` (no `pressed_color`) en `BUTTON`, `normal_src`+`press_src` van siempre juntos y `text_style` es un enum (`WRAP`/`ELLIPSIS`/`NONE`); `text_size`, `color` y `line_space` van como propiedades superiores del `TEXT`.
- Redibujado: no existe `setState`; para cambiar una zona se borran sus widgets con `deleteWidget` y se vuelven a crear (patrón de `renderRows`/`render`/`draw`).
- Shortcut Card: el área de dibujo **no** empieza en el borde de la tarjeta visible. `getAppWidgetSize()` devuelve `w`, `h`, `margin` y `radius`: hay que desplazar el contenido `margin` px (y restar `2*margin` a `w` cuando `w` llega como ancho de pantalla). Comprobarlo con el log `[card] geometry` en el simulador.
- i18n (best practice): todo texto visible vía `getText()` con claves en `page/i18n/es-ES.po` y `en-US.po` (ambos completos). Los logs siguen en español, no son UI.
- Errores (best practice): catches de lifecycles con `reportError` de `utils/error-utils.js` (pila línea por línea); `app.js` usa `log.getLogger`, nunca `console`.

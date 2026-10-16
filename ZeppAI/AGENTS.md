# AGENTS.md — ZeppAI

Agente de IA para Amazfit Active 2 Round. El reloj presenta el chat; el **Side Service (móvil) hace el HTTP a Groq** (`https://api.groq.com/openai/v1/chat/completions`). El reloj nunca recibe la API key.

## Arquitectura

- `app.js` — crea un `MessageBuilder` (`shared/message.js`, puertos `appDevicePort: 20`, `appSidePort: 0`) en `onCreate` y lo desconecta en `onDestroy`. Importar `./shared/device-polyfill` primero.
- `page/index.page.js` — puerta de conexión BLE (`@zos/ble` `connectStatus`); sin conexión no se avanza a `page/chat.page.js`.
- `page/chat.page.js` — chat; historial **solo en memoria**, se borra al salir. Recorta con `limitHistory` (`utils/message-utils.js`: `MAX_HISTORY_MESSAGES=20`, `MAX_MESSAGE_CHARS=1200`).
- `app-side/index.js` — `AppSideService` que escucha eventos `call` con `method: 'CHAT'`, llama a Groq y devuelve `CHAT_CHUNK*` + `CHAT_DONE` / `CHAT_ERROR`. Troceado con `splitIntoChunks` (`STREAM_CHUNK_CHARS=48`, delay 60 ms).
- `setting/index.js` — `AppSettingsPage` (corre en la Zepp App del móvil): guarda `groqApiKey`, `groqModel`, `groqSystemPrompt`, `groqReasoningEffort`. La key de producción vive **solo** aquí.
- `shared/message.js` + `shared/message-side.js` — transporte BLE reloj↔móvil. No cambiar puertos ni tipos de mensaje (`CHAT`, `CHAT_CHUNK`, `CHAT_DONE`, `CHAT_ERROR`) sin actualizar ambos lados.
- `utils/constants.js` — defaults del modelo (`openai/gpt-oss-120b`, `reasoning_effort low`, `max_completion_tokens 768`). `browser_search` como tool `auto` solo se adjunta para modelos `openai/gpt-oss-*`; la decisión es del modelo en el servidor, no hay prefijo en el reloj.
- `utils/error-utils.js` — `reportError(logger, ctx, err)` para catches de lifecycles (best practice error-catch: pila línea por línea).
- `page/i18n/es-ES.po` + `en-US.po` — todo texto visible de widgets vía `getText()` (best practice i18n). Toda key usada debe existir en ambos ficheros.
- `app.json` — `appId 20501`, declara `page` + `app-side` + `setting`, `designWidth 466`, `debug: true`.

## Secretos: flujo `dev-config` (importante)

- `.env.local` (gitignored, solo `GROQ_API_KEY=...`) → `scripts/dev-config.js` genera `app-side/dev-config.local.js` y `setting/dev-config.local.js` (ambos gitignored, nunca commitear).
- `npm run dev` = `dev:config` (sin `--release`, inyecta la key) + `zeus dev`. Falla si no existe `.env.local`.
- `npm run preview` = `dev:config` (con la key de `.env.local` como default) + `zeus preview`. El `.zab` de `dist/` contiene la key: no compartirlo (`dist/` gitignored).
- `npm run build` = `dev-config.js --release` (config **vacía, sin key**) + `zeus build`. Solo `build` es apto para distribuir; en release la key la pone el usuario en Ajustes.
- `app-side/index.js` resuelve la key en este orden: Ajustes → `process.env.GROQ_API_KEY` → `dev-config.local.js`. No invertirlo ni hardcodear keys.

## Comandos (cwd = `ZeppAI/`)

```bash
npm run dev:config                       # regenerar dev-config.local.js desde .env.local
npm run dev                              # dev + key de desarrollo al simulador
npm run preview                          # preview con la key de .env.local por defecto (no compartir el .zab)
npm run build                            # release limpio, sin key (apto para distribuir)
node tests/message-utils.test.js         # tests de lógica pura, sin simulador (no hay npm test)
```

Nunca commitear secretos: `.env.local`, `*/dev-config.local.js` y `dist/` están en `.gitignore` (el `.zab` de preview contiene la key). `.env.example` es la plantilla pública.

## Convenciones / gotchas

- `Page.state` es objeto plano, **no hay `this.setState()`**; coordenadas con `px()`; UI circular 466×466.
- Respuestas cortas a propósito: el sistema del móvil puede suspender la Zepp App y matar peticiones largas. No subir `MAX_COMPLETION_TOKENS` ni el tamaño de chunks BLE (`BLE_SAFE_CHUNK_BYTES=900`) sin motivo.
- `setting/index.js` importa `./dev-config.local` directamente: ese fichero debe existir siempre (lo crea `dev:config`, incluso vacío en release); no romper ese import.
- Tests: `node:assert` + `import()` dinámico del ESM, sin framework. Al tocar `message-utils.js`, actualizar `tests/message-utils.test.js`.
- Sin código muerto: se eliminaron `page/index.js`, `utils/index.js`, `utils/fs.js`, `watchface/` y `app-side/i18n/` (restos de plantilla o rotos). No reintroducir ficheros sin uso.

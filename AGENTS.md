# AGENTS.md — zeppos (raíz)

Este repo sirve para hacer **miniaplicaciones (Mini Programs JS) para smartwatches Amazfit con Zepp OS**, objetivo principal **Amazfit Active 2 Round (466×466, Zepp OS 5.0, `apiVersion` target/compatible `4.0.0`)**.

## Estructura

- `ZeppAI/` — Mini Program con IA (reloj + Side Service en el móvil + ajustes). Ver `ZeppAI/AGENTS.md`.
- `ZeppNotes/` — Mini Program de notas 100% offline en el reloj. Ver `ZeppNotes/AGENTS.md`.
- `docs/` — referencia de Zepp OS y del reloj objetivo (solo lectura). Excepción: `docs/06-best-practices.md` es el resumen local mantenido a mano; actualizarlo si cambian las prácticas aplicadas.

No es un monorepo con workspace: **no hay `package.json` en la raíz**. Cada app es independiente con su propio `package.json`, `app.json`, `app.js` y `node_modules/`. Trabaja siempre con `cwd` dentro de `ZeppAI/` o `ZeppNotes/`.

## Comandos (dentro de cada app)

```bash
npm install          # una vez por app
npm run dev          # Zeus CLI contra el simulador
npm run build        # paquete .zab release
npm run preview      # paquete + QR para reloj real
npm run clean        # borra dist/ build/ .zeus/
```

- Requiere Zeus CLI (`npm install --global @zeppos/zeus-cli`) y Zepp OS Simulator con perfil **Active 2 (Round), 466×466**.
- `dist/`, `node_modules/`, `*.local.js` de config están gitignored. No los commitees.
- Detalle de tooling/simulador: solo lectura en `docs/04-tooling-flujo.md`.

## Best practices oficiales (obligatorio)

Ambas apps siguen las [best practices de Zepp OS](https://docs.zepp.com/docs/guides/best-practice/debug/) (las 10 páginas bajo `best-practice/`, incluidas las dos de comunicación: `cross-page-communications` y `bluetooth-communication`). Al tocar código de `ZeppAI/` o `ZeppNotes/`, respeta estas reglas:

- Device App: logs solo con `log.getLogger('tag')` de `@zos/utils` (nunca `console`); Side Service y Settings: `console.log`.
- Lifecycles con `try/catch` y pila línea por línea vía `utils/error-utils.js` (`reportError`); el framework no captura errores y los logs se truncan.
- Texto visible de widgets siempre con `getText()` de `@zos/i18n` + claves en `page/i18n/es-ES.po` y `en-US.po` (ambos, completos). `appName` i18n ya está en `app.json`.
- Lógica pura y testeable en `utils/` (sin APIs `@zos/*`); páginas solo renderizan y delegan.
- Comunicación entre páginas: `push({url, params})` solo ida; a la vuelta se relee del store (no hay params en `back()`).
- BLE solo vía `MessageBuilder` (`shared/message.js` + `message-side.js`, puertos 20/0); `connect()` en `onCreate`, `disConnect()` en `onDestroy`.
- Persistencia con `localStorage` de `@zos/storage` antes que `@zos/fs` crudo; coordenadas siempre con `px()`.

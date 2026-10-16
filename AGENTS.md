# AGENTS.md — zeppos (raíz)

Este repo sirve para hacer **miniaplicaciones (Mini Programs JS) para smartwatches Amazfit con Zepp OS**, objetivo principal **Amazfit Active 2 Round (466×466, Zepp OS 5.0, `apiVersion` target/compatible `4.0.0`)**.

## Estructura

- `ZeppAI/` — Mini Program con IA (reloj + Side Service en el móvil + ajustes). Ver `ZeppAI/AGENTS.md`.
- `ZeppNotes/` — Mini Program de notas 100% offline en el reloj. Ver `ZeppNotes/AGENTS.md`.
- `docs/` — referencia de Zepp OS y del reloj objetivo. **No editar, no añadir nada ahí** (petición explícita del dueño).

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

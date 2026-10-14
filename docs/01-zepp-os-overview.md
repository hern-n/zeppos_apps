# 01 — Zepp OS Overview

Fuente: https://docs.zepp.com/docs/intro/ (v3+, vigente para Active 2)

## 1. Qué es Zepp OS

Sistema de gestión de salud para wearables de Amazfit/Zepp, orientado a
"crear valor de salud para el usuario". Sobre el SO hay un framework
**ligero** para desarrollar **Watchfaces** y **Mini Programs**.

Para empezar rápido: https://docs.zepp.com/docs/guides/quick-start/

## 2. Versiones y API_LEVEL

- Zepp OS tiene versiones de SO (p. ej. 3.5, 4.0, 4.5, 5.0) y niveles de API (`API_LEVEL`).
- **Active 2 Round = Zepp OS 5.0 / API_LEVEL 4.2** (ver `02-amazfit-active-2-round.md`).
- Regla: programa contra `API_LEVEL 4.2` como máximo para Active 2. Si usas APIs 4.3/4.4 no funcionarán en este reloj.
- Novedades 4.2: ver `https://docs.zepp.com/docs/guides/version-info/new-features-42/` (nota: la intro oficial anuncia 4.2 disponible).

Docs de versiones: `https://docs.zepp.com/docs/intro/version/`

## 3. Tipos de proyecto

| Tipo | Qué es | Cuándo usar |
|------|--------|-------------|
| Mini Program (App) | App JS instalable, con páginas, sensores, ajustes | Nuestro caso |
| Watchface | Esfera (reloj), JS + config, preview 314x314 en Active 2 Round | Si luego queremos esfera |
| SecondaryWidget / Shortcut card | Tarjeta acceso rápido | Active 2 Round lo soporta (`YES`) |
| Keyboard / Workout Extension | Extensiones | Solo si la app lo necesita |

Guías: `Framework Introduction`, `Workout Extension`, `Custom Keyboard` en docs oficiales.

## 4. Arquitectura Mini Program (ideas clave)

- Estructura típica Zeus: `app.json` (config app + permisos + target API), `pages/`, `app.js`, assets.
- UI declarativa con `@zos/ui`: `createWidget(widget.TEXT/BUTTON/...)`, `prop`, `align`, `text_style`.
- Lógica páginas: `Page({ state, build(), onInit, onResume, onPause, onDestroy })`.
- Escala UI: usar `px()` de `@zos/utils` para adaptar a 466x466.
- Permisos en `app.json`: p. ej. `device:os.accelerometer`, `device:os.gyroscope`, `data:os.device.info`.
- Comunicación: BLE con móvil vía Zepp App, `zeus preview` genera QR para instalar en dispositivo real.

## 5. Dónde está cada cosa en la doc oficial

- `Guides / Quick Start` — primer hola mundo.
- `Framework Introduction / arc` — arquitectura.
- `Tools / CLI` — Zeus CLI.
- `App` — referencia `app.json`.
- `Watchface` — quick-start esferas.
- `Design Specifications` — guías diseño circular.
- `Related Resources / Device Basic Information` — tabla dispositivos.
- `Best practice / FAQ / Community` — debug y Discord/GitHub/YouTube.

Comunidad: https://docs.zepp.com/docs/guides/community/

# Documentación Zepp OS — Amazfit Active 2 (Round)

Mini Program en JavaScript para **Amazfit Active 2 redondo (esfera circular)**.

> Aclaración importante: el reloj **NO usa CEP / ES / CETAPP / ESC**.
> Usa **Zepp OS (v5.0 en Active 2) + Mini Programs JS + Zeus CLI**.
> Toda la API citada aquí es la oficial de Zepp OS.

## Reloj objetivo (siempre tener en mente)

- Modelo: **Amazfit Active 2 (Round)** — NO confundir con Active 2 Square.
- Pantalla: circular, **466 x 466 px**, AMOLED 1.32", 2000 nits pico.
- Zepp OS: **5.0**, **API_LEVEL 4.2**.
- `deviceSource`: `8913152*, 8913153, 8913155, 8913159, 10092800*, 10092801, 10092803, 10092807` (`*` = versión China).
- Botones físicos: **2**. Watchface preview: **314 x 314**. `SecondaryWidget: YES`.
- Sensores: BioTracker 6.0 PPG (dual-LED 5PD), acelerómetro, giroscopio, barómetro, luz ambiental, geomagnético, SpO2, temperatura, GPS 5 sistemas, micrófono + altavoz, motor vibración.
- Sin WiFi / sin celular. BT 5.2 BLE. Batería ~270 mAh, ~10 días uso típico.

## Índice de docs

1. `01-zepp-os-overview.md` — qué es Zepp OS, arquitectura, tipos de app.
2. `02-amazfit-active-2-round.md` — ficha completa del reloj, implicaciones UI.
3. `03-api-mini-program.md` — cómo se programa en JS, módulos `@zos/*`, sensores.
4. `04-tooling-flujo.md` — Node + Zeus CLI + simulador + despliegue.
5. `05-referencias.md` — enlaces oficiales y mirror.
6. `06-best-practices.md` — resumen local de las 10 best practices oficiales con ejemplos del repo.

## Fuentes base

- Oficial: https://docs.zepp.com/docs/intro/
- Device list: https://docs.zepp.com/docs/reference/related-resources/device-list/
- Mirror info: https://context7.com/websites/deepwiki_zepp-health_zeppos-docs/llms.txt?tokens=10000
- Consola dev: https://console.zepp.com/
- Repo docs: https://github.com/zepp-health/zeppos-docs

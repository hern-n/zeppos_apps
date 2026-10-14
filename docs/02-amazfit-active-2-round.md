# 02 — Amazfit Active 2 Round (esfera circular)

Fuente device-list oficial: https://docs.zepp.com/docs/reference/related-resources/device-list/
Ficha comercial: AMOLED 1.32" + BioTracker 6.0 + Zepp Flow + mapas offline.

## 1. Ficha dev (la que manda para programar)

```
Equipment name: Active 2 (Round)
Latest API_LEVEL: 4.2
Latest Zepp OS Version: 5.0
deviceSource: 8913152*, 8913153, 8913155, 8913159, 10092800*, 10092801, 10092803, 10092807
Screen shape: Round
Screen resolution: 466 x 466
physical-keys: 2
Watchface preview: 314 x 314
SecondaryWidget: YES
```

`*` = versión China continental. Para `app.json` / test usar el `deviceSource` que corresponda.

## 2. NO confundir con Active 2 Square

| | Round (nuestro objetivo) | Square (NO objetivo) |
|---|---|---|
| Forma | Redonda | Cuadrada radio 86 |
| Resolución | 466x466 | 390x450 |
| Preview esfera | 314x314 | 266x307 |
| deviceSource | 8913152... / 10092800... | 10223872... |
| API/Zepp OS | 4.2 / 5.0 | 4.2 / 5.0 |

Mismo SO/API, distinta geometría. Todo el layout debe pensarse **circular**.

## 3. Hardware y sensores (implicaciones API)

- Pantalla AMOLED 1.32", 353 ppi, hasta 2000 nits, cristal zafiro (premium) / templado (standard).
- BioTracker 6.0 PPG dual-LED 5PD + algoritmos PulsePrecision (FC) y RestoreIQ (sueño).
- Acelerómetro YES, giroscopio YES, barómetro YES (altitud/esquí), luz ambiental YES, geomagnético YES.
- SpO2 sí (todo el día), temperatura sí, HRV/estrés/sueño sí. ECG NO, presión NO, composición NO.
- Micrófono YES + altavoz YES → Zepp Flow (voz), avisos por voz en rutas.
- Vibrador YES. Buzzer / SystemSounds desde API 3.6 (ver `03-api-mini-program.md`).
- GNSS 5 sistemas + mapas offline con giro a giro.
- 164 modos deporte, Zepp Coach, Readiness, 5 ATM, 270 mAh (~10 días típico, ~21h GPS continuo).
- BT 5.2 BLE, llamadas BT, notificaciones, control música. **Sin WiFi, sin música onboard declarada, sin NFC global (solo premium EU Zepp Pay).**

## 4. Reglas de diseño para 466 redondo

1. Centrar contenido, evitar esquinas (se recortan en círculo).
2. Usar `px()` de `@zos/utils`, no píxeles duros.
3. Botones grandes, texto legible con sol (alto contraste).
4. 2 teclas físicas: no asumir corona ni 4 botones (como T-Rex).
5. Probar siempre en simulador **Active 2 Round 466x466**, no en Square ni 480x480 (Balance/T-Rex 3).
6. Ahorro batería: frecuencia sensores baja (`FREQ_MODE_LOW` cuando baste), `stop()`/`offChange()` al salir.

## 5. Chequeo en código

```js
import { getDeviceInfo } from '@zos/device'
// width/height esperados: 466 / 466 en este reloj
// permission: data:os.device.info
```

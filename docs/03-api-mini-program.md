# 03 — API Mini Program (JavaScript)

Cómo se programan apps JS para Active 2 (API_LEVEL 4.2).
Fuentes: docs.zepp.com + mirror deepwiki `llms.txt` (ejemplos verificados).

## 1. Base JS

```js
import { createWidget, widget, prop, align, text_style } from '@zos/ui'
import { px } from '@zos/utils'

Page({
  state: { pageName: 'HOME' },
  build() {
    createWidget(widget.TEXT, {
      x: px(50), y: px(100), w: px(366), h: px(60),
      text: 'Hola Active 2',
      align_h: align.CENTER_H,
      text_style: text_style.NONE,
    })
  },
  onInit() {}, onResume() {}, onPause() {}, onDestroy() {}
})
```

Módulos: `@zos/ui`, `@zos/sensor`, `@zos/device`, `@zos/utils`, `@zos/app`, `@zos/storage`, `@zos/ble`, `@zos/notification`, etc.

## 2. Sensores movimiento

Permisos `app.json`: `device:os.accelerometer`, `device:os.gyroscope`.

```js
import { Accelerometer, Gyroscope, FREQ_MODE_NORMAL, FREQ_MODE_LOW } from '@zos/sensor'

const acc = new Accelerometer()
const cb = () => console.log(acc.getCurrent())
acc.onChange(cb)
acc.setFreqMode(FREQ_MODE_NORMAL)
acc.start()
// al salir:
// acc.offChange(cb); acc.stop()

const gyro = new Gyroscope()
const cb2 = () => console.log(gyro.getCurrent())
gyro.onChange(cb2)
gyro.setFreqMode(FREQ_MODE_LOW)
gyro.start()
```

## 3. Vibración + sonido (feedback)

```js
import { Vibrator, VIBRATOR_SCENE_SHORT_LIGHT, VIBRATOR_SCENE_NOTIFICATION } from '@zos/sensor'
const vib = new Vibrator()
vib.start({ mode: VIBRATOR_SCENE_SHORT_LIGHT }) // click
// vib.start({ mode: VIBRATOR_SCENE_NOTIFICATION }) // aviso importante

import { Buzzer, SystemSounds } from '@zos/sensor' // desde API 3.6, OK en 4.2
const buzzer = new Buzzer()
if (buzzer.isEnabled()) buzzer.start(buzzer.getSourceType().ALARM)

const sys = new SystemSounds()
if (sys.getEnabled()) sys.start(sys.getSourceType().ACHIEVE, 0)
// sys.stop()
```

Tipos Buzzer: `ALARM, REMIND_1, REMIND_2, OPERATE, SUCCESS, FAILURE`.
Tipos SystemSounds: `ALARM, MESSAGE, REGULAR, ACHIEVE, CAMERA, ABN_HIGH, ABN_LOW, SOS`.

Combinar vibración + buzzer para notificaciones importantes.

## 4. Compatibilidad sensores

```js
import { checkSensor, Geolocation, Buzzer } from '@zos/sensor'
if (checkSensor(Geolocation)) { /* new Geolocation() */ }
if (checkSensor(Buzzer)) { /* new Buzzer() */ }
```

## 5. Pantalla y device info

```js
// Screen: API 3.0+
// getStatus(): 1 On, 2 Off. onChange(cb) para eventos display.
// getDeviceInfo(): width/height, etc. Permiso data:os.device.info
```

## 6. SecondaryWidget (Active 2 Round = YES)

```js
SecondaryWidget({
  onInit() {},   // primera creación
  build() {},    // construir UI tarjeta
  onResume() {}, // gana foco
  onPause() {}   // pierde foco
})
```

Útil para acceso rápido / complicaciones.

## 7. Buenas prácticas Active 2

- Fijar `apiLevel: 4.2` y `deviceSource` Round en config.
- Pedir solo permisos necesarios.
- `start()` al entrar, `stop()` al salir. Preferir `FREQ_MODE_LOW`.
- UI circular: no poner botones en esquinas 466x466.
- Probar `isEnabled()/getEnabled()` antes de sonar/vibrar (respeta ajustes sistema).

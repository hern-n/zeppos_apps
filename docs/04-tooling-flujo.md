# 04 — Tooling y flujo (Zeus CLI)

Fuente: docs `Tools / CLI` + mirror deepwiki getting-started / simulator / faq.

## 1. Requisitos

- Node.js 16+ (recomendado LTS, p. ej. v20.15.0 + npm 10.7.0).
- Con nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install --lts
nvm use --lts
node -v
npm -v
```

## 2. Instalar Zeus CLI

```bash
npm i @zeppos/zeus-cli -g
# red China:
# npm config set sharp_binary_host "https://npmmirror.com/mirrors/sharp"
# npm config set sharp_libvips_binary_host "https://npmmirror.com/mirrors/sharp-libvips"
# npm i @zeppos/zeus-cli -g --registry "https://registry.npmmirror.com"
```

## 3. Crear / desarrollar

```bash
zeus create mi-app   # interactivo: template, tipo app, componentes
cd mi-app
zeus dev             # compila y empuja al simulador (Device Simulator activado)
zeus preview         # QR para instalar en reloj real vía Zepp App (requiere login)
zeus config get timeout  # ejemplo config
```

## 4. Simulador

- Instalar Zepp OS Simulator, activar Device Simulator.
- Ubuntu 24 (noble): instalar `libcapstone4 libsdl2-dev libaio-dev`, symlink `libaio.so.1` si falta, y:

```bash
sudo chmod 4755 /opt/simulator/chrome-sandbox
```

- Seleccionar **Active 2 (Round) 466x466**, API 4.2.
- Ver logs en `sim-debug.log` si algo falla.

## 5. Audios a opus (si la app usa sonidos, FAQ)

```bash
npm install opusscript wav
# + ffmpeg para convertir wav -> opus según guía FAQ
```

## 6. Flujo recomendado para este proyecto

1. `zeus create` en `~/Dev/zeppos/` (fuera de `docs/`).
2. Fijar target Active 2 Round en `app.json`.
3. `zeus dev` + simulador Round.
4. `zeus preview` a reloj real cuando compile.
5. Publicar vía https://console.zepp.com/

## 7. Debug rápido

- `Best practice / debug` + `FAQ` en docs oficiales.
- Revisar permisos `app.json` si un sensor devuelve null.
- Revisar `API_LEVEL` si un método no existe (no usar 4.3/4.4 en Active 2).

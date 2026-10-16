# ZeppAI

Mini Program para Amazfit Active 2 Round (466 × 466, Zepp OS 5.0).
El requisito mínimo de la app es API 4.0 para ampliar compatibilidad de firmware.
El reloj presenta el chat y se comunica por Bluetooth con el Side Service de
la Zepp App; el móvil realiza las peticiones HTTP a Groq.

## Preparar

1. Instala Node.js y Zeus CLI (`npm install --global @zeppos/zeus-cli`).
2. Ejecuta `npm install` en esta carpeta.
3. Abre Zepp OS Simulator y selecciona Active 2 (Round), 466 × 466.

En Linux, el repositorio incluye una configuración Docker que instala el
paquete `simulator_2.1.2_linux_amd64.deb` de la raíz y comparte la pantalla X11
del anfitrión. Desde la raíz del repositorio ejecuta:

```bash
docker compose -f docker-compose.simulator.yml up --build
```

Docker debe tener acceso a su daemon y a la sesión gráfica X11 del usuario.
Después, compila la app y carga el `.zab` generado en el simulador.

## Ejecutar en desarrollo

Para probar el Side Service en el simulador, crea `.env.local` con:

```ini
GROQ_API_KEY=tu_clave_de_groq
```

Luego ejecuta `npm run dev`. La clave se copia al módulo de desarrollo
ignorado por Git y se incluye en el paquete local de Zeus. Trata ese paquete
como un secreto y no lo compartas.

## Probar en el reloj (`preview`, con tu clave por defecto)

Ejecuta `npm run preview`. Genera el paquete con la clave de tu `.env.local`
ya incluida como valor por defecto, para no tener que escribirla a mano en el
reloj. El `.zab` resultante **contiene tu clave**: está en `dist/` (ignorado
por Git), no lo subas a GitHub ni lo compartas.

## Crear un paquete limpio para distribuir

Ejecuta `npm run build`. Genera primero una configuración limpia sin clave de
desarrollo. En la app Zepp del móvil, abre
los ajustes de ZeppAI e introduce la clave de Groq; esta configuración se
guarda en el teléfono y el reloj nunca recibe la clave. La IA decide cuándo
usar la búsqueda web para información reciente o para verificar datos.

Al conectar, ZeppAI pasa al chat; toca **Escribir** para abrir el teclado.

La clave personal guardada en Ajustes se envía desde el teléfono directamente
a `api.groq.com` para atender cada consulta. No compartas esa clave.

## Estructura

- `page/`: pantalla de conexión y chat del reloj.
- `app-side/`: peticiones a Groq desde el teléfono.
- `setting/`: ajustes de la clave y preferencias de modelo.
- `shared/`: comunicación Bluetooth entre reloj y teléfono.
- `utils/message-utils.js`: historial y fragmentación de mensajes.
- `../docs/`: documentación de Zepp OS y del reloj objetivo.

El historial vive solo en memoria y se borra al salir de la app. La conexión
al teléfono es necesaria. Las peticiones largas pueden fallar si el sistema
del móvil suspende la Zepp App; para respuestas cortas se usa razonamiento de
bajo coste y un límite de salida reducido.

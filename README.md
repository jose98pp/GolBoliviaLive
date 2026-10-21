# GolBolivia Live

Transmisión en vivo del fútbol boliviano (React + Vite + Express + Firestore).

## Ejecutar en local

Requisito: [Bun](https://bun.sh).

1. Instalar dependencias: `bun install`
2. Copiar `.env.example` a `.env` y completar las variables (ver abajo).
3. Levantar la app: `bun run dev` → http://localhost:3000

> Ojo: en local la app usa el mismo proyecto de Firebase que producción.

## Variables de entorno (también en Vercel → Settings → Environment Variables)

| Variable | Uso |
| --- | --- |
| `SERVER_SECRET` | Firma de los tokens de sesión del panel. Mínimo 32 caracteres aleatorios. Sin él, el login queda deshabilitado en producción. |
| `ADMIN_PIN`, `TRANSMISOR_PIN`, `MODERADOR_PIN`, `EDITOR_PIN` | PIN de cada operador (mínimo 6 caracteres). Un usuario sin PIN no puede entrar. |
| `FIREBASE_SERVER_EMAIL`, `FIREBASE_SERVER_PASSWORD` | Usuario de Firebase Auth con el que el backend escribe en Firestore. |

## Seguridad de Firestore

Las reglas (`firestore.rules`) permiten lectura pública, pero **solo el backend puede escribir** (salvo crear mensajes de chat validados). Para habilitar al backend:

1. Firebase Console → Authentication → activar **Email/Contraseña** y crear un usuario (ej. `backend@tu-dominio`).
2. Copiar su **UID** y crear en Firestore el documento `admins/{UID}` (puede quedar vacío).
3. Poner su email y contraseña en `FIREBASE_SERVER_EMAIL` / `FIREBASE_SERVER_PASSWORD`.
4. Las reglas deben incluir `iptvCustomChannels/{channelId}` con lectura pública y escritura restringida a `isBackend()`, como el resto del catálogo.
5. Publicar las reglas: `firebase deploy --only firestore:rules` (o pegarlas en la consola).

El estado local del servidor (`data/stream-state.json`) contiene la stream key y no se versiona.

## Validación de canales y reproductor

- `bun run lint`: comprobación de TypeScript.
- `bun run test`: frontend, rutas IPTV con persistencia simulada, caché y recuperación HLS. No necesita credenciales ni escribe en Firebase. Las pruebas HLS usan Chromium con React real y un motor HLS simulado; por defecto buscan `/usr/bin/chromium` (configurable con `CHROMIUM_PATH`).
- `bun run test:streams`: comprobación independiente con acceso a Internet. Descarga el catálogo, sigue una variante HLS, descarga un segmento y decodifica un fotograma mediante FFmpeg. Requiere `curl` y `ffmpeg`; respeta el proxy y la verificación TLS. Guarda el informe en `/tmp/golbolivia-stream-smoke.json` (configurable con `STREAM_SMOKE_REPORT`). Un bloqueo del proxy se informa por separado de un fallo del origen y produce salida distinta de cero.

El reproductor prueba el proxy una sola vez por fuente, permite dos recuperaciones de red y una de medios, y cambia a un respaldo distinto si está habilitado. Un arranque o bloqueo de reproducción tiene un límite de 30 segundos por fuente. Al agotarse la recuperación muestra el error y permite reintentar manualmente; pausar y reanudar no reinicia esos límites.

En el entorno cloud con Node 24 y un proxy HTTPS configurado, iniciar el servidor con `NODE_USE_ENV_PROXY=1 bun run dev` para que las descargas del backend usen ese proxy. Las pruebas de señales reales necesitan acceso a los dominios de las listas, los manifiestos y sus segmentos; permitir solo el catálogo no permite reproducir los vídeos.

### DNS del entorno cloud

Si el DNS nativo devuelve `ECONNREFUSED`/`EAI_AGAIN`, el inicio del entorno puede cargar `scripts/cloud-dns.mjs` con `NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--import=/workspace/GolBoliviaLive/scripts/cloud-dns.mjs"`. Requiere Node 24, `NODE_USE_ENV_PROXY=1`, acceso HTTPS a `dns.google` y `CLOUD_DNS_ALLOWED_HOSTS` con los nombres exactos de los servidores de vídeo, separados por comas.

El complemento solo interviene cuando falla el DNS nativo para esos nombres. Consulta A y AAAA por HTTPS, verifica la respuesta, comparte solicitudes concurrentes y respeta el TTL hasta cinco minutos. Devuelve todas las direcciones al proxy para que siga rechazando destinos privados; no desactiva la protección SSRF ni la verificación TLS. `bun run test:cloud-dns` comprueba el comportamiento con respuestas simuladas sin acceder a Internet.

Guardar el borrador del entorno no aplica ni publica los permisos de red. Esa acción debe completarse con **Guardar/Publicar** en la interfaz del entorno. Hasta que `dns.google` y los servidores de vídeo sean accesibles, la reproducción real seguirá pendiente aunque las pruebas locales pasen.

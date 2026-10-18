# Correcciones aplicadas

## ⚠️ ANTES de desplegar en Vercel (obligatorio)
Ya **no existen PIN ni secreto por defecto**. Si no configuras estas variables en
*Vercel → Settings → Environment Variables*, nadie podrá entrar al panel:

| Variable | Requisito |
|---|---|
| `SERVER_SECRET` | 32+ caracteres aleatorios. Generar: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_PIN`, `TRANSMISOR_PIN`, `MODERADOR_PIN`, `EDITOR_PIN` | 6+ caracteres cada uno |
| `FIREBASE_SERVER_EMAIL`, `FIREBASE_SERVER_PASSWORD` | Igual que antes |

Después de desplegar, **cambia todos los PIN** (los anteriores `admin123`, `trans123`, `mod123`, `edit123` y `4578`
estuvieron publicados en el código) y rota `SERVER_SECRET` para invalidar tokens antiguos.
Publica también las reglas: `firebase deploy --only firestore:rules`.

## Qué se corrigió
1. **Login** (`serverApp.ts`, `api/index.js`): eliminados PIN por defecto, el `4578` y el secreto de respaldo.
   Sin variable de entorno, ese usuario no puede entrar; sin `SERVER_SECRET`, el login se desactiva (503).
2. **Proxy `/api/proxy`** (`api/proxy.js`):
   - Bloquea destinos internos (localhost, 10.x, 192.168.x, 169.254.x, IPv6 privadas/mapeadas, etc.) incluso tras redirecciones (máx. 5).
   - Solo entrega tipos de streaming; HTML/JS externo se sirve como binario con `CSP: sandbox` (evita XSS desde tu dominio).
   - Límite de tamaño (25 MB), tiempo (15 s) y peticiones por IP/minuto; errores sin filtrar detalles internos.
   - Lista de dominios opcional con `PROXY_ALLOWED_HOSTS` (recomendada).
3. **Chat**: remitente limitado a 40 caracteres, texto saneado y límite de 1 mensaje por segundo por IP.
4. **Reglas de Firestore**: `audit_logs` ya no es de lectura pública; `isVip` debe ser booleano y `superChatAmount` un número entre 0 y 1000.
5. `.env.example` actualizado con las variables del proxy.

## Pruebas realizadas
Pruebas del proxy ejecutadas con Node (validación, bloqueo SSRF IPv4/IPv6, redirecciones, HTML malicioso, flujo M3U8/.ts). Los archivos pasaron `node --check`.
No pude ejecutar `npm run build`, `tsc` ni `npm test` completo (sin acceso a internet para instalar dependencias): ejecútalos tú antes de desplegar.

## Pendiente (no corregido, requiere decisiones tuyas)
- **VIP y Super Chat siguen siendo decorativos**: no hay verificación de pago real; cualquiera puede mostrar una insignia VIP.
- **Estado en Vercel**: `data/stream-state.json` se guarda en `/tmp` (efímero); para que chat, configuración y espectadores sean fiables, usa Firestore como fuente de verdad.
- **Control remoto en la web**: la app Android inyecta la navegación con flechas; la web en sí no la trae.
- CORS general sigue en `*` (el login usa token Bearer, no cookies, por lo que el riesgo es bajo).

---

# Datos locales y portada de partidos (segunda ronda)

## Sin sobrescritura de datos locales — solo lo que se crea
- **Partidos:** el servidor/Firebase es la única fuente. Se eliminó la copia en `localStorage` (`golbolivia_live_events`) en `App.tsx`,
  `LiveEventsManager.tsx` y `apiClient.ts`. Antes la copia local "resucitaba" partidos borrados y podía pisar datos nuevos.
  Al abrir la web, la copia antigua se borra sola.
- **Panel de partidos (admin):** la lista se reemplaza por la que manda el servidor (los eliminados desaparecen); solo se protege el partido que estás editando.
- **Sin datos de ejemplo:** se quitó la encuesta falsa ("Clásico Paceño", 1759 votos), las estadísticas inventadas
  (posesión 56/44, etc.), la cronología de ejemplo y las transacciones VIP de muestra. Ahora todo aparece vacío/en cero hasta que exista un dato real
  (las estadísticas oficiales siguen llegando por ESPN cuando hay coincidencia).
- El botón "Encuesta" del chat solo aparece si hay una encuesta real.

## Portada de partidos simplificada
- Eliminada la tira de píldoras con marcadores que duplicaba la lista (había marcador en la tira, en la tarjeta y en el reproductor).
- Nueva tarjeta única por partido: estado, torneo, equipos con marcador y un botón "Ver partido". Se quitaron etiquetas de proveedor,
  textos de relleno y el estadio. Filtros reducidos a Todos / En vivo / Hoy. Cada tarjeta es un `<button>`: funciona con control remoto.

## Verificación
Sintaxis TS/TSX validada con el compilador de TypeScript y comparación de errores de tipos contra el proyecto original: **0 errores nuevos**
(los errores base se deben a dependencias no instaladas en mi entorno). No pude hacer `vite build` ni ver la interfaz: pruébala antes de publicar.

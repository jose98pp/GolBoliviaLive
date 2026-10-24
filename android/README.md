# GolBoliviaLive · Android TV y tablet

Cliente público para TV y tablet, independiente del frontend web. Portada con partido destacado y tarjetas de colores inspiradas en la referencia Apple TV: escudos, equipos, marcador y estado (en vivo, entretiempo, VAR, programado o finalizado). Incluye búsqueda, foco visible y favoritos locales. Compatible con Android 6+ en tablet, Android TV y Google TV. No es una app de tvOS ni incorpora administración, credenciales de emisión o escritura en el servidor.

## Abrir y compilar

1. Abrir esta carpeta `android/` en Android Studio y sincronizar Gradle.
2. Usar JDK 17, Android SDK 35 y Gradle 8.9 (wrapper incluido).
3. Ejecutar `./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug` (`gradlew.bat` en Windows).
4. APK de prueba: `app/build/outputs/apk/debug/app-debug.apk`.
5. Instalar con `adb install -r app/build/outputs/apk/debug/app-debug.apk` o copiar el APK a la tablet/TV y permitir la instalación para la aplicación que abre el archivo.

GitHub Actions también genera el APK en el workflow **Android TV and tablet APK**. Se puede ejecutar manualmente desde Actions; el archivo está en el artefacto `GolBoliviaLive-TV-tablet-debug`. Para publicar en una tienda se debe crear una firma de release propia, aumentar versión y completar sus requisitos; este APK usa firma de desarrollo.

## Fuente pública

`BuildConfig.PUBLIC_BASE_URL` se configura en `app/build.gradle.kts` y apunta inicialmente a `https://golbolivialive-beta.vercel.app`. El cliente consulta únicamente:

| Método | Endpoint | Uso |
| --- | --- | --- |
| GET | `/api/live-events` | Partidos y fuentes públicas |
| GET | `/api/iptv/sports` | Catálogo compartido de canales |
| GET | `/api/clubs` | Nombres, colores y escudos configurados |
| GET | `/api/football-api/teams?league=…` | Completar escudos cuando faltan |
| GET | `/api/football-api/match/:id?league=…` | Estado, minuto y marcador del evento ESPN vinculado |

Actualiza partidos y canales cada 30 segundos en primer plano. Durante la reproducción actualiza el encabezado con marcador y estado sin reconstruir el reproductor ni interrumpir la señal. Los escudos se resuelven con el catálogo del sitio y su API pública de equipos, con caché de imágenes en memoria. Si faltan o no se pueden descargar se muestran iniciales, sin inventar escudos. Los marcadores y minutos proceden de la API: no se simulan ni se avanza el reloj localmente. Si falla una consulta conserva el último resultado **en memoria** y permite reintentar. Al volver del segundo plano reanuda las consultas. No hay catálogo inventado ni modo de video sin conexión.

## Control remoto y táctil

| Acción | Control |
| --- | --- |
| Navegar | Flechas del D-pad |
| Abrir | OK / centro / toque |
| Favorito desde catálogo | Mantener OK o pulsación larga |
| Favorito desde reproductor | Botón Favorito |
| Mostrar controles | OK sobre el video |
| Reproducir / pausar | Tecla multimedia en HLS/YouTube; controles oficiales en Kick y otros embeds |
| Pasar del video a los botones de la app | Menú; otra pulsación devuelve el foco al video |
| Seleccionar otra fuente disponible | Siguiente señal |
| Cambiar canal | CH+ / CH− si está activado en Ajustes |
| Volver al catálogo | Atrás o botón Volver |
| Salir | Atrás en Inicio y confirmar |

Ajustes persistentes: reproducción automática, CH+/CH−, texto grande y calidad máxima (automática, 480p, 720p, 1080p). El volumen lo controla Android/TV. No requiere emparejar un mando dentro de la app: se usa el mando que ya funciona con Android TV o un teclado/mando Bluetooth emparejado en los ajustes de Android. No incluye control desde otro teléfono por Wi-Fi.

## Giro y pantalla completa (0.2.2)

- El giro y los cambios de tamaño conservan la Activity y el reproductor existentes; se redimensiona la vista sin salir del partido ni reiniciar la señal. El catálogo se vuelve a distribuir cuando cambia su tamaño.
- Si Android recrea la Activity por otro motivo, el estado guardado permite recuperar partido/canal, fuente seleccionada e intención de reproducción. La recuperación abre de nuevo la señal; no mantiene un proceso de video vivo cuando Android lo destruye.
- El video usa toda la vista, sin reservar espacio para cabeceras o botones. Estado, marcador y acciones son una capa superpuesta que se oculta. Todos los controles, incluido el botón ☰, desaparecen tras cinco segundos sin interacción. Un toque o la tecla Menú permiten mostrarlos otra vez. Los toques se entregan al video antes de mostrar la capa.
- En HLS, Encajar conserva la imagen entera y Llenar ocupa la pantalla recortando bordes. El ajuste se recuerda. Los reproductores web conservan los controles y límites de imagen de su proveedor; una señal panorámica en pantalla vertical puede tener bandas por su proporción.
- El enlace `espnLink` del partido debe tener `enabled`, `league` y `eventId` válidos. La app consulta el resumen ESPN a través del backend cada 30 segundos y actualiza los campos deportivos en memoria; no cambia la configuración del video ni escribe resultados en producción. Si falla la consulta conserva el último resultado del mismo vínculo e indica «ESPN sin actualizar». Un partido sin vínculo activo usa el estado manual.

## Reproducción

- Media3 ExoPlayer para HLS HTTPS: Cloudflare Stream, MediaMTX expuesto mediante HTTPS y canales HLS del catálogo.
- Respeta el proveedor principal, `fallbackOrder`, respaldo activo y `autoFailoverEnabled`. Ante error de HLS prueba la siguiente fuente habilitada una vez. Para un error del reproductor web se ofrece Reintentar o Siguiente señal; no se infiere que una página cargada implique video reproduciéndose.
- YouTube, Kick y fuentes `iframe`/externas se reproducen **dentro de la app**, mediante Android WebView. No se lanza un navegador ni una app externa. HLS conserva Media3.
- Desde 0.2.1, Kick y las fuentes web se cargan como un `<iframe>` hijo de un documento interno, no como la página principal de WebView. Esto corrige la integración con proveedores que exigen `window.self !== window.top` y mostraban «Este contenido solo está disponible dentro de un iframe». Se mantienen la identidad real de la app y la política HTTPS; si el proveedor exige un dominio autorizado o bloquea la incrustación, debe habilitarlo el propio proveedor. No se falsifica el dominio de otra web.
- YouTube utiliza IFrame Player API con la identidad real del paquete (`https://com.golbolivialive.tv`), controles oficiales, errores de incrustación y Play/Pausa mediante la API oficial. Kick usa `player.kick.com` con sus controles oficiales. Los enlaces de YouTube/Kick recibidos como iframe se normalizan al reproductor oficial.
- La pantalla completa del proveedor se integra con la app; Atrás primero sale de pantalla completa. Se libera WebView al cerrar o pasar a segundo plano para detener el audio.
- Se requiere Android System WebView disponible y actualizado. Un video privado, restringido o con incrustación desactivada puede no reproducirse. Se muestra el error del proveedor; no se extraen URLs de YouTube/Kick ni se eluden restricciones.
- WebView no expone interfaces JavaScript nativas, archivos locales o intents externos; conserva validación TLS y bloquea contenido mixto HTTP.
- Muestra HTTP 403/404 cuando ExoPlayer recibe esos estados. No cambia encabezados ni intenta sortear restricciones del proveedor.
- La preferencia de calidad de Ajustes limita únicamente HLS, sujeto a sus variantes. En YouTube/Kick se usan los ajustes propios del reproductor oficial.
- Pausa/libera el reproductor al salir del primer plano; vuelve al directo al regresar. No hay servicio de audio en segundo plano.
- Solo acepta fuentes HTTPS. Una fuente HTTP debe publicarse con HTTPS o verse mediante una alternativa pública compatible.

## Verificación pendiente en hardware

Antes de distribuir, probar en una tablet y en Android TV/Google TV reales:

1. Inicio, búsqueda y todas las pestañas usando únicamente D-pad; llegar al último canal con paginación y volver.
2. Foco visible, retorno al canal seleccionado, favoritos, fuente grande, orientación vertical/horizontal.
3. HLS autorizado con audio/video, Play/Pausa, Atrás, CH+/CH− y cambio de calidad.
4. Cortar la red: error, reintento y respaldo; probar 403, 404 y caída de API sin borrar tarjetas previas.
5. Home de Android y regreso: sin audio en segundo plano ni dos reproductores simultáneos.
6. YouTube/Kick/iframe sin salir de la app, con Android System WebView actualizado; reproducción manual/automática, error 101/150/153, canales offline, pantalla completa y Atrás.
7. Escudos, contraste de tarjetas, marcador y estados con partidos configurados por el administrador. La actualización del marcador durante video no debe recargarlo.
8. Girar varias veces durante HLS, iframe, YouTube y Kick, también con controles ocultos y en pantalla completa del proveedor: conservar partido y fuente. Probar la vuelta de segundo plano y la recuperación tras recreación de Activity.

Las pruebas unitarias cubren el contrato JSON, estados y marcadores, resolución de equipos, selección y orden de proveedores nativos/integrados, failover desactivado, enlaces oficiales, catálogo vacío y validación de HTTPS/escudos. La compilación y el lint no sustituyen las pruebas de reproducción y del mando en hardware.

Las pruebas de regresión de `EmbedDocumentTest` analizan el HTML generado: un iframe hijo con la URL original y permisos de video/pantalla completa, parámetros de Kick, escape de atributos y rechazo de contenido local/HTTP. No prueban el servidor concreto de un proveedor ni sustituyen una prueba con la URL que falló.

`EspnSyncTest` valida el reemplazo del estado manual, estados ESPN pre/in/post, entretiempo, finalización, marcador local/visitante, vínculo incorrecto/desactivado, caché ante fallo y deduplicación. `PlaybackSnapshotTest` cubre recuperación de partido/canal, fuente y pausa, así como estado inválido. Estas pruebas no ejecutan la rotación física ni reproducen video en Android.

## Referencias de integración

- [Identidad de cliente para YouTube en WebView](https://developers.google.com/youtube/terms/required-minimum-functionality#api-client-identity-and-credentials)
- [YouTube IFrame API y errores](https://developers.google.com/youtube/iframe_api_reference)
- [Reproductor oficial de Kick](https://help.kick.com/en/articles/8010826-how-to-embed-your-kick-livestream)

## Navegación iframe y carga progresiva (0.2.2, compilación 5)

- En las opciones del reproductor, activar **Cursor iframe**. Flechas mueven el cursor y OK pulsa en el punto indicado, por ejemplo Reproducir, Cerrar o Saltar cuando el proveedor ofrece esos botones. Abrir Menú y pulsar Cursor iframe otra vez lo desactiva. En tablet se mantiene el toque normal.
- WebView rechaza ventanas adicionales y navegación que intente reemplazar el documento principal; el iframe conserva su sandbox sin permisos para abrir ventanas o navegar la página superior. No se garantiza eliminar publicidad dentro del propio video o iframe ni se automatiza el salto de anuncios.
- Los partidos se publican al llegar la respuesta principal, sin esperar a los canales ni a los escudos. ESPN y los equipos se actualizan en segundo plano de forma independiente. El estado ESPN anterior permanece entre consultas; la primera consulta muestra CONSULTANDO ESPN. Una falla conserva los datos anteriores.
- Los partidos se consultan cada 30 segundos; los canales se reutilizan durante cinco minutos. Actualizar catálogo fuerza también los canales. Estas cargas no reinician el reproductor.
- Probar en tablet y TV: pulsación de botones del iframe con cursor y toque, bloqueo de ventanas nuevas, retorno de controles ocultos y permanencia del video al actualizar datos. Las pruebas unitarias no sustituyen esta verificación física.

## Catálogo multideporte (0.2.2, compilación 6)

Adaptado a `main` 7eabc27: los eventos con `sports` muestran el logo de competición y los dos participantes con sus fotos/escudos HTTPS. MMA utiliza retratos más altos, VS, round/reloj, resultado y ganador explícito; básquet muestra puntos sin el límite de goles, cuartos y prórroga. Los estados deportivos prevalecen sobre los campos de fútbol del registro. Otros eventos conservan su control manual. Una imagen ausente o que falla conserva las iniciales, sin bloquear tarjetas ni video.

La sección Eventos incluye filtros Todos, Fútbol, Básquet, MMA/UFC y Otros. El destacado, las tarjetas y la cabecera del reproductor muestran la competición. Las imágenes y el resultado deportivo se conservan en el estado de recuperación de la Activity. El catálogo de clubes solo se consulta para fútbol. El resumen ESPN de fútbol aporta logos de equipos y liga cuando están disponibles.

La actualización multideporte usa `/api/sports-api/event` cada ciclo de 30 segundos, con competición, ID de evento y, en UFC, ID de pelea y fecha. Rechaza respuestas de otro evento o pelea y no elige una pelea alternativa. Conserva la última respuesta válida ante fallo y señala «ESPN sin actualizar». Las imágenes guardadas por el administrador tienen prioridad si corresponden al mismo participante; se completan con ESPN cuando faltan. No se infieren ganadores ni KO. Las señales de video siguen siendo independientes del deporte.

Probar en hardware: portada y filtros con D-pad, nombres largos y retratos, imágenes ausentes, básquet >100 puntos, combate finalizado y actualización de datos mientras sigue el video. Los tests de contrato usan respuestas aisladas; no certifican cobertura ESPN ni reproducción real.

## Carga estable (0.2.2, compilación 7)

- El último catálogo válido y los datos de equipos se guardan en el dispositivo: se muestran al abrir la app antes de consultar la red, con aviso de datos guardados. La primera instalación necesita recibir al menos un catálogo válido.
- El listado se actualiza sin esperar a ESPN, canales o imágenes. Los resúmenes ESPN se solicitan en paralelo, como máximo tres a la vez, compartiendo vínculos repetidos y con un presupuesto total de siete segundos por ciclo. Una consulta lenta no bloquea los otros resultados. Las actualizaciones de listado siguen disponibles mientras se enriquecen los datos.
- Una respuesta vacía no confirmada, fallida o malformada conserva los eventos anteriores. Las bajas reales se aceptan con `catalogConfirmed:true` y `stale:false`; con el API antiguo se requieren dos listados no vacíos consistentes para bajas parciales. Un vacío antiguo nunca confirma borrar todo. Las versiones antiguas y los trabajos de enriquecimiento de otra generación no reemplazan la versión vigente.
- No se reconstruye la portada si los datos no cambian; se conserva el desplazamiento al actualizar. Los estados oficiales guardados no vuelven temporalmente a PROGRAMADO/CONSULTANDO al perderse la caché del proceso. Un fallo conserva las tarjetas y reintenta el listado a los cuatro segundos de terminar la petición fallida.
- El backend separa la lectura de eventos de chat/ajustes y distingue fallo de Firebase de una colección realmente vacía. La respuesta espera como máximo cinco segundos por lectura compartida; conserva datos anteriores y marca `stale`, o responde 503 cuando aún no hay catálogo confirmado. Esta parte requiere publicar el backend del PR; instalar solo el APK no actualiza el servidor de producción.

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

## Reproducción

- Media3 ExoPlayer para HLS HTTPS: Cloudflare Stream, MediaMTX expuesto mediante HTTPS y canales HLS del catálogo.
- Respeta el proveedor principal, `fallbackOrder`, respaldo activo y `autoFailoverEnabled`. Ante error de HLS prueba la siguiente fuente habilitada una vez. Para un error del reproductor web se ofrece Reintentar o Siguiente señal; no se infiere que una página cargada implique video reproduciéndose.
- YouTube, Kick y fuentes `iframe`/externas se reproducen **dentro de la app**, mediante Android WebView. No se lanza un navegador ni una app externa. HLS conserva Media3.
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

Las pruebas unitarias cubren el contrato JSON, estados y marcadores, resolución de equipos, selección y orden de proveedores nativos/integrados, failover desactivado, enlaces oficiales, catálogo vacío y validación de HTTPS/escudos. La compilación y el lint no sustituyen las pruebas de reproducción y del mando en hardware.

## Referencias de integración

- [Identidad de cliente para YouTube en WebView](https://developers.google.com/youtube/terms/required-minimum-functionality#api-client-identity-and-credentials)
- [YouTube IFrame API y errores](https://developers.google.com/youtube/iframe_api_reference)
- [Reproductor oficial de Kick](https://help.kick.com/en/articles/8010826-how-to-embed-your-kick-livestream)

# GolBoliviaLive · Android TV y tablet

Cliente nativo público, independiente del frontend web. Interfaz oscura con filas de tarjetas, foco verde visible, búsqueda, partidos, canales y favoritos locales. Compatible con Android 6+ en tablet, Android TV y Google TV. No es una app de tvOS ni incorpora administración, credenciales de emisión o escritura en el servidor.

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

Actualiza ambos catálogos cada 30 segundos mientras está visible el catálogo. Durante la reproducción no reconstruye la pantalla ni cambia la fuente por una actualización del catálogo. Si falla una consulta conserva el último resultado **en memoria** y permite reintentar. Al volver del segundo plano reanuda las consultas. No hay catálogo inventado ni modo de video sin conexión.

## Control remoto y táctil

| Acción | Control |
| --- | --- |
| Navegar | Flechas del D-pad |
| Abrir | OK / centro / toque |
| Favorito desde catálogo | Mantener OK o pulsación larga |
| Favorito desde reproductor | Botón Favorito |
| Mostrar controles | OK sobre el video |
| Reproducir / pausar | Tecla multimedia o controles del video |
| Cambiar canal | CH+ / CH− si está activado en Ajustes |
| Volver al catálogo | Atrás o botón Volver |
| Salir | Atrás en Inicio y confirmar |

Ajustes persistentes: reproducción automática, CH+/CH−, texto grande y calidad máxima (automática, 480p, 720p, 1080p). El volumen lo controla Android/TV. No requiere emparejar un mando dentro de la app: se usa el mando que ya funciona con Android TV o un teclado/mando Bluetooth emparejado en los ajustes de Android. No incluye control desde otro teléfono por Wi-Fi.

## Reproducción

- Media3 ExoPlayer para HLS HTTPS: Cloudflare Stream, MediaMTX expuesto mediante HTTPS y canales HLS del catálogo.
- Prueba la señal principal y luego el respaldo configurado cuando el failover está habilitado. Cada fuente se intenta una vez ante error; el botón Reintentar inicia un intento nuevo.
- YouTube, Kick y fuentes `iframe`/externas ofrecen abrir la ruta pública del partido/canal en el navegador del dispositivo. Requiere un navegador instalado; la app muestra la dirección si no hay ninguno. Estos proveedores no se reproducen dentro del reproductor nativo.
- Muestra HTTP 403/404 cuando ExoPlayer recibe esos estados. No cambia encabezados ni intenta sortear restricciones del proveedor.
- La preferencia de calidad es un límite, sujeto a las variantes que publique la señal.
- Pausa/libera el reproductor al salir del primer plano; vuelve al directo al regresar. No hay servicio de audio en segundo plano.
- Solo acepta fuentes HTTPS. Una fuente HTTP debe publicarse con HTTPS o verse mediante una alternativa pública compatible.

## Verificación pendiente en hardware

Antes de distribuir, probar en una tablet y en Android TV/Google TV reales:

1. Inicio, búsqueda y todas las pestañas usando únicamente D-pad; llegar al último canal con paginación y volver.
2. Foco visible, retorno al canal seleccionado, favoritos, fuente grande, orientación vertical/horizontal.
3. HLS autorizado con audio/video, Play/Pausa, Atrás, CH+/CH− y cambio de calidad.
4. Cortar la red: error, reintento y respaldo; probar 403, 404 y caída de API sin borrar tarjetas previas.
5. Home de Android y regreso: sin audio en segundo plano ni dos reproductores simultáneos.
6. YouTube/Kick/iframe con y sin navegador instalado.

Las pruebas unitarias cubren el contrato JSON, selección de fuentes públicas, exclusión de iframe del reproductor HLS, failover desactivado, catálogo vacío y validación de HTTPS. La compilación y el lint no sustituyen las pruebas de reproducción y del mando en hardware.

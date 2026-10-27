# Fuentes por evento y señal OBS / MediaMTX

## Guardar y elegir fuentes

En **Administrador → En vivo → Señal** seleccionar el evento y usar **Fuentes del evento**. También está disponible al editar los datos del evento en **Eventos → Marcador**.

- Añadir varios canales del catálogo, incluidos varios HLS o varios iframe. Se guarda una copia de la referencia y URL en ese evento, sin modificar ni eliminar el canal del catálogo.
- También se pueden añadir enlaces HLS, iframe (URL o código), YouTube o Kick. Elegir el tipo correcto y un nombre que entenderá el espectador: por ejemplo «Mi transmisión», «Canal A» o «Canal B».
- Editar, ordenar con «Subir», quitar opciones y elegir la **fuente inicial**.
- Pulsar **Guardar fuentes del evento**, o **GUARDAR DATOS** si se edita desde el formulario completo. Se espera la confirmación del servidor/Firebase. Un error mantiene los cambios pendientes.

El espectador elige por nombre en **Fuentes**, encima del reproductor. Su selección se conserva en su sesión por evento y no modifica el evento ni lo que ven otras personas. No hay un orden de respaldo ni cambios automáticos a otro canal. Si una fuente falla, el espectador puede elegir otra. Una fuente eliminada deja de seleccionarse y se utiliza la inicial disponible.

Los eventos anteriores se convierten en opciones visibles desde sus campos existentes. Al guardar se mantiene una representación compatible de la fuente inicial para clientes que usan el formato anterior. Esta implementación y publicación afectan únicamente a `main`; no se modifica la rama de Android TV.

## Configurar MediaMTX y Cloudflare

El túnel de consola es transporte HTTPS hacia tu MediaMTX; no es un Live Input de Cloudflare Stream. En el administrador añadirlo como **HLS** y marcar **Mi transmisión OBS / MediaMTX**.

Se incluye `ops/mediamtx.example.yml` como ejemplo para MediaMTX v1 actual. Hay que aplicarlo en el ordenador donde se ejecuta MediaMTX; guardar un enlace en la web no cambia esa consola. Versiones antiguas pueden usar nombres distintos para la opción CORS: comparar con el archivo de configuración de la versión instalada.

Con el path del ejemplo:

1. OBS: servidor `rtmp://localhost:1935/live`, clave `partido`. MediaMTX debe indicar que recibe publicación en `live/partido`.
2. Probar primero `http://localhost:8888/live/partido/index.m3u8` en el mismo ordenador. Debe responder con texto que empiece con `#EXTM3U`. El path debe coincidir exactamente con el publicado por OBS. Si se publica `partido` en lugar de `live/partido`, el enlace será `/partido/index.m3u8`.
3. Apuntar el túnel al puerto HLS: `cloudflared tunnel --url http://localhost:8888`. No apuntarlo al puerto RTMP 1935 ni al WebRTC 8889.
4. Añadir a la URL HTTPS del túnel el mismo path HLS: `https://TU-TUNEL.trycloudflare.com/live/partido/index.m3u8`. Si se reinicia un túnel temporal y cambia el dominio, actualizar y guardar la fuente. Un túnel con hostname estable evita ese cambio.
5. Comprobar desde el editor con **Comprobar HLS** y después reproducir. La comprobación usa GET del manifiesto, no HEAD. Un manifiesto válido confirma su disponibilidad, no todos los segmentos ni los codecs.

`hlsAlwaysRemux: yes` evita arrancar el muxer para cada primer lector mientras exista publicación. La duración real de los segmentos depende de los keyframes de OBS; un intervalo de keyframes de 1–2 segundos limita la espera inicial. H.264 + AAC suele ofrecer buena compatibilidad. El ejemplo prioriza HLS fMP4 estable; no promete latencia cero.

## Qué significa un 404

La aplicación espera hasta 30 segundos y limita los intentos cuando la fuente está marcada como transmisión propia o utiliza un túnel temporal Cloudflare. Esto permite generar el primer manifiesto. En fuentes IPTV ordinarias, rechazos 401/403 o segmentos inexistentes después de reproducir, no se aplica ese ciclo de arranque.

Si persiste el 404, comprobar publicación OBS, path, puerto y reglas del túnel. Si falla también la URL local, el problema está antes de Cloudflare. Si la local responde y la pública no, revisar el destino y las reglas de ingreso del túnel. Aumentar el tiempo del reproductor no corrige una ruta que no existe.

La red de este entorno de desarrollo bloquea la conexión al túnel facilitado; las pruebas locales no certifican su estado real ni aplican cambios en tu ordenador.

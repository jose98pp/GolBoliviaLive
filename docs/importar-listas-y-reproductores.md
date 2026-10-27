# Canales externos y listas de otros proveedores

En **Canales IPTV**, crea o edita un canal y elige **iframe / Reproductor externo**
para una página HTTPS como `https://tvf90.com/online.php?stream=espnmx`.
También puedes pegar código `<iframe>`: se extrae únicamente su URL, no se ejecuta
el HTML que pegaste. Los dominios nuevos ya no requieren modificar una lista
cerrada. Los proveedores conocidos conservan su normalización específica, por
ejemplo YouTube convierte el enlace de vídeo a su URL de inserción.

El iframe conserva su aislamiento y no permite ventanas emergentes ni navegar
la página principal. Se rechazan esquemas ejecutables, HTTP en iframes y URLs con
credenciales incrustadas. Guardar una página no confirma que permita reproducir
fuera del sitio original; CSP, X-Frame-Options o un desafío del proveedor pueden
impedirlo. Esas restricciones no se eliminan mediante este cambio.

En **Importar lista M3U / M3U8**, pega la URL HTTP/HTTPS de cualquier proveedor
público compatible, no solo IPTV-org o GitHub. Se admiten parámetros de consulta
y endpoints sin extensión. La respuesta debe contener una lista real `#EXTM3U`;
un enlace a una página PHP de reproductor debe guardarse como iframe.
Los canales relativos se resuelven contra la URL final de la lista.

Si la dirección apunta directamente a un manifiesto HLS, se previsualiza como
un único canal, sin importar sus segmentos como canales independientes.
La carga de un archivo local de catálogo sigue admitida. Un archivo local de
segmentos HLS no tiene una URL pública de reproducción y no es un catálogo.
Selecciona y guarda los canales deseados después de previsualizar.

La descarga requiere sesión administrativa, dura como máximo 12 segundos de
petición, limita la respuesta a 1 MB y el catálogo a 500 canales. Cada destino y
redirección se comprueba con la política de destinos públicos del servidor;
no permite redes privadas ni metadatos del hosting. Las respuestas del importador
no se guardan en cachés compartidas. Si el despliegue tiene `PROXY_ALLOWED_HOSTS`
configurado explícitamente, sigue respetándose; el mensaje de error identifica
esa restricción. No se ha modificado el proxy de vídeo.

Las pruebas usan respuestas controladas; no certifican reproducción de TVF90
ni disponibilidad de los proveedores. En cPanel el cambio requiere recompilar
el cliente e implementar el importador y la validación equivalentes en la API
PHP: publicar en Git no actualiza automáticamente ese hosting.

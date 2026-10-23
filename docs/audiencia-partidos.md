# Audiencia por partido

En el administrador, el panel «Audiencia por partido» muestra las estadísticas del partido seleccionado. Se actualiza cada 20 segundos. Los datos se guardan en Firestore y sobreviven a reinicios o nuevos despliegues del servidor.

- **Viendo ahora:** navegadores con la página pública del partido visible. Envía presencia cada 25 segundos y caduca después de 70 segundos sin respuesta; ocultar o cerrar la página envía una salida. Varias pestañas del mismo navegador suman un solo visitante activo.
- **Visitantes únicos:** navegadores que visitaron ese partido desde la activación. Se conserva un identificador aleatorio en localStorage. Otro navegador, modo privado o borrar el almacenamiento puede sumar un nuevo visitante. No representa personas identificadas.
- **Pico de audiencia:** máximo de navegadores activos observado para ese partido, conservado en Firestore.
- **Reproducciones HLS:** sesiones de página que llegaron al evento real `playing` del reproductor de vídeo. Las pausas, recuperaciones de red y recargas internas del reproductor no duplican el inicio. Recargar toda la página o volver a entrar al partido abre una nueva sesión. Una visita con vídeo bloqueado o fallido no cuenta como reproducción.

Los iframe, YouTube y Kick no comunican aquí un evento fiable de reproducción: su página visible cuenta en audiencia y visitantes, pero no en reproducciones HLS. Consultar el administrador o un canal IPTV independiente no incrementa las métricas de un partido. No se recuperan estadísticas anteriores a la activación.

## Activar en Firebase y Vercel

1. Publicar el archivo completo `firestore.rules`. Incluye la colección privada `matchAnalytics` y sus subcolecciones `visitors` y `plays`; únicamente el usuario de Firebase del backend puede acceder. Desde una terminal con Firebase CLI:

   ```sh
   firebase login
   firebase deploy --only firestore:rules --project <ID_DEL_PROYECTO>
   ```

   Utilizar el `projectId` de `firebase-applet-config.json`. `firebase.json` ya configura el nombre de la base de datos. También se puede publicar el archivo completo en la pestaña Reglas de esa base de datos desde la consola de Firebase.

2. Mantener configuradas en el servidor/Vercel `FIREBASE_SERVER_EMAIL` y `FIREBASE_SERVER_PASSWORD`. El UID de ese usuario de Firebase Authentication debe tener un documento `/admins/{uid}` en esa misma base de datos. No poner estas credenciales en variables VITE ni en código público.
3. Desplegar el código y abrir un partido desde la web pública. En el administrador, seleccionar ese partido: aumentan visitantes y audiencia; cuando el vídeo HLS empieza realmente, aumenta reproducciones. Comprobar con otro navegador que aumenta a dos y con otra pestaña del mismo navegador que no duplica visitantes.

Si Firebase rechaza el acceso, el panel muestra un error y guiones en lugar de cifras inventadas. Publicar en Vercel no publica las reglas de Firestore.

## Verificación

`bun run test` incluye pruebas aisladas de presencia, pestañas, expiración, pico, deduplicación HLS, concurrencia, aislamiento entre partidos y persistencia tras reiniciar el módulo. No escribe datos de producción.

`bun run test:rules` prueba los permisos con Firebase Emulator Suite. Requiere Java y descargar el emulador; si la red impide esa descarga, las pruebas de reglas no se han ejecutado y deben repetirse en un equipo con acceso.

Los identificadores de navegador se guardan en el servidor como hashes separados por partido; esta función no almacena direcciones IP. Es medición aproximada con eventos de clientes anónimos, no auditoría antifraude ni certificación de espectadores humanos. Firestore cobra lecturas, agregaciones y escrituras: revisar su uso si aumenta la audiencia. La política de retención de estos datos deberá ajustarse según las necesidades del proyecto.

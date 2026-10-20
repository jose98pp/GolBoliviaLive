# IPTV — catálogo independiente (PR de trabajo)

## Alcance implementado
- Vista previa de playlists M3U públicas de iptv-org mediante URL HTTPS aprobada, sin persistir ni alterar eventos deportivos.
- Deduplicación por URL al añadir canales a la sesión actual.
- Historial de hasta 12 canales vistos en el navegador y filtro «Recientes».
- Se mantienen la búsqueda, filtros de país y favoritos existentes.

## Seguridad y limitaciones
- No aceptar importación remota arbitraria: el endpoint solo admite rutas de categorías y países de iptv-org.
- Los canales importados son temporales y no se comparten entre usuarios. La persistencia multiusuario requerirá autenticación y base de datos.
- Una URL listada no implica disponibilidad, derechos de retransmisión ni autorización para saltar DRM, CORS o restricciones geográficas.

## Pendientes de las cinco fases
1. Gestión administrativa persistente de fuentes y sus estados, con Firestore y permisos por rol.
2. Validación de manifiestos/segmentos y estados de error verificables, con límites de tasa.
3. Revisión del reproductor y proxy, medición de latencia y fallos.
4. EPG XMLTV, categorías adicionales y enlaces compartibles por ID estable.
5. Pruebas de build/lint/test, dispositivos y cambios de fuente sin alterar LiveEvent.

No fusionar este PR hasta pasar CI y revisión funcional.

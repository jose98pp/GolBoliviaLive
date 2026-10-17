# Plan de verificación IPTV — cinco fases

## Fase 1: Seguridad
- [ ] Comprobar que /api/proxy rechaza localhost, IP privadas, IPv6, URLs con credenciales y redirecciones.
- [ ] **Pendiente de producción:** resolver DNS y rechazar IP privadas resultantes; añadir autenticación a POST/DELETE /api/iptv/custom y POST /api/iptv/probe, límites de tasa y tamaño de respuesta. La validación de nombres por sí sola no elimina el riesgo SSRF por DNS rebinding.
- [ ] Confirmar que un stream externo autorizado no queda bloqueado.

## Fase 2: Catálogo
- [ ] Separar los canales de prueba de canales reales y verificar la atribución de todos los registros curados. Ninguna fuente de prueba debe presentarse como ESPN, TyC o DeporTV.
- [ ] No declarar un canal 'oficial' o 'verificado' por haberlo añadido manualmente.
- [ ] Revisar disponibilidad y derechos de distribución de los canales ESPN Argentina con el proveedor autorizado.

## Fase 3: Reproductor
- [ ] Probar HLS válido, HTTP 401, 403, 404, timeout, manifiesto HTML, manifiesto inválido, códec incompatible, CORS y cambios rápidos de canal.
- [ ] Medir primer fotograma y porcentaje de reproducción exitosa; el proxy no debe reintentar errores de autorización.
- [ ] No reproducir un feed de demostración como respaldo de un canal real sin indicarlo.

## Fase 4: Catálogo y caché
- [ ] Medir primer acceso con backend frío y caliente; verificar actualización en segundo plano y listas externas lentas.
- [ ] Confirmar que caché local no conserva enlaces firmados caducados; definir TTL por fuente y guardar catálogo persistente.

## Fase 5: Pruebas reales
- [ ] Ejecutar npm run lint y npm test en CI; probar escritorio y Android, Wi-Fi y datos móviles.
- [ ] Registrar tiempo de manifiesto, primer segmento, primer fotograma, errores HTTP/HLS y rebuffering por canal (sin almacenar tokens de URL).
- [ ] Confirmar el funcionamiento con señales propias o autorizadas, no con contenidos protegidos de terceros.

**Nota:** Los cambios de esta rama son una primera implementación. No se han ejecutado las pruebas ni se ha verificado el despliegue en Vercel. No fusionar hasta completar las tareas de seguridad y validación.

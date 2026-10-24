# Eventos de fútbol, básquet, MMA/UFC y otros

## Crear y publicar

1. En el administrador abrir **Eventos → Marcador** y crear o seleccionar un evento.
2. En **Tipo de evento y participantes** elegir Fútbol, Básquet, MMA/UFC u Otro evento.
3. Para básquet o MMA, completar los dos nombres, sus enlaces HTTPS de fotos/escudos y el nombre y logo HTTPS de la competición. En MMA se indican round, reloj y resultado/decisión; en básquet, puntos, cuarto/fase y reloj. El ganador se muestra al finalizar. Para otros eventos se utiliza el mismo formulario con datos manuales.
4. Editar el título del evento (o usar «Generar con participantes») y el estado. Los estados disponibles son previa, en vivo, descanso, finalizado, aplazado y cancelado.
5. Configurar la señal IPTV/HLS/iframe, YouTube, Kick o Cloudflare en los controles existentes.
6. Pulsar **GUARDAR DATOS** del formulario principal. La vista previa no publica por sí sola. Las imágenes son enlaces HTTPS, no archivos subidos.

Los participantes de eventos no futbolísticos se guardan dentro del propio evento, sin crear clubes de fútbol ficticios. Los puntos de básquet se almacenan separados de los goles para conservar resultados como 142–135. Las peleas no muestran un marcador ficticio 0–0. No se muestran estadísticas ni una simulación de campo de fútbol para estos eventos.

## Importar desde ESPN

En el formulario deportivo se puede elegir NBA, WNBA, NCAA masculino/femenino o UFC. Seleccionar opcionalmente una fecha, consultar eventos, elegir el encuentro o pelea exacta y pulsar **Importar al formulario**. Después guardar el formulario principal. Se importan los nombres, imágenes y logo cuando ESPN los proporciona; se pueden completar manualmente cuando falten.

En UFC una cartelera contiene varias peleas. Se conservan tanto el ID de la cartelera como el ID de la pelea, evitando sustituirla por otro combate. La actualización comprueba ambos identificadores. Las consultas de una pelea guardada incluyen el día anterior y posterior a su fecha para cubrir diferencias entre UTC y el horario local del evento.

Con **Actualización automática ESPN** activada, las páginas visibles consultan cada 30 segundos y al volver a la pestaña. El servidor comparte solicitudes y mantiene una caché breve. El reloj refleja el último dato oficial disponible: no cuenta segundos artificialmente durante pausas, faltas o descansos. El tablero indica cuándo se recibió la actualización. El administrador no necesita permanecer abierto. La portada permite filtrar los eventos por deporte y por estado, incluidos los finalizados.

La disponibilidad, las fotos, el detalle del resultado y el reloj varían según la competición y cobertura de ESPN. No se infiere un ganador ni un KO por el tiempo transcurrido. Si no llega información válida o ESPN falla, se mantiene la última actualización válida en esa página; el resultado no se reinicia a cero. No se elige otra pelea como sustituta. Ante falta de cobertura, desactivar la actualización automática, editar y guardar.

En **Otro evento** el control es manual: no se promete integración ESPN para deportes no implementados. Para volver a fútbol, elegir Fútbol y guardar; se conserva el sistema de equipos, goles y minutos existente. Las señales de vídeo se guardan de forma independiente al tipo de evento.

## Validación

`bun run test` incluye los casos existentes de fútbol, HLS, IPTV/iframe y persistencia, además de pruebas de marcador de básquet superior a 50 puntos, cuartos/prórroga, rounds, pelea exacta, ganador, estados, imágenes seguras, rutas ESPN, errores sin falsos guardados y restauración de eventos. Las pruebas aisladas no escriben en producción.

Las comprobaciones locales con respuestas simuladas verifican el comportamiento, pero no certifican la disponibilidad actual del servicio ESPN. No se necesitan nuevas reglas ni colecciones de Firebase para estos campos: se guardan en `liveEvents` con la autenticación existente del backend.

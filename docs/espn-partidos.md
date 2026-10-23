# Ligas y actualización automática con ESPN

## Organizar y completar equipos

En Administrador → Equipos se puede filtrar por liga. El mismo catálogo agrupado y ordenado alfabéticamente se usa al seleccionar local y visitante. La altitud del estadio nunca determina el país o la liga.

Se incluye un catálogo base de Argentina, Brasil y clubes de ligas europeas y sudamericanas. Los catálogos de temporada cambian por ascensos, descensos y clasificación a copas: usar **Actualizar equipos oficiales → liga/copa → Consultar y guardar desde ESPN** para incorporar los participantes que devuelva ESPN. Se conservan otros equipos guardados, sus IDs y datos personalizados. No se eliminan equipos de temporadas anteriores. La importación requiere la sesión de administrador y acceso del backend a Firebase y ESPN.

Los participantes internacionales cuyo país o liga nacional no se conoce se guardan en «Internacionales · [competición]». No se les asigna Bolivia ni se inventa estadio o altitud. Se puede editar su liga nacional en Equipos cuando se conozca. Importar un partido también guarda los dos equipos que falten.

## Automatizar un partido

1. Abrir Administrador → Partido y seleccionar el partido local que se quiere vincular.
2. En la sección ESPN, seleccionar la liga o copa, consultar los partidos y elegir exactamente el encuentro deseado.
3. Pulsar **Importar al Formulario**. Se importan equipos, torneo, resultado y estado, y queda activada **Actualizar automáticamente con ESPN**.
4. **Guardar el formulario**. El identificador ESPN y la liga se guardan junto con el partido en Firebase y sobreviven a recargas. La señal IPTV/iframe permanece independiente.
5. En la página pública se consultan los datos oficiales cada 30 segundos mientras está visible, y al volver de otra pestaña. Se muestran marcador, minuto, tiempo añadido, previa, entretiempo y finalizado. El texto «Última actualización» permite comprobar cuándo llegaron datos.

Desactivar la casilla de actualización y guardar permite volver al control manual. No se vinculan automáticamente partidos antiguos por una coincidencia ambigua del nombre; hay que importar el encuentro correcto una vez. El estado de finalizado depende de ESPN, no de llegar al minuto 90.

## Funcionamiento y límites

El estado en pantalla se consulta por el ID exacto de ESPN. No se usa el primer partido disponible como sustituto ni se suman minutos artificialmente. La consulta funciona en Vercel porque no depende de un proceso permanente ni de mantener abierto el administrador. Las actualizaciones en vivo se leen de ESPN; no generan una escritura a Firestore cada 30 segundos. Si no hay ninguna página abierta no se ejecutan consultas periódicas: al abrirla se vuelve a consultar ESPN.

Los datos dependen de la cobertura y demora de ESPN. Ante un error se conserva en la pestaña la última actualización válida; no se reinicia el marcador a cero. La consulta tiene tiempo máximo, caché breve y comparte solicitudes simultáneas por servidor. En competiciones sin cobertura hay que usar el control manual. Las pruebas usan respuestas controladas y no demuestran disponibilidad actual del servicio externo.

## Verificación

`bun run test` incluye casos de estados, segundos → minutos, añadido, prórroga, marcador, selección por ID, fallo del origen, caché, clasificación por ligas y guardado/restauración del vínculo ESPN. No escribe en Firebase de producción.

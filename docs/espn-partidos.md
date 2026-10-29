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

## Copas nacionales

En el formulario, el selector **Liga / Copa / Torneo oficial** separa las copas
nacionales de las ligas y torneos internacionales. Incluye Copa Argentina,
Copa de la Liga Profesional argentina, Copa do Brasil, Copa del Rey, FA Cup,
EFL Cup, Coppa Italia, DFB-Pokal, Copa de Francia, Taça de Portugal, KNVB Beker,
Copa Colombia y Copa Chile. Consulta los partidos de hoy, selecciona el encuentro,
impórtalo y guarda el formulario. El vínculo ESPN conserva el código de la copa
para actualizar el marcador y los estados por ID exacto.

No todas las copas tienen partidos hoy ni cobertura en todas las temporadas.
La disponibilidad depende de ESPN; añadir un código no certifica datos en vivo.
No se añadieron códigos especulativos para copas de los demás países del catálogo.
El código de Copa Argentina es `arg.copa_arg`, no `arg.copa`.
Los clubes existentes mantienen su liga; los nuevos importados desde una copa
se agrupan en «Otros equipos» del país hasta asignarles su liga real.

Este cambio corresponde al proyecto React/Express. Un despliegue cPanel requiere
recompilar el frontend y disponer de las rutas ESPN equivalentes en su API PHP;
subir solo los archivos TypeScript no actualiza una web ya compilada.

## Fecha y hora de inicio

El formulario del partido y el administrador de eventos permiten definir
**Fecha y hora de inicio (Bolivia, UTC−4)**. Se guarda un instante UTC, independiente
de la zona horaria del navegador. La importación ESPN trae la fecha del encuentro;
en MMA se usa la fecha de la pelea concreta cuando está disponible.
Las actualizaciones oficiales pueden corregir el horario si cambia en ESPN.

Las tarjetas públicas se ordenan por inicio, del más antiguo al más reciente,
con los eventos sin fecha al final. En previa se muestra fecha, hora y «hora
Bolivia». Al empezar, durante el descanso y al finalizar se oculta ese horario
sin borrar la fecha guardada. Sin fecha se muestra «Horario por confirmar».
El filtro «Próximos» incluye los eventos en previa; no implica que sean hoy.
Los eventos anteriores sin fecha requieren asignarla manualmente o consultar
su vínculo ESPN. No se usa la hora de creación como hora de comienzo.

## México, Estados Unidos, femenino y juveniles

El formulario incluye Liga MX, Liga de Expansión MX, MLS y USL Championship;
Copa MX y U.S. Open Cup; CONCACAF Champions Cup, Leagues Cup, Copa Oro,
Copa América y Mundial masculino. Los nuevos grupos **Fútbol femenino** y
**Juveniles / Sub-17 / Sub-20** incluyen Liga MX Femenil, NWSL, WSL, Liga F,
Mundial femenino, Copa América y Libertadores femeninas, mundiales Sub-17 y
Sub-20 masculinos/femeninos y sudamericanos Sub-17 y Sub-20 masculinos.

La disponibilidad depende de la temporada y cobertura de ESPN. Copa MX puede
no tener calendario actual; el catálogo no implica que todas las categorías
jueguen hoy o cuenten con cobertura. No se inventan partidos ante una respuesta
vacía. El acceso externo de este entorno bloquea ESPN, por lo que los códigos
se integran con pruebas controladas y deben comprobarse en el despliegue.

Los equipos importados distinguen femenino, masculino, Sub-17 y Sub-20 incluso
si coinciden en nombre. Se conservan IDs anteriores de clubes masculinos y se
usan IDs separados para nuevas categorías para no sobrescribirlos.

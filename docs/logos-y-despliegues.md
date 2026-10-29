# Logos de canales y actualización de despliegues

En Canales IPTV, crea o edita el canal y pega una URL HTTPS directa de imagen
(o una ruta local como `/logos/canal.png`). La vista previa permite comprobarla
antes de guardar. No uses el enlace a una página que contiene la imagen: usa
la dirección de la imagen. Se guarda la URL, no se sube el archivo al servidor.

Los logos comparten componente entre el administrador y el catálogo público:
mayor espacio, proporciones originales y fondo claro con contorno para imágenes
oscuras o blancas. Si la imagen falla se muestran iniciales, sin ocultar el
espacio ni sustituirlo por un logo incorrecto. Si cambias la URL se intenta
cargar la nueva imagen. Las rutas relativas de logos en listas remotas se
resuelven respecto a la URL final de la lista.

Un alojamiento puede rechazar la imagen, eliminarla o exigir cookies. No se
eluden esos permisos: corrige el enlace o aloja una copia que tengas permiso
de usar. Las URLs HTTP se deben sustituir por una URL HTTPS válida.

## Main no actualiza todos los alojamientos por sí solo

El repositorio tiene `vercel.json`, un build Vite/Express y rutas de Vercel.
No contiene un workflow de GitHub Actions ni una configuración de despliegue
cPanel automática. Esto no descarta que exista una integración externa que no
podemos ver desde el repositorio.

- Vercel: si el proyecto está conectado a este repositorio, tiene `main` como
  Production Branch y no hay filtros/bloqueos, un push inicia un despliegue.
  Comprueba en Deployments que el commit corresponda y termine en Ready.
- Nova en cPanel: la instalación manual desde ZIP no cambia al hacer push.
  Hay que recompilar/subir archivos y actualizar la API PHP compatible, o
  configurar un proceso de despliegue propio. Un Git Pull de TypeScript no
  sustituye el build ni convierte el servidor Express en PHP.
- Si Nova apunta mediante DNS al proyecto de Vercel, podría mostrar ese mismo
  despliegue; hay que comprobarlo en la configuración real del dominio.

No se ha cambiado DNS, Vercel, cPanel ni la rama Android TV con esta mejora.

# GolBolivia Live

Transmisión en vivo del fútbol boliviano (React + Vite + Express + Firestore).

## Ejecutar en local

Requisito: [Bun](https://bun.sh).

1. Instalar dependencias: `bun install`
2. Copiar `.env.example` a `.env` y completar las variables (ver abajo).
3. Levantar la app: `bun run dev` → http://localhost:3000

> Ojo: en local la app usa el mismo proyecto de Firebase que producción.

## Variables de entorno (también en Vercel → Settings → Environment Variables)

| Variable | Uso |
| --- | --- |
| `SERVER_SECRET` | Firma de los tokens de sesión del panel. Mínimo 32 caracteres aleatorios. Sin él, el login queda deshabilitado en producción. |
| `ADMIN_PIN`, `TRANSMISOR_PIN`, `MODERADOR_PIN`, `EDITOR_PIN` | PIN de cada operador (mínimo 6 caracteres). Un usuario sin PIN no puede entrar. |
| `FIREBASE_SERVER_EMAIL`, `FIREBASE_SERVER_PASSWORD` | Usuario de Firebase Auth con el que el backend escribe en Firestore. |

## Seguridad de Firestore

Las reglas (`firestore.rules`) permiten lectura pública, pero **solo el backend puede escribir** (salvo crear mensajes de chat validados). Para habilitar al backend:

1. Firebase Console → Authentication → activar **Email/Contraseña** y crear un usuario (ej. `backend@tu-dominio`).
2. Copiar su **UID** y crear en Firestore el documento `admins/{UID}` (puede quedar vacío).
3. Poner su email y contraseña en `FIREBASE_SERVER_EMAIL` / `FIREBASE_SERVER_PASSWORD`.
4. Publicar las reglas: `firebase deploy --only firestore:rules` (o pegarlas en la consola).

El estado local del servidor (`data/stream-state.json`) contiene la stream key y no se versiona.

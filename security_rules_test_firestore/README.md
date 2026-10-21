# Pruebas de reglas de Firestore

Requieren Bun, Node.js y Java 21 o superior. Desde este directorio:

```sh
bun install --frozen-lockfile
bun run test
```

Firebase CLI inicia y detiene el emulador local en 127.0.0.1:8088. El compilador del emulador valida el archivo real `../firestore.rules`; las pruebas comprueban permisos de lectura, alta, edición y borrado, incluidos canales HLS/iframe, aislamiento de administradores, auditoría y validación del chat.

Se usa exclusivamente `demo-golbolivia-rules`, sin credenciales ni escrituras de producción. El test falla si no encuentra un emulador local. No sustituye las reglas del proyecto real al ejecutarse. La primera ejecución necesita descargar el emulador.

## Despliegue, después de superar las pruebas

Desde la raíz del repositorio, con una sesión de Firebase CLI autorizada:

```sh
security_rules_test_firestore/node_modules/.bin/firebase login
security_rules_test_firestore/node_modules/.bin/firebase deploy --only firestore:rules --project gen-lang-client-0595946513
```

Comprueba en Firebase Console que se publicaron en la base de datos indicada por `firebase.json`, no en otra base. El usuario Firebase del backend debe tener un documento `admins/{UID}` y las variables de autenticación del backend deben estar configuradas en Vercel.

Este proyecto no configura Cloud Storage. No se generan ni despliegan reglas de Storage que puedan modificar permisos ajenos al guardado de canales.

## Gemini CLI y estado de validación

El repositorio `gemini-cli-extensions/firebase` está retirado. Su README indica el reemplazo oficial:

```sh
gemini extensions install https://github.com/firebase/agent-skills
```

Las pruebas de este directorio están escritas para las reglas existentes del proyecto; no fueron generadas por Gemini. Se instaló el reemplazo oficial en una configuración temporal aislada. La extensión informó incompatibilidades al cargar `firestore-rules-author` y `gemini mcp list` mostró el servidor Firebase como `Disconnected`. No hay un MCP de Firebase conectado en esta sesión. No se ha ejecutado `firebase_validate_security_rules`.

La ejecución local se intentó, pero la red del entorno devolvió HTTP 403 al descargar `https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.22.0.jar`. Por ello la compilación de reglas y las pruebas del emulador siguen pendientes. No se han desplegado reglas de producción como parte de esta validación. Repite `bun run test` en un entorno que permita esa descarga antes de desplegar.

# Pendientes de Folio

Última revisión: 6 de octubre de 2026.

## 1. Probar en el iPhone (prioridad)
- [ ] Cambiar `EXPO_PUBLIC_API_URL` en `.env.local` a la IP local de la Mac (`http://<IP-de-tu-Mac>:8000`; se obtiene con `ipconfig getifaddr en0`); `127.0.0.1` no llega desde el iPhone.
- [ ] Recompilar la app (hay módulos nativos nuevos: `expo-sqlite`, `expo-secure-store`, `expo-haptics`, `expo-file-system`, `expo-sharing`, `expo-image-manipulator`):
  ```bash
  npx expo prebuild --clean
  npx expo run:ios --device
  ```
- [ ] Recorrer todo el flujo: onboarding → crear cuenta → escanear → revisar → analizar con IA → detalle → compartir PDF → perfil → cerrar sesión.

## 2. Credenciales e infraestructura
- [ ] **Cloudflare R2** (AWS no completó el alta): crear el bucket y un token de API "Object Read & Write" y rellenar en `api/.env`: `S3_ENDPOINT_URL`, `S3_BUCKET`, `AWS_REGION=auto`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (pasos en `api/README.md`). Mientras tanto se usa almacenamiento local (`api/storage/`).
- [ ] **Railway**: desplegar `api/` con `DATABASE_URL` (plugin Postgres), `JWT_SECRET` (texto largo aleatorio, **obligatorio**: sin él cada despliegue invalida las sesiones), `OPENAI_APIKEY` y las variables de R2.

## 3. Funciones
- [ ] Iniciar sesión con **Apple** (`expo-apple-authentication`) y **Google**. Hoy muestran "Próximamente".
- [ ] Recuperar contraseña (necesita un servicio de correo: Resend, SES…).
- [ ] La **transcripción** como protagonista:
  - [ ] Texto primero en la pantalla del documento.
  - [ ] Botón "Copiar" (`expo-clipboard`).
  - [ ] Compartir como texto o `.txt`.
  - [ ] Prompt de la IA que respete párrafos, listas y tablas.
  - [ ] Editar el texto a mano.

## 4. Limpieza
- [ ] Añadir un token de color `line` (`#E2E0D9`) en `src/global.css` y quitar los colores sueltos (también el verde del estado del servidor en el perfil).
- [ ] Unificar la alerta "Próximamente" (repetida en `SocialAuthButtons` y `onboarding.tsx`).
- [ ] Revisar `src/components/document/mono.ts`: debe usar Geist Mono (`font-mono`) en lugar de Menlo.
- [ ] Android: el botón atrás puede cerrar el onboarding sin marcarlo como visto.
- [ ] Borrar los worktrees de `.claude/worktrees/` y las ramas ya mergeadas (locales y en GitHub).
- [ ] Borrar el entorno duplicado `api/.venv` (el bueno es `api/venv`).

## 5. A futuro
- [ ] Al iniciar sesión, la cuenta se queda con **todos** los documentos de invitado del servidor. Con varios usuarios habrá que limitarlo a los del propio dispositivo.
- [ ] Limitar intentos de login (rate limiting) antes de publicar.

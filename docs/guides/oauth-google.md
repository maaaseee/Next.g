# Guía de Configuración de Google OAuth 2.0 para NEXT.g

Esta guía detalla paso a paso cómo registrar tu aplicación en **Google Cloud Console**, obtener tus credenciales (`Client ID` y `Client Secret`) y configurarlas en el entorno de desarrollo y producción para permitir que los usuarios inicien sesión o se registren con su cuenta de Google.

---

## 1. Requisitos Previos
- Una cuenta de Google activa (Gmail o Google Workspace).
- Acceso a la consola de desarrolladores: [Google Cloud Console](https://console.cloud.google.com/).

---

## 2. Paso a Paso en Google Cloud Console

### Paso 2.1: Crear o Seleccionar un Proyecto
1. Ingresa a [Google Cloud Console](https://console.cloud.google.com/).
2. En la barra superior, haz clic en el selector de proyectos y luego en **"Proyecto Nuevo"** (New Project).
3. Asigna un nombre (por ejemplo: `NEXTg-App`) y haz clic en **"Crear"**.
4. Asegúrate de tener seleccionado este nuevo proyecto en la barra superior.

---

### Paso 2.2: Configurar la Pantalla de Consentimiento de OAuth (OAuth Consent Screen)
Antes de crear las credenciales, Google requiere configurar los datos que verá el usuario al iniciar sesión:
1. En el menú lateral izquierdo, ve a **APIs y servicios** > **Pantalla de consentimiento de OAuth**.
2. Selecciona el tipo de usuario:
   - **Externo (External)**: Permite que cualquier persona con cuenta de Google pueda iniciar sesión.
   - Haz clic en **"Crear"**.
3. Completa los datos obligatorios de la aplicación:
   - **Nombre de la aplicación**: `NEXT.g Backlog`
   - **Correo electrónico de asistencia al usuario**: tu correo electrónico.
   - **Logotipo de la aplicación** *(opcional)*.
   - **Datos de contacto del desarrollador**: tu correo electrónico.
4. Haz clic en **"Guardar y continuar"**.
5. En la sección de **Permisos (Scopes)**:
   - Haz clic en **"Agregar o quitar permisos"**.
   - Marca los tres permisos básicos de OpenID:
     - `.../auth/userinfo.email` (Ver tu dirección de correo electrónico principal).
     - `.../auth/userinfo.profile` (Ver tu información personal pública).
     - `openid` (Asociar tu identidad personal en Google).
   - Haz clic en **"Actualizar"** y luego en **"Guardar y continuar"**.
6. En **Usuarios de prueba (Test users)**:
   - Si tu app está en modo "Prueba" (Testing), agrega tu correo de Google y los correos con los que desees probar localmente.
   - Haz clic en **"Guardar y continuar"**.
7. Revisa el resumen y haz clic en **"Volver al panel"**.

---

### Paso 2.3: Crear las Credenciales OAuth 2.0 (Client ID y Client Secret)
1. En el menú lateral izquierdo, ve a **APIs y servicios** > **Credenciales**.
2. En la parte superior, haz clic en **"+ CREAR CREDENCIALES"** y selecciona **"ID de cliente de OAuth"**.
3. En **Tipo de aplicación**, selecciona: **Aplicación web** (Web application).
4. Asigna un nombre descriptivo: `NEXT.g Web Client`.
5. **Orígenes autorizados de JavaScript** (Authorized JavaScript origins):
   - Haz clic en **"+ AGREGAR URI"** y añade:
     - `http://localhost:5173` *(Frontend local)*
     - `http://localhost:3000` *(Backend local)*
     - *(Si tienes dominio en producción, añade también tu URL: ej. `https://tu-dominio.com`)*
6. **URIs de redireccionamiento autorizados** (Authorized redirect URIs):
   - Haz clic en **"+ AGREGAR URI"** y añade:
     - `http://localhost:3000/api/auth/google/callback` *(Local)*
     - *(En producción: `https://tu-backend.onrender.com/api/auth/google/callback`)*
7. Haz clic en **"Crear"**.
8. Aparecerá una ventana modal con:
   - **Tu ID de cliente** (Client ID, termina en `.apps.googleusercontent.com`).
   - **Tu Secreto de cliente** (Client Secret).
   - Haz clic en el ícono de copiar para guardar ambos valores.

---

## 3. Configurar las Variables en NEXT.g

Abre el archivo `backend/.env` (o crea uno a partir de `backend/.env.example`) y completa los siguientes campos:

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=tu_cliente_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_secreto_de_cliente

# URLs de la aplicación
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

---

## 4. Flujo de Autenticación de Google en NEXT.g

```
[Usuario] 
   │
   ▼ Hace clic en "Continuar con Google"
[Frontend] 
   │
   ▼ Redirige a GET /api/auth/google
[Backend Elysia] 
   │
   ▼ Genera URL OAuth y redirige a Google
[Google Login / Consent Screen]
   │
   ▼ Usuario autoriza y Google redirige a:
   ▼ /api/auth/google/callback?code=...
[Backend Elysia]
   │ 1. Intercambia `code` por tokens en https://oauth2.googleapis.com/token
   │ 2. Obtiene perfil (sub, email, name, picture) de https://www.googleapis.com/oauth2/v3/userinfo
   │ 3. Registra o actualiza al usuario en PostgreSQL
   │ 4. Genera JWT de sesión
   ▼
[Redirección al Frontend]: http://localhost:5173/#auth_token=<JWT>
   │
   ▼ Frontend detecta el token, guarda la sesión y abre Onboarding si es nuevo usuario
```

---

## 5. Verificación
1. Inicia el backend: `cd backend && bun run dev` (o mediante Docker).
2. Inicia el frontend: `bun run dev`.
3. Abre `http://localhost:5173`, haz clic en **"Iniciar sesión"** en la barra superior.
4. Presiona el botón **"Continuar con Google"**.
5. Se abrirá la pantalla oficial de Google para elegir tu cuenta y al aceptar volverás a NEXT.g logueado con tu avatar y nombre.

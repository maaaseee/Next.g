# Guía de Configuración de GitHub OAuth para NEXT.g

Esta guía explica paso a paso cómo registrar una nueva **OAuth App** en GitHub, obtener tu `Client ID` y `Client Secret`, y configurarlos en NEXT.g para habilitar el inicio de sesión y registro rápido con GitHub.

---

## 1. Requisitos Previos
- Una cuenta activa en [GitHub](https://github.com/).

---

## 2. Paso a Paso en GitHub

### Paso 2.1: Acceder a Developer Settings
1. Inicia sesión en [GitHub](https://github.com/).
2. Haz clic en tu foto de perfil (esquina superior derecha) y selecciona **Settings** (Configuración).
3. En el menú lateral izquierdo, desplázate hasta el final y haz clic en **Developer settings** (Configuración de desarrollador), o ingresa directamente a:
   [https://github.com/settings/developers](https://github.com/settings/developers).

---

### Paso 2.2: Crear una Nueva OAuth App
1. En el menú lateral, selecciona **OAuth Apps**.
2. Haz clic en el botón verde **"New OAuth App"** (o *"Register a new application"* si es la primera vez).
3. Completa los siguientes campos:
   - **Application name**: `NEXT.g Backlog`
   - **Homepage URL**: `http://localhost:5173` *(o tu dominio en producción si aplica)*
   - **Application description** *(opcional)*: `Gestor de catálogo de videojuegos y backlog inteligente.`
   - **Authorization callback URL** *(¡Muy Importante!)*:
     - Para desarrollo local: `http://localhost:3000/api/auth/github/callback`
     - Para producción: `https://tu-backend.onrender.com/api/auth/github/callback`
4. Haz clic en **"Register application"**.

---

### Paso 2.3: Generar y Copiar las Credenciales
1. En la pantalla de tu nueva aplicación verás tu **Client ID** (un código alfanumérico público de unos 20 caracteres). Cópialo.
2. En la sección **Client secrets**, haz clic en el botón **"Generate a new client secret"**.
3. Confirma tu contraseña o método de 2FA de GitHub si te lo solicita.
4. Se generará tu **Client Secret** (una cadena alfanumérica de unos 40 caracteres).
   > **Nota importante:** GitHub solo mostrará este secreto una vez. Cópialo de inmediato antes de salir de la página.

---

## 3. Configurar las Variables en NEXT.g

Abre tu archivo `backend/.env` (o `backend/.env.example`) y agrega o completa las siguientes variables:

```env
# GitHub OAuth Credentials
GITHUB_CLIENT_ID=tu_github_client_id
GITHUB_CLIENT_SECRET=tu_github_client_secret

# URLs de la aplicación
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

---

## 4. Flujo de Autenticación de GitHub en NEXT.g

```
[Usuario] 
   │
   ▼ Hace clic en "Continuar con GitHub"
[Frontend] 
   │
   ▼ Redirige a GET /api/auth/github
[Backend Elysia] 
   │
   ▼ Redirige a https://github.com/login/oauth/authorize
[GitHub Login / Autorización]
   │
   ▼ Usuario aprueba y GitHub redirige a:
   ▼ /api/auth/github/callback?code=...
[Backend Elysia]
   │ 1. Intercambia `code` por access_token en https://github.com/login/oauth/access_token
   │ 2. Obtiene perfil (id, login, name, avatar_url) de https://api.github.com/user
   │ 3. Si el email está privado, consulta https://api.github.com/user/emails para obtener el email verificado
   │ 4. Registra o actualiza al usuario en PostgreSQL
   │ 5. Genera JWT de sesión
   ▼
[Redirección al Frontend]: http://localhost:5173/#auth_token=<JWT>
   │
   ▼ Frontend detecta el token, guarda la sesión y abre Onboarding si es nuevo usuario
```

---

## 5. Verificación
1. Inicia el backend: `cd backend && bun run dev` (o Docker).
2. Inicia el frontend: `bun run dev`.
3. Ingresa a `http://localhost:5173` y haz clic en **"Iniciar sesión"**.
4. Haz clic en el botón **"Continuar con GitHub"**.
5. Autoriza la app en GitHub y serás devuelto a NEXT.g con tu usuario conectado y tu avatar de GitHub listo.

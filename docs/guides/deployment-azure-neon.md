# Guía de Despliegue a Gasto $0: ACA + GHCR + Neon + Cloudinary

Esta guía detalla los pasos para desplegar el backend de **NEXT.g** con **gasto cero permanente** utilizando servicios con *Always Free Tier* sin tarifas sorpresa.

---

## 1. Topología de Servicios

| Componente | Proveedor | Tier Gratuito | Rol |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | Hobby ($0) | Aloja la PWA Vue 3 |
| **Backend** | Azure Container Apps (ACA) | Consumption ($0) | 180.000 vCPU-segundos/mes + Escala a 0 |
| **Container Registry** | GitHub Packages (ghcr.io) | $0 | Almacena la imagen Docker sin pagar Azure ACR |
| **Base de Datos** | Neon.tech | Serverless ($0) | 0.5 GB PostgreSQL con SSL y autosuspend |
| **Avatares** | Cloudinary | Free ($0) | 25 GB de almacenamiento, auto-crop facial y WebP |

---

## 2. Paso 1: Configurar Neon Database (PostgreSQL)

1. Regístrate en [Neon.tech](https://neon.tech/).
2. Crea un nuevo proyecto (ej. `game-backlog-prod`).
3. En el Dashboard, copia la **Pooled connection string**:
   ```
   postgres://[user]:[password]@[endpoint]-pooler.[region].neon.tech/neondb?sslmode=require
   ```
4. Guarda esta URL; será tu variable `DATABASE_URL` en Azure.

---

## 3. Paso 2: Configurar Cloudinary (Avatares)

1. Regístrate en [Cloudinary](https://cloudinary.com/).
2. Desde tu **Dashboard**, copia las siguientes credenciales:
   - **Cloud Name** (`CLOUDINARY_CLOUD_NAME`)
   - **API Key** (`CLOUDINARY_API_KEY`)
   - **API Secret** (`CLOUDINARY_API_SECRET`)
3. La carpeta por defecto es `gamebacklog-avatars`.

---

## 4. Paso 3: Publicación de Imagen en GitHub Container Registry (GHCR)

El repositorio ya cuenta con el pipeline automatizado en `.github/workflows/deploy-backend.yml`.

1. Haz un `git push` a la rama `main` (o ejecuta el workflow manualmente vía *Run workflow*).
2. En GitHub, ve a la pestaña **Actions** y verifica que el workflow `Backend CI & CD Pipeline (GHCR)` termine en verde (aprobado).
3. Ve a tu perfil u organización de GitHub > **Packages** (o directamente en `https://github.com/maaaseee?tab=packages`) > selecciona **`next.g-backend`**.
4. En **Package Settings** (menú lateral derecho abajo), haz scroll hasta **Danger Zone** > **Change package visibility** y selecciona **Public**. Esto permite que Azure Container Apps descargue la imagen de forma gratuita sin necesidad de crear ni pagar por Azure Container Registry (ACR) ni configurar credenciales de registro.

---

## 5. Estrategia de Versionado Semántico & Rollback Confiable

Para no depender exclusivamente del tag `:latest` y poder realizar retrocesos (rollbacks) inmediatos ante cualquier incidente sin necesidad de descifrar códigos SHA, el pipeline genera automáticamente versiones semánticas legibles:

### Tags Publicados Automáticamente en GHCR:
- **`ghcr.io/maaaseee/next.g-backend:v1.0.0`** (Versión SemVer fija)
- **`ghcr.io/maaaseee/next.g-backend:1.0.0`** (SemVer sin prefijo)
- **`ghcr.io/maaaseee/next.g-backend:latest`** (Última versión estable de `main`)
- **`ghcr.io/maaaseee/next.g-backend:dev`** (Última versión de la rama `dev`)

### Cómo Publicar una Nueva Versión:
1. **Método Recomendado (Git Tag):**
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
   El pipeline compilará la imagen y publicará los tags `:v1.0.1`, `:1.0.1`, `:1.0` y actualizará `:latest`.
2. **Método por `package.json`:**
   Incrementa `"version": "1.0.1"` en `backend/package.json` y haz push a `main`. El pipeline publicará automáticamente `:v1.0.1`.
3. **Método Manual (GitHub Actions):**
   En la pestaña **Actions** > selecciona **Backend CI & CD Pipeline (GHCR)** > haz clic en **Run workflow** e ingresa la versión deseada (ej: `v1.0.1`).

### Cómo Hacer un Rollback Inmediato en Azure Container Apps:
Si una versión desplegada presenta algún fallo imprevisto:
1. Entra a tu **Azure Portal** > navega a tu **Container App** (`nextg-backend`).
2. En el menú lateral, ve a **Application > Containers** > haz clic en **Edit and deploy**.
3. En la pestaña del contenedor, cambia la etiqueta de la imagen a la versión estable previa:
   ```
   ghcr.io/maaaseee/next.g-backend:v1.0.0
   ```
4. Haz clic en **Create**. Azure iniciará una nueva réplica con la versión anterior y redirigirá el tráfico sin tiempo de inactividad (Zero Downtime).

---

## 6. Paso 4: Desplegar en Azure Container Apps ($0)

### Mediante Azure Portal o Azure CLI:

#### 1. Crear el Container App Environment:
- **Region:** East US o la más cercana a tus usuarios.
- **Plan:** **Consumption (Serverless)** *(Obligatorio para que sea gratuito)*.

#### 2. Crear la Container App:
- **Nombre:** `nextg-backend`
- **Origen de la imagen:** Docker Hub u otros registros (`ghcr.io`).
- **Tipo de registro:** Otros (o Público si el paquete es público).
- **Servidor del Registro:** `ghcr.io`
- **Imagen y etiqueta:** `ghcr.io/maaaseee/next.g-backend:latest`
- **Tamaño del contenedor:**
  - **vCPU:** `0.25`
  - **Memoria:** `0.5 GiB`
- **Escalado (Scale Rules):**
  - **Min Replicas:** `0` *(Crítico: permite que el contenedor se suspenda cuando no hay tráfico, manteniendo el costo en $0)*.
  - **Max Replicas:** `1` o `2` *(Evita sorpresas de autoescalado masivo)*.
- **Ingress (Red):**
  - **Enabled:** Sí
  - **Target Port:** `3000`
  - **Insecure connections:** Deshabilitado (Azure fuerza HTTPS automáticamente con certificado SSL gratuito).

#### 3. Sondas de Salud (Health Probes en ACA) — *Crítico para Producción*:
En la sección **Application > Containers > Edit and deploy > Health probes**, configura dos sondas independientes:

- **Liveness Probe (Sonda de Vida):**
  - **Transport:** `HTTP`
  - **Path:** `/health/live`
  - **Port:** `3000`
  - **Initial delay:** `5` segundos
  - **Period:** `15` segundos
  - *(Garantiza que ACA supervise la salud del proceso Bun/Elysia sin reiniciar contenedores ante latencias transitorias de base de datos).*

- **Readiness Probe (Sonda de Preparación):**
  - **Transport:** `HTTP`
  - **Path:** `/health/ready`
  - **Port:** `3000`
  - **Initial delay:** `5` segundos
  - **Period:** `10` segundos
  - *(Comprueba que la base de datos esté lista antes de que el ingress de Azure le envíe tráfico).*

#### 4. Variables de Entorno en Azure Container Apps:

Configura las siguientes variables en la sección **Application > Containers > Edit and deploy > Environment variables**:

```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgres://[user]:[password]@[endpoint]-pooler.neon.tech/neondb?sslmode=require
JWT_SECRET=tu-clave-secreta-jwt-super-segura-en-produccion-de-al-menos-32-caracteres
CORS_ORIGIN=https://tu-app.vercel.app,http://localhost:5173
FRONTEND_URL=https://tu-app.vercel.app
BACKEND_URL=https://gamebacklog-backend.[region].azurecontainerapps.io
TWITCH_CLIENT_ID=tu_twitch_client_id
TWITCH_CLIENT_SECRET=tu_twitch_client_secret
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
CLOUDINARY_FOLDER=gamebacklog-avatars

# Opcional pero recomendado para Rate Limiting persistente multi-réplica en ACA
UPSTASH_REDIS_REST_URL=https://[endpoint].upstash.io
UPSTASH_REDIS_REST_TOKEN=[token]

# Opcional para habilitar inicio de sesión social OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Opcional: Clave administrativa si requieres ejecutar POST /api/seed en producción
ADMIN_SEED_SECRET=tu-clave-admin-seed-secreta
```

> [!WARNING]
> En entorno `production`, el backend incluye una validación de seguridad estricta al iniciar: si `JWT_SECRET` no está definida o contiene los valores por defecto del repositorio, el contenedor **se detendrá inmediatamente por seguridad**. Asegúrate de generar un valor aleatorio seguro (ej. con `openssl rand -hex 32`).

> [!TIP]
> Si cambias tu dominio en Vercel, o si agregas un dominio personalizado (ej. `https://miapp.com`), solo debes editar la variable `CORS_ORIGIN` en el panel de Azure Container Apps (separada por comas) **sin tener que volver a compilar ni tocar el código**:
> `CORS_ORIGIN=https://miapp.com,https://tu-app.vercel.app`

---

## 6. Paso 5: Conectar el Frontend en Vercel

1. En tu proyecto de Vercel, ve a **Settings > Environment Variables**.
2. Añade la variable:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://gamebacklog-backend.[region].azurecontainerapps.io`
3. Vercel reconstruirá la aplicación automáticamente.

---

## 7. Verificación del Despliegue

1. **Liveness Check:** Visita `https://gamebacklog-backend.[region].azurecontainerapps.io/health/live`.
   - Respuesta esperada (HTTP 200):
     ```json
     {
       "status": "alive",
       "timestamp": "2026-11-10T...",
       "service": "nextg-backend"
     }
     ```
2. **Readiness Check:** Visita `https://gamebacklog-backend.[region].azurecontainerapps.io/health/ready`.
   - Respuesta esperada (HTTP 200):
     ```json
     {
       "status": "ready",
       "database": "connected",
       "timestamp": "2026-11-10T..."
     }
     ```
3. **Endpoint de Seeding Protegido:** Envía una solicitud `POST /api/seed` sin cabeceras; debe responder `403 Forbidden` (`El endpoint de inicialización está deshabilitado en producción`).
4. **CORS:** Prueba una llamada desde un origen no autorizado (ej. Postman con Origin falso o sitio externo); la llamada debe ser bloqueada por la política de CORS.
5. **Subida de Avatares:** Al subir una imagen desde el perfil (`PUT /api/users/me/avatar`), verifica que Cloudinary recorta automáticamente el rostro y entrega una URL segura en formato `.webp`.

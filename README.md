<div align="center">

<a href="#-nextg--video-game-backlog--discovery-hub">
  <img src="./docs/images/banner.svg" alt="NEXT.g Banner" width="100%" />
</a>

# 🎮 NEXT.g — Video Game Backlog & Discovery Hub

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue_3-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![Elysia.js](https://img.shields.io/badge/Elysia.js-323330?style=for-the-badge&logo=elysia&logoColor=white)](https://elysiajs.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Neon Database](https://img.shields.io/badge/Neon_Serverless-00E599?style=for-the-badge&logo=neon&logoColor=black)](https://neon.tech/)
[![Azure Container Apps](https://img.shields.io/badge/Azure_Container_Apps-0078D4?style=for-the-badge&logo=microsoft-azure&logoColor=white)](https://azure.microsoft.com/products/container-apps)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

<p align="center">
  <strong>NEXT.g</strong> es una plataforma web moderna, rápida y con estética retro-cyberpunk para gamers que buscan organizar su biblioteca de videojuegos pendientes, combatir la parálisis de elección con ruletas interactivas y compartir su perfil gamer con el mundo.
</p>

[Características](#-características-principales) • [Arquitectura](#-arquitectura--stack-tecnológico) • [Instalación Local](#-guía-de-instalación-y-ejecución-local) • [Despliegue](#-despliegue-en-producción) • [Roadmap](#-roadmap-del-proyecto) • [Documentación](./docs/README.md) • [Licencia](#-licencia)

</div>

---

## ✨ Características Principales

### 📚 Gestión Visual de Biblioteca (Panorámica & Drag & Drop)
- **Clasificación en 4 Estados:** Organiza tus títulos en **Jugando**, **Backlog**, **Completado** y **Deseados**.
- **Contenedor Deslizante Panorámico:** Desplázate entre colecciones con navegación horizontal suave, botones asistidos y transiciones fluidas.
- **Drag & Drop Intuitivo:** Mueve títulos entre pestañas simplemente arrastrándolos hacia los bordes laterales asistidos.
- **Acciones Rápidas en Tarjeta:** Cambia de categoría o elimina elementos al instante mediante micro-interacciones hover.

### 🔍 Búsqueda Global & Catálogo Oficial (IGDB API v4)
- **Buscador Global con Shortcut:** Activa la búsqueda en cualquier momento presionando `Ctrl + K` o mediante el icono en la barra de navegación.
- **Metadatos Oficiales en Tiempo Real:** Integración directa con **IGDB API** a través de autenticación OAuth2 de Twitch: carátulas oficiales en alta definición, sinopsis, año de lanzamiento, géneros, plataformas, rating y tabla completa de idiomas (audio, subtítulos e interfaz).
- **Páginas de Detalle Dedicadas (`/game/:id`):** Ficha cinemática expandida con información completa del título y enlaces directos a la biblioteca.
- **Carruseles Horizontales de una Fila:** Exploración de juegos recomendados y populares en filas deslizables sin saturar la pantalla.
- **Caché Multinivel de Alto Rendimiento:**
  1. *Cliente (RAM):* Respuestas en sesión inmediata mediante Pinia sin consultas repetitivas de red.
  2. *Servidor (PostgreSQL):* Almacenamiento persistente en la tabla `search_cache` con TTL de 45 días para respetar límites de cuota de IGDB.
  3. *Semilla Offline:* Base de datos local precargada con títulos esenciales disponible ante fallos de conexión o cuotas agotadas.

### 🎲 Ruleta Selectora de Juegos ("¿Qué juego hoy?")
- **Dial Circular Clásico:** Ruleta interactiva de 360 grados con física de inercia y desaceleración gradual.
- **Escáner Vertical (Reel / Slot Machine):** Selección dinámica secuencial con estética de máquina recreativa arcade.
- **Selección Directa (Instantánea):** Algoritmo de azar inmediato para quienes desean empezar a jugar sin esperas.
- **Filtros Personalizados:** Calibra el azar filtrando por categoría, género o plataforma antes de girar.
- **Modal de Ganador Cinemático:** Pantalla de victoria con animaciones de confeti, ficha rápida del juego y botón para marcarlo como *Jugando* de inmediato.

### 🛡️ Autenticación, Privacidad y GamerTag
- **Autenticación Dual Segura:** Tokens JWT almacenados en cookies `HttpOnly`, `SameSite=Lax` y `Secure` (protección total contra XSS) con soporte transparente de encabezados `Bearer` para integraciones API.
- **Social Login:** Inicio de sesión en un clic con **GitHub** y **Google OAuth2**.
- **Privacy Shield & Selector de GamerTag (`/choose-nickname`):**
  - Los usuarios que se registran con proveedores sociales pueden elegir su nickname antes de finalizar la creación de cuenta, evitando la filtración involuntaria de su nombre real o correo electrónico.
  - El correo electrónico se mantiene estrictamente confidencial: no se expone en respuestas públicas ni en la interfaz del usuario.
- **Validación Estricta de Contraseña:**
  - Mínimo de 8 caracteres, al menos una letra mayúscula y un número.
  - Soporte completo para caracteres Unicode del español (como la letra **"ñ" / "Ñ"** y vocales con tilde).
- **Componentes de Auth Modulares:** Arquitectura desacoplada en `src/components/auth/` (`AuthCard`, `UsernameField`, `EmailField`, `PasswordField`, `PasswordRequirements`, `LegalCheckboxes`, `SocialAuthButtons`).

### 🎮 Pasaporte Gamer & Perfiles Públicos (`/user/:nickname`)
- **URL Personalizada:** Comparte tu perfil público con tu propio GamerTag (`nextg.app/user/mi-nick`).
- **Vitrina de Logros:** Visualiza tu banner, avatar, estadísticas totales (Completados, Jugando, Backlog) y colección completa.
- **Tarjetas Dinámicas Open Graph (SVG):**
  - `/api/og/user/:nickname`: Genera una tarjeta vectorial 1200x630 (Gamer Passport) con avatar embebido en Base64 para previsualizaciones ricas en Discord, Twitter/X, WhatsApp y Telegram.
  - `/api/og/game/:id`: Genera tarjetas sociales de alta calidad para cualquier videojuego de la base de datos.

### 🚀 Onboarding Guiado (Setup Inicial)
- Flujo interactivo estilo plataforma de streaming (`/setup`):
  - Selección de al menos 3 videojuegos favoritos para entrenar las sugerencias iniciales.
  - Configuración de tema visual y preferencias iniciales.

### 🎨 Personalización & Sistema de Temas (oklch)
Cinco paletas de color con contraste optimizado:
- 🍇 **Vintage Berry** (Predeterminado: Neo-arcade y púrpura neón)
- 🌿 **Jungle Teal** (Verde esmeralda profundo)
- 🧱 **Brick Ember** (Brasas cálidas y terracota)
- ⚡ **Vivid Royal** (Azul eléctrico vibrante)
- 🇦🇷 **Argentina** (Celeste y Sol de Mayo)

---

## 🏗️ Arquitectura & Stack Tecnológico

```
Game Backlog/
├── backend/                      # API REST ultrarrápida con Bun + Elysia
│   ├── src/
│   │   ├── config/               # Variables de entorno y constantes de seguridad
│   │   ├── controllers/          # Endpoints (auth, users, games, search, og)
│   │   ├── db/                   # Conexión PostgreSQL (postgres.js) y migraciones
│   │   │   ├── migrations/       # Scripts SQL numerados (001 a 005)
│   │   │   ├── migrate.ts        # Runner autónomo de migraciones
│   │   │   └── seed-data.ts      # Catálogo semilla offline
│   │   ├── middleware/           # Rate limiting por IP y headers de seguridad OWASP
│   │   ├── providers/            # Patrón Adaptador para IGDB API v4
│   │   ├── services/             # Lógica de negocio (auth, avatar, search, games)
│   │   └── utils/                # Logging rotativo estructurado con Winston
│   └── tests/                    # Suite de 52 tests de integración (Bun Test)
│
├── src/                          # Single Page Application con Vue 3
│   ├── assets/                   # Estilos Tailwind v4, fuentes Monofett y temas
│   ├── components/
│   │   ├── auth/                 # Componentes modulares de autenticación
│   │   ├── catalog/              # Tarjetas, tabs deslizantes y modales
│   │   ├── common/               # Navbar, Footer, carruseles, toast, confirm modal
│   │   ├── roulette/             # Modos Dial, Slot Reel y Picker instantáneo
│   │   ├── setup/                # Pasos del onboarding inicial
│   │   └── ui/                   # Primitivas accesibles de interfaz (Botones, Badges)
│   ├── composables/              # Lógica reutilizable (Drag & Drop, validaciones, OG)
│   ├── stores/                   # Estado global reactivo con Pinia (auth, games, preferences)
│   ├── types/                    # Contratos TypeScript estrictos
│   └── views/                    # Vistas (Landing, Library, Roulette, Profile, Detail, Auth)
│
└── docs/                         # Base de conocimiento y documentación técnica
    ├── architecture/             # Especificaciones, PRD y changelog de API
    ├── guides/                   # Guías de OAuth (GitHub, Google) y Despliegue en la nube
    ├── images/                   # Recursos visuales oficiales (logo.svg, banner.svg)
    └── product/                  # Roadmap de versiones futuras
```

### Tecnologías Principales
- **Frontend:** [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`), [Vite](https://vite.dev/), [Pinia](https://pinia.vuejs.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/).
- **Backend:** [Bun](https://bun.sh/) (Runtime TypeScript de alto rendimiento), [Elysia.js](https://elysiajs.com/), [PostgreSQL](https://github.com/porsager/postgres) (Cliente nativo ligero sin el overhead de ORMs pesados), [Winston](https://github.com/winstonjs/winston).
- **Almacenamiento Cloud:** [Neon Serverless PostgreSQL](https://neon.tech/) para datos relacionales y [Cloudinary](https://cloudinary.com/) para avatares optimizados.
- **Alojamiento Cloud:** [Azure Container Apps](https://azure.microsoft.com/products/container-apps) para el backend y [Vercel](https://vercel.com/) para el frontend.

---

## 💻 Guía de Instalación y Ejecución Local

### Prerrequisitos
- [Node.js](https://nodejs.org/) (v22+) o [Bun](https://bun.sh/) (recomendado).
- Una instancia de [PostgreSQL](https://www.postgresql.org/) (local o remota vía Neon/Docker).
- Credenciales de aplicación en [Twitch Developer Console](https://dev.twitch.tv/console/apps) (`Client ID` y `Client Secret`).

---

### 1. Clonar el Repositorio
```bash
git clone https://github.com/maaaseee/Game-Backlog.git
cd Game-Backlog
```

---

### 2. Configurar y Ejecutar el Backend

1. Accede a la carpeta del backend e instala dependencias:
   ```bash
   cd backend
   bun install
   ```

2. Crea tu archivo `.env` basado en la plantilla `backend/.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Completa las variables necesarias en `backend/.env`:
   ```env
   PORT=3000
   DATABASE_URL=postgres://postgres:password@localhost:5432/nextg_db
   JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
   TWITCH_CLIENT_ID=tu_twitch_client_id
   TWITCH_CLIENT_SECRET=tu_twitch_client_secret
   CORS_ORIGIN=http://localhost:5173
   NODE_ENV=development
   ```

4. Ejecuta las migraciones de base de datos y la semilla opcional:
   ```bash
   bun run migrate
   bun run seed
   ```

5. Inicia el servidor en modo desarrollo con recarga automática:
   ```bash
   bun run dev
   ```
   > 🚀 Backend disponible en `http://localhost:3000`. Documentación Swagger/OpenAPI en `http://localhost:3000/docs`.

---

### 3. Configurar y Ejecutar el Frontend

1. En la raíz del proyecto, instala las dependencias:
   ```bash
   npm install
   # o bien:
   bun install
   ```

2. Crea tu archivo de variables locales `.env`:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

3. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
   > 🎮 Abre tu navegador en `http://localhost:5173`.

---

### 4. Ejecución de Pruebas Automatizadas

- **Suite de Pruebas del Backend (52 tests con Bun Test):**
  ```bash
  cd backend
  bun test
  ```
- **Suite de Pruebas del Frontend (17 tests con Vitest):**
  ```bash
  npm run test:unit
  ```
- **Verificación de Tipos TypeScript (Frontend & Backend):**
  ```bash
  npm run type-check       # Frontend (vue-tsc)
  cd backend && bun run typecheck  # Backend (tsc)
  ```
- **Compilación de Producción:**
  ```bash
  npm run build
  ```

---

## ☁️ Despliegue en Producción

La arquitectura de **NEXT.g** está optimizada para ejecutarse en plataformas modernas de nube sin servidores tradicionales:

| Componente | Plataforma | Descripción |
|---|---|---|
| **Frontend** | [Vercel](https://vercel.com/) | SPA estática global con CDN Edge, compresión Brotli y rewrites SPA en [`vercel.json`](./vercel.json). |
| **Backend** | [Azure Container Apps](https://azure.microsoft.com/products/container-apps) | Contenedor serverless basado en el [`Dockerfile`](./backend/Dockerfile) con autoescalado 0-3 y sondas de liveness/readiness. |
| **Base de Datos** | [Neon](https://neon.tech/) | PostgreSQL Serverless con Connection Pooling (`-pooler`) para gestionar picos de tráfico. |
| **Media & CDN** | [Cloudinary](https://cloudinary.com/) | Transformación, recorte facial inteligente y distribución de avatares. |

Consulta la guía detallada paso a paso en [**`docs/guides/deployment-azure-neon.md`**](./docs/guides/deployment-azure-neon.md).

---

## 🗺️ Roadmap del Proyecto

- [x] **Fase 1: Core de Biblioteca y Drag & Drop**
  - [x] Tableros interactivos para estados: Jugando, Backlog, Completado y Deseados.
  - [x] Contenedor panorámico deslizante con zonas asistidas de arrastre.
  - [x] Páginas de detalle dedicadas (`/game/:id`) con tablas de idiomas y carátulas HD.

- [x] **Fase 2: Motor de Ruletas y Decisión**
  - [x] 3 modos interactivos: Dial Circular Clásico, Escáner Vertical y Selección Instantánea.
  - [x] Filtros previos por categoría, género y plataforma.
  - [x] Modal de victoria con animaciones y acciones directas.

- [x] **Fase 3: Búsqueda y Arquitectura de Datos**
  - [x] Integración con IGDB API v4 con autenticación Twitch OAuth2.
  - [x] Caché multinivel en 3 capas (RAM en cliente, PostgreSQL 45 días, Semilla Offline).
  - [x] Búsqueda global flotante accesible mediante `Ctrl + K`.

- [x] **Fase 4: Autenticación, Seguridad y Privacidad**
  - [x] Login con contraseña (JWT en cookies HttpOnly y validación Unicode para la letra "ñ").
  - [x] Social Logins con GitHub y Google OAuth2.
  - [x] Pantalla de selección de GamerTag (`/choose-nickname`) para protección de privacidad.
  - [x] Componentes de formulario modulares y reutilizables.

- [x] **Fase 5: Pasaporte Gamer & Comunidad**
  - [x] Perfiles públicos con URLs amigables (`/user/:nickname`).
  - [x] Generador dinámico de tarjetas Open Graph SVG (`/api/og/user/:nickname` y `/api/og/game/:id`).
  - [x] Onboarding interactivo guiado estilo Netflix (`/setup`).

- [ ] **Fase 6: Próximas Versiones (V1.1 - V2.0)**
  - [ ] Sistema de reseñas escritas y calificaciones con estrellas personales (V1.1).
  - [ ] Diario de partidas cronológico con registro de horas jugadas (V1.2).
  - [ ] Generador de Tier Lists arrastrables para compartir en redes (V1.3).
  - [ ] Sincronización automática con Steam, PlayStation Network y Xbox (V2.0).

---

## 📚 Base de Conocimiento

Toda la documentación técnica, guías operativas y arquitectura se encuentran centralizadas en [`docs/`](./docs/README.md):
- 🏛️ [Arquitectura y PRD](./docs/architecture/)
- 🚀 [Guías de Despliegue y OAuth](./docs/guides/)
- 🎨 [Sistema de Diseño y Recursos](./docs/design/palettes.css)
- 🖼️ [Recursos de Identidad Visual (Logo y Banner)](./docs/images/)
- 📋 [Planes de Tareas y Verificación](./docs/tasks/)

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

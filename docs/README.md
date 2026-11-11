# Documentación de NEXT.g Backlog

Bienvenido a la documentación oficial y base de conocimiento de **NEXT.g Backlog**, el gestor de catálogo y backlog inteligente para videojuegos conectado en tiempo real con IGDB.

---

## Estructura de la Documentación

```
docs/
├── architecture/          # Especificaciones técnicas, arquitectura y requerimientos
│   ├── prd-functional.md      # Visión de producto, requerimientos funcionales y UX
│   ├── tech-architecture.md   # Arquitectura general, stack tecnológico y patrones
│   ├── spec-backend.md        # Especificación del backend (Bun + Elysia + PostgreSQL)
│   ├── spec-frontend.md       # Especificación del frontend (Vue 3 + Tailwind v4 + Pinia)
│   └── api-changelog.md       # Registro histórico de cambios en endpoints y contratos
├── guides/                # Guías prácticas de configuración, autenticación y despliegue
│   ├── oauth-github.md        # Paso a paso para configurar OAuth con GitHub
│   ├── oauth-google.md        # Paso a paso para configurar OAuth con Google Cloud
│   └── deployment-azure-neon.md # Guía de despliegue en Azure Container Apps + Neon/Supabase
├── product/               # Estrategia de producto y evolución del sistema
│   └── roadmap.md             # Roadmap de versiones futuras (V1.1, V1.2, V2.0)
├── design/                # Tokens visuales y recursos de diseño
│   └── palettes.css           # Paletas de colores (Midnight, Emerald, Cyberpunk, Rose)
├── images/                # Recursos visuales e identidad gráfica oficial
│   ├── logo.svg               # Logo vectorial adaptable (Light/Dark mode)
│   └── banner.svg             # Banner panorámico gamer para README y headers
└── tasks/                 # Tareas y planes de ejecución iniciales del MVP
    ├── backend-plan.md        # Plan de fases del backend
    ├── backend-todo.md        # Checklist de tareas del backend
    ├── frontend-plan.md       # Plan de fases del frontend
    └── frontend-todo.md       # Checklist de tareas del frontend
```

---

## 🏛️ Arquitectura & Especificaciones ([`architecture/`](./architecture/))

* [**prd-functional.md**](./architecture/prd-functional.md): Definición funcional del producto, historias de usuario, flujos principales (Onboarding, Ruleta anti-parálisis, Colecciones).
* [**tech-architecture.md**](./architecture/tech-architecture.md): Documento técnico maestro, stack (Bun, Elysia, PostgreSQL, Vue 3, Vite), decisiones de ingeniería y seguridad (OWASP, JWT).
* [**spec-backend.md**](./architecture/spec-backend.md): Arquitectura de servicios, controladores, middleware de rate limiting, base de datos y adaptador IGDB.
* [**spec-frontend.md**](./architecture/spec-frontend.md): Arquitectura de componentes Vue 3, tiendas Pinia, animaciones, accesibilidad y diseño cuadrado estilo Backloggd/IGDB.
* [**api-changelog.md**](./architecture/api-changelog.md): Historial de cambios en endpoints, paginación, rate limits y modelos de respuesta.

---

## 🚀 Guías de Configuración & Despliegue ([`guides/`](./guides/))

* [**oauth-github.md**](./guides/oauth-github.md): Configuración de GitHub OAuth App (Client ID, Client Secret, URLs de callback local y producción).
* [**oauth-google.md**](./guides/oauth-google.md): Configuración de Google Cloud Console (Consent Screen, Credenciales OAuth 2.0).
* [**deployment-azure-neon.md**](./guides/deployment-azure-neon.md): Despliegue en la nube con Azure Container Apps (Backend) y Neon / Supabase (PostgreSQL serverless).

---

## 🗺️ Producto & Roadmap ([`product/`](./product/))

* [**roadmap.md**](./product/roadmap.md): Plan de versiones posteriores (V1.1 Reseñas & Puntuaciones, V1.2 Diario cronológico de partidas, V1.3 Creador de Tier Lists, V2.0 Sincronización automática con Steam/PSN/Xbox).

---

## 🎨 Diseño & UI ([`design/`](./design/))

* [**palettes.css**](./design/palettes.css): Definición de temas de color y variables CSS (`--app-primary`, `--app-surface`, `--app-bg`, etc.) para los 4 temas de la aplicación.

---

## 🖼️ Recursos Visuales & Marca ([`images/`](./images/))

* [**logo.svg**](./images/logo.svg): Logo vectorial oficial adaptable a temas claro y oscuro (`NEXT.g`).
* [**banner.svg**](./images/banner.svg): Banner panorámico cyberpunk oficial (1200x340) con iluminación de neón para READMEs y cabeceras.

---

## 📋 Tareas & Ejecución ([`tasks/`](./tasks/))

* [**backend-plan.md**](./tasks/backend-plan.md) & [**backend-todo.md**](./tasks/backend-todo.md): Fases de desarrollo, migraciones y endpoints del backend.
* [**frontend-plan.md**](./tasks/frontend-plan.md) & [**frontend-todo.md**](./tasks/frontend-todo.md): Fases de interfaz de usuario, componentes de catálogo y ruleta.

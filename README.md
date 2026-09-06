# 🎮 NEXT.g — Video Game Backlog & Discovery Manager

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vue 3](https://img.shields.io/badge/Vue_3-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)
![Elysia.js](https://img.shields.io/badge/Elysia.js-323330?style=for-the-badge&logo=elysia&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

**NEXT.g** es una aplicación web moderna, rápida y minimalista pensada para gamers que desean llevar el control absoluto de su biblioteca de videojuegos, decidir qué jugar con ruletas interactivas y descubrir nuevos títulos sin fricciones.

[Características](#-características-principales) • [Arquitectura](#-arquitectura--stack-tecnológico) • [Instalación Local](#-guía-de-instalación-y-ejecución-local) • [Roadmap](#-roadmap-del-proyecto) • [Licencia](#-licencia)

</div>

---

## ✨ Características Principales

### 📚 Gestión Visual de Biblioteca (Drag & Drop)
- **Organización por Estados:** Clasifica tus juegos en **Backlog**, **Jugando**, **Completado** y **Deseados**.
- **Contenedor Deslizante Panorámico:** Navega entre categorías con un slider horizontal fluido y zonas laterales de arrastre asistido.
- **Acciones Rápidas en Tarjeta:** Cambia el estado o elimina juegos directamente con micro-interacciones hover sobre una barra de acciones discreta.
- **Ficha de Detalle Cinemática:** Modal expandido con carátulas en alta resolución, sinopsis, año de lanzamiento, géneros, plataformas y calificación.

### 🎲 Ruleta Selectora de Juegos ("¿Qué juego hoy?")
- **Dial Circular Clásico:** Rueda interactiva con desaceleración inercial y física realista.
- **Escáner Vertical:** Secuencia lineal estilo reel/slot machine para una selección dinámica.
- **Selección Directa (Instantánea):** Algoritmo de decisión ultrarrápido con micro-animaciones.
- **Filtros Integrados:** Filtra por categoría, género o plataforma antes de girar.

### 🔍 Buscador Global de Juegos
- **Búsqueda Global con Shortcut:** Accede desde la Navbar o con `Ctrl + K` desde cualquier pantalla.
- **Integración con RAWG API:** Acceso a miles de títulos de videojuegos con metadatos completos y portadas.
- **Caché Multinivel y Optimización:**
  - **Debounce estricto:** 750 ms y umbral mínimo de 4 caracteres para evitar consumo innecesario de cuota.
  - **Caché en RAM de sesión (Pinia):** Búsquedas repetidas instantáneas sin peticiones a la red.
  - **Caché persistente SQLite (Backend):** Guarda respuestas por 45 días protegiendo los límites de la API externa.
  - **Catálogo Semilla Offline:** Búsqueda local de respaldo en caso de agotamiento de cuota o pérdida de conexión.

### 🎨 Personalización y Temas
- Selector de temas visuales basados en espacios de color modernos (`oklch` y Tailwind v4):
  - 🍇 **Vintage Berry** (Retro Arcade & Neón)
  - 🌿 **Jungle Teal** (Verde Esmeralda)
  - 🧱 **Brick Ember** (Brasas Cálidas)
  - ⚡ **Vivid Royal** (Azul Eléctrico)
  - 🇦🇷 **Argentina** (Celeste & Sol de Mayo)

---

## 🏗️ Arquitectura & Stack Tecnológico

```
Game Backlog/
├── backend/                  # API REST construida con Bun + Elysia
│   ├── src/
│   │   ├── config/           # Carga y validación de variables de entorno
│   │   ├── controllers/      # Controladores de búsqueda y biblioteca
│   │   ├── db/               # SQLite (bun:sqlite), migraciones automáticas y seed local
│   │   ├── providers/        # Patrón Adaptador para APIs externas (RAWG / IGDB)
│   │   ├── services/         # Orquestador de búsqueda, caché de 45 días y CRUD
│   │   └── utils/            # Sistema de logging profesional (Winston)
│   └── tests/                # Suite de pruebas unitarias y de integración
│
├── src/                      # Frontend SPA construido con Vue 3
│   ├── assets/               # Fuentes y estilos globales (Tailwind v4, temas oklch)
│   ├── components/
│   │   ├── catalog/          # Tarjetas, modales de detalle, buscador global, slider
│   │   ├── common/           # Navbar centrada al 50%, Footer, selector de temas
│   │   └── roulette/         # Dial circular, slot vertical, selector instantáneo
│   ├── composables/          # Drag & Drop nativo, gestión de temas
│   ├── stores/               # Stores reactivos de Pinia con caché de sesión
│   ├── types/                # Contratos y tipos TypeScript compartidos
│   └── views/                # Vistas de Biblioteca (CatalogView) y Ruleta (RouletteView)
```

- **Frontend:** [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`), [Vite](https://vite.dev/), [Pinia](https://pinia.vuejs.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/).
- **Backend:** [Bun](https://bun.sh/) (Runtime de alto rendimiento), [Elysia.js](https://elysiajs.com/), [SQLite](https://bun.sh/docs/api/sqlite) integrado en Bun (`bun:sqlite`), [Winston](https://github.com/winstonjs/winston) (logs rotativos y en terminal).
- **Patrones de Diseño:**
  - **Adapter Pattern:** Interfaz común `GameProvider` que desacopla la API de RAWG de IGDB, permitiendo alternar proveedores sin tocar el frontend.
  - **Multi-tier Cache:** Memoria RAM en cliente $\rightarrow$ SQLite en servidor $\rightarrow$ API Externa $\rightarrow$ Semilla Offline.

---

## 💻 Guía de Instalación y Ejecución Local

### Prerrequisitos
- [Node.js](https://nodejs.org/) (v22 o superior) o [Bun](https://bun.sh/) (recomendado para el backend).
- Una API Key gratuita de [RAWG.io](https://rawg.io/apidocs).

---

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/game-backlog.git
cd game-backlog
```

---

### 2. Configuración y Ejecución del Backend

1. Entra a la carpeta del backend e instala dependencias:
   ```bash
   cd backend
   bun install
   ```

2. Crea tu archivo de variables de entorno `.env` en `backend/.env`:
   ```env
   PORT=3000
   RAWG_API_KEY=tu_clave_de_rawg_aqui
   CORS_ORIGIN=http://localhost:5173
   NODE_ENV=development
   ```

3. *(Opcional)* Carga el catálogo semilla de respaldo en la base de datos:
   ```bash
   bun run seed
   ```

4. Inicia el servidor backend en modo desarrollo:
   ```bash
   bun run dev
   ```
   > 🚀 El servidor estará escuchando en `http://localhost:3000` con SQLite listo.

---

### 3. Configuración y Ejecución del Frontend

1. En una nueva terminal, ve a la raíz del proyecto e instala dependencias:
   ```bash
   npm install
   # o bien:
   bun install
   ```

2. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
   > 🎮 Abre tu navegador en `http://localhost:5173`.

---

### 4. Ejecución de Pruebas

- **Pruebas del Backend (Bun Test):**
  ```bash
  cd backend
  bun test
  ```
- **Comprobación de tipos del Frontend:**
  ```bash
  npm run type-check
  ```
- **Build de producción del Frontend:**
  ```bash
  npm run build
  ```

---

## 🗺️ Roadmap del Proyecto

- [x] **Fase 1: Core de Biblioteca y Drag & Drop**
  - [x] Tableros interactivos para estados: Backlog, Jugando, Completado y Deseados.
  - [x] Transiciones deslizantes y zonas laterales de arrastre fluido.
  - [x] Modal de detalle cinemático con metadatos completos.

- [x] **Fase 2: Motor de Ruletas y Decisión**
  - [x] Tres modos de juego: Dial Clásico, Escáner Vertical y Selección Directa.
  - [x] Filtros por estado, género y plataforma integrados en el contenedor.
  - [x] Modal de celebración de ganador con animaciones.

- [x] **Fase 3: Búsqueda y Arquitectura de Proveedores**
  - [x] Patrón Adapter para unificar RAWG e IGDB bajo el contrato `NormalizedGame`.
  - [x] Caché de búsquedas en 3 capas (Pinia RAM, SQLite 45 días, Semilla Offline).
  - [x] Barra de búsqueda global accesible con `Ctrl + K` en la Navbar.
  - [x] Sistema de logging profesional estructurado con Winston.

- [ ] **Fase 4: Multi-usuario & Despliegue en la Nube**
  - [ ] Soporte de sesiones anónimas (UUID en cliente) para demos públicas compartidas.
  - [ ] Integración con base de datos Serverless (Turso / Supabase).
  - [ ] Despliegue automatizado en Vercel (Frontend) y Render/Railway (Backend).

- [ ] **Fase 5: Métricas & Social (Futuro)**
  - [ ] Gráficos de tiempo invertido y títulos completados por año.
  - [ ] Compartir perfil y ruletas personalizadas con amigos mediante enlace único.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más información.

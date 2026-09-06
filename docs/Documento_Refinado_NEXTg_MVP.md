# Documento Refinado de Especificación: “NEXT.g” MVP

**Fecha:** Septiembre 2026  
**Estado:** Aprobado para Desarrollo  
**Enfoque:** Local-First Desktop PWA • Vue 3 + ElysiaJS + SQLite • 4 Paletas de Color Dinámicas

---

## 1. Resumen Ejecutivo y Problem Statement

### Problem Statement
> **¿Cómo podríamos eliminar la parálisis de elección del gamer mediante un catálogo personal visualmente atractivo, personalizable en 4 temas de color y una ruleta de selección instantánea local-first?**

NEXT.g es una aplicación de gestión de catálogo de videojuegos y toma de decisiones rápidas ("qué jugar ahora"). Su valor central radica en una interfaz estética, fluida, libre de fricción y con funcionamiento 100% offline tras la carga inicial de juegos.

---

## 2. Análisis de Viabilidad de la API Externa (IGDB vs Alternativas)

### 2.1. ¿Por qué IGDB (Twitch) es la mejor opción?
La API de **IGDB** es el estándar de oro de la industria (utilizada por herramientas como *Playnite* y plataformas como *Backloggd*).

| Característica | IGDB (Twitch) | RAWG API | Steam Store API | Giant Bomb API |
| :--- | :--- | :--- | :--- | :--- |
| **Costo** | **100% Gratuita** (vía Twitch Dev) | Freemium ($) | Gratuita | Gratuita |
| **Límites de Uso** | **4 peticiones / segundo** (Sin tope mensual) | 20.000 req/mes (muy restrictivo) | Sin límites fijos pero con rate limit por IP | 200 peticiones / hora (muy bajo) |
| **Catálogo** | **> 500.000 juegos** (Retro, PC, Consolas) | ~500.000 juegos | Solo juegos de Steam | ~100.000 juegos |
| **Calidad de Carátulas** | CDN Cloudinary de alta resolución (`t_cover_big`, `t_720p`, `t_1080p`) | Media/Alta | Solo formato Steam (banners horizontales y verticales) | Variable |
| **Buscador (Search)** | Búsqueda difusa (*fuzzy matching*) avanzada | Buena | Básica | Limitada |

### 2.2. Veredicto sobre IGDB
**IGDB es 100% suficiente y óptima para este proyecto.**  
Con el límite de **4 consultas por segundo** y sin tope mensual, un usuario normal nunca alcanzará el límite si se implementa un **debounce de 300–400 ms** en el input de búsqueda.

### 2.3. Estrategia de Caché "Local-First Cache-on-Demand"
Para no saturar la API externa ni depender de internet para el uso diario:
1. **Búsqueda Proxy:** Solo el buscador (`/api/search?q=...`) consulta a IGDB a través del backend en Bun.
2. **Persistencia Local Inmediata:** Al presionar "Agregar a la biblioteca", el backend guarda el juego con su ID, título, carátula y año en la base de datos local SQLite (`games` y `user_games`).
3. **Lectura 100% Offline:** Todas las vistas del catálogo, pestañas de estados (Backlog, Jugando, Completados, Wishlist) y giros de la ruleta leen exclusivamente de SQLite local y Pinia. **No se realizan consultas repetidas a IGDB.**

---

## 3. Sistema de Theming y Diseño Visual (4 Paletas)

La aplicación implementa soporte nativo para 4 temas visuales configurables en `palletes.css`. Cada tema utiliza la variable homónima a su nombre como **color principal de acento/interacción**:

```
palletes.css
 ├── @theme vintage-berry  --> Color principal: --color-vintage-berry-* (Fondo: --color-pitch-black-*)
 ├── @theme jungle-teal    --> Color principal: --color-jungle-teal-*   (Fondo: --color-onyx-*)
 ├── @theme brick-ember    --> Color principal: --color-brick-ember-*   (Fondo: --color-dim-grey-* / onyx)
 └── @theme vivid-royal    --> Color principal: --color-vivid-royal-*   (Fondo: --color-space-indigo-*)
```

### 3.1. Detalle de las 4 Paletas
1. **Vintage Berry (`vintage-berry`):**
   - **Color Principal:** `vintage-berry` (`--color-vintage-berry-500`: `#c82d77` aprox. en OKLCH).
   - **Colores de Soporte:** `mint-cream`, `deep-purple`, `midnight-violet`.
   - **Fondo / Neutro:** `pitch-black`.
   - **Sensación:** Sofisticada, arcade retro-moderno y neón sutil.

2. **Jungle Teal (`jungle-teal`):**
   - **Color Principal:** `jungle-teal` (`--color-jungle-teal-500`: verde azulado tropical en OKLCH).
   - **Colores de Soporte:** `celadon`, `alabaster-grey`, `taupe`.
   - **Fondo / Neutro:** `onyx`.
   - **Sensación:** Natural, fresca, relajada y de aventura.

3. **Brick Ember (`brick-ember`):**
   - **Color Principal:** `brick-ember` (`--color-brick-ember-500`: rojo terracota / fuego en OKLCH).
   - **Colores de Soporte:** `ash-grey`, `ghost-white`, `dim-grey`.
   - **Fondo / Neutro:** `onyx` / `dim-grey`.
   - **Sensación:** Intensa, cálida, de acción y combate.

4. **Vivid Royal (`vivid-royal`):**
   - **Color Principal:** `vivid-royal` (`--color-vivid-royal-500`: púrpura / azul rey eléctrico en OKLCH).
   - **Colores de Soporte:** `deep-twilight`, `glaucous`, `honeydew`.
   - **Fondo / Neutro:** `space-indigo`.
   - **Sensación:** Épica, misteriosa, RPG y ciencia ficción.

### 3.2. Implementación del Selector de Temas
- Un componente `ThemeSelector.vue` en la barra superior o ajustes.
- Guarda la preferencia en `localStorage.getItem('nextg-theme')`.
- Aplica una clase o atributo `data-theme` en la etiqueta `<html>` o `<body>` para conmutar las variables de Tailwind CSS instantáneamente.

---

## 4. Alcance del MVP (In Scope vs Out of Scope)

### ✅ En Alcance (MVP Día 1)
- **Búsqueda rápida con IGDB:** Modal con debounce que lista portadas, títulos y años de lanzamiento.
- **Biblioteca Local Personalizada:** Guardar juegos en estados: `BACKLOG`, `PLAYING`, `COMPLETED`, `WISHLIST`.
- **Ruleta de Selección Interactiva:**
  - Filtro rápido por estado (ej. "Girar solo entre los de mi Backlog").
  - Animación fluida de carrusel/ruleta con frenado desacelerado que revela el juego seleccionado.
  - Botón directo para pasar el juego ganador a estado `PLAYING`.
- **Selector de 4 Paletas de Color:** Cambio en tiempo real con persistencia en `localStorage`.
- **PWA de Escritorio:** Manifiesto y service worker mediante `vite-plugin-pwa` para instalar como aplicación nativa de ventana.
- **Manejo de Errores Visual:** Skeletons de carga, fallbacks para carátulas nulas y toasts informativos.

### ❌ Fuera de Alcance (Postergado a versiones posteriores)
- **Autenticación y Login OAuth (GitHub/Google):** No aporta valor al MVP monousuario local.
- **Panel de Administrador de Métricas:** Innecesario sin base de datos compartida en la nube.
- **Reseñas, valoraciones por estrellas y notas largas.**
- **Listas personalizadas y perfiles sociales/amigos.**

---

## 5. Arquitectura Técnica y Stack

```
┌────────────────────────────────────────────────────────┐
│                   NEXT.g Frontend                      │
│   Vue 3 (Composition API) + Vite + Tailwind v4 + Pinia  │
│   Theme Switcher (4 Paletas) • Roulette Engine • PWA    │
└───────────────────────────┬────────────────────────────┘
                            │ Eden Treaty / HTTP Fetch
┌───────────────────────────▼────────────────────────────┐
│                    NEXT.g Backend                      │
│                  Bun + ElysiaJS Framework              │
│    Controllers • TypeBox Validation • IGDB Client Proxy │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
   bun:sqlite │                            │ HTTPS (Twitch OAuth)
┌─────────────▼─────────────┐   ┌──────────▼─────────────┐
│  SQLite Local Database    │   │      IGDB REST API     │
│ (games & user_games WAL)  │   │  (Twitch Game Database)│
└───────────────────────────┘   └────────────────────────┘
```

### 5.1. Esquema de Base de Datos (SQLite)
```sql
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  cover_url TEXT,
  release_year INTEGER
);

CREATE TABLE IF NOT EXISTS user_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('BACKLOG', 'PLAYING', 'COMPLETED', 'WISHLIST')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(game_id)
);
```

### 5.2. Endpoints del Backend
- `GET /api/search?q={query}`: Busca juegos en IGDB autenticando con Twitch Token. Devuelve array normalizado `{ id, title, cover_url, release_year }`.
- `GET /api/games?status={status}`: Retorna los juegos del usuario desde SQLite local, con filtro opcional por estado.
- `POST /api/games`: Inserta o actualiza el estado de un juego en la biblioteca local.
- `DELETE /api/games/:id`: Quita un juego de la biblioteca del usuario.

---

## 6. Pasos para la Implementación

1. **Configuración de Entorno y Claves:**
   - Crear `.env` con `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET`.
2. **Backend (Bun + ElysiaJS + SQLite):**
   - Servicio de token OAuth2 de Twitch con auto-renovación en memoria.
   - Endpoint de búsqueda IGDB con sanitización y normalización de portadas.
   - Repositorio CRUD en SQLite con `bun:sqlite`.
3. **Frontend (Vue 3 + Tailwind v4 + Pinia):**
   - Configurar Tailwind con las 4 paletas de `palletes.css`.
   - Store de Pinia para estado local reactivo y sincronización con el backend.
   - Componente `GameCard.vue` con estados visuales y fallback de imagen.
   - Componente `SearchModal.vue` con input reactivo y debounce.
   - Vista `RouletteView.vue` y componente `RouletteWheel.vue` con animación física de desaceleración.
   - Navbar con `ThemeSelector.vue` dinámico.
4. **PWA & Packaging:**
   - Configuración de `vite-plugin-pwa` para ejecución en escritorio.

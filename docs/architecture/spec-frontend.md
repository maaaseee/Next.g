# Especificación Técnica: Frontend (NEXT.g Web App & PWA)

## 1. Objetivo
Desarrollar una interfaz de usuario moderna, fluida y altamente interactiva utilizando **Vue 3 (Composition API)**, **Vite**, **Pinia** y **Tailwind CSS v4**, distribuible como **PWA de escritorio**. 

La aplicación permite gestionar la biblioteca de videojuegos personal clasificada por estados (`BACKLOG`, `PLAYING`, `COMPLETED`, `WISHLIST`) mediante una grilla con **transiciones deslizantes (Slide/Swipe)** y **Drag & Drop con cambio de categoría en los bordes (Slide-on-Edge)**. Ofrece una experiencia de decisión con **3 Modos de Ruleta** (Rueda de Feria, Rodillo Vertical y Selección Relámpago) y personalización instantánea en **4 paletas de color temáticas** (`vintage-berry`, `jungle-teal`, `brick-ember`, `vivid-royal`) definidas en `palletes.css`.

---

## 2. Stack Tecnológico

| Componente | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Framework UI** | Vue 3 (Composition API) | `<script setup lang="ts">` |
| **Build Tool** | Vite | >= 5.0 |
| **Gestión de Estado** | Pinia | >= 2.1 |
| **Estilos y Theming** | Tailwind CSS v4 | `@theme` dinámico con `palletes.css` |
| **Interacciones & Gestos** | HTML5 Drag & Drop API + `@vueuse/core` | Drag & Drop + detección de bordes para swipe |
| **Iconografía** | `lucide-vue-next` | Íconos limpios y ligeros |
| **PWA** | `vite-plugin-pwa` | Modo standalone para escritorio |
| **Cliente HTTP** | `fetch` nativo tipado | Consumo de la API de ElysiaJS (`http://localhost:3000`) |
| **Testing** | Vitest + `@vue/test-utils` | Pruebas de componentes y composables |

---

## 3. Comandos de Ejecución

```bash
# Instalación de dependencias
bun install # o npm install

# Servidor de desarrollo con HMR
bun run dev

# Compilación para producción
bun run build

# Previsualización del build de producción
bun run preview

# Verificación de tipos TypeScript
bunx vue-tsc --noEmit

# Ejecutar tests unitarios
bun run test
```

---

## 4. Estructura del Proyecto

```
frontend/
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── favicon.ico
│   └── manifest.webmanifest
├── src/
│   ├── assets/
│   │   └── styles/
│   │       ├── main.css                  # Imports de Tailwind v4 y variables semánticas
│   │       └── palletes.css              # Definición de los 4 @theme de palletes.css
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.vue                # Barra superior con navegación, búsqueda y selector de temas
│   │   │   ├── ThemeSelector.vue         # Selector visual de las 4 paletas con guardado en localStorage
│   │   │   ├── ToastContainer.vue        # Notificaciones flotantes de feedback
│   │   │   └── SkeletonCard.vue          # Placeholder animado de carga
│   │   ├── catalog/
│   │   │   ├── GameCard.vue              # Tarjeta arrastrable con carátula, badges, menú y feedback de drag
│   │   │   ├── StatusTabs.vue            # Pestañas con indicador animado y zonas de soltado
│   │   │   ├── SlidingContainer.vue      # Contenedor con transición de deslizamiento (Slide/Swipe) entre pestañas
│   │   │   ├── GameDetailModal.vue       # Modal con sinopsis, géneros, plataformas y notas de IGDB
│   │   │   └── SearchModal.vue           # Modal flotante (Ctrl+K) con búsqueda en tiempo real
│   │   └── roulette/
│   │       ├── RouletteModeSelector.vue  # Selector de los 3 estilos de ruleta
│   │       ├── ClassicWheel.vue          # Modo 1: Rueda circular de feria con puntero
│   │       ├── VerticalSlotReel.vue      # Modo 2: Rodillo vertical tipo slot gamer de títulos/carátulas
│   │       ├── InstantPicker.vue         # Modo 3: Selección relámpago ultra-rápida (< 1s)
│   │       ├── RouletteFilters.vue       # Filtros por estado, género o plataforma
│   │       └── WinnerModal.vue           # Modal de victoria con carátula grande y botón "Jugar Ahora"
│   ├── composables/
│   │   ├── useTheme.ts                   # Lógica reactiva para conmutar temas y persistir en localStorage
│   │   ├── useDragAndDrop.ts             # Coordinación de Drag & Drop y deslizamiento en los bordes (Slide-on-Edge)
│   │   ├── useDebounce.ts                # Debounce para la búsqueda
│   │   └── useRoulette.ts                # Lógica matemática de selección aleatoria y física de frenado
│   ├── stores/
│   │   ├── gamesStore.ts                 # Estado global del catálogo, filtros y persistencia
│   │   └── uiStore.ts                    # Estado de modales y configuración de ruleta preferida
│   ├── types/
│   │   ├── game.ts                       # Interfaces: Game, UserGame, GameStatus
│   │   └── theme.ts                      # Tipos para las 4 paletas y modos de ruleta
│   ├── views/
│   │   ├── CatalogView.vue               # Vista de catálogo con pestañas deslizantes y drag & drop
│   │   └── RouletteView.vue              # Vista inmersiva de selección aleatoria
│   ├── App.vue                           # Layout principal y montura de toasts/modales
│   └── main.ts                           # Entrypoint de Vue y Pinia
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## 5. Sistema de Diseño e Integración de las 4 Paletas (`palletes.css`)

Cada tema define sus propios tokens de color en `palletes.css`. Las clases semánticas mapean los fondos, superficies, acentos y textos al cambiar la clase activa en el elemento `<html>`:

```css
/* src/assets/styles/main.css */
@import "tailwindcss";
@import "./palletes.css";

/* Mapeo de tokens semánticos dinámicos según el tema activo */
:root {
  --app-bg: var(--color-pitch-black-950);
  --app-surface: var(--color-pitch-black-900);
  --app-surface-hover: var(--color-pitch-black-800);
  --app-primary: var(--color-vintage-berry-500);
  --app-primary-hover: var(--color-vintage-berry-600);
  --app-primary-rgb: 200, 45, 119;
  --app-text: var(--color-mint-cream-100);
  --app-text-muted: var(--color-mint-cream-400);
  --app-border: var(--color-pitch-black-700);
}

html.jungle-teal {
  --app-bg: var(--color-onyx-950);
  --app-surface: var(--color-onyx-900);
  --app-surface-hover: var(--color-onyx-800);
  --app-primary: var(--color-jungle-teal-500);
  --app-primary-hover: var(--color-jungle-teal-600);
  --app-text: var(--color-celadon-100);
  --app-text-muted: var(--color-celadon-400);
  --app-border: var(--color-onyx-700);
}

html.brick-ember {
  --app-bg: var(--color-dim-grey-950);
  --app-surface: var(--color-onyx-900);
  --app-surface-hover: var(--color-onyx-800);
  --app-primary: var(--color-brick-ember-500);
  --app-primary-hover: var(--color-brick-ember-600);
  --app-text: var(--color-ghost-white-100);
  --app-text-muted: var(--color-ash-grey-400);
  --app-border: var(--color-dim-grey-700);
}

html.vivid-royal {
  --app-bg: var(--color-space-indigo-950);
  --app-surface: var(--color-space-indigo-900);
  --app-surface-hover: var(--color-space-indigo-800);
  --app-primary: var(--color-vivid-royal-500);
  --app-primary-hover: var(--color-vivid-royal-600);
  --app-text: var(--color-honeydew-100);
  --app-text-muted: var(--color-glaucous-400);
  --app-border: var(--color-space-indigo-700);
}
```

---

## 6. Experiencia de Catálogo: Drag & Drop y Transición Deslizante (Slide-on-Edge)

### 6.1. Pestañas Deslizantes (Sliding Views)
- En lugar de mostrar un tablero denso en una sola pantalla, la biblioteca organiza los juegos en 4 vistas independientes con navegación por pestañas (`BACKLOG`, `PLAYING`, `COMPLETED`, `WISHLIST`).
- Al cambiar de pestaña (por clic o swipe), el contenido se desplaza con una **animación de deslizamiento horizontal rápida y suave** (`transform: translateX(...)` con `transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)`).

### 6.2. Mecánica de Drag & Drop con Detección de Bordes (Slide-on-Edge)
1. **Arrastre de Tarjeta (`GameCard.vue`):** El usuario toma una tarjeta (`draggable="true"`). Durante el arrastre, la tarjeta original reduce su opacidad al 40% y se genera una previsualización flotante translúcida.
2. **Deslizamiento al Borde (Slide-on-Edge):**
   - Si el usuario arrastra la tarjeta hacia el **borde derecho** de la pantalla (< 60px del margen), tras 300ms la vista se desliza automáticamente a la siguiente pestaña a la derecha.
   - Si se arrastra hacia el **borde izquierdo**, se desliza a la pestaña anterior.
3. **Drop Targets:**
   - El usuario puede soltar la tarjeta en la nueva grilla de la pestaña destino o directamente sobre el botón de la pestaña en la barra superior.
   - Al soltar, se ejecuta `gamesStore.updateGameStatus(gameId, targetStatus)` con actualización optimista inmediata y llamada asíncrona a `POST /api/games`.
4. **Accesibilidad Alternativa:** Cada tarjeta incluye un menú desplegable de 1 clic para cambiar de estado sin necesidad de arrastrar.

---

## 7. Los 3 Modos de Ruleta y Selección Aleatoria

El usuario puede elegir entre 3 estilos de selección interactiva desde la vista de ruleta:

```
Ruleta de Selección (RouletteView.vue)
 ├── Modo 1: ClassicWheel.vue        --> Rueda circular clásica de feria con puntero
 ├── Modo 2: VerticalSlotReel.vue    --> Rodillo vertical de títulos/carátulas
 └── Modo 3: InstantPicker.vue       --> Selección relámpago instantánea (< 1s)
```

### 7.1. Modo 1: "Wheel of Fortune" (Rueda Circular Clásica)
- Renderizada en `<canvas>` o SVG con sectores proporcionales a los juegos filtrados.
- Cada sector alterna entre los tonos primarios y de soporte de la paleta activa.
- Animación de rotación con física de desaceleración Bézier (`spinRotation = totalLaps * 360 + targetAngle`).
- Puntero superior con oscilación elástica en cada sector que cruza.

### 7.2. Modo 2: "Vertical Slot Reel" (Rodillo Vertical de Títulos y Carátulas)
- Diseño limpio y moderno: una columna vertical enmarcada con efecto de degradado en los extremos superior e inferior.
- Al pulsar *"Girar"*, la lista de juegos desfila a toda velocidad verticalmente hacia abajo con efecto de desenfoque de movimiento (*motion blur* sutil).
- Desacelera progresivamente hasta encajar perfectamente el juego ganador en el visor central.

### 7.3. Modo 3: "Instant Quick Pick" (Selección Relámpago)
- Para el jugador impaciente que quiere una decisión inmediata sin animaciones de 5 segundos.
- Al pulsar el botón, ocurre una animación ultra-rápida de barajado de 600 milisegundos con destello de partículas en el color primario del tema, revelando el juego ganador al instante.

### 7.4. Revelación del Ganador (`WinnerModal.vue`)
- Todos los modos culminan en un modal estético con la carátula en alta resolución del juego seleccionado, su puntuación, géneros, plataformas y sinopsis.
- Incluye dos acciones principales:
  - **"Empezar a Jugar Ahora":** Mueve el juego a estado `PLAYING` y cierra el modal.
  - **"Girar de Nuevo":** Vuelve a sortear inmediatamente.

---

## 8. Store Global de Pinia (`gamesStore.ts`)

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UserGame, GameStatus } from '../types/game';

export const useGamesStore = defineStore('games', () => {
  const games = ref<UserGame[]>([]);
  const activeTab = ref<GameStatus>('BACKLOG');
  const selectedGenre = ref<string | null>(null);
  const selectedPlatform = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const backlogGames = computed(() => games.value.filter(g => g.status === 'BACKLOG'));
  const playingGames = computed(() => games.value.filter(g => g.status === 'PLAYING'));
  const completedGames = computed(() => games.value.filter(g => g.status === 'COMPLETED'));
  const wishlistGames = computed(() => games.value.filter(g => g.status === 'WISHLIST'));

  const filteredCurrentTabGames = computed(() => {
    return games.value.filter(g => {
      const matchStatus = g.status === activeTab.value;
      const matchGenre = !selectedGenre.value || g.genres.includes(selectedGenre.value);
      const matchPlatform = !selectedPlatform.value || g.platforms.includes(selectedPlatform.value);
      return matchStatus && matchGenre && matchPlatform;
    });
  });

  // Actions
  async function fetchGames() {
    loading.value = true;
    try {
      const res = await fetch('http://localhost:3000/api/games');
      if (!res.ok) throw new Error('Error al cargar juegos');
      games.value = await res.json();
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function updateGameStatus(id: number, newStatus: GameStatus) {
    const game = games.value.find(g => g.id === id);
    if (!game) return;

    const previousStatus = game.status;
    game.status = newStatus; // Actualización optimista

    try {
      const res = await fetch('http://localhost:3000/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...game, status: newStatus }),
      });
      if (!res.ok) throw new Error('Error al guardar cambio');
    } catch (err) {
      game.status = previousStatus; // Revertir en fallo
      throw err;
    }
  }

  async function addGame(gameData: Partial<UserGame>, status: GameStatus = 'BACKLOG') {
    const optimistic: UserGame = {
      id: gameData.id!,
      title: gameData.title!,
      cover_url: gameData.cover_url || null,
      release_year: gameData.release_year || null,
      summary: gameData.summary || null,
      genres: gameData.genres || [],
      platforms: gameData.platforms || [],
      rating: gameData.rating || null,
      game_modes: gameData.game_modes || [],
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const idx = games.value.findIndex(g => g.id === optimistic.id);
    if (idx >= 0) {
      games.value[idx] = optimistic;
    } else {
      games.value.unshift(optimistic);
    }

    await fetch('http://localhost:3000/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...optimistic, status }),
    });
  }

  async function deleteGame(id: number) {
    games.value = games.value.filter(g => g.id !== id);
    await fetch(`http://localhost:3000/api/games/${id}`, { method: 'DELETE' });
  }

  return {
    games,
    activeTab,
    selectedGenre,
    selectedPlatform,
    loading,
    error,
    backlogGames,
    playingGames,
    completedGames,
    wishlistGames,
    filteredCurrentTabGames,
    fetchGames,
    updateGameStatus,
    addGame,
    deleteGame,
  };
});
```

---

## 9. Boundaries (Límites y Reglas)

- **Siempre:**
  - Garantizar 60 FPS en las animaciones de deslizamiento entre pestañas y giros de ruleta.
  - Proveer feedback visual claro durante el Drag & Drop (indicador de borde activo y zona de soltado).
  - Mantener botones convencionales para usuarios que no utilicen mouse o prefieran clics directos.
  - Soportar las 4 paletas en todos los componentes y animaciones.
- **Nunca:**
  - Bloquear el hilo principal de JavaScript durante las animaciones de la ruleta.
  - Recargar la página para cambiar de pestaña o de tema visual.

---

## 10. Criterios de Éxito del Frontend

- [ ] Las 4 pestañas de estado se deslizan suavemente con animación lateral fluida.
- [ ] Arrastrar una tarjeta hacia el borde izquierdo o derecho desliza la vista a la siguiente pestaña y permite cambiar de estado al soltarla.
- [ ] Los 3 modos de ruleta (Rueda de Feria, Rodillo Vertical y Selección Relámpago) funcionan correctamente y revelan el juego ganador.
- [ ] El selector de temas alterna en tiempo real entre `vintage-berry`, `jungle-teal`, `brick-ember` y `vivid-royal` sin parpadeos.
- [ ] El modal de búsqueda (Ctrl+K) busca en la base de datos y agrega juegos a la biblioteca en 1 clic.

# Lista de Tareas: Frontend (NEXT.g Web App & PWA)

Estado: **Completado y Verificado**  
Referencia: [`docs/tasks/frontend-plan.md`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/docs/tasks/frontend-plan.md) • [`docs/spec-frontend.md`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/docs/spec-frontend.md)

---

## Fase 1: Inicialización, Tailwind v4 y Sistema de 4 Paletas

- [x] **Tarea 1.1: Inicialización del Proyecto Frontend (Vite + Vue 3 + Tailwind v4 + Pinia)**
  - **Aceptación:** Proyecto en raíz configurado con Vue 3, Vite, Tailwind CSS v4, Pinia y `lucide-vue-next`.
  - **Verificación:** `bun run dev` y proxy a Elysia `/api` funcionando.
  - **Archivos:** [`package.json`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/package.json), [`vite.config.ts`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/vite.config.ts), [`src/main.ts`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/main.ts)

- [x] **Tarea 1.2: Integración de `palletes.css` y `useTheme.ts`**
  - **Aceptación:** Las 4 paletas (`vintage-berry`, `jungle-teal`, `brick-ember`, `vivid-royal`) integradas con variables semánticas en `main.css`, selector interactivo en navbar y persistencia en `localStorage`.
  - **Verificación:** Cambiar de tema en la UI alterna colores de fondo y acento inmediatamente.
  - **Archivos:** [`src/assets/styles/main.css`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/assets/styles/main.css), [`src/assets/styles/palletes.css`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/assets/styles/palletes.css), [`src/composables/useTheme.ts`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/composables/useTheme.ts), [`src/components/common/ThemeSelector.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/components/common/ThemeSelector.vue)

- [x] **Tarea 1.3: Layout Base y Barra de Navegación (`Navbar.vue`)**
  - **Aceptación:** Navbar con logo, atajo a buscador (`Ctrl+K`), botón de temas y toggle entre vista de Catálogo y vista de Ruleta.
  - **Verificación:** Navegación fluida entre vistas sin recarga.
  - **Archivos:** [`src/components/common/Navbar.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/components/common/Navbar.vue), [`src/App.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/App.vue)

- [x] **🛡️ Checkpoint 1: Base UI y Theming Funcionando**

---

## Fase 2: Catálogo con Pestañas Deslizantes y Drag & Drop

- [x] **Tarea 2.1: Store de Pinia (`gamesStore.ts`)**
  - **Aceptación:** Store conectada al backend (`/api/games`), carga inicial de los 50 juegos y métodos de actualización optimista.
  - **Verificación:** Los 50 juegos se cargan en el estado reactivo de Pinia.
  - **Archivos:** [`src/stores/gamesStore.ts`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/stores/gamesStore.ts), [`src/types/game.ts`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/types/game.ts)

- [x] **Tarea 2.2: Tarjeta de Videojuego (`GameCard.vue`)**
  - **Aceptación:** Portadas HD en ratio vertical, badges de nota/estado, menú de acciones y soporte para arrastrar (`draggable="true"`).
  - **Verificación:** Grilla renderiza las tarjetas estéticamente en los 4 temas.
  - **Archivos:** [`src/components/catalog/GameCard.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/components/catalog/GameCard.vue)

- [x] **Tarea 2.3: Pestañas Deslizantes (`StatusTabs.vue` & `SlidingContainer.vue`)**
  - **Aceptación:** Navegación entre las 4 categorías con animación suave de desplazamiento horizontal (slide).
  - **Verificación:** Cambiar entre BACKLOG, JUGANDO, etc., desliza la grilla fluidamente.
  - **Archivos:** [`src/components/catalog/StatusTabs.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/components/catalog/StatusTabs.vue), [`src/components/catalog/SlidingContainer.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/components/catalog/SlidingContainer.vue)

- [x] **Tarea 2.4: Drag & Drop con Detección de Bordes (Slide-on-Edge)**
  - **Aceptación:** Arrastrar una tarjeta hacia los bordes izquierdo/derecho desliza la pantalla a la siguiente pestaña y permite soltar para cambiar de estado.
  - **Verificación:** Mover un juego de Backlog a Jugando arrastrándolo al borde actualiza su estado en SQLite.
  - **Archivos:** [`src/composables/useDragAndDrop.ts`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/composables/useDragAndDrop.ts)

- [x] **Tarea 2.5: Modal de Búsqueda IGDB (`SearchModal.vue`)**
  - **Aceptación:** Modal flotante (`Ctrl+K`) con buscador con debounce de 350ms, skeleton loaders y botón para agregar a cualquier estado en 1 clic.
  - **Verificación:** Búsqueda retorna resultados inmediatos del backend y agrega a la biblioteca.
  - **Archivos:** [`src/components/catalog/SearchModal.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/components/catalog/SearchModal.vue)

- [x] **🛡️ Checkpoint 2: Catálogo Completo y Drag & Drop Verificado**

---

## Fase 3: Los 3 Modos de Ruleta y Sorteo Interactivo

- [x] **Tarea 3.1: Vista Principal y Selector de Modos (`RouletteView.vue`)**
  - **Aceptación:** Interfaz inmersiva con selector entre los 3 estilos de ruleta y filtros por categoría, género o plataforma.
  - **Archivos:** [`src/views/RouletteView.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/views/RouletteView.vue), [`src/components/roulette/RouletteModeSelector.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/components/roulette/RouletteModeSelector.vue)

- [x] **Tarea 3.2: Modo 1 - Rueda de Feria Circular (`ClassicWheel.vue`)**
  - **Aceptación:** Rueda circular dividida en sectores con los colores del tema activo, puntero superior y física de desaceleración.
  - **Archivos:** [`src/components/roulette/ClassicWheel.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/components/roulette/ClassicWheel.vue)

- [x] **Tarea 3.3: Modo 2 - Rodillo Vertical Gamer (`VerticalSlotReel.vue`)**
  - **Aceptación:** Rodillo vertical donde los títulos y carátulas desfilan a alta velocidad y frenan en el juego ganador.
  - **Archivos:** [`src/components/roulette/VerticalSlotReel.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/components/roulette/VerticalSlotReel.vue)

- [x] **Tarea 3.4: Modo 3 - Selección Relámpago (`InstantPicker.vue`)**
  - **Aceptación:** Barajado ultra-rápido en < 1s con animación de partículas para decisión inmediata.
  - **Archivos:** [`src/components/roulette/InstantPicker.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/components/roulette/InstantPicker.vue)

- [x] **Tarea 3.5: Modal de Ganador (`WinnerModal.vue`)**
  - **Aceptación:** Modal de victoria con carátula grande, sinopsis, nota y botón *"Empezar a Jugar Ahora"*.
  - **Archivos:** [`src/components/roulette/WinnerModal.vue`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/src/components/roulette/WinnerModal.vue)

- [x] **🛡️ Checkpoint 3: Ruleta con 3 Modos Funcionando**

---

## Fase 4: Verificación Final y Build de Producción

- [x] **Tarea 4.1: Verificación de Tipos y Build de Producción**
  - **Aceptación:** `bunx vue-tsc --noEmit` y `bun run build` completan sin advertencias ni errores.
  - **Verificación:** `dist/` generado con éxito (0 errores).

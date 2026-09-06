# Plan de Implementación: Frontend (NEXT.g Web App & PWA)

## 1. Visión General
Este documento detalla la construcción del Frontend de **NEXT.g** según la especificación técnica en [`docs/spec-frontend.md`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/docs/spec-frontend.md). El objetivo es crear una SPA / PWA de escritorio en **Vue 3 + Vite + Tailwind CSS v4 + Pinia**, con navegación deslizante fluida, Drag & Drop con cambio de pestañas al borde (Slide-on-Edge), 3 modos de ruleta interactiva y las 4 paletas de color de `palletes.css`.

---

## 2. Grafo de Dependencias del Frontend

```
[ Setup Vite + Vue 3 + Tailwind v4 ]
                 │
                 ▼
[ Sistema de 4 Paletas (palletes.css & useTheme.ts) ]
                 │
                 ▼
[ Pinia Store (gamesStore.ts) + Conexión Backend ]
                 │
        ┌────────┴────────┐
        ▼                 ▼
[ Componentes Catálogo ]  [ Motor de Ruleta (3 Modos) ]
  ├── StatusTabs            ├── ClassicWheel (Feria)
  ├── SlidingContainer      ├── VerticalSlotReel (Rodillo)
  ├── GameCard (Drag)       ├── InstantPicker (Relámpago)
  └── Slide-on-Edge D&D     └── WinnerModal
        │                 │
        └────────┬────────┘
                 ▼
     [ Buscador Modal & PWA ]
```

---

## 3. Desglose de Fases y Tareas

### Fase 1: Inicialización, Tailwind v4 y Sistema de 4 Paletas
- **Tarea 1.1: Inicialización del Proyecto Frontend:** Crear `frontend/` con Vite, Vue 3, TypeScript, Tailwind CSS v4, Lucide Icons y Pinia.
- **Tarea 1.2: Integración de `palletes.css` y `useTheme.ts`:** Mapear los tokens semánticos en `main.css`, crear el composable `useTheme.ts` y el componente `ThemeSelector.vue` con persistencia en `localStorage`.
- **Tarea 1.3: Layout Base y Barra de Navegación (`Navbar.vue`):** Barra superior con logo, buscador (Ctrl+K), selector de temas y navegación entre Catálogo y Ruleta.

### Fase 2: Catálogo, Pestañas Deslizantes y Drag & Drop
- **Tarea 2.1: Store de Pinia (`gamesStore.ts`):** Estado global para sincronizar con la API (`GET /api/games`, `POST /api/games`, `DELETE /api/games/:id`).
- **Tarea 2.2: Tarjeta de Videojuego (`GameCard.vue`):** Portada vertical, badges de nota/estado, menú de acciones y estados de arrastre (`draggable="true"`).
- **Tarea 2.3: Pestañas Deslizantes (`StatusTabs.vue` & `SlidingContainer.vue`):** Navegación fluida entre las 4 categorías con transición lateral horizontal por hardware.
- **Tarea 2.4: Drag & Drop con Detección de Bordes (`useDragAndDrop.ts`):** Permitir mover juegos entre categorías al arrastrarlos hacia el borde izquierdo/derecho o soltarlos en las pestañas.
- **Tarea 2.5: Modal de Búsqueda IGDB (`SearchModal.vue`):** Atajo `Ctrl+K`, input con debounce de 350ms, skeleton loaders y agregar en 1 clic.

### Fase 3: Los 3 Modos de Ruleta y Sorteo Interactivo
- **Tarea 3.1: Vista y Selector de Modos (`RouletteView.vue`):** Filtros rápidos por estado (Backlog, etc.), género o plataforma, y selector de estilo.
- **Tarea 3.2: Modo 1 - Rueda de Feria Circular (`ClassicWheel.vue`):** Rueda con sectores proporcionales, colores de la paleta activa y física de desaceleración.
- **Tarea 3.3: Modo 2 - Rodillo Vertical Gamer (`VerticalSlotReel.vue`):** Rodillo vertical donde los títulos y carátulas desfilan a alta velocidad y frenan en el centro.
- **Tarea 3.4: Modo 3 - Selección Relámpago (`InstantPicker.vue`):** Barajado instantáneo (< 1s) con destello de partículas para elección inmediata.
- **Tarea 3.5: Modal de Ganador (`WinnerModal.vue`):** Revelación del juego con carátula grande, detalles y botón directo *"Empezar a Jugar Ahora"*.

### Fase 4: PWA y Verificación
- **Tarea 4.1: Configuración de PWA de Escritorio:** `vite-plugin-pwa` con manifiesto y soporte standalone.
- **Tarea 4.2: Pruebas Unitarias y E2E:** Verificación de tipos con `vue-tsc` y tests de componentes.

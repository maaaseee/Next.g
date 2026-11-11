import { ref, computed } from 'vue';
import { useGamesStore } from '@/stores/gamesStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import type { GameStatus, UserGame } from '@/types/game';

/**
 * Unified category order across StatusTabs, SlidingContainer, and GameCard:
 * Completados <-> Jugando <-> Backlog <-> Deseados (Wishlist)
 */
export const STATUS_ORDER: GameStatus[] = ['COMPLETED', 'PLAYING', 'BACKLOG', 'WISHLIST'];

export const LATERAL_SLIDE_DELAY_MS = 520;
export const LATERAL_CHAIN_PAUSE_MS = 260;
const DRAG_DISTANCE_THRESHOLD_PX = 6;

// Singleton reactive state shared across GameCard, StatusTabs, and SlidingContainer
const draggedGame = ref<UserGame | null>(null);
const isDragging = ref(false);
const wasRecentlyDragged = ref(false);

// Live cursor coordinates & kinetic tilt for the floating dragged card
const pointerX = ref(0);
const pointerY = ref(0);
const dragTilt = ref(0);

// Hover & target states
const hoveredTab = ref<GameStatus | null>(null);
const hoveredPortalSide = ref<'LEFT' | 'RIGHT' | null>(null);
const lateralSlideProgress = ref(0);
const isOverCatalogCanvas = ref(false);

// Internal non-reactive tracking for pointer gesture & timers
let pendingGame: UserGame | null = null;
let startX = 0;
let startY = 0;
let lastX = 0;
let tabHoverTimer: ReturnType<typeof setTimeout> | null = null;
let portalRafId: number | null = null;
let portalStartTime = 0;
let portalCooldownUntil = 0;
let tiltDecayTimer: ReturnType<typeof setTimeout> | null = null;

export function useDragAndDrop() {
  const gamesStore = useGamesStore();

  const currentOrder = computed<GameStatus[]>(() => STATUS_ORDER);

  const currentTabIdx = computed(() => STATUS_ORDER.indexOf(gamesStore.activeTab));

  const previousTab = computed<GameStatus | null>(() => {
    const idx = currentTabIdx.value;
    return idx > 0 ? (STATUS_ORDER[idx - 1] ?? null) : null;
  });

  const nextTab = computed<GameStatus | null>(() => {
    const idx = currentTabIdx.value;
    return idx < STATUS_ORDER.length - 1 ? (STATUS_ORDER[idx + 1] ?? null) : null;
  });

  const hoveredLateralTab = computed<GameStatus | null>(() => {
    if (hoveredPortalSide.value === 'LEFT') return previousTab.value;
    if (hoveredPortalSide.value === 'RIGHT') return nextTab.value;
    return null;
  });

  /**
   * The effective target category if the user releases the pointer right now
   */
  const activeDropTarget = computed<GameStatus | null>(() => {
    if (!isDragging.value || !draggedGame.value) return null;
    if (hoveredTab.value) return hoveredTab.value;
    if (hoveredLateralTab.value) return hoveredLateralTab.value;
    if (isOverCatalogCanvas.value && gamesStore.activeTab !== draggedGame.value.status) {
      return gamesStore.activeTab;
    }
    return null;
  });

  function clearTabHoverTimer() {
    if (tabHoverTimer) {
      clearTimeout(tabHoverTimer);
      tabHoverTimer = null;
    }
  }

  function stopPortalLoop() {
    if (portalRafId !== null) {
      cancelAnimationFrame(portalRafId);
      portalRafId = null;
    }
    hoveredPortalSide.value = null;
    lateralSlideProgress.value = 0;
    portalStartTime = 0;
    portalCooldownUntil = 0;
  }

  function startPortalLoop(side: 'LEFT' | 'RIGHT') {
    if (hoveredPortalSide.value === side && portalRafId !== null) return;
    stopPortalLoop();

    const target = side === 'LEFT' ? previousTab.value : nextTab.value;
    if (!target) return;

    hoveredPortalSide.value = side;
    portalStartTime = performance.now();
    portalCooldownUntil = 0;

    const tick = (now: number) => {
      if (!isDragging.value || hoveredPortalSide.value !== side) {
        stopPortalLoop();
        return;
      }

      const currentTarget = side === 'LEFT' ? previousTab.value : nextTab.value;
      if (!currentTarget) {
        stopPortalLoop();
        return;
      }

      // Wait briefly between chained category transitions so the slide animation settles
      if (portalCooldownUntil > 0) {
        if (now < portalCooldownUntil) {
          lateralSlideProgress.value = 0;
          portalRafId = requestAnimationFrame(tick);
          return;
        }
        portalCooldownUntil = 0;
        portalStartTime = now;
      }

      const elapsed = now - portalStartTime;
      const pct = Math.min(100, Math.round((elapsed / LATERAL_SLIDE_DELAY_MS) * 100));
      lateralSlideProgress.value = pct;

      if (elapsed >= LATERAL_SLIDE_DELAY_MS) {
        // Transition view to the adjacent category!
        gamesStore.activeTab = currentTarget;
        lateralSlideProgress.value = 0;

        // Check if there is another category in the same direction to allow continuous traversal
        const nextInDirection = side === 'LEFT' ? previousTab.value : nextTab.value;
        if (nextInDirection) {
          portalCooldownUntil = now + LATERAL_CHAIN_PAUSE_MS;
          portalRafId = requestAnimationFrame(tick);
        } else {
          stopPortalLoop();
        }
        return;
      }

      portalRafId = requestAnimationFrame(tick);
    };

    portalRafId = requestAnimationFrame(tick);
  }

  function updateHitTargets(clientX: number, clientY: number) {
    const hitEl = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!hitEl) {
      hoveredTab.value = null;
      isOverCatalogCanvas.value = false;
      clearTabHoverTimer();
      stopPortalLoop();
      return;
    }

    // 1. Check if pointer is over a top category tab button
    const tabEl = hitEl.closest('[data-drop-tab]') as HTMLElement | null;
    if (tabEl) {
      const tabStatus = tabEl.dataset.dropTab as GameStatus | undefined;
      stopPortalLoop();
      isOverCatalogCanvas.value = false;

      if (tabStatus && hoveredTab.value !== tabStatus) {
        hoveredTab.value = tabStatus;
        clearTabHoverTimer();
        tabHoverTimer = setTimeout(() => {
          if (isDragging.value && gamesStore.activeTab !== tabStatus) {
            gamesStore.activeTab = tabStatus;
          }
        }, 420);
      }
      return;
    }

    if (hoveredTab.value !== null) {
      hoveredTab.value = null;
      clearTabHoverTimer();
    }

    // 2. Check if pointer is over a lateral edge portal
    const portalEl = hitEl.closest('[data-drop-portal]') as HTMLElement | null;
    if (portalEl) {
      const side = portalEl.dataset.dropPortal as 'LEFT' | 'RIGHT' | undefined;
      isOverCatalogCanvas.value = true;
      if (side === 'LEFT' || side === 'RIGHT') {
        startPortalLoop(side);
        return;
      }
    }

    stopPortalLoop();

    // 3. Check if pointer is inside the catalog viewport canvas
    const canvasEl = hitEl.closest('[data-drop-canvas]') as HTMLElement | null;
    isOverCatalogCanvas.value = Boolean(canvasEl);
  }

  function onWindowPointerMove(e: PointerEvent) {
    if (!pendingGame && !isDragging.value) return;

    if (!isDragging.value && pendingGame) {
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist < DRAG_DISTANCE_THRESHOLD_PX) return;

      // Activate custom drag mode
      draggedGame.value = pendingGame;
      isDragging.value = true;
      wasRecentlyDragged.value = true;
      pointerX.value = e.clientX;
      pointerY.value = e.clientY;
      lastX = e.clientX;

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }

    if (isDragging.value) {
      if (e.cancelable) e.preventDefault();

      const vx = e.clientX - lastX;
      lastX = e.clientX;
      dragTilt.value = Math.max(-12, Math.min(12, vx * 0.6));

      if (tiltDecayTimer) clearTimeout(tiltDecayTimer);
      tiltDecayTimer = setTimeout(() => {
        dragTilt.value = 0;
      }, 90);

      pointerX.value = e.clientX;
      pointerY.value = e.clientY;

      updateHitTargets(e.clientX, e.clientY);
    }
  }

  function cleanupWindowListeners() {
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('pointercancel', onWindowPointerCancel);
    window.removeEventListener('keydown', onWindowKeyDown);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }

  function finishDragState() {
    isDragging.value = false;
    draggedGame.value = null;
    pendingGame = null;
    hoveredTab.value = null;
    isOverCatalogCanvas.value = false;
    dragTilt.value = 0;
    clearTabHoverTimer();
    stopPortalLoop();
    cleanupWindowListeners();

    setTimeout(() => {
      wasRecentlyDragged.value = false;
    }, 80);
  }

  function onWindowPointerUp(e: PointerEvent) {
    if (isDragging.value && draggedGame.value) {
      updateHitTargets(e.clientX, e.clientY);
      const target = activeDropTarget.value;
      const gameId = draggedGame.value.id;
      const originStatus = draggedGame.value.status;

      finishDragState();

      if (target && target !== originStatus) {
        gamesStore.updateGameStatus(gameId, target);
      }
      return;
    }

    finishDragState();
  }

  function onWindowPointerCancel() {
    finishDragState();
  }

  function onWindowKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isDragging.value) {
      finishDragState();
    }
  }

  /**
   * Entry point called on `@pointerdown` from GameCard.vue
   */
  function startPointerDrag(game: UserGame, e: PointerEvent) {
    // Check if user has disabled Drag & Drop in user preferences
    const preferencesStore = usePreferencesStore();
    if (!preferencesStore.enableDragAndDrop) {
      return;
    }

    // Only primary mouse click / touch
    if (e.button !== 0) return;

    // Ignore clicks on interactive action buttons inside the card
    const targetEl = e.target as HTMLElement | null;
    if (targetEl?.closest('button') || targetEl?.closest('a')) return;

    pendingGame = game;
    startX = e.clientX;
    startY = e.clientY;
    lastX = e.clientX;

    window.addEventListener('pointermove', onWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerCancel);
    window.addEventListener('keydown', onWindowKeyDown);
  }

  return {
    draggedGame,
    isDragging,
    wasRecentlyDragged,
    pointerX,
    pointerY,
    dragTilt,
    currentOrder,
    previousTab,
    nextTab,
    hoveredTab,
    hoveredPortalSide,
    hoveredLateralTab,
    lateralSlideProgress,
    activeDropTarget,
    startPointerDrag,
    cancelDrag: finishDragState,
  };
}

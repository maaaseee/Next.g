import { ref, computed } from 'vue';
import { useGamesStore } from '@/stores/gamesStore';
import type { GameStatus, UserGame } from '@/types/game';

const draggedGame = ref<UserGame | null>(null);
const isDragging = ref(false);

let hoverSlideTimer: ReturnType<typeof setTimeout> | null = null;

export const STATUS_ORDER: GameStatus[] = ['BACKLOG', 'COMPLETED', 'PLAYING', 'WISHLIST'];

export function useDragAndDrop() {
  const gamesStore = useGamesStore();

  const currentTabIdx = computed(() => STATUS_ORDER.indexOf(gamesStore.activeTab));

  const previousTab = computed<GameStatus | null>(() => {
    const idx = currentTabIdx.value;
    return idx > 0 ? (STATUS_ORDER[idx - 1] ?? null) : null;
  });

  const nextTab = computed<GameStatus | null>(() => {
    const idx = currentTabIdx.value;
    return idx < STATUS_ORDER.length - 1 ? (STATUS_ORDER[idx + 1] ?? null) : null;
  });

  function onDragStart(game: UserGame, e: DragEvent) {
    draggedGame.value = game;
    isDragging.value = true;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(game.id));
    }
  }

  function onDragEnd() {
    isDragging.value = false;
    draggedGame.value = null;
    if (hoverSlideTimer) {
      clearTimeout(hoverSlideTimer);
      hoverSlideTimer = null;
    }
  }

  function onLateralDragEnter(_targetStatus: GameStatus) {
    if (hoverSlideTimer) {
      clearTimeout(hoverSlideTimer);
      hoverSlideTimer = null;
    }
  }

  function onLateralDragLeave() {
    if (hoverSlideTimer) {
      clearTimeout(hoverSlideTimer);
      hoverSlideTimer = null;
    }
  }

  function handleDropOnTab(targetStatus: GameStatus) {
    if (!draggedGame.value) return;

    const gameId = draggedGame.value.id;
    const currentStatus = draggedGame.value.status;

    // Cleanly finish drag state
    onDragEnd();

    if (currentStatus !== targetStatus) {
      // Update game status without changing the currently active tab
      gamesStore.updateGameStatus(gameId, targetStatus);
    }
  }

  return {
    draggedGame,
    isDragging,
    previousTab,
    nextTab,
    onDragStart,
    onDragEnd,
    onLateralDragEnter,
    onLateralDragLeave,
    handleDropOnTab,
  };
}

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { RouterLink } from 'vue-router';
import { useGamesStore } from '@/stores/gamesStore';
import { useDragAndDrop } from '@/composables/useDragAndDrop';
import GameCard from './GameCard.vue';
import type { UserGame, GameStatus } from '@/types/game';
import { GAME_STATUS_CONFIG } from '@/types/game';
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  Clock,
  Play,
  CheckCircle2,
  Sparkles,
  Loader2,
  ArrowDownToLine,
  MoveRight,
} from 'lucide-vue-next';

defineEmits<{
  (e: 'select-game', game: UserGame): void;
}>();

const gamesStore = useGamesStore();
const sentinelRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;
let batchTimeout: ReturnType<typeof setTimeout> | null = null;

const BATCH_SIZE = 24;
const visibleCounts = ref<Record<GameStatus, number>>({
  COMPLETED: BATCH_SIZE,
  PLAYING: BATCH_SIZE,
  BACKLOG: BATCH_SIZE,
  WISHLIST: BATCH_SIZE,
});
const isLoadingBatch = ref(false);

function getGamesForTab(tab: GameStatus): UserGame[] {
  switch (tab) {
    case 'BACKLOG':
      return gamesStore.backlogGames;
    case 'COMPLETED':
      return gamesStore.completedGames;
    case 'PLAYING':
      return gamesStore.playingGames;
    case 'WISHLIST':
      return gamesStore.wishlistGames;
  }
}

function getVisibleGamesForTab(tab: GameStatus): UserGame[] {
  const allTabGames = getGamesForTab(tab);
  // Keep inactive off-screen tabs capped at 12 cards so a 100+ game tab doesn't stretch the page height of other tabs
  if (tab !== gamesStore.activeTab) {
    return allTabGames.slice(0, 12);
  }
  return allTabGames.slice(0, visibleCounts.value[tab]);
}

const activeTabTotalCount = computed(() => getGamesForTab(gamesStore.activeTab).length);
const activeTabVisibleCount = computed(() =>
  Math.min(visibleCounts.value[gamesStore.activeTab], activeTabTotalCount.value)
);

const hasMoreInActiveTab = computed(() => {
  return (
    visibleCounts.value[gamesStore.activeTab] < activeTabTotalCount.value ||
    gamesStore.hasMore
  );
});

const skeletonCount = computed(() => {
  const remaining = activeTabTotalCount.value - activeTabVisibleCount.value;
  if (remaining > 0) {
    return Math.min(BATCH_SIZE, remaining);
  }
  return gamesStore.hasMore ? BATCH_SIZE : 0;
});

async function loadNextBatch() {
  if (
    isLoadingBatch.value ||
    gamesStore.loading ||
    gamesStore.loadingMore ||
    !hasMoreInActiveTab.value
  ) {
    return;
  }

  const currentTab = gamesStore.activeTab;
  isLoadingBatch.value = true;

  await new Promise<void>((resolve) => {
    batchTimeout = setTimeout(resolve, 450);
  });

  visibleCounts.value[currentTab] += BATCH_SIZE;

  if (
    gamesStore.hasMore &&
    visibleCounts.value[currentTab] >= getGamesForTab(currentTab).length
  ) {
    await gamesStore.loadMoreGames();
  }

  isLoadingBatch.value = false;

  await nextTick();
  if (observer && sentinelRef.value && hasMoreInActiveTab.value) {
    observer.unobserve(sentinelRef.value);
    observer.observe(sentinelRef.value);
  }
}

function setupObserver() {
  if (typeof IntersectionObserver === 'undefined') return;
  if (observer) {
    observer.disconnect();
  }
  observer = new IntersectionObserver(
    (entries) => {
      const first = entries[0];
      if (first?.isIntersecting) {
        loadNextBatch();
      }
    },
    { rootMargin: '450px' }
  );

  if (sentinelRef.value) {
    observer.observe(sentinelRef.value);
  }
}

onMounted(() => {
  setupObserver();
});

watch(sentinelRef, (newEl) => {
  if (observer) {
    observer.disconnect();
    if (newEl) {
      observer.observe(newEl);
    }
  }
});

watch(
  () => gamesStore.activeTab,
  async () => {
    await nextTick();
    if (observer && sentinelRef.value) {
      observer.disconnect();
      observer.observe(sentinelRef.value);
    }
  }
);

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }
});

const {
  draggedGame,
  isDragging,
  pointerX,
  pointerY,
  dragTilt,
  currentOrder,
  previousTab,
  nextTab,
  hoveredPortalSide,
  lateralSlideProgress,
  activeDropTarget,
} = useDragAndDrop();

const currentTabIndex = computed(() => {
  return currentOrder.value.indexOf(gamesStore.activeTab);
});

const translateOffset = computed(() => {
  return `-${currentTabIndex.value * 25}%`;
});

const isCanvasDropReady = computed(() => {
  return (
    isDragging.value &&
    draggedGame.value !== null &&
    gamesStore.activeTab !== draggedGame.value.status &&
    !hoveredPortalSide.value
  );
});

function getIconForStatus(status: GameStatus) {
  switch (status) {
    case 'BACKLOG':
      return Clock;
    case 'COMPLETED':
      return CheckCircle2;
    case 'PLAYING':
      return Play;
    case 'WISHLIST':
      return Sparkles;
  }
}
</script>

<template>
  <!-- Outer Wrapper (Allows Lateral Portals to sit OUTSIDE the games container without clipping) -->
  <div class="relative w-full flex-1 flex flex-col min-h-145">
    <!-- Left Lateral Portal (Positioned OUTSIDE the games container to the left) -->
    <Transition name="fade">
      <div
        v-if="isDragging && previousTab"
        data-drop-portal="LEFT"
        class="absolute right-full mr-2 sm:mr-3 lg:mr-4 top-0 bottom-0 z-30 w-15 sm:w-24 lg:w-28 2xl:w-36 flex flex-col items-center justify-center p-2 sm:p-3 text-center transition-all duration-200 rounded-[4px] border-2 select-none overflow-hidden"
        :style="{
          backgroundColor:
            hoveredPortalSide === 'LEFT' ? 'var(--app-surface-hover)' : 'var(--app-surface)',
          borderColor:
            hoveredPortalSide === 'LEFT' ? 'var(--app-primary)' : 'var(--app-border)',
          color: 'var(--app-text)',
          boxShadow:
            hoveredPortalSide === 'LEFT'
              ? '0 0 32px var(--app-glow)'
              : '0 8px 24px rgba(0, 0, 0, 0.35)',
        }"
      >
        <!-- Top & Bottom Fill Progress Bars for Auto-Traverse -->
        <div
          v-if="hoveredPortalSide === 'LEFT'"
          class="pointer-events-none absolute bottom-0 left-0 h-1.5 transition-none"
          :style="{
            width: `${lateralSlideProgress}%`,
            backgroundColor: 'var(--app-primary)',
          }"
        />
        <div
          v-if="hoveredPortalSide === 'LEFT'"
          class="pointer-events-none absolute top-0 left-0 h-1 transition-none"
          :style="{
            width: `${lateralSlideProgress}%`,
            backgroundColor: 'var(--app-primary)',
          }"
        />

        <div
          class="pointer-events-none w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] flex items-center justify-center mb-2 shadow-md transition-transform text-white"
          :class="hoveredPortalSide === 'LEFT' ? 'scale-110' : 'scale-100'"
          :style="{
            backgroundColor:
              hoveredPortalSide === 'LEFT' ? 'var(--app-primary)' : 'var(--app-surface-active)',
          }"
        >
          <ChevronLeft class="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
        </div>

        <component
          :is="getIconForStatus(previousTab)"
          class="pointer-events-none w-4 h-4 mb-1"
          :style="{ color: GAME_STATUS_CONFIG[previousTab].color }"
        />

        <span
          class="pointer-events-none text-[10px] sm:text-xs font-black uppercase tracking-wider leading-tight"
          :style="{ color: 'var(--app-text)' }"
        >
          {{ GAME_STATUS_CONFIG[previousTab].label }}
        </span>

        <span
          class="pointer-events-none hidden sm:flex text-[10px] font-bold mt-1.5 items-center gap-1"
          :style="{
            color: hoveredPortalSide === 'LEFT' ? 'var(--app-primary-light)' : 'var(--app-text)',
          }"
        >
          <ArrowDownToLine class="w-3 h-3" />
          {{ hoveredPortalSide === 'LEFT' ? '¡Suelta ya!' : 'Soltar aquí' }}
        </span>
        <span
          class="pointer-events-none hidden sm:block text-[9px] font-medium mt-0.5 leading-tight"
          :style="{ color: 'var(--app-text-muted)' }"
        >
          {{
            hoveredPortalSide === 'LEFT'
              ? `Cambiando (${lateralSlideProgress}%)`
              : 'o mantén para ir'
          }}
        </span>
      </div>
    </Transition>

    <!-- Right Lateral Portal (Positioned OUTSIDE the games container to the right) -->
    <Transition name="fade">
      <div
        v-if="isDragging && nextTab"
        data-drop-portal="RIGHT"
        class="absolute left-full ml-2 sm:ml-3 lg:ml-4 top-0 bottom-0 z-30 w-15 sm:w-24 lg:w-28 2xl:w-36 flex flex-col items-center justify-center p-2 sm:p-3 text-center transition-all duration-200 rounded-[4px] border-2 select-none overflow-hidden"
        :style="{
          backgroundColor:
            hoveredPortalSide === 'RIGHT' ? 'var(--app-surface-hover)' : 'var(--app-surface)',
          borderColor:
            hoveredPortalSide === 'RIGHT' ? 'var(--app-primary)' : 'var(--app-border)',
          color: 'var(--app-text)',
          boxShadow:
            hoveredPortalSide === 'RIGHT'
              ? '0 0 32px var(--app-glow)'
              : '0 8px 24px rgba(0, 0, 0, 0.35)',
        }"
      >
        <!-- Top & Bottom Fill Progress Bars for Auto-Traverse -->
        <div
          v-if="hoveredPortalSide === 'RIGHT'"
          class="pointer-events-none absolute bottom-0 right-0 h-1.5 transition-none"
          :style="{
            width: `${lateralSlideProgress}%`,
            backgroundColor: 'var(--app-primary)',
          }"
        />
        <div
          v-if="hoveredPortalSide === 'RIGHT'"
          class="pointer-events-none absolute top-0 right-0 h-1 transition-none"
          :style="{
            width: `${lateralSlideProgress}%`,
            backgroundColor: 'var(--app-primary)',
          }"
        />

        <div
          class="pointer-events-none w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] flex items-center justify-center mb-2 shadow-md transition-transform text-white"
          :class="hoveredPortalSide === 'RIGHT' ? 'scale-110' : 'scale-100'"
          :style="{
            backgroundColor:
              hoveredPortalSide === 'RIGHT' ? 'var(--app-primary)' : 'var(--app-surface-active)',
          }"
        >
          <ChevronRight class="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
        </div>

        <component
          :is="getIconForStatus(nextTab)"
          class="pointer-events-none w-4 h-4 mb-1"
          :style="{ color: GAME_STATUS_CONFIG[nextTab].color }"
        />

        <span
          class="pointer-events-none text-[10px] sm:text-xs font-black uppercase tracking-wider leading-tight"
          :style="{ color: 'var(--app-text)' }"
        >
          {{ GAME_STATUS_CONFIG[nextTab].label }}
        </span>

        <span
          class="pointer-events-none hidden sm:flex text-[10px] font-bold mt-1.5 items-center gap-1"
          :style="{
            color: hoveredPortalSide === 'RIGHT' ? 'var(--app-primary-light)' : 'var(--app-text)',
          }"
        >
          <ArrowDownToLine class="w-3 h-3" />
          {{ hoveredPortalSide === 'RIGHT' ? '¡Suelta ya!' : 'Soltar aquí' }}
        </span>
        <span
          class="pointer-events-none hidden sm:block text-[9px] font-medium mt-0.5 leading-tight"
          :style="{ color: 'var(--app-text-muted)' }"
        >
          {{
            hoveredPortalSide === 'RIGHT'
              ? `Cambiando (${lateralSlideProgress}%)`
              : 'o mantén para ir'
          }}
        </span>
      </div>
    </Transition>

    <!-- Inner Clipped Viewport for the 400% Horizontal Sliding Track -->
    <div
      data-drop-canvas="true"
      class="relative w-full overflow-hidden flex-1 flex flex-col py-1 rounded-[4px] transition-all duration-200"
      :style="
        isCanvasDropReady
          ? {
              boxShadow: 'inset 0 0 0 2px var(--app-primary)',
              backgroundColor: 'var(--app-surface)',
            }
          : undefined
      "
    >
      <!-- Top Floating Banner when user has traversed to a new category during drag -->
      <Transition name="fade">
        <div
          v-if="isCanvasDropReady"
          class="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-[4px] border text-xs font-black uppercase tracking-wider shadow-2xl flex items-center gap-2"
          :style="{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-primary)',
            color: 'var(--app-text)',
            boxShadow: '0 0 24px var(--app-glow)',
          }"
        >
          <ArrowDownToLine
            class="w-3.5 h-3.5 animate-bounce"
            :style="{ color: 'var(--app-primary)' }"
          />
          <span>
            Suelta aquí para mover a {{ GAME_STATUS_CONFIG[gamesStore.activeTab].label }}
          </span>
        </div>
      </Transition>

      <!-- Horizontal Sliding Track (400% width) -->
      <div
        class="flex w-[400%] h-full flex-1 transition-transform duration-300 ease-out"
        :style="{ transform: `translateX(${translateOffset})` }"
      >
        <!-- Individual Tab Pages (25% width each) -->
        <div
          v-for="tab in currentOrder"
          :key="tab"
          class="w-1/4 h-full px-1 flex flex-col"
        >
          <!-- Games Grid -->
          <div v-if="getGamesForTab(tab).length > 0" class="flex-1 pr-1 pb-2">
            <div
              class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
            >
              <GameCard
                v-for="(game, idx) in getVisibleGamesForTab(tab)"
                :key="game.id"
                :game="game"
                :index="idx + 1"
                @click="$emit('select-game', game)"
              />

              <!-- Skeleton placeholders in-grid while next batch is loading -->
              <template v-if="tab === gamesStore.activeTab && (isLoadingBatch || gamesStore.loadingMore)">
                <div
                  v-for="skelIdx in skeletonCount"
                  :key="`skel-batch-${skelIdx}`"
                  class="rounded-[4px] border overflow-hidden p-3 flex flex-col justify-between select-none animate-pulse"
                  :style="{
                    aspectRatio: '3 / 4.2',
                    backgroundColor: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                  }"
                >
                  <!-- Top pill placeholders -->
                  <div class="flex items-center justify-between">
                    <div
                      class="h-3.5 w-10 rounded-[3px]"
                      :style="{ backgroundColor: 'var(--app-surface-hover)' }"
                    />
                    <div
                      class="h-3.5 w-14 rounded-[3px]"
                      :style="{ backgroundColor: 'var(--app-surface-hover)' }"
                    />
                  </div>

                  <!-- Center placeholder -->
                  <div class="my-auto flex flex-col items-center gap-2">
                    <div
                      class="w-12 h-12 rounded-[4px] flex items-center justify-center"
                      :style="{ backgroundColor: 'var(--app-surface-hover)' }"
                    >
                      <div
                        class="w-5 h-5 rounded-full opacity-40 border-2 border-t-transparent animate-spin"
                        :style="{ borderColor: 'var(--app-primary)' }"
                      />
                    </div>
                    <div
                      class="h-3 w-20 rounded-[3px]"
                      :style="{ backgroundColor: 'var(--app-surface-hover)' }"
                    />
                  </div>

                  <!-- Bottom details placeholder -->
                  <div class="flex items-center justify-between pt-2">
                    <div
                      class="h-2.5 w-8 rounded-[3px]"
                      :style="{ backgroundColor: 'var(--app-surface-hover)' }"
                    />
                    <div
                      class="h-2.5 w-12 rounded-[3px]"
                      :style="{ backgroundColor: 'var(--app-surface-hover)' }"
                    />
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Skeleton Grid while loading initial category -->
          <div v-else-if="gamesStore.loading" class="flex-1 overflow-hidden pr-1 pb-2">
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              <div
                v-for="i in 12"
                :key="`card-skel-${i}`"
                class="rounded-[4px] border animate-pulse"
                :style="{
                  aspectRatio: '3 / 4.2',
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }"
              />
            </div>
          </div>

          <!-- Empty State centered in full height -->
          <div
            v-else
            class="h-full flex-1 flex flex-col items-center justify-center p-8 text-center"
          >
            <div
              class="w-12 h-12 rounded-[4px] flex items-center justify-center mb-4"
              :style="{ backgroundColor: 'var(--app-surface)', color: GAME_STATUS_CONFIG[tab].color }"
            >
              <Inbox class="w-6 h-6" />
            </div>
            <h3 class="text-lg font-bold font-display" :style="{ color: 'var(--app-text)' }">
              No hay juegos en {{ GAME_STATUS_CONFIG[tab].label }}
            </h3>
            <p class="text-xs max-w-sm mt-1 mb-6" :style="{ color: 'var(--app-text-muted)' }">
              Arrastra un juego hacia aquí o busca nuevos títulos para agregarlos.
            </p>
            <RouterLink
              to="/search"
              class="px-4 py-2 rounded-[4px] text-xs font-bold text-white transition-transform hover:scale-105 cursor-pointer shadow-md inline-block"
              :style="{ backgroundColor: 'var(--app-primary)' }"
            >
              + Buscar y Agregar Juegos
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Per-Category Infinite Scroll Sentinel & Progressive Batch Indicator (Outside v-for) -->
      <div
        v-if="activeTabTotalCount > 0"
        ref="sentinelRef"
        class="w-full py-6 mt-4 flex flex-col items-center justify-center gap-2.5"
      >
        <template v-if="hasMoreInActiveTab">
          <div class="flex items-center gap-2">
            <Loader2
              class="w-4 h-4 animate-spin"
              :style="{ color: 'var(--app-primary)' }"
            />
            <span class="text-xs font-semibold" :style="{ color: 'var(--app-text-muted)' }">
              {{
                isLoadingBatch || gamesStore.loadingMore
                  ? 'Cargando lote de 24 juegos...'
                  : `Cargando automáticamente (${activeTabVisibleCount} de ${activeTabTotalCount} en ${GAME_STATUS_CONFIG[gamesStore.activeTab].label})...`
              }}
            </span>
          </div>

          <button
            type="button"
            @click="loadNextBatch"
            :disabled="isLoadingBatch || gamesStore.loadingMore"
            class="px-4 py-1.5 rounded-[4px] border text-xs font-bold flex items-center gap-2 transition-all hover:opacity-90 cursor-pointer disabled:opacity-60"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }"
          >
            <span>
              Cargar lote siguiente (+24)
            </span>
          </button>
        </template>
        <div
          v-else-if="activeTabTotalCount > 24"
          class="text-xs font-semibold py-2 px-4 rounded-[4px] border"
          :style="{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text-muted)',
          }"
        >
          ✓ Has visto los {{ activeTabTotalCount }} juegos de {{ GAME_STATUS_CONFIG[gamesStore.activeTab].label }}
        </div>
      </div>
    </div>

    <!-- Custom Hardware-Accelerated Floating Dragged Game Card Preview -->
    <Teleport to="body">
      <div
        v-if="isDragging && draggedGame"
        class="fixed top-0 left-0 z-9999 pointer-events-none select-none will-change-transform"
        :style="{
          transform: `translate3d(${pointerX - 68}px, ${pointerY - 92}px, 0) rotate(${dragTilt}deg)`,
        }"
      >
        <div
          class="w-34 sm:w-38 rounded-[4px] overflow-hidden border-2 shadow-2xl flex flex-col justify-end relative transition-colors duration-150"
          :style="{
            aspectRatio: '3 / 4.2',
            backgroundColor: 'var(--app-surface)',
            borderColor:
              activeDropTarget && activeDropTarget !== draggedGame.status
                ? 'var(--app-primary)'
                : 'var(--app-border)',
            boxShadow:
              activeDropTarget && activeDropTarget !== draggedGame.status
                ? '0 16px 40px -4px var(--app-glow)'
                : '0 20px 45px -10px rgba(0, 0, 0, 0.85)',
          }"
        >
          <img
            v-if="draggedGame.cover_url"
            :src="draggedGame.cover_url"
            :alt="draggedGame.title"
            class="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div
            v-else
            class="absolute inset-0 flex items-center justify-center p-2 text-center text-xs font-bold"
            :style="{
              backgroundColor: 'var(--app-surface-hover)',
              color: 'var(--app-text)',
            }"
          >
            {{ draggedGame.title }}
          </div>

          <div class="absolute inset-0 bg-linear-to-t from-black/95 via-black/40 to-transparent" />

          <div class="relative z-10 p-2 space-y-1">
            <p class="text-[11px] font-display font-extrabold text-white line-clamp-1 drop-shadow-xs">
              {{ draggedGame.title }}
            </p>

            <!-- Dynamic Target Badge -->
            <div
              v-if="activeDropTarget && activeDropTarget !== draggedGame.status"
              class="flex items-center justify-center gap-1 py-1 px-1.5 rounded-[3px] text-[10px] font-black uppercase tracking-wider text-white shadow-md"
              :style="{
                backgroundColor: 'var(--app-primary)',
              }"
            >
              <MoveRight class="w-3 h-3 shrink-0" />
              <span class="truncate">{{ GAME_STATUS_CONFIG[activeDropTarget].label }}</span>
            </div>
            <div
              v-else
              class="flex items-center justify-center gap-1 py-0.5 px-1.5 rounded-[3px] text-[9px] font-bold uppercase tracking-wider border"
              :style="{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text-muted)',
              }"
            >
              <span>{{ GAME_STATUS_CONFIG[draggedGame.status].label }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>

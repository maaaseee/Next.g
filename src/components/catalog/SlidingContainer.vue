<script setup lang="ts">
import { computed } from 'vue';
import { useGamesStore } from '@/stores/gamesStore';
import { useDragAndDrop } from '@/composables/useDragAndDrop';
import GameCard from './GameCard.vue';
import type { UserGame, GameStatus } from '@/types/game';
import { GAME_STATUS_CONFIG } from '@/types/game';
import { ChevronLeft, ChevronRight, Inbox, Clock, Play, CheckCircle2, Sparkles } from 'lucide-vue-next';

defineEmits<{
  (e: 'select-game', game: UserGame): void;
  (e: 'open-search'): void;
}>();

const gamesStore = useGamesStore();
const {
  isDragging,
  previousTab,
  nextTab,
  onLateralDragEnter,
  onLateralDragLeave,
  handleDropOnTab,
} = useDragAndDrop();

const TABS: GameStatus[] = ['BACKLOG', 'COMPLETED', 'PLAYING', 'WISHLIST'];

const currentTabIndex = computed(() => {
  return TABS.indexOf(gamesStore.activeTab);
});

const translateOffset = computed(() => {
  return `-${currentTabIndex.value * 25}%`;
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
</script>

<template>
  <div class="relative w-full overflow-hidden min-h-[60vh] py-2">
    <!-- Left Lateral Drop Zone (Previous Category) -->
    <Transition name="fade">
      <div
        v-if="isDragging && previousTab"
        @dragover.prevent
        @dragenter="onLateralDragEnter(previousTab)"
        @dragleave="onLateralDragLeave"
        @drop="handleDropOnTab(previousTab)"
        class="absolute left-0 top-0 bottom-0 z-30 w-28 sm:w-40 flex flex-col items-center justify-center p-3 text-center transition-all duration-200 cursor-pointer rounded-r-lg border-r-2 border-y-2 group select-none backdrop-blur-none"
        :style="{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: GAME_STATUS_CONFIG[previousTab].color,
          boxShadow: `0 0 30px ${GAME_STATUS_CONFIG[previousTab].color}50`,
        }"
      >
        <div
          class="w-10 h-10 rounded-md flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform"
          :style="{
            backgroundColor: GAME_STATUS_CONFIG[previousTab].color,
            color: '#ffffff',
          }"
        >
          <ChevronLeft class="w-6 h-6 animate-pulse" />
        </div>
        <component
          :is="getIconForStatus(previousTab)"
          class="w-4 h-4 mb-1"
          :style="{ color: GAME_STATUS_CONFIG[previousTab].color }"
        />
        <span class="text-xs font-black uppercase tracking-wider text-white">
          {{ GAME_STATUS_CONFIG[previousTab].label }}
        </span>
        <span class="text-[10px] font-semibold text-white/80 mt-0.5">
          Soltar para mover
        </span>
      </div>
    </Transition>

    <!-- Right Lateral Drop Zone (Next Category) -->
    <Transition name="fade">
      <div
        v-if="isDragging && nextTab"
        @dragover.prevent
        @dragenter="onLateralDragEnter(nextTab)"
        @dragleave="onLateralDragLeave"
        @drop="handleDropOnTab(nextTab)"
        class="absolute right-0 top-0 bottom-0 z-30 w-28 sm:w-40 flex flex-col items-center justify-center p-3 text-center transition-all duration-200 cursor-pointer rounded-l-lg border-l-2 border-y-2 group select-none backdrop-blur-none"
        :style="{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: GAME_STATUS_CONFIG[nextTab].color,
          boxShadow: `0 0 30px ${GAME_STATUS_CONFIG[nextTab].color}50`,
        }"
      >
        <div
          class="w-10 h-10 rounded-md flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform"
          :style="{
            backgroundColor: GAME_STATUS_CONFIG[nextTab].color,
            color: '#ffffff',
          }"
        >
          <ChevronRight class="w-6 h-6 animate-pulse" />
        </div>
        <component
          :is="getIconForStatus(nextTab)"
          class="w-4 h-4 mb-1"
          :style="{ color: GAME_STATUS_CONFIG[nextTab].color }"
        />
        <span class="text-xs font-black uppercase tracking-wider text-white">
          {{ GAME_STATUS_CONFIG[nextTab].label }}
        </span>
        <span class="text-[10px] font-semibold text-white/80 mt-0.5">
          Soltar para mover
        </span>
      </div>
    </Transition>

    <!-- Horizontal Sliding Track (400% width) -->
    <div
      class="flex w-[400%] transition-transform duration-300 ease-out"
      :style="{ transform: `translateX(${translateOffset})` }"
    >
      <!-- Individual Tab Pages (25% width each) -->
      <div
        v-for="tab in TABS"
        :key="tab"
        class="w-1/4 px-1"
        @dragover.prevent
        @drop="handleDropOnTab(tab)"
      >
        <!-- Games Grid with smooth move transitions -->
        <TransitionGroup
          v-if="getGamesForTab(tab).length > 0"
          name="game-grid"
          tag="div"
          class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 pb-4"
        >
          <GameCard
            v-for="game in getGamesForTab(tab)"
            :key="game.id"
            :game="game"
            @click="$emit('select-game', game)"
          />
        </TransitionGroup>

        <!-- Empty State -->
        <div
          v-else
          class="flex flex-col items-center justify-center py-20 px-4 text-center rounded-lg border my-4"
          :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }"
        >
          <div
            class="w-14 h-14 rounded-lg flex items-center justify-center mb-4"
            :style="{ backgroundColor: 'var(--app-surface-hover)', color: 'var(--app-primary)' }"
          >
            <Inbox class="w-7 h-7" />
          </div>
          <h3 class="text-lg font-bold font-display" :style="{ color: 'var(--app-text)' }">
            No hay juegos en {{ GAME_STATUS_CONFIG[tab].label }}
          </h3>
          <p class="text-xs max-w-sm mt-1 mb-6" :style="{ color: 'var(--app-text-muted)' }">
            Arrastra un juego a los laterales o busca nuevos títulos en RAWG para agregarlos.
          </p>
          <button
            type="button"
            @click="$emit('open-search')"
            class="px-4 py-2 mt-6 rounded-md text-xs font-bold text-white transition-transform hover:scale-105 cursor-pointer shadow-md"
            :style="{ backgroundColor: 'var(--app-primary)' }"
          >
            + Buscar y Agregar Juegos
          </button>
        </div>
      </div>
    </div>
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

/* Smooth layout transition for cards moving within or out of grid */
.game-grid-move {
  transition: transform 0.25s ease;
}
.game-grid-enter-active {
  transition: all 0.25s ease-out;
}
.game-grid-leave-active {
  transition: all 0.2s ease-in;
  position: absolute;
  pointer-events: none;
}
.game-grid-enter-from,
.game-grid-leave-to {
  opacity: 0;
  transform: scale(0.85);
}
</style>

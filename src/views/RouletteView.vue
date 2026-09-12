<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGamesStore } from '@/stores/gamesStore';
import type { GameStatus, UserGame } from '@/types/game';
import type { RouletteMode } from '@/types/theme';

import RouletteModeHub from '@/components/roulette/RouletteModeHub.vue';
import RouletteFilters from '@/components/roulette/RouletteFilters.vue';
import ClassicWheel from '@/components/roulette/ClassicWheel.vue';
import VerticalSlotReel from '@/components/roulette/VerticalSlotReel.vue';
import InstantPicker from '@/components/roulette/InstantPicker.vue';
import WinnerModal from '@/components/roulette/WinnerModal.vue';
import { RotateCcw, Dices, ArrowLeft, Compass, SlidersVertical, Zap } from 'lucide-vue-next';

const gamesStore = useGamesStore();

// Mode selection state (null = showing the 3 mode options with previews)
const selectedMode = ref<RouletteMode | null>(null);

// Filters State
const selectedStatus = ref<GameStatus | 'ALL'>('BACKLOG');
const selectedGenre = ref<string | null>(null);
const selectedPlatform = ref<string | null>(null);

// Winner Modal State
const winnerGame = ref<UserGame | null>(null);
const isWinnerModalOpen = ref(false);

const MODES_INFO: Record<RouletteMode, { label: string; icon: any; desc: string }> = {
  classic: {
    label: 'Ruleta Tradicional',
    icon: Compass,
    desc: 'Sorteo aleatorio mediante giro de rueda',
  },
  slot: {
    label: 'Selector Vertical',
    icon: SlidersVertical,
    desc: 'Desplazamiento secuencial en visor continuo',
  },
  instant: {
    label: 'Selección Rápida',
    icon: Zap,
    desc: 'Elección aleatoria directa e instantánea',
  },
};

// Filter Candidate Games
const candidateGames = computed<UserGame[]>(() => {
  return gamesStore.games.filter((game) => {
    // Status Filter
    if (selectedStatus.value !== 'ALL' && game.status !== selectedStatus.value) {
      return false;
    }
    // Genre Filter
    if (selectedGenre.value && (!game.genres || !game.genres.includes(selectedGenre.value))) {
      return false;
    }
    // Platform Filter
    if (selectedPlatform.value && (!game.platforms || !game.platforms.includes(selectedPlatform.value))) {
      return false;
    }
    return true;
  });
});

const handleSelectMode = (mode: RouletteMode) => {
  selectedMode.value = mode;
};

const handleBackToModes = () => {
  selectedMode.value = null;
};

const handleSpinEnd = (game: UserGame) => {
  winnerGame.value = game;
  isWinnerModalOpen.value = true;
};

const handleSpinAgain = () => {
  isWinnerModalOpen.value = false;
  winnerGame.value = null;
};

const resetFilters = () => {
  selectedStatus.value = 'ALL';
  selectedGenre.value = null;
  selectedPlatform.value = null;
};
</script>

<template>
  <div class="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 w-full flex-1 flex flex-col">
    <!-- VIEW 1: Initial 3-Mode Selection Hub with Previews -->
    <Transition name="fade" mode="out-in">
      <div v-if="!selectedMode" key="mode-hub" class="flex-1 min-h-[580px] flex flex-col justify-between">
        <RouletteModeHub @select-mode="handleSelectMode" />
      </div>

      <!-- VIEW 2: Active Roulette Workspace (Unified Container with Embedded Filters) -->
      <div v-else key="mode-workspace" class="flex-1 min-h-[580px] flex flex-col space-y-4">
        <!-- Breadcrumb / Back Action Bar -->
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <button
            type="button"
            @click="handleBackToModes"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold border transition-all duration-150 cursor-pointer hover:opacity-90 active:scale-95"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }"
          >
            <ArrowLeft class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
            <span>Volver a Selección de Ruletas</span>
          </button>

          <!-- Mode Quick Switcher -->
          <div
            class="flex items-center gap-1 p-1 rounded-md border text-xs"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }"
          >
            <button
              v-for="(info, modeKey) in MODES_INFO"
              :key="modeKey"
              type="button"
              @click="selectedMode = (modeKey as RouletteMode)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold transition-all cursor-pointer"
              :class="selectedMode === modeKey ? 'text-white' : 'text-app-text-muted hover:text-app-text'"
              :style="{
                backgroundColor: selectedMode === modeKey ? 'var(--app-primary)' : 'transparent',
              }"
            >
              <component :is="info.icon" class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">{{ info.label }}</span>
            </button>
          </div>
        </div>

        <!-- Unified Roulette Card (Containing embedded filters + roulette mechanism) -->
        <div
          class="rounded-xl border p-4 sm:p-5 flex flex-col items-center justify-between gap-4 shadow-xl transition-all duration-200 flex-1"
          :style="{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }"
        >
          <!-- Frame Header / Mode Title -->
          <div class="w-full flex items-center justify-between pb-3 border-b" :style="{ borderColor: 'var(--app-border)' }">
            <div class="flex items-center gap-2.5">
              <div
                class="p-2 rounded-md text-white shadow-sm"
                :style="{ backgroundColor: 'var(--app-primary)' }"
              >
                <component :is="MODES_INFO[selectedMode].icon" class="w-4 h-4" />
              </div>
              <div>
                <h2 class="text-base sm:text-lg font-display font-bold tracking-tight" :style="{ color: 'var(--app-text)' }">
                  {{ MODES_INFO[selectedMode].label }}
                </h2>
                <p class="text-[11px]" :style="{ color: 'var(--app-text-muted)' }">
                  {{ MODES_INFO[selectedMode].desc }}
                </p>
              </div>
            </div>

            <div class="hidden md:flex items-center gap-1 font-mono text-[11px]" :style="{ color: 'var(--app-text-muted)' }">
              <span>{{ candidateGames.length }} JUEGOS DISPONIBLES</span>
            </div>
          </div>

          <!-- EMBEDDED FILTERS (Inside the same container) -->
          <div class="w-full">
            <RouletteFilters
              v-model:selectedStatus="selectedStatus"
              v-model:selectedGenre="selectedGenre"
              v-model:selectedPlatform="selectedPlatform"
              :candidateCount="candidateGames.length"
            />
          </div>

          <!-- ROULETTE STAGE CONTENT -->
          <div class="w-full flex flex-col items-center justify-center">
            <!-- Mode 1: Classic Wheel -->
            <Transition name="fade" mode="out-in">
              <ClassicWheel
                v-if="selectedMode === 'classic' && candidateGames.length > 0"
                :key="'classic-' + candidateGames.length"
                :candidates="candidateGames"
                @spin-end="handleSpinEnd"
              />

              <!-- Mode 2: Vertical Slot Reel -->
              <VerticalSlotReel
                v-else-if="selectedMode === 'slot' && candidateGames.length > 0"
                :key="'slot-' + candidateGames.length"
                :candidates="candidateGames"
                @spin-end="handleSpinEnd"
              />

              <!-- Mode 3: Instant Picker -->
              <InstantPicker
                v-else-if="selectedMode === 'instant' && candidateGames.length > 0"
                :key="'instant-' + candidateGames.length"
                :candidates="candidateGames"
                @spin-end="handleSpinEnd"
              />

              <!-- Empty Filter Results State -->
              <div
                v-else
                class="flex flex-col items-center justify-center text-center p-8 max-w-md my-auto"
              >
                <div
                  class="w-14 h-14 rounded-lg flex items-center justify-center mb-4 border shadow-inner"
                  :style="{
                    backgroundColor: 'var(--app-surface-hover)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text-muted)',
                  }"
                >
                  <Dices class="w-7 h-7 opacity-60" />
                </div>
                <h3 class="text-base font-bold" :style="{ color: 'var(--app-text)' }">
                  No hay objetivos para esta combinación
                </h3>
                <p class="text-xs mt-1 mb-5" :style="{ color: 'var(--app-text-muted)' }">
                  Ningún juego en tu biblioteca coincide con los filtros seleccionados arriba.
                </p>
                <button
                  type="button"
                  @click="resetFilters"
                  class="px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 border shadow-sm transition-all cursor-pointer"
                  :style="{
                    backgroundColor: 'var(--app-surface-hover)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text)',
                  }"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  Restablecer Filtros
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Winner Celebration Modal -->
    <WinnerModal
      :isOpen="isWinnerModalOpen"
      :game="winnerGame"
      @close="isWinnerModalOpen = false"
      @spinAgain="handleSpinAgain"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.99);
}
</style>


<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import { useGamesStore } from '@/stores/gamesStore'
import { useAuthStore } from '@/stores/authStore'
import type { GameStatus, UserGame } from '@/types/game'
import type { RouletteMode } from '@/types/theme'
import { RouterLink } from 'vue-router'

import RouletteModeHub from '@/components/roulette/RouletteModeHub.vue'
import RouletteFilters from '@/components/roulette/RouletteFilters.vue'
import ClassicWheel from '@/components/roulette/ClassicWheel.vue'
import VerticalSlotReel from '@/components/roulette/VerticalSlotReel.vue'
import InstantPicker from '@/components/roulette/InstantPicker.vue'
import WinnerModal from '@/components/roulette/WinnerModal.vue'
import { RotateCcw, Dices, ArrowLeft, Compass, SlidersVertical, Zap, LogIn } from 'lucide-vue-next'

const gamesStore = useGamesStore()
const authStore = useAuthStore()

// Mode selection state (null = showing the full-screen 3 mode hub with live previews)
const selectedMode = ref<RouletteMode | null>(null)

// Filters State
const selectedStatus = ref<GameStatus | 'ALL'>('BACKLOG')
const selectedGenre = ref<string | null>(null)
const selectedPlatform = ref<string | null>(null)
const excludedIds = ref<number[]>([])

// Winner Modal State
const winnerGame = ref<UserGame | null>(null)
const isWinnerModalOpen = ref(false)

const MODES_INFO: Record<RouletteMode, { label: string; icon: Component; desc: string }> = {
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
}

// Games matching the active category/genre/platform filters
const categoryGames = computed<UserGame[]>(() => {
  return gamesStore.games.filter((game) => {
    // Status Filter
    if (selectedStatus.value !== 'ALL' && game.status !== selectedStatus.value) {
      return false
    }
    // Genre Filter
    if (selectedGenre.value && (!game.genres || !game.genres.includes(selectedGenre.value))) {
      return false
    }
    // Platform Filter
    if (
      selectedPlatform.value &&
      (!game.platforms || !game.platforms.includes(selectedPlatform.value))
    ) {
      return false
    }
    return true
  })
})

// Final Candidate Games (category games minus manually excluded IDs)
const candidateGames = computed<UserGame[]>(() => {
  const excluded = new Set(excludedIds.value)
  return categoryGames.value.filter((game) => !excluded.has(game.id))
})

const handleSelectMode = (mode: RouletteMode) => {
  selectedMode.value = mode
}

const handleBackToModes = () => {
  selectedMode.value = null
}

const handleSpinEnd = (game: UserGame) => {
  winnerGame.value = game
  isWinnerModalOpen.value = true
}

const handleSpinAgain = () => {
  isWinnerModalOpen.value = false
  winnerGame.value = null
}

const resetFilters = () => {
  selectedStatus.value = 'ALL'
  selectedGenre.value = null
  selectedPlatform.value = null
  excludedIds.value = []
}
</script>

<template>
  <!-- Unauthenticated Gate State -->
  <div
    v-if="!authStore.isAuthenticated"
    class="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 flex-1 flex flex-col items-center justify-center text-center w-full"
  >
    <div
      class="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
    >
      <Dices class="w-8 h-8" />
    </div>

    <div class="space-y-3 max-w-xl">
      <h1
        class="text-3xl sm:text-4xl font-display font-black tracking-tight"
        :style="{ color: 'var(--app-text)' }"
      >
        La Ruleta Inteligente de Videojuegos
      </h1>
      <p class="text-sm leading-relaxed" :style="{ color: 'var(--app-text-muted)' }">
        La ruleta se conecta a tu <strong class="text-amber-400">Backlog personal</strong> para
        sortear tu siguiente aventura entre los juegos que tienes pendientes. Inicia sesión para
        cargar tu biblioteca y girar la rueda.
      </p>
    </div>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
      <RouterLink
        to="/login"
        class="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white shadow-xl transition-all duration-150 hover:opacity-95 active:scale-95 cursor-pointer"
        :style="{ backgroundColor: 'var(--app-primary)' }"
      >
        <LogIn class="w-4 h-4" />
        <span>Iniciar Sesión para Jugar</span>
      </RouterLink>

      <RouterLink
        to="/explore"
        class="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm border transition-all duration-150 hover:bg-white/5 active:scale-95 cursor-pointer"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)',
        }"
      >
        <Compass class="w-4 h-4 opacity-70" />
        <span>Explorar Catálogo</span>
      </RouterLink>
    </div>
  </div>

  <!-- Authenticated Roulette View (Full-Screen Edge-to-Edge) -->
  <div
    v-else
    class="w-full flex-1 flex flex-col"
  >
    <Transition name="fade" mode="out-in">
      <!-- VIEW 1: Full-Screen 3-Mode Selection Hub with Real-Time Interactive Previews -->
      <div
        v-if="!selectedMode"
        key="mode-hub-fullscreen"
        class="w-full flex-1 flex flex-col"
      >
        <RouletteModeHub @select-mode="handleSelectMode" />
      </div>

      <!-- VIEW 2: Active Roulette Workspace (Unified Container with Embedded Filters) -->
      <div
        v-else
        key="mode-workspace"
        class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 flex flex-col space-y-4"
      >
        <!-- Breadcrumb / Back Action Bar -->
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <button
            type="button"
            @click="handleBackToModes"
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded text-xs font-bold border transition-all duration-150 cursor-pointer hover:opacity-90 active:scale-95"
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
            class="flex items-center gap-1 p-1 rounded border text-xs"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }"
          >
            <button
              v-for="(info, modeKey) in MODES_INFO"
              :key="modeKey"
              type="button"
              @click="selectedMode = modeKey as RouletteMode"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold transition-all cursor-pointer"
              :class="
                selectedMode === modeKey ? 'text-white' : 'opacity-70 hover:opacity-100'
              "
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
          <div
            class="w-full flex items-center justify-between pb-3 border-b"
            :style="{ borderColor: 'var(--app-border)' }"
          >
            <div class="flex items-center gap-2.5">
              <div
                class="p-2 rounded text-white shadow-sm"
                :style="{ backgroundColor: 'var(--app-primary)' }"
              >
                <component :is="MODES_INFO[selectedMode].icon" class="w-4 h-4" />
              </div>
              <div>
                <h2
                  class="text-base sm:text-lg font-display font-bold tracking-tight"
                  :style="{ color: 'var(--app-text)' }"
                >
                  {{ MODES_INFO[selectedMode].label }}
                </h2>
                <p class="text-[11px]" :style="{ color: 'var(--app-text-muted)' }">
                  {{ MODES_INFO[selectedMode].desc }}
                </p>
              </div>
            </div>

            <div
              class="hidden md:flex items-center gap-1 font-mono text-[11px] px-2.5 py-1 rounded bg-black/30 border border-white/5"
              :style="{ color: 'var(--app-text-muted)' }"
            >
              <span>{{ candidateGames.length }} JUEGOS DISPONIBLES</span>
            </div>
          </div>

          <!-- EMBEDDED FILTERS (Inside the same container) -->
          <div class="w-full">
            <RouletteFilters
              v-model:selectedStatus="selectedStatus"
              v-model:selectedGenre="selectedGenre"
              v-model:selectedPlatform="selectedPlatform"
              v-model:excludedIds="excludedIds"
              :categoryGames="categoryGames"
              :candidateCount="candidateGames.length"
            />
          </div>

          <!-- ROULETTE STAGE CONTENT -->
          <div class="w-full flex-1 flex flex-col items-center justify-center">
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
                  class="w-14 h-14 rounded flex items-center justify-center mb-4 border shadow-inner"
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
                  class="px-4 py-2 rounded text-xs font-bold flex items-center gap-2 border shadow-sm transition-all cursor-pointer hover:bg-white/5"
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
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.99);
}
</style>

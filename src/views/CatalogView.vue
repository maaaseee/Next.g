<script setup lang="ts">
import { ref } from 'vue';
import { useGamesStore } from '@/stores/gamesStore';
import StatusTabs from '@/components/catalog/StatusTabs.vue';
import SlidingContainer from '@/components/catalog/SlidingContainer.vue';
import GameDetailModal from '@/components/catalog/GameDetailModal.vue';
import type { UserGame } from '@/types/game';
import { RefreshCw } from 'lucide-vue-next';

const gamesStore = useGamesStore();

const selectedGame = ref<UserGame | null>(null);

function handleSelectGame(game: UserGame) {
  selectedGame.value = game;
}

function handleCloseDetail() {
  selectedGame.value = null;
}
</script>

<template>
  <div class="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-display font-black tracking-tight" :style="{ color: 'var(--app-text)' }">
          Mi Biblioteca
        </h1>
        <p class="text-xs sm:text-sm mt-1" :style="{ color: 'var(--app-text-muted)' }">
          Organiza tus títulos arrastrándolos entre categorías.
        </p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="gamesStore.fetchGames"
          class="p-2 rounded-md border transition cursor-pointer hover:opacity-80"
          :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }"
          title="Recargar catálogo"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': gamesStore.loading }" />
        </button>
      </div>
    </div>

    <!-- Status Tabs Component -->
    <StatusTabs />

    <!-- Sliding Container with Drag & Drop Viewports -->
    <SlidingContainer
      @select-game="handleSelectGame"
      @open-search="gamesStore.openSearchModal"
    />

    <!-- Game Detail Modal -->
    <GameDetailModal
      :game="selectedGame"
      @close="handleCloseDetail"
    />
  </div>
</template>

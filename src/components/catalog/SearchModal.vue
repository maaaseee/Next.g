<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { Search, X, Star, Plus, Check, Loader2, Sparkles } from 'lucide-vue-next';
import { useGamesStore } from '@/stores/gamesStore';
import type { Game, GameStatus } from '@/types/game';
import { GAME_STATUS_CONFIG } from '@/types/game';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const gamesStore = useGamesStore();

const searchQuery = ref('');
const searchResults = ref<Game[]>([]);
const isLoading = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function handleSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer);

  const q = searchQuery.value.trim();
  // Umbral de Disparo: Bloquea las peticiones si tiene menos de 4 caracteres
  if (!q || q.length < 4) {
    searchResults.value = [];
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  // Debounce Estricto: 750 milisegundos de espera
  debounceTimer = setTimeout(async () => {
    try {
      const data = await gamesStore.searchGames(q);
      // Ensure we only update if query hasn't changed while resolving
      if (searchQuery.value.trim().toLowerCase() === q.toLowerCase()) {
        searchResults.value = data;
      }
    } catch (err) {
      console.error('[SearchModal] Error searching:', err);
    } finally {
      isLoading.value = false;
    }
  }, 750);
}

function getExistingGameStatus(id: number): GameStatus | null {
  const existing = gamesStore.games.find((g) => g.id === id);
  return existing ? existing.status : null;
}

async function handleAddGame(game: Game, status: GameStatus = 'BACKLOG') {
  await gamesStore.addGame(game, status);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      searchQuery.value = '';
      searchResults.value = [];
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  }
);

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      @click.self="emit('close')"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden mt-12 mb-12 flex flex-col"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)',
        }"
      >
        <!-- Search Input Bar -->
        <div class="relative p-4 border-b flex items-center gap-3" :style="{ borderColor: 'var(--app-border)' }">
          <Search class="w-5 h-5 shrink-0" :style="{ color: 'var(--app-primary)' }" />
          <input
            ref="inputRef"
            type="text"
            v-model="searchQuery"
            @input="handleSearchInput"
            placeholder="Buscar títulos, sagas, géneros..."
            class="flex-1 bg-transparent border-none text-sm sm:text-base font-medium focus:outline-hidden placeholder:text-[var(--app-text-muted)]"
            :style="{ color: 'var(--app-text)' }"
          />
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''; searchResults = []"
            class="p-1 rounded text-white/50 hover:text-white transition cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click="emit('close')"
            class="px-2.5 py-1 rounded-md text-xs font-bold border transition cursor-pointer"
            :style="{
              backgroundColor: 'var(--app-surface-hover)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text-muted)',
            }"
          >
            Esc
          </button>
        </div>

        <!-- Search Results List -->
        <div class="p-4 max-h-[60vh] overflow-y-auto space-y-2.5">
          <!-- Loading Skeletons -->
          <div v-if="isLoading" class="space-y-2.5">
            <div
              v-for="i in 3"
              :key="i"
              class="flex items-center gap-3 p-3 rounded-lg animate-pulse"
              :style="{ backgroundColor: 'var(--app-surface-hover)' }"
            >
              <div class="w-12 h-16 rounded-md bg-white/10 shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="w-1/2 h-3.5 rounded bg-white/10"></div>
                <div class="w-1/4 h-2.5 rounded bg-white/10"></div>
              </div>
            </div>
          </div>

          <!-- Results -->
          <div v-else-if="searchResults.length > 0" class="space-y-2">
            <div
              v-for="game in searchResults"
              :key="game.id"
              class="flex items-center justify-between gap-3 p-3 rounded-lg border transition-all hover:border-[var(--app-primary)]"
              :style="{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)' }"
            >
              <!-- Game Info Preview -->
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-16 rounded-md overflow-hidden shrink-0 bg-black/60 relative">
                  <img
                    v-if="game.cover_url"
                    :src="game.cover_url"
                    :alt="game.title"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center p-1 text-[9px] text-center font-bold">
                    {{ game.title }}
                  </div>
                </div>

                <div class="min-w-0">
                  <h4 class="font-display font-bold text-sm leading-tight truncate" :style="{ color: 'var(--app-text)' }">
                    {{ game.title }}
                  </h4>
                  <div class="flex items-center gap-2 mt-1 text-xs" :style="{ color: 'var(--app-text-muted)' }">
                    <span v-if="game.release_year">{{ game.release_year }}</span>
                    <span v-if="game.rating" class="inline-flex items-center gap-0.5 text-amber-300 font-semibold">
                      <Star class="w-3 h-3 fill-amber-300" />
                      {{ game.rating.toFixed(1) }}
                    </span>
                    <span v-if="game.genres?.length" class="truncate hidden sm:inline">
                      • {{ game.genres.slice(0, 2).join(', ') }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Add to Catalog Buttons -->
              <div class="shrink-0 flex items-center gap-1.5">
                <!-- If already in library -->
                <span
                  v-if="getExistingGameStatus(game.id)"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border"
                  :class="GAME_STATUS_CONFIG[getExistingGameStatus(game.id)!].badgeClass"
                >
                  <Check class="w-3.5 h-3.5" />
                  {{ GAME_STATUS_CONFIG[getExistingGameStatus(game.id)!].label }}
                </span>

                <!-- Quick Add to Backlog -->
                <button
                  v-else
                  type="button"
                  @click="handleAddGame(game, 'BACKLOG')"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white transition-transform hover:scale-105 cursor-pointer shadow-md"
                  :style="{ backgroundColor: 'var(--app-primary)' }"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>+ Backlog</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Empty Search State -->
          <div
            v-else-if="searchQuery.trim().length >= 4 && !isLoading"
            class="py-12 text-center"
            :style="{ color: 'var(--app-text-muted)' }"
          >
            <p class="text-sm font-semibold">No se encontraron juegos para "{{ searchQuery }}"</p>
            <p class="text-xs mt-1">Prueba con otro título, género o palabra clave.</p>
          </div>

          <!-- Threshold Hint State (when length < 4 but not empty) -->
          <div
            v-else-if="searchQuery.trim().length > 0 && searchQuery.trim().length < 4"
            class="py-10 text-center space-y-2"
            :style="{ color: 'var(--app-text-muted)' }"
          >
            <p class="text-xs font-semibold text-amber-400/80">Escribe al menos 4 caracteres para iniciar la búsqueda</p>
            <p class="text-[11px] opacity-75">Faltan {{ 4 - searchQuery.trim().length }} caracteres...</p>
          </div>

          <!-- Initial Guidance -->
          <div
            v-else
            class="py-10 text-center space-y-2"
            :style="{ color: 'var(--app-text-muted)' }"
          >
            <Sparkles class="w-8 h-8 mx-auto opacity-40" :style="{ color: 'var(--app-primary)' }" />
            <p class="text-xs font-medium">Escribe al menos 4 caracteres para buscar en la base de datos de videojuegos.</p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import {
  Search,
  X,
  Star,
  Check,
  Loader2,
  Sparkles,
  Clock,
  Play,
  CheckCircle2,
  Trash2,
  ChevronDown,
  Plus,
} from 'lucide-vue-next';
import { useGamesStore } from '@/stores/gamesStore';
import type { Game, GameStatus } from '@/types/game';
import { GAME_STATUS_CONFIG, formatGameRating } from '@/types/game';

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
const activeMenuGameId = ref<number | null>(null);

const STATUS_OPTIONS: { status: GameStatus; label: string; icon: any; colorClass: string }[] = [
  { status: 'BACKLOG', label: 'Backlog', icon: Clock, colorClass: 'text-amber-400' },
  { status: 'PLAYING', label: 'Jugando', icon: Play, colorClass: 'text-emerald-400' },
  { status: 'COMPLETED', label: 'Completado', icon: CheckCircle2, colorClass: 'text-sky-400' },
  { status: 'WISHLIST', label: 'Deseado', icon: Sparkles, colorClass: 'text-purple-400' },
];

function toggleStatusMenu(gameId: number) {
  activeMenuGameId.value = activeMenuGameId.value === gameId ? null : gameId;
}

function handleClickOutside() {
  activeMenuGameId.value = null;
}

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

async function handleSelectCategory(game: Game, status: GameStatus) {
  activeMenuGameId.value = null;
  await gamesStore.addGame(game, status);
}

async function handleRemoveGame(gameId: number) {
  activeMenuGameId.value = null;
  await gamesStore.deleteGame(gameId);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    if (activeMenuGameId.value !== null) {
      activeMenuGameId.value = null;
    } else {
      emit('close');
    }
  }
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      searchQuery.value = '';
      searchResults.value = [];
      activeMenuGameId.value = null;
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  }
);

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('click', handleClickOutside);
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
            class="flex-1 bg-transparent border-none text-sm sm:text-base font-medium focus:outline-hidden placeholder:text-(--app-text-muted)"
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
        <div class="p-4 max-h-[60vh] overflow-y-auto space-y-2.5 pb-20">
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
              v-for="(game, index) in searchResults"
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
                    <span v-if="formatGameRating(game.rating)" class="inline-flex items-center gap-0.5 text-amber-300 font-semibold">
                      <Star class="w-3 h-3 fill-amber-300" />
                      {{ formatGameRating(game.rating) }}
                    </span>
                    <span v-if="game.genres?.length" class="truncate hidden sm:inline">
                      • {{ game.genres.slice(0, 2).join(', ') }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Add to Catalog / Category Dropdown -->
              <div class="shrink-0 relative" :class="{ 'z-40': activeMenuGameId === game.id }" @click.stop>
                <!-- If already in library: Interactive badge to view/change status -->
                <button
                  v-if="getExistingGameStatus(game.id)"
                  type="button"
                  @click.stop="toggleStatusMenu(game.id)"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                  :class="GAME_STATUS_CONFIG[getExistingGameStatus(game.id)!].badgeClass"
                  title="Cambiar categoría o estado"
                  aria-haspopup="true"
                  :aria-expanded="activeMenuGameId === game.id"
                >
                  <Check class="w-3.5 h-3.5" />
                  <span>{{ GAME_STATUS_CONFIG[getExistingGameStatus(game.id)!].label }}</span>
                  <ChevronDown
                    class="w-3 h-3 opacity-70 transition-transform duration-150"
                    :class="{ 'rotate-180': activeMenuGameId === game.id }"
                  />
                </button>

                <!-- If not in library: Add to category button with dropdown -->
                <button
                  v-else
                  type="button"
                  @click.stop="toggleStatusMenu(game.id)"
                  class="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md hover:shadow-lg"
                  :style="{ backgroundColor: 'var(--app-primary)' }"
                  title="Agregar a una categoría"
                  aria-haspopup="true"
                  :aria-expanded="activeMenuGameId === game.id"
                >
                  <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Agregar</span>
                  <ChevronDown
                    class="w-3 h-3 opacity-80 transition-transform duration-150"
                    :class="{ 'rotate-180': activeMenuGameId === game.id }"
                  />
                </button>

                <!-- Category Popover Dropdown -->
                <transition
                  enter-active-class="transition duration-150 ease-out"
                  enter-from-class="transform scale-95 opacity-0"
                  enter-to-class="transform scale-100 opacity-100"
                  leave-active-class="transition duration-100 ease-in"
                  leave-from-class="transform scale-100 opacity-100"
                  leave-to-class="transform scale-95 opacity-0"
                >
                  <div
                    v-if="activeMenuGameId === game.id"
                    class="absolute right-0 w-48 p-1.5 rounded-lg border shadow-2xl z-50 backdrop-blur-md"
                    :class="[
                      index >= searchResults.length - 2 && searchResults.length > 2
                        ? 'bottom-full mb-1.5 origin-bottom-right'
                        : 'top-full mt-1.5 origin-top-right',
                    ]"
                    :style="{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }"
                    role="menu"
                  >
                    <div class="px-2 py-1 mb-1 border-b" :style="{ borderColor: 'var(--app-border)' }">
                      <p class="text-[10px] font-bold uppercase tracking-wider" :style="{ color: 'var(--app-text-muted)' }">
                        {{ getExistingGameStatus(game.id) ? 'Mover a categoría:' : 'Agregar a categoría:' }}
                      </p>
                    </div>

                    <div class="space-y-0.5">
                      <button
                        v-for="opt in STATUS_OPTIONS"
                        :key="opt.status"
                        type="button"
                        @click.stop="handleSelectCategory(game, opt.status)"
                        class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all hover:bg-white/10 cursor-pointer"
                        :class="{ 'bg-white/5 font-bold': getExistingGameStatus(game.id) === opt.status }"
                        role="menuitem"
                      >
                        <div class="flex items-center gap-2">
                          <component :is="opt.icon" class="w-3.5 h-3.5" :class="opt.colorClass" />
                          <span :style="{ color: 'var(--app-text)' }">{{ opt.label }}</span>
                        </div>
                        <Check
                          v-if="getExistingGameStatus(game.id) === opt.status"
                          class="w-3.5 h-3.5"
                          :style="{ color: 'var(--app-primary)' }"
                        />
                      </button>
                    </div>

                    <!-- Option to remove from library if already added -->
                    <div
                      v-if="getExistingGameStatus(game.id)"
                      class="pt-1 mt-1 border-t"
                      :style="{ borderColor: 'var(--app-border)' }"
                    >
                      <button
                        type="button"
                        @click.stop="handleRemoveGame(game.id)"
                        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                        role="menuitem"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                        <span>Quitar de biblioteca</span>
                      </button>
                    </div>
                  </div>
                </transition>
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

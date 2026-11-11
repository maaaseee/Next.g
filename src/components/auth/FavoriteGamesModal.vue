<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, Check, Sparkles, Loader2, Gamepad2, ArrowRight } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'
import { useGamesStore } from '@/stores/gamesStore'
import { getApiUrl } from '@/config/api.config'
import type { Game } from '@/types/game'

const authStore = useAuthStore()
const gamesStore = useGamesStore()

const searchQuery = ref('')
const popularGames = ref<Game[]>([])
const searchResults = ref<Game[]>([])
const selectedGames = ref<Map<number, Game>>(new Map())
const loadingGames = ref(false)
const isSearching = ref(false)
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const selectedCount = computed(() => selectedGames.value.size)
const canProceed = computed(() => selectedCount.value >= 3)
const progressPercent = computed(() => Math.min(100, Math.round((selectedCount.value / 3) * 100)))

const displayedGames = computed(() => {
  if (searchQuery.value.trim().length >= 2) {
    return searchResults.value
  }
  return popularGames.value
})

async function loadPopularGames() {
  loadingGames.value = true
  try {
    const res = await fetch(getApiUrl('/api/search/popular?limit=24'))
    if (res.ok) {
      const data = await res.json()
      popularGames.value = data
    }
  } catch (err) {
    console.error('[FavoriteGamesModal] Error loading popular games:', err)
  } finally {
    loadingGames.value = false
  }
}

function handleSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)

  const query = searchQuery.value.trim()
  if (query.length < 2) {
    searchResults.value = []
    isSearching.value = false
    return
  }

  isSearching.value = true
  searchDebounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(getApiUrl(`/api/search?q=${encodeURIComponent(query)}&limit=20`))
      if (res.ok) {
        const data = await res.json()
        searchResults.value = data
      }
    } catch (err) {
      console.error('[FavoriteGamesModal] Search error:', err)
    } finally {
      isSearching.value = false
    }
  }, 350)
}

function toggleGame(game: Game) {
  const map = new Map(selectedGames.value)
  if (map.has(game.id)) {
    map.delete(game.id)
  } else {
    map.set(game.id, game)
  }
  selectedGames.value = map
}

function isSelected(gameId: number): boolean {
  return selectedGames.value.has(gameId)
}

async function handleComplete() {
  if (!canProceed.value) return

  const gamesArray = Array.from(selectedGames.value.values())
  const success = await authStore.completeOnboarding(gamesArray)
  if (success) {
    await gamesStore.fetchGames()
  }
}

watch(
  () => authStore.isOnboardingModalOpen,
  (isOpen) => {
    if (isOpen) {
      selectedGames.value = new Map()
      searchQuery.value = ''
      if (popularGames.value.length === 0) {
        loadPopularGames()
      }
    }
  },
)

onMounted(() => {
  if (authStore.isOnboardingModalOpen) {
    loadPopularGames()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="authStore.isOnboardingModalOpen"
        class="fixed inset-0 z-50 flex flex-col items-center justify-between p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden"
      >
        <!-- Modal Container -->
        <div
          class="relative w-full max-w-5xl h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden"
          :style="{
            backgroundColor: 'var(--app-bg)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
          }"
        >
          <!-- Top Header & Instructions -->
          <div
            class="p-5 sm:p-7 border-b shrink-0 text-center relative"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }"
          >
            <div
              class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2.5 bg-amber-500/15 text-amber-400 border border-amber-500/30"
            >
              <Sparkles class="w-3.5 h-3.5" />
              <span>Personaliza tu experiencia</span>
            </div>

            <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Elige tus
              <span :style="{ color: 'var(--app-primary)' }">3 videojuegos</span> favoritos
            </h2>
            <p
              class="text-xs sm:text-sm max-w-xl mx-auto"
              :style="{ color: 'var(--app-text-muted)' }"
            >
              Selecciona al menos 3 juegos que te hayan marcado. Con ellos crearemos tu biblioteca
              inicial y calibraremos las recomendaciones.
            </p>

            <!-- Search Bar in Modal -->
            <div class="mt-4 max-w-md mx-auto relative">
              <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
              <input
                v-model="searchQuery"
                @input="handleSearchInput"
                type="text"
                placeholder="¿No lo ves? Busca cualquier juego en IGDB..."
                class="w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-(--app-primary)"
                :style="{
                  backgroundColor: 'var(--app-bg)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text)',
                }"
              />
              <Loader2
                v-if="isSearching"
                class="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin opacity-60"
              />
            </div>
          </div>

          <!-- Main Scrollable Grid -->
          <div class="grow overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            <!-- Loading indicator -->
            <div
              v-if="loadingGames && displayedGames.length === 0"
              class="h-64 flex flex-col items-center justify-center gap-3 opacity-60"
            >
              <Loader2 class="w-8 h-8 animate-spin" :style="{ color: 'var(--app-primary)' }" />
              <p class="text-sm font-medium">Cargando videojuegos aclamados...</p>
            </div>

            <!-- Empty Search Results -->
            <div
              v-else-if="displayedGames.length === 0"
              class="h-64 flex flex-col items-center justify-center gap-2 opacity-60 text-center"
            >
              <Gamepad2 class="w-10 h-10 mb-1" />
              <p class="text-base font-semibold">
                No encontramos resultados para "{{ searchQuery }}"
              </p>
              <p class="text-xs">
                Prueba con otro término de búsqueda o selecciona de la lista general.
              </p>
            </div>

            <!-- Games Grid -->
            <div
              v-else
              class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4"
            >
              <div
                v-for="game in displayedGames"
                :key="game.id"
                @click="toggleGame(game)"
                class="group relative flex flex-col rounded-xl overflow-hidden border cursor-pointer select-none transition-all duration-200 transform hover:scale-[1.03] active:scale-[0.98]"
                :style="{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: isSelected(game.id) ? 'var(--app-primary)' : 'var(--app-border)',
                  boxShadow: isSelected(game.id) ? '0 0 16px var(--app-primary)' : 'none',
                }"
              >
                <!-- Cover Image -->
                <div class="relative aspect-3/4 w-full bg-black/40 overflow-hidden">
                  <img
                    v-if="game.cover_url"
                    :src="game.cover_url"
                    :alt="game.title"
                    loading="lazy"
                    class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div
                    v-else
                    class="w-full h-full flex flex-col items-center justify-center p-2 text-center opacity-40"
                  >
                    <Gamepad2 class="w-8 h-8 mb-1" />
                    <span class="text-[10px]">{{ game.title }}</span>
                  </div>

                  <!-- Dark overlay gradient -->
                  <div
                    class="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent"
                  />

                  <!-- Selected Checkmark Badge -->
                  <div
                    v-if="isSelected(game.id)"
                    class="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white animate-scale-in"
                    :style="{ backgroundColor: 'var(--app-primary)' }"
                  >
                    <Check class="w-4 h-4 stroke-3" />
                  </div>

                  <!-- Year Badge -->
                  <span
                    v-if="game.release_year"
                    class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white/90"
                  >
                    {{ game.release_year }}
                  </span>
                </div>

                <!-- Game Title & Meta -->
                <div class="p-2 sm:p-2.5 flex flex-col grow justify-between">
                  <h4
                    class="text-xs sm:text-sm font-bold line-clamp-1 group-hover:text-(--app-primary) transition-colors"
                  >
                    {{ game.title }}
                  </h4>
                  <p
                    v-if="game.genres && game.genres.length"
                    class="text-[10px] line-clamp-1 mt-0.5"
                    :style="{ color: 'var(--app-text-muted)' }"
                  >
                    {{ game.genres.slice(0, 2).join(', ') }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Sticky Footer with Progress & Continue Button -->
          <div
            class="p-4 sm:p-5 border-t shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }"
          >
            <!-- Progress Counter -->
            <div class="flex items-center gap-3 w-full sm:w-auto">
              <div
                class="relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border"
                :style="{
                  backgroundColor: canProceed ? 'var(--app-primary)' : 'var(--app-surface-hover)',
                  borderColor: 'var(--app-border)',
                  color: canProceed ? '#ffffff' : 'var(--app-text)',
                }"
              >
                <span>{{ selectedCount }}</span>
              </div>

              <div>
                <p class="text-xs sm:text-sm font-semibold">
                  <span v-if="!canProceed">
                    Selecciona al menos
                    <strong :style="{ color: 'var(--app-primary)' }"
                      >{{ 3 - selectedCount }} más</strong
                    >
                  </span>
                  <span v-else class="text-emerald-400 font-bold">
                    ¡Listo para comenzar! ({{ selectedCount }} seleccionados)
                  </span>
                </p>
                <div class="w-36 h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    :style="{
                      width: `${progressPercent}%`,
                      backgroundColor: canProceed ? '#10b981' : 'var(--app-primary)',
                    }"
                  />
                </div>
              </div>
            </div>

            <!-- Complete Button -->
            <button
              type="button"
              @click="handleComplete"
              :disabled="!canProceed || authStore.loading"
              class="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg active:scale-95"
              :class="canProceed ? 'animate-pulse-subtle' : ''"
              :style="{ backgroundColor: 'var(--app-primary)' }"
            >
              <Loader2 v-if="authStore.loading" class="w-4 h-4 animate-spin" />
              <span v-else>Continuar a mi biblioteca</span>
              <ArrowRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-in {
  animation: scaleIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes pulseSubtle {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(var(--app-primary-rgb, 99, 102, 241), 0.4);
  }
  50% {
    box-shadow: 0 0 20px 4px rgba(var(--app-primary-rgb, 99, 102, 241), 0.6);
  }
}

.animate-pulse-subtle {
  animation: pulseSubtle 2.5s infinite;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--app-border);
  border-radius: 9999px;
}
</style>

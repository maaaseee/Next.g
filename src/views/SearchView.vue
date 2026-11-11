<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Gamepad2, Users, Trophy } from 'lucide-vue-next'
import { useGamesStore } from '@/stores/gamesStore'
import type { Game, GameStatus } from '@/types/game'
import type { CommunityUser } from '@/types/auth'
import { getApiUrl } from '@/config/api.config'

import SearchInput from '@/components/common/SearchInput.vue'
import CatalogGameCard from '@/components/common/CatalogGameCard.vue'
import GameGridSkeleton from '@/components/common/GameGridSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import UserCard from '@/components/common/UserCard.vue'

type SearchCategory = 'games' | 'users'

const route = useRoute()
const router = useRouter()
const gamesStore = useGamesStore()

// Search state: strictly 'games' or 'users'
const initialCat = (route.query.category as string) === 'users' ? 'users' : 'games'
const selectedCategory = ref<SearchCategory>(initialCat)
const searchQuery = ref((route.query.q as string) || '')

const isLoadingGames = ref(false)
const isLoadingUsers = ref(false)
const gamesResults = ref<Game[]>([])
const topGames = computed(() => gamesStore.topGames)
const isLoadingTopGames = computed(() => gamesStore.loadingTopGames)
const usersResults = ref<CommunityUser[]>([])

const isLoading = computed(() => {
  return selectedCategory.value === 'games'
    ? isLoadingGames.value || (isLoadingTopGames.value && topGames.value.length === 0)
    : isLoadingUsers.value
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function setCategory(cat: SearchCategory) {
  if (selectedCategory.value === cat) return
  selectedCategory.value = cat
  updateRouteQuery()
  if (!searchQuery.value.trim()) {
    if (cat === 'games') {
      loadTopGames()
    } else {
      loadFeaturedUsers()
    }
  } else {
    executeSearch()
  }
}

function clearSearch() {
  searchQuery.value = ''
  gamesResults.value = []
  updateRouteQuery()
  if (selectedCategory.value === 'games') {
    loadTopGames()
  } else if (selectedCategory.value === 'users') {
    loadFeaturedUsers()
  }
}

function updateRouteQuery() {
  const query: Record<string, string> = {
    category: selectedCategory.value,
  }
  if (searchQuery.value.trim()) {
    query.q = searchQuery.value.trim()
  }
  router.replace({ query })
}

async function loadTopGames() {
  await gamesStore.fetchTopGames(100)
}

async function searchGames() {
  const q = searchQuery.value.trim()
  if (!q || q.length < 2) {
    gamesResults.value = []
    loadTopGames()
    return
  }

  isLoadingGames.value = true
  try {
    const results = await gamesStore.searchGames(q)
    gamesResults.value = results
  } catch (err) {
    console.error('[SearchView] Error searching games:', err)
    gamesResults.value = []
  } finally {
    isLoadingGames.value = false
  }
}

async function searchUsers() {
  const q = searchQuery.value.trim()
  isLoadingUsers.value = true
  try {
    const url = q
      ? getApiUrl(`/api/users?q=${encodeURIComponent(q)}`)
      : getApiUrl('/api/users?limit=12')
    const res = await fetch(url)
    if (res.ok) {
      usersResults.value = await res.json()
    } else {
      usersResults.value = []
    }
  } catch (err) {
    console.error('[SearchView] Error searching users:', err)
    usersResults.value = []
  } finally {
    isLoadingUsers.value = false
  }
}

async function loadFeaturedUsers() {
  isLoadingUsers.value = true
  try {
    const res = await fetch(getApiUrl('/api/users?limit=12'))
    if (res.ok) {
      usersResults.value = await res.json()
    }
  } catch (err) {
    console.error('[SearchView] Error loading featured users:', err)
  } finally {
    isLoadingUsers.value = false
  }
}

function executeSearch() {
  if (debounceTimer) clearTimeout(debounceTimer)

  const q = searchQuery.value.trim()

  if (!q) {
    gamesResults.value = []
    if (selectedCategory.value === 'games') {
      loadTopGames()
    } else {
      loadFeaturedUsers()
    }
    return
  }

  debounceTimer = setTimeout(() => {
    updateRouteQuery()
    if (selectedCategory.value === 'games') {
      searchGames()
    } else {
      searchUsers()
    }
  }, 350)
}

function getGameLibraryStatus(gameId: number): GameStatus | null {
  const existing = gamesStore.games.find((g) => g.id === gameId)
  return existing ? existing.status : null
}

watch(searchQuery, () => {
  executeSearch()
})

onMounted(() => {
  if (searchQuery.value.trim()) {
    executeSearch()
  } else if (selectedCategory.value === 'games') {
    loadTopGames()
  } else if (selectedCategory.value === 'users') {
    loadFeaturedUsers()
  }
})
</script>

<template>
  <div class="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 flex-1 flex flex-col w-full">
    <!-- Top Search Header & Controls -->
    <div class="space-y-6">
      <div class="space-y-2 text-center max-w-2xl mx-auto">
        <h1
          class="text-3xl sm:text-4xl font-display font-black tracking-tight"
          :style="{ color: 'var(--app-text)' }"
        >
          Buscador
        </h1>
        <p class="text-xs sm:text-sm" :style="{ color: 'var(--app-text-muted)' }">
          {{
            selectedCategory === 'games'
              ? 'Encuentra cualquier videojuego en la base de datos de IGDB.'
              : 'Descubre jugadores de la comunidad y explora sus colecciones.'
          }}
        </p>
      </div>

      <!-- Main Search Input Bar -->
      <div class="max-w-2xl mx-auto space-y-4">
        <SearchInput
          v-model="searchQuery"
          @clear="clearSearch"
          @enter="executeSearch"
          :loading="isLoading"
          :autofocus="true"
          size="lg"
          :placeholder="
            selectedCategory === 'games'
              ? 'Buscar videojuego en IGDB...'
              : 'Buscar usuario por nombre...'
          "
        />

        <!-- Category Selector: Strictly ONE or the OTHER (Mutually Exclusive) -->
        <div class="flex items-center justify-center gap-2">
          <button
            type="button"
            @click="setCategory('games')"
            class="flex items-center gap-2 px-4 py-2 rounded-[4px] text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border select-none"
            :class="selectedCategory === 'games' ? 'shadow-md scale-102' : 'hover:opacity-80'"
            :style="{
              backgroundColor:
                selectedCategory === 'games' ? 'var(--app-primary)' : 'var(--app-surface)',
              borderColor:
                selectedCategory === 'games' ? 'var(--app-primary)' : 'var(--app-border)',
              color: selectedCategory === 'games' ? '#ffffff' : 'var(--app-text-muted)',
              boxShadow:
                selectedCategory === 'games' ? '0 0 16px var(--app-glow)' : 'none',
            }"
          >
            <Gamepad2 class="w-4 h-4" />
            <span>Juegos</span>
            <span
              v-if="selectedCategory === 'games' && gamesResults.length > 0"
              class="px-1.5 py-0.2 rounded-[2px] text-[10px] bg-white/20 text-white font-mono"
            >
              {{ gamesResults.length }}
            </span>
          </button>

          <button
            type="button"
            @click="setCategory('users')"
            class="flex items-center gap-2 px-4 py-2 rounded-[4px] text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border select-none"
            :class="selectedCategory === 'users' ? 'shadow-md scale-102' : 'hover:opacity-80'"
            :style="{
              backgroundColor:
                selectedCategory === 'users' ? 'var(--app-primary)' : 'var(--app-surface)',
              borderColor:
                selectedCategory === 'users' ? 'var(--app-primary)' : 'var(--app-border)',
              color: selectedCategory === 'users' ? '#ffffff' : 'var(--app-text-muted)',
              boxShadow:
                selectedCategory === 'users' ? '0 0 16px var(--app-glow)' : 'none',
            }"
          >
            <Users class="w-4 h-4" />
            <span>Usuarios de la Comunidad</span>
            <span
              v-if="selectedCategory === 'users' && usersResults.length > 0"
              class="px-1.5 py-0.2 rounded-[2px] text-[10px] bg-white/20 text-white font-mono"
            >
              {{ usersResults.length }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Results Section -->
    <div class="grow space-y-6 pt-2 w-full">
      <!-- 1. GAMES MODE -->
      <template v-if="selectedCategory === 'games'">
        <!-- SKELETON LOADING STATE -->
        <GameGridSkeleton
          v-if="isLoading"
          :count="18"
          grid-class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 w-full"
        />

        <!-- SEARCH QUERY HAS RESULTS OR EMPTY RESULTS -->
        <template v-else-if="searchQuery.trim().length >= 2">
          <!-- Shared Empty State Component -->
          <EmptyState
            v-if="gamesResults.length === 0"
            :icon="Gamepad2"
            :title="`No se encontraron videojuegos para '${searchQuery}'`"
            description="Revisa la ortografía o intenta con palabras clave más generales."
          />

          <!-- Active Search Results Grid -->
          <div v-else class="space-y-4 w-full">
            <div
              class="flex items-center justify-between pb-2 border-b"
              :style="{ borderColor: 'var(--app-border)' }"
            >
              <p class="text-xs font-semibold" :style="{ color: 'var(--app-text-muted)' }">
                Resultados para <span class="text-white font-bold">"{{ searchQuery }}"</span>
              </p>
              <span class="text-xs font-mono opacity-60">
                {{ gamesResults.length }} encontrados
              </span>
            </div>

            <div
              v-auto-animate
              class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 w-full"
            >
              <CatalogGameCard
                v-for="game in gamesResults"
                :key="game.id"
                :game="game"
                :library-status="getGameLibraryStatus(game.id)"
              />
            </div>
          </div>
        </template>

        <!-- DEFAULT / UNSEARCHED STATE: TOP 100 ACCLAIMED GAMES -->
        <div v-else class="space-y-4 w-full">
          <div
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b"
            :style="{ borderColor: 'var(--app-border)' }"
          >
            <div class="flex items-center gap-2">
              <Trophy class="w-5 h-5 text-amber-400 shrink-0" />
              <h2
                class="text-base sm:text-lg font-display font-black tracking-tight"
                :style="{ color: 'var(--app-text)' }"
              >
                Top 100 Juegos Más Aclamados
              </h2>
              <span
                class="px-2 py-0.5 rounded-[2px] text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20"
              >
                IGDB
              </span>
            </div>
            <p class="text-xs" :style="{ color: 'var(--app-text-muted)' }">
              Los títulos mejor valorados de la historia del gaming
            </p>
          </div>

          <div
            v-auto-animate
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 w-full"
          >
            <CatalogGameCard
              v-for="(game, index) in topGames"
              :key="game.id"
              :game="game"
              :ranking-index="index"
              :library-status="getGameLibraryStatus(game.id)"
            />
          </div>
        </div>
      </template>

      <!-- 2. USERS MODE -->
      <template v-else-if="selectedCategory === 'users'">
        <!-- SKELETON LOADING STATE FOR USERS -->
        <div
          v-if="isLoading"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full"
        >
          <div
            v-for="i in 8"
            :key="`user-skel-${i}`"
            class="p-5 rounded-[4px] border border-white/5 bg-white/5 animate-pulse flex flex-col justify-between gap-4"
          >
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-full bg-white/10 shrink-0" />
              <div class="space-y-2 flex-1">
                <div class="h-4 bg-white/10 rounded w-1/2" />
                <div class="h-3 bg-white/5 rounded w-1/3" />
              </div>
            </div>
            <div class="h-8 bg-white/5 rounded-[2px] w-full" />
          </div>
        </div>

        <!-- Shared Empty State for Users -->
        <EmptyState
          v-else-if="usersResults.length === 0"
          :icon="Users"
          :title="`No se encontraron jugadores para '${searchQuery}'`"
          description="Verifica el nombre del usuario o explora la lista general."
        />

        <!-- Shared UserCard Grid -->
        <div v-else class="space-y-4 w-full">
          <div
            class="flex items-center justify-between pb-2 border-b"
            :style="{ borderColor: 'var(--app-border)' }"
          >
            <p class="text-xs font-semibold" :style="{ color: 'var(--app-text-muted)' }">
              {{
                searchQuery.trim()
                  ? `Jugadores coincidentes con "${searchQuery}"`
                  : 'Jugadores Destacados de la Comunidad'
              }}
            </p>
            <span class="text-xs font-mono opacity-60"> {{ usersResults.length }} jugadores </span>
          </div>

          <div
            v-auto-animate
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full"
          >
            <UserCard
              v-for="u in usersResults"
              :key="u.id"
              :user="u"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

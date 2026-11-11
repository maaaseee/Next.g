<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Filter, RotateCcw, X } from 'lucide-vue-next'
import { useGamesStore } from '@/stores/gamesStore'
import type { Game } from '@/types/game'

import SearchInput from '@/components/common/SearchInput.vue'
import CatalogGameCard from '@/components/common/CatalogGameCard.vue'
import GameGridSkeleton from '@/components/common/GameGridSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import filtersData from '@/data/filters.json'

const gamesStore = useGamesStore()

const searchQuery = ref('')
const gamesList = ref<Game[]>([])
const loading = ref(true)
const isSearching = ref(false)
const selectedGenre = ref<string | null>(null)
const selectedPlatform = ref<string | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const GENRES: string[] = filtersData.genres
const PLATFORMS: string[] = filtersData.platforms

const hasActiveFilters = computed(() => {
  return !!selectedGenre.value || !!selectedPlatform.value || searchQuery.value.trim().length > 0
})

async function fetchGames() {
  const q = searchQuery.value.trim()
  loading.value = true

  try {
    if (q.length >= 2) {
      isSearching.value = true
      gamesList.value = await gamesStore.searchGamesFiltered(
        q,
        {
          genre: selectedGenre.value,
          platform: selectedPlatform.value,
        },
        36,
      )
    } else {
      gamesList.value = await gamesStore.fetchExploreGames(36, {
        genre: selectedGenre.value,
        platform: selectedPlatform.value,
      })
    }
  } catch (err) {
    console.error('Error fetching exploration games:', err)
  } finally {
    loading.value = false
    isSearching.value = false
  }
}

function handleSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  const q = searchQuery.value.trim()

  if (q.length === 1) {
    return
  }

  debounceTimer = setTimeout(() => {
    fetchGames()
  }, 350)
}

function clearSearch() {
  searchQuery.value = ''
  fetchGames()
}

function toggleGenre(genre: string) {
  selectedGenre.value = selectedGenre.value === genre ? null : genre
  fetchGames()
}

function togglePlatform(platform: string) {
  selectedPlatform.value = selectedPlatform.value === platform ? null : platform
  fetchGames()
}

function clearAllFilters() {
  searchQuery.value = ''
  selectedGenre.value = null
  selectedPlatform.value = null
  fetchGames()
}

onMounted(() => {
  fetchGames()
})
</script>

<template>
  <div class="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 flex-1 flex flex-col w-full">
    <!-- Header with Search -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1
          class="text-3xl font-display font-black tracking-tight"
          :style="{ color: 'var(--app-text)' }"
        >
          Explorar Videojuegos
        </h1>
        <p class="text-xs sm:text-sm mt-1" :style="{ color: 'var(--app-text-muted)' }">
          Busca títulos en el catálogo global de IGDB con filtros dinámicos y caché inteligente.
        </p>
      </div>

      <!-- Shared Search Input Component -->
      <div class="w-full md:w-96">
        <SearchInput
          v-model="searchQuery"
          @update:model-value="handleSearchInput"
          @clear="clearSearch"
          :loading="isSearching"
          placeholder="Buscar cualquier juego..."
        />
      </div>
    </div>

    <!-- Filter Pills Section -->
    <div
      class="space-y-3 border p-4 rounded-[4px]"
      :style="{
        backgroundColor: 'var(--app-surface)',
        borderColor: 'var(--app-border)',
      }"
    >
      <!-- Platforms Filter -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span
          class="text-xs font-mono font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1.5"
          :style="{ color: 'var(--app-text-muted)' }"
        >
          Plataformas:
        </span>
        <button
          v-for="platform in PLATFORMS"
          :key="platform"
          type="button"
          @click="togglePlatform(platform)"
          class="px-3 py-1 rounded-[4px] text-xs font-semibold border transition-all duration-150 cursor-pointer shrink-0"
          :style="{
            backgroundColor:
              selectedPlatform === platform ? 'var(--app-primary)' : 'transparent',
            borderColor: selectedPlatform === platform ? 'var(--app-primary)' : 'var(--app-border)',
            color: selectedPlatform === platform ? '#ffffff' : 'var(--app-text-muted)',
          }"
        >
          {{ platform }}
        </button>
      </div>

      <!-- Genres Filter -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span
          class="text-xs font-mono font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1.5"
          :style="{ color: 'var(--app-text-muted)' }"
        >
          Géneros:
        </span>
        <button
          v-for="genre in GENRES"
          :key="genre"
          type="button"
          @click="toggleGenre(genre)"
          class="px-3 py-1 rounded-[4px] text-xs font-semibold border transition-all duration-150 cursor-pointer shrink-0"
          :style="{
            backgroundColor: selectedGenre === genre ? 'var(--app-primary)' : 'transparent',
            borderColor: selectedGenre === genre ? 'var(--app-primary)' : 'var(--app-border)',
            color: selectedGenre === genre ? '#ffffff' : 'var(--app-text-muted)',
          }"
        >
          {{ genre }}
        </button>
      </div>

      <!-- Active Filters Summary & Reset -->
      <div
        v-if="hasActiveFilters"
        class="pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-xs"
        :style="{ borderColor: 'var(--app-border)' }"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="opacity-70 flex items-center gap-1 font-mono text-[11px]">
            <Filter class="w-3.5 h-3.5" />
            Filtros activos:
          </span>
          <span
            v-if="selectedPlatform"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-white/10 border border-white/10 text-white font-mono text-[11px]"
          >
            {{ selectedPlatform }}
            <button
              type="button"
              @click="togglePlatform(selectedPlatform)"
              class="hover:opacity-75 cursor-pointer ml-0.5"
            >
              <X class="w-3 h-3" />
            </button>
          </span>
          <span
            v-if="selectedGenre"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-white/10 border border-white/10 text-white font-mono text-[11px]"
          >
            {{ selectedGenre }}
            <button
              type="button"
              @click="toggleGenre(selectedGenre)"
              class="hover:opacity-75 cursor-pointer ml-0.5"
            >
              <X class="w-3 h-3" />
            </button>
          </span>
          <span
            v-if="searchQuery.trim().length > 0"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-white/10 border border-white/10 text-white font-mono text-[11px]"
          >
            "{{ searchQuery.trim() }}"
            <button
              type="button"
              @click="clearSearch"
              class="hover:opacity-75 cursor-pointer ml-0.5"
            >
              <X class="w-3 h-3" />
            </button>
          </span>
        </div>

        <button
          type="button"
          @click="clearAllFilters"
          class="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors font-mono font-bold uppercase tracking-wider cursor-pointer"
        >
          <RotateCcw class="w-3 h-3" />
          <span>Limpiar filtros</span>
        </button>
      </div>
    </div>

    <!-- Main Results Grid -->
    <div class="grow w-full">
      <!-- Loading Skeleton Grid -->
      <GameGridSkeleton
        v-if="loading"
        :count="18"
        grid-class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 w-full"
      />

      <!-- Shared Empty State Component -->
      <EmptyState
        v-else-if="gamesList.length === 0"
        title="No encontramos juegos con esos criterios"
        description="No hay resultados para la combinación de filtros aplicada. Intenta buscar otro término o limpia los filtros."
        action-label="Restablecer catálogo"
        @action="clearAllFilters"
      />

      <!-- Games Grid with Shared CatalogGameCard -->
      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4"
      >
        <CatalogGameCard
          v-for="game in gamesList"
          :key="game.id"
          :game="game"
        />
      </div>
    </div>
  </div>
</template>

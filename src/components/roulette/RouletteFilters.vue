<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGamesStore } from '@/stores/gamesStore';
import type { GameStatus, UserGame } from '@/types/game';
import {
  Layers,
  Tag,
  Monitor,
  Target,
  SlidersHorizontal,
  Check,
  Ban,
  Search,
  ChevronDown,
  Gamepad2,
} from 'lucide-vue-next';

const props = defineProps<{
  selectedStatus: GameStatus | 'ALL';
  selectedGenre: string | null;
  selectedPlatform: string | null;
  categoryGames: UserGame[];
  excludedIds: number[];
  candidateCount: number;
}>();

const emit = defineEmits<{
  (e: 'update:selectedStatus', val: GameStatus | 'ALL'): void;
  (e: 'update:selectedGenre', val: string | null): void;
  (e: 'update:selectedPlatform', val: string | null): void;
  (e: 'update:excludedIds', val: number[]): void;
}>();

const gamesStore = useGamesStore();

const isPickerOpen = ref(false);
const searchQuery = ref('');
const filterView = ref<'all' | 'included' | 'excluded'>('all');

const excludedSet = computed(() => new Set(props.excludedIds));

const excludedInCategoryCount = computed(() => {
  let count = 0;
  for (const g of props.categoryGames) {
    if (excludedSet.value.has(g.id)) count++;
  }
  return count;
});

const displayedCategoryGames = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return props.categoryGames.filter((game) => {
    const isExcluded = excludedSet.value.has(game.id);
    if (filterView.value === 'included' && isExcluded) return false;
    if (filterView.value === 'excluded' && !isExcluded) return false;
    if (q && !game.title.toLowerCase().includes(q)) return false;
    return true;
  });
});

const toggleGame = (gameId: number) => {
  const next = new Set(props.excludedIds);
  if (next.has(gameId)) {
    next.delete(gameId);
  } else {
    next.add(gameId);
  }
  emit('update:excludedIds', Array.from(next));
};

const includeAllInCategory = () => {
  const categoryIds = new Set(props.categoryGames.map((g) => g.id));
  const next = props.excludedIds.filter((id) => !categoryIds.has(id));
  emit('update:excludedIds', next);
};

const excludeAllInCategory = () => {
  const next = new Set(props.excludedIds);
  for (const g of props.categoryGames) {
    next.add(g.id);
  }
  emit('update:excludedIds', Array.from(next));
};

const invertCategorySelection = () => {
  const next = new Set(props.excludedIds);
  for (const g of props.categoryGames) {
    if (next.has(g.id)) {
      next.delete(g.id);
    } else {
      next.add(g.id);
    }
  }
  emit('update:excludedIds', Array.from(next));
};
</script>

<template>
  <div
    class="w-full rounded-lg border shadow-xs overflow-hidden"
    :style="{
      backgroundColor: 'var(--app-surface-hover)',
      borderColor: 'var(--app-border)',
    }"
  >
    <!-- Top Filter Bar -->
    <div class="w-full p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3">
      <!-- Filter Selectors -->
      <div class="flex items-center gap-3 flex-wrap w-full md:w-auto">
        <!-- Status Filter -->
        <div class="flex items-center gap-1.5">
          <Layers class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
          <select
            :value="selectedStatus"
            @change="emit('update:selectedStatus', ($event.target as HTMLSelectElement).value as GameStatus | 'ALL')"
            class="bg-transparent text-xs font-semibold py-1.5 px-2.5 rounded-md border focus:outline-hidden cursor-pointer"
            :style="{
              backgroundColor: 'var(--app-surface-hover)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }"
          >
            <option value="BACKLOG" class="bg-gray-900 text-white">Solo Backlog</option>
            <option value="COMPLETED" class="bg-gray-900 text-white">Solo Completados</option>
            <option value="PLAYING" class="bg-gray-900 text-white">Solo Jugando</option>
            <option value="WISHLIST" class="bg-gray-900 text-white">Solo Deseados</option>
            <option value="ALL" class="bg-gray-900 text-white">Todos los Juegos</option>
          </select>
        </div>

        <!-- Genre Filter -->
        <div class="flex items-center gap-1.5">
          <Tag class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
          <select
            :value="selectedGenre || ''"
            @change="emit('update:selectedGenre', ($event.target as HTMLSelectElement).value || null)"
            class="bg-transparent text-xs font-semibold py-1.5 px-2.5 rounded-md border focus:outline-hidden cursor-pointer max-w-37.5 truncate"
            :style="{
              backgroundColor: 'var(--app-surface-hover)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }"
          >
            <option value="" class="bg-gray-900 text-white">Cualquier Género</option>
            <option
              v-for="genre in gamesStore.availableGenres"
              :key="genre"
              :value="genre"
              class="bg-gray-900 text-white"
            >
              {{ genre }}
            </option>
          </select>
        </div>

        <!-- Platform Filter -->
        <div class="flex items-center gap-1.5">
          <Monitor class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
          <select
            :value="selectedPlatform || ''"
            @change="emit('update:selectedPlatform', ($event.target as HTMLSelectElement).value || null)"
            class="bg-transparent text-xs font-semibold py-1.5 px-2.5 rounded-md border focus:outline-hidden cursor-pointer max-w-37.5 truncate"
            :style="{
              backgroundColor: 'var(--app-surface-hover)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }"
          >
            <option value="" class="bg-gray-900 text-white">Cualquier Plataforma</option>
            <option
              v-for="platform in gamesStore.availablePlatforms"
              :key="platform"
              :value="platform"
              class="bg-gray-900 text-white"
            >
              {{ platform }}
            </option>
          </select>
        </div>
      </div>

      <!-- Manual Selection Toggle & Candidate Counter -->
      <div class="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-between md:justify-end">
        <button
          type="button"
          @click="isPickerOpen = !isPickerOpen"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold border transition-all cursor-pointer"
          :style="{
            backgroundColor: isPickerOpen ? 'var(--app-primary)' : 'var(--app-surface)',
            borderColor: isPickerOpen || excludedInCategoryCount > 0 ? 'var(--app-primary)' : 'var(--app-border)',
            color: isPickerOpen ? '#ffffff' : 'var(--app-text)',
          }"
        >
          <SlidersHorizontal class="w-3.5 h-3.5" />
          <span>Elegir a mano</span>
          <span
            v-if="excludedInCategoryCount > 0"
            class="px-1.5 py-0.2 rounded text-[10px] font-mono"
            :style="{
              backgroundColor: isPickerOpen ? 'rgba(0,0,0,0.35)' : 'var(--app-surface-hover)',
              color: isPickerOpen ? '#fff' : 'var(--app-primary)',
            }"
          >
            {{ excludedInCategoryCount }} excl.
          </span>
          <ChevronDown
            class="w-3.5 h-3.5 transition-transform duration-200"
            :class="{ 'rotate-180': isPickerOpen }"
          />
        </button>

        <!-- Candidate Pool Counter Badge -->
        <div class="flex items-center gap-1.5 shrink-0">
          <Target class="w-3.5 h-3.5 opacity-70" :style="{ color: 'var(--app-primary)' }" />
          <span class="text-xs font-medium" :style="{ color: 'var(--app-text-muted)' }">
            En ruleta:
          </span>
          <span
            class="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border"
            :style="{
              backgroundColor: candidateCount > 0 ? 'var(--app-surface)' : 'var(--app-surface-hover)',
              borderColor: candidateCount > 0 ? 'var(--app-primary)' : 'var(--app-border)',
              color: candidateCount > 0 ? 'var(--app-text)' : 'var(--app-text-muted)',
            }"
          >
            {{ candidateCount }} / {{ categoryGames.length }}
          </span>
        </div>
      </div>
    </div>

    <!-- Collapsible Manual Game Inclusion / Exclusion Drawer -->
    <div
      v-if="isPickerOpen"
      class="border-t p-3 sm:p-4 space-y-3"
      :style="{
        backgroundColor: 'var(--app-surface)',
        borderColor: 'var(--app-border)',
      }"
    >
      <!-- Controls Row: Search + View Filter Pills + Bulk Actions -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Search input -->
          <div
            class="flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs w-full sm:w-52"
            :style="{
              backgroundColor: 'var(--app-surface-hover)',
              borderColor: 'var(--app-border)',
            }"
          >
            <Search class="w-3.5 h-3.5 opacity-60 shrink-0" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar en esta categoría..."
              class="bg-transparent w-full text-xs focus:outline-hidden"
              :style="{ color: 'var(--app-text)' }"
            />
          </div>

          <!-- View Filter Tabs: Todos / Incluidos / Excluidos -->
          <div
            class="flex items-center gap-1 p-0.5 rounded border text-[11px] font-bold"
            :style="{
              backgroundColor: 'var(--app-surface-hover)',
              borderColor: 'var(--app-border)',
            }"
          >
            <button
              type="button"
              @click="filterView = 'all'"
              class="px-2 py-1 rounded cursor-pointer transition-colors"
              :style="{
                backgroundColor: filterView === 'all' ? 'var(--app-primary)' : 'transparent',
                color: filterView === 'all' ? '#fff' : 'var(--app-text-muted)',
              }"
            >
              Todos ({{ categoryGames.length }})
            </button>
            <button
              type="button"
              @click="filterView = 'included'"
              class="px-2 py-1 rounded cursor-pointer transition-colors"
              :style="{
                backgroundColor: filterView === 'included' ? 'var(--app-primary)' : 'transparent',
                color: filterView === 'included' ? '#fff' : 'var(--app-text-muted)',
              }"
            >
              Incluidos ({{ candidateCount }})
            </button>
            <button
              type="button"
              @click="filterView = 'excluded'"
              class="px-2 py-1 rounded cursor-pointer transition-colors"
              :style="{
                backgroundColor: filterView === 'excluded' ? 'var(--app-primary)' : 'transparent',
                color: filterView === 'excluded' ? '#fff' : 'var(--app-text-muted)',
              }"
            >
              Excluidos ({{ excludedInCategoryCount }})
            </button>
          </div>
        </div>

        <!-- Bulk Action Buttons -->
        <div class="flex items-center gap-1.5 text-[11px] font-bold flex-wrap">
          <button
            type="button"
            @click="includeAllInCategory"
            class="px-2.5 py-1 rounded border cursor-pointer hover:bg-white/5 transition-colors text-emerald-400"
            :style="{ borderColor: 'var(--app-border)' }"
          >
            Incluir todos
          </button>
          <button
            type="button"
            @click="excludeAllInCategory"
            class="px-2.5 py-1 rounded border cursor-pointer hover:bg-white/5 transition-colors text-rose-400"
            :style="{ borderColor: 'var(--app-border)' }"
          >
            Excluir todos
          </button>
          <button
            type="button"
            @click="invertCategorySelection"
            class="px-2.5 py-1 rounded border cursor-pointer hover:bg-white/5 transition-colors"
            :style="{ borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }"
          >
            Invertir selección
          </button>
        </div>
      </div>

      <!-- Games Grid -->
      <div
        v-if="displayedCategoryGames.length > 0"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1"
      >
        <button
          v-for="game in displayedCategoryGames"
          :key="game.id"
          type="button"
          @click="toggleGame(game.id)"
          class="flex items-center gap-2.5 p-2 rounded-md border text-left transition-all cursor-pointer"
          :class="excludedSet.has(game.id) ? 'opacity-50 hover:opacity-80' : ''"
          :style="{
            backgroundColor: excludedSet.has(game.id)
              ? 'rgba(0, 0, 0, 0.25)'
              : 'var(--app-surface-hover)',
            borderColor: excludedSet.has(game.id)
              ? 'var(--app-border)'
              : 'var(--app-primary)',
          }"
        >
          <!-- Thumbnail -->
          <div class="w-7 h-9 rounded-xs overflow-hidden bg-black/60 shrink-0 border border-white/10">
            <img
              v-if="game.cover_url"
              :src="game.cover_url"
              :alt="game.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-500">
              <Gamepad2 class="w-3.5 h-3.5" />
            </div>
          </div>

          <!-- Title & State -->
          <div class="min-w-0 flex-1">
            <p
              class="text-xs font-bold truncate"
              :class="{ 'line-through': excludedSet.has(game.id) }"
              :style="{ color: 'var(--app-text)' }"
            >
              {{ game.title }}
            </p>
            <span
              class="text-[10px] font-mono font-bold uppercase"
              :class="excludedSet.has(game.id) ? 'text-rose-400' : 'text-emerald-400'"
            >
              {{ excludedSet.has(game.id) ? 'Excluido' : 'Incluido' }}
            </span>
          </div>

          <!-- Status Icon -->
          <div
            class="w-5 h-5 rounded flex items-center justify-center shrink-0"
            :class="
              excludedSet.has(game.id)
                ? 'bg-rose-500/15 text-rose-400'
                : 'bg-emerald-500/20 text-emerald-400'
            "
          >
            <Ban v-if="excludedSet.has(game.id)" class="w-3 h-3" />
            <Check v-else class="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      <p
        v-else
        class="text-center py-4 text-xs font-mono"
        :style="{ color: 'var(--app-text-muted)' }"
      >
        No hay juegos que coincidan con este filtro de vista.
      </p>
    </div>
  </div>
</template>

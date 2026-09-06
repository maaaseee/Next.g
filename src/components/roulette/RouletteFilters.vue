<script setup lang="ts">
import { useGamesStore } from '@/stores/gamesStore';
import type { GameStatus } from '@/types/game';
import { Layers, Tag, Monitor, Target } from 'lucide-vue-next';

defineProps<{
  selectedStatus: GameStatus | 'ALL';
  selectedGenre: string | null;
  selectedPlatform: string | null;
  candidateCount: number;
}>();

const emit = defineEmits<{
  (e: 'update:selectedStatus', val: GameStatus | 'ALL'): void;
  (e: 'update:selectedGenre', val: string | null): void;
  (e: 'update:selectedPlatform', val: string | null): void;
}>();

const gamesStore = useGamesStore();
</script>

<template>
  <div
    class="w-full p-3 sm:p-4 rounded-lg border flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs"
    :style="{
      backgroundColor: 'var(--app-surface-hover)',
      borderColor: 'var(--app-border)',
    }"
  >
    <!-- Filter Selectors -->
    <div class="flex items-center gap-3 flex-wrap w-full md:w-auto">
      <!-- Status Filter -->
      <div class="flex items-center gap-1.5">
        <Layers class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
        <select
          :value="selectedStatus"
          @change="emit('update:selectedStatus', ($event.target as HTMLSelectElement).value as any)"
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
          class="bg-transparent text-xs font-semibold py-1.5 px-2.5 rounded-md border focus:outline-hidden cursor-pointer max-w-[150px] truncate"
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
          class="bg-transparent text-xs font-semibold py-1.5 px-2.5 rounded-md border focus:outline-hidden cursor-pointer max-w-[150px] truncate"
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

    <!-- Candidate Pool Counter Badge -->
    <div class="flex items-center gap-2 shrink-0">
      <Target class="w-3.5 h-3.5 opacity-70" :style="{ color: 'var(--app-primary)' }" />
      <span class="text-xs font-medium" :style="{ color: 'var(--app-text-muted)' }">
        Candidatos:
      </span>
      <span
        class="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border"
        :style="{
          backgroundColor: candidateCount > 0 ? 'var(--app-surface-hover)' : 'var(--app-surface)',
          borderColor: candidateCount > 0 ? 'var(--app-primary)' : 'var(--app-border)',
          color: candidateCount > 0 ? 'var(--app-text)' : 'var(--app-text-muted)',
        }"
      >
        {{ candidateCount }}
      </span>
    </div>
  </div>
</template>

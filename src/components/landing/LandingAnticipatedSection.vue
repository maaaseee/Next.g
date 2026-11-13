<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import type { AnticipatedGame } from '@/types/game'
import LandingAnticipatedCard from './LandingAnticipatedCard.vue'

defineProps<{
  anticipatedGames: AnticipatedGame[]
  loading: boolean
  nowTimestamp: number
}>()
</script>

<template>
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- IGDB Header Style: Heading + Teal Underline Bar -->
    <div class="mb-5 sm:mb-6">
      <h2
        class="text-base sm:text-lg lg:text-xl font-bold uppercase tracking-wider text-white font-sans"
      >
        MÁS ANTICIPADOS
      </h2>
      <div class="h-0.75 w-9 bg-emerald-400 mt-1.5" />
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="py-20 flex flex-col items-center justify-center gap-2 opacity-60"
    >
      <Loader2 class="w-8 h-8 animate-spin" :style="{ color: 'var(--app-primary)' }" />
      <span class="text-xs font-mono uppercase tracking-wider">
        Cargando lanzamientos anticipados...
      </span>
    </div>

    <!-- Grid of Anticipated Games -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
      <LandingAnticipatedCard
        v-for="game in anticipatedGames"
        :key="game.id"
        :game="game"
        :now-timestamp="nowTimestamp"
      />
    </div>
  </section>
</template>

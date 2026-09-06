<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import type { UserGame } from '@/types/game';
import { Zap, Gamepad2, Target, Activity } from 'lucide-vue-next';

const props = defineProps<{
  candidates: UserGame[];
}>();

const emit = defineEmits<{
  (e: 'spin-end', game: UserGame): void;
}>();

const isSelecting = ref(false);
const previewGame = ref<UserGame | null>(null);
let shuffleInterval: any = null;

const pickInstant = () => {
  if (isSelecting.value || props.candidates.length === 0) return;

  isSelecting.value = true;

  const winnerIndex = Math.floor(Math.random() * props.candidates.length);
  const winner = props.candidates[winnerIndex];
  if (!winner) {
    isSelecting.value = false;
    return;
  }

  let count = 0;
  const maxCycles = 14;

  shuffleInterval = setInterval(() => {
    count++;
    const randomIndex = Math.floor(Math.random() * props.candidates.length);
    const randomItem = props.candidates[randomIndex];
    if (randomItem) {
      previewGame.value = randomItem;
    }

    if (count >= maxCycles) {
      clearInterval(shuffleInterval);
      previewGame.value = winner;

      setTimeout(() => {
        isSelecting.value = false;
        emit('spin-end', winner);
      }, 300);
    }
  }, 45);
};

onUnmounted(() => {
  if (shuffleInterval) clearInterval(shuffleInterval);
});

defineExpose({ pickInstant });
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-7 py-4">
    <!-- Telemetry Decision Chamber -->
    <div
      class="relative w-full max-w-md p-5 rounded-lg border shadow-xl flex flex-col items-center justify-center min-h-[240px] overflow-hidden"
      :style="{
        backgroundColor: 'var(--app-surface)',
        borderColor: isSelecting ? 'var(--app-primary)' : 'var(--app-border)',
      }"
    >
      <!-- Telemetry Status Header -->
      <div class="w-full flex items-center justify-between pb-2 mb-3 border-b text-xs" :style="{ borderColor: 'var(--app-border)' }">
        <div class="flex items-center gap-1.5 font-mono text-[11px]" :style="{ color: 'var(--app-text-muted)' }">
          <Activity class="w-3.5 h-3.5" :class="{ 'animate-pulse text-emerald-400': isSelecting }" />
          <span>ESTADO: {{ isSelecting ? 'EN PROCESAMIENTO' : 'LISTO' }}</span>
        </div>
        <span class="font-mono text-[11px] font-bold" :style="{ color: 'var(--app-primary)' }">
          MODO INSTANTÁNEO
        </span>
      </div>

      <!-- Active Content Preview -->
      <div v-if="previewGame" class="flex flex-col items-center text-center gap-2.5 z-10 w-full">
        <div
          class="w-20 h-28 rounded-md overflow-hidden shadow-lg border transform transition-transform duration-75"
          :class="{ 'scale-105 border-[var(--app-primary)]': isSelecting, 'border-white/10': !isSelecting }"
        >
          <img
            v-if="previewGame.cover_url"
            :src="previewGame.cover_url"
            :alt="previewGame.title"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400">
            <Gamepad2 class="w-7 h-7" />
          </div>
        </div>

        <h3 class="text-base font-bold tracking-tight max-w-[280px] truncate" :style="{ color: 'var(--app-text)' }">
          {{ previewGame.title }}
        </h3>

        <div class="flex items-center gap-2">
          <span
            v-if="previewGame.genres && previewGame.genres.length > 0"
            class="text-[10px] font-semibold px-2 py-0.5 rounded"
            :style="{
              backgroundColor: 'var(--app-surface-hover)',
              color: 'var(--app-primary)',
            }"
          >
            {{ previewGame.genres[0] }}
          </span>
          <span
            v-if="previewGame.release_year"
            class="text-[10px] font-mono"
            :style="{ color: 'var(--app-text-muted)' }"
          >
            {{ previewGame.release_year }}
          </span>
        </div>
      </div>

      <!-- Idle Ready Display -->
      <div v-else class="flex flex-col items-center justify-center text-center gap-2.5 z-10 py-4">
        <div
          class="w-12 h-12 rounded-md flex items-center justify-center border shadow-sm"
          :style="{
            backgroundColor: 'var(--app-surface-hover)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-primary)',
          }"
        >
          <Target class="w-6 h-6" />
        </div>
        <p class="text-xs font-bold font-mono uppercase tracking-wider" :style="{ color: 'var(--app-text)' }">
          Algoritmo Directo (< 1s)
        </p>
        <p class="text-[11px] max-w-xs" :style="{ color: 'var(--app-text-muted)' }">
          Calcula y bloquea un objetivo sin animaciones de desaceleración.
        </p>
      </div>
    </div>

    <!-- Action Button -->
    <div class="flex flex-col items-center gap-2">
      <button
        type="button"
        @click="pickInstant"
        :disabled="isSelecting || candidates.length === 0"
        class="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-md font-bold text-xs uppercase tracking-wider text-white shadow-md transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border"
        :style="{
          backgroundColor: 'var(--app-primary)',
          borderColor: 'var(--app-border)',
        }"
      >
        <Zap class="w-4 h-4" />
        <span>{{ isSelecting ? 'Fijando Objetivo...' : 'Ejecutar Selección Directa' }}</span>
      </button>

      <span
        v-if="candidates.length === 0"
        class="text-xs font-semibold text-rose-400"
      >
        No hay candidatos disponibles con los filtros actuales.
      </span>
      <span
        v-else
        class="text-[11px] font-mono"
        :style="{ color: 'var(--app-text-muted)' }"
      >
        Procesamiento de elección aleatoria a velocidad ultra-rápida
      </span>
    </div>
  </div>
</template>

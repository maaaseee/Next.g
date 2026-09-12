<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { UserGame } from '@/types/game';
import { formatGameRating } from '@/types/game';
import { Star, Gamepad2, SlidersVertical, Target } from 'lucide-vue-next';

const props = defineProps<{
  candidates: UserGame[];
}>();

const emit = defineEmits<{
  (e: 'spin-end', game: UserGame): void;
}>();

const isSpinning = ref(false);
const ITEM_HEIGHT = 80; // px
const VISOR_HEIGHT = 260; // px (allows seeing items before and after without dominating viewport)
const centerOffset = (VISOR_HEIGHT - ITEM_HEIGHT) / 2; // 90px

// 250-item continuous virtual strip
const BUFFER_SIZE = 250;
const reelItems = computed(() => {
  const list = props.candidates;
  if (!list || list.length === 0) return [];
  const items: { key: string; game: UserGame; originalIndex: number }[] = [];
  for (let idx = 0; idx < BUFFER_SIZE; idx++) {
    const origIndex = idx % list.length;
    const game = list[origIndex];
    if (game) {
      items.push({
        key: `slot-reel-${idx}-${game.id}`,
        game,
        originalIndex: origIndex,
      });
    }
  }
  return items;
});

const currentReelIndex = ref(6);
const translateY = ref(-(6 * ITEM_HEIGHT - centerOffset));

const initPosition = () => {
  if (props.candidates.length > 0) {
    currentReelIndex.value = Math.min(6, props.candidates.length * 2);
    translateY.value = -(currentReelIndex.value * ITEM_HEIGHT - centerOffset);
  }
};

watch(
  () => props.candidates,
  () => {
    if (!isSpinning.value) {
      initPosition();
    }
  },
  { deep: true }
);

onMounted(() => {
  initPosition();
});

const spin = () => {
  if (isSpinning.value || props.candidates.length < 2) return;

  const total = props.candidates.length;
  const winnerIndex = Math.floor(Math.random() * total);
  const winningGame = props.candidates[winnerIndex];
  if (!winningGame) return;

  const currentMod = currentReelIndex.value % total;
  const distanceToGame = (winnerIndex - currentMod + total) % total;

  // Advance forward by at least 3-4 revolutions (at least 24 items)
  const fullRevolutions = Math.max(3, Math.ceil(24 / total));
  const stepsToAdvance = fullRevolutions * total + distanceToGame;

  const nextTargetIndex = currentReelIndex.value + stepsToAdvance;

  isSpinning.value = true;
  currentReelIndex.value = nextTargetIndex;
  translateY.value = -(nextTargetIndex * ITEM_HEIGHT - centerOffset);

  setTimeout(() => {
    isSpinning.value = false;
    emit('spin-end', winningGame);

    // Silently normalize index if past 150 so we never run out of items
    if (currentReelIndex.value > 150) {
      const normalizedIndex = (currentReelIndex.value % total) + total * 3;
      currentReelIndex.value = normalizedIndex;
      translateY.value = -(normalizedIndex * ITEM_HEIGHT - centerOffset);
    }
  }, 4200);
};

defineExpose({ spin });
</script>

<template>
  <div class="w-full flex flex-col items-center justify-center gap-5 py-2">
    <!-- Scanner Housing Frame -->
    <div
      class="relative w-full md:w-3/4 max-w-4xl p-4 sm:p-5 rounded-lg border shadow-xl flex flex-col items-center"
      :style="{
        backgroundColor: 'var(--app-surface)',
        borderColor: 'var(--app-border)',
      }"
    >
      <!-- Visor Box with Center Indicator -->
      <div
        class="relative w-full h-65 rounded-md overflow-hidden border shadow-inner bg-slate-950"
        :style="{
          borderColor: 'var(--app-border)',
        }"
      >
        <!-- Center Target Indicator Reticle Line -->
        <div
          class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 border-y-2 pointer-events-none z-20 flex items-center justify-between px-3"
          :style="{
            borderColor: 'var(--app-primary)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            boxShadow: 'inset 0 0 16px rgba(0, 0, 0, 0.5)',
          }"
        >
          <!-- Left Chevron Target -->
          <div
            class="w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-l-8"
            :style="{ borderLeftColor: 'var(--app-primary)' }"
          />
          <!-- Right Chevron Target -->
          <div
            class="w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-r-8"
            :style="{ borderRightColor: 'var(--app-primary)' }"
          />
        </div>

        <!-- Top & Bottom Gradient Shadows for depth -->
        <div class="absolute top-0 inset-x-0 h-12 bg-linear-to-b from-slate-950 via-slate-950/70 to-transparent z-10 pointer-events-none" />
        <div class="absolute bottom-0 inset-x-0 h-12 bg-linear-to-t from-slate-950 via-slate-950/70 to-transparent z-10 pointer-events-none" />

        <!-- Vertical Sliding Strip -->
        <div
          v-if="candidates.length > 0"
          class="w-full flex flex-col"
          :style="{
            transform: `translateY(${translateY}px)`,
            transition: isSpinning ? 'transform 4.2s cubic-bezier(0.12, 0.8, 0.15, 1)' : 'none',
          }"
        >
          <div
            v-for="item in reelItems"
            :key="item.key"
            class="h-20 px-3 sm:px-5 flex items-center gap-3 sm:gap-4 border-b border-white/5 shrink-0"
          >
            <!-- Game Thumb -->
            <div class="w-11 h-15 rounded overflow-hidden bg-black/60 shrink-0 border border-white/15 shadow-sm">
              <img
                v-if="item.game.cover_url"
                :src="item.game.cover_url"
                :alt="item.game.title"
                class="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-500">
                <Gamepad2 class="w-5 h-5" />
              </div>
            </div>

            <!-- Game Info -->
            <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <span class="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {{ item.game.title }}
              </span>
              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-if="item.game.release_year"
                  class="text-[11px] font-mono text-gray-300 px-1.5 py-0.2 rounded bg-white/5"
                >
                  {{ item.game.release_year }}
                </span>
                <span
                  v-for="genre in (item.game.genres || []).slice(0, 2)"
                  :key="genre"
                  class="text-[10px] px-2 py-0.2 rounded bg-white/10 text-gray-200 truncate max-w-30"
                >
                  {{ genre }}
                </span>
              </div>
            </div>

            <!-- Rating badge -->
            <div
              v-if="formatGameRating(item.game.rating)"
              class="flex items-center gap-1 px-2.5 py-1 rounded bg-black/80 text-amber-300 text-xs font-bold shrink-0 border border-amber-500/30 shadow-xs"
            >
              <Star class="w-3 h-3 fill-amber-300" />
              <span>{{ formatGameRating(item.game.rating) }}</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="h-full flex items-center justify-center text-center p-4">
          <p class="text-xs text-gray-400 font-medium">
            No hay juegos para los filtros activos.
          </p>
        </div>
      </div>
    </div>

    <!-- Action Button & Status -->
    <div class="flex flex-col items-center gap-1.5">
      <button
        type="button"
        @click="spin"
        :disabled="isSpinning || candidates.length < 2"
        class="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-bold text-xs uppercase tracking-wider text-white shadow-md transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border"
        :style="{
          backgroundColor: 'var(--app-primary)',
          borderColor: 'var(--app-border)',
        }"
      >
        <SlidersVertical class="w-3.5 h-3.5" :class="{ 'animate-pulse': isSpinning }" />
        <span>{{ isSpinning ? 'Seleccionando...' : 'Sortear Juego' }}</span>
      </button>

      <span
        v-if="candidates.length === 0"
        class="text-xs font-semibold text-rose-400"
      >
        No hay candidatos disponibles con los filtros actuales.
      </span>
      <span
        v-else-if="candidates.length === 1"
        class="text-xs font-medium text-amber-300"
      >
        Se necesitan al menos 2 juegos para realizar el sorteo.
      </span>
    </div>
  </div>
</template>

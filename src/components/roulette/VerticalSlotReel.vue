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
const ITEM_HEIGHT = 110; // px
const VISOR_HEIGHT = 380; // px (allows seeing multiple games before and after the reticle)
const centerOffset = (VISOR_HEIGHT - ITEM_HEIGHT) / 2;

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
  if (isSpinning.value || props.candidates.length === 0) return;

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
  <div class="w-full flex flex-col items-center justify-center gap-8 py-3">
    <!-- Scanner HUD Housing Frame - 75% container width -->
    <div
      class="relative w-full md:w-3/4 max-w-5xl p-5 sm:p-6 rounded-lg border shadow-2xl flex flex-col items-center"
      :style="{
        backgroundColor: 'var(--app-surface)',
        borderColor: 'var(--app-border)',
      }"
    >
      <!-- Telemetry Header -->
      <div class="w-full flex items-center justify-between pb-3 mb-3 border-b text-xs" :style="{ borderColor: 'var(--app-border)' }">
        <div class="flex items-center gap-2.5">
          <div class="w-2.5 h-2.5 rounded-xs" :style="{ backgroundColor: 'var(--app-primary)' }" />
          <span class="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider" :style="{ color: 'var(--app-text)' }">
            ESCÁNER SECUENCIAL DE PRECISIÓN
          </span>
        </div>
        <div class="flex items-center gap-1.5 font-mono text-xs" :style="{ color: 'var(--app-text-muted)' }">
          <Target class="w-4 h-4" />
          <span>{{ candidates.length }} OBJETIVOS</span>
        </div>
      </div>

      <!-- Visor Box with Center HUD Indicator -->
      <div
        class="relative w-full h-[380px] rounded-md overflow-hidden border shadow-inner"
        :style="{
          backgroundColor: '#090d16',
          borderColor: 'var(--app-border)',
        }"
      >
        <!-- Center Target Laser Reticle Line -->
        <div
          class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[110px] border-y-2 pointer-events-none z-20 flex items-center justify-between px-3"
          :style="{
            borderColor: 'var(--app-primary)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5)',
          }"
        >
          <!-- Left Chevron Target -->
          <div
            class="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-[10px]"
            :style="{ borderLeftColor: 'var(--app-primary)' }"
          />
          <!-- Right Chevron Target -->
          <div
            class="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-[10px]"
            :style="{ borderRightColor: 'var(--app-primary)' }"
          />
        </div>

        <!-- Top & Bottom Gradient Shadows for depth -->
        <div class="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#090d16] via-[#090d16]/70 to-transparent z-10 pointer-events-none" />
        <div class="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#090d16] via-[#090d16]/70 to-transparent z-10 pointer-events-none" />

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
            class="h-[110px] px-4 sm:px-6 flex items-center gap-4 sm:gap-6 border-b border-white/5 shrink-0"
          >
            <!-- Game Thumb -->
            <div class="w-16 h-22 rounded-md overflow-hidden bg-black/60 shrink-0 border border-white/15 shadow-md">
              <img
                v-if="item.game.cover_url"
                :src="item.game.cover_url"
                :alt="item.game.title"
                class="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-500">
                <Gamepad2 class="w-6 h-6" />
              </div>
            </div>

            <!-- Game Info -->
            <div class="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
              <span class="text-base sm:text-lg font-black text-white tracking-tight truncate">
                {{ item.game.title }}
              </span>
              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-if="item.game.release_year"
                  class="text-xs font-mono text-gray-300 font-semibold px-2 py-0.5 rounded bg-white/5"
                >
                  {{ item.game.release_year }}
                </span>
                <span
                  v-for="genre in (item.game.genres || []).slice(0, 2)"
                  :key="genre"
                  class="text-[11px] px-2.5 py-0.5 rounded bg-white/10 text-gray-200 font-medium truncate max-w-[140px]"
                >
                  {{ genre }}
                </span>
              </div>
            </div>

            <!-- Rating badge -->
            <div
              v-if="formatGameRating(item.game.rating)"
              class="flex items-center gap-1.5 px-3 py-1 rounded bg-black/80 text-amber-300 text-xs sm:text-sm font-bold shrink-0 border border-amber-500/30 shadow-sm"
            >
              <Star class="w-3.5 h-3.5 fill-amber-300" />
              <span>{{ formatGameRating(item.game.rating) }}</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="h-full flex items-center justify-center text-center p-4">
          <p class="text-xs text-gray-400 font-medium">
            No hay objetivos para los filtros activos.
          </p>
        </div>
      </div>
    </div>

    <!-- Action Button -->
    <div class="flex flex-col items-center gap-2">
      <button
        type="button"
        @click="spin"
        :disabled="isSpinning || candidates.length === 0"
        class="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-md font-bold text-xs uppercase tracking-wider text-white shadow-md transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border"
        :style="{
          backgroundColor: 'var(--app-primary)',
          borderColor: 'var(--app-border)',
        }"
      >
        <SlidersVertical class="w-4 h-4" :class="{ 'animate-pulse': isSpinning }" />
        <span>{{ isSpinning ? 'Escaneando Secuencia...' : 'Ejecutar Escáner' }}</span>
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
        El visor se detendrá automáticamente en el objetivo seleccionado
      </span>
    </div>
  </div>
</template>

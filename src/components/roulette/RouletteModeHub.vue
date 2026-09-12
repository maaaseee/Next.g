<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import type { RouletteMode } from '@/types/theme';
import { useGamesStore } from '@/stores/gamesStore';
import { useTheme } from '@/composables/useTheme';
import { Compass, SlidersVertical, Zap, ChevronRight, Sparkles, Star, Gamepad2 } from 'lucide-vue-next';

defineEmits<{
  (e: 'select-mode', mode: RouletteMode): void;
}>();

const gamesStore = useGamesStore();
const { currentTheme, themes } = useTheme();
const hoveredCard = ref<RouletteMode | null>(null);

const currentThemeOption = computed(() => {
  return themes.find((t) => t.id === currentTheme.value) || themes[0];
});

const dialShades = computed(() => {
  return currentThemeOption.value?.wheelShades || [
    '#131a27', '#1a2332', '#0f1724', '#172233',
    '#111928', '#1e293b', '#141d2d', '#1c2638',
  ];
});

// Rich sample game catalogue for the simulation
const SAMPLE_GAMES = [
  { id: '1', title: 'The Witcher 3: Wild Hunt', year: 2015, genre: 'RPG', rating: 9.4, cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg' },
  { id: '2', title: 'Cyberpunk 2077', year: 2020, genre: 'Action', rating: 8.8, cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2mdf.jpg' },
  { id: '3', title: 'Elden Ring', year: 2022, genre: 'RPG', rating: 9.6, cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg' },
  { id: '4', title: 'Hollow Knight', year: 2017, genre: 'Metroidvania', rating: 9.2, cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co93d7.jpg' },
  { id: '5', title: 'God of War Ragnarök', year: 2022, genre: 'Adventure', rating: 9.5, cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5s5v.jpg' },
  { id: '6', title: 'Red Dead Redemption 2', year: 2018, genre: 'Action', rating: 9.7, cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.jpg' },
  { id: '7', title: "Baldur's Gate 3", year: 2023, genre: 'RPG', rating: 9.6, cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co670h.jpg' },
  { id: '8', title: 'Hades II', year: 2024, genre: 'Roguelike', rating: 9.3, cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co8300.jpg' },
];

const baseGames = computed(() => {
  if (gamesStore.games && gamesStore.games.length >= 3) {
    return gamesStore.games.slice(0, 8).map((g) => ({
      id: String(g.id),
      title: g.title,
      year: g.release_year || 2024,
      genre: g.genres && g.genres[0] ? g.genres[0] : 'Juego',
      rating: g.rating || 8.5,
      cover: g.cover_url || '',
    }));
  }
  return SAMPLE_GAMES;
});

// ==========================================
// 1. DIAL CIRCULAR PREVIEW ENGINE (Canvas + Auto-Spin)
// ==========================================
const miniDialCanvasRef = ref<HTMLCanvasElement | null>(null);
const dialRotationAngle = ref(0);
const isDialSpinning = ref(false);
const dialWinnerGame = ref<(typeof SAMPLE_GAMES)[0] | null>(null);
let autoDialTimer: any = null;

const drawDialPreviewWheel = () => {
  const canvas = miniDialCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width / 2 - 8;

  ctx.clearRect(0, 0, width, height);

  const list = baseGames.value;
  const total = list.length;
  if (total === 0) return;

  const arc = (2 * Math.PI) / total;
  const shades = dialShades.value;

  // Draw Slices
  for (let i = 0; i < total; i++) {
    const angle = i * arc;
    const game = list[i];
    if (!game) continue;

    // Sector body
    ctx.beginPath();
    ctx.fillStyle = shades[i % shades.length] || '#131a27';
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + arc);
    ctx.lineTo(centerX, centerY);
    ctx.fill();

    // Slice border line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Text label - Clean and readable
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle + arc / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 9px system-ui, -apple-system, sans-serif';
    const shortTitle = game.title.length > 12 ? game.title.slice(0, 11) + '…' : game.title;
    ctx.fillText(shortTitle, radius - 8, 0);
    ctx.restore();
  }

  // Outer ring
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center Hub
  ctx.beginPath();
  ctx.arc(centerX, centerY, 16, 0, 2 * Math.PI);
  ctx.fillStyle = currentThemeOption.value?.surfaceColor || '#0f172a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center Pip
  ctx.beginPath();
  ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
  ctx.fillStyle = currentThemeOption.value?.primaryColor || '#6366f1';
  ctx.fill();
};

const runDialPreviewCycle = () => {
  if (isDialSpinning.value) return;

  const total = baseGames.value.length;
  if (total === 0) return;

  const winnerIndex = Math.floor(Math.random() * total);
  const winningGame = baseGames.value[winnerIndex];
  if (!winningGame) return;

  const arcDeg = 360 / total;
  // Center angle of slice in canvas space (3 o'clock is 0deg)
  const sliceCenterDeg = (winnerIndex + 0.5) * arcDeg;
  // Top pointer is at 12 o'clock (270deg)
  const currentAngleMod = dialRotationAngle.value % 360;
  const targetMod = (270 - sliceCenterDeg + 360) % 360;
  const deltaForward = (targetMod - currentAngleMod + 360) % 360;
  
  // Advance by 4 full revolutions (1440deg) + forward offset
  const spinsToAdd = 1440 + deltaForward;

  isDialSpinning.value = true;
  dialRotationAngle.value += spinsToAdd;

  setTimeout(() => {
    isDialSpinning.value = false;
    dialWinnerGame.value = winningGame;

    // Highlight winner for 2.2s
    setTimeout(() => {
      // Normalize angle silently if high
      if (dialRotationAngle.value > 5000) {
        dialRotationAngle.value = dialRotationAngle.value % 360;
      }
      autoDialTimer = setTimeout(runDialPreviewCycle, 1000);
    }, 2200);
  }, 3400);
};

// Redraw canvas on theme or game changes
watch([baseGames, dialShades], () => {
  nextTick(drawDialPreviewWheel);
});

// ==========================================
// 2. ESCÁNER VERTICAL PREVIEW (Pure Seamless Infinite Loop)
// ==========================================
// 2 identical duplicate sets to ensure 100% seamless mathematical loop with translateY(-50%)
const previewLoopGames = computed(() => {
  const list = baseGames.value;
  return [...list, ...list];
});

onMounted(() => {
  nextTick(() => {
    drawDialPreviewWheel();
  });
  autoDialTimer = setTimeout(runDialPreviewCycle, 800);
});

onUnmounted(() => {
  if (autoDialTimer) clearTimeout(autoDialTimer);
});
</script>

<template>
  <div class="w-full max-w-6xl mx-auto space-y-6">
    <!-- Hub Header Banner (Concise and serious) -->
    <div class="text-center max-w-2xl mx-auto mb-5 space-y-1.5">
      <h2 class="text-xl sm:text-2xl font-display font-extrabold tracking-tight" :style="{ color: 'var(--app-text)' }">
        Selecciona el Tipo de Ruleta
      </h2>
      <p class="text-xs sm:text-sm" :style="{ color: 'var(--app-text-muted)' }">
        Elige cómo quieres descubrir tu próximo juego a jugar de tu backlog.
      </p>
    </div>

    <!-- 3 Mode Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
      <!-- MODE 1: Ruleta Tradicional -->
      <div
        class="group relative rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: hoveredCard === 'classic' ? 'var(--app-primary)' : 'var(--app-border)',
          boxShadow: hoveredCard === 'classic' ? '0 12px 30px rgba(0, 0, 0, 0.4), 0 0 16px var(--app-primary)' : 'none',
        }"
        @mouseenter="hoveredCard = 'classic'"
        @mouseleave="hoveredCard = null"
      >
        <!-- Top Action Button Only -->
        <button
          type="button"
          @click="$emit('select-mode', 'classic')"
          class="w-full flex items-center justify-between px-3.5 py-3 rounded-md font-bold text-xs uppercase tracking-wider text-white shadow-md transition-all duration-150 cursor-pointer group-hover:scale-[1.02] border"
          :style="{
            backgroundColor: 'var(--app-primary)',
            borderColor: 'var(--app-border)',
          }"
        >
          <div class="flex items-center gap-2">
            <Compass class="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
            <span>Ruleta Tradicional</span>
          </div>
          <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <!-- Live Visual Preview: Authentic Rotating Dial Wheel (Auto-Spinning) -->
        <div
          class="mt-4 pt-2 border-t flex flex-col items-center justify-center h-42.5 rounded-lg overflow-hidden relative cursor-pointer bg-slate-950"
          :style="{
            borderColor: 'var(--app-border)',
          }"
          @click="$emit('select-mode', 'classic')"
        >
          <!-- Top Minimal Pointer Needle at 12 o'clock -->
          <div class="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-xs">
            <div
              class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[9px]"
              :style="{ borderTopColor: 'var(--app-primary)' }"
            />
          </div>

          <!-- Dynamic Rotating Canvas Wheel Preview -->
          <div
            class="relative flex items-center justify-center transition-transform"
            :style="{
              transform: `rotate(${dialRotationAngle}deg)`,
              transition: isDialSpinning ? 'transform 3.4s cubic-bezier(0.15, 0.85, 0.2, 1)' : 'none',
            }"
          >
            <canvas
              ref="miniDialCanvasRef"
              width="280"
              height="280"
              class="w-28 h-28 rounded-full shadow-xl"
            />
          </div>

          <!-- Mini Target Winner HUD Badge -->
          <div class="absolute bottom-1.5 inset-x-2 flex items-center justify-center pointer-events-none z-10">
            <div
              class="px-2 py-0.5 rounded text-[10px] font-mono font-bold truncate max-w-[90%] border transition-all duration-300"
              :class="isDialSpinning ? '' : 'text-slate-200'"
              :style="{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                borderColor: isDialSpinning ? 'var(--app-primary)' : 'rgba(255, 255, 255, 0.1)',
                color: isDialSpinning ? 'var(--app-primary)' : undefined,
              }"
            >
              <span v-if="isDialSpinning" class="animate-pulse">GIRANDO...</span>
              <span v-else-if="dialWinnerGame">{{ dialWinnerGame.title }}</span>
              <span v-else>RULETA TRADICIONAL</span>
            </div>
          </div>
        </div>
      </div>

      <!-- MODE 2: Selector Vertical -->
      <div
        class="group relative rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: hoveredCard === 'slot' ? 'var(--app-primary)' : 'var(--app-border)',
          boxShadow: hoveredCard === 'slot' ? '0 12px 30px rgba(0, 0, 0, 0.4), 0 0 16px var(--app-primary)' : 'none',
        }"
        @mouseenter="hoveredCard = 'slot'"
        @mouseleave="hoveredCard = null"
      >
        <!-- Top Action Button Only -->
        <button
          type="button"
          @click="$emit('select-mode', 'slot')"
          class="w-full flex items-center justify-between px-3.5 py-3 rounded-md font-bold text-xs uppercase tracking-wider text-white shadow-md transition-all duration-150 cursor-pointer group-hover:scale-[1.02] border"
          :style="{
            backgroundColor: 'var(--app-primary)',
            borderColor: 'var(--app-border)',
          }"
        >
          <div class="flex items-center gap-2">
            <SlidersVertical class="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Selector Vertical</span>
          </div>
          <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <!-- Live Visual Preview: Authentic Vertical Slot Reel Visor -->
        <div
          class="mt-4 pt-2 border-t flex flex-col items-center justify-center h-42.5 rounded-lg overflow-hidden relative cursor-pointer bg-slate-950"
          :style="{
            borderColor: 'var(--app-border)',
          }"
          @click="$emit('select-mode', 'slot')"
        >
          <!-- Center Target Indicator Reticle Line & Chevrons -->
          <div
            class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-13 border-y pointer-events-none z-20 flex items-center justify-between px-2"
            :style="{
              borderColor: 'var(--app-primary)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              boxShadow: 'inset 0 0 12px rgba(0, 0, 0, 0.6)',
            }"
          >
            <!-- Left Chevron -->
            <div
              class="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-[6px]"
              :style="{ borderLeftColor: 'var(--app-primary)' }"
            />
            <!-- Right Chevron -->
            <div
              class="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-[6px]"
              :style="{ borderRightColor: 'var(--app-primary)' }"
            />
          </div>

          <!-- Top & Bottom Gradient Shadows for Visor Depth -->
          <div class="absolute top-0 inset-x-0 h-8 bg-linear-to-b from-slate-950 via-slate-950/80 to-transparent z-10 pointer-events-none" />
          <div class="absolute bottom-0 inset-x-0 h-8 bg-linear-to-t from-slate-950 via-slate-950/80 to-transparent z-10 pointer-events-none" />

          <!-- Continuous Vertical Sliding Strip (100% Seamless Infinite CSS Loop) -->
          <div class="slot-infinite-track w-full flex flex-col">
            <div
              v-for="(item, idx) in previewLoopGames"
              :key="`preview-loop-${idx}-${item.id}`"
              class="h-13 flex items-center gap-2.5 px-3 border-b border-white/5 shrink-0"
            >
              <img
                :src="item.cover"
                :alt="item.title"
                class="w-8 h-10 object-cover rounded shadow-xs shrink-0"
              />
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold truncate text-slate-200">{{ item.title }}</p>
                <p class="text-[10px] text-slate-400 truncate">{{ item.genre }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODE 3: Selección Rápida -->
      <div
        class="group relative rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: hoveredCard === 'instant' ? 'var(--app-primary)' : 'var(--app-border)',
          boxShadow: hoveredCard === 'instant' ? '0 12px 30px rgba(0, 0, 0, 0.4), 0 0 16px var(--app-primary)' : 'none',
        }"
        @mouseenter="hoveredCard = 'instant'"
        @mouseleave="hoveredCard = null"
      >
        <!-- Top Action Button Only -->
        <button
          type="button"
          @click="$emit('select-mode', 'instant')"
          class="w-full flex items-center justify-between px-3.5 py-3 rounded-md font-bold text-xs uppercase tracking-wider text-white shadow-md transition-all duration-150 cursor-pointer group-hover:scale-[1.02] border"
          :style="{
            backgroundColor: 'var(--app-primary)',
            borderColor: 'var(--app-border)',
          }"
        >
          <div class="flex items-center gap-2">
            <Zap class="w-4 h-4 group-hover:animate-bounce" />
            <span>Selección Rápida</span>
          </div>
          <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <!-- Live Visual Preview -->
        <div
          class="mt-4 pt-2 border-t flex flex-col items-center justify-center h-42.5 rounded-lg overflow-hidden relative cursor-pointer bg-slate-950"
          :style="{
            borderColor: 'var(--app-border)',
          }"
          @click="$emit('select-mode', 'instant')"
        >
          <!-- Radar Pulse Effect -->
          <div
            class="w-20 h-20 rounded-full border-2 flex items-center justify-center relative transition-all duration-300"
            :class="hoveredCard === 'instant' ? 'scale-110' : ''"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-primary)',
              boxShadow: hoveredCard === 'instant' ? '0 0 20px var(--app-primary)' : '0 0 8px var(--app-primary)',
            }"
          >
            <Zap class="w-8 h-8" :style="{ color: 'var(--app-primary)' }" />
            <div
              class="absolute inset-0 rounded-full border border-dashed animate-spin"
              :style="{ borderColor: 'var(--app-primary)', animationDuration: '6s' }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slot-infinite-track {
  animation: slotInfiniteScroll 10s linear infinite;
  will-change: transform;
}

@keyframes slotInfiniteScroll {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-50%);
  }
}
</style>


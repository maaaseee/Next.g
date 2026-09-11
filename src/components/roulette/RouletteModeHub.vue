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

    // Text label
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    const shortTitle = game.title.length > 10 ? game.title.slice(0, 9) + '…' : game.title;
    ctx.fillText(shortTitle, radius - 10, 3);
    ctx.restore();
  }

  // Outer ring
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Center Hub
  ctx.beginPath();
  ctx.arc(centerX, centerY, 18, 0, 2 * Math.PI);
  ctx.fillStyle = '#0a0f1d';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center Pip
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
  ctx.fillStyle = '#38bdf8';
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
    <!-- Header banner -->
    <div class="text-center max-w-2xl mx-auto space-y-2 mb-8">
      <div
        class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border shadow-sm"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-primary)',
        }"
      >
        <Sparkles class="w-3.5 h-3.5" />
        <span>SISTEMAS DE ELECCIÓN ALEATORIA</span>
      </div>
      <h2 class="text-2xl sm:text-3xl font-display font-extrabold tracking-tight" :style="{ color: 'var(--app-text)' }">
        Selecciona tu Experiencia de Ruleta
      </h2>
      <p class="text-xs sm:text-sm" :style="{ color: 'var(--app-text-muted)' }">
        Elige uno de los 3 algoritmos de sorteo táctico para descubrir tu próxima partida.
      </p>
    </div>

    <!-- 3 Mode Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
      <!-- MODE 1: Dial Circular -->
      <div
        class="group relative rounded-xl border p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
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
          class="w-full flex items-center justify-between px-4 py-3.5 rounded-md font-bold text-xs uppercase tracking-wider text-white shadow-md transition-all duration-150 cursor-pointer group-hover:scale-[1.02] border"
          :style="{
            backgroundColor: 'var(--app-primary)',
            borderColor: 'var(--app-border)',
          }"
        >
          <div class="flex items-center gap-2.5">
            <Compass class="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
            <span>Dial Circular</span>
          </div>
          <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <!-- Live Visual Preview: Authentic Rotating Dial Wheel (Auto-Spinning) -->
        <div
          class="mt-5 pt-3 border-t flex flex-col items-center justify-center h-[220px] rounded-lg overflow-hidden relative cursor-pointer bg-slate-950"
          :style="{
            borderColor: 'var(--app-border)',
          }"
          @click="$emit('select-mode', 'classic')"
        >
          <!-- Top Laser Pointer at 12 o'clock -->
          <div class="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
            <div
              class="w-2 h-3.5 rounded-xs transition-transform duration-100"
              :class="{ 'scale-125 animate-pulse': isDialSpinning }"
              :style="{
                backgroundColor: 'var(--app-primary)',
                boxShadow: '0 0 10px var(--app-primary)',
              }"
            />
            <div
              class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px]"
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
              class="w-36 h-36 rounded-full shadow-2xl"
            />
          </div>

          <!-- Mini Target Winner HUD Badge -->
          <div class="absolute bottom-2 inset-x-2 flex items-center justify-center pointer-events-none z-10">
            <div
              class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold truncate max-w-[90%] border transition-all duration-300"
              :class="isDialSpinning ? '' : 'text-slate-200'"
              :style="{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                borderColor: isDialSpinning ? 'var(--app-primary)' : 'rgba(255, 255, 255, 0.1)',
                color: isDialSpinning ? 'var(--app-primary)' : undefined,
              }"
            >
              <span v-if="isDialSpinning" class="animate-pulse">GIRANDO DIAL...</span>
              <span v-else-if="dialWinnerGame">{{ dialWinnerGame.title }}</span>
              <span v-else>DIAL CIRCULAR</span>
            </div>
          </div>
        </div>
      </div>

      <!-- MODE 2: Escáner Vertical (Authentic Continuous Slot Spin Engine) -->
      <div
        class="group relative rounded-xl border p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
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
          class="w-full flex items-center justify-between px-4 py-3.5 rounded-md font-bold text-xs uppercase tracking-wider text-white shadow-md transition-all duration-150 cursor-pointer group-hover:scale-[1.02] border"
          :style="{
            backgroundColor: 'var(--app-primary)',
            borderColor: 'var(--app-border)',
          }"
        >
          <div class="flex items-center gap-2.5">
            <SlidersVertical class="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Escáner Vertical</span>
          </div>
          <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <!-- Live Visual Preview: Authentic Vertical Slot Reel Visor -->
        <div
          class="mt-5 pt-3 border-t flex flex-col items-center justify-center h-[220px] rounded-lg overflow-hidden relative cursor-pointer bg-slate-950"
          :style="{
            borderColor: 'var(--app-border)',
          }"
          @click="$emit('select-mode', 'slot')"
        >
          <!-- Center Target Laser Reticle Line & Chevrons -->
          <div
            class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[64px] border-y-2 pointer-events-none z-20 flex items-center justify-between px-2"
            :style="{
              borderColor: 'var(--app-primary)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.6)',
            }"
          >
            <!-- Left Chevron -->
            <div
              class="w-0 h-0 border-t-5 border-t-transparent border-b-5 border-b-transparent border-l-[7px]"
              :style="{ borderLeftColor: 'var(--app-primary)' }"
            />
            <!-- Right Chevron -->
            <div
              class="w-0 h-0 border-t-5 border-t-transparent border-b-5 border-b-transparent border-r-[7px]"
              :style="{ borderRightColor: 'var(--app-primary)' }"
            />
          </div>

          <!-- Top & Bottom Gradient Shadows for Visor Depth -->
          <div class="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent z-10 pointer-events-none" />
          <div class="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-10 pointer-events-none" />

          <!-- Continuous Vertical Sliding Strip (100% Seamless Infinite CSS Loop) -->
          <div class="slot-infinite-track w-full flex flex-col">
            <div
              v-for="(item, idx) in previewLoopGames"
              :key="`preview-loop-${idx}-${item.id}`"
              class="h-[64px] flex items-center gap-3 px-4 border-b border-white/5 shrink-0"
            >
              <img
                :src="item.cover"
                :alt="item.title"
                class="w-10 h-12 object-cover rounded shadow-xs shrink-0"
              />
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold truncate text-slate-200">{{ item.title }}</p>
                <p class="text-[10px] text-slate-400 truncate">{{ item.genre }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mode 3: Instant Quick Pick Card -->
      <div
        class="border rounded-xl p-5 flex flex-col justify-between transition-all duration-300 relative group overflow-hidden shadow-lg"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: hoveredCard === 'instant' ? 'var(--app-primary)' : 'var(--app-border)',
        }"
        @mouseenter="hoveredCard = 'instant'"
        @mouseleave="hoveredCard = null"
      >
        <!-- Header -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200"
              :style="{
                backgroundColor: 'var(--app-surface-hover)',
                color: 'var(--app-primary)',
              }"
            >
              <Zap class="w-5 h-5" />
            </div>
            <span
              class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
              :style="{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--app-text-muted)',
              }"
            >
              Express
            </span>
          </div>

          <h3 class="text-base font-black text-white flex items-center gap-2">
            Selección Directa
          </h3>

          <p class="text-xs leading-relaxed" :style="{ color: 'var(--app-text-muted)' }">
            Tirada rápida sin animaciones. Perfecto si tienes poco tiempo y solo quieres que el sistema elija por ti de inmediato.
          </p>
        </div>

        <!-- Launch Button -->
        <button
          type="button"
          @click="$emit('select-mode', 'instant')"
          class="w-full mt-4 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-between transition-all duration-200 cursor-pointer text-white shadow-md active:scale-98"
          :style="{
            backgroundColor: 'var(--app-primary)',
          }"
        >
          <div class="flex items-center gap-2.5">
            <Zap class="w-4 h-4 group-hover:animate-bounce" />
            <span>Selección Directa</span>
          </div>
          <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <!-- Live Visual Preview -->
        <div
          class="mt-5 pt-3 border-t flex flex-col items-center justify-center min-h-[220px] rounded-lg overflow-hidden relative cursor-pointer bg-slate-950"
          :style="{
            borderColor: 'var(--app-border)',
          }"
          @click="$emit('select-mode', 'instant')"
        >
          <!-- Radar Pulse Effect -->
          <div
            class="w-24 h-24 rounded-full border-2 flex items-center justify-center relative transition-all duration-300"
            :class="hoveredCard === 'instant' ? 'scale-110' : ''"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-primary)',
              boxShadow: hoveredCard === 'instant' ? '0 0 24px var(--app-primary)' : '0 0 10px var(--app-primary)',
            }"
          >
            <Zap class="w-10 h-10" :style="{ color: 'var(--app-primary)' }" />
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


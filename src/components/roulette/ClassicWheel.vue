<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { UserGame } from '@/types/game';
import { formatGameRating } from '@/types/game';
import { useTheme } from '@/composables/useTheme';
import { Compass, Gamepad2, Star } from 'lucide-vue-next';

const props = defineProps<{
  candidates: UserGame[];
}>();

const emit = defineEmits<{
  (e: 'spin-end', game: UserGame): void;
}>();

const { currentTheme, themes } = useTheme();

const dialStageRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isSpinning = ref(false);
const rotationAngle = ref(0);

// Hover & Tooltip state
const hoveredGame = ref<UserGame | null>(null);
const tooltipX = ref(0);
const tooltipY = ref(0);

// Active theme info for wheel coloring
const currentThemeOption = computed(() => {
  return themes.find((t) => t.id === currentTheme.value) || themes[0];
});

// Dynamic sector color shades from the active theme
const wheelShades = computed(() => {
  return currentThemeOption.value?.wheelShades || [
    '#131a27', '#1a2332', '#0f1724', '#172233',
    '#111928', '#1e293b', '#141d2d', '#1c2638',
  ];
});

// Up to 16 sectors rendered for crisp readability
const activeSlices = computed(() => {
  if (props.candidates.length === 0) return [];
  if (props.candidates.length <= 16) return props.candidates;
  return props.candidates.slice(0, 16);
});

const drawWheel = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width / 2 - 20;

  ctx.clearRect(0, 0, width, height);

  const total = activeSlices.value.length;
  if (total === 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = currentThemeOption.value?.surfaceColor || '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SIN OBJETIVOS DISPONIBLES', centerX, centerY);
    return;
  }

  const arc = (2 * Math.PI) / total;
  const shades = wheelShades.value;
  const hubRadius = 36;

  // 1. Draw Slices
  for (let i = 0; i < total; i++) {
    const startAngle = i * arc;
    const endAngle = startAngle + arc;
    const game = activeSlices.value[i];
    if (!game) continue;

    // Slice Body
    ctx.beginPath();
    ctx.fillStyle = shades[i % shades.length] || '#131a27';
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // Clean subtle divider between slices
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Special case 1: Single element (full circle) -> clean horizontal centered text
    if (total === 1) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const maxTextWidth = radius * 1.5;
      let title = game.title;
      if (ctx.measureText(title).width > maxTextWidth) {
        while (title.length > 3 && ctx.measureText(title + '…').width > maxTextWidth) {
          title = title.slice(0, -1);
        }
        title += '…';
      }
      ctx.fillText(title, centerX, centerY + radius * 0.4);
      ctx.restore();
      continue;
    }

    // Special case 2: Exactly two elements (sectors are bottom [0, PI] and top [PI, 2PI])
    // The bisectors are at midAngle = PI/2 (90°, bottom) and 3PI/2 (270°, top).
    // Both sectors are horizontal, so we draw their text horizontally centered in each half!
    if (total === 2) {
      ctx.save();
      ctx.translate(centerX, centerY);

      // Slices: i=0 is bottom half [0 to PI], i=1 is top half [PI to 2*PI].
      // Both sectors are separated by the X axis (y=0).
      // Placing text at y = +radius*0.48 (bottom half) and y = -radius*0.48 (top half)
      // puts them right in the middle of each compartment, perfectly horizontal and upright!
      const textY = i === 0 ? radius * 0.48 : -radius * 0.48;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const maxTextWidth = radius * 1.4;
      let title = game.title;
      if (ctx.measureText(title).width > maxTextWidth) {
        while (title.length > 3 && ctx.measureText(title + '…').width > maxTextWidth) {
          title = title.slice(0, -1);
        }
        title += '…';
      }
      ctx.fillText(title, 0, textY);
      ctx.restore();
      continue;
    }

    // General case: 3 or more elements
    // We calculate the bisector angle of the slice (startAngle + arc / 2)
    const midAngle = startAngle + arc / 2;
    // Normalize midAngle to [0, 2*PI)
    const normalizedAngle = ((midAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const isLeftHalf = normalizedAngle > Math.PI / 2 && normalizedAngle < (3 * Math.PI) / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(midAngle);

    // If the sector points to the left half, a normal radial rotation would orient text upside down.
    // We flip by 180 degrees (Math.PI) so it is always read naturally left-to-right!
    if (isLeftHalf) {
      ctx.rotate(Math.PI);
      ctx.textAlign = 'left';
    } else {
      ctx.textAlign = 'right';
    }

    ctx.textBaseline = 'middle';

    // Clear readable font
    const fontSize = total > 12 ? 12 : total > 8 ? 14 : 16;
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = '#ffffff';

    const maxTextWidth = radius - hubRadius - 30;
    let title = game.title;

    if (ctx.measureText(title).width > maxTextWidth) {
      while (title.length > 3 && ctx.measureText(title + '…').width > maxTextWidth) {
        title = title.slice(0, -1);
      }
      title += '…';
    }

    // Centered radially along the bisector:
    // When textAlign is 'right', position near outer edge (radius - 18)
    // When textAlign is 'left', position near outer edge (-radius + 18)
    const textOffset = isLeftHalf ? -radius + 18 : radius - 18;
    ctx.fillText(title, textOffset, 0);
    ctx.restore();
  }

  // 2. Clean Outer Border (No noisy ticks, no fake dial gauges)
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 3. Simple Elegant Center Cap
  ctx.beginPath();
  ctx.arc(centerX, centerY, hubRadius, 0, 2 * Math.PI);
  ctx.fillStyle = currentThemeOption.value?.surfaceColor || '#0f172a';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, hubRadius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Small inner center accent
  ctx.beginPath();
  ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
  ctx.fillStyle = currentThemeOption.value?.primaryColor || '#6366f1';
  ctx.fill();
};

const handleMouseMove = (event: MouseEvent) => {
  if (isSpinning.value || activeSlices.value.length === 0) {
    hoveredGame.value = null;
    return;
  }

  const canvas = canvasRef.value;
  const stage = dialStageRef.value;
  if (!canvas || !stage) return;

  const rect = canvas.getBoundingClientRect();
  const clientX = event.clientX;
  const clientY = event.clientY;

  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    hoveredGame.value = null;
    return;
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const visualRadius = rect.width / 2;
  const visualInnerHub = 36 * (rect.width / canvas.width);

  if (dist < visualInnerHub || dist > visualRadius) {
    hoveredGame.value = null;
    return;
  }

  let angleRad = Math.atan2(dy, dx);
  if (angleRad < 0) angleRad += 2 * Math.PI;

  const normalizedRotation = ((rotationAngle.value % 360) * Math.PI) / 180;
  let relativeAngle = (angleRad - (normalizedRotation % (2 * Math.PI))) % (2 * Math.PI);
  if (relativeAngle < 0) relativeAngle += 2 * Math.PI;

  const total = activeSlices.value.length;
  const sliceAngle = (2 * Math.PI) / total;
  const index = Math.floor(relativeAngle / sliceAngle);

  if (index >= 0 && index < total) {
    hoveredGame.value = activeSlices.value[index] || null;

    const stageRect = stage.getBoundingClientRect();
    tooltipX.value = clientX - stageRect.left;
    tooltipY.value = clientY - stageRect.top;
  } else {
    hoveredGame.value = null;
  }
};

const handleMouseLeave = () => {
  hoveredGame.value = null;
};

const spin = () => {
  if (isSpinning.value || activeSlices.value.length < 2) return;

  hoveredGame.value = null;
  isSpinning.value = true;

  const total = activeSlices.value.length;
  const winningIndex = Math.floor(Math.random() * total);
  const winningGame = activeSlices.value[winningIndex];
  if (!winningGame) {
    isSpinning.value = false;
    return;
  }

  const sliceDegrees = 360 / total;
  const centerOfWinningSlice = winningIndex * sliceDegrees + sliceDegrees / 2;
  const targetOffset = (270 - centerOfWinningSlice + 360) % 360;

  const fullSpins = (5 + Math.floor(Math.random() * 2)) * 360;
  const currentNormalized = rotationAngle.value % 360;
  const delta = fullSpins + (targetOffset - currentNormalized + 360) % 360;

  rotationAngle.value = rotationAngle.value + delta;

  setTimeout(() => {
    isSpinning.value = false;
    emit('spin-end', winningGame);
  }, 4400);
};

watch(activeSlices, () => {
  drawWheel();
});

watch(currentTheme, () => {
  drawWheel();
});

onMounted(() => {
  drawWheel();
});

defineExpose({ spin });
</script>

<template>
  <div class="w-full flex flex-col items-center justify-center gap-5 py-2">
    <!-- Dial Stage Container -->
    <div
      ref="dialStageRef"
      class="relative flex items-center justify-center"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    >
      <!-- Clean Minimal Pointer Needle at 12 o'clock -->
      <div
        class="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-md"
      >
        <div
          class="w-0 h-0 border-l-10 border-l-transparent border-r-10 border-r-transparent border-t-16"
          :style="{
            borderTopColor: 'var(--app-primary)',
          }"
        />
      </div>

      <!-- Rotating Dial Canvas -->
      <div
        class="relative z-10 w-65 h-65 sm:w-75 sm:h-75 md:w-85 md:h-85 lg:w-95 lg:h-95 rounded-full shadow-2xl overflow-hidden border border-white/10"
        :class="candidates.length < 2 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
        :style="{
          transform: `rotate(${rotationAngle}deg)`,
          transition: isSpinning ? 'transform 4.4s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
        }"
        @click="spin"
      >
        <canvas
          ref="canvasRef"
          width="640"
          height="640"
          class="w-full h-full object-contain"
        />
      </div>

      <!-- Sector Hover Game Info Tooltip -->
      <Transition name="tooltip-fade">
        <div
          v-if="hoveredGame && !isSpinning"
          class="absolute pointer-events-none z-30 px-3 py-2 rounded-md border shadow-2xl backdrop-blur-md flex items-center gap-2.5 min-w-50 max-w-xs"
          :style="{
            left: `${tooltipX}px`,
            top: `${tooltipY}px`,
            backgroundColor: 'rgba(12, 16, 26, 0.95)',
            borderColor: 'var(--app-primary)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7), 0 0 10px var(--app-primary)',
            transform: tooltipX > 200 ? 'translate(-105%, -110%)' : 'translate(5%, -110%)',
          }"
        >
          <!-- Thumbnail -->
          <div class="w-9 h-12 rounded-xs overflow-hidden shrink-0 bg-black/80 border border-white/10 shadow-sm">
            <img
              v-if="hoveredGame.cover_url"
              :src="hoveredGame.cover_url"
              :alt="hoveredGame.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-500">
              <Gamepad2 class="w-4 h-4" />
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            <span class="text-xs font-bold text-white leading-tight truncate">
              {{ hoveredGame.title }}
            </span>
            <div class="flex items-center gap-2 text-[10px] font-mono text-gray-300">
              <span v-if="hoveredGame.release_year">{{ hoveredGame.release_year }}</span>
              <span
                v-if="hoveredGame.genres && hoveredGame.genres.length > 0"
                class="truncate max-w-25"
              >
                • {{ hoveredGame.genres[0] }}
              </span>
            </div>
            <div
              v-if="formatGameRating(hoveredGame.rating)"
              class="flex items-center gap-1 text-[10px] text-amber-300 font-bold"
            >
              <Star class="w-3 h-3 fill-amber-300" />
              <span>{{ formatGameRating(hoveredGame.rating) }}</span>
            </div>
          </div>
        </div>
      </Transition>
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
        <Compass class="w-3.5 h-3.5" :class="{ 'animate-spin': isSpinning }" />
        <span>{{ isSpinning ? 'Girando...' : 'Girar Ruleta' }}</span>
      </button>

      <span
        v-if="candidates.length === 0"
        class="text-xs font-semibold text-rose-400"
      >
        No hay juegos disponibles con los filtros actuales.
      </span>
      <span
        v-else-if="candidates.length === 1"
        class="text-xs font-medium text-amber-300"
      >
        Se necesitan al menos 2 juegos para girar la ruleta.
      </span>
    </div>
  </div>
</template>

<style scoped>
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

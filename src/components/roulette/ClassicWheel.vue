<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { UserGame } from '@/types/game';
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

  // Draw Slices
  for (let i = 0; i < total; i++) {
    const angle = i * arc;
    const game = activeSlices.value[i];
    if (!game) continue;

    // Sector body with alternating theme tones
    ctx.beginPath();
    ctx.fillStyle = shades[i % shades.length] || '#131a27';
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + arc);
    ctx.lineTo(centerX, centerY);
    ctx.fill();

    // Sector border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sector number & Title
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle + arc / 2);
    ctx.textAlign = 'right';

    // Sector index tag
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`[#0${i + 1}]`, radius - 240, 4);

    // Game Title text with contrast shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = '#ffffff';

    const fontSize = total > 12 ? 12 : total > 8 ? 13 : 15;
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;

    const maxLen = total > 12 ? 22 : total > 8 ? 26 : 32;
    const text = game.title.length > maxLen ? game.title.substring(0, maxLen - 2) + '...' : game.title;
    ctx.fillText(text, radius - 24, 4);

    ctx.restore();
  }

  // Outer Precision Ring & Ticks
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Draw 48 Precision Ticks on Outer Bezel
  for (let i = 0; i < 48; i++) {
    const tickAngle = (i * 2 * Math.PI) / 48;
    const isMajor = i % 12 === 0;
    const isMedium = i % 4 === 0;
    const tickLength = isMajor ? 14 : isMedium ? 9 : 5;
    const outerX = centerX + radius * Math.cos(tickAngle);
    const outerY = centerY + radius * Math.sin(tickAngle);
    const innerX = centerX + (radius - tickLength) * Math.cos(tickAngle);
    const innerY = centerY + (radius - tickLength) * Math.sin(tickAngle);

    ctx.beginPath();
    ctx.moveTo(outerX, outerY);
    ctx.lineTo(innerX, innerY);
    ctx.strokeStyle = isMajor
      ? (currentThemeOption.value?.primaryColor || 'rgba(255, 255, 255, 0.9)')
      : isMedium
      ? 'rgba(255, 255, 255, 0.5)'
      : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = isMajor ? 2.5 : isMedium ? 1.5 : 1;
    ctx.stroke();
  }

  // Center Precision Hub
  ctx.beginPath();
  ctx.arc(centerX, centerY, 52, 0, 2 * Math.PI);
  ctx.fillStyle = currentThemeOption.value?.surfaceColor || '#090d16';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
  ctx.strokeStyle = currentThemeOption.value?.primaryColor || '#334155';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Center Reticle
  ctx.beginPath();
  ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI);
  ctx.fillStyle = currentThemeOption.value?.primaryColor || 'rgba(255, 255, 255, 0.9)';
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
  const visualInnerHub = 52 * (rect.width / canvas.width);

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
  if (isSpinning.value || activeSlices.value.length === 0) return;

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
  <div class="w-full flex flex-col items-center justify-center gap-8 py-4">
    <!-- Dial Stage Container -->
    <div
      ref="dialStageRef"
      class="relative flex items-center justify-center"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    >
      <!-- Precision Laser Reticle at 12 o'clock -->
      <div
        class="absolute -top-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center"
      >
        <div
          class="w-2 h-4 rounded-xs"
          :style="{
            backgroundColor: 'var(--app-primary)',
            boxShadow: '0 0 12px var(--app-primary)',
          }"
        />
        <div
          class="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px]"
          :style="{
            borderTopColor: 'var(--app-primary)',
          }"
        />
      </div>

      <!-- Rotating Dial Canvas -->
      <div
        class="relative z-10 w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] md:w-[560px] md:h-[560px] lg:w-[620px] lg:h-[620px] rounded-full shadow-2xl overflow-hidden cursor-pointer border border-white/10"
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
          class="absolute pointer-events-none z-30 px-3.5 py-2.5 rounded-md border shadow-2xl backdrop-blur-md flex items-center gap-3 min-w-[220px] max-w-sm"
          :style="{
            left: `${tooltipX}px`,
            top: `${tooltipY}px`,
            backgroundColor: 'rgba(12, 16, 26, 0.94)',
            borderColor: 'var(--app-primary)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 12px var(--app-primary)',
            transform: tooltipX > 300 ? 'translate(-105%, -115%)' : 'translate(5%, -115%)',
          }"
        >
          <!-- Thumbnail -->
          <div class="w-11 h-15 rounded-xs overflow-hidden shrink-0 bg-black/80 border border-white/10 shadow-sm">
            <img
              v-if="hoveredGame.cover_url"
              :src="hoveredGame.cover_url"
              :alt="hoveredGame.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-500">
              <Gamepad2 class="w-5 h-5" />
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            <span class="text-xs sm:text-sm font-bold text-white leading-tight truncate">
              {{ hoveredGame.title }}
            </span>
            <div class="flex items-center gap-2 text-[10px] font-mono text-gray-300">
              <span v-if="hoveredGame.release_year">{{ hoveredGame.release_year }}</span>
              <span
                v-if="hoveredGame.genres && hoveredGame.genres.length > 0"
                class="truncate max-w-[110px]"
              >
                • {{ hoveredGame.genres[0] }}
              </span>
            </div>
            <div
              v-if="hoveredGame.rating"
              class="flex items-center gap-1 text-[10px] text-amber-300 font-bold"
            >
              <Star class="w-3 h-3 fill-amber-300" />
              <span>{{ hoveredGame.rating.toFixed(1) }}</span>
            </div>
          </div>
        </div>
      </Transition>
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
        <Compass class="w-4 h-4" :class="{ 'animate-spin': isSpinning }" />
        <span>{{ isSpinning ? 'Calculando Trayectoria...' : 'Iniciar Dial de Decisión' }}</span>
      </button>

      <span
        v-if="candidates.length === 0"
        class="text-xs font-semibold text-rose-400"
      >
        No hay objetivos disponibles para los filtros activos.
      </span>
      <span
        v-else
        class="text-[11px] font-mono"
        :style="{ color: 'var(--app-text-muted)' }"
      >
        Pasa el cursor para ver el título • Haz clic en el dial o en el botón para ejecutar
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

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
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

// ---------------------------------------------------------------------------
// Geometry (all drawing happens in a 640x640 logical space, scaled for DPR)
// ---------------------------------------------------------------------------
const LOGICAL = 640;
const CENTER = LOGICAL / 2;
const RADIUS = 300;
const LABEL_HUB_RADIUS = 36;
// High-density mode: outer numbered bezel + full radial wedges to the center hub
const BEZEL_WIDTH = 18;
// Above this amount, sector labels become unreadable -> compact slots are forced
const LABEL_LIMIT = 16;

const canvasPx = LOGICAL * Math.min(2, Math.max(1, Math.ceil(window.devicePixelRatio || 1)));

const wheelWrapRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const needleRef = ref<HTMLDivElement | null>(null);
const isSpinning = ref(false);
const rotationAngle = ref(0);

// Hovered slot (feeds the side preview panel while the wheel is idle)
const hoveredGame = ref<UserGame | null>(null);

// Automatically switch to compact slots when the pool exceeds LABEL_LIMIT
const isRadar = computed(() => props.candidates.length > LABEL_LIMIT);

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

// Every candidate gets a slot: no more truncation, every game has a 1/N chance
const activeSlices = computed(() => props.candidates);

// Slot currently under the 12 o'clock needle (canvas angle 270° once rotated)
const needleIndex = computed(() => {
  const total = activeSlices.value.length;
  if (total === 0) return -1;
  const sliceDegrees = 360 / total;
  const canvasAngle = (((270 - rotationAngle.value) % 360) + 360) % 360;
  return Math.min(total - 1, Math.floor(canvasAngle / sliceDegrees));
});

const needleGame = computed(() => activeSlices.value[needleIndex.value] ?? null);

// HUD shows: live needle reading while spinning, hovered slot when inspecting
const hudGame = computed(() => {
  if (isSpinning.value) return needleGame.value;
  return hoveredGame.value ?? needleGame.value;
});

const hudIndex = computed(() => {
  const game = hudGame.value;
  if (!game) return -1;
  return activeSlices.value.indexOf(game);
});

const hudStatus = computed(() => {
  if (isSpinning.value) return 'BARRIENDO';
  if (hoveredGame.value) return 'INSPECCIONANDO';
  return 'EN MIRA';
});

const padIndex = (value: number) => {
  const digits = String(activeSlices.value.length).length;
  return String(value).padStart(Math.max(2, digits), '0');
};

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
const truncateToWidth = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let title = text;
  while (title.length > 3 && ctx.measureText(title + '…').width > maxWidth) {
    title = title.slice(0, -1);
  }
  return title + '…';
};

const drawEmpty = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS, 0, 2 * Math.PI);
  ctx.fillStyle = currentThemeOption.value?.surfaceColor || '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SIN OBJETIVOS DISPONIBLES', CENTER, CENTER);
};

/** Classic labeled sectors (used for small pools, up to LABEL_LIMIT games). */
const drawLabeledWheel = (ctx: CanvasRenderingContext2D, total: number) => {
  const arc = (2 * Math.PI) / total;
  const shades = wheelShades.value;
  const radius = RADIUS;

  for (let i = 0; i < total; i++) {
    const startAngle = i * arc;
    const endAngle = startAngle + arc;
    const game = activeSlices.value[i];
    if (!game) continue;

    // Slice Body
    ctx.beginPath();
    ctx.fillStyle = shades[i % shades.length] || '#131a27';
    ctx.moveTo(CENTER, CENTER);
    ctx.arc(CENTER, CENTER, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // Clean subtle divider between slices
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.textBaseline = 'middle';

    // Special case 1: Single element (full circle) -> clean horizontal centered text
    if (total === 1) {
      ctx.font = '600 18px "Space Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(truncateToWidth(ctx, game.title, radius * 1.5), CENTER, CENTER + radius * 0.4);
      ctx.restore();
      continue;
    }

    // Special case 2: Exactly two elements -> both halves are horizontal,
    // so text is drawn upright and centered in each half.
    if (total === 2) {
      ctx.translate(CENTER, CENTER);
      const textY = i === 0 ? radius * 0.48 : -radius * 0.48;
      ctx.textAlign = 'center';
      ctx.font = '800 24px "Space Grotesk", system-ui, sans-serif';
      ctx.fillText(truncateToWidth(ctx, game.title, radius * 1.4), 0, textY);
      ctx.restore();
      continue;
    }

    // General case: 3 or more elements, text along the slice bisector
    const midAngle = startAngle + arc / 2;
    const normalizedAngle = ((midAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const isLeftHalf = normalizedAngle > Math.PI / 2 && normalizedAngle < (3 * Math.PI) / 2;

    ctx.translate(CENTER, CENTER);
    ctx.rotate(midAngle);

    // Flip the left half by 180° so text always reads left-to-right
    if (isLeftHalf) {
      ctx.rotate(Math.PI);
      ctx.textAlign = 'left';
    } else {
      ctx.textAlign = 'right';
    }

    const fontSize = total > 12 ? 12 : total > 8 ? 14 : 16;
    ctx.font = `600 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;

    const maxTextWidth = radius - LABEL_HUB_RADIUS - 30;
    const textOffset = isLeftHalf ? -radius + 18 : radius - 18;
    ctx.fillText(truncateToWidth(ctx, game.title, maxTextWidth), textOffset, 0);
    ctx.restore();
  }

  // Clean Outer Border
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Simple Elegant Center Cap
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, LABEL_HUB_RADIUS, 0, 2 * Math.PI);
  ctx.fillStyle = currentThemeOption.value?.surfaceColor || '#0f172a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 8, 0, 2 * Math.PI);
  ctx.fillStyle = currentThemeOption.value?.primaryColor || '#6366f1';
  ctx.fill();
};

/**
 * High-density dial: one thin wedge per game (no text), a numbered bezel for orientation
 * and the standard small center cap (no central radar scope).
 */
const drawRadarWheel = (ctx: CanvasRenderingContext2D, total: number) => {
  const arc = (2 * Math.PI) / total;
  const shades = wheelShades.value;
  const slotOuter = RADIUS - BEZEL_WIDTH;
  const majorStep = total > 60 ? 10 : 5;
  const surface = currentThemeOption.value?.surfaceColor || '#0b0f19';
  const primary = currentThemeOption.value?.primaryColor || '#6366f1';

  // Bezel base
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS, 0, 2 * Math.PI);
  ctx.fillStyle = surface;
  ctx.fill();

  // Full radial wedges all the way to the center hub
  for (let i = 0; i < total; i++) {
    const start = i * arc;
    const end = start + arc;
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.arc(CENTER, CENTER, slotOuter, start, end);
    ctx.closePath();
    ctx.fillStyle = shades[i % shades.length] || '#141d2d';
    ctx.fill();

    // Alternating sheen so adjacent slots stay distinguishable at high density
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.fill();
    }
  }

  // Slot separators (skipped when slots are too thin to need them)
  if (slotOuter * arc > 3) {
    ctx.beginPath();
    for (let i = 0; i < total; i++) {
      const a = i * arc;
      ctx.moveTo(CENTER + Math.cos(a) * LABEL_HUB_RADIUS, CENTER + Math.sin(a) * LABEL_HUB_RADIUS);
      ctx.lineTo(CENTER + Math.cos(a) * slotOuter, CENTER + Math.sin(a) * slotOuter);
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = total > 60 ? 0.6 : 1;
    ctx.stroke();
  }

  // Major sector dividers every `majorStep` slots
  ctx.beginPath();
  for (let i = 0; i < total; i += majorStep) {
    const a = i * arc;
    ctx.moveTo(CENTER + Math.cos(a) * LABEL_HUB_RADIUS, CENTER + Math.sin(a) * LABEL_HUB_RADIUS);
    ctx.lineTo(CENTER + Math.cos(a) * slotOuter, CENTER + Math.sin(a) * slotOuter);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bezel ticks (one per slot, longer on majors) + index numbers
  for (let i = 0; i < total; i++) {
    const mid = i * arc + arc / 2;
    const isMajor = (i + 1) % majorStep === 0;
    const tickLength = isMajor ? 8 : 4;
    ctx.beginPath();
    ctx.moveTo(CENTER + Math.cos(mid) * (RADIUS - 2), CENTER + Math.sin(mid) * (RADIUS - 2));
    ctx.lineTo(
      CENTER + Math.cos(mid) * (RADIUS - 2 - tickLength),
      CENTER + Math.sin(mid) * (RADIUS - 2 - tickLength),
    );
    ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = isMajor ? 1.5 : 1;
    ctx.stroke();

    if (isMajor) {
      ctx.save();
      ctx.translate(CENTER, CENTER);
      ctx.rotate(mid + Math.PI / 2);
      ctx.font = '700 8px ui-monospace, "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillText(String(i + 1), 0, -(RADIUS - 14));
      ctx.restore();
    }
  }

  // Ring borders
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CENTER, CENTER, slotOuter, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Simple Elegant Center Cap (same as labeled mode)
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, LABEL_HUB_RADIUS, 0, 2 * Math.PI);
  ctx.fillStyle = surface;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 8, 0, 2 * Math.PI);
  ctx.fillStyle = primary;
  ctx.fill();
};

const drawWheel = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const scale = canvas.width / LOGICAL;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, LOGICAL, LOGICAL);

  const total = activeSlices.value.length;
  if (total === 0) {
    drawEmpty(ctx);
  } else if (isRadar.value) {
    drawRadarWheel(ctx, total);
  } else {
    drawLabeledWheel(ctx, total);
  }
};

// Warm the browser cache so the HUD cover swaps instantly during the sweep
const preloadCovers = () => {
  for (const game of activeSlices.value) {
    if (game.cover_url) {
      const img = new Image();
      img.src = game.cover_url;
    }
  }
};

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------
const handleMouseMove = (event: MouseEvent) => {
  if (isSpinning.value || activeSlices.value.length === 0) {
    hoveredGame.value = null;
    return;
  }

  // Use the non-rotating wrapper: a rotated element's bounding box is inflated
  const wrap = wheelWrapRef.value;
  if (!wrap) return;

  const rect = wrap.getBoundingClientRect();
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  const dist = Math.sqrt(dx * dx + dy * dy);

  const unit = rect.width / LOGICAL;
  const innerLimit = LABEL_HUB_RADIUS * unit;
  const outerLimit = RADIUS * unit;

  if (dist < innerLimit || dist > outerLimit) {
    hoveredGame.value = null;
    return;
  }

  let angleRad = Math.atan2(dy, dx);
  if (angleRad < 0) angleRad += 2 * Math.PI;

  const rotationRad = (((rotationAngle.value % 360) + 360) % 360) * (Math.PI / 180);
  let relativeAngle = (angleRad - rotationRad) % (2 * Math.PI);
  if (relativeAngle < 0) relativeAngle += 2 * Math.PI;

  const total = activeSlices.value.length;
  const index = Math.floor(relativeAngle / ((2 * Math.PI) / total));

  hoveredGame.value = activeSlices.value[index] ?? null;
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

  // Land somewhere inside the winning slot (+/- 35%), not always dead center
  const randomWithinSlice = (Math.random() - 0.5) * (sliceDegrees * 0.7);

  const fullSpins = (6 + Math.floor(Math.random() * 2)) * 360;
  const currentNormalized = rotationAngle.value % 360;
  const delta = fullSpins + ((targetOffset + randomWithinSlice - currentNormalized + 720) % 360);
  const targetAngle = rotationAngle.value + delta;

  let lastSector = Math.floor(rotationAngle.value / sliceDegrees);
  let lastFlick = 0;
  // With 100+ slots the needle would flick hundreds of times per second;
  // throttle so it reads as a fast ratchet instead of a blur.
  const flickInterval = total > LABEL_LIMIT ? 45 : 0;

  gsap.killTweensOf(rotationAngle);
  if (needleRef.value) gsap.killTweensOf(needleRef.value);

  gsap.to(rotationAngle, {
    value: targetAngle,
    duration: isRadar.value ? 5.4 : 4.6,
    ease: 'power4.out',
    onUpdate: () => {
      const currentSector = Math.floor(rotationAngle.value / sliceDegrees);
      if (currentSector === lastSector || !needleRef.value) return;
      lastSector = currentSector;

      const now = performance.now();
      if (now - lastFlick < flickInterval) return;
      lastFlick = now;

      // Natural flapper flick: flex in rotation direction, then snap back elastically
      gsap.timeline({ overwrite: 'auto' })
        .to(needleRef.value, { rotation: -18, duration: 0.04, ease: 'power1.out' })
        .to(needleRef.value, { rotation: 0, duration: 0.16, ease: 'back.out(2.5)' });
    },
    onComplete: () => {
      isSpinning.value = false;
      if (needleRef.value) {
        gsap.to(needleRef.value, { rotation: 0, duration: 0.2, ease: 'power2.out' });
      }
      emit('spin-end', winningGame);
    },
  });
};

watch([activeSlices, isRadar, currentTheme], () => {
  drawWheel();
});

watch(activeSlices, preloadCovers);

onMounted(() => {
  drawWheel();
  preloadCovers();
});

onUnmounted(() => {
  gsap.killTweensOf(rotationAngle);
  if (needleRef.value) gsap.killTweensOf(needleRef.value);
});

defineExpose({ spin });
</script>

<template>
  <div class="w-full flex flex-col items-center justify-center gap-5 py-2">
    <!-- Dial Stage: wheel on the left, live preview panel on the right -->
    <div class="w-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10">
      <!-- Non-rotating wrapper: holds needle, rotating dial and the radar scope -->
      <div
        ref="wheelWrapRef"
        class="relative shrink-0 w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-md lg:h-112"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
      >
        <!-- Pointer Needle at 12 o'clock with Spring Physics -->
        <div
          ref="needleRef"
          class="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-md origin-top"
        >
          <div
            class="w-0 h-0 border-l-10 border-l-transparent border-r-10 border-r-transparent border-t-16"
            :style="{ borderTopColor: 'var(--app-primary)' }"
          />
        </div>

        <!-- Rotating Dial Canvas driven by GSAP -->
        <div
          class="absolute inset-0 z-10 rounded-full shadow-2xl overflow-hidden border border-white/10"
          :class="candidates.length < 2 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
          :style="{ transform: `rotate(${rotationAngle}deg)` }"
          @click="spin"
        >
          <canvas
            ref="canvasRef"
            :width="canvasPx"
            :height="canvasPx"
            class="w-full h-full"
          />
        </div>
      </div>

      <!-- LIVE PREVIEW PANEL: game under the needle (spinning) or hovered slot (idle) -->
      <aside
        v-if="candidates.length > 0"
        class="relative w-full max-w-sm h-36 lg:w-72 lg:h-112 shrink-0 rounded-lg border overflow-hidden flex flex-row lg:flex-col"
        :style="{
          backgroundColor: 'var(--app-surface-hover)',
          borderColor: isSpinning ? 'var(--app-primary)' : 'var(--app-border)',
          boxShadow: isSpinning ? '0 0 24px -6px var(--app-primary)' : 'none',
        }"
        aria-live="polite"
        aria-label="Juego bajo la aguja"
      >
        <!-- Status strip -->
        <div
          class="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.2em] bg-black/70 backdrop-blur-sm"
        >
          <span :class="{ 'animate-pulse': isSpinning }" :style="{ color: 'var(--app-primary)' }">
            {{ hudStatus }}
          </span>
          <span :style="{ color: 'var(--app-text-muted)' }">
            #{{ padIndex(hudIndex + 1) }}/{{ candidates.length }}
          </span>
        </div>

        <!-- Cover -->
        <div class="relative w-28 sm:w-32 h-full lg:w-full lg:h-76 shrink-0 bg-black/80">
          <img
            v-if="hudGame?.cover_url"
            :key="hudGame.id"
            :src="hudGame.cover_url"
            :alt="hudGame.title"
            class="absolute inset-0 w-full h-full object-cover"
          />
          <div v-else class="absolute inset-0 flex items-center justify-center text-gray-500">
            <Gamepad2 class="w-8 h-8" />
          </div>
          <div class="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/90 to-transparent hidden lg:block" />
        </div>

        <!-- Info (strict fixed height and fixed line heights so 1-line vs 2-line titles never resize the layout) -->
        <div class="flex-1 min-w-0 lg:h-36 flex flex-col justify-center gap-1.5 px-3.5 py-2.5 pt-8 lg:pt-2.5 overflow-hidden">
          <p
            class="font-display font-bold text-sm sm:text-base leading-5 h-10 line-clamp-2 overflow-hidden"
            :style="{ color: 'var(--app-text)' }"
          >
            {{ hudGame?.title ?? '—' }}
          </p>
          <div
            class="h-4 flex items-center gap-1.5 text-[11px] font-mono whitespace-nowrap overflow-hidden"
            :style="{ color: 'var(--app-text-muted)' }"
          >
            <span v-if="hudGame?.release_year" class="shrink-0">{{ hudGame.release_year }}</span>
            <span v-if="hudGame?.genres && hudGame.genres.length > 0" class="truncate">
              <template v-if="hudGame?.release_year">• </template>{{ hudGame.genres[0] }}
            </span>
            <span v-if="!hudGame?.release_year && (!hudGame?.genres || hudGame.genres.length === 0)">—</span>
          </div>
          <div class="h-4 flex items-center gap-1 text-xs font-bold">
            <template v-if="hudGame && formatGameRating(hudGame.rating)">
              <Star class="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0" />
              <span class="text-amber-300">{{ formatGameRating(hudGame.rating) }}</span>
            </template>
            <span v-else class="text-[11px] font-mono font-normal opacity-50" :style="{ color: 'var(--app-text-muted)' }">
              Sin calificación
            </span>
          </div>
        </div>
      </aside>
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


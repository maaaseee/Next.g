<script setup lang="ts">
/**
 * GameHorizontalCarousel
 *
 * Continuous auto-scrolling carousel driven by the Web Animations API.
 * The animation runs on the browser compositor thread (GPU), so it is
 * synchronized with the display refresh rate (VSync) and is NOT affected
 * by main-thread work (Vue re-renders, timers, repaints of other sections).
 *
 * Features:
 * - Constant speed in px/second (independent of the number of games / monitor Hz)
 * - Smooth eased pause on hover and smooth resume
 * - Arrow buttons with eased nudge
 * - Mouse / touch drag
 * - Static (manual) mode with `autoScroll = false` for future category rows
 * - Respects `prefers-reduced-motion`
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { Star, Gamepad2, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-vue-next'
import type { Game } from '@/types/game'

interface Props {
  games: Game[]
  title?: string
  subtitle?: string
  accentBarColor?: string
  exploreLink?: string
  exploreLabel?: string
  autoScroll?: boolean
  /** Auto-scroll speed in pixels per second */
  speed?: number
  showArrows?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  accentBarColor: 'bg-amber-400',
  exploreLink: '',
  exploreLabel: 'Explorar catálogo',
  autoScroll: true,
  speed: 40,
  showArrows: true,
})

const router = useRouter()

const viewportRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const isMarquee = computed(() => props.autoScroll && !prefersReducedMotion)

// Two identical copies are required for a seamless loop (translate exactly one copy width)
const displayGames = computed(() => {
  if (!props.games?.length) return []
  return isMarquee.value ? [...props.games, ...props.games] : props.games
})

// ---------------------------------------------------------------------------
// Compositor animation state
// ---------------------------------------------------------------------------
let animation: Animation | null = null
let loopWidth = 0 // width of a single copy in px
let durationMs = 0
let isHovering = false
let isDragging = false
let rateRaf = 0
let nudgeRaf = 0
let resizeObserver: ResizeObserver | null = null

function normalizeTime(t: number): number {
  if (!durationMs) return 0
  return ((t % durationMs) + durationMs) % durationMs
}

function getCurrentTime(): number {
  const t = animation?.currentTime
  return typeof t === 'number' ? t : Number(t ?? 0)
}

function buildAnimation() {
  const track = trackRef.value
  if (!track || !isMarquee.value) return

  // Every card carries its own right margin, so scrollWidth / 2 is exactly one copy
  const newLoopWidth = track.scrollWidth / 2
  if (!newLoopWidth) return

  const previousProgress = durationMs ? getCurrentTime() / durationMs : 0
  const previousRate = animation?.playbackRate ?? (isHovering ? 0 : 1)

  animation?.cancel()

  loopWidth = newLoopWidth
  durationMs = (loopWidth / props.speed) * 1000

  animation = track.animate(
    [{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(${-loopWidth}px, 0, 0)` }],
    { duration: durationMs, iterations: Infinity, easing: 'linear' },
  )
  animation.currentTime = normalizeTime(previousProgress * durationMs)
  animation.playbackRate = previousRate
}

/** Smoothly eases the playback rate (used for hover pause / resume) */
function rampRate(target: number, ms = 450) {
  if (!animation) return
  cancelAnimationFrame(rateRaf)
  const from = animation.playbackRate
  const start = performance.now()

  const step = (now: number) => {
    if (!animation) return
    const p = Math.min(1, (now - start) / ms)
    const eased = 1 - Math.pow(1 - p, 3)
    animation.playbackRate = from + (target - from) * eased
    if (p < 1) rateRaf = requestAnimationFrame(step)
  }
  rateRaf = requestAnimationFrame(step)
}

function onMouseEnter() {
  isHovering = true
  if (isMarquee.value) rampRate(0)
}

function onMouseLeave() {
  isHovering = false
  if (isMarquee.value && !isDragging) rampRate(1, 700)
}

/** Card width + margin, used as the arrow step unit */
function getCardStep(): number {
  const first = trackRef.value?.firstElementChild as HTMLElement | null
  if (!first) return 200
  const style = getComputedStyle(first)
  return first.offsetWidth + parseFloat(style.marginRight || '0')
}

function nudge(direction: 1 | -1) {
  const distance = getCardStep() * 2 * direction

  // Static mode: native smooth scrolling
  if (!isMarquee.value) {
    viewportRef.value?.scrollBy({ left: distance, behavior: 'smooth' })
    return
  }

  if (!animation) return
  cancelAnimationFrame(rateRaf)
  cancelAnimationFrame(nudgeRaf)
  animation.playbackRate = 0

  const from = getCurrentTime()
  const delta = (distance / props.speed) * 1000
  const start = performance.now()
  const ms = 500

  const step = (now: number) => {
    if (!animation) return
    const p = Math.min(1, (now - start) / ms)
    const eased = 1 - Math.pow(1 - p, 3)
    animation.currentTime = normalizeTime(from + delta * eased)
    if (p < 1) {
      nudgeRaf = requestAnimationFrame(step)
    } else if (!isHovering) {
      rampRate(1, 700)
    }
  }
  nudgeRaf = requestAnimationFrame(step)
}

// ---------------------------------------------------------------------------
// Pointer drag (marquee & static mode)
// ---------------------------------------------------------------------------
let dragStartX = 0
let dragStartTime = 0
let dragStartScrollLeft = 0
let dragMoved = false

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  isDragging = true
  dragMoved = false
  dragStartX = e.clientX

  if (isMarquee.value && animation) {
    dragStartTime = getCurrentTime()
    cancelAnimationFrame(rateRaf)
    cancelAnimationFrame(nudgeRaf)
    animation.playbackRate = 0
  } else if (viewportRef.value) {
    dragStartScrollLeft = viewportRef.value.scrollLeft
  }
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging) return
  const dx = e.clientX - dragStartX
  if (Math.abs(dx) > 5 && !dragMoved) {
    dragMoved = true
    viewportRef.value?.setPointerCapture(e.pointerId)
  }
  if (dragMoved) {
    if (isMarquee.value && animation) {
      animation.currentTime = normalizeTime(dragStartTime - (dx / props.speed) * 1000)
    } else if (viewportRef.value) {
      viewportRef.value.scrollLeft = dragStartScrollLeft - dx
    }
  }
}

function onPointerUp(e: PointerEvent) {
  if (!isDragging) return
  isDragging = false
  if (viewportRef.value?.hasPointerCapture(e.pointerId)) {
    viewportRef.value.releasePointerCapture(e.pointerId)
  }
  if (isMarquee.value && !isHovering) rampRate(1, 700)
}

function handleGameClick(game: Game) {
  // Ignore the click that ends a drag gesture
  if (dragMoved) {
    dragMoved = false
    return
  }
  router.push(`/game/${game.slug || game.id}`)
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
async function setup() {
  await nextTick()
  buildAnimation()
}

onMounted(() => {
  setup()
  if (typeof ResizeObserver !== 'undefined' && trackRef.value) {
    resizeObserver = new ResizeObserver(() => buildAnimation())
    resizeObserver.observe(trackRef.value)
  }
})

watch(
  () => [props.games, props.speed, props.autoScroll],
  () => setup(),
)

onBeforeUnmount(() => {
  cancelAnimationFrame(rateRaf)
  cancelAnimationFrame(nudgeRaf)
  resizeObserver?.disconnect()
  animation?.cancel()
  animation = null
})
</script>

<template>
  <div class="w-full space-y-4">
    <!-- Header (Optional) -->
    <div v-if="title || exploreLink" class="flex items-end justify-between gap-4">
      <div>
        <h2
          v-if="title"
          class="text-base sm:text-lg lg:text-xl font-bold uppercase tracking-wider text-white font-sans"
        >
          {{ title }}
        </h2>
        <div v-if="title" class="h-0.75 w-14 mt-1.5" :class="accentBarColor" />
        <p
          v-if="subtitle"
          class="text-xs sm:text-sm mt-1"
          :style="{ color: 'var(--app-text-muted)' }"
        >
          {{ subtitle }}
        </p>
      </div>

      <RouterLink
        v-if="exploreLink"
        :to="exploreLink"
        class="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors hover:underline shrink-0"
        :style="{ color: 'var(--app-primary)' }"
      >
        <span>{{ exploreLabel }}</span>
        <ArrowRight class="w-4 h-4" />
      </RouterLink>
    </div>

    <div
      class="relative w-full group/carousel py-1"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <!-- Arrows -->
      <button
        v-if="showArrows"
        type="button"
        @click="nudge(-1)"
        class="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-[#0c1017]/90 hover:bg-[#0c1017] border border-white/20 text-white flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover/carousel:opacity-100 transition-opacity duration-200 shadow-xl cursor-pointer"
        aria-label="Anterior"
      >
        <ChevronLeft class="w-5 h-5" />
      </button>
      <button
        v-if="showArrows"
        type="button"
        @click="nudge(1)"
        class="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-[#0c1017]/90 hover:bg-[#0c1017] border border-white/20 text-white flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover/carousel:opacity-100 transition-opacity duration-200 shadow-xl cursor-pointer"
        aria-label="Siguiente"
      >
        <ChevronRight class="w-5 h-5" />
      </button>

      <!-- Viewport -->
      <div
        ref="viewportRef"
        class="carousel-viewport select-none"
        :class="
          isMarquee
            ? 'overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y'
            : 'overflow-x-auto scrollbar-none snap-x snap-mandatory'
        "
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <!-- Track: single GPU layer moved by the compositor -->
        <div ref="trackRef" class="carousel-track flex w-max">
          <div
            v-for="(game, idx) in displayGames"
            :key="`${game.id}-${idx}`"
            @click="handleGameClick(game)"
            class="carousel-card w-36 sm:w-44 md:w-48 shrink-0 mr-3 sm:mr-4 snap-start group relative flex flex-col rounded-[4px] overflow-hidden border cursor-pointer"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }"
          >
            <!-- Poster -->
            <div class="aspect-3/4 w-full bg-black/60 overflow-hidden relative">
              <img
                v-if="game.cover_url"
                :src="game.cover_url"
                :alt="game.title"
                width="264"
                height="352"
                decoding="async"
                draggable="false"
                class="w-full h-full object-cover pointer-events-none"
              />
              <div v-else class="w-full h-full flex items-center justify-center opacity-40">
                <Gamepad2 class="w-8 h-8" />
              </div>

              <div
                v-if="game.rating"
                class="absolute top-2 right-2 px-1.5 py-0.5 rounded-[3px] text-[10px] font-sans font-bold flex items-center gap-1 bg-[#0c1017] text-amber-400 border border-amber-500/30"
              >
                <Star class="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span>{{ Math.round(game.rating) }}</span>
              </div>

              <span
                v-if="game.release_year"
                class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-[3px] text-[10px] font-sans font-bold bg-[#0c1017] text-white/90 border border-white/10"
              >
                {{ game.release_year }}
              </span>
            </div>

            <!-- Metadata -->
            <div class="p-2.5 flex flex-col grow justify-between">
              <h4
                class="text-xs sm:text-sm font-bold line-clamp-1 group-hover:text-(--app-primary) transition-colors"
                :title="game.title"
              >
                {{ game.title }}
              </h4>
              <div
                class="flex items-center justify-between gap-2 text-[10px] mt-1 opacity-70"
                :style="{ color: 'var(--app-text-muted)' }"
              >
                <span class="line-clamp-1 font-sans">
                  {{ game.genres && game.genres.length ? game.genres[0] : 'Juego' }}
                </span>
                <span v-if="game.platforms && game.platforms.length" class="shrink-0 font-sans">
                  {{ game.platforms[0] }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Isolate the carousel so its movement never forces layout/paint elsewhere */
.carousel-viewport {
  contain: layout paint;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.carousel-viewport::-webkit-scrollbar {
  display: none;
}

/* One composited layer for the whole track: the GPU just slides a bitmap */
.carousel-track {
  will-change: transform;
  backface-visibility: hidden;
}

/* Only cheap, non-geometric properties transition on hover (no transform/size changes
   inside the moving layer, which would force re-rasterization every frame) */
.carousel-card {
  transition:
    border-color 200ms ease,
    box-shadow 200ms ease;
}

.carousel-card:hover {
  border-color: rgb(168 85 247) !important;
  box-shadow: 0 0 0 1px rgb(168 85 247 / 0.7);
}
</style>

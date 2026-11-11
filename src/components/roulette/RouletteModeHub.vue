<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { RouletteMode } from '@/types/theme'
import { useGamesStore } from '@/stores/gamesStore'
import { useTheme } from '@/composables/useTheme'
import fallbackGamesData from '@/data/rouletteFallbacks.json'
import {
  Compass,
  SlidersVertical,
  Zap,
  ArrowRight,
  Sparkles,
  Star,
  Activity,
  Crosshair,
} from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'select-mode', mode: RouletteMode): void
}>()

const gamesStore = useGamesStore()
const { currentTheme, themes } = useTheme()
const hoveredCard = ref<RouletteMode | null>(null)

const currentThemeOption = computed(() => {
  return themes.find((t) => t.id === currentTheme.value) || themes[0]
})

const dialShades = computed(() => {
  return (
    currentThemeOption.value?.wheelShades || [
      '#131a27',
      '#1a2332',
      '#0f1724',
      '#172233',
      '#111928',
      '#1e293b',
      '#141d2d',
      '#1c2638',
    ]
  )
})

type GameItem = { id: string; title: string; genre: string; rating: number; cover: string }

const FALLBACK_GAMES: GameItem[] = fallbackGamesData
const DEFAULT_GAME: GameItem = FALLBACK_GAMES[0] || {
  id: '1',
  title: 'The Witcher 3',
  genre: 'Action RPG',
  rating: 9.4,
  cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
}

const activeGames = computed<GameItem[]>(() => {
  if (gamesStore.games && gamesStore.games.length >= 3) {
    return gamesStore.games.slice(0, 8).map((g) => ({
      id: String(g.id),
      title: g.title,
      genre: g.genres?.[0] || 'Aventura',
      rating: g.rating || 9.0,
      cover: g.cover_url || DEFAULT_GAME.cover,
    }))
  }
  return FALLBACK_GAMES
})

// =========================================================================
// 1. PREVIEW 1: RULETA TRADICIONAL
// =========================================================================
const dialCanvasRef = ref<HTMLCanvasElement | null>(null)
const dialRotationAngle = ref(0)
const isDialSpinning = ref(false)
const dialWinnerGame = ref<GameItem | null>(null)
let dialTimer: ReturnType<typeof setTimeout> | null = null

const drawDialCanvas = () => {
  const canvas = dialCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 2
  const displaySize = 210
  canvas.width = displaySize * dpr
  canvas.height = displaySize * dpr
  ctx.scale(dpr, dpr)

  const centerX = displaySize / 2
  const centerY = displaySize / 2
  const radius = displaySize / 2 - 6

  ctx.clearRect(0, 0, displaySize, displaySize)

  const list = activeGames.value
  const total = list.length
  if (total === 0) return

  const arc = (2 * Math.PI) / total
  const shades = dialShades.value

  for (let i = 0; i < total; i++) {
    const angle = i * arc
    const game = list[i]
    if (!game) continue

    ctx.beginPath()
    ctx.fillStyle = shades[i % shades.length] || '#141d2d'
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, radius, angle, angle + arc)
    ctx.lineTo(centerX, centerY)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(angle + arc / 2)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#f8fafc'
    ctx.font = '700 9.5px "Space Grotesk", system-ui, sans-serif'
    const cleanTitle = game.title.length > 13 ? game.title.slice(0, 12) + '…' : game.title
    ctx.fillText(cleanTitle, radius - 8, 0)
    ctx.restore()
  }

  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(centerX, centerY, 16, 0, 2 * Math.PI)
  ctx.fillStyle = currentThemeOption.value?.surfaceColor || '#0a0f1d'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1.2
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(centerX, centerY, 5.5, 0, 2 * Math.PI)
  ctx.fillStyle = currentThemeOption.value?.primaryColor || '#6366f1'
  ctx.fill()
}

const runDialCycle = () => {
  if (isDialSpinning.value) return
  const total = activeGames.value.length
  if (total === 0) return

  const winnerIdx = Math.floor(Math.random() * total)
  const winning = activeGames.value[winnerIdx]
  if (!winning) return

  const arcDeg = 360 / total
  const sliceCenterDeg = (winnerIdx + 0.5) * arcDeg
  const currentAngleMod = dialRotationAngle.value % 360
  const targetMod = (270 - sliceCenterDeg + 360) % 360
  const deltaForward = (targetMod - currentAngleMod + 360) % 360
  const spinsToAdd = 1080 + deltaForward

  isDialSpinning.value = true
  dialRotationAngle.value += spinsToAdd

  setTimeout(() => {
    isDialSpinning.value = false
    dialWinnerGame.value = winning

    setTimeout(() => {
      if (dialRotationAngle.value > 10000) dialRotationAngle.value %= 360
      dialTimer = setTimeout(runDialCycle, 1200)
    }, 2400)
  }, 3200)
}

// =========================================================================
// 2. PREVIEW 2: SELECTOR VERTICAL
// =========================================================================
const slotState = ref<'idle' | 'spinning' | 'locked'>('idle')
const slotWinnerGame = ref<GameItem | null>(null)
const slotTranslateY = ref(0)
let slotTimer: ReturnType<typeof setTimeout> | null = null

const extendedSlotGames = computed<GameItem[]>(() => {
  const g = activeGames.value
  return [...g, ...g, ...g, ...g]
})

const runSlotCycle = () => {
  slotState.value = 'spinning'
  const list = activeGames.value
  if (list.length === 0) return
  const targetIndex = Math.floor(Math.random() * list.length) + list.length
  const candidate = extendedSlotGames.value[targetIndex]
  const fallback = list[0]
  const winning: GameItem = candidate || fallback || DEFAULT_GAME
  slotWinnerGame.value = winning

  const itemHeight = 80
  slotTranslateY.value = -(targetIndex * itemHeight) + itemHeight

  setTimeout(() => {
    slotState.value = 'locked'

    setTimeout(() => {
      slotTranslateY.value = 0
      slotState.value = 'idle'
      slotTimer = setTimeout(runSlotCycle, 1000)
    }, 2800)
  }, 2200)
}

// =========================================================================
// 3. PREVIEW 3: SELECCIÓN RÁPIDA
// =========================================================================
const instantState = ref<'shuffling' | 'locked'>('shuffling')
const instantCurrentGame = ref<GameItem>(DEFAULT_GAME)
let instantInterval: ReturnType<typeof setInterval> | null = null
let instantLoopTimer: ReturnType<typeof setTimeout> | null = null

const runInstantCycle = () => {
  instantState.value = 'shuffling'
  let ticks = 0
  const maxTicks = 16

  if (instantInterval) clearInterval(instantInterval)
  instantInterval = setInterval(() => {
    ticks++
    const list = activeGames.value
    const rnd = Math.floor(Math.random() * list.length)
    const picked = list[rnd]
    if (picked) {
      instantCurrentGame.value = picked
    }

    if (ticks >= maxTicks) {
      if (instantInterval) clearInterval(instantInterval)
      instantState.value = 'locked'
      instantLoopTimer = setTimeout(runInstantCycle, 2800)
    }
  }, 70)
}

watch([activeGames, dialShades], () => {
  nextTick(drawDialCanvas)
})

onMounted(() => {
  nextTick(() => {
    drawDialCanvas()
    dialTimer = setTimeout(runDialCycle, 500)
    slotTimer = setTimeout(runSlotCycle, 900)
    instantLoopTimer = setTimeout(runInstantCycle, 300)
  })
})

onUnmounted(() => {
  if (dialTimer) clearTimeout(dialTimer)
  if (slotTimer) clearTimeout(slotTimer)
  if (instantInterval) clearInterval(instantInterval)
  if (instantLoopTimer) clearTimeout(instantLoopTimer)
})
</script>

<template>
  <div class="w-full max-w-6xl mx-auto flex flex-col justify-center px-4 sm:px-6 py-6">
    <!-- Header Centrado y Limpio -->
    <header class="w-full text-center pb-8">
      <h1
        class="text-3xl sm:text-4xl font-display font-black tracking-tight"
        :style="{ color: 'var(--app-text)' }"
      >
        Selecciona tu Sistema de Ruleta
      </h1>
      <p class="text-base mt-2 max-w-2xl mx-auto" :style="{ color: 'var(--app-text-muted)' }">
        Elige la dinámica visual que determinará tu próxima aventura en tu backlog personal.
      </p>
    </header>

    <!-- 3 Ruletas en Orientación Vertical Amplias y Claras -->
    <main class="flex flex-col gap-6">
      <!-- ======================================================== -->
      <!-- FILA 1: RULETA TRADICIONAL                               -->
      <!-- ======================================================== -->
      <section
        class="group relative rounded-2xl border flex flex-col md:flex-row items-stretch overflow-hidden transition-all duration-200 cursor-pointer"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: hoveredCard === 'classic' ? 'var(--app-primary)' : 'var(--app-border)',
          boxShadow:
            hoveredCard === 'classic'
              ? '0 18px 40px -10px rgba(0,0,0,0.7), 0 0 26px -4px var(--app-primary)'
              : 'none',
        }"
        @mouseenter="hoveredCard = 'classic'"
        @mouseleave="hoveredCard = null"
        @click="emit('select-mode', 'classic')"
      >
        <!-- Información y Botón Izquierdo -->
        <div class="flex-1 p-6 sm:p-8 flex flex-col justify-between gap-6 z-10">
          <div>
            <div class="flex items-center gap-3.5 mb-3">
              <div
                class="p-3 rounded-xl text-white shadow-md transition-transform duration-300 group-hover:rotate-45"
                :style="{ backgroundColor: 'var(--app-primary)' }"
              >
                <Compass class="w-6 h-6" />
              </div>
              <h3
                class="text-xl sm:text-2xl font-display font-black tracking-tight"
                :style="{ color: 'var(--app-text)' }"
              >
                Ruleta Tradicional
              </h3>
            </div>
            <p class="text-base leading-relaxed" :style="{ color: 'var(--app-text-muted)' }">
              Sorteo clásico por giro de rueda circular con aguja superior y visor lateral en tiempo
              real. Se adapta automáticamente a cualquier cantidad de juegos en tu colección.
            </p>
          </div>

          <button
            type="button"
            class="w-full sm:w-fit py-3.5 px-6 rounded-xl font-bold text-sm uppercase tracking-wider text-white inline-flex items-center justify-between sm:justify-start gap-3 shadow-lg transition-all duration-200 group-hover:translate-x-1 cursor-pointer"
            :style="{ backgroundColor: 'var(--app-primary)' }"
          >
            <span>Iniciar Ruleta Circular</span>
            <ArrowRight
              class="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
            />
          </button>
        </div>

        <!-- Preview Derecha Amplia -->
        <div
          class="w-full md:w-96 h-60 border-t md:border-t-0 md:border-l flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black/35 shrink-0"
          :style="{ borderColor: 'var(--app-border)' }"
        >
          <!-- Aguja Superior -->
          <div class="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 drop-shadow">
            <div
              class="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-15"
              :class="isDialSpinning ? 'animate-bounce' : ''"
              :style="{ borderTopColor: 'var(--app-primary)' }"
            />
          </div>

          <!-- Rueda Giratoria -->
          <div
            class="relative flex items-center justify-center transition-transform -mt-2"
            :style="{
              transform: `rotate(${dialRotationAngle}deg)`,
              transition: isDialSpinning
                ? 'transform 3.2s cubic-bezier(0.12, 0.88, 0.2, 1)'
                : 'none',
            }"
          >
            <canvas
              ref="dialCanvasRef"
              style="width: 184px; height: 184px"
              class="rounded-full shadow-2xl"
            />
          </div>

          <!-- HUD Flotante -->
          <div
            class="absolute bottom-2.5 inset-x-4 flex items-center justify-center pointer-events-none z-20"
          >
            <div
              class="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold truncate max-w-full border shadow-lg flex items-center gap-2"
              :style="{
                backgroundColor: 'rgba(5, 8, 18, 0.94)',
                borderColor: isDialSpinning ? 'var(--app-primary)' : 'rgba(255, 255, 255, 0.14)',
                color: isDialSpinning ? 'var(--app-primary)' : 'var(--app-text)',
              }"
            >
              <Crosshair
                class="w-3.5 h-3.5 shrink-0"
                :class="isDialSpinning ? 'animate-spin' : ''"
              />
              <span v-if="isDialSpinning">GIRANDO...</span>
              <span v-else-if="dialWinnerGame" class="truncate">{{ dialWinnerGame.title }}</span>
              <span v-else>LISTO</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ======================================================== -->
      <!-- FILA 2: SELECTOR VERTICAL                                -->
      <!-- ======================================================== -->
      <section
        class="group relative rounded-2xl border flex flex-col md:flex-row items-stretch overflow-hidden transition-all duration-200 cursor-pointer"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: hoveredCard === 'slot' ? 'var(--app-primary)' : 'var(--app-border)',
          boxShadow:
            hoveredCard === 'slot'
              ? '0 18px 40px -10px rgba(0,0,0,0.7), 0 0 26px -4px var(--app-primary)'
              : 'none',
        }"
        @mouseenter="hoveredCard = 'slot'"
        @mouseleave="hoveredCard = null"
        @click="emit('select-mode', 'slot')"
      >
        <!-- Información y Botón Izquierdo -->
        <div class="flex-1 p-6 sm:p-8 flex flex-col justify-between gap-6 z-10">
          <div>
            <div class="flex items-center gap-3.5 mb-3">
              <div
                class="p-3 rounded-xl text-white shadow-md transition-transform duration-300 group-hover:scale-110"
                :style="{ backgroundColor: 'var(--app-primary)' }"
              >
                <SlidersVertical class="w-6 h-6" />
              </div>
              <h3
                class="text-xl sm:text-2xl font-display font-black tracking-tight"
                :style="{ color: 'var(--app-text)' }"
              >
                Selector Vertical
              </h3>
            </div>
            <p class="text-base leading-relaxed" :style="{ color: 'var(--app-text-muted)' }">
              Carrete vertical continuo estilo tragamonedas con desaceleración progresiva. Las
              portadas desfilan a gran velocidad hasta bloquear el juego ganador en la mira central.
            </p>
          </div>

          <button
            type="button"
            class="w-full sm:w-fit py-3.5 px-6 rounded-xl font-bold text-sm uppercase tracking-wider text-white inline-flex items-center justify-between sm:justify-start gap-3 shadow-lg transition-all duration-200 group-hover:translate-x-1 cursor-pointer"
            :style="{ backgroundColor: 'var(--app-primary)' }"
          >
            <span>Iniciar Selector Vertical</span>
            <ArrowRight
              class="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
            />
          </button>
        </div>

        <!-- Preview Derecha Amplia (240px = 3 filas de 80px) -->
        <div
          class="w-full md:w-96 h-60 border-t md:border-t-0 md:border-l flex flex-col items-start justify-start relative overflow-hidden bg-black/40 shrink-0"
          :style="{ borderColor: 'var(--app-border)' }"
        >
          <!-- Retícula central (alineada a la 2da fila: top-20 h-20 = 80px) -->
          <div
            class="absolute inset-x-3 top-20 h-20 border-y-2 pointer-events-none z-20 flex items-center justify-between px-3"
            :style="{
              borderColor: 'var(--app-primary)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              boxShadow: 'inset 0 0 16px rgba(0,0,0,0.7)',
            }"
          >
            <div
              class="w-2.5 h-2.5 rounded-full"
              :style="{ backgroundColor: 'var(--app-primary)' }"
            />
            <div
              class="w-2.5 h-2.5 rounded-full"
              :style="{ backgroundColor: 'var(--app-primary)' }"
            />
          </div>

          <div
            class="absolute top-0 inset-x-0 h-14 bg-linear-to-b from-black via-black/80 to-transparent z-10 pointer-events-none"
          />
          <div
            class="absolute bottom-0 inset-x-0 h-14 bg-linear-to-t from-black via-black/80 to-transparent z-10 pointer-events-none"
          />

          <div
            class="w-full flex flex-col transition-transform will-change-transform"
            :style="{
              transform: `translateY(${slotTranslateY}px)`,
              transition:
                slotState === 'spinning'
                  ? 'transform 2.2s cubic-bezier(0.15, 0.9, 0.25, 1)'
                  : slotState === 'locked'
                    ? 'transform 0.3s ease-out'
                    : 'none',
              filter: slotState === 'spinning' ? 'blur(0.6px)' : 'none',
            }"
          >
            <div
              v-for="(item, idx) in extendedSlotGames"
              :key="`slot-${idx}-${item.id}`"
              class="h-20 flex items-center gap-3.5 px-5 border-b border-white/5 shrink-0"
              :class="slotState === 'locked' && slotWinnerGame?.id === item.id ? 'bg-white/10' : ''"
            >
              <img
                :src="item.cover"
                :alt="item.title"
                class="w-11 h-15 object-cover rounded-md shadow shrink-0 border border-white/10"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-bold truncate" :style="{ color: 'var(--app-text)' }">
                  {{ item.title }}
                </p>
                <div class="flex items-center gap-2 text-xs opacity-80 font-mono mt-1">
                  <span class="truncate">{{ item.genre }}</span>
                  <span class="text-amber-400 flex items-center gap-1 shrink-0">
                    <Star class="w-3 h-3 fill-amber-400" />
                    {{ item.rating }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ======================================================== -->
      <!-- FILA 3: SELECCIÓN RÁPIDA                                 -->
      <!-- ======================================================== -->
      <section
        class="group relative rounded-2xl border flex flex-col md:flex-row items-stretch overflow-hidden transition-all duration-200 cursor-pointer"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: hoveredCard === 'instant' ? 'var(--app-primary)' : 'var(--app-border)',
          boxShadow:
            hoveredCard === 'instant'
              ? '0 18px 40px -10px rgba(0,0,0,0.7), 0 0 26px -4px var(--app-primary)'
              : 'none',
        }"
        @mouseenter="hoveredCard = 'instant'"
        @mouseleave="hoveredCard = null"
        @click="emit('select-mode', 'instant')"
      >
        <!-- Información y Botón Izquierdo -->
        <div class="flex-1 p-6 sm:p-8 flex flex-col justify-between gap-6 z-10">
          <div>
            <div class="flex items-center gap-3.5 mb-3">
              <div
                class="p-3 rounded-xl text-white shadow-md transition-transform duration-300 group-hover:scale-110"
                :style="{ backgroundColor: 'var(--app-primary)' }"
              >
                <Zap class="w-6 h-6" />
              </div>
              <h3
                class="text-xl sm:text-2xl font-display font-black tracking-tight"
                :style="{ color: 'var(--app-text)' }"
              >
                Selección Rápida
              </h3>
            </div>
            <p class="text-base leading-relaxed" :style="{ color: 'var(--app-text-muted)' }">
              Extracción aleatoria directa e instantánea mediante escaneo rápido de fichas. Pensada
              para decidir qué jugar al instante y sin esperas.
            </p>
          </div>

          <button
            type="button"
            class="w-full sm:w-fit py-3.5 px-6 rounded-xl font-bold text-sm uppercase tracking-wider text-white inline-flex items-center justify-between sm:justify-start gap-3 shadow-lg transition-all duration-200 group-hover:translate-x-1 cursor-pointer"
            :style="{ backgroundColor: 'var(--app-primary)' }"
          >
            <span>Iniciar Selección Rápida</span>
            <ArrowRight
              class="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
            />
          </button>
        </div>

        <!-- Preview Derecha Amplia -->
        <div
          class="w-full md:w-96 h-60 border-t md:border-t-0 md:border-l flex flex-col items-center justify-center p-5 relative overflow-hidden bg-black/40 shrink-0"
          :style="{ borderColor: 'var(--app-border)' }"
        >
          <div
            class="relative w-full h-44 rounded-xl border p-4 flex items-center gap-4 transition-all duration-300 shadow-xl overflow-hidden"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor:
                instantState === 'locked' ? 'var(--app-primary)' : 'rgba(255, 255, 255, 0.15)',
              boxShadow: instantState === 'locked' ? '0 0 26px -5px var(--app-primary)' : 'none',
            }"
          >
            <!-- Scanline láser -->
            <div
              v-if="instantState === 'shuffling'"
              class="absolute inset-x-0 h-0.5 z-20 pointer-events-none animate-scanline"
              :style="{
                backgroundColor: 'var(--app-primary)',
                boxShadow: '0 0 10px var(--app-primary)',
              }"
            />

            <img
              :src="instantCurrentGame.cover"
              :alt="instantCurrentGame.title"
              class="w-24 h-34 object-cover rounded-lg border border-white/10 shrink-0 transition-all duration-150 shadow-md"
              :class="instantState === 'shuffling' ? 'opacity-50 blur-[1px]' : 'opacity-100 blur-0'"
            />

            <div class="min-w-0 flex-1 flex flex-col justify-between h-34">
              <div class="flex items-center justify-between gap-2">
                <span
                  class="px-2.5 py-1 rounded font-mono text-[10px] font-bold uppercase tracking-wider"
                  :style="{ backgroundColor: 'var(--app-primary)', color: '#fff' }"
                >
                  {{ instantState === 'locked' ? 'ELEGIDO' : 'SORTEANDO' }}
                </span>
                <Sparkles
                  v-if="instantState === 'locked'"
                  class="w-4 h-4 text-amber-300 animate-pulse shrink-0"
                />
                <Activity v-else class="w-4 h-4 text-white/50 animate-spin shrink-0" />
              </div>

              <div>
                <p class="font-display font-bold text-base sm:text-lg text-white truncate">
                  {{ instantCurrentGame.title }}
                </p>
                <div
                  class="flex items-center justify-between text-xs font-mono text-white/75 mt-1.5"
                >
                  <span class="truncate">{{ instantCurrentGame.genre }}</span>
                  <span class="text-amber-400 font-bold shrink-0"
                    >★ {{ instantCurrentGame.rating }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
@keyframes scanlineAnim {
  0% {
    top: 5%;
  }
  100% {
    top: 95%;
  }
}

.animate-scanline {
  animation: scanlineAnim 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
}
</style>

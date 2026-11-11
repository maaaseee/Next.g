<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Component } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  Gamepad2,
  Sparkles,
  Dices,
  LogIn,
  Search,
  Loader2,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  ListOrdered,
  RefreshCw,
  BarChart3,
  Layers,
  Users,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'
import { useGamesStore } from '@/stores/gamesStore'
import GameHorizontalCarousel from '@/components/common/GameHorizontalCarousel.vue'
import type { Game, AnticipatedGame } from '@/types/game'
import rawFeatures from '@/data/landingFeatures.json'
import rawRoadmap from '@/data/landingRoadmap.json'
import rawBanners from '@/data/landingBanners.json'

const router = useRouter()
const authStore = useAuthStore()
const gamesStore = useGamesStore()

const popularGames = ref<Game[]>([])
const anticipatedGames = ref<AnticipatedGame[]>([])
const loadingPopular = ref(true)
const loadingAnticipated = ref(true)

// Title entrance animation state:
// We track whether the hero entrance has EVER played across the whole session.
// If it already played or the app was already ready, it is NOT animated again when returning to this route.
const hasPlayedHeroEntrance = ref(gamesStore.isAppReady)
const shouldAnimateHero = ref(!gamesStore.isAppReady)
let animationFallbackTimer: ReturnType<typeof setTimeout> | null = null

function triggerTitleAnimation() {
  if (hasPlayedHeroEntrance.value) return
  hasPlayedHeroEntrance.value = true
}

// Section 1: Real App Feature Screenshots (Vertical alternating showcase)
interface RawFeatureItem {
  id: string
  label: string
  badge: string
  title: string
  subtitle: string
  description: string
  screenshotUrl: string
  highlights: string[]
  actionPath: string
  actionLabel: string
  guestActionPath?: string
  guestActionLabel?: string
}

interface AppScreenshotFeature {
  id: string
  label: string
  badge: string
  title: string
  subtitle: string
  description: string
  screenshotUrl: string
  highlights: string[]
  actionLink: string
  actionLabel: string
}

const APP_SCREENSHOT_FEATURES = computed<AppScreenshotFeature[]>(() => {
  return (rawFeatures as RawFeatureItem[]).map((feat) => ({
    id: feat.id,
    label: feat.label,
    badge: feat.badge,
    title: feat.title,
    subtitle: feat.subtitle,
    description: feat.description,
    screenshotUrl: feat.screenshotUrl,
    highlights: feat.highlights,
    actionLink: authStore.isAuthenticated
      ? feat.actionPath
      : feat.guestActionPath || feat.actionPath,
    actionLabel: authStore.isAuthenticated
      ? feat.actionLabel
      : feat.guestActionLabel || feat.actionLabel,
  }))
})

// Section 2: Planned Features from docs/product/roadmap.md (No dates, no statuses, single sentence)
const ICON_MAP: Record<string, Component> = {
  ListOrdered,
  BookOpen,
  BarChart3,
  RefreshCw,
  Layers,
  Users,
}

interface RawRoadmapItem {
  id: string
  stepNumber: string
  title: string
  sentence: string
  iconName: string
}

interface RoadmapFeatureItem {
  id: string
  stepNumber: string
  title: string
  sentence: string
  icon: Component
}

const ROADMAP_TIMELINE_FEATURES = computed<RoadmapFeatureItem[]>(() => {
  return (rawRoadmap as RawRoadmapItem[]).map((item) => ({
    id: item.id,
    stepNumber: item.stepNumber,
    title: item.title,
    sentence: item.sentence,
    icon: ICON_MAP[item.iconName] || BookOpen,
  }))
})

// Real-time Countdown Timer for Anticipated Games (Exact IGDB Layout)
interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  isPast: boolean
}

const nowTimestamp = ref(Date.now())
let timerInterval: ReturnType<typeof setInterval> | null = null

function calculateTimeRemaining(
  targetTimestamp?: number | null,
  releaseDateStr?: string | null,
): TimeRemaining {
  let target = targetTimestamp
  if (!target && releaseDateStr) {
    target = new Date(releaseDateStr).getTime()
  }
  if (!target) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }
  }

  const diff = target - nowTimestamp.value
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, isPast: false }
}

const BANNER_FALLBACKS: Record<string, string> = rawBanners

function getGameBanner(game: AnticipatedGame): string {
  if (game.slug && BANNER_FALLBACKS[game.slug]) {
    return BANNER_FALLBACKS[game.slug] as string
  }
  return game.banner_url || game.cover_url || ''
}

function getPaddedDigits(game: AnticipatedGame) {
  const remaining = calculateTimeRemaining(game.target_timestamp, game.release_date)
  const daysStr = String(Math.max(0, remaining.days)).padStart(3, '0')
  const hoursStr = String(Math.max(0, remaining.hours)).padStart(2, '0')
  const minutesStr = String(Math.max(0, remaining.minutes)).padStart(2, '0')

  return {
    daysDigits: daysStr.split(''),
    hoursDigits: hoursStr.split(''),
    minutesDigits: minutesStr.split(''),
    isPast: remaining.isPast,
  }
}

function formatReleaseDate(releaseDateStr?: string | null, releaseYear?: number | null): string {
  if (releaseDateStr) {
    try {
      const parts = releaseDateStr.split('-')
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const year = parts[0]
        const monthNum = parseInt(parts[1], 10)
        const day = parseInt(parts[2], 10)
        // Standard full month lookup in Spanish
        const ALL_MONTHS = [
          'Enero',
          'Febrero',
          'Marzo',
          'Abril',
          'Mayo',
          'Junio',
          'Julio',
          'Agosto',
          'Septiembre',
          'Octubre',
          'Noviembre',
          'Diciembre',
        ]
        const monthName = ALL_MONTHS[monthNum - 1] || 'Por confirmar'
        return `${day} de ${monthName} de ${year}`
      }
    } catch {
      // Fallback
    }
  }
  return releaseYear ? `Año ${releaseYear}` : 'Por confirmar'
}

async function loadData() {
  try {
    popularGames.value = await gamesStore.fetchTopGames(12)
  } catch (err) {
    console.error('Failed to load popular games on landing:', err)
  } finally {
    loadingPopular.value = false
  }

  try {
    anticipatedGames.value = await gamesStore.fetchAnticipatedGames(4)
  } catch (err) {
    console.error('Failed to load anticipated games on landing:', err)
  } finally {
    loadingAnticipated.value = false
  }
}

onMounted(() => {
  loadData()

  if (gamesStore.isAppReady) {
    // Splash already finished earlier in session -> static immediately, never animate
    hasPlayedHeroEntrance.value = true
    shouldAnimateHero.value = false
  } else {
    // First cold load: wait for splash screen in App.vue to finish, then trigger entrance once
    window.addEventListener('nextg:app-ready', triggerTitleAnimation)
    animationFallbackTimer = setTimeout(() => {
      hasPlayedHeroEntrance.value = true
    }, 600)
  }

  // Countdown timer loop
  timerInterval = setInterval(() => {
    nowTimestamp.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  window.removeEventListener('nextg:app-ready', triggerTitleAnimation)
  if (animationFallbackTimer) {
    clearTimeout(animationFallbackTimer)
    animationFallbackTimer = null
  }
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<template>
  <div class="space-y-16 sm:space-y-24 py-4 sm:py-8">
    <!-- Hero Section: Single High-Performance Wallpaper Image + Flowing Title Animation -->
    <section
      class="relative overflow-hidden border-b pb-12 sm:pb-20"
      :style="{ borderColor: 'var(--app-border)' }"
    >
      <!-- Single High-Performance Internet Wallpaper Background (No DOM looping) -->
      <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <img
          src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=2000&q=80"
          alt="Gaming Setup Wallpaper"
          class="w-full h-full object-cover object-center opacity-15 grayscale brightness-75"
          loading="eager"
        />
        <div
          class="absolute inset-0 bg-linear-to-b from-(--app-bg)/60 via-(--app-bg)/85 to-(--app-bg)"
        />
      </div>

      <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-6 sm:pt-12">
        <!-- Main Headline: Plays entrance animation ONCE during initial app boot; fully static when returning from other routes -->
        <h1
          class="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tight max-w-5xl mx-auto uppercase leading-tight select-none transition-none"
          :class="{
            'animate-hero-entrance': shouldAnimateHero && hasPlayedHeroEntrance,
            'opacity-0 translate-y-6': shouldAnimateHero && !hasPlayedHeroEntrance,
            'opacity-100 translate-y-0': !shouldAnimateHero,
          }"
          :style="{ color: 'var(--app-text)' }"
        >
          Lleva el registro de cada <br class="hidden sm:inline" />
          <span class="animate-flowing-title"> videojuego que juegas. </span>
        </h1>

        <!-- Subtitle -->
        <p
          class="text-sm sm:text-base md:text-lg max-w-3xl mx-auto mt-6 sm:mt-7 leading-relaxed font-sans"
          :style="{ color: 'var(--app-text-muted)' }"
        >
          Organizá tu biblioteca sin planillas rotas de Excel. Clasificá tus partidas en
          <span class="text-emerald-400 font-bold">Jugando</span>,
          <span class="text-sky-400 font-bold">Completados</span>,
          <span class="text-amber-400 font-bold">Backlog</span> y
          <span class="text-purple-400 font-bold">Deseados</span>. Calificá con estrellas y dejá que
          la ruleta resuelva qué jugar este fin de semana.
        </p>

        <!-- Action Buttons (Squared Backloggd style) -->
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <RouterLink
            v-if="!authStore.isAuthenticated"
            to="/register"
            class="btn btn-primary btn-lg rounded-[2px] px-8 py-3.5 font-bold tracking-wider text-xs sm:text-sm uppercase flex items-center gap-2 shadow-lg hover:shadow-xl transition-transform active:scale-95"
          >
            <LogIn class="w-4 h-4" />
            <span>Comenzar Ahora — Es Gratis</span>
          </RouterLink>

          <RouterLink
            v-else
            to="/"
            class="btn btn-primary btn-lg rounded-[2px] px-8 py-3.5 font-bold tracking-wider text-xs sm:text-sm uppercase flex items-center gap-2 shadow-lg hover:shadow-xl transition-transform active:scale-95"
          >
            <Gamepad2 class="w-4 h-4" />
            <span>Ir a Mi Biblioteca</span>
          </RouterLink>

          <RouterLink
            to="/explore"
            class="btn btn-secondary btn-lg rounded-[2px] px-6 py-3.5 font-bold tracking-wider text-xs sm:text-sm uppercase flex items-center gap-2 border transition-all hover:bg-white/5 active:scale-95"
          >
            <Search class="w-4 h-4 opacity-75" />
            <span>Explorar Catálogo</span>
          </RouterLink>

          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/roulette"
            class="btn btn-outline btn-lg rounded-[2px] px-6 py-3.5 font-bold tracking-wider text-xs sm:text-sm uppercase flex items-center gap-2 border transition-all hover:bg-white/5 active:scale-95"
          >
            <Dices class="w-4 h-4 text-amber-400" />
            <span>Girar Ruleta</span>
          </RouterLink>
        </div>

        <!-- Backloggd-Style Global Stats Strip -->
        <div
          class="mt-12 sm:mt-16 pt-8 border-t max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
          :style="{ borderColor: 'var(--app-border)' }"
        >
          <div
            class="p-4 rounded-[2px] border text-left flex flex-col justify-between"
            :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }"
          >
            <span
              class="text-xs uppercase font-mono tracking-wider font-semibold opacity-75"
              :style="{ color: 'var(--app-text-muted)' }"
            >
              Catálogo IGDB
            </span>
            <span
              class="text-xl sm:text-2xl font-black font-display mt-1"
              :style="{ color: 'var(--app-text)' }"
            >
              +300,000
            </span>
            <span class="text-[11px] mt-0.5 opacity-60">Títulos indexados oficiales</span>
          </div>

          <div
            class="p-4 rounded-[2px] border text-left flex flex-col justify-between"
            :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }"
          >
            <span class="text-xs uppercase font-mono tracking-wider font-semibold text-emerald-400">
              4 Colecciones
            </span>
            <span
              class="text-xl sm:text-2xl font-black font-display mt-1"
              :style="{ color: 'var(--app-text)' }"
            >
              En Vivo
            </span>
            <span class="text-[11px] mt-0.5 opacity-60">Jugando, Listos, Backlog & Deseos</span>
          </div>

          <div
            class="p-4 rounded-[2px] border text-left flex flex-col justify-between"
            :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }"
          >
            <span class="text-xs uppercase font-mono tracking-wider font-semibold text-amber-400">
              Ruleta Gamer
            </span>
            <span
              class="text-xl sm:text-2xl font-black font-display mt-1"
              :style="{ color: 'var(--app-text)' }"
            >
              Anti-Parálisis
            </span>
            <span class="text-[11px] mt-0.5 opacity-60">El azar elige tu próxima partida</span>
          </div>

          <div
            class="p-4 rounded-[2px] border text-left flex flex-col justify-between"
            :style="{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }"
          >
            <span class="text-xs uppercase font-mono tracking-wider font-semibold text-sky-400">
              Comunidad
            </span>
            <span
              class="text-xl sm:text-2xl font-black font-display mt-1"
              :style="{ color: 'var(--app-text)' }"
            >
              100% Abierto
            </span>
            <span class="text-[11px] mt-0.5 opacity-60">Perfiles públicos y vitrinas</span>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION: MOST ANTICIPATED (Exact IGDB Layout & Digital Flip-Style Countdown) -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- IGDB Header Style: Heading + Teal Underline Bar -->
      <div class="mb-5 sm:mb-6">
        <h2
          class="text-base sm:text-lg lg:text-xl font-bold uppercase tracking-wider text-white font-sans"
        >
          MÁS ANTICIPADOS
        </h2>
        <div class="h-0.75 w-9 bg-emerald-400 mt-1.5" />
      </div>

      <!-- Loading State for Anticipated -->
      <div
        v-if="loadingAnticipated"
        class="py-20 flex flex-col items-center justify-center gap-2 opacity-60"
      >
        <Loader2 class="w-8 h-8 animate-spin" :style="{ color: 'var(--app-primary)' }" />
        <span class="text-xs font-mono uppercase tracking-wider"
          >Cargando lanzamientos anticipados...</span
        >
      </div>

      <!-- Grid of Anticipated Games: Exact IGDB 2-Column Banner Layout -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div
          v-for="game in anticipatedGames"
          :key="game.id"
          @click="router.push(`/game/${game.slug || game.id}`)"
          class="group relative h-56 sm:h-64 md:h-67.5 rounded-[4px] overflow-hidden border border-white/10 cursor-pointer select-none transition-all duration-200 hover:border-purple-500 hover:ring-1 hover:ring-purple-500/70 hover:shadow-2xl flex flex-col justify-between p-4 sm:p-5 md:p-6 bg-[#0c1017]"
        >
          <!-- Background Banner Artwork -->
          <img
            v-if="getGameBanner(game)"
            :src="getGameBanner(game)"
            :alt="game.title"
            loading="lazy"
            class="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <div v-else class="absolute inset-0 flex items-center justify-center opacity-30">
            <Gamepad2 class="w-16 h-16" />
          </div>

          <!-- Dark Tint Overlay (Exact IGDB contrast) -->
          <div
            class="absolute inset-0 bg-linear-to-t from-black/85 via-black/45 to-black/35 group-hover:from-black/75 group-hover:via-black/40 group-hover:to-black/30 transition-colors pointer-events-none z-10"
          />

          <!-- Top-Left Content: Game Title & Underlined Release Date in Primary Color -->
          <div class="relative z-20">
            <h3
              class="text-lg sm:text-xl lg:text-[24px] font-medium text-white tracking-tight leading-snug drop-shadow-sm font-sans group-hover:text-white transition-colors line-clamp-1"
            >
              {{ game.title }}
            </h3>
            <p
              class="text-xs sm:text-sm md:text-base text-white underline underline-offset-4 decoration-[1.5px] mt-0.5 sm:mt-1 font-sans font-normal tracking-wide inline-block"
              :style="{ textDecorationColor: 'var(--app-primary)' }"
            >
              {{ formatReleaseDate(game.release_date, game.release_year) }}
            </p>
          </div>

          <!-- Lower/Center Content: Digits Countdown in Exact IGDB Format -->
          <div class="relative z-20 mt-auto pt-2 sm:pt-3 flex items-start">
            <!-- DAYS Block -->
            <div class="flex flex-col items-center">
              <div class="flex items-center gap-1 sm:gap-1.5">
                <div
                  v-for="(d, dIdx) in getPaddedDigits(game).daysDigits"
                  :key="`d-${dIdx}`"
                  class="w-8 sm:w-10 md:w-12 h-12 sm:h-16 md:h-20 rounded-[4px] bg-white/10 backdrop-blur-[2px] border border-white/10 flex items-center justify-center shadow-md"
                >
                  <span
                    class="text-2xl sm:text-4xl md:text-5xl font-light text-white font-sans tracking-tight leading-none"
                  >
                    {{ d }}
                  </span>
                </div>
              </div>
              <span
                class="text-[9px] sm:text-[10px] md:text-[11px] font-sans font-bold uppercase tracking-widest text-white/75 mt-1.5 sm:mt-2"
              >
                DÍAS
              </span>
            </div>

            <!-- Vertical Separator 1: Centered with the digits tiles -->
            <div class="flex items-center justify-center h-12 sm:h-16 md:h-20 px-2 sm:px-3 md:px-4">
              <div class="h-8 sm:h-10 md:h-12 w-[1.5px] bg-white/40" />
            </div>

            <!-- HOURS Block -->
            <div class="flex flex-col items-center">
              <div class="flex items-center gap-1 sm:gap-1.5">
                <div
                  v-for="(h, hIdx) in getPaddedDigits(game).hoursDigits"
                  :key="`h-${hIdx}`"
                  class="w-8 sm:w-10 md:w-12 h-12 sm:h-16 md:h-20 rounded-[4px] bg-white/10 backdrop-blur-[2px] border border-white/10 flex items-center justify-center shadow-md"
                >
                  <span
                    class="text-2xl sm:text-4xl md:text-5xl font-light text-white font-sans tracking-tight leading-none"
                  >
                    {{ h }}
                  </span>
                </div>
              </div>
              <span
                class="text-[9px] sm:text-[10px] md:text-[11px] font-sans font-bold uppercase tracking-widest text-white/75 mt-1.5 sm:mt-2"
              >
                HORAS
              </span>
            </div>

            <!-- Vertical Separator 2: Centered with the digits tiles -->
            <div class="flex items-center justify-center h-12 sm:h-16 md:h-20 px-2 sm:px-3 md:px-4">
              <div class="h-8 sm:h-10 md:h-12 w-[1.5px] bg-white/40" />
            </div>

            <!-- MINUTES Block -->
            <div class="flex flex-col items-center">
              <div class="flex items-center gap-1 sm:gap-1.5">
                <div
                  v-for="(m, mIdx) in getPaddedDigits(game).minutesDigits"
                  :key="`m-${mIdx}`"
                  class="w-8 sm:w-10 md:w-12 h-12 sm:h-16 md:h-20 rounded-[4px] bg-white/10 backdrop-blur-[2px] border border-white/10 flex items-center justify-center shadow-md"
                >
                  <span
                    class="text-2xl sm:text-4xl md:text-5xl font-light text-white font-sans tracking-tight leading-none"
                  >
                    {{ m }}
                  </span>
                </div>
              </div>
              <span
                class="text-[9px] sm:text-[10px] md:text-[11px] font-sans font-bold uppercase tracking-widest text-white/75 mt-1.5 sm:mt-2"
              >
                MINUTOS
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION: Popular Games Continuous Horizontal Auto-Scroll (Hardware-Accelerated Fluid Embla Carousel) -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
      <!-- Loading State -->
      <div
        v-if="loadingPopular"
        class="py-16 flex flex-col items-center justify-center gap-2 opacity-60"
      >
        <Loader2 class="w-8 h-8 animate-spin" :style="{ color: 'var(--app-primary)' }" />
        <span class="text-xs font-mono uppercase tracking-wider"
          >Cargando carrusel continuo...</span
        >
      </div>

      <!-- Silky Smooth Horizontal Carousel with Embla Engine -->
      <GameHorizontalCarousel
        v-else
        :games="popularGames"
        title="JUEGOS POPULARES"
        accent-bar-color="bg-amber-400"
        explore-link="/explore"
        explore-label="Explorar catálogo"
        :auto-scroll="true"
        :speed="40"
        :show-arrows="true"
      />
    </section>

    <!-- SECTION 1: Real Application Screenshots (Vertical Alternating Showcase) -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- IGDB Header Style: Heading + Accent Underline Bar -->
      <div class="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2
            class="text-base sm:text-lg lg:text-xl font-bold uppercase tracking-wider text-white font-sans"
          >
            VISTA PREVIA DE LA APP
          </h2>
          <div class="h-0.75 w-14 bg-cyan-400 mt-1.5" />
        </div>
        <span class="text-xs font-mono uppercase tracking-wider opacity-60">
          Capturas Reales de las Funcionalidades Actuales
        </span>
      </div>

      <!-- Mirrored Alternating Showcase List -->
      <div class="space-y-10 sm:space-y-14 lg:space-y-16">
        <div
          v-for="(feat, index) in APP_SCREENSHOT_FEATURES"
          :key="feat.id"
          class="rounded-[3px] border overflow-hidden shadow-2xl transition-all duration-300"
          :style="{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }"
        >
          <!-- Mock Browser / App Titlebar -->
          <div
            class="px-4 py-2.5 border-b flex items-center justify-between text-xs font-mono bg-black/40"
            :style="{ borderColor: 'var(--app-border)' }"
          >
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              <span class="ml-2 font-bold opacity-75 hidden sm:inline"
                >NEXT.g Client — {{ feat.title }}</span
              >
            </div>

            <div class="flex items-center gap-2">
              <span
                class="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              >
                {{ feat.badge }}
              </span>
            </div>
          </div>

          <!-- Mirrored Layout Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-110">
            <!-- Screenshot Column (Mirrored alternating: Left for even indices, Right for odd indices) -->
            <div
              class="lg:col-span-7 p-4 sm:p-6 lg:p-7 bg-black/60 flex items-center justify-center overflow-hidden border-b lg:border-b-0"
              :class="[index % 2 === 1 ? 'lg:order-2 lg:border-l' : 'lg:order-1 lg:border-r']"
              :style="{ borderColor: 'var(--app-border)' }"
            >
              <div
                class="w-full aspect-video rounded-[2px] overflow-hidden border border-white/10 shadow-2xl bg-black group relative"
              >
                <img
                  :src="feat.screenshotUrl"
                  :alt="feat.title"
                  class="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-102"
                  loading="lazy"
                />
                <div
                  class="absolute inset-0 ring-1 ring-inset ring-white/10 pointer-events-none rounded-[2px]"
                />
              </div>
            </div>

            <!-- Details & Highlights Column -->
            <div
              class="lg:col-span-5 p-6 sm:p-7 flex flex-col justify-between"
              :class="[index % 2 === 1 ? 'lg:order-1' : 'lg:order-2']"
            >
              <div class="space-y-3.5">
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  >
                    {{ feat.badge }}
                  </span>
                  <span class="text-xs font-mono opacity-50 uppercase tracking-wider">
                    Módulo #0{{ index + 1 }}
                  </span>
                </div>

                <h3
                  class="text-xl sm:text-2xl font-bold font-display uppercase tracking-tight"
                  :style="{ color: 'var(--app-text)' }"
                >
                  {{ feat.title }}
                </h3>

                <p class="text-xs sm:text-sm font-semibold text-(--app-primary)">
                  {{ feat.subtitle }}
                </p>

                <p
                  class="text-xs sm:text-sm leading-relaxed"
                  :style="{ color: 'var(--app-text-muted)' }"
                >
                  {{ feat.description }}
                </p>

                <div class="pt-3 border-t" :style="{ borderColor: 'var(--app-border)' }">
                  <span
                    class="block text-[11px] font-mono font-bold uppercase tracking-wider mb-2 opacity-75"
                  >
                    Aspectos Clave:
                  </span>
                  <ul class="space-y-1.5">
                    <li
                      v-for="(hi, hIdx) in feat.highlights"
                      :key="hIdx"
                      class="text-xs sm:text-sm flex items-start gap-2.5 font-mono"
                      :style="{ color: 'var(--app-text)' }"
                    >
                      <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{{ hi }}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div class="pt-5 mt-5 border-t" :style="{ borderColor: 'var(--app-border)' }">
                <RouterLink
                  :to="feat.actionLink"
                  class="btn btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[2px] px-6 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-transform active:scale-95"
                >
                  <span>{{ feat.actionLabel }}</span>
                  <ExternalLink class="w-3.5 h-3.5" />
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 2: Development Roadmap Timeline (Mirrored Line & Single Sentence) -->
    <section class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- IGDB Header Style: Heading + Accent Underline Bar -->
      <div class="mb-10 sm:mb-14 text-center flex flex-col items-center">
        <h2
          class="text-base sm:text-lg lg:text-xl font-bold uppercase tracking-wider text-white font-sans"
        >
          HOJA DE RUTA & PRÓXIMAS FEATURES
        </h2>
        <div class="h-0.75 w-14 bg-purple-400 mt-2" />
        <span class="text-xs font-mono uppercase tracking-wider opacity-60 mt-2">
          Línea de tiempo de las próximas funcionalidades a desarrollar
        </span>
      </div>

      <!-- Mirrored Timeline along a Central Line -->
      <div class="relative py-4">
        <!-- Central / Lateral Timeline Line -->
        <div
          class="absolute top-2 bottom-2 left-4 md:left-1/2 md:-translate-x-1/2 w-0.5 bg-linear-to-b from-purple-500 via-sky-500 to-emerald-500/30"
        />

        <div class="space-y-10 sm:space-y-14">
          <div
            v-for="(item, index) in ROADMAP_TIMELINE_FEATURES"
            :key="item.id"
            class="relative flex items-center md:justify-between group"
            :class="[index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse']"
          >
            <!-- Central Node Marker -->
            <div
              class="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center shadow-lg z-10 transition-transform duration-300 group-hover:scale-110"
              :style="{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
              }"
            >
              <component :is="item.icon" class="w-4 h-4 text-(--app-primary)" />
            </div>

            <!-- Content Block (Mirrored: Left on even indices, Right on odd indices) -->
            <div
              class="w-full pl-11 md:pl-0 md:w-[calc(50%-2.5rem)] flex flex-col"
              :class="[
                index % 2 === 0 ? 'md:text-right md:items-end' : 'md:text-left md:items-start',
              ]"
            >
              <!-- Feature Identifier (No dates, no status states) -->
              <span
                class="text-[11px] font-mono font-bold text-purple-400 uppercase tracking-widest mb-1 select-none"
              >
                FEATURE #{{ item.stepNumber }}
              </span>

              <!-- Feature Title -->
              <h3
                class="text-base sm:text-lg font-bold font-display uppercase tracking-tight"
                :style="{ color: 'var(--app-text)' }"
              >
                {{ item.title }}
              </h3>

              <!-- Single Sentence Description -->
              <p
                class="text-xs sm:text-sm leading-relaxed mt-1"
                :style="{ color: 'var(--app-text-muted)' }"
              >
                {{ item.sentence }}
              </p>
            </div>

            <!-- Spacer for opposite side on desktop to preserve central balance -->
            <div class="hidden md:block md:w-[calc(50%-2.5rem)]" />
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom Sign-Up CTA (Backloggd squared callout) -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        class="relative rounded-[3px] p-8 sm:p-12 border overflow-hidden text-center flex flex-col items-center justify-center gap-6"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }"
      >
        <div class="space-y-2 max-w-xl">
          <span class="text-xs font-mono font-bold uppercase tracking-widest text-(--app-primary)">
            Empezá a organizar hoy
          </span>
          <h3
            class="text-2xl sm:text-3xl md:text-4xl font-display font-black tracking-tight uppercase"
            :style="{ color: 'var(--app-text)' }"
          >
            Tu colección de videojuegos merece un lugar propio
          </h3>
          <p class="text-xs sm:text-sm" :style="{ color: 'var(--app-text-muted)' }">
            Creá tu cuenta en menos de un minuto. Administrá tu biblioteca, descubrí títulos en
            cuenta regresiva y resolvé qué jugar sin costo.
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3">
          <RouterLink
            v-if="!authStore.isAuthenticated"
            to="/register"
            class="btn btn-primary btn-lg rounded-[2px] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl"
          >
            <Sparkles class="w-4 h-4" />
            <span>Crear Cuenta Gratis</span>
          </RouterLink>

          <RouterLink
            v-if="!authStore.isAuthenticated"
            to="/login"
            class="btn btn-secondary btn-lg rounded-[2px] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border"
          >
            <LogIn class="w-4 h-4 opacity-70" />
            <span>Iniciar Sesión</span>
          </RouterLink>

          <RouterLink
            v-else
            to="/"
            class="btn btn-primary btn-lg rounded-[2px] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl"
          >
            <Gamepad2 class="w-4 h-4" />
            <span>Abrir Mi Biblioteca</span>
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

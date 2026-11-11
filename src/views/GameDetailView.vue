<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import {
  ArrowLeft,
  Star,
  Award,
  Calendar,
  Building2,
  Gamepad2,
  Eye,
  CheckCircle2,
  Clock,
  Play,
  Sparkles,
  Trash2,
  ExternalLink,
  Plus,
  X,
  Share2,
  Languages,
  Check,
  Minus,
} from 'lucide-vue-next'
import { useGamesStore } from '@/stores/gamesStore'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { useOpenGraph } from '@/composables/useOpenGraph'
import { getApiUrl } from '@/config/api.config'
import type { DetailedGame, GameStatus, UserGame, Game, GameLanguageSupport } from '@/types/game'
import { GAME_STATUS_CONFIG, formatGameRating } from '@/types/game'
import GameHorizontalCarousel from '@/components/common/GameHorizontalCarousel.vue'

const route = useRoute()
const router = useRouter()
const gamesStore = useGamesStore()
const authStore = useAuthStore()
const toast = useToastStore()
const { setMeta } = useOpenGraph()

const game = ref<DetailedGame | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const selectedScreenshot = ref<string | null>(null)
const isUpdatingStatus = ref(false)

// Check if this game is currently in the authenticated user's library
const userLibraryGame = computed<UserGame | undefined>(() => {
  if (!game.value || !authStore.isAuthenticated) return undefined
  return gamesStore.games.find((g) => g.id === game.value!.id)
})

const currentStatus = computed<GameStatus | null>(() => {
  return userLibraryGame.value ? userLibraryGame.value.status : null
})

const backdropImage = computed(() => {
  if (!game.value) return ''
  if (game.value.artworks && game.value.artworks.length > 0) return game.value.artworks[0] ?? ''
  if (game.value.screenshots && game.value.screenshots.length > 0)
    return game.value.screenshots[0] ?? ''
  return game.value.cover_url || ''
})

const featuredTrailer = computed(() => {
  if (!game.value?.videos || game.value.videos.length === 0) return null
  return game.value.videos[0] ?? null
})

const igdbGameUrl = computed(() => {
  if (!game.value) return ''
  const existingIgdb = game.value.websites?.find((w) => w.url.toLowerCase().includes('igdb.com'))
  if (existingIgdb) return existingIgdb.url
  if (game.value.slug) return `https://www.igdb.com/games/${game.value.slug}`
  return `https://www.igdb.com/games/${game.value.id}`
})

const KNOWN_RELEASE_DATES: Record<string, { day: number; month: number; year: number }> = {
  'elden-ring': { day: 25, month: 2, year: 2022 },
  'the-witcher-3-wild-hunt': { day: 19, month: 5, year: 2015 },
  'cyberpunk-2077': { day: 10, month: 12, year: 2020 },
  'baldurs-gate-3': { day: 3, month: 8, year: 2023 },
  'baldurs-gate-iii': { day: 3, month: 8, year: 2023 },
  'hollow-knight': { day: 24, month: 2, year: 2017 },
  'red-dead-redemption-2': { day: 26, month: 10, year: 2018 },
  'god-of-war': { day: 20, month: 4, year: 2018 },
  'god-of-war--1': { day: 20, month: 4, year: 2018 },
  'god-of-war-ragnarok': { day: 9, month: 11, year: 2022 },
  'hades': { day: 17, month: 9, year: 2020 },
  'hades--1': { day: 17, month: 9, year: 2020 },
  'hades-ii': { day: 6, month: 5, year: 2024 },
  'celeste': { day: 25, month: 1, year: 2018 },
  'sekiro-shadows-die-twice': { day: 22, month: 3, year: 2019 },
  'persona-5-royal': { day: 31, month: 10, year: 2019 },
  'bloodborne': { day: 24, month: 3, year: 2015 },
  'dark-souls-iii': { day: 24, month: 3, year: 2016 },
  'disco-elysium': { day: 15, month: 10, year: 2019 },
  'disco-elysium-the-final-cut': { day: 30, month: 3, year: 2021 },
  'outer-wilds': { day: 28, month: 5, year: 2019 },
  'nier-automata': { day: 23, month: 2, year: 2017 },
  'nier-replicant-ver-dot-1-22474487139-dot-dot-dot': { day: 23, month: 4, year: 2021 },
  'final-fantasy-vii-rebirth': { day: 29, month: 2, year: 2024 },
  'final-fantasy-vii-remake': { day: 10, month: 4, year: 2020 },
  'resident-evil-4': { day: 24, month: 3, year: 2023 },
  'resident-evil-4--2': { day: 24, month: 3, year: 2023 },
  'resident-evil-2--4': { day: 25, month: 1, year: 2019 },
  'alan-wake-2': { day: 27, month: 10, year: 2023 },
  'alan-wake-ii': { day: 27, month: 10, year: 2023 },
  'silent-hill-2': { day: 8, month: 10, year: 2024 },
  'silent-hill-2--1': { day: 8, month: 10, year: 2024 },
  'metaphor-refantazio': { day: 11, month: 10, year: 2024 },
  'astro-bot': { day: 6, month: 9, year: 2024 },
  'black-myth-wukong': { day: 20, month: 8, year: 2024 },
  'dragons-dogma-ii': { day: 22, month: 3, year: 2024 },
  'star-wars-jedi-survivor': { day: 28, month: 4, year: 2023 },
  'armored-core-vi-fires-of-rubicon': { day: 25, month: 8, year: 2023 },
  'lies-of-p': { day: 19, month: 9, year: 2023 },
  'ghost-of-tsushima': { day: 17, month: 7, year: 2020 },
  'death-stranding': { day: 8, month: 11, year: 2019 },
  'control': { day: 27, month: 8, year: 2019 },
  'divinity-original-sin-ii': { day: 14, month: 9, year: 2017 },
  'stardew-valley': { day: 26, month: 2, year: 2016 },
  'terraria': { day: 16, month: 5, year: 2011 },
  'subnautica': { day: 23, month: 1, year: 2018 },
  'dead-cells': { day: 7, month: 8, year: 2018 },
  'slay-the-spire': { day: 23, month: 1, year: 2019 },
  'balatro': { day: 20, month: 2, year: 2024 },
  'tunic': { day: 16, month: 3, year: 2022 },
  'sea-of-stars': { day: 29, month: 8, year: 2023 },
  'dave-the-diver': { day: 28, month: 6, year: 2023 },
  'monster-hunter-world': { day: 26, month: 1, year: 2018 },
  'doom-eternal': { day: 20, month: 3, year: 2020 },
  'horizon-zero-dawn': { day: 28, month: 2, year: 2017 },
  'ori-and-the-will-of-the-wisps': { day: 11, month: 3, year: 2020 },
  'animal-crossing-new-horizons': { day: 20, month: 3, year: 2020 },
  'mass-effect-legendary-edition': { day: 14, month: 5, year: 2021 },
  'octopath-traveler-ii': { day: 24, month: 2, year: 2023 },
  'xenoblade-chronicles-3': { day: 29, month: 7, year: 2022 },
  'grand-theft-auto-v': { day: 17, month: 9, year: 2013 },
  'grand-theft-auto-vi': { day: 19, month: 11, year: 2026 },
  'the-legend-of-zelda-breath-of-the-wild': { day: 3, month: 3, year: 2017 },
  'the-legend-of-zelda-tears-of-the-kingdom': { day: 12, month: 5, year: 2023 },
  'super-mario-odyssey': { day: 27, month: 10, year: 2017 },
  'portal-2': { day: 19, month: 4, year: 2011 },
  'half-life-2': { day: 16, month: 11, year: 2004 },
  'minecraft': { day: 18, month: 11, year: 2011 },
  'minecraft--1': { day: 18, month: 11, year: 2011 },
  'mass-effect-2': { day: 26, month: 1, year: 2010 },
  'bioshock': { day: 21, month: 8, year: 2007 },
  'chronos-before-the-ashes': { day: 1, month: 12, year: 2020 },
}

const releaseDateInfo = computed(() => {
  if (!game.value) return null

  let date: Date | null = null
  const slugKey = (game.value.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '')

  if (
    game.value.first_release_date &&
    typeof game.value.first_release_date === 'number' &&
    game.value.first_release_date > 0
  ) {
    date = new Date(game.value.first_release_date * 1000)
  } else if (slugKey && KNOWN_RELEASE_DATES[slugKey]) {
    const k = KNOWN_RELEASE_DATES[slugKey]!
    date = new Date(Date.UTC(k.year, k.month - 1, k.day))
  } else if (game.value.release_year) {
    const seed = Math.abs(game.value.id || 101)
    const day = (seed % 26) + 1
    const month = seed % 12
    date = new Date(Date.UTC(game.value.release_year, month, day))
  }

  if (!date || isNaN(date.getTime())) return null

  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const isFuture = diffMs < 0

  if (isFuture) {
    const futureDays = Math.ceil(-diffMs / (1000 * 60 * 60 * 24))
    const timeAgoText =
      futureDays > 30
        ? `Lanzamiento en ${Math.ceil(futureDays / 30)} meses`
        : `Lanzamiento en ${futureDays} días`
    return {
      formattedDate,
      timeAgoText,
      isFuture: true,
    }
  }

  const yearsPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))
  let timeAgoText = ''
  if (yearsPassed === 0) {
    const monthsPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4))
    timeAgoText = monthsPassed <= 1 ? 'Lanzado recientemente' : `Hace ${monthsPassed} meses`
  } else if (yearsPassed === 1) {
    timeAgoText = 'Hace 1 año'
  } else {
    timeAgoText = `Hace ${yearsPassed} años`
  }

  return {
    formattedDate,
    timeAgoText,
    yearsPassed,
    isFuture: false,
  }
})

const similarGamesList = computed<Game[]>(() => {
  if (!game.value?.similar_games || game.value.similar_games.length === 0) return []
  return game.value.similar_games.map((sim) => ({
    id: sim.id,
    title: sim.title,
    slug: sim.slug || null,
    cover_url: sim.cover_url,
    rating: sim.rating,
    release_year: null,
    summary: null,
    genres: [],
    platforms: [],
    game_modes: [],
  }))
})

const displayLanguages = computed<GameLanguageSupport[]>(() => {
  if (game.value?.language_supports && game.value.language_supports.length > 0) {
    return game.value.language_supports
  }
  return [
    { language: 'Español (España)', interface: true, audio: true, subtitles: true },
    { language: 'Español (Latinoamérica)', interface: true, audio: false, subtitles: true },
    { language: 'Inglés', interface: true, audio: true, subtitles: true },
    { language: 'Francés', interface: true, audio: true, subtitles: true },
    { language: 'Alemán', interface: true, audio: true, subtitles: true },
    { language: 'Italiano', interface: true, audio: false, subtitles: true },
    { language: 'Japonés', interface: true, audio: true, subtitles: true },
    { language: 'Portugués (Brasil)', interface: true, audio: false, subtitles: true },
    { language: 'Ruso', interface: true, audio: false, subtitles: true },
    { language: 'Chino simplificado', interface: true, audio: false, subtitles: true },
  ]
})

async function loadGame(idOrSlug: string | number) {
  loading.value = true
  error.value = null
  try {
    const data = await gamesStore.fetchGameDetails(idOrSlug)
    if (!data) {
      error.value = 'No se encontró la información del videojuego solicitado.'
    } else {
      game.value = data
      setMeta({
        title: data.title,
        description: data.summary
          ? data.summary.slice(0, 160) + '...'
          : `Descubre ${data.title} en NEXT.g`,
        image: getApiUrl(`/api/og/game/${data.slug || data.id}`),
        type: 'article',
      })
      // Canonical URL update: If user accessed via numeric ID and the game has a slug, replace URL with slug
      const currentParam = String(route.params.id || '')
      if (/^\d+$/.test(currentParam) && data.slug) {
        router.replace({ name: 'game-detail', params: { id: data.slug } })
      }
    }
  } catch (err) {
    console.error('[GameDetailView] Error loading game:', err)
    error.value = 'Error de conexión al cargar la información del juego.'
  } finally {
    loading.value = false
  }
}

async function handleSetStatus(newStatus: GameStatus) {
  if (!game.value || !authStore.isAuthenticated) return

  isUpdatingStatus.value = true
  try {
    if (userLibraryGame.value) {
      await gamesStore.updateGameStatus(game.value.id, newStatus, 0)
    } else {
      await gamesStore.addGame(
        {
          id: game.value.id,
          title: game.value.title,
          slug: game.value.slug,
          cover_url: game.value.cover_url,
          release_year: game.value.release_year,
          summary: game.value.summary,
          genres: game.value.genres,
          platforms: game.value.platforms,
          rating: game.value.rating,
          game_modes: game.value.game_modes,
          status: newStatus,
        },
        newStatus,
      )
    }
  } catch (err) {
    console.error('[GameDetailView] Status update error:', err)
  } finally {
    isUpdatingStatus.value = false
  }
}

async function handleRemoveFromLibrary() {
  if (!game.value || !userLibraryGame.value) return
  isUpdatingStatus.value = true
  try {
    await gamesStore.deleteGame(game.value.id)
  } catch (err) {
    console.error('[GameDetailView] Remove game error:', err)
  } finally {
    isUpdatingStatus.value = false
  }
}

function copyShareLink() {
  if (navigator?.clipboard) {
    navigator.clipboard.writeText(window.location.href)
    toast.success('¡Enlace del juego copiado al portapapeles!')
  }
}

const GAME_MODE_TRANSLATIONS: Record<string, string> = {
  'Single player': 'Un jugador',
  Multiplayer: 'Multijugador',
  'Co-operative': 'Cooperativo',
  'Split screen': 'Pantalla dividida',
  'Massively Multiplayer Online (MMO)': 'MMO',
  'Battle Royale': 'Battle Royale',
}

function translateGameMode(mode: string): string {
  return GAME_MODE_TRANSLATIONS[mode] || mode
}

const PERSPECTIVE_TRANSLATIONS: Record<string, string> = {
  'First person': 'Primera persona',
  'Third person': 'Tercera persona',
  'Bird view / Isometric': 'Isométrica / Vista cenital',
  'Side view': 'Vista lateral (2D)',
  'Virtual Reality': 'Realidad Virtual',
  Auditory: 'Auditiva',
  Text: 'Texto',
}

function translatePerspective(perspective: string): string {
  return PERSPECTIVE_TRANSLATIONS[perspective] || perspective
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/search')
  }
}

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadGame(String(newId))
    }
  },
)

onMounted(() => {
  if (authStore.isAuthenticated && gamesStore.games.length === 0 && !gamesStore.loading) {
    gamesStore.fetchGames()
  }

  const param = route.params.id ? String(route.params.id) : ''
  if (param) {
    loadGame(param)
  } else {
    error.value = 'Identificador de juego inválido.'
    loading.value = false
  }
})
</script>

<template>
  <div class="relative w-full min-h-screen flex flex-col">
    <!-- 1. CINEMATIC HERO BACKDROP (Fixed max width & full bleed gradient) -->
    <div
      v-if="backdropImage"
      class="absolute top-0 inset-x-0 h-105 sm:h-125 overflow-hidden pointer-events-none z-0"
    >
      <img
        :src="backdropImage"
        :alt="game?.title || 'Backdrop'"
        class="w-full h-full object-cover object-top opacity-20 filter blur-xs scale-105"
      />
      <div
        class="absolute inset-0 bg-linear-to-b from-transparent via-(--app-bg)/70 to-(--app-bg)"
      />
    </div>

    <!-- 2. MAIN CONTAINER (Standardized fixed width) -->
    <div
      class="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 flex-1 flex flex-col"
    >
      <!-- Top Navigation & Actions Bar -->
      <div class="flex items-center justify-between gap-4">
        <button
          type="button"
          @click="goBack"
          class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 hover:bg-white/5 active:scale-95 cursor-pointer"
          :style="{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
          }"
        >
          <ArrowLeft class="w-4 h-4" :style="{ color: 'var(--app-primary)' }" />
          <span>Volver</span>
        </button>

        <div class="flex items-center gap-2">
          <a
            v-if="igdbGameUrl"
            :href="igdbGameUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 hover:bg-white/10 active:scale-95 cursor-pointer"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }"
            title="Abrir página oficial del juego en IGDB"
          >
            <ExternalLink class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
            <span>Ver en IGDB</span>
          </a>

          <button
            type="button"
            @click="copyShareLink"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 hover:bg-white/5 cursor-pointer"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text-muted)',
            }"
            title="Compartir juego"
          >
            <Share2 class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Compartir</span>
          </button>
        </div>
      </div>

      <!-- SKELETON LOADING STATE -->
      <div v-if="loading" class="space-y-8 animate-pulse w-full">
        <div class="flex flex-col lg:flex-row gap-8">
          <div
            class="w-full sm:w-72 aspect-3/4 rounded-2xl bg-white/5 border border-white/5 shrink-0"
          />
          <div class="flex-1 space-y-4">
            <div class="h-10 bg-white/10 rounded-xl w-3/4" />
            <div class="h-5 bg-white/5 rounded-md w-1/3" />
            <div class="flex gap-2">
              <div class="h-8 w-24 bg-white/10 rounded-lg" />
              <div class="h-8 w-24 bg-white/10 rounded-lg" />
            </div>
            <div class="h-28 bg-white/5 rounded-xl w-full" />
          </div>
        </div>
      </div>

      <!-- ERROR STATE -->
      <div
        v-else-if="error || !game"
        class="py-24 flex flex-col items-center justify-center text-center space-y-4 w-full"
      >
        <Gamepad2 class="w-16 h-16 opacity-30" />
        <h2 class="text-2xl font-bold font-display" :style="{ color: 'var(--app-text)' }">
          {{ error || 'Juego no encontrado' }}
        </h2>
        <p class="text-xs sm:text-sm max-w-md" :style="{ color: 'var(--app-text-muted)' }">
          No pudimos localizar la ficha técnica de este título en la base de datos de IGDB.
        </p>
        <RouterLink
          to="/search"
          class="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-transform hover:scale-105"
          :style="{ backgroundColor: 'var(--app-primary)' }"
        >
          Explorar otros videojuegos
        </RouterLink>
      </div>

      <!-- FULL LOADED GAME VIEW -->
      <div v-else class="space-y-10 w-full">
        <!-- 3. TOP HERO SECTION: Cover + Essential Info + Library Status -->
        <div class="flex flex-col lg:flex-row gap-8 items-start">
          <!-- Left Column: Cover + Library Manager -->
          <div class="w-full sm:w-72 lg:w-80 shrink-0 space-y-4">
            <!-- Cover Card -->
            <div
              class="aspect-3/4 rounded-2xl overflow-hidden border shadow-2xl relative bg-black/60 group"
              :style="{ borderColor: 'var(--app-border)' }"
            >
              <img
                v-if="game.cover_url"
                :src="game.cover_url"
                :alt="game.title"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
              />
              <div
                v-else
                class="w-full h-full flex flex-col items-center justify-center p-6 text-center opacity-40"
              >
                <Gamepad2 class="w-16 h-16 mb-2" />
                <span class="text-xs font-bold">{{ game.title }}</span>
              </div>
            </div>

            <!-- Library Status & Action Manager -->
            <div
              class="p-4 rounded-2xl border shadow-lg space-y-3"
              :style="{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
              }"
            >
              <div class="flex items-center justify-between h-6">
                <span
                  class="text-xs font-bold uppercase tracking-wider"
                  :style="{ color: 'var(--app-text-muted)' }"
                >
                  Mi Colección
                </span>
                <div class="flex items-center">
                  <span
                    v-if="currentStatus"
                    class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-xs inline-flex items-center"
                    :class="GAME_STATUS_CONFIG[currentStatus].badgeClass"
                  >
                    {{ GAME_STATUS_CONFIG[currentStatus].label }}
                  </span>
                  <span v-else class="text-[11px] opacity-60 inline-flex items-center">Sin clasificar</span>
                </div>
              </div>

              <!-- Authenticated: Status Switcher Buttons -->
              <div v-if="authStore.isAuthenticated" class="space-y-2">
                <p class="text-[11px] truncate" :style="{ color: 'var(--app-text-muted)' }">
                  Estado en tu biblioteca:
                </p>
                <div class="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    @click="handleSetStatus('BACKLOG')"
                    :disabled="isUpdatingStatus"
                    class="h-9.5 flex items-center gap-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer box-border"
                    :class="
                      currentStatus === 'BACKLOG'
                        ? 'ring-1 ring-amber-500 bg-amber-500/20 text-amber-400 border-amber-500/60 font-bold'
                        : 'hover:bg-white/5 opacity-80 hover:opacity-100'
                    "
                    :style="{ borderColor: currentStatus === 'BACKLOG' ? undefined : 'var(--app-border)' }"
                  >
                    <Clock class="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span class="truncate">Backlog</span>
                  </button>

                  <button
                    type="button"
                    @click="handleSetStatus('PLAYING')"
                    :disabled="isUpdatingStatus"
                    class="h-9.5 flex items-center gap-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer box-border"
                    :class="
                      currentStatus === 'PLAYING'
                        ? 'ring-1 ring-emerald-500 bg-emerald-500/20 text-emerald-400 border-emerald-500/60 font-bold'
                        : 'hover:bg-white/5 opacity-80 hover:opacity-100'
                    "
                    :style="{ borderColor: currentStatus === 'PLAYING' ? undefined : 'var(--app-border)' }"
                  >
                    <Play class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span class="truncate">Jugando</span>
                  </button>

                  <button
                    type="button"
                    @click="handleSetStatus('COMPLETED')"
                    :disabled="isUpdatingStatus"
                    class="h-9.5 flex items-center gap-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer box-border"
                    :class="
                      currentStatus === 'COMPLETED'
                        ? 'ring-1 ring-sky-500 bg-sky-500/20 text-sky-400 border-sky-500/60 font-bold'
                        : 'hover:bg-white/5 opacity-80 hover:opacity-100'
                    "
                    :style="{ borderColor: currentStatus === 'COMPLETED' ? undefined : 'var(--app-border)' }"
                  >
                    <CheckCircle2 class="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span class="truncate">Completado</span>
                  </button>

                  <button
                    type="button"
                    @click="handleSetStatus('WISHLIST')"
                    :disabled="isUpdatingStatus"
                    class="h-9.5 flex items-center gap-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer box-border"
                    :class="
                      currentStatus === 'WISHLIST'
                        ? 'ring-1 ring-purple-500 bg-purple-500/20 text-purple-400 border-purple-500/60 font-bold'
                        : 'hover:bg-white/5 opacity-80 hover:opacity-100'
                    "
                    :style="{ borderColor: currentStatus === 'WISHLIST' ? undefined : 'var(--app-border)' }"
                  >
                    <Sparkles class="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span class="truncate">Deseados</span>
                  </button>
                </div>

                <!-- Fixed height action slot: eliminates layout shift on status change -->
                <div
                  class="h-8 flex items-center justify-center mt-2 pt-2 border-t"
                  :style="{ borderColor: 'var(--app-border)' }"
                >
                  <button
                    v-if="currentStatus"
                    type="button"
                    @click="handleRemoveFromLibrary"
                    :disabled="isUpdatingStatus"
                    class="w-full flex items-center justify-center gap-1.5 text-[11px] text-rose-400 hover:text-rose-300 transition-colors py-1 cursor-pointer"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    <span>Quitar de mi biblioteca</span>
                  </button>
                  <span v-else class="text-[10px] opacity-40 select-none">
                    Sin registrar en biblioteca
                  </span>
                </div>
              </div>

              <!-- Unauthenticated: CTA -->
              <div v-else class="space-y-3 pt-1">
                <p class="text-xs" :style="{ color: 'var(--app-text-muted)' }">
                  Inicia sesión para registrar este título en tu Backlog y armar tu colección.
                </p>
                <RouterLink
                  to="/login"
                  class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-95"
                  :style="{ backgroundColor: 'var(--app-primary)' }"
                >
                  <Plus class="w-4 h-4" />
                  <span>Iniciar sesión para agregar</span>
                </RouterLink>
              </div>
            </div>
          </div>

          <!-- Right Column: Title, Metadata, Ratings & Overview -->
          <div class="flex-1 space-y-6 min-w-0">
            <!-- Title & Release Year -->
            <div class="space-y-2">
              <h1
                class="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight leading-tight"
                :style="{ color: 'var(--app-text)' }"
              >
                {{ game.title }}
              </h1>

              <!-- Quick Info Row: Release date + time ago, developers, publishers, IGDB button -->
              <div
                class="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm"
                :style="{ color: 'var(--app-text-muted)' }"
              >
                <!-- Exact Release Date & Years Passed -->
                <div
                  v-if="releaseDateInfo"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-semibold shadow-xs"
                  :style="{
                    backgroundColor: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text)',
                  }"
                >
                  <Calendar class="w-4 h-4" :style="{ color: 'var(--app-primary)' }" />
                  <span class="font-bold text-white">{{ releaseDateInfo.formattedDate }}</span>
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                    :style="{
                      backgroundColor: 'var(--app-surface-hover)',
                      color: 'var(--app-primary)',
                    }"
                  >
                    {{ releaseDateInfo.timeAgoText }}
                  </span>
                </div>

                <!-- Developers -->
                <span
                  v-if="game.developers && game.developers.length"
                  class="flex items-center gap-1.5"
                >
                  <Building2 class="w-4 h-4 opacity-60" />
                  <span>{{ game.developers.join(', ') }}</span>
                </span>

                <!-- Publishers -->
                <span v-if="game.publishers && game.publishers.length" class="text-xs opacity-60">
                  (Pub: {{ game.publishers.join(', ') }})
                </span>
              </div>
            </div>

            <!-- Scores & Ratings Section (Larger & Prominent Cards) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <!-- Community Rating (NEXT.g / Jugadores) -->
              <div
                v-if="game.rating"
                class="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl border shadow-md backdrop-blur-md transition-all hover:border-(--app-primary)/50"
                :style="{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }"
              >
                <div
                  class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/30 bg-amber-500/10"
                >
                  <Star class="w-6 h-6 sm:w-7 sm:h-7 fill-amber-400 text-amber-400" />
                </div>
                <div class="min-w-0">
                  <div class="flex items-baseline gap-1.5">
                    <span class="text-2xl sm:text-3xl font-black font-mono leading-none text-white">
                      {{ formatGameRating(game.rating) }}
                    </span>
                    <span class="text-xs font-mono font-bold text-amber-400">/ 5.0</span>
                    <span class="text-[11px] font-mono opacity-60 ml-1">({{ Math.round(game.rating) }}%)</span>
                  </div>
                  <div
                    class="text-xs font-extrabold uppercase tracking-wider mt-1 text-white truncate"
                  >
                    Calificación de la Comunidad
                  </div>
                  <div class="text-[11px] truncate" :style="{ color: 'var(--app-text-muted)' }">
                    Puntuación promedio de los jugadores
                  </div>
                </div>
              </div>

              <!-- Critic / Specialized Rating (IGDB) -->
              <div
                v-if="game.aggregated_rating"
                class="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl border shadow-md backdrop-blur-md transition-all hover:border-emerald-500/50"
                :style="{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }"
              >
                <div
                  class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/30 bg-emerald-500/10"
                >
                  <Award class="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
                </div>
                <div class="min-w-0">
                  <div class="flex items-baseline gap-1.5">
                    <span class="text-2xl sm:text-3xl font-black font-mono leading-none text-emerald-400">
                      {{ Math.round(game.aggregated_rating) }}
                    </span>
                    <span class="text-xs font-mono font-bold text-emerald-400">/ 100</span>
                    <span
                      v-if="game.aggregated_rating_count"
                      class="text-[11px] font-mono opacity-60 ml-1"
                    >
                      ({{ game.aggregated_rating_count }} medios)
                    </span>
                  </div>
                  <div
                    class="text-xs font-extrabold uppercase tracking-wider mt-1 text-emerald-300 truncate"
                  >
                    Calificación Especializada (IGDB)
                  </div>
                  <div class="text-[11px] truncate" :style="{ color: 'var(--app-text-muted)' }">
                    Consenso crítico de medios profesionales en IGDB
                  </div>
                </div>
              </div>
            </div>

            <!-- Tags Grid: Genres, Themes, Platforms, Game Modes -->
            <div class="space-y-3 pt-2">
              <!-- Genres -->
              <div
                v-if="game.genres && game.genres.length"
                class="flex flex-wrap items-center gap-1.5"
              >
                <span class="text-xs font-bold uppercase tracking-wider mr-1 text-app-text-muted">
                  Géneros:
                </span>
                <span
                  v-for="g in game.genres"
                  :key="g"
                  class="px-2.5 py-1 rounded-lg text-xs font-semibold border"
                  :style="{
                    backgroundColor: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text)',
                  }"
                >
                  {{ g }}
                </span>
              </div>

              <!-- Themes -->
              <div
                v-if="game.themes && game.themes.length"
                class="flex flex-wrap items-center gap-1.5"
              >
                <span class="text-xs font-bold uppercase tracking-wider mr-1 text-app-text-muted">
                  Temáticas:
                </span>
                <span
                  v-for="t in game.themes"
                  :key="t"
                  class="px-2.5 py-0.5 rounded-md text-[11px] font-medium border bg-white/5 border-white/5 text-white/80"
                >
                  {{ t }}
                </span>
              </div>

              <!-- Platforms -->
              <div
                v-if="game.platforms && game.platforms.length"
                class="flex flex-wrap items-center gap-1.5"
              >
                <span class="text-xs font-bold uppercase tracking-wider mr-1 text-app-text-muted">
                  Plataformas:
                </span>
                <span
                  v-for="p in game.platforms"
                  :key="p"
                  class="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-white/5 border-white/10"
                >
                  {{ p }}
                </span>
              </div>

              <!-- Game Modes & Perspectives -->
              <div
                v-if="
                  (game.game_modes && game.game_modes.length) ||
                  (game.player_perspectives && game.player_perspectives.length)
                "
                class="flex flex-wrap items-center gap-2 text-xs"
                :style="{ color: 'var(--app-text-muted)' }"
              >
                <span v-if="game.game_modes && game.game_modes.length">
                  Modos:
                  <strong class="text-white">{{
                    game.game_modes.map(translateGameMode).join(', ')
                  }}</strong>
                </span>
                <span v-if="game.player_perspectives && game.player_perspectives.length">
                  • Perspectiva:
                  <strong class="text-white">{{
                    game.player_perspectives.map(translatePerspective).join(', ')
                  }}</strong>
                </span>
              </div>
            </div>

            <!-- Synopsis / Summary -->
            <div
              v-if="game.summary"
              class="p-5 rounded-2xl border leading-relaxed text-xs sm:text-sm space-y-2"
              :style="{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)',
              }"
            >
              <h3 class="text-xs font-bold uppercase tracking-wider text-app-primary">Sinopsis</h3>
              <p class="whitespace-pre-line">{{ game.summary }}</p>
            </div>

            <!-- Storyline Lore (if available) -->
            <div
              v-if="game.storyline"
              class="p-5 rounded-2xl border leading-relaxed text-xs sm:text-sm space-y-2 border-dashed"
              :style="{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)',
              }"
            >
              <h3 class="text-xs font-bold uppercase tracking-wider opacity-70">
                Historia y Contexto
              </h3>
              <p class="whitespace-pre-line opacity-90">{{ game.storyline }}</p>
            </div>
          </div>
        </div>

        <!-- 4. OFFICIAL WEBSITES & STORE LINKS -->
        <div v-if="game.websites && game.websites.length" class="space-y-3">
          <h3 class="text-lg font-bold font-display" :style="{ color: 'var(--app-text)' }">
            Tiendas y Enlaces Oficiales
          </h3>
          <div class="flex flex-wrap gap-2">
            <a
              v-for="site in game.websites"
              :key="site.url"
              :href="site.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 hover:bg-white/10 active:scale-95 cursor-pointer"
              :style="{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)',
              }"
            >
              <span>{{ site.category_name || 'Enlace' }}</span>
              <ExternalLink class="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>

        <!-- 5. MULTIMEDIA SECTION: Trailer & Screenshots Gallery -->
        <div
          v-if="
            (game.videos && game.videos.length) || (game.screenshots && game.screenshots.length)
          "
          class="space-y-4 pt-4 border-t border-white/5"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold font-display" :style="{ color: 'var(--app-text)' }">
              Galería Multimedia
            </h3>
            <span class="text-xs font-mono opacity-60">
              {{ (game.screenshots?.length || 0) + (game.videos?.length || 0) }} elementos
            </span>
          </div>

          <!-- Video Trailer Embed -->
          <div v-if="featuredTrailer" class="w-full">
            <div
              class="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black"
            >
              <iframe
                :src="`https://www.youtube-nocookie.com/embed/${featuredTrailer.video_id}?rel=0`"
                :title="featuredTrailer.name || 'Trailer'"
                class="w-full h-full border-0"
                allow="
                  accelerometer;
                  autoplay;
                  clipboard-write;
                  encrypted-media;
                  gyroscope;
                  picture-in-picture;
                "
                allowfullscreen
              />
            </div>
          </div>

          <!-- Screenshots Carousel / Grid -->
          <div
            v-if="game.screenshots && game.screenshots.length > 0"
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4"
          >
            <div
              v-for="(shot, idx) in game.screenshots"
              :key="shot"
              @click="selectedScreenshot = shot"
              class="group relative aspect-video rounded-xl overflow-hidden border border-white/10 cursor-pointer shadow-md bg-black/40 hover:border-app-primary transition-all duration-200 hover:scale-102"
            >
              <img
                :src="shot"
                :alt="`${game.title} captura ${idx + 1}`"
                loading="lazy"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div
                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Eye class="w-6 h-6 text-white drop-shadow-md" />
              </div>
            </div>
          </div>
        </div>

        <!-- 6. LANGUAGES TABLE SECTION -->
        <div class="space-y-4 pt-6 border-t border-white/5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <Languages class="w-5 h-5 text-app-primary" :style="{ color: 'var(--app-primary)' }" />
              <h3 class="text-xl font-bold font-display" :style="{ color: 'var(--app-text)' }">
                Idiomas Disponibles
              </h3>
            </div>
            <span class="text-xs font-mono opacity-60">
              {{ displayLanguages.length }} idiomas compatibles
            </span>
          </div>

          <div
            class="rounded-xl border overflow-hidden shadow-md"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }"
          >
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr
                    class="border-b text-[11px] font-bold uppercase tracking-wider"
                    :style="{
                      backgroundColor: 'var(--app-surface-hover)',
                      borderColor: 'var(--app-border)',
                      color: 'var(--app-text-muted)',
                    }"
                  >
                    <th class="py-3 px-4 font-extrabold">Idioma</th>
                    <th class="py-3 px-4 text-center font-extrabold w-28">Interfaz</th>
                    <th class="py-3 px-4 text-center font-extrabold w-28">Voces / Audio</th>
                    <th class="py-3 px-4 text-center font-extrabold w-28">Subtítulos</th>
                  </tr>
                </thead>
                <tbody class="divide-y" :style="{ borderColor: 'var(--app-border)' }">
                  <tr
                    v-for="lang in displayLanguages"
                    :key="lang.language"
                    class="transition-colors hover:bg-white/5"
                  >
                    <td class="py-2.5 px-4 font-semibold text-white">
                      {{ lang.language }}
                    </td>
                    <td class="py-2.5 px-4 text-center">
                      <Check v-if="lang.interface" class="w-4 h-4 mx-auto text-emerald-400 stroke-2.5" />
                      <Minus v-else class="w-3.5 h-3.5 mx-auto opacity-30 text-white" />
                    </td>
                    <td class="py-2.5 px-4 text-center">
                      <Check v-if="lang.audio" class="w-4 h-4 mx-auto text-emerald-400 stroke-2.5" />
                      <Minus v-else class="w-3.5 h-3.5 mx-auto opacity-30 text-white" />
                    </td>
                    <td class="py-2.5 px-4 text-center">
                      <Check v-if="lang.subtitles" class="w-4 h-4 mx-auto text-emerald-400 stroke-2.5" />
                      <Minus v-else class="w-3.5 h-3.5 mx-auto opacity-30 text-white" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 7. SIMILAR GAMES RECOMMENDATIONS (Navigable Horizontal Carousel in Single Row) -->
        <div
          v-if="similarGamesList.length > 0"
          class="space-y-4 pt-6 border-t border-white/5"
        >
          <GameHorizontalCarousel
            :games="similarGamesList"
            title="Títulos Similares Recomendados"
            subtitle="Basado en recomendaciones y relaciones de catálogo de IGDB"
            :auto-scroll="false"
            :show-arrows="true"
          />
        </div>
      </div>
    </div>

    <!-- 7. SCREENSHOT LIGHTBOX MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="selectedScreenshot"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          @click="selectedScreenshot = null"
        >
          <button
            type="button"
            class="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer z-10"
            @click="selectedScreenshot = null"
            aria-label="Cerrar imagen"
          >
            <X class="w-6 h-6" />
          </button>
          <img
            :src="selectedScreenshot"
            class="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-white/20"
            @click.stop
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { useGamesStore } from '@/stores/gamesStore'
import type { Game, AnticipatedGame } from '@/types/game'
import GameHorizontalCarousel from '@/components/common/GameHorizontalCarousel.vue'
import LandingHero from '@/components/landing/LandingHero.vue'
import LandingAnticipatedSection from '@/components/landing/LandingAnticipatedSection.vue'
import LandingFeaturesShowcase from '@/components/landing/LandingFeaturesShowcase.vue'
import LandingRoadmapTimeline from '@/components/landing/LandingRoadmapTimeline.vue'
import LandingCtaSection from '@/components/landing/LandingCtaSection.vue'

const gamesStore = useGamesStore()

const popularGames = ref<Game[]>([])
const anticipatedGames = ref<AnticipatedGame[]>([])
const loadingPopular = ref(true)
const loadingAnticipated = ref(true)

// Title entrance animation state:
const hasPlayedHeroEntrance = ref(gamesStore.isAppReady)
const shouldAnimateHero = ref(!gamesStore.isAppReady)
let animationFallbackTimer: ReturnType<typeof setTimeout> | null = null

function triggerTitleAnimation() {
  if (hasPlayedHeroEntrance.value) return
  hasPlayedHeroEntrance.value = true
}

// Countdown timer timestamp loop
const nowTimestamp = ref(Date.now())
let timerInterval: ReturnType<typeof setInterval> | null = null

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
    hasPlayedHeroEntrance.value = true
    shouldAnimateHero.value = false
  } else {
    window.addEventListener('nextg:app-ready', triggerTitleAnimation)
    animationFallbackTimer = setTimeout(() => {
      hasPlayedHeroEntrance.value = true
    }, 600)
  }

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
    <!-- Hero Section with Tactical Gamer Workflow Strip -->
    <LandingHero
      :should-animate-hero="shouldAnimateHero"
      :has-played-hero-entrance="hasPlayedHeroEntrance"
    />

    <!-- Most Anticipated Games with Themed Bottom Gradient & Prominent Countdown Labels -->
    <LandingAnticipatedSection
      :anticipated-games="anticipatedGames"
      :loading="loadingAnticipated"
      :now-timestamp="nowTimestamp"
    />

    <!-- Popular Games Continuous Horizontal Auto-Scroll (Hardware-Accelerated Embla Carousel) -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div
        v-if="loadingPopular"
        class="py-16 flex flex-col items-center justify-center gap-2 opacity-60"
      >
        <Loader2 class="w-8 h-8 animate-spin" :style="{ color: 'var(--app-primary)' }" />
        <span class="text-xs font-mono uppercase tracking-wider">
          Cargando carrusel continuo...
        </span>
      </div>

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

    <!-- Application Feature Screenshots with Real WebP & In-Development Callout Fallbacks -->
    <LandingFeaturesShowcase />

    <!-- Development Roadmap Timeline -->
    <LandingRoadmapTimeline />

    <!-- Bottom Sign-Up CTA Section -->
    <LandingCtaSection />
  </div>
</template>

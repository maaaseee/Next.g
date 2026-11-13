<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Gamepad2 } from 'lucide-vue-next'
import type { AnticipatedGame } from '@/types/game'
import rawBanners from '@/data/landingBanners.json'

const props = defineProps<{
  game: AnticipatedGame
  nowTimestamp: number
}>()

const router = useRouter()
const BANNER_FALLBACKS: Record<string, string> = rawBanners

const bannerUrl = computed(() => {
  if (props.game.slug && BANNER_FALLBACKS[props.game.slug]) {
    return BANNER_FALLBACKS[props.game.slug] as string
  }
  return props.game.banner_url || props.game.cover_url || ''
})

const paddedDigits = computed(() => {
  let target = props.game.target_timestamp
  if (!target && props.game.release_date) {
    target = new Date(props.game.release_date).getTime()
  }
  if (!target) {
    return {
      daysDigits: ['0', '0', '0'],
      hoursDigits: ['0', '0'],
      minutesDigits: ['0', '0'],
      isPast: true,
    }
  }

  const diff = target - props.nowTimestamp
  if (diff <= 0) {
    return {
      daysDigits: ['0', '0', '0'],
      hoursDigits: ['0', '0'],
      minutesDigits: ['0', '0'],
      isPast: true,
    }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return {
    daysDigits: String(Math.max(0, days)).padStart(3, '0').split(''),
    hoursDigits: String(Math.max(0, hours)).padStart(2, '0').split(''),
    minutesDigits: String(Math.max(0, minutes)).padStart(2, '0').split(''),
    isPast: false,
  }
})

function formatReleaseDate(releaseDateStr?: string | null, releaseYear?: number | null): string {
  if (releaseDateStr) {
    try {
      const parts = releaseDateStr.split('-')
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const year = parts[0]
        const monthNum = parseInt(parts[1], 10)
        const day = parseInt(parts[2], 10)
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

function navigateToGame() {
  router.push(`/game/${props.game.slug || props.game.id}`)
}
</script>

<template>
  <div
    @click="navigateToGame"
    class="group relative h-56 sm:h-64 md:h-70 rounded-[4px] overflow-hidden border border-white/10 cursor-pointer select-none transition-all duration-300 hover:border-(--app-primary) hover:ring-1 hover:ring-(--app-primary)/70 hover:shadow-2xl flex flex-col justify-between p-4 sm:p-5 md:p-6 bg-[#0c1017]"
  >
    <!-- Background Banner Artwork -->
    <img
      v-if="bannerUrl"
      :src="bannerUrl"
      :alt="game.title"
      loading="lazy"
      class="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
    />
    <div v-else class="absolute inset-0 flex items-center justify-center opacity-30">
      <Gamepad2 class="w-16 h-16" />
    </div>

    <!-- Base Dark Tint Overlay -->
    <div
      class="absolute inset-0 bg-linear-to-t from-black/85 via-black/45 to-black/35 group-hover:from-black/75 group-hover:via-black/40 group-hover:to-black/30 transition-colors pointer-events-none z-10"
    />

    <!-- Subtle Themed Bottom Gradient on the containing box (Driven by active theme's primary & accent) -->
    <div
      class="absolute inset-x-0 bottom-0 h-3/5 pointer-events-none z-15 transition-opacity duration-300 opacity-60 group-hover:opacity-85"
      :style="{
        background:
          'linear-gradient(to top, color-mix(in srgb, var(--app-primary) 35%, transparent) 0%, color-mix(in srgb, var(--app-accent) 20%, transparent) 45%, transparent 100%)',
      }"
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

    <!-- Lower/Center Content: Digits Countdown with Prominent Larger Unit Labels -->
    <div class="relative z-20 mt-auto pt-2 sm:pt-3 flex items-start">
      <!-- DAYS Block -->
      <div class="flex flex-col items-center">
        <div class="flex items-center gap-1 sm:gap-1.5">
          <div
            v-for="(d, dIdx) in paddedDigits.daysDigits"
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
        <!-- Noticeably larger, bold, readable unit label -->
        <span
          class="text-xs sm:text-sm md:text-base font-mono font-bold uppercase tracking-wider text-white/90 mt-1.5 sm:mt-2.5 drop-shadow-sm"
        >
          DÍAS
        </span>
      </div>

      <!-- Vertical Separator 1 -->
      <div class="flex items-center justify-center h-12 sm:h-16 md:h-20 px-2 sm:px-3 md:px-4">
        <div class="h-8 sm:h-10 md:h-12 w-[1.5px] bg-white/40" />
      </div>

      <!-- HOURS Block -->
      <div class="flex flex-col items-center">
        <div class="flex items-center gap-1 sm:gap-1.5">
          <div
            v-for="(h, hIdx) in paddedDigits.hoursDigits"
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
        <!-- Noticeably larger, bold, readable unit label -->
        <span
          class="text-xs sm:text-sm md:text-base font-mono font-bold uppercase tracking-wider text-white/90 mt-1.5 sm:mt-2.5 drop-shadow-sm"
        >
          HORAS
        </span>
      </div>

      <!-- Vertical Separator 2 -->
      <div class="flex items-center justify-center h-12 sm:h-16 md:h-20 px-2 sm:px-3 md:px-4">
        <div class="h-8 sm:h-10 md:h-12 w-[1.5px] bg-white/40" />
      </div>

      <!-- MINUTES Block -->
      <div class="flex flex-col items-center">
        <div class="flex items-center gap-1 sm:gap-1.5">
          <div
            v-for="(m, mIdx) in paddedDigits.minutesDigits"
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
        <!-- Noticeably larger, bold, readable unit label -->
        <span
          class="text-xs sm:text-sm md:text-base font-mono font-bold uppercase tracking-wider text-white/90 mt-1.5 sm:mt-2.5 drop-shadow-sm"
        >
          MINUTOS
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { CheckCircle2, ExternalLink, MonitorDot, Maximize2, X } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'
import rawFeatures from '@/data/landingFeatures.json'

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
  isSvgPlaceholder: boolean
}

const authStore = useAuthStore()

const APP_SCREENSHOT_FEATURES = computed<AppScreenshotFeature[]>(() => {
  return (rawFeatures as RawFeatureItem[]).map((feat) => {
    const isSvgPlaceholder = Boolean(
      feat.screenshotUrl && feat.screenshotUrl.toLowerCase().endsWith('.svg'),
    )

    return {
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
      isSvgPlaceholder,
    }
  })
})

// Fullscreen Lightbox Zoom Modal
const selectedZoomImage = ref<AppScreenshotFeature | null>(null)

function openZoom(feat: AppScreenshotFeature) {
  if (feat.isSvgPlaceholder) return
  selectedZoomImage.value = feat
}

function closeZoom() {
  selectedZoomImage.value = null
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeZoom()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <section class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Header Style: Heading + Accent Underline Bar (Tag removed per user request) -->
    <div class="mb-6 sm:mb-8">
      <h2
        class="text-base sm:text-lg lg:text-xl font-bold uppercase tracking-wider text-white font-sans"
      >
        VISTA PREVIA DE LA APP
      </h2>
      <div class="h-0.75 w-14 bg-cyan-400 mt-1.5" />
    </div>

    <!-- Compact Showcase Cards: Title, Text & Screenshot all visible in the same screen viewport -->
    <div class="space-y-10 sm:space-y-14">
      <div
        v-for="(feat, index) in APP_SCREENSHOT_FEATURES"
        :key="feat.id"
        class="rounded-[3px] border overflow-hidden shadow-xl transition-all duration-300"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }"
      >
        <!-- Top Compact Info Bar: Title, Concise Description, Highlights & CTA Button -->
        <div class="p-4 sm:p-5 border-b" :style="{ borderColor: 'var(--app-border)' }">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[11px] font-mono font-bold tracking-widest text-cyan-400">
                  // 0{{ index + 1 }}
                </span>
                <span
                  class="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                >
                  {{ feat.badge }}
                </span>
                <h3
                  class="text-base sm:text-lg font-bold font-display uppercase tracking-tight text-white ml-0.5"
                >
                  {{ feat.title }}
                </h3>
              </div>

              <p
                class="text-xs sm:text-[13px] font-sans"
                :style="{ color: 'var(--app-text-muted)' }"
              >
                {{ feat.description }}
              </p>
            </div>

            <!-- Quick Action CTA -->
            <div class="shrink-0 pt-1 sm:pt-0">
              <RouterLink
                :to="feat.actionLink"
                class="btn btn-primary btn-sm rounded-[2px] px-4 py-2 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 shadow-md hover:shadow-lg transition-transform active:scale-95"
              >
                <span>{{ feat.actionLabel }}</span>
                <ExternalLink class="w-3.5 h-3.5" />
              </RouterLink>
            </div>
          </div>

          <!-- Concise Key Highlights Chips -->
          <div
            class="mt-2.5 pt-2.5 border-t flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-mono"
            :style="{ borderColor: 'var(--app-border)' }"
          >
            <div
              v-for="(hi, hIdx) in feat.highlights"
              :key="hIdx"
              class="flex items-center gap-1.5 text-white/80"
            >
              <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{{ hi }}</span>
            </div>
          </div>
        </div>

        <!-- Screenshot Canvas (Header with 3 colored circles removed per user request) -->
        <div class="bg-black/90 p-2 sm:p-3 flex items-center justify-center">
          <!-- Cartel / Banner: Only shown if SVG placeholder -->
          <div
            v-if="feat.isSvgPlaceholder"
            class="w-full aspect-video max-h-115 rounded-[2px] border border-dashed border-white/20 bg-linear-to-b from-[#0e131d] to-[#07090e] p-6 flex flex-col items-center justify-center text-center shadow-xl"
          >
            <div
              class="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-amber-400 mb-2"
            >
              <MonitorDot class="w-3.5 h-3.5 animate-pulse" />
              <span>Feature en Desarrollo</span>
            </div>

            <h4
              class="text-base sm:text-lg font-bold font-display uppercase tracking-tight text-white mb-1"
            >
              Todavía no hay preview de esta feature
            </h4>

            <p class="text-xs max-w-md font-sans" :style="{ color: 'var(--app-text-muted)' }">
              Esta funcionalidad se encuentra en desarrollo activo. La captura visual estará
              disponible próximamente.
            </p>

            <RouterLink
              :to="feat.actionLink"
              class="mt-4 inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-(--app-primary) hover:underline decoration-1 underline-offset-4"
            >
              <span>Ver detalles del módulo</span>
              <ExternalLink class="w-3.5 h-3.5" />
            </RouterLink>
          </div>

          <!-- Real 1920x1080 Screenshot: Native 16:9, max-h-[460px] so entire card fits on screen -->
          <div
            v-else
            @click="openZoom(feat)"
            class="w-full aspect-video max-h-115 rounded-[2px] overflow-hidden border border-white/10 shadow-2xl bg-[#080b12] group relative cursor-zoom-in"
          >
            <img
              :src="feat.screenshotUrl"
              :alt="feat.title"
              class="w-full h-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.01]"
              loading="eager"
            />
            <div
              class="absolute inset-0 ring-1 ring-inset ring-white/10 pointer-events-none rounded-[2px]"
            />

            <!-- Zoom Hint Pill on Hover -->
            <div
              class="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-[2px] text-[10px] font-mono flex items-center gap-1.5 text-white shadow-xl pointer-events-none"
            >
              <Maximize2 class="w-3 h-3 text-cyan-400" />
              <span>Click para ampliar</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fullscreen Lightbox Modal -->
    <Teleport to="body">
      <div
        v-if="selectedZoomImage"
        @click="closeZoom"
        class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200"
      >
        <!-- Modal Top Toolbar -->
        <div
          class="w-full max-w-5xl flex items-center justify-between pb-3 text-white border-b border-white/10 mb-3"
          @click.stop
        >
          <div class="flex items-center gap-2 font-mono text-xs">
            <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
            <span class="font-bold text-sm">{{ selectedZoomImage.title }}</span>
          </div>

          <button
            @click="closeZoom"
            class="p-1.5 rounded-[2px] bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer"
          >
            <span>Cerrar</span>
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Fullscreen Image Box -->
        <div
          class="w-full max-w-5xl aspect-video max-h-[82vh] rounded-[2px] overflow-hidden border border-white/20 shadow-2xl bg-black flex items-center justify-center relative"
          @click.stop
        >
          <img
            :src="selectedZoomImage.screenshotUrl"
            :alt="selectedZoomImage.title"
            class="w-full h-full object-contain"
          />
        </div>

        <p class="text-[11px] font-mono text-white/50 mt-2">
          Presiona ESC o haz clic afuera para cerrar
        </p>
      </div>
    </Teleport>
  </section>
</template>

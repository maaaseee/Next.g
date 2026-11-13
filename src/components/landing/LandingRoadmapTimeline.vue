<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  BookOpen,
  ListOrdered,
  RefreshCw,
  BarChart3,
  Layers,
  Users,
} from 'lucide-vue-next'
import rawRoadmap from '@/data/landingRoadmap.json'

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
</script>

<template>
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
</template>

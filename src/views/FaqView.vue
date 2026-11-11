<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import {
  HelpCircle,
  ChevronDown,
  Gamepad2,
  Users,
  Search,
  Dices,
  Palette,
  Shield,
} from 'lucide-vue-next'
import rawFaq from '@/data/faq.json'

const openIndex = ref<number | null>(0)

function toggle(index: number) {
  openIndex.value = openIndex.value === index ? null : index
}

const FAQ_ICONS: Record<string, Component> = {
  Gamepad2,
  Users,
  Search,
  Dices,
  Palette,
  Shield,
}

interface RawFaqItem {
  iconName: string
  question: string
  answer: string
}

interface FaqItem {
  icon: Component
  question: string
  answer: string
}

const faqItems = computed<FaqItem[]>(() => {
  return (rawFaq as RawFaqItem[]).map((item) => ({
    icon: FAQ_ICONS[item.iconName] || HelpCircle,
    question: item.question,
    answer: item.answer,
  }))
})
</script>

<template>
  <div class="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 flex-1 flex flex-col w-full">
    <!-- Header -->
    <div class="text-center space-y-3">
      <div
        class="inline-flex items-center gap-2 px-3 py-1 rounded-[2px] text-xs font-semibold border"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-primary)',
        }"
      >
        <HelpCircle class="w-3.5 h-3.5" />
        <span>Centro de Ayuda</span>
      </div>
      <h1
        class="text-3xl sm:text-4xl font-display font-black tracking-tight"
        :style="{ color: 'var(--app-text)' }"
      >
        Preguntas Frecuentes
      </h1>
      <p class="text-xs sm:text-sm max-w-xl mx-auto" :style="{ color: 'var(--app-text-muted)' }">
        Todo lo que necesitas saber sobre el uso de tu backlog, la ruleta, la comunidad y la
        integración con IGDB.
      </p>
    </div>

    <!-- FAQ Accordion -->
    <div class="space-y-3">
      <div
        v-for="(item, index) in faqItems"
        :key="index"
        class="rounded-2xl border transition-colors overflow-hidden"
        :style="{
          backgroundColor: openIndex === index ? 'var(--app-surface-hover)' : 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }"
      >
        <!-- Accordion Header Button -->
        <button
          type="button"
          @click="toggle(index)"
          class="w-full flex items-center justify-between px-5 py-4 text-left text-sm sm:text-base font-bold transition-colors cursor-pointer gap-4"
          :style="{ color: 'var(--app-text)' }"
        >
          <div class="flex items-center gap-3.5 min-w-0">
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
              :style="{
                backgroundColor: 'var(--app-bg)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-primary)',
              }"
            >
              <component :is="item.icon" class="w-4 h-4" />
            </div>
            <span>{{ item.question }}</span>
          </div>

          <ChevronDown
            class="w-4 h-4 shrink-0 transition-transform duration-300 ease-in-out"
            :class="{ 'rotate-180': openIndex === index }"
            :style="{ color: 'var(--app-text-muted)' }"
          />
        </button>

        <!-- Accordion Body -->
        <div
          class="grid transition-all duration-300 ease-in-out"
          :class="openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
        >
          <div class="overflow-hidden">
            <div
              class="px-5 pb-5 pt-2 text-xs sm:text-sm leading-relaxed border-t"
              :style="{
                borderColor: 'var(--app-border)',
                color: 'var(--app-text-muted)',
              }"
            >
              {{ item.answer }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

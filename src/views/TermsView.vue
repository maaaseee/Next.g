<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-vue-next'
import termsData from '@/data/terms.json'
</script>

<template>
  <div class="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 w-full">
    <!-- Back Link -->
    <div>
      <RouterLink
        to="/"
        class="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)',
        }"
      >
        <ArrowLeft class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
        <span>Volver a NEXT.g</span>
      </RouterLink>
    </div>

    <!-- Header -->
    <div
      class="p-8 rounded-3xl border shadow-lg space-y-3"
      :style="{
        backgroundColor: 'var(--app-surface)',
        borderColor: 'var(--app-border)',
      }"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
          :style="{ backgroundColor: 'var(--app-primary)' }"
        >
          <FileText class="w-5 h-5" />
        </div>
        <div>
          <h1
            class="text-2xl sm:text-3xl font-display font-black tracking-tight"
            :style="{ color: 'var(--app-text)' }"
          >
            Términos y Condiciones de Servicio y Uso
          </h1>
          <p class="text-xs" :style="{ color: 'var(--app-text-muted)' }">
            Última actualización: {{ termsData.lastUpdated }} • Versión {{ termsData.version }}
          </p>
        </div>
      </div>
      <p class="text-sm leading-relaxed" :style="{ color: 'var(--app-text-muted)' }">
        {{ termsData.intro }}
      </p>
    </div>

    <!-- Content Sections -->
    <div
      class="p-8 rounded-3xl border shadow-lg space-y-8 text-sm leading-relaxed"
      :style="{
        backgroundColor: 'var(--app-surface)',
        borderColor: 'var(--app-border)',
        color: 'var(--app-text)',
      }"
    >
      <section
        v-for="section in termsData.sections"
        :key="section.id"
        class="space-y-2"
      >
        <h2
          class="text-lg font-bold flex items-center gap-2"
          :style="{ color: 'var(--app-primary)' }"
        >
          <CheckCircle2 class="w-4 h-4 shrink-0" />
          {{ section.number }}. {{ section.title }}
        </h2>

        <p
          v-for="(p, pIdx) in section.paragraphs"
          :key="pIdx"
          class="text-xs sm:text-sm"
          :style="{ color: 'var(--app-text-muted)' }"
        >
          {{ p }}
        </p>

        <ul
          v-if="section.list && section.list.length > 0"
          class="list-disc pl-6 space-y-1 text-xs sm:text-sm"
          :style="{ color: 'var(--app-text-muted)' }"
        >
          <li v-for="(item, idx) in section.list" :key="idx">
            {{ item }}
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

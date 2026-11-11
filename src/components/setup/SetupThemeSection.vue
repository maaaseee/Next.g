<script setup lang="ts">
import { Palette, Check } from 'lucide-vue-next'
import type { ThemeOption, ThemeId } from '@/types/theme'

interface Props {
  modelValue: ThemeId
  themes: ThemeOption[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ThemeId): void
  (e: 'select', value: ThemeId): void
}>()

function handleSelect(id: ThemeId) {
  emit('update:modelValue', id)
  emit('select', id)
}
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Palette class="w-4 h-4" :style="{ color: 'var(--app-primary)' }" />
        <h2 class="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
          01. Atmósfera Visual y Paleta de Color
        </h2>
      </div>
      <span class="text-[11px] font-mono opacity-60 hidden sm:inline">
        Vista previa instantánea al hacer clic
      </span>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <button
        v-for="t in themes"
        :key="t.id"
        type="button"
        @click="handleSelect(t.id)"
        class="group relative flex flex-col justify-between p-3.5 rounded-[4px] border text-left transition-all duration-200 cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 select-none"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: modelValue === t.id ? 'var(--app-primary)' : 'var(--app-border)',
          boxShadow: modelValue === t.id ? '0 0 20px var(--app-glow)' : 'none',
          '--tw-ring-color': 'var(--app-primary)',
        }"
      >
        <!-- Glowing corner marker on active -->
        <div
          v-if="modelValue === t.id"
          class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2"
          :style="{ borderColor: 'var(--app-primary)' }"
        />

        <div class="space-y-2">
          <!-- Color Triad Swatches -->
          <div class="flex items-center gap-1.5">
            <span
              class="w-5 h-5 rounded-[2px] border border-black/40 shadow-xs"
              :style="{ backgroundColor: t.primaryColor }"
              title="Color Primario"
            />
            <span
              class="w-5 h-5 rounded-[2px] border border-black/40 shadow-xs"
              :style="{ backgroundColor: t.accentColor }"
              title="Color Acento"
            />
            <span
              class="w-5 h-5 rounded-[2px] border border-black/40 shadow-xs"
              :style="{ backgroundColor: t.surfaceColor }"
              title="Fondo de Superficie"
            />
          </div>

          <div>
            <h3 class="text-xs font-bold leading-tight" :style="{ color: 'var(--app-text)' }">
              {{ t.name }}
            </h3>
            <span class="text-[10px] font-mono opacity-50 block mt-0.5">
              {{ t.id }}
            </span>
          </div>
        </div>

        <!-- Selection Radio Check -->
        <div
          class="mt-3 pt-2 border-t flex items-center justify-between"
          :style="{ borderColor: 'var(--app-border)' }"
        >
          <span
            class="text-[10px] font-mono uppercase tracking-wider"
            :style="{
              color: modelValue === t.id ? 'var(--app-primary)' : 'var(--app-text-muted)',
            }"
          >
            {{ modelValue === t.id ? 'Activo' : 'Elegir' }}
          </span>
          <span
            class="w-4 h-4 rounded-full flex items-center justify-center border transition-all"
            :style="{
              backgroundColor: modelValue === t.id ? 'var(--app-primary)' : 'transparent',
              borderColor: modelValue === t.id ? 'var(--app-primary)' : 'var(--app-border)',
              color: '#ffffff',
            }"
          >
            <Check v-if="modelValue === t.id" class="w-2.5 h-2.5 stroke-3" />
          </span>
        </div>
      </button>
    </div>
  </section>
</template>

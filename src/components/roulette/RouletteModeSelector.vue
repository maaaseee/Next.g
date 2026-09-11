<script setup lang="ts">
import type { RouletteMode } from '@/types/theme';
import { Compass, SlidersVertical, Zap } from 'lucide-vue-next';

defineProps<{
  modelValue: RouletteMode;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', mode: RouletteMode): void;
}>();

const MODES: { id: RouletteMode; label: string; icon: any; desc: string }[] = [
  {
    id: 'classic',
    label: 'Dial Circular',
    icon: Compass,
    desc: 'Dial de precisión con desaceleración angular',
  },
  {
    id: 'slot',
    label: 'Escáner Vertical',
    icon: SlidersVertical,
    desc: 'Secuencia lineal de títulos en visor HUD',
  },
  {
    id: 'instant',
    label: 'Selección Directa',
    icon: Zap,
    desc: 'Fijación de objetivo inmediata en < 1s',
  },
];
</script>

<template>
  <div
    class="flex items-center gap-1 p-1 rounded-lg border max-w-xl mx-auto"
    :style="{
      backgroundColor: 'var(--app-surface)',
      borderColor: 'var(--app-border)',
    }"
  >
    <button
      v-for="mode in MODES"
      :key="mode.id"
      type="button"
      @click="emit('update:modelValue', mode.id)"
      class="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all duration-150 cursor-pointer select-none"
      :class="modelValue === mode.id ? 'text-white' : 'text-app-text-muted hover:text-app-text'"
      :style="{
        backgroundColor: modelValue === mode.id ? 'var(--app-primary)' : 'transparent',
      }"
    >
      <component :is="mode.icon" class="w-3.5 h-3.5 shrink-0" />
      <span class="hidden sm:inline">{{ mode.label }}</span>
    </button>
  </div>
</template>

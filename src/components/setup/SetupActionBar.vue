<script setup lang="ts">
import { Check, Loader2 } from 'lucide-vue-next'

interface Props {
  saving?: boolean
}

withDefaults(defineProps<Props>(), {
  saving: false,
})

const emit = defineEmits<{
  (e: 'skip'): void
  (e: 'save'): void
}>()
</script>

<template>
  <div
    class="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
    :style="{ borderColor: 'var(--app-border)' }"
  >
    <!-- Skip button -->
    <button
      type="button"
      @click="emit('skip')"
      :disabled="saving"
      class="w-full sm:w-auto px-5 py-2.5 rounded-[4px] border text-xs sm:text-sm font-mono font-bold uppercase tracking-wider transition-all duration-150 hover:bg-white/5 active:scale-98 cursor-pointer disabled:opacity-50 text-center focus-visible:outline-none focus-visible:ring-2 select-none"
      :style="{
        backgroundColor: 'transparent',
        borderColor: 'var(--app-border)',
        color: 'var(--app-text-muted)',
        '--tw-ring-color': 'var(--app-primary)',
      }"
    >
      Omitir por ahora (Valores por defecto)
    </button>

    <!-- Save button -->
    <button
      type="button"
      @click="emit('save')"
      :disabled="saving"
      class="w-full sm:w-auto px-8 py-3 rounded-[4px] text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-xl transition-all duration-150 hover:opacity-95 active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 select-none"
      :style="{
        backgroundColor: 'var(--app-primary)',
        boxShadow: '0 0 24px var(--app-glow)',
        '--tw-ring-color': 'var(--app-primary)',
      }"
    >
      <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
      <Check v-else class="w-4 h-4" />
      <span>Confirmar y Entrar a la Biblioteca</span>
    </button>
  </div>
</template>

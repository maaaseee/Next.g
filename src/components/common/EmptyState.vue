<script setup lang="ts">
import { Gamepad2 } from 'lucide-vue-next'

interface Props {
  icon?: any
  title: string
  description?: string
  actionLabel?: string
}

withDefaults(defineProps<Props>(), {
  icon: undefined,
  description: '',
  actionLabel: '',
})

const emit = defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <div
    class="py-20 sm:py-24 flex flex-col items-center justify-center text-center opacity-70 space-y-3 w-full max-w-md mx-auto select-none"
  >
    <!-- Icon Container -->
    <div
      class="w-14 h-14 rounded-[4px] border flex items-center justify-center mb-1"
      :style="{
        backgroundColor: 'var(--app-surface)',
        borderColor: 'var(--app-border)',
        color: 'var(--app-primary)',
      }"
    >
      <slot name="icon">
        <component :is="icon || Gamepad2" class="w-7 h-7" />
      </slot>
    </div>

    <!-- Title & Description -->
    <div class="space-y-1">
      <h3 class="text-base sm:text-lg font-bold" :style="{ color: 'var(--app-text)' }">
        {{ title }}
      </h3>
      <p
        v-if="description"
        class="text-xs sm:text-sm leading-relaxed max-w-sm"
        :style="{ color: 'var(--app-text-muted)' }"
      >
        {{ description }}
      </p>
    </div>

    <!-- Action Slot or Default Action Button -->
    <div v-if="$slots.action || actionLabel" class="pt-2">
      <slot name="action">
        <button
          v-if="actionLabel"
          type="button"
          @click="emit('action')"
          class="px-4 py-2 rounded-[4px] text-xs font-mono font-bold uppercase tracking-wider text-white border transition-all duration-150 cursor-pointer hover:opacity-90 active:scale-98"
          :style="{
            backgroundColor: 'var(--app-primary)',
            borderColor: 'var(--app-primary)',
            boxShadow: '0 0 16px var(--app-glow)',
          }"
        >
          {{ actionLabel }}
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    title: string
    subtitle: string
    errorMessage?: string
    maxWidthClass?: string
    boxed?: boolean
  }>(),
  {
    errorMessage: '',
    maxWidthClass: 'max-w-xl sm:max-w-2xl',
    boxed: false,
  }
)
</script>

<template>
  <div
    class="min-h-[calc(100vh-8rem)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto"
  >
    <div :class="['w-full space-y-6', maxWidthClass]">
      <!-- Header -->
      <div class="text-center space-y-2">
        <slot name="badge" />
        <h1
          class="text-2xl sm:text-3xl font-display font-black tracking-tight"
          :style="{ color: 'var(--app-text)' }"
        >
          {{ title }}
        </h1>
        <p
          class="text-xs sm:text-sm max-w-md mx-auto"
          :style="{ color: 'var(--app-text-muted)' }"
        >
          {{ subtitle }}
        </p>
      </div>

      <!-- Main Container (either boxed card or flat) -->
      <div
        :class="[
          'space-y-6',
          boxed ? 'p-6 sm:p-8 rounded-3xl border shadow-xl' : ''
        ]"
        :style="boxed ? { backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' } : {}"
      >
        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="p-3.5 rounded-[4px] text-xs font-medium flex items-center gap-2 border bg-rose-500/10 border-rose-500/20 text-rose-400"
        >
          <X class="w-4 h-4 shrink-0 text-rose-400" />
          <span>{{ errorMessage }}</span>
        </div>

        <slot />
      </div>

      <!-- Optional Footer Link -->
      <slot name="footer" />
    </div>
  </div>
</template>

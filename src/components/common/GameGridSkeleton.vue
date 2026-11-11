<script setup lang="ts">
interface Props {
  count?: number
  gridClass?: string
}

withDefaults(defineProps<Props>(), {
  count: 18,
  gridClass:
    'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 w-full',
})
</script>

<template>
  <div :class="gridClass">
    <div
      v-for="i in count"
      :key="`game-skel-${i}`"
      class="rounded-[4px] border border-white/5 bg-white/5 overflow-hidden animate-pulse flex flex-col justify-between"
      :style="{ backgroundColor: 'var(--app-surface)' }"
    >
      <div class="aspect-3/4 bg-white/5 w-full" />
      <div class="p-2.5 space-y-2">
        <div class="h-3.5 bg-white/10 rounded-[2px] w-3/4" />
        <div class="h-2.5 bg-white/5 rounded-[2px] w-1/2" />
      </div>
    </div>
  </div>
</template>

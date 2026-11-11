<script setup lang="ts">
import { Search, Loader2, X } from 'lucide-vue-next'

interface Props {
  modelValue: string
  placeholder?: string
  loading?: boolean
  autofocus?: boolean
  size?: 'default' | 'lg'
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Buscar...',
  loading: false,
  autofocus: false,
  size: 'default',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'clear'): void
  (e: 'enter'): void
}>()

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function handleClear() {
  emit('update:modelValue', '')
  emit('clear')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    emit('enter')
  }
}
</script>

<template>
  <div
    class="relative flex items-center rounded-[4px] border transition-all duration-200 focus-within:ring-2 focus-within:ring-(--app-primary) select-none"
    :class="[
      size === 'lg' ? 'py-1 px-1 shadow-lg' : 'py-0.5',
    ]"
    :style="{
      backgroundColor: 'var(--app-surface)',
      borderColor: 'var(--app-border)',
      '--tw-ring-color': 'var(--app-primary)',
    }"
  >
    <!-- Left Search Icon -->
    <div class="pl-3.5 pr-2 flex items-center pointer-events-none opacity-50 shrink-0">
      <Search
        :class="size === 'lg' ? 'w-4.5 h-4.5' : 'w-4 h-4'"
        :style="{ color: 'var(--app-primary)' }"
      />
    </div>

    <!-- Native Input Field -->
    <input
      :value="modelValue"
      @input="handleInput"
      @keydown="handleKeydown"
      :placeholder="placeholder"
      :autofocus="autofocus"
      type="text"
      class="w-full py-2 pr-10 text-xs sm:text-sm bg-transparent border-none focus:outline-none placeholder:text-[var(--app-text-muted)] placeholder:opacity-50"
      :style="{ color: 'var(--app-text)' }"
    />

    <!-- Right Controls: Spinner / Clear Button -->
    <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
      <Loader2
        v-if="loading"
        class="w-4 h-4 animate-spin"
        :style="{ color: 'var(--app-primary)' }"
      />
      <button
        v-else-if="modelValue && modelValue.trim().length > 0"
        type="button"
        @click="handleClear"
        class="p-1 rounded-[2px] hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        title="Borrar búsqueda"
        aria-label="Borrar búsqueda"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

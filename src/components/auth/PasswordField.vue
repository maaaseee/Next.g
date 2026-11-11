<script setup lang="ts">
import { ref } from 'vue'
import { Lock, Eye, EyeOff, Check, X } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    placeholder?: string
    autocomplete?: string
    required?: boolean
    matchStatus?: 'idle' | 'match' | 'mismatch'
    matchMessage?: string
  }>(),
  {
    label: 'Contraseña',
    placeholder: '••••••••',
    autocomplete: 'current-password',
    required: true,
    matchStatus: 'idle',
    matchMessage: '',
  }
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const showPassword = ref(false)
</script>

<template>
  <div class="space-y-1.5">
    <label class="block text-xs font-semibold" :style="{ color: 'var(--app-text)' }">
      {{ label }}
    </label>
    <div class="relative flex items-center">
      <Lock class="absolute left-3 w-4 h-4 opacity-40 pointer-events-none" />
      <input
        :value="modelValue"
        :type="showPassword ? 'text' : 'password'"
        :required="required"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        class="w-full pl-9 pr-16 py-2 h-10 rounded-[4px] border text-xs sm:text-sm transition-all focus:outline-hidden focus:ring-1 focus:ring-(--app-primary)"
        :class="{
          'border-emerald-500/60 focus:ring-emerald-500': matchStatus === 'match',
          'border-rose-500/60 focus:ring-rose-500': matchStatus === 'mismatch',
        }"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor:
            matchStatus === 'match'
              ? '#10b981'
              : matchStatus === 'mismatch'
                ? '#f43f5e'
                : 'var(--app-border)',
          color: 'var(--app-text)',
        }"
      />

      <div class="absolute right-3 flex items-center gap-1.5">
        <!-- Match Feedback Icon -->
        <Check v-if="matchStatus === 'match'" class="w-4 h-4 text-emerald-400 shrink-0 pointer-events-none" />
        <X v-else-if="matchStatus === 'mismatch'" class="w-4 h-4 text-rose-500 shrink-0 pointer-events-none" />

        <!-- Toggle Visibility Button -->
        <button
          type="button"
          tabindex="-1"
          @click="showPassword = !showPassword"
          class="opacity-40 hover:opacity-100 transition-opacity cursor-pointer p-0.5"
        >
          <EyeOff v-if="showPassword" class="w-4 h-4" />
          <Eye v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Match Message Text -->
    <p
      v-if="matchMessage"
      class="text-[11px] font-medium transition-colors"
      :class="matchStatus === 'match' ? 'text-emerald-400' : 'text-rose-400'"
    >
      {{ matchMessage }}
    </p>
  </div>
</template>

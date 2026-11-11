<script setup lang="ts">
import { Mail, Loader2, Check, X } from 'lucide-vue-next'
import type { EmailStatus } from '@/composables/useEmailValidation'

withDefaults(
  defineProps<{
    modelValue: string
    status?: EmailStatus
    message?: string
    label?: string
    placeholder?: string
    required?: boolean
    autocomplete?: string
  }>(),
  {
    status: 'idle',
    message: '',
    label: 'Correo Electrónico',
    placeholder: 'tu@email.com',
    required: true,
    autocomplete: 'email',
  }
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="space-y-1">
    <label class="block text-xs font-semibold" :style="{ color: 'var(--app-text)' }">
      {{ label }}
    </label>
    <div class="relative flex items-center">
      <Mail class="absolute left-3 w-4 h-4 opacity-40 pointer-events-none" />
      <input
        :value="modelValue"
        type="email"
        :required="required"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        class="w-full pl-9 pr-10 py-2 h-10 rounded-[4px] border text-xs sm:text-sm transition-all focus:outline-hidden focus:ring-1 focus:ring-(--app-primary)"
        :class="{
          'border-emerald-500/60 focus:ring-emerald-500': status === 'available',
          'border-rose-500/60 focus:ring-rose-500': status === 'taken',
        }"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor:
            status === 'available'
              ? '#10b981'
              : status === 'taken'
                ? '#f43f5e'
                : 'var(--app-border)',
          color: 'var(--app-text)',
        }"
      />

      <!-- Status Indicator Icon -->
      <div v-if="status !== 'idle'" class="absolute right-3 flex items-center pointer-events-none">
        <Loader2
          v-if="status === 'checking'"
          class="w-4 h-4 animate-spin"
          :style="{ color: 'var(--app-primary)' }"
        />
        <Check v-else-if="status === 'available'" class="w-4 h-4 text-emerald-400 stroke-2.5" />
        <X v-else-if="status === 'taken'" class="w-4 h-4 text-rose-500 stroke-2.5" />
      </div>
    </div>

    <!-- Status Helper Text -->
    <p
      v-if="message"
      class="text-[11px] font-medium transition-colors"
      :class="{
        'text-emerald-400': status === 'available',
        'text-rose-400': status === 'taken',
        'text-amber-400': status === 'invalid',
        'opacity-60': status === 'checking',
      }"
    >
      {{ message }}
    </p>
  </div>
</template>

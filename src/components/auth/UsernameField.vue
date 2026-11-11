<script setup lang="ts">
import { User, Loader2, Check, X } from 'lucide-vue-next'
import type { UsernameStatus } from '@/composables/useUsernameValidation'

withDefaults(
  defineProps<{
    modelValue: string
    status?: UsernameStatus
    message?: string
    label?: string
    placeholder?: string
    maxlength?: number
    required?: boolean
    showUrlPreview?: boolean
  }>(),
  {
    status: 'idle',
    message: '',
    label: 'Nombre de Usuario o GamerTag',
    placeholder: 'Ej. CloudStrife',
    maxlength: 50,
    required: true,
    showUrlPreview: false,
  }
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="space-y-1.5">
    <label class="block text-xs font-semibold" :style="{ color: 'var(--app-text)' }">
      {{ label }}
    </label>
    <div class="relative flex items-center">
      <User class="absolute left-3 w-4 h-4 opacity-40 pointer-events-none" />
      <input
        :value="modelValue"
        type="text"
        :required="required"
        :maxlength="maxlength"
        autocomplete="username"
        :placeholder="placeholder"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        class="w-full pl-9 pr-10 py-2 h-10 rounded-[4px] border text-xs sm:text-sm transition-all focus:outline-hidden focus:ring-1 focus:ring-(--app-primary)"
        :class="{
          'border-emerald-500/60 focus:ring-emerald-500': status === 'available',
          'border-rose-500/60 focus:ring-rose-500': status === 'taken' || status === 'invalid',
        }"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor:
            status === 'available'
              ? '#10b981'
              : status === 'taken' || status === 'invalid'
                ? '#f43f5e'
                : 'var(--app-border)',
          color: 'var(--app-text)',
        }"
      />
      <!-- Verification Indicator Icon -->
      <div class="absolute right-3 flex items-center pointer-events-none">
        <Loader2
          v-if="status === 'checking'"
          class="w-4 h-4 animate-spin"
          :style="{ color: 'var(--app-primary)' }"
        />
        <Check v-else-if="status === 'available'" class="w-4 h-4 text-emerald-400 stroke-2.5" />
        <X v-else-if="status === 'taken' || status === 'invalid'" class="w-4 h-4 text-rose-500 stroke-2.5" />
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

    <!-- Optional URL Preview -->
    <div
      v-if="showUrlPreview"
      class="p-2.5 rounded-[4px] border text-xs flex items-center gap-2 font-mono mt-1"
      :style="{
        backgroundColor: 'var(--app-bg)',
        borderColor: 'var(--app-border)',
        color: 'var(--app-text-muted)',
      }"
    >
      <span class="opacity-60 text-[11px]">Enlace de tu perfil:</span>
      <span class="text-white font-bold truncate">
        /user/{{ modelValue.trim() || 'tu-nickname' }}
      </span>
    </div>
  </div>
</template>

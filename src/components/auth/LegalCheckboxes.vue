<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'

defineProps<{
  terms: boolean
  privacy: boolean
  required?: boolean
}>()

defineEmits<{
  (e: 'update:terms', value: boolean): void
  (e: 'update:privacy', value: boolean): void
}>()
</script>

<template>
  <div class="space-y-2 pt-1">
    <!-- Terms Checkbox -->
    <label class="flex items-start gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        :checked="terms"
        :required="required"
        @change="$emit('update:terms', ($event.target as HTMLInputElement).checked)"
        class="mt-0.5 w-3.5 h-3.5 rounded-[2px] border-gray-600 text-(--app-primary) focus:ring-(--app-primary) focus:ring-offset-0 transition-colors cursor-pointer"
        :style="{ accentColor: 'var(--app-primary)' }"
      />
      <span class="text-xs leading-tight" :style="{ color: 'var(--app-text)' }">
        Acepto los
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          class="font-bold underline hover:opacity-80 inline-flex items-center gap-0.5"
          :style="{ color: 'var(--app-primary)' }"
        >
          <span>Términos y Condiciones de Servicio</span>
          <ExternalLink class="w-2.5 h-2.5" />
        </a>
      </span>
    </label>

    <!-- Privacy Checkbox -->
    <label class="flex items-start gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        :checked="privacy"
        :required="required"
        @change="$emit('update:privacy', ($event.target as HTMLInputElement).checked)"
        class="mt-0.5 w-3.5 h-3.5 rounded-[2px] border-gray-600 text-(--app-primary) focus:ring-(--app-primary) focus:ring-offset-0 transition-colors cursor-pointer"
        :style="{ accentColor: 'var(--app-primary)' }"
      />
      <span class="text-xs leading-tight" :style="{ color: 'var(--app-text)' }">
        Acepto la
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          class="font-bold underline hover:opacity-80 inline-flex items-center gap-0.5"
          :style="{ color: 'var(--app-primary)' }"
        >
          <span>Política de Privacidad</span>
          <ExternalLink class="w-2.5 h-2.5" />
        </a>
      </span>
    </label>
  </div>
</template>

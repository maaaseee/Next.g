<script setup lang="ts">
import { computed } from 'vue'
import { Check, Circle } from 'lucide-vue-next'

const props = defineProps<{
  password: string
}>()

const hasMinLength = computed(() => props.password.length >= 8)
const hasLetter = computed(() => /[\p{L}]/u.test(props.password))
const hasUppercase = computed(() => /[\p{Lu}]/u.test(props.password))
const hasNumber = computed(() => /\d/.test(props.password))
</script>

<template>
  <div
    class="p-2.5 rounded-[4px] border space-y-1.5 mt-1"
    :style="{
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderColor: 'var(--app-border)',
    }"
  >
    <p class="text-[11px] font-semibold uppercase tracking-wider opacity-60">
      Requisitos de la contraseña:
    </p>
    <ul class="space-y-1 text-xs">
      <li
        class="flex items-center gap-2 transition-colors text-[11px]"
        :class="hasMinLength ? 'text-emerald-400 font-medium' : 'opacity-50'"
      >
        <Check v-if="hasMinLength" class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <Circle v-else class="w-3 h-3 opacity-40 shrink-0" />
        <span>Mínimo 8 caracteres</span>
      </li>

      <li
        class="flex items-center gap-2 transition-colors text-[11px]"
        :class="hasLetter ? 'text-emerald-400 font-medium' : 'opacity-50'"
      >
        <Check v-if="hasLetter" class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <Circle v-else class="w-3 h-3 opacity-40 shrink-0" />
        <span>Al menos una letra (incluye ñ, acentos)</span>
      </li>

      <li
        class="flex items-center gap-2 transition-colors text-[11px]"
        :class="hasUppercase ? 'text-emerald-400 font-medium' : 'opacity-50'"
      >
        <Check v-if="hasUppercase" class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <Circle v-else class="w-3 h-3 opacity-40 shrink-0" />
        <span>Al menos una letra mayúscula (A-Z, Ñ)</span>
      </li>

      <li
        class="flex items-center gap-2 transition-colors text-[11px]"
        :class="hasNumber ? 'text-emerald-400 font-medium' : 'opacity-50'"
      >
        <Check v-if="hasNumber" class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <Circle v-else class="w-3 h-3 opacity-40 shrink-0" />
        <span>Al menos un número (0-9)</span>
      </li>
    </ul>
  </div>
</template>

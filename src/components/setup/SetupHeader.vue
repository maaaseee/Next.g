<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
</script>

<template>
  <div class="border-b pb-6 space-y-3" :style="{ borderColor: 'var(--app-border)' }">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span
          class="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold tracking-wider uppercase border"
          :style="{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-primary)',
          }"
        >
          SYS.CFG
        </span>
        <span class="text-xs font-mono font-bold tracking-wider opacity-60 uppercase">
          Calibración de Experiencia
        </span>
      </div>

      <div
        v-if="authStore.user"
        class="flex items-center gap-2 text-xs font-mono"
        :style="{ color: 'var(--app-text-muted)' }"
      >
        <ShieldCheck class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
        <span>Usuario: <strong class="text-white">{{ authStore.user.name }}</strong></span>
      </div>
    </div>

    <div>
      <h1
        class="text-2xl sm:text-3xl font-display font-black tracking-tight"
        :style="{ color: 'var(--app-text)' }"
      >
        Configuración de Experiencia
      </h1>
      <p
        class="text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed"
        :style="{ color: 'var(--app-text-muted)' }"
      >
        Personaliza los aspectos visuales y el comportamiento interactivo de tu biblioteca.
        Podrás cambiar estas preferencias en cualquier momento.
      </p>
    </div>
  </div>
</template>

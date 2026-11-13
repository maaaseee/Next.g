<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Gamepad2, Sparkles, LogIn } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
</script>

<template>
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div
      class="relative rounded-[3px] p-8 sm:p-12 border overflow-hidden text-center flex flex-col items-center justify-center gap-6 shadow-2xl"
      :style="{
        backgroundColor: 'var(--app-surface)',
        borderColor: 'var(--app-border)',
      }"
    >
      <!-- Decorative ambient glow -->
      <div
        class="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-(--app-primary)/10 blur-3xl pointer-events-none"
      />
      <div
        class="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-(--app-accent)/10 blur-3xl pointer-events-none"
      />

      <div class="relative z-10 space-y-2 max-w-xl">
        <span class="text-xs font-mono font-bold uppercase tracking-widest text-(--app-primary)">
          Empezá a organizar hoy
        </span>
        <h3
          class="text-2xl sm:text-3xl md:text-4xl font-display font-black tracking-tight uppercase"
          :style="{ color: 'var(--app-text)' }"
        >
          Tu colección de videojuegos merece un lugar propio
        </h3>
        <p class="text-xs sm:text-sm font-sans" :style="{ color: 'var(--app-text-muted)' }">
          Creá tu cuenta en menos de un minuto. Administrá tu biblioteca, descubrí títulos en
          cuenta regresiva y resolvé qué jugar sin costo.
        </p>
      </div>

      <div class="relative z-10 flex flex-wrap items-center justify-center gap-3">
        <RouterLink
          v-if="!authStore.isAuthenticated"
          to="/register"
          class="btn btn-primary btn-lg rounded-[2px] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl hover:shadow-2xl transition-transform active:scale-95"
        >
          <Sparkles class="w-4 h-4" />
          <span>Crear Cuenta Gratis</span>
        </RouterLink>

        <RouterLink
          v-if="!authStore.isAuthenticated"
          to="/login"
          class="btn btn-secondary btn-lg rounded-[2px] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 border transition-all hover:bg-white/5 active:scale-95"
        >
          <LogIn class="w-4 h-4 opacity-70" />
          <span>Iniciar Sesión</span>
        </RouterLink>

        <RouterLink
          v-else
          to="/"
          class="btn btn-primary btn-lg rounded-[2px] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl hover:shadow-2xl transition-transform active:scale-95"
        >
          <Gamepad2 class="w-4 h-4" />
          <span>Abrir Mi Biblioteca</span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

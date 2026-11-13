<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Gamepad2, Dices, LogIn, Search } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'

defineProps<{
  shouldAnimateHero: boolean
  hasPlayedHeroEntrance: boolean
}>()

const authStore = useAuthStore()
</script>

<template>
  <section
    class="relative overflow-hidden border-b pb-12 sm:pb-20"
    :style="{ borderColor: 'var(--app-border)' }"
  >
    <!-- Single High-Performance Internet Wallpaper Background -->
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      <img
        src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=2000&q=80"
        alt="Gaming Setup Wallpaper"
        class="w-full h-full object-cover object-center opacity-15 grayscale brightness-75"
        loading="eager"
      />
      <div
        class="absolute inset-0 bg-linear-to-b from-(--app-bg)/60 via-(--app-bg)/85 to-(--app-bg)"
      />
    </div>

    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-6 sm:pt-12">
      <!-- Main Headline: Plays entrance animation ONCE during initial app boot; static when returning -->
      <h1
        class="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tight max-w-5xl mx-auto uppercase leading-tight select-none transition-none"
        :class="{
          'animate-hero-entrance': shouldAnimateHero && hasPlayedHeroEntrance,
          'opacity-0 translate-y-6': shouldAnimateHero && !hasPlayedHeroEntrance,
          'opacity-100 translate-y-0': !shouldAnimateHero,
        }"
        :style="{ color: 'var(--app-text)' }"
      >
        Lleva el registro de cada <br class="hidden sm:inline" />
        <span class="animate-flowing-title"> videojuego que juegas. </span>
      </h1>

      <!-- Subtitle -->
      <p
        class="text-sm sm:text-base md:text-lg max-w-3xl mx-auto mt-6 sm:mt-7 leading-relaxed font-sans"
        :style="{ color: 'var(--app-text-muted)' }"
      >
        Organizá tu biblioteca sin planillas rotas de Excel. Clasificá tus partidas en
        <span class="text-emerald-400 font-bold">Jugando</span>,
        <span class="text-sky-400 font-bold">Completados</span>,
        <span class="text-amber-400 font-bold">Backlog</span> y
        <span class="text-purple-400 font-bold">Deseados</span>. Calificá con estrellas y dejá que
        la ruleta resuelva qué jugar este fin de semana.
      </p>

      <!-- Action Buttons (Squared Backloggd style) -->
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <RouterLink
          v-if="!authStore.isAuthenticated"
          to="/register"
          class="btn btn-primary btn-lg rounded-[2px] px-8 py-3.5 font-bold tracking-wider text-xs sm:text-sm uppercase flex items-center gap-2 shadow-lg hover:shadow-xl transition-transform active:scale-95"
        >
          <LogIn class="w-4 h-4" />
          <span>Comenzar Ahora — Es Gratis</span>
        </RouterLink>

        <RouterLink
          v-else
          to="/"
          class="btn btn-primary btn-lg rounded-[2px] px-8 py-3.5 font-bold tracking-wider text-xs sm:text-sm uppercase flex items-center gap-2 shadow-lg hover:shadow-xl transition-transform active:scale-95"
        >
          <Gamepad2 class="w-4 h-4" />
          <span>Ir a Mi Biblioteca</span>
        </RouterLink>

        <RouterLink
          to="/explore"
          class="btn btn-secondary btn-lg rounded-[2px] px-6 py-3.5 font-bold tracking-wider text-xs sm:text-sm uppercase flex items-center gap-2 border transition-all hover:bg-white/5 active:scale-95"
        >
          <Search class="w-4 h-4 opacity-75" />
          <span>Explorar Catálogo</span>
        </RouterLink>

        <RouterLink
          v-if="authStore.isAuthenticated"
          to="/roulette"
          class="btn btn-outline btn-lg rounded-[2px] px-6 py-3.5 font-bold tracking-wider text-xs sm:text-sm uppercase flex items-center gap-2 border transition-all hover:bg-white/5 active:scale-95"
        >
          <Dices class="w-4 h-4 text-amber-400" />
          <span>Girar Ruleta</span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

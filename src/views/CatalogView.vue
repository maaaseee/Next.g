<script setup lang="ts">
import { onMounted } from 'vue'
import { useGamesStore } from '@/stores/gamesStore'
import { useAuthStore } from '@/stores/authStore'
import StatusTabs from '@/components/catalog/StatusTabs.vue'
import SlidingContainer from '@/components/catalog/SlidingContainer.vue'
import type { UserGame } from '@/types/game'
import { RefreshCw, Lock, LogIn, Compass, Users } from 'lucide-vue-next'
import { RouterLink, useRouter } from 'vue-router'

const gamesStore = useGamesStore()
const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (authStore.isAuthenticated && gamesStore.games.length === 0 && !gamesStore.loading) {
    gamesStore.fetchGames()
  }
})

function handleSelectGame(game: UserGame) {
  router.push(`/game/${game.slug || game.id}`)
}
</script>

<template>
  <!-- Unauthenticated Gate State -->
  <div
    v-if="!authStore.isAuthenticated"
    class="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 flex-1 flex flex-col items-center justify-center text-center w-full"
  >
    <div
      class="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl bg-amber-500/10 text-amber-400 border-amber-500/20"
    >
      <Lock class="w-8 h-8" />
    </div>

    <div class="space-y-3 max-w-xl">
      <h1
        class="text-3xl sm:text-4xl font-display font-black tracking-tight"
        :style="{ color: 'var(--app-text)' }"
      >
        Tu biblioteca personal te espera
      </h1>
      <p class="text-sm leading-relaxed" :style="{ color: 'var(--app-text-muted)' }">
        Las funciones de gestión de videojuegos (<strong class="text-amber-400">Backlog</strong>,
        <strong class="text-emerald-400">Jugando</strong>,
        <strong class="text-sky-400">Completados</strong> y
        <strong class="text-purple-400">Deseados</strong>) están disponibles exclusivamente para
        usuarios registrados.
      </p>
    </div>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
      <RouterLink
        to="/login"
        class="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white shadow-xl transition-all duration-150 hover:opacity-95 active:scale-95 cursor-pointer"
        :style="{ backgroundColor: 'var(--app-primary)' }"
      >
        <LogIn class="w-4 h-4" />
        <span>Iniciar Sesión / Crear Cuenta</span>
      </RouterLink>

      <RouterLink
        to="/explore"
        class="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm border transition-all duration-150 hover:bg-white/5 active:scale-95 cursor-pointer"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)',
        }"
      >
        <Compass class="w-4 h-4 opacity-70" />
        <span>Explorar Catálogo Libre</span>
      </RouterLink>

      <RouterLink
        to="/search?category=users"
        class="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm border transition-all duration-150 hover:bg-white/5 active:scale-95 cursor-pointer"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)',
        }"
      >
        <Users class="w-4 h-4 opacity-70" />
        <span>Ver Comunidad</span>
      </RouterLink>
    </div>
  </div>

  <!-- Authenticated Library View -->
  <div
    v-else
    class="py-6 max-w-[calc(100vw-8.5rem)] sm:max-w-[calc(100vw-13.5rem)] lg:max-w-[calc(100vw-16rem)] 2xl:max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 space-y-6 w-full flex-1 flex flex-col"
  >
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
      <div>
        <h1
          class="text-3xl font-display font-black tracking-tight"
          :style="{ color: 'var(--app-text)' }"
        >
          Mi Biblioteca
        </h1>
        <p class="text-xs sm:text-sm mt-1" :style="{ color: 'var(--app-text-muted)' }">
          Organiza tus títulos arrastrándolos entre categorías.
        </p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="gamesStore.fetchGames()"
          class="p-2 rounded-md border transition cursor-pointer hover:opacity-80"
          :style="{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text-muted)',
          }"
          title="Recargar catálogo"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': gamesStore.loading }" />
        </button>
      </div>
    </div>

    <!-- Status Tabs Component -->
    <StatusTabs class="shrink-0" />

    <!-- Sliding Container with Drag & Drop Viewports -->
    <SlidingContainer @select-game="handleSelectGame" />
  </div>
</template>

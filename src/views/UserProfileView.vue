<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { ArrowLeft, Gamepad2, Calendar, Star, Loader2, LogIn } from 'lucide-vue-next'
import { getApiUrl } from '@/config/api.config'
import { useAuthStore } from '@/stores/authStore'
import { useOpenGraph } from '@/composables/useOpenGraph'
import type { GameStatus, UserGame } from '@/types/game'
import { GAME_STATUS_CONFIG } from '@/types/game'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { setMeta } = useOpenGraph()

interface ProfileData {
  user: {
    id: string
    name: string
    avatar_url: string | null
    provider: string
    created_at: string
    stats: {
      total: number
      completed: number
      playing: number
      backlog: number
      wishlist: number
    }
  }
  games: UserGame[]
}

const profile = ref<ProfileData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<GameStatus | 'ALL'>('ALL')

const filteredGames = computed(() => {
  if (!profile.value) return []
  if (activeTab.value === 'ALL') return profile.value.games
  return profile.value.games.filter((g) => g.status === activeTab.value)
})

async function loadProfile(identifier: string) {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(getApiUrl(`/api/users/${encodeURIComponent(identifier)}`))
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('El perfil de usuario solicitado no fue encontrado.')
      }
      throw new Error(`Error al obtener perfil: ${res.status}`)
    }
    const data = await res.json()
    profile.value = data

    // Canonical URL update: If user accessed via UUID or different casing, replace URL with nickname
    const currentParam = String(route.params.id || '')
    if (data.user?.name && currentParam !== data.user.name) {
      router.replace({ name: 'user-profile', params: { id: data.user.name } })
    }

    setMeta({
      title: `Colección de ${data.user.name}`,
      description: `Explora la biblioteca de ${data.user.name} en NEXT.g: ${data.user.stats.completed} completados, ${data.user.stats.playing} jugando actualmente.`,
      image: getApiUrl(`/api/og/user/${encodeURIComponent(data.user.name)}`),
      type: 'profile',
    })
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Error al cargar perfil'
  } finally {
    loading.value = false
  }
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  } catch {
    return 'Reciente'
  }
}

watch(
  () => route.params.id,
  (newId) => {
    if (newId && String(newId) !== profile.value?.user.name) {
      loadProfile(String(newId))
    }
  },
)

onMounted(() => {
  if (route.params.id) {
    loadProfile(String(route.params.id))
  }
})
</script>

<template>
  <div class="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 flex-1 flex flex-col w-full">
    <!-- Back Link -->
    <div>
      <RouterLink
        to="/community"
        class="inline-flex items-center gap-2 text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity"
        :style="{ color: 'var(--app-text)' }"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Volver a la Comunidad</span>
      </RouterLink>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-24 flex flex-col items-center justify-center gap-3 opacity-60">
      <Loader2 class="w-8 h-8 animate-spin" :style="{ color: 'var(--app-primary)' }" />
      <p class="text-sm font-medium">Cargando perfil gamer...</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error || !profile"
      class="py-24 flex flex-col items-center justify-center gap-3 text-center"
    >
      <Gamepad2 class="w-12 h-12 opacity-50 mb-2" />
      <h2 class="text-xl font-bold">{{ error || 'Usuario no encontrado' }}</h2>
      <p class="text-xs" :style="{ color: 'var(--app-text-muted)' }">
        Verifica el enlace o explora otros perfiles en la comunidad.
      </p>
      <RouterLink
        to="/community"
        class="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white"
        :style="{ backgroundColor: 'var(--app-primary)' }"
      >
        Ir a la Comunidad
      </RouterLink>
    </div>

    <!-- Profile Header Card -->
    <div v-else class="space-y-8">
      <div
        class="p-6 sm:p-8 rounded-3xl border flex flex-col md:flex-row items-center md:items-start justify-between gap-6"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }"
      >
        <div
          class="flex flex-col sm:flex-row items-center md:items-start gap-5 text-center sm:text-left"
        >
          <!-- Avatar -->
          <img
            v-if="profile.user.avatar_url"
            :src="profile.user.avatar_url"
            :alt="profile.user.name"
            class="w-20 h-20 rounded-full object-cover border-2 shadow-lg"
            :style="{ borderColor: 'var(--app-primary)' }"
          />
          <div
            v-else
            class="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl text-white shadow-lg"
            :style="{ backgroundColor: 'var(--app-primary)' }"
          >
            {{ (profile.user.name || 'U').charAt(0).toUpperCase() }}
          </div>

          <!-- Name & Details -->
          <div class="space-y-2">
            <h1
              class="text-2xl sm:text-3xl font-display font-black tracking-tight"
              :style="{ color: 'var(--app-text)' }"
            >
              {{ profile.user.name }}
            </h1>
            <div
              class="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs"
              :style="{ color: 'var(--app-text-muted)' }"
            >
              <span class="inline-flex items-center gap-1">
                <Calendar class="w-3.5 h-3.5 opacity-60" />
                <span>Miembro desde {{ formatDate(profile.user.created_at) }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-4 gap-2.5 sm:gap-3 w-full md:w-auto">
          <div
            class="p-3 sm:p-4 rounded-2xl border text-center"
            :style="{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }"
          >
            <span class="block text-lg sm:text-xl font-bold">{{ profile.user.stats.total }}</span>
            <span class="text-[10px] sm:text-xs opacity-70">Total</span>
          </div>
          <div
            class="p-3 sm:p-4 rounded-2xl border text-center"
            :style="{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }"
          >
            <span class="block text-lg sm:text-xl font-bold text-emerald-400">{{
              profile.user.stats.playing
            }}</span>
            <span class="text-[10px] sm:text-xs opacity-70">Jugando</span>
          </div>
          <div
            class="p-3 sm:p-4 rounded-2xl border text-center"
            :style="{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }"
          >
            <span class="block text-lg sm:text-xl font-bold text-sky-400">{{
              profile.user.stats.completed
            }}</span>
            <span class="text-[10px] sm:text-xs opacity-70">Listos</span>
          </div>
          <div
            class="p-3 sm:p-4 rounded-2xl border text-center"
            :style="{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }"
          >
            <span class="block text-lg sm:text-xl font-bold text-amber-400">{{
              profile.user.stats.backlog
            }}</span>
            <span class="text-[10px] sm:text-xs opacity-70">Backlog</span>
          </div>
        </div>
      </div>

      <!-- Guest CTA Banner -->
      <div
        v-if="!authStore.isAuthenticated"
        class="p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left bg-linear-to-r from-indigo-500/10 via-purple-500/10 to-transparent"
        :style="{ borderColor: 'var(--app-border)' }"
      >
        <div>
          <p class="text-xs sm:text-sm font-bold" :style="{ color: 'var(--app-text)' }">
            ¿Te gusta cómo se ve esta colección?
          </p>
          <p class="text-xs mt-0.5" :style="{ color: 'var(--app-text-muted)' }">
            Crea tu cuenta gratuita en NEXT.g y empieza a organizar tu propio catálogo gamer.
          </p>
        </div>

        <RouterLink
          to="/register"
          class="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-95 cursor-pointer shadow-sm"
          :style="{ backgroundColor: 'var(--app-primary)' }"
        >
          <LogIn class="w-3.5 h-3.5" />
          <span>Crear Mi Cuenta Gratis</span>
        </RouterLink>
      </div>

      <!-- Library Section -->
      <div class="space-y-6">
        <!-- Segmented Status Tabs -->
        <div
          class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none border-b"
          :style="{ borderColor: 'var(--app-border)' }"
        >
          <button
            type="button"
            @click="activeTab = 'ALL'"
            class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer shrink-0"
            :style="{
              backgroundColor: activeTab === 'ALL' ? 'var(--app-surface)' : 'transparent',
              color: activeTab === 'ALL' ? 'var(--app-primary)' : 'var(--app-text-muted)',
            }"
          >
            Todos ({{ profile.games.length }})
          </button>
          <button
            type="button"
            @click="activeTab = 'PLAYING'"
            class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer shrink-0"
            :style="{
              backgroundColor: activeTab === 'PLAYING' ? 'var(--app-surface)' : 'transparent',
              color: activeTab === 'PLAYING' ? '#10b981' : 'var(--app-text-muted)',
            }"
          >
            Jugando ({{ profile.user.stats.playing }})
          </button>
          <button
            type="button"
            @click="activeTab = 'COMPLETED'"
            class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer shrink-0"
            :style="{
              backgroundColor: activeTab === 'COMPLETED' ? 'var(--app-surface)' : 'transparent',
              color: activeTab === 'COMPLETED' ? '#38bdf8' : 'var(--app-text-muted)',
            }"
          >
            Completados ({{ profile.user.stats.completed }})
          </button>
          <button
            type="button"
            @click="activeTab = 'BACKLOG'"
            class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer shrink-0"
            :style="{
              backgroundColor: activeTab === 'BACKLOG' ? 'var(--app-surface)' : 'transparent',
              color: activeTab === 'BACKLOG' ? '#fbbf24' : 'var(--app-text-muted)',
            }"
          >
            Backlog ({{ profile.user.stats.backlog }})
          </button>
          <button
            type="button"
            @click="activeTab = 'WISHLIST'"
            class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer shrink-0"
            :style="{
              backgroundColor: activeTab === 'WISHLIST' ? 'var(--app-surface)' : 'transparent',
              color: activeTab === 'WISHLIST' ? '#c084fc' : 'var(--app-text-muted)',
            }"
          >
            Deseados ({{ profile.user.stats.wishlist }})
          </button>
        </div>

        <!-- Empty Tab -->
        <div
          v-if="filteredGames.length === 0"
          class="py-16 flex flex-col items-center justify-center gap-2 opacity-60 text-center"
        >
          <Gamepad2 class="w-10 h-10 mb-1" />
          <p class="text-sm font-semibold">No hay juegos en esta categoría</p>
        </div>

        <!-- Games Grid -->
        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4"
        >
          <div
            v-for="game in filteredGames"
            :key="game.id"
            @click="router.push(`/game/${game.slug || game.id}`)"
            class="group relative flex flex-col rounded-xl overflow-hidden border cursor-pointer select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
            :style="{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }"
          >
            <!-- Cover -->
            <div class="aspect-3/4 w-full bg-black/40 overflow-hidden relative">
              <img
                v-if="game.cover_url"
                :src="game.cover_url"
                :alt="game.title"
                loading="lazy"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div v-else class="w-full h-full flex items-center justify-center opacity-40">
                <Gamepad2 class="w-8 h-8" />
              </div>

              <!-- Rating badge -->
              <div
                v-if="game.rating"
                class="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 bg-black/80 backdrop-blur-xs text-amber-400 border border-amber-500/30"
              >
                <Star class="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span>{{ Math.round(game.rating) }}</span>
              </div>

              <!-- Status Badge on Card -->
              <span
                class="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider backdrop-blur-xs shadow-xs"
                :class="GAME_STATUS_CONFIG[game.status]?.badgeClass"
              >
                {{ GAME_STATUS_CONFIG[game.status]?.label }}
              </span>
            </div>

            <!-- Metadata -->
            <div class="p-2.5 flex flex-col grow justify-between">
              <h4
                class="text-xs sm:text-sm font-bold line-clamp-1 group-hover:text-(--app-primary) transition-colors"
              >
                {{ game.title }}
              </h4>
              <p
                v-if="game.genres && game.genres.length"
                class="text-[10px] line-clamp-1 mt-1 opacity-70"
                :style="{ color: 'var(--app-text-muted)' }"
              >
                {{ game.genres.slice(0, 2).join(', ') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

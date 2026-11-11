<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Gamepad2,
  Dices,
  Search,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Compass,
  SlidersHorizontal,
} from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useGamesStore } from '@/stores/gamesStore'

const route = useRoute()
const authStore = useAuthStore()
const gamesStore = useGamesStore()

const isUserMenuOpen = ref(false)

function toggleUserMenu() {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

async function handleLogout() {
  isUserMenuOpen.value = false
  await authStore.logout()
  gamesStore.fetchGames()
}

function closeMenuOnClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('#user-profile-menu')) {
    isUserMenuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', closeMenuOnClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenuOnClickOutside)
})
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full border-b transition-colors duration-200"
    :style="{
      backgroundColor: 'var(--app-bg)',
      borderColor: 'var(--app-border)',
    }"
  >
    <div
      class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4"
    >
      <!-- Brand Logo -->
      <RouterLink
        to="/"
        class="flex items-center gap-2.5 group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--app-primary) rounded p-1"
      >
        <div>
          <span
            class="font-brand text-4xl mb-1 tracking-wider block leading-none select-none"
            :style="{ color: 'var(--app-text)' }"
          >
            NEXT<span :style="{ color: 'var(--app-primary)' }">.g</span>
          </span>
        </div>
      </RouterLink>

      <!-- Navigation Links (Centered at exactly 50% of the bar/screen) -->
      <nav class="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2 sm:gap-3 lg:gap-4">
        <!-- If Authenticated: Library -->
        <RouterLink
          v-if="authStore.isAuthenticated"
          to="/"
          class="relative flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer"
          :class="
            route.path === '/' || route.path === '/library' ? 'font-bold' : 'hover:bg-white/5'
          "
          :style="{
            color:
              route.path === '/' || route.path === '/library'
                ? 'var(--app-text)'
                : 'var(--app-text-muted)',
            backgroundColor:
              route.path === '/' || route.path === '/library'
                ? 'var(--app-surface)'
                : 'transparent',
          }"
        >
          <Gamepad2
            class="w-4 h-4"
            :style="{
              color:
                route.path === '/' || route.path === '/library' ? 'var(--app-primary)' : 'inherit',
            }"
          />
          <span>Biblioteca</span>
          <span
            v-if="route.path === '/' || route.path === '/library'"
            class="absolute bottom-0 left-2 right-2 h-0.5 rounded-xs"
            :style="{ backgroundColor: 'var(--app-primary)' }"
          />
        </RouterLink>

        <!-- If Unauthenticated: Home -->
        <RouterLink
          v-else
          to="/"
          class="relative flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer"
          :class="route.path === '/' ? 'font-bold' : 'hover:bg-white/5'"
          :style="{
            color: route.path === '/' ? 'var(--app-text)' : 'var(--app-text-muted)',
            backgroundColor: route.path === '/' ? 'var(--app-surface)' : 'transparent',
          }"
        >
          <span>Inicio</span>
          <span
            v-if="route.path === '/'"
            class="absolute bottom-0 left-2 right-2 h-0.5 rounded-xs"
            :style="{ backgroundColor: 'var(--app-primary)' }"
          />
        </RouterLink>

        <!-- Explore Games (Visible to All) -->
        <RouterLink
          to="/explore"
          class="relative flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer"
          :class="route.path === '/explore' ? 'font-bold' : 'hover:bg-white/5'"
          :style="{
            color: route.path === '/explore' ? 'var(--app-text)' : 'var(--app-text-muted)',
            backgroundColor: route.path === '/explore' ? 'var(--app-surface)' : 'transparent',
          }"
        >
          <Compass
            class="w-4 h-4"
            :style="{ color: route.path === '/explore' ? 'var(--app-primary)' : 'inherit' }"
          />
          <span>Explorar</span>
          <span
            v-if="route.path === '/explore'"
            class="absolute bottom-0 left-2 right-2 h-0.5 rounded-xs"
            :style="{ backgroundColor: 'var(--app-primary)' }"
          />
        </RouterLink>

        <!-- Roulette (Visible ONLY to Authenticated Members) -->
        <RouterLink
          v-if="authStore.isAuthenticated"
          to="/roulette"
          class="relative flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer"
          :class="route.path === '/roulette' ? 'font-bold' : 'hover:bg-white/5'"
          :style="{
            color: route.path === '/roulette' ? 'var(--app-text)' : 'var(--app-text-muted)',
            backgroundColor: route.path === '/roulette' ? 'var(--app-surface)' : 'transparent',
          }"
        >
          <Dices
            class="w-4 h-4"
            :style="{ color: route.path === '/roulette' ? 'var(--app-primary)' : 'inherit' }"
          />
          <span>Ruleta</span>
          <span
            v-if="route.path === '/roulette'"
            class="absolute bottom-0 left-2 right-2 h-0.5 rounded-xs"
            :style="{ backgroundColor: 'var(--app-primary)' }"
          />
        </RouterLink>
      </nav>

      <!-- Right Actions: Search Trigger & Auth -->
      <div class="flex items-center gap-3 sm:gap-4">
        <!-- Search Dedicated Route Link -->
        <RouterLink
          to="/search"
          class="flex items-center gap-2.5 px-3.5 py-2 rounded-md text-xs border transition-all duration-200 hover:opacity-90 cursor-pointer"
          :style="{
            backgroundColor:
              route.path === '/search' ? 'var(--app-surface-hover)' : 'var(--app-surface)',
            borderColor: route.path === '/search' ? 'var(--app-primary)' : 'var(--app-border)',
            color: 'var(--app-text-muted)',
          }"
          aria-label="Buscar juegos o usuarios (Ctrl+K)"
        >
          <Search class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
          <span class="hidden md:inline font-medium">Buscar...</span>
          <kbd
            class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded border"
            :style="{
              backgroundColor: 'var(--app-surface-hover)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text-muted)',
            }"
          >
            Ctrl K
          </kbd>
        </RouterLink>

        <!-- Auth Section -->
        <div id="user-profile-menu" class="relative">
          <!-- Unauthenticated: Login & Register Buttons (No Icons) -->
          <div v-if="!authStore.isAuthenticated" class="flex items-center gap-2.5 sm:gap-3">
            <RouterLink
              to="/login"
              class="px-3.5 py-2 rounded-md text-xs font-semibold border transition-all duration-150 hover:bg-white/5 active:scale-95 cursor-pointer"
              :style="{
                backgroundColor: 'transparent',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)',
              }"
            >
              Iniciar sesión
            </RouterLink>

            <RouterLink
              to="/register"
              class="px-4 py-2 rounded-md text-xs font-semibold border transition-all duration-150 hover:opacity-95 active:scale-95 cursor-pointer text-white shadow-xs"
              :style="{
                backgroundColor: 'var(--app-primary)',
                borderColor: 'var(--app-primary)',
              }"
            >
              Registrarse
            </RouterLink>
          </div>

          <!-- Authenticated: User Avatar & Menu -->
          <div v-else class="relative">
            <button
              type="button"
              @click.stop="toggleUserMenu"
              class="flex items-center gap-2.5 px-3 py-1.5 rounded-[4px] border transition-all duration-150 hover:opacity-90 cursor-pointer"
              :style="{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)',
              }"
              aria-label="Menú de usuario"
            >
              <!-- Avatar or initial -->
              <img
                v-if="authStore.user?.avatar_url"
                :src="authStore.user.avatar_url"
                :alt="authStore.user.name"
                class="w-6 h-6 rounded-full object-cover border"
                :style="{ borderColor: 'var(--app-primary)' }"
              />
              <div
                v-else
                class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                :style="{ backgroundColor: 'var(--app-primary)' }"
              >
                {{ (authStore.user?.name || 'U').charAt(0).toUpperCase() }}
              </div>

              <span class="text-xs font-medium max-w-25 truncate hidden md:inline">
                {{ authStore.user?.name }}
              </span>
              <ChevronDown class="w-3.5 h-3.5 opacity-60 pr-0.5" />
            </button>

            <!-- Dropdown Menu -->
            <Transition name="fade">
              <div
                v-if="isUserMenuOpen"
                class="absolute right-0 mt-2 w-56 rounded-xl border shadow-xl py-1 z-50 overflow-hidden"
                :style="{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text)',
                }"
              >
                <!-- Profile Header -->
                <div class="px-3.5 py-2.5 border-b" :style="{ borderColor: 'var(--app-border)' }">
                  <p class="text-xs font-bold truncate">{{ authStore.user?.name }}</p>
                </div>

                <!-- Menu Items -->
                <RouterLink
                  v-if="authStore.user?.name"
                  :to="`/user/${encodeURIComponent(authStore.user.name)}`"
                  @click="isUserMenuOpen = false"
                  class="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <UserIcon class="w-4 h-4 opacity-70" />
                  <span>Mi Perfil Público</span>
                </RouterLink>

                <RouterLink
                  to="/setup"
                  @click="isUserMenuOpen = false"
                  class="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <SlidersHorizontal class="w-4 h-4" :style="{ color: 'var(--app-primary)' }" />
                  <span>Configuración de experiencia</span>
                </RouterLink>

                <div class="border-t my-1" :style="{ borderColor: 'var(--app-border)' }" />

                <button
                  type="button"
                  @click="handleLogout"
                  class="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                >
                  <LogOut class="w-4 h-4" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

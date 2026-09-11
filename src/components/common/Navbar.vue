<script setup lang="ts">
import { Gamepad2, Dices, Search, HelpCircle } from 'lucide-vue-next';
import { RouterLink, useRoute } from 'vue-router';
import ThemeSelector from './ThemeSelector.vue';

defineEmits<{
  (e: 'open-search'): void;
  (e: 'open-faq'): void;
}>();

const route = useRoute();
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full border-b transition-colors duration-200"
    :style="{
      backgroundColor: 'var(--app-bg)',
      borderColor: 'var(--app-border)',
    }"
  >
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
      <!-- Brand Logo -->
      <RouterLink
        to="/"
        class="flex items-center gap-2.5 group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--app-primary) rounded p-1"
      >
        <div>
          <span class="font-brand text-4xl mb-1 tracking-wider block leading-none select-none" :style="{ color: 'var(--app-text)' }">
            NEXT<span :style="{ color: 'var(--app-primary)' }">.g</span>
          </span>
        </div>
      </RouterLink>

      <!-- Navigation Links (Centered at exactly 50% of the bar/screen) -->
      <nav class="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-2">
        <RouterLink
          to="/"
          class="relative flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-semibold transition-all duration-150 cursor-pointer"
          :class="route.path === '/' ? 'font-bold' : 'hover:bg-white/5'"
          :style="{
            color: route.path === '/' ? 'var(--app-text)' : 'var(--app-text-muted)',
            backgroundColor: route.path === '/' ? 'var(--app-surface)' : 'transparent',
          }"
        >
          <Gamepad2 class="w-4 h-4" :style="{ color: route.path === '/' ? 'var(--app-primary)' : 'inherit' }" />
          <span>Juegos</span>
          <span
            v-if="route.path === '/'"
            class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
            :style="{ backgroundColor: 'var(--app-primary)' }"
          />
        </RouterLink>

        <RouterLink
          to="/roulette"
          class="relative flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-semibold transition-all duration-150 cursor-pointer"
          :class="route.path === '/roulette' ? 'font-bold' : 'hover:bg-white/5'"
          :style="{
            color: route.path === '/roulette' ? 'var(--app-text)' : 'var(--app-text-muted)',
            backgroundColor: route.path === '/roulette' ? 'var(--app-surface)' : 'transparent',
          }"
        >
          <Dices class="w-4 h-4" :style="{ color: route.path === '/roulette' ? 'var(--app-primary)' : 'inherit' }" />
          <span>Ruleta</span>
          <span
            v-if="route.path === '/roulette'"
            class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
            :style="{ backgroundColor: 'var(--app-primary)' }"
          />
        </RouterLink>
      </nav>

      <!-- Right Actions: Search Trigger & Theme Selector -->
      <div class="flex items-center gap-2.5">
        <!-- Search Trigger Button -->
        <button
          type="button"
          @click="$emit('open-search')"
          class="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border transition-all duration-200 hover:opacity-90 cursor-pointer"
          :style="{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text-muted)',
          }"
          aria-label="Buscar juegos (Ctrl+K)"
        >
          <Search class="w-3.5 h-3.5" :style="{ color: 'var(--app-primary)' }" />
          <span class="hidden md:inline font-medium">Buscar juego...</span>
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
        </button>

        <!-- FAQ / Help Trigger Button -->
        <button
          type="button"
          @click="$emit('open-faq')"
          class="flex items-center justify-center w-8 h-8 rounded-md text-xs border transition-all duration-200 hover:opacity-90 cursor-pointer"
          :style="{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text-muted)',
          }"
          aria-label="Ayuda y preguntas frecuentes"
          title="Ayuda y preguntas frecuentes"
        >
          <HelpCircle class="w-4 h-4" />
        </button>

        <!-- Theme Selector -->
        <ThemeSelector />
      </div>
    </div>
  </header>
</template>

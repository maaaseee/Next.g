<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterView, useRouter, useRoute } from 'vue-router';
import Navbar from '@/components/common/Navbar.vue';
import Footer from '@/components/common/Footer.vue';
import ToastContainer from '@/components/common/ToastContainer.vue';
import FavoriteGamesModal from '@/components/auth/FavoriteGamesModal.vue';
import { useTheme } from '@/composables/useTheme';
import { useGamesStore } from '@/stores/gamesStore';
import { useAuthStore } from '@/stores/authStore';

const { initTheme } = useTheme();
const router = useRouter();
const route = useRoute();
const gamesStore = useGamesStore();
const authStore = useAuthStore();
const isInitialLoading = ref(true);

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    router.push('/search');
  }
}

onMounted(async () => {
  initTheme();
  const startTime = Date.now();
  try {
    // Check for incoming OAuth tokens or active session
    await authStore.initAuth();
    await gamesStore.fetchGames();
  } finally {
    const elapsed = Date.now() - startTime;
    const minDuration = 500;
    const remaining = Math.max(0, minDuration - elapsed);
    setTimeout(() => {
      isInitialLoading.value = false;
      gamesStore.isAppReady = true;
      window.dispatchEvent(new CustomEvent('nextg:app-ready'));
    }, remaining);
  }
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div class="min-h-screen flex flex-col transition-colors duration-200" :style="{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }">
    <!-- Initial Splash Screen -->
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      leave-active-class="transition-opacity duration-500 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 pointer-events-none"
    >
      <div
        v-if="isInitialLoading"
        class="fixed inset-0 z-50 flex flex-col items-center justify-center transition-colors duration-300"
        :style="{ backgroundColor: 'var(--app-bg)' }"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="flex flex-col items-center gap-6 select-none animate-pulse">
          <div class="font-brand text-6xl sm:text-7xl tracking-wider leading-none" :style="{ color: 'var(--app-text)' }">
            NEXT<span :style="{ color: 'var(--app-primary)' }">.g</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full animate-ping" :style="{ backgroundColor: 'var(--app-primary)' }"></span>
            <span class="text-xs font-mono font-bold tracking-widest uppercase" :style="{ color: 'var(--app-text-muted)' }">
              Cargando catálogo...
            </span>
          </div>
        </div>
      </div>
    </Transition>

    <Navbar v-if="!route.meta.hideNavbar" />

    <main class="flex-1 flex flex-col w-full">
      <RouterView />
    </main>

    <Footer v-if="!route.meta.hideFooter" />

    <!-- Global Toast Notifications -->
    <ToastContainer />

    <!-- Onboarding Modal (Netflix-style Favorite Games Selector) -->
    <FavoriteGamesModal />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import Navbar from '@/components/common/Navbar.vue';
import Footer from '@/components/common/Footer.vue';
import SearchModal from '@/components/catalog/SearchModal.vue';
import { useTheme } from '@/composables/useTheme';
import { useGamesStore } from '@/stores/gamesStore';

const { initTheme } = useTheme();
const gamesStore = useGamesStore();

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (gamesStore.isSearchModalOpen) {
      gamesStore.closeSearchModal();
    } else {
      gamesStore.openSearchModal();
    }
  }
}

onMounted(() => {
  initTheme();
  gamesStore.fetchGames();
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div class="min-h-screen flex flex-col transition-colors duration-200" :style="{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }">
    <Navbar @open-search="gamesStore.openSearchModal" />

    <main class="flex-1">
      <RouterView />
    </main>

    <Footer />

    <!-- Global Search Modal accessible from Navbar and shortcut Ctrl+K -->
    <SearchModal
      :is-open="gamesStore.isSearchModalOpen"
      @close="gamesStore.closeSearchModal"
    />
  </div>
</template>

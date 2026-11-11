<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { useAuthStore } from '@/stores/authStore';

const CatalogView = defineAsyncComponent(() => import('./CatalogView.vue'));
const LandingView = defineAsyncComponent(() => import('./LandingView.vue'));
const authStore = useAuthStore();
</script>

<template>
  <CatalogView v-if="authStore.isAuthenticated" />
  <LandingView v-else />
</template>

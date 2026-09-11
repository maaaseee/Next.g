<template>
  <div class="h-[580px] flex flex-col items-center justify-center text-center px-4 py-6 select-none">
    <!-- Clean Badge -->
    <div
      class="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border"
      :style="{
        backgroundColor: 'var(--app-surface)',
        borderColor: 'var(--app-border)',
        color: 'var(--app-text-muted)',
      }"
    >
      Error 404
    </div>

    <!-- Big 404 with Theme-based Gradient -->
    <div
      class="text-7xl sm:text-9xl font-black font-mono tracking-tighter leading-none my-1 select-none gradient-404"
    >
      404
    </div>

    <!-- Main Title -->
    <h1 class="text-2xl sm:text-3xl font-bold tracking-tight mb-3 text-app-text">
      Página no encontrada
    </h1>

    <!-- Description -->
    <p class="text-app-text-muted max-w-md text-xs sm:text-sm mb-8 leading-relaxed">
      No pudimos encontrar la página que buscas. Es posible que la dirección esté mal escrita o que el contenido haya sido movido.
    </p>

    <!-- Navigation Actions -->
    <div class="flex items-center gap-3">
      <button
        type="button"
        @click="handleGoBack"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-150 hover:bg-white/5 cursor-pointer"
        :style="{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)',
        }"
      >
        <ArrowLeft class="w-4 h-4" />
        Volver atrás
      </button>

      <button
        type="button"
        @click="handleGoHome"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shadow-sm cursor-pointer"
        :style="{
          backgroundColor: 'var(--app-primary)',
          color: '#ffffff',
        }"
      >
        <Home class="w-4 h-4" />
        Ir al inicio
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ArrowLeft, Home } from 'lucide-vue-next';

const router = useRouter();

function handleGoBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
}

function handleGoHome() {
  router.push('/');
}
</script>

<style scoped>
.gradient-404 {
  background: linear-gradient(
    135deg,
    var(--app-primary) 0%,
    color-mix(in srgb, var(--app-primary) 40%, #ffffff) 50%,
    color-mix(in srgb, var(--app-primary) 70%, var(--app-text)) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 10px 25px color-mix(in srgb, var(--app-primary) 30%, transparent));
}
</style>

<template>
  <Teleport to="body">
    <div
      class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
      aria-live="polite"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300"
          :style="{
            backgroundColor: 'var(--app-card)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
          }"
        >
          <!-- Icon by type -->
          <div class="flex items-center gap-3 shrink-0">
            <!-- Success icon -->
            <div
              v-if="toast.type === 'success'"
              class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0"
            >
              <Check class="w-4 h-4" />
            </div>
            <!-- Error icon -->
            <div
              v-else-if="toast.type === 'error'"
              class="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0"
            >
              <AlertCircle class="w-4 h-4" />
            </div>
            <!-- Info icon -->
            <div
              v-else
              class="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0"
            >
              <Info class="w-4 h-4" />
            </div>

            <p class="text-xs sm:text-sm font-medium leading-snug">
              {{ toast.message }}
            </p>
          </div>

          <!-- Close button -->
          <button
            type="button"
            @click="toastStore.remove(toast.id)"
            class="text-app-text-muted hover:text-app-text transition-colors p-1 text-xs shrink-0 cursor-pointer"
            aria-label="Cerrar notificación"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { Check, AlertCircle, Info, X } from 'lucide-vue-next';
import { useToastStore } from '@/stores/toastStore';

const toastStore = useToastStore();
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100px) scale(0.9);
}
</style>

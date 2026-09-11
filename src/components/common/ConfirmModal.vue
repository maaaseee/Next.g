<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        @click.self="emit('cancel')"
        @keydown.esc="emit('cancel')"
      >
        <div
          class="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          :style="{
            backgroundColor: 'var(--app-card)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
          }"
        >
          <!-- Warning Icon & Title -->
          <div class="flex items-start gap-4 mb-4">
            <div class="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold leading-tight mb-1">
                {{ title || '¿Eliminar juego?' }}
              </h3>
              <p class="text-xs text-app-text-muted leading-relaxed">
                {{ message || 'Esta acción eliminará el juego del catálogo compartido para todos los usuarios.' }}
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              @click="emit('cancel')"
              class="px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 hover:bg-white/5 cursor-pointer"
              :style="{ borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }"
            >
              {{ cancelText || 'Cancelar' }}
            </button>

            <button
              type="button"
              @click="emit('confirm')"
              class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all duration-150 active:scale-95 cursor-pointer"
            >
              {{ confirmText || 'Sí, eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next';

withDefaults(
  defineProps<{
    isOpen: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
  }>(),
  {
    title: '¿Eliminar juego?',
    message: 'Esta acción eliminará el juego del catálogo compartido.',
    confirmText: 'Sí, eliminar',
    cancelText: 'Cancelar',
  }
);

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

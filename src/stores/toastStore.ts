import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  timeoutId?: ReturnType<typeof setTimeout>;
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([]);

  function show(message: string, type: ToastType = 'info', duration = 3500) {
    const id = Math.random().toString(36).substring(2, 9);
    const timeoutId = setTimeout(() => {
      remove(id);
    }, duration);

    toasts.value.push({ id, type, message, timeoutId });
  }

  function success(message: string, duration = 3500) {
    show(message, 'success', duration);
  }

  function error(message: string, duration = 4000) {
    show(message, 'error', duration);
  }

  function info(message: string, duration = 3500) {
    show(message, 'info', duration);
  }

  function remove(id: string) {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      const item = toasts.value[index];
      if (item?.timeoutId) {
        clearTimeout(item.timeoutId);
      }
      toasts.value.splice(index, 1);
    }
  }

  return {
    toasts,
    show,
    success,
    error,
    info,
    remove,
  };
});

import { ref } from 'vue';
import { type ThemeId, THEME_OPTIONS } from '../types/theme';

const currentTheme = ref<ThemeId>('vintage-berry');

export function useTheme() {
  function setTheme(theme: ThemeId) {
    currentTheme.value = theme;
    try {
      localStorage.setItem('nextg-theme', theme);
    } catch {
      // Ignore localStorage errors in restricted environments
    }

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      // Remove all theme classes first
      THEME_OPTIONS.forEach((t) => root.classList.remove(t.id));
      // Add selected theme class
      root.classList.add(theme);
    }
  }

  function initTheme() {
    let initial: ThemeId = 'vintage-berry';
    try {
      const saved = localStorage.getItem('nextg-theme') as ThemeId;
      if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
        initial = saved;
      }
    } catch {
      // Fallback to default
    }
    setTheme(initial);
  }

  return {
    currentTheme,
    themes: THEME_OPTIONS,
    setTheme,
    initTheme,
  };
}

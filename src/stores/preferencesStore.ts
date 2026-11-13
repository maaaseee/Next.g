import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { GameStatus } from '@/types/game';
import type { ThemeId } from '@/types/theme';
import { useAuthStore } from './authStore';
import { useToastStore } from './toastStore';
import { getApiUrl } from '@/config/api.config';

export type CardDensity = 'comfortable' | 'compact';

export interface UserPreferences {
  theme: ThemeId;
  enableDragAndDrop: boolean;
  defaultLibraryTab: GameStatus;
  cardDensity: CardDensity;
  reducedMotion: boolean;
}

const STORAGE_KEY_PREFIX = 'nextg_pref_';

function getStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (val === null) return fallback;
    return val === 'true';
  } catch {
    return fallback;
  }
}

function getStoredString<T extends string>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(STORAGE_KEY_PREFIX + key) as T | null;
    return val || fallback;
  } catch {
    return fallback;
  }
}

export const usePreferencesStore = defineStore('preferences', () => {
  const authStore = useAuthStore();
  const toast = useToastStore();

  const enableDragAndDrop = ref<boolean>(getStoredBoolean('drag_and_drop', true));
  const defaultLibraryTab = ref<GameStatus>(getStoredString<GameStatus>('default_tab', 'BACKLOG'));
  const cardDensity = ref<CardDensity>(getStoredString<CardDensity>('card_density', 'comfortable'));
  const reducedMotion = ref<boolean>(getStoredBoolean('reduced_motion', false));
  const saving = ref(false);

  function setDragAndDrop(enabled: boolean) {
    enableDragAndDrop.value = enabled;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}drag_and_drop`, String(enabled));
    } catch {
      // Storage ignored if restricted
    }
  }

  function setDefaultLibraryTab(tab: GameStatus) {
    defaultLibraryTab.value = tab;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}default_tab`, tab);
    } catch {
      // Storage ignored
    }
  }

  function setCardDensity(density: CardDensity) {
    cardDensity.value = density;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}card_density`, density);
    } catch {
      // Storage ignored
    }
  }

  function setReducedMotion(reduced: boolean) {
    reducedMotion.value = reduced;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}reduced_motion`, String(reduced));
    } catch {
      // Storage ignored
    }
  }

  /**
   * Completes initial setup / configuration and updates user onboarding status.
   */
  async function completeSetup(isSkipping = false): Promise<boolean> {
    saving.value = true;
    try {
      if (authStore.isAuthenticated && !authStore.isLocalOfflineMode) {
        const res = await fetch(getApiUrl('/api/auth/complete-setup'), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user && authStore.user) {
            authStore.user.onboarded = true;
          }
        }
      } else if (authStore.user) {
        authStore.user.onboarded = true;
      }

      if (isSkipping) {
        toast.info('Configuración omitida. Se aplicaron los valores predeterminados.');
      } else {
        toast.success('¡Experiencia personalizada guardada con éxito!');
      }

      return true;
    } catch (err) {
      console.warn('[PreferencesStore] Error completing setup via API, applying locally:', err);
      if (authStore.user) {
        authStore.user.onboarded = true;
      }
      return true;
    } finally {
      saving.value = false;
    }
  }

  return {
    enableDragAndDrop,
    defaultLibraryTab,
    cardDensity,
    reducedMotion,
    saving,
    setDragAndDrop,
    setDefaultLibraryTab,
    setCardDensity,
    setReducedMotion,
    completeSetup,
  };
});

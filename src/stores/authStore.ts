import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import router from '@/router';
import type { User, AuthResponse } from '@/types/auth';
import type { Game } from '@/types/game';
import { getApiUrl } from '@/config/api.config';
import { useToastStore } from './toastStore';
import { useGamesStore } from './gamesStore';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const rememberedEmail = ref<string>(localStorage.getItem('nextg_remembered_email') || '');
  const loading = ref(false);
  const isOnboardingModalOpen = ref(false);
  const isLocalOfflineMode = ref(false);

  const isAuthenticated = computed(() => Boolean(user.value));
  const isOnboarded = computed(() => Boolean(user.value?.onboarded));

  function isLocalEnvironment(): boolean {
    if (!import.meta.env.DEV) return false;
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  }

  /**
   * Authentication is handled via HttpOnly Cookies (`credentials: 'include'`).
   * Kept as an empty object getter for backwards compatibility without exposing tokens in JS headers.
   */
  const authHeader = computed<Record<string, string>>(() => ({}));

  function openOnboardingModal() {
    isOnboardingModalOpen.value = true;
  }

  function closeOnboardingModal() {
    isOnboardingModalOpen.value = false;
  }

  /**
   * Initializes auth state, checking URL hash and query for OAuth callback results,
   * extracting and sanitizing tokens, and verifying active session.
   */
  async function initAuth() {
    const toast = useToastStore();
    const hash = window.location.hash || '';
    const search = window.location.search || '';

    // 1. Check for OAuth callback error in hash or query
    if (hash.includes('auth_error=') || search.includes('auth_error=')) {
      const match = hash.match(/auth_error=([^&]+)/) || search.match(/auth_error=([^&]+)/);
      if (match && match[1]) {
        const errorMsg = decodeURIComponent(match[1]);
        toast.error(errorMsg);
      }
    }

    // 2. Extract OAuth callback token if passed in hash or query
    let extractedToken: string | null = null;
    const tokenMatch = hash.match(/auth_token=([^&]+)/) || search.match(/auth_token=([^&]+)/);
    if (tokenMatch && tokenMatch[1]) {
      extractedToken = decodeURIComponent(tokenMatch[1]);
      token.value = extractedToken;
      localStorage.setItem('nextg_auth_token', extractedToken);
    } else {
      const savedToken = localStorage.getItem('nextg_auth_token');
      if (savedToken) {
        token.value = savedToken;
      }
    }

    const isOAuthSuccess = hash.includes('auth_success=') || search.includes('auth_success=') || Boolean(extractedToken);
    const isChooseNickname = hash.includes('choose_nickname=') || window.location.pathname === '/choose-nickname';

    // 3. Immediately clean the browser URL: strip auth_token, auth_error, auth_success from both hash & query
    if (isOAuthSuccess || hash.includes('auth_error=') || search.includes('auth_error=')) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete('auth_token');
      searchParams.delete('auth_success');
      searchParams.delete('auth_error');
      const cleanSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
      window.history.replaceState(null, '', window.location.pathname + cleanSearch);
    }

    // 4. Always verify active session with backend (using HttpOnly cookie and Bearer header fallback)
    const profile = await fetchMe(extractedToken || undefined);
    if (isOAuthSuccess && profile) {
      if (isChooseNickname || (!profile.onboarded && profile.provider !== 'local')) {
        toast.info('Para proteger tu privacidad, confirma tu nickname gamer público.');
        if (window.location.pathname !== '/choose-nickname') {
          router.push('/choose-nickname');
        }
      } else {
        toast.success('¡Sesión iniciada con éxito!');
        if (window.location.pathname === '/' || window.location.pathname === '/login') {
          router.push('/library');
        }
      }
    }
  }

  /**
   * Fetches the current user profile from the backend using HttpOnly cookies.
   * Optionally accepts a bearer token override for initial OAuth handshake.
   */
  async function fetchMe(bearerToken?: string): Promise<User | null> {
    if (isLocalEnvironment() && isLocalOfflineMode.value) {
      user.value = {
        id: 'local-test-user',
        name: 'TesterLocal',
        avatar_url: null,
        provider: 'local',
        onboarded: true,
      };
      useGamesStore().populateLocalDevTestGames();
      return user.value;
    }

    loading.value = true;
    try {
      const headers: Record<string, string> = {};
      const activeToken = bearerToken || token.value;
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const res = await fetch(getApiUrl('/api/auth/me'), {
        credentials: 'include',
        headers,
      });

      if (res.status === 401) {
        user.value = null;
        token.value = null;
        localStorage.removeItem('nextg_auth_token');
        return null;
      }

      if (!res.ok) {
        throw new Error(`Error ${res.status} al obtener perfil`);
      }

      const data = await res.json();
      user.value = data.user;

      return user.value;
    } catch (err) {
      console.error('[AuthStore] Error fetching user profile:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Logs in an existing user with email, password and optional remember-me flag.
   * The JWT is stored by the server in an HttpOnly Cookie.
   */
  async function login(email: string, password: string, rememberMe = true): Promise<boolean> {
    const toast = useToastStore();
    loading.value = true;

    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al iniciar sesión.');
      }

      isLocalOfflineMode.value = false;
      user.value = data.user;
      if (data.token) {
        token.value = data.token;
        localStorage.setItem('nextg_auth_token', data.token);
      }

      if (rememberMe) {
        localStorage.setItem('nextg_remembered_email', email);
        rememberedEmail.value = email;
      } else {
        localStorage.removeItem('nextg_remembered_email');
        rememberedEmail.value = '';
      }

      toast.success(`¡Bienvenido de nuevo, ${user.value?.name}!`);

      await useGamesStore().fetchGames(true);

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de autenticación.';
      toast.error(msg);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Local-only test account login (strictly enabled in local development mode).
   * Logs into `test@nextg.local` with 135 preloaded games (105 in Backlog) to test infinite scroll & DnD.
   */
  async function loginWithLocalTestAccount(): Promise<boolean> {
    if (!isLocalEnvironment()) {
      return false;
    }

    const toast = useToastStore();
    const gamesStore = useGamesStore();
    loading.value = true;

    try {
      const res = await fetch(getApiUrl('/api/auth/dev-test-login'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data: AuthResponse = await res.json();
        isLocalOfflineMode.value = false;
        user.value = data.user;
        if (data.token) {
          token.value = data.token;
          localStorage.setItem('nextg_auth_token', data.token);
        }
        await gamesStore.fetchGames(true);
        toast.success('¡Sesión de prueba local iniciada (135 juegos cargados)!');
        return true;
      }
      throw new Error('Backend dev-test-login no disponible');
    } catch {
      // Fallback for frontend-only local dev when backend server/DB is not running
      isLocalOfflineMode.value = true;
      token.value = 'dev-local-test-token';
      user.value = {
        id: 'local-test-user',
        name: 'TesterLocal',
        avatar_url: null,
        provider: 'local',
        onboarded: true,
      };
      gamesStore.populateLocalDevTestGames();
      toast.success('¡Modo Test Local activado (135 juegos en memoria)!');
      return true;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Registers a new user with standard email and password.
   * The JWT is stored by the server in an HttpOnly Cookie.
   */
  async function register(name: string, email: string, password: string): Promise<boolean> {
    const toast = useToastStore();
    loading.value = true;

    try {
      const res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al crear la cuenta.');
      }

      isLocalOfflineMode.value = false;
      user.value = data.user;
      if (data.token) {
        token.value = data.token;
        localStorage.setItem('nextg_auth_token', data.token);
      }

      toast.success('¡Cuenta creada exitosamente!');

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar.';
      toast.error(msg);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Submits favorite games during onboarding.
   */
  async function completeOnboarding(games: Game[]): Promise<boolean> {
    const toast = useToastStore();
    if (games.length < 3) {
      toast.info('Debes seleccionar al menos 3 videojuegos favoritos.');
      return false;
    }

    loading.value = true;
    try {
      const res = await fetch(getApiUrl('/api/auth/onboarding'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader.value,
        },
        body: JSON.stringify({
          games: games.map((g) => ({
            id: g.id,
            title: g.title,
            slug: g.slug ?? null,
            cover_url: g.cover_url ?? null,
            release_year: g.release_year ?? null,
            summary: g.summary ?? null,
            genres: g.genres ?? [],
            platforms: g.platforms ?? [],
            rating: g.rating ?? null,
            game_modes: g.game_modes ?? [],
            status: 'PLAYING',
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al guardar tus favoritos.');
      }

      if (user.value) {
        user.value.onboarded = true;
      }

      toast.success('¡Biblioteca inicial configurada con tus favoritos!');
      closeOnboardingModal();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al completar el onboarding.';
      toast.error(msg);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Triggers Google OAuth sign-in flow.
   */
  function loginWithGoogle() {
    window.location.href = getApiUrl('/api/auth/google');
  }

  /**
   * Triggers GitHub OAuth sign-in flow.
   */
  function loginWithGithub() {
    window.location.href = getApiUrl('/api/auth/github');
  }

  /**
   * Updates current user's nickname / display name.
   */
  async function updateNickname(newNickname: string): Promise<boolean> {
    const toast = useToastStore();
    const clean = newNickname.trim();
    if (clean.length < 2 || clean.length > 50) {
      toast.error('El nombre de usuario debe tener entre 2 y 50 caracteres.');
      return false;
    }

    loading.value = true;
    try {
      const res = await fetch(getApiUrl('/api/users/me'), {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader.value,
        },
        body: JSON.stringify({ name: clean }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al actualizar el nickname.');
      }

      if (user.value && data.user) {
        user.value.name = data.user.name;
      }

      toast.success('¡Nickname confirmado exitosamente!');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el nickname.';
      toast.error(msg);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Logs out the user, revokes active sessions on backend and clears the HttpOnly cookie.
   */
  async function logout(showToast = true) {
    const hadSession = Boolean(user.value) && !isLocalOfflineMode.value;
    const currentHeaders = { ...authHeader.value };
    token.value = null;
    user.value = null;
    isLocalOfflineMode.value = false;
    localStorage.removeItem('nextg_auth_token');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('nextg_auth_token');

    if (hadSession) {
      try {
        await fetch(getApiUrl('/api/auth/logout'), {
          method: 'POST',
          credentials: 'include',
          headers: currentHeaders,
        });
      } catch {
        // Ignore network errors during logout cleanup
      }
    }

    if (showToast) {
      const toast = useToastStore();
      toast.info('Has cerrado sesión correctamente.');
    }
  }

  return {
    user,
    token,
    isLocalOfflineMode,
    rememberedEmail,
    loading,
    isOnboardingModalOpen,
    isAuthenticated,
    isOnboarded,
    authHeader,
    openOnboardingModal,
    closeOnboardingModal,
    initAuth,
    fetchMe,
    login,
    loginWithLocalTestAccount,
    loginWithGoogle,
    loginWithGithub,
    register,
    completeOnboarding,
    updateNickname,
    logout,
  };
});

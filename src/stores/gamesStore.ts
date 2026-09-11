import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Game, UserGame, GameStatus } from '@/types/game';
import { GAME_STATUS_CONFIG } from '@/types/game';
import { useToastStore } from './toastStore';

export const useGamesStore = defineStore('games', () => {
  const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
  const API_BASE = (() => {
    if (!rawApiUrl) return '';
    try {
      if (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')) {
        const parsed = new URL(rawApiUrl);
        return parsed.origin;
      }
    } catch {
      // fallback to basic trailing slash removal
    }
    return rawApiUrl.replace(/\/$/, '');
  })();
  const games = ref<UserGame[]>([]);
  const activeTab = ref<GameStatus>('BACKLOG');
  const selectedGenre = ref<string | null>(null);
  const selectedPlatform = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isSearchModalOpen = ref(false);

  function openSearchModal() {
    isSearchModalOpen.value = true;
  }

  function closeSearchModal() {
    isSearchModalOpen.value = false;
  }

  // Getters by status
  const backlogGames = computed(() => games.value.filter((g) => g.status === 'BACKLOG'));
  const playingGames = computed(() => games.value.filter((g) => g.status === 'PLAYING'));
  const completedGames = computed(() => games.value.filter((g) => g.status === 'COMPLETED'));
  const wishlistGames = computed(() => games.value.filter((g) => g.status === 'WISHLIST'));

  // Getters for unique genres and platforms across user's games
  const availableGenres = computed(() => {
    const set = new Set<string>();
    games.value.forEach((g) => g.genres?.forEach((genre) => set.add(genre)));
    return Array.from(set).sort();
  });

  const availablePlatforms = computed(() => {
    const set = new Set<string>();
    games.value.forEach((g) => g.platforms?.forEach((p) => set.add(p)));
    return Array.from(set).sort();
  });

  // Filtered games for current active tab
  const filteredCurrentTabGames = computed(() => {
    return games.value.filter((g) => {
      const matchStatus = g.status === activeTab.value;
      const matchGenre = !selectedGenre.value || g.genres?.includes(selectedGenre.value);
      const matchPlatform = !selectedPlatform.value || g.platforms?.includes(selectedPlatform.value);
      return matchStatus && matchGenre && matchPlatform;
    });
  });

  // Actions
  async function fetchGames() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/games`);
      if (!res.ok) throw new Error(`Error al obtener juegos: ${res.status}`);
      const data = await res.json();
      games.value = data;
    } catch (err: any) {
      error.value = err.message || 'Error de conexión con el backend';
      console.error('[GamesStore] Fetch error:', err);
    } finally {
      loading.value = false;
    }
  }

  async function updateGameStatus(id: number, newStatus: GameStatus) {
    const toast = useToastStore();
    const game = games.value.find((g) => g.id === id);
    if (!game) return;

    const previousStatus = game.status;
    game.status = newStatus; // Optimistic update

    try {
      const res = await fetch(`${API_BASE}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...game, status: newStatus }),
      });
      if (!res.ok) throw new Error(`Error en el servidor: ${res.status}`);
      toast.info(`"${game.title}" movido a ${GAME_STATUS_CONFIG[newStatus].label}`);
    } catch (err) {
      game.status = previousStatus; // Rollback
      toast.error('No se pudo actualizar el estado del juego');
      console.error('[GamesStore] Update status error:', err);
      throw err;
    }
  }

  async function addGame(gameData: Partial<UserGame>, status: GameStatus = 'BACKLOG') {
    const toast = useToastStore();
    const optimistic: UserGame = {
      id: gameData.id!,
      title: gameData.title!,
      cover_url: gameData.cover_url || null,
      release_year: gameData.release_year || null,
      summary: gameData.summary || null,
      genres: gameData.genres || [],
      platforms: gameData.platforms || [],
      rating: gameData.rating || null,
      game_modes: gameData.game_modes || [],
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const existingIndex = games.value.findIndex((g) => g.id === optimistic.id);
    if (existingIndex >= 0) {
      games.value[existingIndex] = optimistic;
    } else {
      games.value.unshift(optimistic);
    }

    try {
      const res = await fetch(`${API_BASE}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...optimistic, status }),
      });
      if (!res.ok) throw new Error(`Error al guardar: ${res.status}`);
      toast.success(`"${optimistic.title}" añadido a ${GAME_STATUS_CONFIG[status].label}`);
    } catch (err) {
      toast.error(`Error al guardar "${optimistic.title}"`);
      await fetchGames(); // Refresh on error
      throw err;
    }
  }

  async function deleteGame(id: number) {
    const toast = useToastStore();
    const target = games.value.find((g) => g.id === id);
    const targetTitle = target ? `"${target.title}"` : 'Juego';
    const prev = [...games.value];
    games.value = games.value.filter((g) => g.id !== id);

    try {
      const res = await fetch(`${API_BASE}/api/games/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Error al eliminar: ${res.status}`);
      toast.info(`${targetTitle} eliminado de la biblioteca`);
    } catch (err) {
      games.value = prev; // Rollback
      toast.error(`Error al eliminar ${targetTitle}`);
      throw err;
    }
  }

  // In-memory RAM session search cache (prevents duplicate network calls within active session)
  const searchSessionCache = new Map<string, Game[]>();

  async function searchGames(query: string): Promise<Game[]> {
    const clean = query.trim();
    const normalizedKey = clean.toLowerCase();

    // Enforce 4-character minimum threshold
    if (!clean || clean.length < 4) {
      return [];
    }

    // Return instant memory cached results if available
    if (searchSessionCache.has(normalizedKey)) {
      return searchSessionCache.get(normalizedKey)!;
    }

    try {
      const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data: Game[] = await res.json();
        searchSessionCache.set(normalizedKey, data);
        return data;
      }
      return [];
    } catch (err) {
      console.error('[GamesStore] Search error:', err);
      return [];
    }
  }

  function clearSearchCache() {
    searchSessionCache.clear();
  }

  return {
    games,
    activeTab,
    selectedGenre,
    selectedPlatform,
    loading,
    error,
    isSearchModalOpen,
    openSearchModal,
    closeSearchModal,
    backlogGames,
    playingGames,
    completedGames,
    wishlistGames,
    availableGenres,
    availablePlatforms,
    filteredCurrentTabGames,
    fetchGames,
    updateGameStatus,
    addGame,
    deleteGame,
    searchGames,
    clearSearchCache,
  };
});

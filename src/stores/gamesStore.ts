import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Game, UserGame, GameStatus, DetailedGame, AnticipatedGame } from '@/types/game';
import { GAME_STATUS_CONFIG } from '@/types/game';
import { useToastStore } from './toastStore';
import { useAuthStore } from './authStore';
import { getApiUrl } from '@/config/api.config';

export const useGamesStore = defineStore('games', () => {
  const games = ref<UserGame[]>([]);
  const initialDefaultTab = (typeof localStorage !== 'undefined' ? (localStorage.getItem('nextg_pref_default_tab') as GameStatus | null) : null) || 'BACKLOG';
  const activeTab = ref<GameStatus>(initialDefaultTab);
  const selectedGenre = ref<string | null>(null);
  const selectedPlatform = ref<string | null>(null);
  const loading = ref(false);
  const loadingMore = ref(false);
  const hasMore = ref(true);
  const totalGames = ref(0);
  const error = ref<string | null>(null);
  const isAppReady = ref(false);
  const PAGE_SIZE = 200;

  function buildOfflineLocalTestGames(): UserGame[] {
    const covers = [
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.jpg',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co670h.jpg',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.jpg',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co1tmu.jpg',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co2lbd.jpg',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co6lxr.webp',
    ];
    const genrePool = [
      ['Role-playing (RPG)', 'Action'],
      ['Adventure', 'Indie', 'Platform'],
      ['Shooter', 'Sci-Fi'],
      ['Action', 'Hack and slash'],
      ['Strategy', 'Turn-based'],
    ];
    const platformPool = [
      ['PC', 'PlayStation 5', 'Xbox Series X|S'],
      ['PC', 'Nintendo Switch'],
      ['PlayStation 5', 'PC'],
      ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
    ];
    const sampleTitles = [
      'Elden Ring', 'Hollow Knight', 'The Witcher 3: Wild Hunt', 'Baldur\'s Gate 3',
      'Cyberpunk 2077', 'Red Dead Redemption 2', 'God of War Ragnarök', 'Hades',
      'Celeste', 'Sekiro: Shadows Die Twice', 'Persona 5 Royal', 'Bloodborne',
      'Dark Souls III', 'Chrono Trigger', 'Disco Elysium', 'Outer Wilds',
      'NieR: Automata', 'Final Fantasy VII Rebirth', 'Resident Evil 4', 'Alan Wake 2',
      'Silent Hill 2', 'Metaphor: ReFantazio', 'Astro Bot', 'Armored Core VI',
      'Lies of P', 'Ghost of Tsushima', 'Death Stranding', 'Control',
      'Divinity: Original Sin II', 'Stardew Valley', 'Terraria', 'Subnautica',
      'Dead Cells', 'Slay the Spire', 'Balatro', 'Return of the Obra Dinn',
      'Tunic', 'Sea of Stars', 'Octopath Traveler II', 'Xenoblade Chronicles 3',
    ];

    const list: UserGame[] = [];
    for (let i = 0; i < 135; i++) {
      const baseTitle = sampleTitles[i % sampleTitles.length];
      const suffix = i >= sampleTitles.length ? ` — Vol. ${Math.floor(i / sampleTitles.length) + 1}` : '';
      let status: GameStatus = 'BACKLOG';
      if (i < 12) status = 'COMPLETED';
      else if (i < 22) status = 'PLAYING';
      else if (i < 30) status = 'WISHLIST';
      else status = 'BACKLOG'; // 105 games in BACKLOG

      list.push({
        id: 800001 + i,
        title: `${baseTitle}${suffix}`,
        slug: `local-test-game-${800001 + i}`,
        cover_url: covers[i % covers.length] ?? null,
        release_year: 2014 + (i % 12),
        summary: 'Juego de prueba local para validar scroll infinito, filtros y drag & drop.',
        genres: genrePool[i % genrePool.length] ?? ['Action'],
        platforms: platformPool[i % platformPool.length] ?? ['PC'],
        rating: 85 + (i % 14),
        game_modes: ['Single player'],
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return list;
  }

  function isLocalEnvironment(): boolean {
    if (!import.meta.env.DEV) return false;
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  }

  function populateLocalDevTestGames() {
    if (!isLocalEnvironment()) return;
    games.value = buildOfflineLocalTestGames();
    totalGames.value = games.value.length;
    hasMore.value = false;
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
  async function fetchGames(reset: boolean = true) {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) {
      games.value = [];
      hasMore.value = false;
      return;
    }

    if (import.meta.env.DEV && authStore.isLocalOfflineMode) {
      if (games.value.length === 0) {
        populateLocalDevTestGames();
      }
      loading.value = false;
      loadingMore.value = false;
      hasMore.value = false;
      return;
    }

    if (reset) {
      loading.value = true;
      hasMore.value = true;
    } else {
      if (loadingMore.value || !hasMore.value) return;
      loadingMore.value = true;
    }

    error.value = null;
    const offset = reset ? 0 : games.value.length;

    try {
      const url = getApiUrl(`/api/games?limit=${PAGE_SIZE}&offset=${offset}`);
      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Error al obtener juegos: ${res.status}`);

      const data: UserGame[] = await res.json();
      const headerTotal = res.headers.get('x-total-count');
      const headerHasMore = res.headers.get('x-has-more');

      if (headerTotal) {
        totalGames.value = Number(headerTotal);
      }

      if (headerHasMore !== null) {
        hasMore.value = headerHasMore === 'true';
      } else {
        hasMore.value = data.length >= PAGE_SIZE;
      }

      if (reset) {
        games.value = data;
      } else {
        // Append new games avoiding duplicates
        const existingIds = new Set(games.value.map((g) => g.id));
        for (const item of data) {
          if (!existingIds.has(item.id)) {
            games.value.push(item);
            existingIds.add(item.id);
          }
        }
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error de conexión con el backend';
      console.error('[GamesStore] Fetch error:', err);
    } finally {
      loading.value = false;
      loadingMore.value = false;
    }
  }

  async function loadMoreGames() {
    await fetchGames(false);
  }

  // Debounce and abort controllers map for status updates per game ID
  const statusUpdateTimers = new Map<number, ReturnType<typeof setTimeout>>();
  const statusUpdateAbortControllers = new Map<number, AbortController>();
  const statusInitialState = new Map<number, GameStatus>();

  async function updateGameStatus(id: number, newStatus: GameStatus, debounceMs: number = 400) {
    const toast = useToastStore();
    const game = games.value.find((g) => g.id === id);
    if (!game) return;

    // Track the initial status before rapid changes if not already tracked
    if (!statusInitialState.has(id)) {
      statusInitialState.set(id, game.status);
    }

    // 1. Instant optimistic UI update so the user feels immediate reactivity
    game.status = newStatus;

    // 2. Clear previous pending timer for this game if user clicks rapidly
    if (statusUpdateTimers.has(id)) {
      clearTimeout(statusUpdateTimers.get(id));
      statusUpdateTimers.delete(id);
    }

    // 3. Abort any in-flight fetch request for this same game
    if (statusUpdateAbortControllers.has(id)) {
      statusUpdateAbortControllers.get(id)!.abort();
      statusUpdateAbortControllers.delete(id);
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(async () => {
        statusUpdateTimers.delete(id);

        const initialStatus = statusInitialState.get(id) ?? newStatus;
        statusInitialState.delete(id);

        // If after rapid clicks the status is back to what it originally was in DB, no need to call API
        if (game.status === initialStatus) {
          resolve();
          return;
        }

        const controller = new AbortController();
        statusUpdateAbortControllers.set(id, controller);

        try {
          const authStore = useAuthStore();
          if (import.meta.env.DEV && authStore.isLocalOfflineMode) {
            toast.info(`"${game.title}" movido a ${GAME_STATUS_CONFIG[game.status].label}`);
            resolve();
            return;
          }
          const res = await fetch(getApiUrl('/api/games'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...game, status: game.status }),
            signal: controller.signal,
          });

          if (!res.ok) throw new Error(`Error en el servidor: ${res.status}`);
          toast.info(`"${game.title}" movido a ${GAME_STATUS_CONFIG[game.status].label}`);
          resolve();
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') {
            // Cancelled because another newer action superseded this one
            resolve();
            return;
          }
          // Rollback to original status before the rapid changes
          game.status = initialStatus;
          toast.error('No se pudo actualizar el estado del juego');
          console.error('[GamesStore] Update status error:', err);
          reject(err);
        } finally {
          if (statusUpdateAbortControllers.get(id) === controller) {
            statusUpdateAbortControllers.delete(id);
          }
        }
      }, debounceMs);

      statusUpdateTimers.set(id, timer);
    });
  }

  async function addGame(gameData: Partial<UserGame>, status?: GameStatus) {
    const toast = useToastStore();
    const targetStatus = status || gameData.status || 'BACKLOG';
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
      slug: gameData.slug || null,
      status: targetStatus,
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
      const authStore = useAuthStore();
      if (import.meta.env.DEV && authStore.isLocalOfflineMode) {
        toast.success(`"${optimistic.title}" añadido a ${GAME_STATUS_CONFIG[targetStatus].label}`);
        return;
      }
      const res = await fetch(getApiUrl('/api/games'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...optimistic, status: targetStatus }),
      });
      if (!res.ok) throw new Error(`Error al guardar: ${res.status}`);
      toast.success(`"${optimistic.title}" añadido a ${GAME_STATUS_CONFIG[targetStatus].label}`);
    } catch (err) {
      toast.error(`Error al guardar "${optimistic.title}"`);
      await fetchGames(); // Refresh on error
      throw err;
    }
  }

  async function deleteGame(id: number) {
    const toast = useToastStore();
    const authStore = useAuthStore();
    const target = games.value.find((g) => g.id === id);
    const targetTitle = target ? `"${target.title}"` : 'Juego';
    const prev = [...games.value];

    // Clear any pending debounced status updates for this game
    if (statusUpdateTimers.has(id)) {
      clearTimeout(statusUpdateTimers.get(id));
      statusUpdateTimers.delete(id);
    }
    if (statusUpdateAbortControllers.has(id)) {
      statusUpdateAbortControllers.get(id)!.abort();
      statusUpdateAbortControllers.delete(id);
    }
    statusInitialState.delete(id);

    games.value = games.value.filter((g) => g.id !== id);

    try {
      if (import.meta.env.DEV && authStore.isLocalOfflineMode) {
        toast.info(`${targetTitle} eliminado de la biblioteca`);
        return;
      }
      const res = await fetch(getApiUrl(`/api/games/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      });
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

  // Top 100 / Popular Games Cache with sessionStorage & in-memory TTL
  const topGames = ref<Game[]>([]);
  const loadingTopGames = ref(false);
  const TOP_GAMES_CACHE_KEY = 'nextg_top_games_cache_v1';
  const TOP_GAMES_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  function loadTopGamesFromStorage(): Game[] | null {
    try {
      const raw = sessionStorage.getItem(TOP_GAMES_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.timestamp && Date.now() - parsed.timestamp < TOP_GAMES_CACHE_TTL_MS) {
        if (Array.isArray(parsed.data) && parsed.data.length > 0) {
          return parsed.data;
        }
      }
    } catch {
      // sessionStorage unreadable or disabled
    }
    return null;
  }

  function saveTopGamesToStorage(data: Game[]) {
    try {
      sessionStorage.setItem(
        TOP_GAMES_CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch {
      // Ignore quota exceeded
    }
  }

  async function fetchTopGames(limit: number = 100): Promise<Game[]> {
    // 1. In-memory Pinia cache hit
    if (topGames.value.length >= limit) {
      return topGames.value.slice(0, limit);
    }

    // 2. SessionStorage cache hit
    const storageCached = loadTopGamesFromStorage();
    if (storageCached && storageCached.length >= limit) {
      topGames.value = storageCached;
      return storageCached.slice(0, limit);
    }

    // 3. Network fetch (cached by backend and browser HTTP cache)
    loadingTopGames.value = true;
    try {
      const res = await fetch(getApiUrl(`/api/search/popular?limit=${limit}`));
      if (res.ok) {
        const data: Game[] = await res.json();
        topGames.value = data;
        saveTopGamesToStorage(data);
        return data;
      }
      return topGames.value;
    } catch (err) {
      console.error('[GamesStore] Error fetching top games:', err);
      return topGames.value;
    } finally {
      loadingTopGames.value = false;
    }
  }

  const anticipatedGames = ref<AnticipatedGame[]>([]);
  const loadingAnticipated = ref(false);

  async function fetchAnticipatedGames(limit: number = 6): Promise<AnticipatedGame[]> {
    if (anticipatedGames.value.length >= limit) {
      return anticipatedGames.value.slice(0, limit);
    }

    loadingAnticipated.value = true;
    try {
      const res = await fetch(getApiUrl(`/api/search/anticipated?limit=${limit}`));
      if (res.ok) {
        const data: AnticipatedGame[] = await res.json();
        anticipatedGames.value = data;
        return data;
      }
      return anticipatedGames.value;
    } catch (err) {
      console.error('[GamesStore] Error fetching anticipated games:', err);
      return anticipatedGames.value;
    } finally {
      loadingAnticipated.value = false;
    }
  }

  // In-memory exploration cache for instant filter switching (0ms latency)
  const exploreFilterCache = new Map<string, Game[]>();

  async function fetchExploreGames(
    limit: number = 36,
    filters?: { genre?: string | null; platform?: string | null }
  ): Promise<Game[]> {
    const cleanGenre = (filters?.genre || '').trim();
    const cleanPlatform = (filters?.platform || '').trim();
    const cacheKey = `${cleanPlatform}::${cleanGenre}::${limit}`;

    if (exploreFilterCache.has(cacheKey)) {
      return exploreFilterCache.get(cacheKey)!;
    }

    // If completely unfiltered and topGames is already loaded, reuse topGames
    if (!cleanGenre && !cleanPlatform && topGames.value.length >= limit) {
      return topGames.value.slice(0, limit);
    }

    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cleanGenre) params.append('genre', cleanGenre);
      if (cleanPlatform) params.append('platform', cleanPlatform);

      const res = await fetch(getApiUrl(`/api/search/popular?${params.toString()}`));
      if (res.ok) {
        const data: Game[] = await res.json();
        exploreFilterCache.set(cacheKey, data);
        if (!cleanGenre && !cleanPlatform && topGames.value.length === 0) {
          topGames.value = data;
        }
        return data;
      }
      return [];
    } catch (err) {
      console.error('[GamesStore] Error fetching explore games:', err);
      return [];
    }
  }

  async function searchGamesFiltered(
    query: string,
    filters?: { genre?: string | null; platform?: string | null },
    limit: number = 30
  ): Promise<Game[]> {
    const clean = query.trim();
    if (!clean) return [];

    const cleanGenre = (filters?.genre || '').trim();
    const cleanPlatform = (filters?.platform || '').trim();
    const cacheKey = `search::${clean.toLowerCase()}::${cleanPlatform}::${cleanGenre}::${limit}`;

    if (exploreFilterCache.has(cacheKey)) {
      return exploreFilterCache.get(cacheKey)!;
    }

    try {
      const params = new URLSearchParams({ q: clean, limit: String(limit) });
      if (cleanGenre) params.append('genre', cleanGenre);
      if (cleanPlatform) params.append('platform', cleanPlatform);

      const res = await fetch(getApiUrl(`/api/search?${params.toString()}`));
      if (res.ok) {
        const data: Game[] = await res.json();
        exploreFilterCache.set(cacheKey, data);
        return data;
      }
      return [];
    } catch (err) {
      console.error('[GamesStore] Search error:', err);
      return [];
    }
  }

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
      const res = await fetch(getApiUrl(`/api/search?q=${encodeURIComponent(clean)}`));
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

  // In-memory cache for rich game details (cached by both ID and slug)
  const gameDetailsCache = new Map<string, DetailedGame>();

  async function fetchGameDetails(idOrSlug: number | string): Promise<DetailedGame | null> {
    const key = String(idOrSlug).trim().toLowerCase();
    if (gameDetailsCache.has(key)) {
      return gameDetailsCache.get(key)!;
    }

    try {
      const res = await fetch(getApiUrl(`/api/search/details/${encodeURIComponent(key)}`));
      if (res.ok) {
        const data: DetailedGame = await res.json();
        gameDetailsCache.set(key, data);
        if (data.id) gameDetailsCache.set(String(data.id), data);
        if (data.slug) gameDetailsCache.set(data.slug.toLowerCase(), data);
        return data;
      }
      return null;
    } catch (err) {
      console.error('[GamesStore] Error fetching game details:', err);
      return null;
    }
  }

  return {
    games,
    activeTab,
    selectedGenre,
    selectedPlatform,
    loading,
    loadingMore,
    hasMore,
    totalGames,
    error,
    isAppReady,
    topGames,
    loadingTopGames,
    backlogGames,
    playingGames,
    completedGames,
    wishlistGames,
    availableGenres,
    availablePlatforms,
    filteredCurrentTabGames,
    fetchGames,
    loadMoreGames,
    fetchTopGames,
    fetchExploreGames,
    searchGamesFiltered,
    anticipatedGames,
    loadingAnticipated,
    fetchAnticipatedGames,
    fetchGameDetails,
    updateGameStatus,
    addGame,
    deleteGame,
    searchGames,
    clearSearchCache,
    populateLocalDevTestGames,
  };
});

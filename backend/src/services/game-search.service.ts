/**
 * Game Search Service with Persistent PostgreSQL Cache and Hybrid Local Resolution.
 * Orchestrates between caching layers and the active IGDB GameProvider.
 */

import { ENV } from '../config/env';
import { CONSTANTS } from '../config/constants';
import { getDatabase, type SqlClient } from '../db/index';
import { SEED_GAMES } from '../db/seed-data';
import { SearchCacheService } from './search-cache.service';
import type { GameProvider } from '../providers/game-provider.interface';
import { IgdbAdapter } from '../providers/igdb.adapter';
import type { NormalizedGame, DetailedGame, AnticipatedGame } from '../types/games';
import { logger } from '../utils/logger';

export class GameSearchService {
  /**
   * Instantiates the active external game data provider (IGDB via Twitch).
   */
  private static getActiveProvider(): GameProvider | null {
    if (ENV.TWITCH_CLIENT_ID && ENV.TWITCH_CLIENT_SECRET) {
      return new IgdbAdapter();
    }
    return null;
  }

  /**
   * Searches for video games using a multi-layer strategy:
   * 1. In-memory LRU Session Cache
   * 2. Persistent PostgreSQL `search_cache` table (30-60 day TTL)
   * 3. Hybrid Local Database Resolution (ILIKE query on `games` table)
   * 4. External API Provider (IGDB v4 via Twitch)
   * 5. Fallback to Local Curated Seed Database
   */
  public static async searchGames(
    query: string,
    limit: number = CONSTANTS.DEFAULT_SEARCH_LIMIT,
    filters?: { genre?: string; platform?: string },
    customSql?: SqlClient
  ): Promise<NormalizedGame[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return [];
    }

    const cleanGenre = (filters?.genre || '').trim().toLowerCase();
    const cleanPlatform = (filters?.platform || '').trim().toLowerCase();
    const cacheKey = filters?.genre || filters?.platform
      ? `__search__::${cleanQuery.toLowerCase()}::${cleanPlatform}::${cleanGenre}::${limit}`
      : cleanQuery;

    const sql = customSql || getDatabase();

    // 1. Check in-memory fast LRU cache
    const memoryCached = SearchCacheService.get(cacheKey, limit);
    if (memoryCached !== null) {
      return memoryCached;
    }

    // 2. Check persistent PostgreSQL search_cache table
    const dbCached = await SearchCacheService.getDb(cacheKey, sql);
    if (dbCached !== null) {
      // Store in memory LRU cache for subsequent hits
      SearchCacheService.set(cacheKey, limit, dbCached);
      return dbCached;
    }

    // 3. Hybrid Local Resolution: Check local games table before making external network calls (unfiltered only)
    if (!filters?.genre && !filters?.platform) {
      const localDbMatches = await this.searchLocalDb(cleanQuery, limit, sql);
      if (localDbMatches.length >= 5) {
        SearchCacheService.set(cacheKey, limit, localDbMatches);
        await SearchCacheService.setDb(cacheKey, localDbMatches, sql);
        return localDbMatches;
      }
    }

    // 4. Call External Provider (IGDB)
    const provider = this.getActiveProvider();
    if (provider) {
      try {
        const results = await (provider as any).searchGames(cleanQuery, limit, filters);
        // Store in caches (including empty array [] to save quota on missing titles)
        SearchCacheService.set(cacheKey, limit, results);
        await SearchCacheService.setDb(cacheKey, results, sql);
        return results;
      } catch (err) {
        logger.warn('IGDB Provider failed, falling back to local seed search', {
          error: err instanceof Error ? err.message : err,
          query: cleanQuery,
        });
      }
    } else {
      logger.warn('No active IGDB credentials configured, falling back to local seed catalog', {
        query: cleanQuery,
      });
    }

    // 5. Offline Seed + Local Catalog Fallback Mode
    let fallbackResults = await this.searchLocalSeedAndDb(cleanQuery, limit, sql);
    if (filters?.platform) {
      const p = filters.platform.toLowerCase();
      fallbackResults = fallbackResults.filter((g) => g.platforms?.some((plat) => plat.toLowerCase().includes(p)));
    }
    if (filters?.genre) {
      const g = filters.genre.toLowerCase();
      fallbackResults = fallbackResults.filter((game) => game.genres?.some((gen) => gen.toLowerCase().includes(g)));
    }

    SearchCacheService.set(cacheKey, limit, fallbackResults);
    await SearchCacheService.setDb(cacheKey, fallbackResults, sql);
    return fallbackResults;
  }

  /**
   * Searches the PostgreSQL games table using ILIKE pattern matching.
   */
  public static async searchLocalDb(
    query: string,
    limit: number = CONSTANTS.DEFAULT_SEARCH_LIMIT,
    customSql?: SqlClient
  ): Promise<NormalizedGame[]> {
    const sql = customSql || getDatabase();
    const term = `%${query.trim()}%`;

    try {
      const rows = await sql<
        {
          id: number | string;
          title: string;
          cover_url: string | null;
          release_year: number | null;
          summary: string | null;
          genres: unknown;
          platforms: unknown;
          rating: number | null;
          game_modes: unknown;
          slug: string | null;
        }[]
      >`
        SELECT id, title, cover_url, release_year, summary, genres, platforms, rating, game_modes, slug
        FROM games
        WHERE title ILIKE ${term} OR genres::text ILIKE ${term} OR platforms::text ILIKE ${term}
        LIMIT ${limit};
      `;

      const parseJsonArray = (val: unknown): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(String);
        try {
          const parsed = typeof val === 'string' ? JSON.parse(val) : val;
          return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
        } catch {
          return typeof val === 'string' ? val.split(',').map((s) => s.trim()) : [];
        }
      };

      return rows.map((r) => ({
        id: Number(r.id),
        title: r.title,
        cover_url: r.cover_url,
        release_year: r.release_year ? Number(r.release_year) : null,
        summary: r.summary,
        genres: parseJsonArray(r.genres),
        platforms: parseJsonArray(r.platforms),
        rating: r.rating !== null ? Number(r.rating) : null,
        game_modes: parseJsonArray(r.game_modes),
        slug: r.slug ?? null,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Retrieves popular / acclaimed games for discovery and onboarding.
   * Multi-layer cached:
   * 1. In-memory LRU Cache (0ms)
   * 2. Persistent PostgreSQL `search_cache` table (5ms)
   * 3. External IGDB API with fallback to offline curated list
   */
  public static async getPopularGames(
    limit: number = 24,
    filters?: { genre?: string; platform?: string },
    customSql?: SqlClient
  ): Promise<NormalizedGame[]> {
    const cleanGenre = (filters?.genre || '').trim().toLowerCase();
    const cleanPlatform = (filters?.platform || '').trim().toLowerCase();
    const cacheKey = `__popular__::${cleanPlatform}::${cleanGenre}::${limit}`;
    const sql = customSql || getDatabase();

    // 1. Check in-memory fast LRU cache
    const memoryCached = SearchCacheService.get(cacheKey, limit);
    if (memoryCached !== null) {
      return memoryCached;
    }

    // 2. Check persistent PostgreSQL search_cache table
    const dbCached = await SearchCacheService.getDb(cacheKey, sql);
    if (dbCached !== null) {
      SearchCacheService.set(cacheKey, limit, dbCached);
      return dbCached;
    }

    // 3. Fetch from active external provider (IGDB via Twitch)
    const provider = this.getActiveProvider();
    if (provider && 'getPopularGames' in provider) {
      try {
        const games = await (provider as any).getPopularGames(limit, filters);
        if (games && games.length > 0) {
          SearchCacheService.set(cacheKey, limit, games);
          await SearchCacheService.setDb(cacheKey, games, sql);
          return games;
        }
      } catch (err) {
        logger.warn('Failed to fetch popular games from IGDB, using curated catalog', {
          error: err instanceof Error ? err.message : err,
        });
      }
    }

    let fallback = SEED_GAMES.map((g) => ({
      ...g,
      slug: g.slug || g.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    }));

    if (filters?.platform) {
      const p = filters.platform.toLowerCase();
      fallback = fallback.filter((g) => g.platforms?.some((plat) => plat.toLowerCase().includes(p)));
    }
    if (filters?.genre) {
      const g = filters.genre.toLowerCase();
      fallback = fallback.filter((game) => game.genres?.some((gen) => gen.toLowerCase().includes(g)));
    }

    const sliced = fallback.slice(0, limit);
    SearchCacheService.set(cacheKey, limit, sliced);
    await SearchCacheService.setDb(cacheKey, sliced, sql);
    return sliced;
  }

  public static readonly ANTICIPATED_GAMES_FALLBACK: AnticipatedGame[] = [
    {
      id: 52189,
      title: 'Grand Theft Auto VI',
      slug: 'grand-theft-auto-vi',
      cover_url: '/banners/gta-vi-banner.jpg',
      banner_url: '/banners/gta-vi-banner.jpg',
      release_year: 2026,
      release_date: '2026-11-18',
      target_timestamp: new Date('2026-11-18T20:00:00Z').getTime(),
      summary: 'Regreso a Vice City y el estado de Leonida en la entrega más ambiciosa de la saga de Rockstar Games.',
      genres: ['Acción', 'Mundo Abierto', 'Aventura'],
      platforms: ['PlayStation 5', 'Xbox Series X|S'],
      rating: 99.0,
      game_modes: ['Single player', 'Multiplayer'],
      hypes: 4850,
    },
    {
      id: 343335,
      title: 'Silver Palace',
      slug: 'silver-palace',
      cover_url: '/banners/silver-palace-banner.jpg',
      banner_url: '/banners/silver-palace-banner.jpg',
      release_year: 2026,
      release_date: '2026-12-13',
      target_timestamp: new Date('2026-12-13T20:00:00Z').getTime(),
      summary: 'Una aventura visual y fantástica que explora los misterios de una dinastía olvidada.',
      genres: ['Aventura', 'Fantasía', 'RPG'],
      platforms: ['PC', 'PlayStation 5'],
      rating: 94.0,
      game_modes: ['Single player'],
      hypes: 3120,
    },
    {
      id: 325599,
      title: 'Stranger Than Heaven',
      slug: 'stranger-than-heaven',
      cover_url: '/banners/stranger-than-heaven-banner.jpg',
      banner_url: '/banners/stranger-than-heaven-banner.jpg',
      release_year: 2027,
      release_date: '2027-01-14',
      target_timestamp: new Date('2027-01-14T20:00:00Z').getTime(),
      summary: 'Misterio detectivesco neo-noir con estética clásica y giros psicológicos inesperados.',
      genres: ['Misterio', 'Aventura', 'Narrativa'],
      platforms: ['PC', 'PlayStation 5', 'Xbox Series X|S'],
      rating: 93.0,
      game_modes: ['Single player'],
      hypes: 2450,
    },
    {
      id: 381235,
      title: 'Tomb Raider: Legacy of Atlantis',
      slug: 'tomb-raider-legacy-of-atlantis',
      cover_url: '/banners/tomb-raider-banner.jpg',
      banner_url: '/banners/tomb-raider-banner.jpg',
      release_year: 2027,
      release_date: '2027-02-11',
      target_timestamp: new Date('2027-02-11T20:00:00Z').getTime(),
      summary: 'Lara Croft se adentra en las ruinas sumergidas del mito de la Atlántida.',
      genres: ['Acción', 'Aventura', 'Puzles'],
      platforms: ['PC', 'PlayStation 5', 'Xbox Series X|S'],
      rating: 95.0,
      game_modes: ['Single player'],
      hypes: 3890,
    },
  ];

  /**
   * Fetches the most anticipated upcoming games with countdown dates and hypes.
   * Prioritizes the curated showcase games matching the landing page design.
   */
  public static async getAnticipatedGames(
    limit: number = 4,
    customSql?: SqlClient
  ): Promise<AnticipatedGame[]> {
    const cacheKey = `__anticipated__::${limit}`;
    const sql = customSql || getDatabase();

    // 1. Check in-memory fast LRU cache
    const memoryCached = SearchCacheService.get(cacheKey, limit);
    if (memoryCached !== null) {
      return memoryCached as AnticipatedGame[];
    }

    // 2. Check persistent PostgreSQL search_cache table
    const dbCached = await SearchCacheService.getDb(cacheKey, sql);
    if (dbCached !== null) {
      SearchCacheService.set(cacheKey, limit, dbCached);
      return dbCached as AnticipatedGame[];
    }

    // Curated showcase list matching user landing design
    const curated = this.ANTICIPATED_GAMES_FALLBACK.slice(0, limit);
    SearchCacheService.set(cacheKey, limit, curated);
    await SearchCacheService.setDb(cacheKey, curated, sql);
    return curated;
  }

  // Canonical mappings for legacy seed IDs (from previous RAWG integration)
  public static readonly LEGACY_ID_REDIRECTS: Record<number, string> = {
    9767: 'hollow-knight',
    802: 'hollow-knight',
    5001: 'hollow-knight',
    125174: 'baldurs-gate-iii',
    27789: 'celeste',
    118465: 'persona-5-royal',
    103298: 'sekiro-shadows-die-twice',
    205626: 'resident-evil-4--2',
    228495: 'hades-ii',
    151665: 'nier-replicant-ver-dot-1-22474487139-dot-dot-dot',
    76882: 'ghost-of-tsushima',
    26569: 'ori-and-the-will-of-the-wisps',
    9789: 'outer-wilds',
    75235: 'slay-the-spire',
    25902: 'dead-cells',
    131920: 'sea-of-stars',
    221774: 'dave-the-diver',
    284058: 'balatro',
    180907: 'alan-wake-ii',
    9927: 'resident-evil-2--4',
    141525: 'mass-effect-legendary-edition',
    223594: 'silent-hill-2--1',
    205858: 'dragons-dogma-ii',
    138546: 'black-myth-wukong',
    204363: 'star-wars-jedi-survivor',
    228498: 'armored-core-vi-fires-of-rubicon',
    151596: 'lies-of-p',
    119277: 'the-legend-of-zelda-tears-of-the-kingdom',
    101: 'the-legend-of-zelda-tears-of-the-kingdom',
    1: 'elden-ring',
    2: 'super-mario-odyssey',
    801: 'chrono-trigger',
    803: 'super-mario-odyssey',
    1001: 'the-legend-of-zelda-ocarina-of-time',
    1002: 'super-mario-64',
    1003: 'metroid-prime',
  };

  // Common URL slug aliases / variations
  public static readonly SLUG_ALIASES: Record<string, string> = {
    'baldurs-gate-3': 'baldurs-gate-iii',
    'baldur-s-gate-3': 'baldurs-gate-iii',
    'baldurs-gate': 'baldurs-gate-iii',
    'hollow-knight-1': 'hollow-knight',
    'alan-wake-2': 'alan-wake-ii',
    'dragons-dogma-2': 'dragons-dogma-ii',
    'dragon-s-dogma-2': 'dragons-dogma-ii',
    'resident-evil-4': 'resident-evil-4--2',
    'zelda-tears-of-the-kingdom': 'the-legend-of-zelda-tears-of-the-kingdom',
    'zelda-breath-of-the-wild': 'the-legend-of-zelda-breath-of-the-wild',
  };

  /**
   * Retrieves full rich details for a single game by ID or URL-friendly slug.
   * Multi-layer cached:
   * 1. In-memory LRU Cache (0ms)
   * 2. Persistent PostgreSQL `search_cache` table (5ms)
   * 3. External IGDB API with fallback to offline curated list
   */
  public static async getGameDetails(
    idOrSlug: number | string,
    customSql?: SqlClient
  ): Promise<DetailedGame | null> {
    const rawStr = String(idOrSlug).trim();
    let isNumeric = /^\d+$/.test(rawStr);
    let numericId = isNumeric ? Number(rawStr) : null;
    let cleanSlug = !isNumeric ? rawStr.toLowerCase() : null;

    // Check if numericId is a known legacy ID that should be redirected to its canonical slug
    if (numericId !== null && this.LEGACY_ID_REDIRECTS[numericId]) {
      cleanSlug = this.LEGACY_ID_REDIRECTS[numericId];
      isNumeric = false;
      numericId = null;
    }

    // Check slug aliases
    if (cleanSlug && this.SLUG_ALIASES[cleanSlug]) {
      cleanSlug = this.SLUG_ALIASES[cleanSlug];
    }

    const cacheKey = isNumeric ? `__game_detail__::${numericId}` : `__game_detail_slug__::${cleanSlug}`;
    const sql = customSql || getDatabase();

    // 1. In-memory LRU cache
    const memoryCached = SearchCacheService.get(cacheKey, 1);
    if (memoryCached && memoryCached.length > 0) {
      return memoryCached[0] as DetailedGame;
    }

    // 2. PostgreSQL search_cache table
    const dbCached = await SearchCacheService.getDb(cacheKey, sql);
    if (dbCached && dbCached.length > 0) {
      SearchCacheService.set(cacheKey, 1, dbCached);
      return dbCached[0] as DetailedGame;
    }

    // Helper to store in cache under both ID and slug
    const cacheResult = async (game: DetailedGame) => {
      SearchCacheService.set(cacheKey, 1, [game]);
      await SearchCacheService.setDb(cacheKey, [game], sql);
      if (game.id) {
        const idKey = `__game_detail__::${game.id}`;
        SearchCacheService.set(idKey, 1, [game]);
        await SearchCacheService.setDb(idKey, [game], sql);
      }
      if (game.slug) {
        const slugKey = `__game_detail_slug__::${game.slug.toLowerCase()}`;
        SearchCacheService.set(slugKey, 1, [game]);
        await SearchCacheService.setDb(slugKey, [game], sql);
      }
    };

    // 3. IGDB API
    const provider = this.getActiveProvider();
    if (provider && ('getGameById' in provider || 'getGameBySlug' in provider)) {
      try {
        const adapter = provider as IgdbAdapter;
        let detailedGame: DetailedGame | null = null;
        if (isNumeric && numericId !== null && 'getGameById' in adapter) {
          detailedGame = await adapter.getGameById(numericId);
        } else if (cleanSlug && 'getGameBySlug' in adapter) {
          detailedGame = await adapter.getGameBySlug(cleanSlug);
          // If slug lookup failed, try search on IGDB
          if (!detailedGame && 'searchGames' in adapter) {
            const queryName = cleanSlug.replace(/[-_]+/g, ' ');
            const searchMatches = await adapter.searchGames(queryName, 3);
            if (searchMatches && searchMatches.length > 0) {
              const bestMatch = searchMatches[0];
              detailedGame = await adapter.getGameById(bestMatch.id);
            }
          }
        }

        if (detailedGame) {
          await cacheResult(detailedGame);
          return detailedGame;
        }
      } catch (err) {
        logger.warn('[GameSearchService] Error fetching game details from IGDB', {
          idOrSlug,
          error: err instanceof Error ? err.message : err,
        });
      }
    }

    // 4. Fallback: Search in ANTICIPATED_GAMES_FALLBACK
    const anticipated = this.ANTICIPATED_GAMES_FALLBACK.find(
      (g) => (numericId !== null && g.id === numericId) || (cleanSlug !== null && g.slug === cleanSlug)
    );
    if (anticipated) {
      const detailed: DetailedGame = {
        id: anticipated.id,
        title: anticipated.title,
        slug: anticipated.slug || null,
        cover_url: anticipated.banner_url || anticipated.cover_url,
        release_year: anticipated.release_year,
        first_release_date: anticipated.target_timestamp
          ? Math.floor(anticipated.target_timestamp / 1000)
          : (anticipated.first_release_date || null),
        summary: anticipated.summary,
        genres: anticipated.genres,
        platforms: anticipated.platforms,
        rating: anticipated.rating,
        game_modes: anticipated.game_modes,
      };
      await cacheResult(detailed);
      return detailed;
    }

    // 5. Fallback: Search in local SEED_GAMES
    const seedGame = SEED_GAMES.find(
      (g) => (numericId !== null && g.id === numericId) || (cleanSlug !== null && g.slug === cleanSlug)
    );
    if (seedGame) {
      const detailed: DetailedGame = {
        id: seedGame.id,
        title: seedGame.title,
        slug: seedGame.slug || null,
        cover_url: seedGame.cover_url,
        release_year: seedGame.release_year,
        first_release_date: (seedGame as any).first_release_date || null,
        summary: seedGame.summary,
        genres: seedGame.genres,
        platforms: seedGame.platforms,
        rating: seedGame.rating,
        game_modes: seedGame.game_modes,
      };
      await cacheResult(detailed);
      return detailed;
    }

    // 6. Also check games table in DB
    try {
      let dbRow: NormalizedGame | undefined;
      if (isNumeric && numericId !== null) {
        const [row] = await sql<[NormalizedGame?]>`
          SELECT id, title, slug, cover_url, release_year, summary, genres, platforms, rating, game_modes
          FROM games
          WHERE id = ${numericId};
        `;
        dbRow = row;
      } else if (cleanSlug) {
        const [row] = await sql<[NormalizedGame?]>`
          SELECT id, title, slug, cover_url, release_year, summary, genres, platforms, rating, game_modes
          FROM games
          WHERE slug = ${cleanSlug};
        `;
        dbRow = row;
      }

      if (dbRow) {
        const detailed = dbRow as DetailedGame;
        await cacheResult(detailed);
        return detailed;
      }
    } catch {}

    return null;
  }

  /**
   * Searches both the curated 50-game starter catalog and local user database.
   */
  public static async searchLocalSeedAndDb(
    query: string,
    limit: number = CONSTANTS.DEFAULT_SEARCH_LIMIT,
    customSql?: SqlClient
  ): Promise<NormalizedGame[]> {
    const term = query.toLowerCase();

    // Search seed array
    const seedMatches = SEED_GAMES.filter((g) => {
      const titleMatch = g.title.toLowerCase().includes(term);
      const genreMatch = g.genres.some((genre) => genre.toLowerCase().includes(term));
      const platformMatch = g.platforms.some((platform) => platform.toLowerCase().includes(term));
      return titleMatch || genreMatch || platformMatch;
    }).map((g) => ({
      id: g.id,
      title: g.title,
      cover_url: g.cover_url,
      release_year: g.release_year,
      summary: g.summary,
      genres: g.genres,
      platforms: g.platforms,
      rating: g.rating,
      game_modes: g.game_modes,
      slug: g.slug ?? null,
    }));

    // Merge with any unique games from local database
    const dbMatches = await this.searchLocalDb(query, limit, customSql);
    const seenIds = new Set<number>();
    const combined: NormalizedGame[] = [];

    for (const g of [...dbMatches, ...seedMatches]) {
      if (!seenIds.has(g.id)) {
        seenIds.add(g.id);
        combined.push(g);
      }
      if (combined.length >= limit) break;
    }

    return combined;
  }
}

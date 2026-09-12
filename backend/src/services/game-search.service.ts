/**
 * Game Search Service with Persistent PostgreSQL Cache and Hybrid Local Resolution.
 * Orchestrates between caching layers and the active GameProvider.
 */

import { ENV } from '../config/env';
import { CONSTANTS } from '../config/constants';
import { getDatabase, type SqlClient } from '../db/index';
import { SEED_GAMES } from '../db/seed-data';
import { SearchCacheService } from './search-cache.service';
import { GameProvider } from '../providers/game-provider.interface';
import { RawgAdapter } from '../providers/rawg.adapter';
import { IgdbAdapter } from '../providers/igdb.adapter';
import { NormalizedGame } from '../types/games';
import { logger } from '../utils/logger';

export class GameSearchService {
  private static getActiveProvider(): GameProvider | null {
    // Priority to IGDB if configured, fallback to RAWG
    if (ENV.TWITCH_CLIENT_ID && ENV.TWITCH_CLIENT_SECRET) {
      return new IgdbAdapter();
    }
    if (ENV.RAWG_API_KEY) {
      return new RawgAdapter();
    }
    return null;
  }

  /**
   * Searches for video games using a multi-layer strategy:
   * 1. In-memory LRU Session Cache
   * 2. Persistent PostgreSQL `search_cache` table (30-60 day TTL)
   * 3. Hybrid Local Database Resolution (ILIKE query on `games` table)
   * 4. External API Provider (IGDB or RAWG)
   * 5. Fallback to Local Curated Seed Database
   */
  public static async searchGames(
    query: string,
    limit: number = CONSTANTS.DEFAULT_SEARCH_LIMIT,
    customSql?: SqlClient
  ): Promise<NormalizedGame[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return [];
    }

    const sql = customSql || getDatabase();

    // 1. Check in-memory fast LRU cache
    const memoryCached = SearchCacheService.get(cleanQuery, limit);
    if (memoryCached !== null) {
      return memoryCached;
    }

    // 2. Check persistent PostgreSQL search_cache table
    const dbCached = await SearchCacheService.getDb(cleanQuery, sql);
    if (dbCached !== null) {
      // Store in memory LRU cache for subsequent hits
      SearchCacheService.set(cleanQuery, limit, dbCached);
      return dbCached;
    }

    // 3. Hybrid Local Resolution: Check local games table before making external network calls
    const localDbMatches = await this.searchLocalDb(cleanQuery, limit, sql);
    if (localDbMatches.length >= 5) {
      SearchCacheService.set(cleanQuery, limit, localDbMatches);
      await SearchCacheService.setDb(cleanQuery, localDbMatches, sql);
      return localDbMatches;
    }

    // 4. Call External Provider
    const provider = this.getActiveProvider();
    if (provider) {
      try {
        const results = await provider.searchGames(cleanQuery, limit);
        // Store in caches
        SearchCacheService.set(cleanQuery, limit, results);
        await SearchCacheService.setDb(cleanQuery, results, sql);
        return results;
      } catch (err) {
        logger.warn('Provider failed, falling back to local search', { error: err instanceof Error ? err.message : err, query: cleanQuery });
      }
    } else {
      logger.warn('No active API provider found, falling back to local search', { query: cleanQuery });
    }

    // 5. Offline Seed + Local Catalog Fallback Mode
    const fallbackResults = await this.searchLocalSeedAndDb(cleanQuery, limit, sql);
    SearchCacheService.set(cleanQuery, limit, fallbackResults);
    await SearchCacheService.setDb(cleanQuery, fallbackResults, sql);
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
          genres: any;
          platforms: any;
          rating: number | null;
          game_modes: any;
          slug: string | null;
        }[]
      >`
        SELECT id, title, cover_url, release_year, summary, genres, platforms, rating, game_modes, slug
        FROM games
        WHERE title ILIKE ${term} OR genres::text ILIKE ${term} OR platforms::text ILIKE ${term}
        LIMIT ${limit};
      `;

      const parseJsonArray = (val: any): string[] => {
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

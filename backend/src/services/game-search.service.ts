/**
 * Game Search Service with Persistent SQLite Cache and Hybrid Local Resolution.
 * Orchestrates between caching layers and the active GameProvider.
 */

import { Database } from 'bun:sqlite';
import { ENV } from '../config/env';
import { CONSTANTS } from '../config/constants';
import { getDatabase } from '../db/index';
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
   * 2. Persistent SQLite `search_cache` table (30-60 day TTL)
   * 3. Hybrid Local Database Resolution (LIKE query on `games` table)
   * 4. External API Provider (IGDB or RAWG)
   * 5. Fallback to Local Curated Seed Database
   */
  public static async searchGames(
    query: string,
    limit: number = CONSTANTS.DEFAULT_SEARCH_LIMIT,
    customDb?: Database
  ): Promise<NormalizedGame[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return [];
    }

    const db = customDb || getDatabase();

    // 1. Check in-memory fast LRU cache
    const memoryCached = SearchCacheService.get(cleanQuery, limit);
    if (memoryCached !== null) {
      return memoryCached;
    }

    // 2. Check persistent SQLite search_cache table
    const sqliteCached = SearchCacheService.getSqlite(cleanQuery, db);
    if (sqliteCached !== null) {
      // Store in memory LRU cache for subsequent hits
      SearchCacheService.set(cleanQuery, limit, sqliteCached);
      return sqliteCached;
    }

    // 3. Hybrid Local Resolution: Check local games table before making external network calls
    const localDbMatches = this.searchLocalDb(cleanQuery, limit, db);
    if (localDbMatches.length >= 5) {
      SearchCacheService.set(cleanQuery, limit, localDbMatches);
      SearchCacheService.setSqlite(cleanQuery, localDbMatches, db);
      return localDbMatches;
    }

    // 4. Call External Provider
    const provider = this.getActiveProvider();
    if (provider) {
      try {
        const results = await provider.searchGames(cleanQuery, limit);
        // Store in caches
        SearchCacheService.set(cleanQuery, limit, results);
        SearchCacheService.setSqlite(cleanQuery, results, db);
        return results;
      } catch (err) {
        logger.warn('Provider failed, falling back to local search', { error: err instanceof Error ? err.message : err, query: cleanQuery });
      }
    } else {
      logger.warn('No active API provider found, falling back to local search', { query: cleanQuery });
    }

    // 5. Offline Seed + Local Catalog Fallback Mode
    const fallbackResults = this.searchLocalSeedAndDb(cleanQuery, limit, db);
    SearchCacheService.set(cleanQuery, limit, fallbackResults);
    SearchCacheService.setSqlite(cleanQuery, fallbackResults, db);
    return fallbackResults;
  }

  /**
   * Searches the SQLite games table using LIKE pattern matching.
   */
  public static searchLocalDb(
    query: string,
    limit: number = CONSTANTS.DEFAULT_SEARCH_LIMIT,
    customDb?: Database
  ): NormalizedGame[] {
    const db = customDb || getDatabase();
    const term = `%${query.trim()}%`;

    try {
      const rows = db
        .query<
          {
            id: number;
            title: string;
            cover_url: string | null;
            release_year: number | null;
            summary: string | null;
            genres: string | null;
            platforms: string | null;
            rating: number | null;
            game_modes: string | null;
          },
          [string, string, string, number]
        >(
          `
          SELECT id, title, cover_url, release_year, summary, genres, platforms, rating, game_modes
          FROM games
          WHERE title LIKE ? OR genres LIKE ? OR platforms LIKE ?
          LIMIT ?;
        `
        )
        .all(term, term, term, limit);

      const parseJsonArray = (val: string | null): string[] => {
        if (!val) return [];
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [String(parsed)];
        } catch {
          return val.split(',').map((s) => s.trim());
        }
      };

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        cover_url: r.cover_url,
        release_year: r.release_year,
        summary: r.summary,
        genres: parseJsonArray(r.genres),
        platforms: parseJsonArray(r.platforms),
        rating: r.rating,
        game_modes: parseJsonArray(r.game_modes),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Searches both the curated 50-game starter catalog and local user database.
   */
  public static searchLocalSeedAndDb(
    query: string,
    limit: number = CONSTANTS.DEFAULT_SEARCH_LIMIT,
    customDb?: Database
  ): NormalizedGame[] {
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
    }));

    // Merge with any unique games from local database
    const dbMatches = this.searchLocalDb(query, limit, customDb);
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

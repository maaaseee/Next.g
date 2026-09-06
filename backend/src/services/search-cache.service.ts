/**
 * Hybrid In-Memory & Persistent SQLite Search Cache Service.
 * 
 * Protects external RAWG/IGDB API quotas and drastically reduces search latency by:
 * 1. Fast in-memory LRU cache with short-term TTL
 * 2. Long-term persistent SQLite search_cache table with 30-60 day TTL
 * 3. Storing empty results `[]` so non-existent game queries do not re-drain quotas
 */

import { Database } from 'bun:sqlite';
import { getDatabase } from '../db/index';
import { CONSTANTS } from '../config/constants';
import type { NormalizedGame } from '../types/games';

interface CacheEntry {
  data: NormalizedGame[];
  expiresAt: number;
}

export class SearchCacheService {
  private static cache = new Map<string, CacheEntry>();
  private static readonly MEMORY_TTL_MS = 15 * 60 * 1000; // 15 minutes in-memory
  private static readonly MAX_ENTRIES = 300;

  /**
   * Generates a normalized cache key.
   */
  public static makeKey(query: string, limit?: number): string {
    const clean = query.trim().toLowerCase();
    return limit ? `${clean}::${limit}` : clean;
  }

  /**
   * Retrieves cached search results from in-memory LRU cache.
   */
  public static get(query: string, limit: number = 10): NormalizedGame[] | null {
    const key = this.makeKey(query, limit);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Stores search results in the in-memory cache.
   */
  public static set(query: string, limit: number, data: NormalizedGame[]): void {
    const key = this.makeKey(query, limit);

    // Enforce LRU size limit
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.MEMORY_TTL_MS,
    });
  }

  /**
   * Retrieves cached search results from the persistent SQLite `search_cache` table.
   * Enforces a 45-day TTL (within the 30-60 day safe window for game data).
   */
  public static getSqlite(query: string, customDb?: Database): NormalizedGame[] | null {
    const db = customDb || getDatabase();
    const queryText = query.trim().toLowerCase();

    try {
      const row = db
        .query<{ json_response: string; timestamp: string }, [string]>(
          'SELECT json_response, timestamp FROM search_cache WHERE query_text = ?;'
        )
        .get(queryText);

      if (!row) return null;

      // Validate TTL (45 days)
      const recordTime = new Date(row.timestamp).getTime();
      const now = Date.now();

      if (!isNaN(recordTime) && now - recordTime > CONSTANTS.SEARCH_CACHE_TTL_MS) {
        // Expired - clean up row
        db.run('DELETE FROM search_cache WHERE query_text = ?;', [queryText]);
        return null;
      }

      const parsed = JSON.parse(row.json_response);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[SearchCache] Error reading from SQLite search_cache:', err);
      return null;
    }
  }

  /**
   * Stores search results in the persistent SQLite `search_cache` table.
   * Explicitly caches empty results `[]` to prevent quota exhaustion on non-existent titles.
   */
  public static setSqlite(query: string, data: NormalizedGame[], customDb?: Database): void {
    const db = customDb || getDatabase();
    const queryText = query.trim().toLowerCase();

    try {
      const jsonResponse = JSON.stringify(data);
      db.run(
        `
        INSERT INTO search_cache (query_text, json_response, timestamp)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(query_text) DO UPDATE SET
          json_response = excluded.json_response,
          timestamp = CURRENT_TIMESTAMP;
      `,
        [queryText, jsonResponse]
      );
    } catch (err) {
      console.warn('[SearchCache] Error saving to SQLite search_cache:', err);
    }
  }

  /**
   * Clears the entire search cache in memory and optionally in SQLite.
   */
  public static clear(clearSqlite: boolean = false, customDb?: Database): void {
    this.cache.clear();
    if (clearSqlite) {
      const db = customDb || getDatabase();
      try {
        db.run('DELETE FROM search_cache;');
      } catch {}
    }
  }

  /**
   * Returns in-memory cache size.
   */
  public static size(): number {
    return this.cache.size;
  }
}

/**
 * Hybrid In-Memory & Persistent SQLite Search Cache Service.
 * 
 * Protects external RAWG/IGDB API quotas and drastically reduces search latency by:
 * 1. Fast in-memory LRU cache with short-term TTL
 * 2. Long-term persistent SQLite search_cache table with 30-60 day TTL
 * 3. Storing empty results `[]` so non-existent game queries do not re-drain quotas
 */

import { getDatabase, type SqlClient } from '../db/index';
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
   * Retrieves cached search results from the persistent PostgreSQL `search_cache` table.
   * Enforces a 45-day TTL.
   */
  public static async getDb(query: string, customSql?: SqlClient): Promise<NormalizedGame[] | null> {
    const sql = customSql || getDatabase();
    const queryText = query.trim().toLowerCase();

    try {
      const [row] = await sql<[{ json_response: any; timestamp: Date | string }?]>`
        SELECT json_response, timestamp 
        FROM search_cache 
        WHERE query_text = ${queryText};
      `;

      if (!row) return null;

      // Validate TTL (45 days)
      const recordTime = new Date(row.timestamp).getTime();
      const now = Date.now();

      if (!isNaN(recordTime) && now - recordTime > CONSTANTS.SEARCH_CACHE_TTL_MS) {
        // Expired - clean up row
        await sql`DELETE FROM search_cache WHERE query_text = ${queryText};`;
        return null;
      }

      const parsed = typeof row.json_response === 'string' ? JSON.parse(row.json_response) : row.json_response;
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[SearchCache] Error reading from PostgreSQL search_cache:', err);
      return null;
    }
  }

  /**
   * Stores search results in the persistent PostgreSQL `search_cache` table.
   * Explicitly caches empty results `[]` to prevent quota exhaustion on non-existent titles.
   */
  public static async setDb(query: string, data: NormalizedGame[], customSql?: SqlClient): Promise<void> {
    const sql = customSql || getDatabase();
    const queryText = query.trim().toLowerCase();

    try {
      const jsonResponse = JSON.stringify(data);
      await sql`
        INSERT INTO search_cache (query_text, json_response, timestamp)
        VALUES (${queryText}, ${jsonResponse}::jsonb, CURRENT_TIMESTAMP)
        ON CONFLICT(query_text) DO UPDATE SET
          json_response = EXCLUDED.json_response,
          timestamp = CURRENT_TIMESTAMP;
      `;
    } catch (err) {
      console.warn('[SearchCache] Error saving to PostgreSQL search_cache:', err);
    }
  }

  /**
   * Clears the search cache in memory and optionally in PostgreSQL.
   */
  public static async clear(clearDb: boolean = false, customSql?: SqlClient): Promise<void> {
    this.cache.clear();
    if (clearDb) {
      const sql = customSql || getDatabase();
      try {
        await sql`DELETE FROM search_cache;`;
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

/**
 * Unit Tests for GameSearchService, Adapters, Persistent PostgreSQL Cache, and Empty Results Caching.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { GameSearchService } from '../src/services/game-search.service';
import { RawgAdapter, type RawgRawGame } from '../src/providers/rawg.adapter';
import { SearchCacheService } from '../src/services/search-cache.service';
import { initDatabase, type SqlClient } from '../src/db/index';
import { ENV } from '../src/config/env';

describe('GameSearchService and SearchCache', () => {
  let testSql: SqlClient;

  beforeEach(async () => {
    try {
      testSql = await initDatabase();
      await SearchCacheService.clear(true, testSql);
    } catch {
      await SearchCacheService.clear(false);
    }
  });

  it('should normalize RAWG API raw game payload correctly via RawgAdapter', () => {
    const rawGames: RawgRawGame[] = [
      {
        id: 3498,
        name: 'Grand Theft Auto V',
        background_image: 'https://media.rawg.io/media/games/20a/20aa03a10e7c5236ba150d03c973fc3b.jpg',
        released: '2013-09-17',
        rating: 4.47,
        genres: [
          { id: 4, name: 'Action' },
          { id: 3, name: 'Adventure' },
        ],
        platforms: [
          { platform: { id: 4, name: 'PC' } },
          { platform: { id: 187, name: 'PlayStation 5' } },
        ],
        tags: [
          { id: 31, name: 'Singleplayer', slug: 'singleplayer' },
          { id: 7, name: 'Multiplayer', slug: 'multiplayer' },
        ],
      },
    ];

    const adapter = new RawgAdapter();
    // Use type assertion to access private normalizeGames for testing
    const normalized = (adapter as any).normalizeGames(rawGames);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual({
      id: 3498,
      title: 'Grand Theft Auto V',
      cover_url: 'https://media.rawg.io/media/games/20a/20aa03a10e7c5236ba150d03c973fc3b.jpg',
      release_year: 2013,
      summary: null,
      genres: ['Action', 'Adventure'],
      platforms: ['PC', 'PlayStation 5'],
      rating: 4.5,
      game_modes: ['Singleplayer', 'Multiplayer'],
    });
  });

  it('should persist search results in PostgreSQL search_cache table', async () => {
    if (!testSql) return;

    // 1. Initially cache is empty
    expect(await SearchCacheService.getDb('witcher', testSql)).toBeNull();

    // 2. Perform search on local database / seed in offline mode
    const originalKey = ENV.RAWG_API_KEY;
    ENV.RAWG_API_KEY = '';
    const results = await GameSearchService.searchGames('witcher', 10, testSql);
    ENV.RAWG_API_KEY = originalKey;

    expect(results.length).toBeGreaterThanOrEqual(1);

    // 3. PostgreSQL search_cache table should now have the entry
    const cached = await SearchCacheService.getDb('witcher', testSql);
    expect(cached).not.toBeNull();
    expect(cached?.length).toBe(results.length);
    expect(cached?.[0].title.toLowerCase()).toContain('witcher');
  });

  it('should cache empty results [] in PostgreSQL to prevent external quota exhaustion', async () => {
    if (!testSql) return;

    // Store empty results for a non-existent game title
    const nonExistentQuery = 'nonexistentgamexyz12345';
    await SearchCacheService.setDb(nonExistentQuery, [], testSql);

    const cached = await SearchCacheService.getDb(nonExistentQuery, testSql);
    expect(cached).not.toBeNull();
    expect(cached).toEqual([]);
  });

  it('should fallback to local curated seed database when offline', async () => {
    const originalKey = ENV.RAWG_API_KEY;
    ENV.RAWG_API_KEY = '';
    const results = await GameSearchService.searchGames('zelda', 10, testSql);
    ENV.RAWG_API_KEY = originalKey;

    expect(results.length).toBeGreaterThanOrEqual(1);
    const botw = results.find((g) => g.title.includes('Breath of the Wild'));
    expect(botw).toBeDefined();
    expect(botw?.genres).toContain('Adventure');
  });
});


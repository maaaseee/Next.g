/**
 * Unit Tests for GameSearchService, IGDB Adapter, Persistent PostgreSQL Cache, and Empty Results Caching.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { GameSearchService } from '../src/services/game-search.service';
import { IgdbAdapter, type IgdbRawGame } from '../src/providers/igdb.adapter';
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

  it('should normalize IGDB API raw game payload correctly via IgdbAdapter', () => {
    const rawGames: IgdbRawGame[] = [
      {
        id: 3498,
        name: 'Grand Theft Auto V',
        slug: 'grand-theft-auto-v',
        cover: {
          id: 101,
          image_id: 'co1r7h',
        },
        first_release_date: 1379376000,
        summary: 'Action-adventure set in Los Santos.',
        rating: 94.6,
        genres: [
          { id: 4, name: 'Action' },
          { id: 3, name: 'Adventure' },
        ],
        platforms: [
          { id: 4, name: 'PC' },
          { id: 187, name: 'PlayStation 5' },
        ],
        game_modes: [
          { id: 1, name: 'Single player' },
          { id: 2, name: 'Multiplayer' },
        ],
      },
    ];

    const adapter = new IgdbAdapter();
    const normalized = adapter.normalizeGames(rawGames);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual({
      id: 3498,
      title: 'Grand Theft Auto V',
      slug: 'grand-theft-auto-v',
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg',
      release_year: 2013,
      summary: 'Action-adventure set in Los Santos.',
      genres: ['Action', 'Adventure'],
      platforms: ['PC', 'PlayStation 5'],
      rating: 94.6,
      game_modes: ['Single player', 'Multiplayer'],
    });
  });

  it('should persist search results in PostgreSQL search_cache table', async () => {
    if (!testSql) return;

    // 1. Initially cache is empty
    expect(await SearchCacheService.getDb('witcher', testSql)).toBeNull();

    // 2. Perform search on local database / seed in offline mode
    const origId = ENV.TWITCH_CLIENT_ID;
    const origSecret = ENV.TWITCH_CLIENT_SECRET;
    ENV.TWITCH_CLIENT_ID = '';
    ENV.TWITCH_CLIENT_SECRET = '';

    const results = await GameSearchService.searchGames('witcher', 10, undefined, testSql);
    ENV.TWITCH_CLIENT_ID = origId;
    ENV.TWITCH_CLIENT_SECRET = origSecret;

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
    const origId = ENV.TWITCH_CLIENT_ID;
    const origSecret = ENV.TWITCH_CLIENT_SECRET;
    ENV.TWITCH_CLIENT_ID = '';
    ENV.TWITCH_CLIENT_SECRET = '';

    const results = await GameSearchService.searchGames('zelda', 10, undefined, testSql);
    ENV.TWITCH_CLIENT_ID = origId;
    ENV.TWITCH_CLIENT_SECRET = origSecret;

    expect(results.length).toBeGreaterThanOrEqual(1);
    const botw = results.find((g) => g.title.includes('Breath of the Wild'));
    expect(botw).toBeDefined();
    expect(botw?.genres).toContain('Adventure');
  });
});

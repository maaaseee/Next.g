/**
 * Unit Tests for Games Catalog Service with PostgreSQL database.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { initDatabase, type SqlClient } from '../src/db/index';
import { GamesService } from '../src/services/games.service';

describe('GamesService', () => {
  let sql: SqlClient;

  const TEST_ID_1 = 99101;
  const TEST_ID_2 = 99102;
  const TEST_ID_3 = 99103;

  beforeEach(async () => {
    try {
      sql = await initDatabase();
      await sql`DELETE FROM user_games WHERE game_id IN (${TEST_ID_1}, ${TEST_ID_2}, ${TEST_ID_3});`;
      await sql`DELETE FROM games WHERE id IN (${TEST_ID_1}, ${TEST_ID_2}, ${TEST_ID_3});`;
    } catch {
      // Allow running even without live DB
    }
  });

  afterEach(async () => {
    try {
      if (sql) {
        await sql`DELETE FROM user_games WHERE game_id IN (${TEST_ID_1}, ${TEST_ID_2}, ${TEST_ID_3});`;
        await sql`DELETE FROM games WHERE id IN (${TEST_ID_1}, ${TEST_ID_2}, ${TEST_ID_3});`;
      }
    } catch {}
  });

  it('should insert and retrieve a game with rich metadata', async () => {
    if (!sql) return;

    const game = await GamesService.upsertGame(
      {
        id: TEST_ID_1,
        title: 'The Legend of Zelda: Tears of the Kingdom',
        cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/test.jpg',
        release_year: 2023,
        summary: 'Link embarks on an epic journey in Hyrule.',
        genres: ['Adventure', 'Action'],
        platforms: ['Nintendo Switch'],
        rating: 96.0,
        game_modes: ['Single player'],
        status: 'BACKLOG',
      },
      sql
    );

    expect(game.id).toBe(TEST_ID_1);
    expect(game.title).toBe('The Legend of Zelda: Tears of the Kingdom');
    expect(game.status).toBe('BACKLOG');
    expect(game.genres).toContain('Adventure');
    expect(game.platforms).toContain('Nintendo Switch');
    expect(game.rating).toBe(96.0);

    const all = await GamesService.getAll(undefined, sql);
    const found = all.find((g) => g.id === TEST_ID_1);
    expect(found).toBeDefined();
    expect(found?.title).toBe('The Legend of Zelda: Tears of the Kingdom');
    expect(found?.summary).toBe('Link embarks on an epic journey in Hyrule.');
  });

  it('should filter games by genre and platform', async () => {
    if (!sql) return;

    await GamesService.upsertGame(
      {
        id: TEST_ID_1,
        title: 'Cyberpunk Unique Quest',
        genres: ['UniqueCustomGenre', 'Action'],
        platforms: ['CustomPlatformPC'],
        status: 'PLAYING',
      },
      sql
    );

    await GamesService.upsertGame(
      {
        id: TEST_ID_2,
        title: 'Mario Custom Quest',
        genres: ['CustomPlatformerGenre'],
        platforms: ['CustomSwitchStation'],
        status: 'COMPLETED',
      },
      sql
    );

    const filteredGenre = await GamesService.getAll({ genre: 'UniqueCustomGenre' }, sql);
    expect(filteredGenre.length).toBeGreaterThanOrEqual(1);
    expect(filteredGenre.some((g) => g.id === TEST_ID_1)).toBe(true);

    const filteredPlatform = await GamesService.getAll({ platform: 'CustomSwitchStation' }, sql);
    expect(filteredPlatform.length).toBeGreaterThanOrEqual(1);
    expect(filteredPlatform.some((g) => g.id === TEST_ID_2)).toBe(true);
  });

  it('should delete a game from user library', async () => {
    if (!sql) return;

    await GamesService.upsertGame({ id: TEST_ID_3, title: 'Game to Delete', status: 'BACKLOG' }, sql);
    const beforeDelete = await GamesService.getAll(undefined, sql);
    expect(beforeDelete.some((g) => g.id === TEST_ID_3)).toBe(true);

    const result = await GamesService.deleteGame(TEST_ID_3, sql);
    expect(result.success).toBe(true);

    const afterDelete = await GamesService.getAll(undefined, sql);
    expect(afterDelete.some((g) => g.id === TEST_ID_3)).toBe(false);
  });

  it('should paginate games catalog with limit and offset', async () => {
    if (!sql) return;

    await GamesService.upsertGame({ id: TEST_ID_1, title: 'Game Page 1', status: 'BACKLOG' }, sql);
    await GamesService.upsertGame({ id: TEST_ID_2, title: 'Game Page 2', status: 'BACKLOG' }, sql);
    await GamesService.upsertGame({ id: TEST_ID_3, title: 'Game Page 3', status: 'BACKLOG' }, sql);

    // Fetch page 1 with limit 2
    const page1 = await GamesService.getAll({ limit: 2, offset: 0 }, sql);
    expect(page1.length).toBe(2);
    expect(page1.total).toBeGreaterThanOrEqual(3);
    expect(page1.hasMore).toBe(true);

    // Fetch page 2 with limit 2, offset 2
    const page2 = await GamesService.getAll({ limit: 2, offset: 2 }, sql);
    expect(page2.length).toBeGreaterThanOrEqual(1);
  });
});

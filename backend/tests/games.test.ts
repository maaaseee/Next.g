/**
 * Unit Tests for Games Catalog Service with PostgreSQL database.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { initDatabase, closeDatabase, type SqlClient } from '../src/db/index';
import { GamesService } from '../src/services/games.service';

describe('GamesService', () => {
  let sql: SqlClient;

  beforeEach(async () => {
    try {
      sql = await initDatabase();
      await sql`DELETE FROM user_games;`;
      await sql`DELETE FROM games;`;
    } catch {
      // Allow running even without live DB
    }
  });

  afterEach(async () => {
    try {
      if (sql) {
        await sql`DELETE FROM user_games;`;
        await sql`DELETE FROM games;`;
      }
    } catch {}
  });

  it('should insert and retrieve a game with rich metadata', async () => {
    if (!sql) return;

    const game = await GamesService.upsertGame(
      {
        id: 101,
        title: 'The Legend of Zelda: Tears of the Kingdom',
        cover_url: 'https://example.com/zelda.jpg',
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

    expect(game.id).toBe(101);
    expect(game.title).toBe('The Legend of Zelda: Tears of the Kingdom');
    expect(game.status).toBe('BACKLOG');
    expect(game.genres).toContain('Adventure');
    expect(game.platforms).toContain('Nintendo Switch');
    expect(game.rating).toBe(96.0);

    const all = await GamesService.getAll(undefined, sql);
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('The Legend of Zelda: Tears of the Kingdom');
    expect(all[0].summary).toBe('Link embarks on an epic journey in Hyrule.');
  });

  it('should filter games by genre and platform', async () => {
    if (!sql) return;

    await GamesService.upsertGame(
      {
        id: 1,
        title: 'Elden Ring',
        genres: ['RPG', 'Action'],
        platforms: ['PC', 'PS5'],
        status: 'PLAYING',
      },
      sql
    );

    await GamesService.upsertGame(
      {
        id: 2,
        title: 'Mario Odyssey',
        genres: ['Platform'],
        platforms: ['Nintendo Switch'],
        status: 'COMPLETED',
      },
      sql
    );

    const rpgGames = await GamesService.getAll({ genre: 'RPG' }, sql);
    expect(rpgGames).toHaveLength(1);
    expect(rpgGames[0].title).toBe('Elden Ring');

    const switchGames = await GamesService.getAll({ platform: 'Switch' }, sql);
    expect(switchGames).toHaveLength(1);
    expect(switchGames[0].title).toBe('Mario Odyssey');
  });

  it('should delete a game from user library', async () => {
    if (!sql) return;

    await GamesService.upsertGame({ id: 10, title: 'Game to Delete', status: 'BACKLOG' }, sql);
    expect(await GamesService.getAll(undefined, sql)).toHaveLength(1);

    const result = await GamesService.deleteGame(10, sql);
    expect(result.success).toBe(true);
    expect(await GamesService.getAll(undefined, sql)).toHaveLength(0);
  });
});

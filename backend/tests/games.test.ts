/**
 * Unit Tests for Games Catalog Service with SQLite in-memory database.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initDatabase } from '../src/db/index';
import { GamesService } from '../src/services/games.service';

describe('GamesService', () => {
  let db: Database;

  beforeEach(() => {
    db = initDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('should insert and retrieve a game with rich metadata', () => {
    const game = GamesService.upsertGame(
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
      db
    );

    expect(game.id).toBe(101);
    expect(game.title).toBe('The Legend of Zelda: Tears of the Kingdom');
    expect(game.status).toBe('BACKLOG');
    expect(game.genres).toContain('Adventure');
    expect(game.platforms).toContain('Nintendo Switch');
    expect(game.rating).toBe(96.0);

    const all = GamesService.getAll(undefined, db);
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('The Legend of Zelda: Tears of the Kingdom');
    expect(all[0].summary).toBe('Link embarks on an epic journey in Hyrule.');
  });

  it('should filter games by genre and platform', () => {
    GamesService.upsertGame(
      {
        id: 1,
        title: 'Elden Ring',
        genres: ['RPG', 'Action'],
        platforms: ['PC', 'PS5'],
        status: 'PLAYING',
      },
      db
    );

    GamesService.upsertGame(
      {
        id: 2,
        title: 'Mario Odyssey',
        genres: ['Platform'],
        platforms: ['Nintendo Switch'],
        status: 'COMPLETED',
      },
      db
    );

    const rpgGames = GamesService.getAll({ genre: 'RPG' }, db);
    expect(rpgGames).toHaveLength(1);
    expect(rpgGames[0].title).toBe('Elden Ring');

    const switchGames = GamesService.getAll({ platform: 'Switch' }, db);
    expect(switchGames).toHaveLength(1);
    expect(switchGames[0].title).toBe('Mario Odyssey');
  });

  it('should delete a game from user library', () => {
    GamesService.upsertGame({ id: 10, title: 'Game to Delete', status: 'BACKLOG' }, db);
    expect(GamesService.getAll(undefined, db)).toHaveLength(1);

    const result = GamesService.deleteGame(10, db);
    expect(result.success).toBe(true);
    expect(GamesService.getAll(undefined, db)).toHaveLength(0);
  });
});

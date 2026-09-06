/**
 * Database Seed Execution Script.
 * 
 * Populates SQLite with 50 curated video games and their initial statuses.
 * Run via: bun run seed (or called automatically on empty DB).
 */

import { Database } from 'bun:sqlite';
import { getDatabase, initDatabase } from './index';
import { SEED_GAMES } from './seed-data';

export function runSeed(customDb?: Database, populateUserLibrary: boolean = true): { seededCount: number } {
  const db = customDb || getDatabase();

  const insertTx = db.transaction(() => {
    for (const game of SEED_GAMES) {
      // 1. Insert into games table
      db.run(
        `
        INSERT INTO games (id, title, cover_url, release_year, summary, genres, platforms, rating, game_modes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          cover_url = excluded.cover_url,
          release_year = excluded.release_year,
          summary = excluded.summary,
          genres = excluded.genres,
          platforms = excluded.platforms,
          rating = excluded.rating,
          game_modes = excluded.game_modes;
      `,
        [
          game.id,
          game.title,
          game.cover_url,
          game.release_year,
          game.summary,
          JSON.stringify(game.genres),
          JSON.stringify(game.platforms),
          game.rating,
          JSON.stringify(game.game_modes),
        ]
      );

      // 2. Optionally insert into user library
      if (populateUserLibrary && game.defaultStatus) {
        db.run(
          `
          INSERT INTO user_games (game_id, status, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(game_id) DO NOTHING;
        `,
          [game.id, game.defaultStatus]
        );
      }
    }
  });

  insertTx();

  console.log(`🌱 Seeded ${SEED_GAMES.length} games into local SQLite database.`);
  return { seededCount: SEED_GAMES.length };
}

// If executed directly: bun run src/db/seed.ts
if (import.meta.main) {
  initDatabase();
  runSeed();
  process.exit(0);
}

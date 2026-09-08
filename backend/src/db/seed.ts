/**
 * Database Seed Execution Script for PostgreSQL.
 * 
 * Fetches the top most popular games directly from RAWG API.
 * If RAWG is unreachable or unconfigured, falls back safely to the offline catalog.
 * Run via: bun run seed (or triggered when AUTO_SEED=true on empty DB).
 */

import { getDatabase, initDatabase, type SqlClient } from './index';
import { SEED_GAMES } from './seed-data';
import { RawgAdapter } from '../providers/rawg.adapter';
import { ENV } from '../config/env';
import type { NormalizedGame } from '../types/games';
import { logger } from '../utils/logger';

export interface SeedResult {
  seededCount: number;
  source: 'RAWG_API' | 'FALLBACK_LOCAL';
}

export async function runSeed(
  customSql?: SqlClient,
  populateUserLibrary: boolean = false,
  limit: number = 40
): Promise<SeedResult> {
  const sql = customSql || getDatabase();
  let gamesToSeed: Array<NormalizedGame & { defaultStatus?: string }> = [];
  let source: 'RAWG_API' | 'FALLBACK_LOCAL' = 'FALLBACK_LOCAL';

  // 1. Try to fetch the most popular games dynamically from RAWG API
  if (ENV.RAWG_API_KEY) {
    try {
      logger.info('Fetching popular games from RAWG for seeding...', { limit });
      const rawgAdapter = new RawgAdapter();
      const popularGames = await rawgAdapter.getPopularGames(limit);

      if (popularGames && popularGames.length > 0) {
        gamesToSeed = popularGames;
        source = 'RAWG_API';
        console.log(`🎮 Retrieved ${popularGames.length} popular games from RAWG API.`);
      }
    } catch (err) {
      logger.warn('Failed to fetch from RAWG API during seed, falling back to local seed data', {
        error: err instanceof Error ? err.message : err,
      });
    }
  }

  // 2. Fallback to local curated starter games if RAWG is unavailable
  if (gamesToSeed.length === 0) {
    console.log('📦 Using local curated seed games catalog.');
    gamesToSeed = SEED_GAMES;
    source = 'FALLBACK_LOCAL';
  }

  // 3. Upsert games into PostgreSQL in a single transaction
  await sql.begin(async (tx) => {
    for (const game of gamesToSeed) {
      await tx`
        INSERT INTO games (id, title, cover_url, release_year, summary, genres, platforms, rating, game_modes)
        VALUES (
          ${game.id}, 
          ${game.title}, 
          ${game.cover_url}, 
          ${game.release_year}, 
          ${game.summary}, 
          ${JSON.stringify(game.genres)}::jsonb, 
          ${JSON.stringify(game.platforms)}::jsonb, 
          ${game.rating}, 
          ${JSON.stringify(game.game_modes)}::jsonb
        )
        ON CONFLICT(id) DO UPDATE SET
          title = EXCLUDED.title,
          cover_url = EXCLUDED.cover_url,
          release_year = EXCLUDED.release_year,
          summary = EXCLUDED.summary,
          genres = EXCLUDED.genres,
          platforms = EXCLUDED.platforms,
          rating = EXCLUDED.rating,
          game_modes = EXCLUDED.game_modes;
      `;

      // 4. If requested, seed user's library as well (e.g. dev demo)
      if (populateUserLibrary && 'defaultStatus' in game && (game as any).defaultStatus) {
        await tx`
          INSERT INTO user_games (game_id, status, updated_at)
          VALUES (${game.id}, ${(game as any).defaultStatus}, CURRENT_TIMESTAMP)
          ON CONFLICT(game_id) DO NOTHING;
        `;
      }
    }
  });

  console.log(`🌱 Successfully seeded ${gamesToSeed.length} games (Source: ${source}).`);
  return { seededCount: gamesToSeed.length, source };
}

// If executed directly: bun run src/db/seed.ts
const isMain = typeof (import.meta as any)?.main === 'boolean' ? (import.meta as any).main : false;
if (isMain) {
  initDatabase().then(() => runSeed()).then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

/**
 * Database Seed Execution Script for PostgreSQL.
 * 
 * Fetches the top acclaimed popular games directly from IGDB API v4.
 * If IGDB is unreachable or unconfigured, falls back safely to the offline curated catalog.
 * Run via: bun run seed (or triggered when AUTO_SEED=true on empty DB).
 */

import { getDatabase, initDatabase, type SqlClient } from './index';
import { SEED_GAMES } from './seed-data';
import { IgdbAdapter } from '../providers/igdb.adapter';
import { ENV } from '../config/env';
import type { NormalizedGame } from '../types/games';
import { logger } from '../utils/logger';

export interface SeedResult {
  seededCount: number;
  source: 'IGDB_API' | 'FALLBACK_LOCAL';
}

export async function runSeed(
  customSql?: SqlClient,
  populateUserLibrary: boolean = true,
  limit: number = 40
): Promise<SeedResult> {
  const sql = customSql || getDatabase();
  let gamesToSeed: Array<NormalizedGame & { defaultStatus?: string }> = [];
  let source: 'IGDB_API' | 'FALLBACK_LOCAL' = 'FALLBACK_LOCAL';

  // 1. Try to fetch the most popular games dynamically from IGDB API
  if (ENV.TWITCH_CLIENT_ID && ENV.TWITCH_CLIENT_SECRET) {
    try {
      logger.info('Fetching popular games from IGDB for seeding...', { limit });
      const igdbAdapter = new IgdbAdapter();
      const popularGames = await igdbAdapter.getPopularGames(limit);

      if (popularGames && popularGames.length > 0) {
        gamesToSeed = popularGames;
        source = 'IGDB_API';
        console.log(`🎮 Retrieved ${popularGames.length} popular games from IGDB API.`);
      }
    } catch (err) {
      logger.warn('Failed to fetch from IGDB API during seed, falling back to local seed data', {
        error: err instanceof Error ? err.message : err,
      });
    }
  }

  // 2. Fallback to local curated starter games if IGDB is unavailable
  if (gamesToSeed.length === 0) {
    console.log('📦 Using local curated seed games catalog.');
    gamesToSeed = SEED_GAMES;
    source = 'FALLBACK_LOCAL';
  }

  // 3. Upsert games into PostgreSQL in a single transaction
  await sql.begin(async (tx) => {
    for (const game of gamesToSeed) {
      await tx`
        INSERT INTO games (id, title, slug, cover_url, release_year, summary, genres, platforms, rating, game_modes)
        VALUES (
          ${game.id}, 
          ${game.title}, 
          ${game.slug ?? null},
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
          slug = COALESCE(EXCLUDED.slug, games.slug),
          cover_url = EXCLUDED.cover_url,
          release_year = EXCLUDED.release_year,
          summary = EXCLUDED.summary,
          genres = EXCLUDED.genres,
          platforms = EXCLUDED.platforms,
          rating = EXCLUDED.rating,
          game_modes = EXCLUDED.game_modes;
      `;

      // 4. If requested, seed user's library as well (e.g. dev demo)
      const defaultStatus = 'defaultStatus' in game ? (game as { defaultStatus?: string }).defaultStatus : undefined;
      if (populateUserLibrary && defaultStatus) {
        await tx`
          INSERT INTO user_games (game_id, status, updated_at)
          VALUES (${game.id}, ${defaultStatus}, CURRENT_TIMESTAMP)
          ON CONFLICT(game_id) DO NOTHING;
        `;
      }
    }
  });

  console.log(`🌱 Successfully seeded ${gamesToSeed.length} games (Source: ${source}).`);
  return { seededCount: gamesToSeed.length, source };
}

// If executed directly: bun run src/db/seed.ts
const isMain = typeof (import.meta as unknown as { main?: boolean })?.main === 'boolean' ? Boolean((import.meta as unknown as { main?: boolean }).main) : false;
if (isMain) {
  initDatabase().then(() => runSeed()).then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

/**
 * Automated Database Migration Runner for PostgreSQL.
 * 
 * Features:
 * - Uses PostgreSQL Advisory Locks (pg_advisory_lock) to prevent race conditions during multi-replica scaling in Azure.
 * - Tracks applied versions in `schema_migrations`.
 * - Executes unapplied migrations in atomic transactions.
 */

import { type SqlClient, getDatabase, initDatabase } from './index';
import { logger } from '../utils/logger';

// List of migrations in strict ascending order
export interface MigrationDefinition {
  version: string;
  name: string;
  sql: string;
}

// Inline loaded migration scripts to guarantee zero filesystem path issues inside Alpine Docker containers
export const MIGRATIONS: MigrationDefinition[] = [
  {
    version: '001',
    name: 'initial_schema',
    sql: `
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT NOT NULL,
        avatar_url TEXT,
        provider VARCHAR(20) NOT NULL DEFAULT 'local',
        provider_id TEXT,
        onboarded BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS games (
        id BIGINT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT,
        cover_url TEXT,
        release_year INTEGER,
        summary TEXT,
        genres JSONB DEFAULT '[]'::jsonb,
        platforms JSONB DEFAULT '[]'::jsonb,
        rating REAL,
        game_modes JSONB DEFAULT '[]'::jsonb
      );

      CREATE TABLE IF NOT EXISTS user_games (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL CHECK(status IN ('BACKLOG', 'PLAYING', 'COMPLETED', 'WISHLIST')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS search_cache (
        query_text TEXT PRIMARY KEY,
        json_response JSONB NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
  {
    version: '002',
    name: 'add_slug_and_indexes',
    sql: `
      ALTER TABLE games ADD COLUMN IF NOT EXISTS slug TEXT;
      ALTER TABLE user_games ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_user_games_status ON user_games(status);
      CREATE INDEX IF NOT EXISTS idx_user_games_user_id ON user_games(user_id);

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'user_games_game_id_key'
        ) THEN
          ALTER TABLE user_games DROP CONSTRAINT user_games_game_id_key;
        END IF;
      END $$;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_games_user_game 
      ON user_games (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), game_id);
    `,
  },
  {
    version: '003',
    name: 'add_token_version',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;
      CREATE INDEX IF NOT EXISTS idx_users_token_version ON users(id, token_version);
    `,
  },
  {
    version: '004',
    name: 'performance_pagination_index',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_user_games_user_status_updated 
      ON user_games(user_id, status, updated_at DESC);
    `,
  },
  {
    version: '005',
    name: 'performance_gin_indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_games_genres_gin ON games USING gin (genres);
      CREATE INDEX IF NOT EXISTS idx_games_platforms_gin ON games USING gin (platforms);
    `,
  },
];

const ADVISORY_LOCK_ID = 849201831;

export async function runMigrations(customSql?: SqlClient): Promise<{ applied: string[]; currentVersion: string }> {
  const sql = customSql || getDatabase();
  const applied: string[] = [];

  // 1. Acquire PostgreSQL advisory lock (blocks concurrent replicas from running migrations simultaneously)
  await sql`SELECT pg_advisory_lock(${ADVISORY_LOCK_ID});`;

  try {
    // 2. Ensure migrations table exists
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Fetch applied migration versions
    const appliedRows = await sql<{ version: string }[]>`SELECT version FROM schema_migrations;`;
    const appliedSet = new Set(appliedRows.map((r) => r.version));

    // 4. Run pending migrations in strict transaction order
    for (const migration of MIGRATIONS) {
      if (!appliedSet.has(migration.version)) {
        logger.info(`[Migrate] Applying migration ${migration.version}_${migration.name}...`);
        await sql.begin(async (tx) => {
          await tx.unsafe(migration.sql);
          await tx`INSERT INTO schema_migrations (version) VALUES (${migration.version});`;
        });
        applied.push(`${migration.version}_${migration.name}`);
        logger.info(`[Migrate] Successfully applied ${migration.version}_${migration.name}`);
      }
    }

    const [latest] = await sql<{ version: string }[]>`
      SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;
    `;

    return {
      applied,
      currentVersion: latest?.version || 'none',
    };
  } finally {
    // 5. Always release advisory lock
    await sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID});`;
  }
}

// CLI entrypoint if run directly via `bun run src/db/migrate.ts`
if (import.meta.main) {
  try {
    const sql = await initDatabase();
    const result = await runMigrations(sql);
    console.log(`✅ Migrations completed. Applied: ${result.applied.length > 0 ? result.applied.join(', ') : 'None (Up to date)'}`);
    console.log(`📌 Current Schema Version: ${result.currentVersion}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

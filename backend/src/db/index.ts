/**
 * PostgreSQL Database Connection and Schema Initialization.
 * 
 * Sources:
 * - postgres (porsager): https://github.com/porsager/postgres
 * - Supabase / Neon connection string compatibility
 */

import postgres from 'postgres';
import { ENV } from '../config/env';

export type SqlClient = ReturnType<typeof postgres>;

let sqlInstance: SqlClient | null = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS games (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
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
  game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK(status IN ('BACKLOG', 'PLAYING', 'COMPLETED', 'WISHLIST')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_id)
);

CREATE TABLE IF NOT EXISTS search_cache (
  query_text TEXT PRIMARY KEY,
  json_response JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_games_status ON user_games(status);
`;

export async function initDatabase(customUrl?: string): Promise<SqlClient> {
  if (sqlInstance && !customUrl) {
    return sqlInstance;
  }

  const connectionString = customUrl || ENV.DATABASE_URL;

  // Determine if SSL is needed (Neon, Supabase, AWS require SSL; local docker usually does not)
  const isSsl = connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co');

  const sql = postgres(connectionString, {
    ssl: isSsl ? 'require' : false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  // Run schema creation
  await sql.unsafe(SCHEMA_SQL);

  if (!customUrl) {
    sqlInstance = sql;
  }

  return sql;
}

export function getDatabase(): SqlClient {
  if (!sqlInstance) {
    // If called before await initDatabase(), lazy instantiate default
    const connectionString = ENV.DATABASE_URL;
    const isSsl = connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co');
    sqlInstance = postgres(connectionString, {
      ssl: isSsl ? 'require' : false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sqlInstance;
}

export async function closeDatabase(): Promise<void> {
  if (sqlInstance) {
    await sqlInstance.end();
    sqlInstance = null;
  }
}


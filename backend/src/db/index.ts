/**
 * SQLite Database Connection and Schema Initialization.
 * 
 * Source: Bun SQLite API
 * https://bun.sh/docs/api/sqlite
 */

import { Database } from 'bun:sqlite';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';

let dbInstance: Database | null = null;

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  cover_url TEXT,
  release_year INTEGER,
  summary TEXT,
  genres TEXT,
  platforms TEXT,
  rating REAL,
  game_modes TEXT
);

CREATE TABLE IF NOT EXISTS user_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('BACKLOG', 'PLAYING', 'COMPLETED', 'WISHLIST')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(game_id)
);

CREATE TABLE IF NOT EXISTS search_cache (
  query_text TEXT PRIMARY KEY,
  json_response TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_games_status ON user_games(status);
`;

export function initDatabase(dbPath?: string): Database {
  if (dbInstance && !dbPath) {
    return dbInstance;
  }

  const targetPath = dbPath || join(process.cwd(), 'data', 'nextg.db');

  if (targetPath !== ':memory:') {
    const dir = dirname(targetPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(targetPath);

  // Enable WAL mode for high concurrency
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Apply schema
  db.exec(SCHEMA_SQL);

  // Auto-migrate new columns if opened an older db file
  try {
    const tableInfo = db.query<{ name: string }, []>('PRAGMA table_info(games);').all();
    const columns = new Set(tableInfo.map((col) => col.name));
    
    if (!columns.has('summary')) db.exec('ALTER TABLE games ADD COLUMN summary TEXT;');
    if (!columns.has('genres')) db.exec('ALTER TABLE games ADD COLUMN genres TEXT;');
    if (!columns.has('platforms')) db.exec('ALTER TABLE games ADD COLUMN platforms TEXT;');
    if (!columns.has('rating')) db.exec('ALTER TABLE games ADD COLUMN rating REAL;');
    if (!columns.has('game_modes')) db.exec('ALTER TABLE games ADD COLUMN game_modes TEXT;');
  } catch (err) {
    // Ignore migration errors on in-memory or fresh tables
  }

  if (!dbPath) {
    dbInstance = db;
  }

  return db;
}

export function getDatabase(): Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

-- SQLite Database Schema for NEXT.g MVP
-- Source: bun:sqlite driver documentation https://bun.sh/docs/api/sqlite

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,             -- UUID
  email TEXT UNIQUE NOT NULL,      -- User Email
  password_hash TEXT,              -- Bcrypt/Argon2 password hash (null for OAuth)
  name TEXT NOT NULL,              -- Display Name
  avatar_url TEXT,                 -- Profile Image URL
  provider TEXT NOT NULL DEFAULT 'local', -- 'local', 'github', 'google'
  provider_id TEXT,                -- Third-party OAuth provider user ID
  onboarded INTEGER DEFAULT 0,     -- 0 (false) or 1 (true)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,          -- Official Game ID
  title TEXT NOT NULL,             -- Game Title
  slug TEXT,                       -- Official IGDB slug
  cover_url TEXT,                  -- Cover URL
  release_year INTEGER,            -- First Release Year
  summary TEXT,                    -- Game Synopsis/Description
  genres TEXT,                     -- JSON Array string, e.g. ["Action", "RPG"]
  platforms TEXT,                  -- JSON Array string, e.g. ["PC", "PlayStation 5"]
  rating REAL,                     -- Aggregate Rating (0 to 100)
  game_modes TEXT                  -- JSON Array string, e.g. ["Single player", "Multiplayer"]
);

CREATE TABLE IF NOT EXISTS user_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('BACKLOG', 'PLAYING', 'COMPLETED', 'WISHLIST')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(user_id, game_id)
);

CREATE TABLE IF NOT EXISTS search_cache (
  query_text TEXT PRIMARY KEY,
  json_response TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_games_status ON user_games(status);

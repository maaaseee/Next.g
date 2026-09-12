-- SQLite Database Schema for NEXT.g MVP
-- Source: bun:sqlite driver documentation https://bun.sh/docs/api/sqlite

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,          -- Official Game ID
  title TEXT NOT NULL,             -- Game Title
  slug TEXT,                       -- Official RAWG/IGDB slug
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

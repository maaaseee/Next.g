-- Migration 001: Initial Core Schema
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

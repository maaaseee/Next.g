-- Migration 005: GIN Indexes on games JSONB fields for high-speed genre and platform filtering
CREATE INDEX IF NOT EXISTS idx_games_genres_gin ON games USING gin (genres);
CREATE INDEX IF NOT EXISTS idx_games_platforms_gin ON games USING gin (platforms);

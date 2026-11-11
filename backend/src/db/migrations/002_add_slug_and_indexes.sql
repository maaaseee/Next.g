-- Migration 002: Add Slug, Columns and Performance Indexes
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

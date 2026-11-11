-- Migration 004: Performance Index for Instant Paginated Ordering
CREATE INDEX IF NOT EXISTS idx_user_games_user_status_updated 
ON user_games(user_id, status, updated_at DESC);

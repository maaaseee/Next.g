-- Migration 003: Add Token Version for Instant JWT Invalidation and Session Revocation
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_users_token_version ON users(id, token_version);

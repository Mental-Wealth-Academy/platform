-- ============================================================================
-- Migration: Rename tables for clarity
-- ============================================================================
-- Run this in Supabase SQL Editor BEFORE deploying the new code.
-- ============================================================================

-- 1. Split prayers out of ethereal_progress (week_number=99 rows)
CREATE TABLE IF NOT EXISTS prayers (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id CHAR(36) NOT NULL,
  progress_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id)
);

INSERT INTO prayers (id, user_id, progress_data, created_at, updated_at)
SELECT id, user_id, progress_data, created_at, updated_at
FROM ethereal_progress
WHERE week_number = 99
ON CONFLICT (user_id) DO NOTHING;

DELETE FROM ethereal_progress WHERE week_number = 99;

CREATE INDEX IF NOT EXISTS idx_prayers_user_id ON prayers(user_id);
ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;

-- 2. Rename ethereal_progress -> weeks
ALTER TABLE ethereal_progress RENAME TO weeks;

ALTER TABLE weeks DROP CONSTRAINT IF EXISTS ethereal_progress_week_number_check;
ALTER TABLE weeks ADD CONSTRAINT weeks_week_number_check
  CHECK (week_number >= 0 AND week_number <= 13);

-- 3. Rename quest_completions -> quests
ALTER TABLE quest_completions RENAME TO quests;

-- 4. Drop unused voting game tables
DROP TABLE IF EXISTS azura_votes CASCADE;
DROP TABLE IF EXISTS game_votes CASCADE;
DROP TABLE IF EXISTS game_submissions CASCADE;
DROP TABLE IF EXISTS voting_games CASCADE;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- ============================================================================
-- Chao Garden Save Data Migration
-- ============================================================================
-- Creates table for persisting Chao Garden game saves per user
-- ============================================================================

CREATE TABLE IF NOT EXISTS chao_garden_saves (
  user_id CHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  save_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger for automatic updated_at
CREATE TRIGGER update_chao_garden_saves_updated_at
  BEFORE UPDATE ON chao_garden_saves
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE chao_garden_saves ENABLE ROW LEVEL SECURITY;

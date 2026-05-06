-- ============================================================================
-- Mental Wealth Academy Database Schema
-- ============================================================================
-- Fresh database setup for user onboarding and profile management
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

-- Users table - Core user account data from onboarding
-- Stores: username, email, password, selected avatar, and profile info
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  selected_avatar_id VARCHAR(50) NULL,
  avatar_url VARCHAR(1024) NULL,
  gender VARCHAR(10) NULL,
  birthday DATE NULL,
  shard_count INTEGER NOT NULL DEFAULT 0,
  wallet_address VARCHAR(255) NULL UNIQUE,
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User avatars table - Stores all 5 assigned avatars per user
-- Allows users to switch between their assigned avatars later
CREATE TABLE user_avatars (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id CHAR(36) NOT NULL,
  avatar_id VARCHAR(50) NOT NULL,
  avatar_url VARCHAR(1024) NOT NULL,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, avatar_id)
);

-- ============================================================================
-- AUTHENTICATION & SESSIONS
-- ============================================================================

-- Sessions table - User authentication sessions
CREATE TABLE sessions (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id CHAR(36) NOT NULL,
  token CHAR(36) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);

-- User avatars indexes
CREATE INDEX idx_user_avatars_user_id ON user_avatars(user_id);
CREATE INDEX idx_user_avatars_selected ON user_avatars(user_id, is_selected) WHERE is_selected = true;

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- GENERATED TESTS
-- ============================================================================

CREATE TABLE generated_tests (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  difficulty INTEGER NOT NULL,
  persona VARCHAR(80) NOT NULL,
  title VARCHAR(80) NOT NULL,
  shard_reward INTEGER NOT NULL,
  source VARCHAR(32) NOT NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_generated_tests_user_id ON generated_tests(user_id);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FORUM TABLES (Community Features)
-- ============================================================================

-- Forum categories table
CREATE TABLE forum_categories (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(512) NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Forum threads table
CREATE TABLE forum_threads (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category_id CHAR(36) NOT NULL,
  author_user_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Forum posts table
CREATE TABLE forum_posts (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  thread_id CHAR(36) NOT NULL,
  author_user_id CHAR(36) NOT NULL,
  body TEXT NOT NULL,
  attachment_url VARCHAR(1024) NULL,
  attachment_mime VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Forum indexes
CREATE INDEX idx_threads_category_id ON forum_threads(category_id);
CREATE INDEX idx_threads_updated_at ON forum_threads(updated_at);
CREATE INDEX idx_posts_thread_id ON forum_posts(thread_id);
CREATE INDEX idx_posts_created_at ON forum_posts(created_at);

-- Forum trigger
CREATE TRIGGER update_forum_threads_updated_at 
  BEFORE UPDATE ON forum_threads
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- QUEST SYSTEM
-- ============================================================================

-- Quest completions table - Tracks user quest progress
CREATE TABLE quests (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id CHAR(36) NOT NULL,
  quest_id VARCHAR(255) NOT NULL,
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  shards_awarded INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, quest_id)
);

-- Quest indexes
CREATE INDEX idx_quests_user_id ON quests(user_id);
CREATE INDEX idx_quests_quest_id ON quests(quest_id);

-- ============================================================================
-- SOCIAL INTEGRATIONS (Optional - For Future Features)
-- ============================================================================

-- X (Twitter) accounts table - For future social linking
CREATE TABLE x_accounts (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id CHAR(36) NOT NULL,
  x_user_id VARCHAR(255) NOT NULL,
  x_username VARCHAR(255) NOT NULL,
  access_token VARCHAR(1024) NOT NULL,
  access_token_secret VARCHAR(1024) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id),
  UNIQUE (x_user_id)
);

-- X OAuth states table - For OAuth flow
CREATE TABLE x_oauth_states (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id CHAR(36) NOT NULL,
  state_token VARCHAR(255) NOT NULL UNIQUE,
  oauth_token VARCHAR(255) NULL,
  oauth_token_secret VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- Social integration indexes
CREATE INDEX idx_x_accounts_user_id ON x_accounts(user_id);
CREATE INDEX idx_x_oauth_states_state_token ON x_oauth_states(state_token);
CREATE INDEX idx_x_oauth_states_user_id ON x_oauth_states(user_id);

-- Social integration trigger
CREATE TRIGGER update_x_accounts_updated_at 
  BEFORE UPDATE ON x_accounts
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on all tables for security best practices
-- Note: If using service role connection string, RLS policies don't apply
-- but enabling RLS is still recommended for defense in depth

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_oauth_states ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- Your database is now ready for the onboarding system!
-- Users will be created with: username, email, password_hash, and avatar choices
-- ============================================================================

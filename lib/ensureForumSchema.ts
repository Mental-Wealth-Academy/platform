import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaForumSchemaEnsured: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mwaForumSchemaLock: Promise<void> | undefined;
}


export async function ensureForumSchema() {
  // If already ensured, return immediately
  if (globalThis.__mwaForumSchemaEnsured) return;

  // If currently running, wait for it to finish
  if (globalThis.__mwaForumSchemaLock) {
    await globalThis.__mwaForumSchemaLock;
    return;
  }

  // Create lock promise
  const lockPromise = (async () => {
    try {
      await _ensureForumSchemaImpl();
      globalThis.__mwaForumSchemaEnsured = true;
    } finally {
      // Release lock
      globalThis.__mwaForumSchemaLock = undefined;
    }
  })();

  globalThis.__mwaForumSchemaLock = lockPromise;
  await lockPromise;
}

async function _ensureForumSchemaImpl() {
  // Enable UUID extension (if not already enabled)
  // Note: Pooler connections may not allow extension creation, so we skip this for poolers
  // Supabase already has uuid-ossp enabled by default
  try {
    await sqlQuery(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  } catch (err: any) {
    // Check if this is a connection error - if so, re-throw it
    if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND' || err?.code === 'ETIMEDOUT' || err?.message?.includes('connection')) {
      throw err;
    }
    // Check for pooler/tenant errors - these are expected with pooler connections
    // Don't throw, just log and continue - Supabase has extensions pre-enabled
    if (err?.code === 'XX000' || err?.message?.includes('Tenant or user not found')) {
      // Pooler connections don't allow extension creation, but Supabase has extensions pre-enabled
      console.warn('Extension creation skipped (pooler connection - extensions are pre-enabled):', err?.message);
      // Don't return - continue with schema creation
    } else {
      // Extension might already exist or not have permission, that's okay
      console.warn('Could not create uuid-ossp extension (may already exist):', err?.message);
    }
  }

  // Users table - wallet-only accounts
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      username VARCHAR(32) NOT NULL UNIQUE,
      selected_avatar_id VARCHAR(50) NULL,
      avatar_url TEXT NULL,
      bio TEXT NULL,
      privy_user_id VARCHAR(255) NULL UNIQUE,
      wallet_address VARCHAR(255) NOT NULL,
      gender VARCHAR(10) NULL,
      birthday DATE NULL,
      shard_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: drop legacy email/password columns
  try {
    await sqlQuery(`ALTER TABLE users DROP COLUMN IF EXISTS password_hash`);
    await sqlQuery(`ALTER TABLE users DROP COLUMN IF EXISTS email`);
  } catch (err: any) {
    // Columns may not exist on fresh databases
    console.warn('Migration: could not drop legacy columns (may not exist):', err?.message);
  }

  // Add avatar_url column if it doesn't exist (for existing databases)
  try {
    await sqlQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL`);
  } catch (err: any) {
    // Column might already exist, ignore error
    if (!err?.message?.includes('already exists') && !err?.message?.includes('duplicate')) {
      console.warn('Could not add avatar_url column (may already exist):', err?.message);
    }
  }

  // Keep avatar_url flexible for same-origin generated avatars and uploaded images.
  try {
    await sqlQuery(`ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT`);
  } catch (err: any) {
    console.warn('Migration: could not widen users.avatar_url (may already be TEXT):', err?.message);
  }

  // Create indexes for users
  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_users_privy_user_id ON users(privy_user_id)`);
  } catch (err: any) {
    // Index might already exist
  }
  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address)`);
  } catch (err: any) {
    // Index might already exist
  }

  // Agent accounts: operator-owned AI agent identities
  try {
    await sqlQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(10) NOT NULL DEFAULT 'human'`);
    await sqlQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS operator_wallet VARCHAR(255) NULL`);
    await sqlQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_bio TEXT NULL`);
  } catch (err: any) {
    if (!err?.message?.includes('already exists') && !err?.message?.includes('duplicate')) {
      console.warn('Could not add agent account columns (may already exist):', err?.message);
    }
  }
  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_users_operator_wallet ON users(operator_wallet)`);
  } catch (err: any) {
    // Index might already exist
  }

  // Agent wallet keys: encrypted private keys for custodial (platform-managed) agents.
  // Kept in a separate table so key material is never selected by ordinary user queries.
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS agent_wallet_keys (
      user_id CHAR(36) PRIMARY KEY,
      encrypted_key TEXT NOT NULL,
      iv VARCHAR(64) NOT NULL,
      auth_tag VARCHAR(64) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Agent reminders: operator-facing nudges created by agents or operators.
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS agent_reminders (
      id CHAR(36) PRIMARY KEY,
      agent_user_id CHAR(36) NOT NULL,
      operator_wallet VARCHAR(255) NOT NULL,
      kind VARCHAR(24) NOT NULL DEFAULT 'custom',
      message TEXT NOT NULL,
      due_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      dismissed_at TIMESTAMP NULL,
      FOREIGN KEY (agent_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_agent_reminders_operator ON agent_reminders(operator_wallet)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_agent_reminders_agent ON agent_reminders(agent_user_id)`);
  } catch (err: any) {
    console.warn('Could not create agent_reminders indexes (may already exist):', err?.message);
  }

  // Agent API keys: long-lived bearer credentials for skill-driven agents.
  // Only the SHA-256 hash is stored — the plaintext key is shown once on creation.
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS agent_api_keys (
      id CHAR(36) PRIMARY KEY,
      agent_user_id CHAR(36) NOT NULL,
      key_hash VARCHAR(128) NOT NULL,
      key_prefix VARCHAR(16) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMP NULL,
      revoked_at TIMESTAMP NULL,
      FOREIGN KEY (agent_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_agent_api_keys_hash ON agent_api_keys(key_hash)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_agent_api_keys_agent ON agent_api_keys(agent_user_id)`);
  } catch (err: any) {
    console.warn('Could not create agent_api_keys indexes (may already exist):', err?.message);
  }

  // Room Log: micro-moltbook feed of agent posts, comments, and upvotes.
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS room_log_posts (
      id CHAR(36) PRIMARY KEY,
      agent_user_id CHAR(36) NOT NULL,
      kind VARCHAR(12) NOT NULL DEFAULT 'post',
      body TEXT NOT NULL,
      link_url TEXT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS room_log_comments (
      id CHAR(36) PRIMARY KEY,
      post_id CHAR(36) NOT NULL,
      agent_user_id CHAR(36) NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES room_log_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS room_log_votes (
      id CHAR(36) PRIMARY KEY,
      post_id CHAR(36) NOT NULL,
      agent_user_id CHAR(36) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES room_log_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (post_id, agent_user_id)
    )
  `);
  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_room_log_posts_created ON room_log_posts(created_at)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_room_log_comments_post ON room_log_comments(post_id)`);
  } catch (err: any) {
    console.warn('Could not create room_log indexes (may already exist):', err?.message);
  }

  // Add shard_count column if it doesn't exist (for existing databases)
  try {
    await sqlQuery(`
      ALTER TABLE users 
      ADD COLUMN shard_count INTEGER NOT NULL DEFAULT 0
    `);
  } catch (err: any) {
    // Column might already exist, ignore error
    if (!err?.message?.includes('already exists') && !err?.message?.includes('duplicate')) {
      console.warn('Error adding shard_count column:', err);
    }
  }


  // Add selected_avatar_id column if it doesn't exist
  try {
    await sqlQuery(`
      ALTER TABLE users 
      ADD COLUMN selected_avatar_id VARCHAR(50) NULL
    `);
  } catch (err: any) {
    if (!err?.message?.includes('already exists') && !err?.message?.includes('duplicate')) {
      console.warn('Error adding selected_avatar_id column:', err);
    }
  }

  // Add bio column if it doesn't exist
  try {
    await sqlQuery(`
      ALTER TABLE users 
      ADD COLUMN bio TEXT NULL
    `);
  } catch (err: any) {
    if (!err?.message?.includes('already exists') && !err?.message?.includes('duplicate')) {
      console.warn('Error adding bio column:', err);
    }
  }

  // Add avatar_reroll_count column if it doesn't exist. Each paid reroll bumps
  // this, which shifts the user's deterministic set of 6 avatar options.
  try {
    await sqlQuery(`
      ALTER TABLE users
      ADD COLUMN avatar_reroll_count INTEGER NOT NULL DEFAULT 0
    `);
  } catch (err: any) {
    if (!err?.message?.includes('already exists') && !err?.message?.includes('duplicate')) {
      console.warn('Error adding avatar_reroll_count column:', err);
    }
  }

  // Add gender column if it doesn't exist
  try {
    await sqlQuery(`
      ALTER TABLE users
      ADD COLUMN gender VARCHAR(10) NULL
    `);
  } catch (err: any) {
    if (!err?.message?.includes('already exists') && !err?.message?.includes('duplicate')) {
      console.warn('Error adding gender column:', err);
    }
  }

  // Add birthday column if it doesn't exist
  try {
    await sqlQuery(`
      ALTER TABLE users 
      ADD COLUMN birthday DATE NULL
    `);
  } catch (err: any) {
    if (!err?.message?.includes('already exists') && !err?.message?.includes('duplicate')) {
      console.warn('Error adding birthday column:', err);
    }
  }

  // Legacy: privy_user_id column kept nullable for backwards compat
  try {
    await sqlQuery(`
      ALTER TABLE users
      ALTER COLUMN privy_user_id DROP NOT NULL
    `);
  } catch (err: any) {
    if (!err?.message?.includes('does not exist') && !err?.message?.includes('not found')) {
      console.warn('Error making privy_user_id nullable:', err);
    }
  }

  // Create trigger function for updated_at (if not exists)
  await sqlQuery(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql'
  `);

  // Create trigger for users updated_at
  try {
    await sqlQuery(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users
    `);
    await sqlQuery(`
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  } catch (err: any) {
    console.warn('Error creating users updated_at trigger:', err);
  }

  // Migrate old table name if it exists
  try {
    await sqlQuery(`ALTER TABLE IF EXISTS quest_completions RENAME TO quests`);
  } catch {
    // Already renamed or doesn't exist
  }

  // Quests table
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS quests (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      quest_id VARCHAR(255) NOT NULL,
      completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      shards_awarded INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, quest_id)
    )
  `);

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_quests_user_id ON quests(user_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_quests_quest_id ON quests(quest_id)`);
  } catch (err: any) {
    // Indexes might already exist
  }

  // Quest crypto rewards table - Tracks on-chain rewards for quest completions
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS quest_crypto_rewards (
      id CHAR(36) PRIMARY KEY,
      quest_completion_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      quest_id VARCHAR(255) NOT NULL,
      reward_amount_wei VARCHAR(255) NOT NULL,
      token_address VARCHAR(255) NULL,
      transaction_hash VARCHAR(255) NULL,
      transaction_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      distributed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quest_completion_id) REFERENCES quests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (quest_completion_id)
    )
  `);

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_quest_crypto_rewards_user_id ON quest_crypto_rewards(user_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_quest_crypto_rewards_quest_id ON quest_crypto_rewards(quest_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_quest_crypto_rewards_transaction_hash ON quest_crypto_rewards(transaction_hash)`);
  } catch (err: any) {
    // Indexes might already exist
  }

  // X accounts table
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS x_accounts (
      id CHAR(36) PRIMARY KEY,
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
    )
  `);

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_x_accounts_user_id ON x_accounts(user_id)`);
  } catch (err: any) {
    // Index might already exist
  }

  // Create trigger for x_accounts updated_at
  try {
    await sqlQuery(`
      DROP TRIGGER IF EXISTS update_x_accounts_updated_at ON x_accounts
    `);
    await sqlQuery(`
      CREATE TRIGGER update_x_accounts_updated_at BEFORE UPDATE ON x_accounts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  } catch (err: any) {
    console.warn('Error creating x_accounts updated_at trigger:', err);
  }

  // X OAuth states table
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS x_oauth_states (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      state_token VARCHAR(255) NOT NULL UNIQUE,
      oauth_token VARCHAR(255) NULL,
      oauth_token_secret VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    )
  `);

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_x_oauth_states_state_token ON x_oauth_states(state_token)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_x_oauth_states_user_id ON x_oauth_states(user_id)`);
  } catch (err: any) {
    // Indexes might already exist
  }

  // Sessions table
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS sessions (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      token CHAR(36) NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
  } catch (err: any) {
    // Index might already exist
  }


  // User avatars table - stores the 6 assigned avatars for each user
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS user_avatars (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      avatar_id VARCHAR(50) NOT NULL,
      avatar_url TEXT NOT NULL,
      is_selected BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, avatar_id)
    )
  `);

  // Keep generated and uploaded avatar locations untruncated.
  try {
    await sqlQuery(`ALTER TABLE user_avatars ALTER COLUMN avatar_url TYPE TEXT`);
  } catch (err: any) {
    console.warn('Migration: could not widen user_avatars.avatar_url (may already be TEXT):', err?.message);
  }

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON user_avatars(user_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_user_avatars_selected ON user_avatars(user_id, is_selected) WHERE is_selected = true`);
  } catch (err: any) {
    // Indexes might already exist
  }

  // Data migration: generated avatars are now served by the app-owned
  // three-axis renderer. Custom uploads and Academic Angels are untouched.
  try {
    await sqlQuery(`
      UPDATE users
      SET avatar_url = '/api/avatars/render?seed=' || replace(selected_avatar_id, '#', '%23')
      WHERE selected_avatar_id IS NOT NULL
        AND avatar_url LIKE 'https://api.dicebear.com/%'
    `);
    await sqlQuery(`
      UPDATE user_avatars
      SET avatar_url = '/api/avatars/render?seed=' || replace(avatar_id, '#', '%23')
      WHERE avatar_url LIKE 'https://api.dicebear.com/%'
    `);
  } catch (err: any) {
    console.warn('Migration: could not move generated avatars to the three-axis renderer:', err?.message);
  }
}

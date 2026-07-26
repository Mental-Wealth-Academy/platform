import { sqlQuery } from './db';
import { ensureForumSchema } from './ensureForumSchema';

declare global {
  // eslint-disable-next-line no-var
  var __mwaBlueMemorySchemaEnsured: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mwaBlueMemorySchemaLock: Promise<void> | undefined;
}

export async function ensureBlueMemorySchema() {
  if (globalThis.__mwaBlueMemorySchemaEnsured) return;

  if (globalThis.__mwaBlueMemorySchemaLock) {
    await globalThis.__mwaBlueMemorySchemaLock;
    return;
  }

  const lockPromise = (async () => {
    try {
      await ensureForumSchema();
      await _ensureBlueMemorySchemaImpl();
      globalThis.__mwaBlueMemorySchemaEnsured = true;
    } finally {
      globalThis.__mwaBlueMemorySchemaLock = undefined;
    }
  })();

  globalThis.__mwaBlueMemorySchemaLock = lockPromise;
  await lockPromise;
}

async function _ensureBlueMemorySchemaImpl() {
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS blue_chat_messages (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id CHAR(36) NOT NULL,
      role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
      text TEXT NOT NULL,
      request_id VARCHAR(80) NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    ALTER TABLE blue_chat_messages
      ADD COLUMN IF NOT EXISTS request_id VARCHAR(80) NULL
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS blue_memory_facts (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id CHAR(36) NOT NULL,
      category VARCHAR(32) NOT NULL,
      summary TEXT NOT NULL,
      canonical_key VARCHAR(160) NULL,
      confidence NUMERIC(4,3) NOT NULL DEFAULT 0.500,
      source_message_id CHAR(36) NULL,
      evidence_text VARCHAR(240) NULL,
      source_type VARCHAR(32) NOT NULL DEFAULT 'user_statement',
      occurrence_count INTEGER NOT NULL DEFAULT 1,
      superseded_at TIMESTAMP NULL,
      superseded_by_id CHAR(36) NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (source_message_id) REFERENCES blue_chat_messages(id) ON DELETE SET NULL,
      FOREIGN KEY (superseded_by_id) REFERENCES blue_memory_facts(id) ON DELETE SET NULL,
      UNIQUE (user_id, category, summary)
    );
    ALTER TABLE blue_memory_facts
      ADD COLUMN IF NOT EXISTS canonical_key VARCHAR(160) NULL;
    ALTER TABLE blue_memory_facts
      ADD COLUMN IF NOT EXISTS evidence_text VARCHAR(240) NULL;
    ALTER TABLE blue_memory_facts
      ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) NOT NULL DEFAULT 'user_statement';
    ALTER TABLE blue_memory_facts
      ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP NULL;
    ALTER TABLE blue_memory_facts
      ADD COLUMN IF NOT EXISTS superseded_by_id CHAR(36) NULL
  `);
  await sqlQuery(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'blue_memory_facts_superseded_by_id_fkey'
          AND conrelid = 'blue_memory_facts'::regclass
      ) THEN
        ALTER TABLE blue_memory_facts
          ADD CONSTRAINT blue_memory_facts_superseded_by_id_fkey
          FOREIGN KEY (superseded_by_id)
          REFERENCES blue_memory_facts(id)
          ON DELETE SET NULL;
      END IF;
    END
    $$
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS blue_relationship_state (
      user_id CHAR(36) PRIMARY KEY,
      first_interaction_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_interaction_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      interaction_count INTEGER NOT NULL DEFAULT 0,
      last_user_message TEXT NULL,
      last_blue_response TEXT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS blue_memory_outbox (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id CHAR(36) NOT NULL,
      request_id VARCHAR(80) NOT NULL,
      user_message_id CHAR(36) NOT NULL,
      assistant_message_id CHAR(36) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      available_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      claimed_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      last_error VARCHAR(240) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user_message_id) REFERENCES blue_chat_messages(id) ON DELETE CASCADE,
      FOREIGN KEY (assistant_message_id) REFERENCES blue_chat_messages(id) ON DELETE CASCADE,
      UNIQUE (user_id, request_id)
    )
  `);

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_chat_messages_user_created ON blue_chat_messages(user_id, created_at DESC)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_chat_messages_created ON blue_chat_messages(created_at)`);
    await sqlQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_blue_chat_messages_user_request_role
      ON blue_chat_messages(user_id, request_id, role)
      WHERE request_id IS NOT NULL
    `);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_memory_facts_user_updated ON blue_memory_facts(user_id, updated_at DESC)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_memory_facts_user_category ON blue_memory_facts(user_id, category)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_memory_facts_user_event_key ON blue_memory_facts(user_id, (metadata->>'eventKey'))`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_memory_facts_updated ON blue_memory_facts(updated_at)`);
    await sqlQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_blue_memory_facts_user_canonical
      ON blue_memory_facts(user_id, category, canonical_key)
      WHERE canonical_key IS NOT NULL AND superseded_at IS NULL
    `);
    await sqlQuery(`
      CREATE INDEX IF NOT EXISTS idx_blue_memory_outbox_pending
      ON blue_memory_outbox(status, available_at, created_at)
      WHERE status <> 'completed'
    `);
    await sqlQuery(`
      CREATE INDEX IF NOT EXISTS idx_blue_memory_outbox_completed
      ON blue_memory_outbox(completed_at)
      WHERE status = 'completed'
    `);
    await sqlQuery(`
      CREATE INDEX IF NOT EXISTS idx_blue_relationship_state_last_interaction
      ON blue_relationship_state(last_interaction_at)
    `);
  } catch {
    // Indexes may already exist.
  }

  try {
    await sqlQuery(`ALTER TABLE blue_memory_outbox ENABLE ROW LEVEL SECURITY`);
  } catch (err: any) {
    console.warn('Error enabling blue_memory_outbox RLS:', err?.message);
  }

  try {
    await sqlQuery(`DROP TRIGGER IF EXISTS update_blue_memory_facts_updated_at ON blue_memory_facts`);
    await sqlQuery(`
      CREATE TRIGGER update_blue_memory_facts_updated_at BEFORE UPDATE ON blue_memory_facts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  } catch (err: any) {
    console.warn('Error creating blue_memory_facts updated_at trigger:', err?.message);
  }

  try {
    await sqlQuery(`DROP TRIGGER IF EXISTS update_blue_relationship_state_updated_at ON blue_relationship_state`);
    await sqlQuery(`
      CREATE TRIGGER update_blue_relationship_state_updated_at BEFORE UPDATE ON blue_relationship_state
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  } catch (err: any) {
    console.warn('Error creating blue_relationship_state updated_at trigger:', err?.message);
  }

  try {
    await sqlQuery(`DROP TRIGGER IF EXISTS update_blue_memory_outbox_updated_at ON blue_memory_outbox`);
    await sqlQuery(`
      CREATE TRIGGER update_blue_memory_outbox_updated_at BEFORE UPDATE ON blue_memory_outbox
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  } catch (err: any) {
    console.warn('Error creating blue_memory_outbox updated_at trigger:', err?.message);
  }
}

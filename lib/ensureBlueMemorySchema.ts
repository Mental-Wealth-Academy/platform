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
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS blue_memory_facts (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id CHAR(36) NOT NULL,
      category VARCHAR(32) NOT NULL,
      summary TEXT NOT NULL,
      confidence NUMERIC(4,3) NOT NULL DEFAULT 0.500,
      source_message_id CHAR(36) NULL,
      occurrence_count INTEGER NOT NULL DEFAULT 1,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (source_message_id) REFERENCES blue_chat_messages(id) ON DELETE SET NULL,
      UNIQUE (user_id, category, summary)
    )
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

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_chat_messages_user_created ON blue_chat_messages(user_id, created_at DESC)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_memory_facts_user_updated ON blue_memory_facts(user_id, updated_at DESC)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_memory_facts_user_category ON blue_memory_facts(user_id, category)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_memory_facts_user_event_key ON blue_memory_facts(user_id, (metadata->>'eventKey'))`);
  } catch {
    // Indexes may already exist.
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
}

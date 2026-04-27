import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaCustomQuestsSchemaEnsured: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mwaCustomQuestsSchemaLock: Promise<void> | undefined;
}

export async function ensureCustomQuestsSchema() {
  if (globalThis.__mwaCustomQuestsSchemaEnsured) return;

  if (globalThis.__mwaCustomQuestsSchemaLock) {
    await globalThis.__mwaCustomQuestsSchemaLock;
    return;
  }

  const lockPromise = (async () => {
    try {
      await _ensureCustomQuestsSchemaImpl();
      globalThis.__mwaCustomQuestsSchemaEnsured = true;
    } finally {
      globalThis.__mwaCustomQuestsSchemaLock = undefined;
    }
  })();

  globalThis.__mwaCustomQuestsSchemaLock = lockPromise;
  await lockPromise;
}

async function _ensureCustomQuestsSchemaImpl() {
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS custom_quests (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 50,
      quest_type VARCHAR(40) NOT NULL DEFAULT 'no-proof',
      target_count INTEGER NOT NULL DEFAULT 1,
      created_by CHAR(36) NOT NULL,
      creator_wallet VARCHAR(255) NOT NULL,
      creator_handle VARCHAR(64),
      assignee_wallet VARCHAR(255),
      expires_at TIMESTAMP,
      archived_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_custom_quests_created_by ON custom_quests(created_by)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_custom_quests_assignee ON custom_quests(LOWER(assignee_wallet))`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_custom_quests_active ON custom_quests(archived_at) WHERE archived_at IS NULL`);
  } catch {
    // indexes may already exist
  }
}

import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaPrayersSchemaEnsured: boolean | undefined;
}

export async function ensurePrayersSchema() {
  if (globalThis.__mwaPrayersSchemaEnsured) return;

  // Migrate from old table: move week_number=99 rows into prayers
  try {
    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS prayers (
        id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id CHAR(36) NOT NULL,
        progress_data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id)
      )
    `);
  } catch {
    // table may already exist
  }

  // Migrate old data from ethereal_progress or weeks (after rename)
  for (const oldTable of ['ethereal_progress', 'weeks']) {
    try {
      await sqlQuery(`
        INSERT INTO prayers (id, user_id, progress_data, created_at, updated_at)
        SELECT id, user_id, progress_data, created_at, updated_at
        FROM ${oldTable}
        WHERE week_number = 99
        ON CONFLICT (user_id) DO NOTHING
      `);
      await sqlQuery(`DELETE FROM ${oldTable} WHERE week_number = 99`);
    } catch {
      // table may not exist or migration already done
    }
  }

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_prayers_user_id ON prayers(user_id)`);
  } catch {
    // index may already exist
  }

  try {
    await sqlQuery(`DROP TRIGGER IF EXISTS update_prayers_updated_at ON prayers`);
    await sqlQuery(`
      CREATE TRIGGER update_prayers_updated_at BEFORE UPDATE ON prayers
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  } catch {
    // trigger may already exist
  }

  globalThis.__mwaPrayersSchemaEnsured = true;
}

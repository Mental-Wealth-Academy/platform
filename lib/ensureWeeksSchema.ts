import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaWeeksSchemaEnsured: boolean | undefined;
}

export async function ensureWeeksSchema() {
  if (globalThis.__mwaWeeksSchemaEnsured) return;

  // Migrate from old table name if it exists
  try {
    await sqlQuery(`ALTER TABLE IF EXISTS ethereal_progress RENAME TO weeks`);
  } catch {
    // Already renamed or doesn't exist
  }

  // Also handle the even older name
  try {
    await sqlQuery(`ALTER TABLE IF EXISTS wealth_progress RENAME TO weeks`);
  } catch {
    // Already renamed or doesn't exist
  }

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS weeks (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id CHAR(36) NOT NULL,
      week_number INTEGER NOT NULL CHECK (week_number >= 0 AND week_number <= 13),
      progress_data JSONB NOT NULL DEFAULT '{}',
      is_sealed BOOLEAN NOT NULL DEFAULT false,
      seal_tx_hash VARCHAR(255) NULL,
      seal_content_hash VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, week_number)
    )
  `);

  // Fix check constraint (old table allowed up to 99 for prayers)
  try {
    await sqlQuery(`ALTER TABLE weeks DROP CONSTRAINT IF EXISTS ethereal_progress_week_number_check`);
    await sqlQuery(`ALTER TABLE weeks DROP CONSTRAINT IF EXISTS weeks_week_number_check`);
    await sqlQuery(`ALTER TABLE weeks ADD CONSTRAINT weeks_week_number_check CHECK (week_number >= 0 AND week_number <= 13)`);
  } catch {
    // constraint may already be correct
  }

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_weeks_user_id ON weeks(user_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_weeks_user_week ON weeks(user_id, week_number)`);
  } catch {
    // indexes may already exist
  }

  try {
    await sqlQuery(`DROP TRIGGER IF EXISTS update_weeks_updated_at ON weeks`);
    await sqlQuery(`
      CREATE TRIGGER update_weeks_updated_at BEFORE UPDATE ON weeks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  } catch {
    // trigger may already exist
  }

  globalThis.__mwaWeeksSchemaEnsured = true;
}

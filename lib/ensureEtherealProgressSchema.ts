import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaEtherealProgressSchemaEnsured: boolean | undefined;
}

export async function ensureEtherealProgressSchema() {
  if (globalThis.__mwaEtherealProgressSchemaEnsured) return;

  // Migrate old table name if it exists
  try {
    await sqlQuery(`ALTER TABLE IF EXISTS wealth_progress RENAME TO ethereal_progress`);
  } catch {
    // Already renamed or doesn't exist — fine
  }

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS ethereal_progress (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id CHAR(36) NOT NULL,
      week_number INTEGER NOT NULL CHECK (week_number >= 0 AND week_number <= 99),
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

  // Update check constraint to allow week 99 (daily notes)
  try {
    await sqlQuery(`ALTER TABLE ethereal_progress DROP CONSTRAINT IF EXISTS ethereal_progress_week_number_check`);
    await sqlQuery(`ALTER TABLE ethereal_progress ADD CONSTRAINT ethereal_progress_week_number_check CHECK (week_number >= 0 AND week_number <= 99)`);
  } catch {
    // constraint may already be updated
  }

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_ethereal_progress_user_id ON ethereal_progress(user_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_ethereal_progress_user_week ON ethereal_progress(user_id, week_number)`);
  } catch (err: any) {
    console.warn('Error creating ethereal_progress indexes:', err);
  }

  // Create trigger for updated_at
  try {
    await sqlQuery(`
      DROP TRIGGER IF EXISTS update_ethereal_progress_updated_at ON ethereal_progress
    `);
    await sqlQuery(`
      CREATE TRIGGER update_ethereal_progress_updated_at BEFORE UPDATE ON ethereal_progress
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  } catch (err: any) {
    console.warn('Error creating ethereal_progress updated_at trigger:', err);
  }

  globalThis.__mwaEtherealProgressSchemaEnsured = true;
}

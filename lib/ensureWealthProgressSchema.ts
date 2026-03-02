import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaWealthProgressSchemaEnsured: boolean | undefined;
}

export async function ensureWealthProgressSchema() {
  if (globalThis.__mwaWealthProgressSchemaEnsured) return;

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS wealth_progress (
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

  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_wealth_progress_user_id ON wealth_progress(user_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_wealth_progress_user_week ON wealth_progress(user_id, week_number)`);
  } catch (err: any) {
    console.warn('Error creating wealth_progress indexes:', err);
  }

  // Create trigger for updated_at
  try {
    await sqlQuery(`
      DROP TRIGGER IF EXISTS update_wealth_progress_updated_at ON wealth_progress
    `);
    await sqlQuery(`
      CREATE TRIGGER update_wealth_progress_updated_at BEFORE UPDATE ON wealth_progress
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  } catch (err: any) {
    console.warn('Error creating wealth_progress updated_at trigger:', err);
  }

  globalThis.__mwaWealthProgressSchemaEnsured = true;
}

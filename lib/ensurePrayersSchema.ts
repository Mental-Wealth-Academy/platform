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



  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_prayers_user_id ON prayers(user_id)`);
  } catch {
    // index may already exist
  }

  // Server-owned reward evidence. The encrypted prayer blob remains private
  // user content and is never trusted as the authorization ledger.
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS daily_note_completions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id CHAR(36) NOT NULL,
      week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 12),
      day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
      reward_day DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, week_number, day_number),
      UNIQUE (user_id, reward_day)
    )
  `);
  await sqlQuery(`ALTER TABLE daily_note_completions ENABLE ROW LEVEL SECURITY`);
  await sqlQuery(`
    CREATE INDEX IF NOT EXISTS idx_daily_note_completions_user
    ON daily_note_completions(user_id, week_number, day_number)
  `);

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

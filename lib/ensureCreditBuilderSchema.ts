import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaCreditBuilderSchemaEnsured: boolean | undefined;
}

export async function ensureCreditBuilderSchema() {
  if (globalThis.__mwaCreditBuilderSchemaEnsured) return;

  // Credit profiles -- stores user credit data and AI audit results
  try {
    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS credit_profiles (
        id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id CHAR(36) NOT NULL,
        current_step VARCHAR(30) NOT NULL DEFAULT 'intake',
        credit_data JSONB NOT NULL DEFAULT '{}',
        audit_result JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id)
      )
    `);
  } catch {
    // table may already exist
  }

  // Credit disputes -- individual dispute letters and their status
  try {
    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS credit_disputes (
        id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id CHAR(36) NOT NULL,
        profile_id CHAR(36) NOT NULL,
        dispute_type VARCHAR(50) NOT NULL,
        target_bureau VARCHAR(20),
        target_entity VARCHAR(255),
        account_ref VARCHAR(255),
        letter_content TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        sent_at TIMESTAMP,
        response_due TIMESTAMP,
        resolved_at TIMESTAMP,
        resolution_note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (profile_id) REFERENCES credit_profiles(id) ON DELETE CASCADE
      )
    `);
  } catch {
    // table may already exist
  }

  // Business credit progress -- phase-based checklist tracking
  try {
    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS credit_business_progress (
        id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id CHAR(36) NOT NULL,
        current_phase VARCHAR(30) NOT NULL DEFAULT 'foundation',
        phase_data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id)
      )
    `);
  } catch {
    // table may already exist
  }

  // Indexes
  try {
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_credit_profiles_user_id ON credit_profiles(user_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_credit_disputes_user_id ON credit_disputes(user_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_credit_disputes_profile_id ON credit_disputes(profile_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_credit_disputes_status ON credit_disputes(status)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_credit_disputes_response_due ON credit_disputes(response_due)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_credit_business_progress_user_id ON credit_business_progress(user_id)`);
  } catch {
    // indexes may already exist
  }

  // Update triggers
  for (const table of ['credit_profiles', 'credit_disputes', 'credit_business_progress']) {
    try {
      await sqlQuery(`DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table}`);
      await sqlQuery(`
        CREATE TRIGGER update_${table}_updated_at BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    } catch {
      // trigger may already exist
    }
  }

  globalThis.__mwaCreditBuilderSchemaEnsured = true;
}

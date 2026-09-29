import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaGuidanceSchemaEnsured: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mwaGuidanceSchemaLock: Promise<void> | undefined;
}

export async function ensureGuidanceSchema() {
  if (globalThis.__mwaGuidanceSchemaEnsured) return;

  if (globalThis.__mwaGuidanceSchemaLock) {
    await globalThis.__mwaGuidanceSchemaLock;
    return;
  }

  const lockPromise = (async () => {
    try {
      await sqlQuery(
        `CREATE TABLE IF NOT EXISTS practitioner_consultations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          name TEXT DEFAULT 'Academy Member',
          email TEXT DEFAULT 'in-app-message',
          contact TEXT DEFAULT 'in-app-message',
          focus_area TEXT,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          stripe_session_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        ALTER TABLE practitioner_consultations ALTER COLUMN name DROP NOT NULL;
        ALTER TABLE practitioner_consultations ALTER COLUMN email DROP NOT NULL;`,
        {}
      );
      globalThis.__mwaGuidanceSchemaEnsured = true;
    } finally {
      globalThis.__mwaGuidanceSchemaLock = undefined;
    }
  })();

  globalThis.__mwaGuidanceSchemaLock = lockPromise;
  await lockPromise;
}

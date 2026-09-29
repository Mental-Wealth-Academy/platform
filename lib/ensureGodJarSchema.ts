import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaGodJarSchemaEnsured: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mwaGodJarSchemaLock: Promise<void> | undefined;
}

export async function ensureGodJarSchema() {
  if (globalThis.__mwaGodJarSchemaEnsured) return;

  if (globalThis.__mwaGodJarSchemaLock) {
    await globalThis.__mwaGodJarSchemaLock;
    return;
  }

  const lockPromise = (async () => {
    try {
      await sqlQuery(
        `CREATE TABLE IF NOT EXISTS god_jar_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`,
        {}
      );
      globalThis.__mwaGodJarSchemaEnsured = true;
    } finally {
      globalThis.__mwaGodJarSchemaLock = undefined;
    }
  })();

  globalThis.__mwaGodJarSchemaLock = lockPromise;
  await lockPromise;
}

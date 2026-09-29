import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaChatSchemaEnsured: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mwaChatSchemaLock: Promise<void> | undefined;
}

export async function ensureChatSchema() {
  if (globalThis.__mwaChatSchemaEnsured) return;

  if (globalThis.__mwaChatSchemaLock) {
    await globalThis.__mwaChatSchemaLock;
    return;
  }

  const lockPromise = (async () => {
    try {
      await sqlQuery(
        `CREATE TABLE IF NOT EXISTS chat_messages (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          avatar_url TEXT,
          message TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'user',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`,
        {}
      );
      await sqlQuery(
        `CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
         ON chat_messages (created_at DESC)`,
        {}
      );
      await sqlQuery(
        `ALTER TABLE chat_messages
         ADD COLUMN IF NOT EXISTS survey_badge TEXT`,
        {}
      );
      await sqlQuery(
        `CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
         ON chat_messages (user_id)`,
        {}
      );

      globalThis.__mwaChatSchemaEnsured = true;
    } finally {
      globalThis.__mwaChatSchemaLock = undefined;
    }
  })();

  globalThis.__mwaChatSchemaLock = lockPromise;
  await lockPromise;
}

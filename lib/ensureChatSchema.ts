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
      await sqlQuery(
        `UPDATE chat_messages
         SET avatar_url = '/api/avatars/render?seed=' || substring(avatar_url FROM '[?&]seed=([^&]+)')
         WHERE avatar_url LIKE 'https://api.dicebear.com/%'
           AND substring(avatar_url FROM '[?&]seed=([^&]+)') IS NOT NULL`,
        {}
      );
      try {
        await sqlQuery(
          `UPDATE chat_messages cm
           SET survey_badge = sub.badge
           FROM (
             SELECT DISTINCT ON (user_id)
               user_id,
               json_build_object(
                 'surveyId', survey_id,
                 'surveyTitle', CASE
                   WHEN survey_id = 'attachment-style' THEN 'Attachment Style'
                   WHEN survey_id = 'big-five' THEN 'Big Five'
                   WHEN survey_id = 'moral-foundations' THEN 'Moral Foundations'
                   WHEN survey_id = 'via-character-strengths' THEN 'Character Strengths'
                   ELSE 'Survey'
                 END,
                 'result', profile_type,
                 'badge', profile_type,
                 'colorVar', CASE
                   WHEN survey_id = 'attachment-style' THEN '--color-survey-tab-attachment'
                   WHEN survey_id = 'big-five' THEN '--color-survey-tab-bigfive'
                   WHEN survey_id = 'moral-foundations' THEN '--color-survey-tab-moral'
                   WHEN survey_id = 'via-character-strengths' THEN '--color-survey-tab-strengths'
                   ELSE '--color-primary'
                 END
               )::text AS badge
             FROM survey_completions
             ORDER BY user_id, completed_at DESC
           ) sub
           WHERE cm.user_id = sub.user_id AND cm.survey_badge IS NULL`,
          {}
        );
      } catch {
        // non-fatal if survey_completions does not exist yet
      }
      globalThis.__mwaChatSchemaEnsured = true;
    } finally {
      globalThis.__mwaChatSchemaLock = undefined;
    }
  })();

  globalThis.__mwaChatSchemaLock = lockPromise;
  await lockPromise;
}

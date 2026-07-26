import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaAiRuntimeSchemaEnsured: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mwaAiRuntimeSchemaLock: Promise<void> | undefined;
}

export async function ensureAiRuntimeSchema(): Promise<void> {
  if (globalThis.__mwaAiRuntimeSchemaEnsured) return;
  if (globalThis.__mwaAiRuntimeSchemaLock) {
    await globalThis.__mwaAiRuntimeSchemaLock;
    return;
  }

  const lock = (async () => {
    try {
      await ensureImpl();
      globalThis.__mwaAiRuntimeSchemaEnsured = true;
    } finally {
      globalThis.__mwaAiRuntimeSchemaLock = undefined;
    }
  })();
  globalThis.__mwaAiRuntimeSchemaLock = lock;
  await lock;
}

async function ensureImpl(): Promise<void> {
  await sqlQuery(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS ai_request_telemetry (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      request_id VARCHAR(128) NOT NULL,
      task VARCHAR(64) NOT NULL,
      provider VARCHAR(32) NULL,
      actual_model VARCHAR(160) NULL,
      prompt_version VARCHAR(96) NOT NULL,
      duration_ms INTEGER NOT NULL,
      input_tokens INTEGER NULL,
      output_tokens INTEGER NULL,
      retry_count SMALLINT NOT NULL DEFAULT 0,
      retry_reason VARCHAR(160) NULL,
      fallback_reason VARCHAR(240) NULL,
      schema_valid BOOLEAN NULL,
      cache_status VARCHAR(24) NOT NULL,
      status VARCHAR(16) NOT NULL,
      error_code VARCHAR(80) NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT ai_request_telemetry_duration_check CHECK (duration_ms >= 0),
      CONSTRAINT ai_request_telemetry_status_check CHECK (status IN ('succeeded', 'failed')),
      CONSTRAINT ai_request_telemetry_cache_check CHECK (
        cache_status IN ('bypass', 'hit', 'miss', 'write_failed')
      )
    )
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS ai_response_cache (
      cache_key VARCHAR(128) PRIMARY KEY,
      task VARCHAR(64) NOT NULL,
      prompt_version VARCHAR(96) NOT NULL,
      provider VARCHAR(32) NOT NULL,
      actual_model VARCHAR(160) NOT NULL,
      response_text TEXT NOT NULL,
      usage JSONB NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS ai_jobs (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      idempotency_key VARCHAR(160) NOT NULL UNIQUE,
      task VARCHAR(64) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      result JSONB NULL,
      attempts SMALLINT NOT NULL DEFAULT 0,
      max_attempts SMALLINT NOT NULL DEFAULT 3,
      last_error_code VARCHAR(80) NULL,
      request_id VARCHAR(128) NULL,
      lease_token VARCHAR(128) NULL,
      locked_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT ai_jobs_status_check CHECK (
        status IN ('pending', 'running', 'succeeded', 'failed')
      ),
      CONSTRAINT ai_jobs_attempts_check CHECK (
        attempts >= 0 AND max_attempts BETWEEN 1 AND 10
      )
    )
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS ai_rate_limit_windows (
      scope_key VARCHAR(160) NOT NULL,
      window_started_at TIMESTAMPTZ NOT NULL,
      window_seconds INTEGER NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (scope_key, window_started_at, window_seconds),
      CONSTRAINT ai_rate_limit_window_seconds_check CHECK (
        window_seconds BETWEEN 1 AND 86400
      ),
      CONSTRAINT ai_rate_limit_request_count_check CHECK (request_count >= 0)
    )
  `);
  await sqlQuery(
    `ALTER TABLE ai_jobs ADD COLUMN IF NOT EXISTS lease_token VARCHAR(128) NULL`,
  );

  await sqlQuery(
    `CREATE INDEX IF NOT EXISTS idx_ai_request_telemetry_task_created
     ON ai_request_telemetry(task, created_at DESC)`,
  );
  await sqlQuery(
    `CREATE INDEX IF NOT EXISTS idx_ai_request_telemetry_request
     ON ai_request_telemetry(request_id)`,
  );
  await sqlQuery(
    `CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expiry
     ON ai_response_cache(expires_at)`,
  );
  await sqlQuery(
    `CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_updated
     ON ai_jobs(status, updated_at)`,
  );
  await sqlQuery(
    `CREATE INDEX IF NOT EXISTS idx_ai_rate_limit_windows_started
     ON ai_rate_limit_windows(window_started_at)`,
  );

  await sqlQuery(`ALTER TABLE ai_request_telemetry ENABLE ROW LEVEL SECURITY`);
  await sqlQuery(`ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY`);
  await sqlQuery(`ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY`);
  await sqlQuery(`ALTER TABLE ai_rate_limit_windows ENABLE ROW LEVEL SECURITY`);

  // The running app currently uses postgres/BYPASSRLS. Keep the prepared
  // app_service transition functional when that role exists, without granting
  // either Supabase Data API role access to these internal tables.
  await sqlQuery(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN
        GRANT SELECT, INSERT ON ai_request_telemetry TO app_service;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ai_response_cache TO app_service;
        GRANT SELECT, INSERT, UPDATE ON ai_jobs TO app_service;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ai_rate_limit_windows TO app_service;
      END IF;
    END
    $$
  `);
  await sqlQuery(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'ai_request_telemetry'
            AND policyname = 'ai_request_telemetry_service'
        ) THEN
          CREATE POLICY ai_request_telemetry_service
            ON ai_request_telemetry TO app_service
            USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'ai_response_cache'
            AND policyname = 'ai_response_cache_service'
        ) THEN
          CREATE POLICY ai_response_cache_service
            ON ai_response_cache TO app_service
            USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'ai_jobs'
            AND policyname = 'ai_jobs_service'
        ) THEN
          CREATE POLICY ai_jobs_service
            ON ai_jobs TO app_service
            USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'ai_rate_limit_windows'
            AND policyname = 'ai_rate_limit_windows_service'
        ) THEN
          CREATE POLICY ai_rate_limit_windows_service
            ON ai_rate_limit_windows TO app_service
            USING (true) WITH CHECK (true);
        END IF;
      END IF;
    END
    $$
  `);
}

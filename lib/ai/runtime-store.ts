import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureAiRuntimeSchema } from '@/lib/ensureAiRuntimeSchema';
import type {
  AiCachedResponse,
  AiResponseCache,
  AiTaskName,
  AiTelemetryEvent,
  AiTelemetrySink,
} from './types';

function clampInteger(value: number | null | undefined): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(2_147_483_647, Math.round(Number(value))));
}

function safeCode(value: string | null, max: number): string | null {
  if (!value) return null;
  const sanitized = value.replace(/[^a-z0-9_.,:-]/gi, '_').slice(0, max);
  return sanitized || null;
}

export class DatabaseAiTelemetrySink implements AiTelemetrySink {
  async record(event: AiTelemetryEvent): Promise<void> {
    if (!isDbConfigured()) return;
    try {
      await ensureAiRuntimeSchema();
      await sqlQuery(
        `INSERT INTO ai_request_telemetry (
           request_id, task, provider, actual_model, prompt_version,
           duration_ms, input_tokens, output_tokens, retry_count,
           retry_reason, fallback_reason, schema_valid, cache_status,
           status, error_code
         ) VALUES (
           :requestId, :task, :provider, :actualModel, :promptVersion,
           :durationMs, :inputTokens, :outputTokens, :retryCount,
           :retryReason, :fallbackReason, :schemaValid, :cacheStatus,
           :status, :errorCode
         )`,
        {
          requestId: event.requestId.slice(0, 128),
          task: event.task.slice(0, 64),
          provider: event.provider,
          actualModel: event.actualModel?.slice(0, 160) ?? null,
          promptVersion: event.promptVersion.slice(0, 96),
          durationMs: clampInteger(event.durationMs) ?? 0,
          inputTokens: clampInteger(event.inputTokens),
          outputTokens: clampInteger(event.outputTokens),
          retryCount: Math.max(0, Math.min(32_767, Math.round(event.retryCount))),
          retryReason: safeCode(event.retryReason, 160),
          fallbackReason: safeCode(event.fallbackReason, 240),
          schemaValid: event.schemaValid,
          cacheStatus: event.cacheStatus,
          status: event.status,
          errorCode: safeCode(event.errorCode, 80),
        },
      );
    } catch (error) {
      // Telemetry must never take down a product request. Keep the log
      // structured and free of prompts, responses, or personal content.
      console.error('[ai-telemetry] write_failed', {
        task: event.task,
        requestId: event.requestId,
        code: error instanceof Error ? 'database_write_failed' : 'unknown_write_failed',
      });
    }
  }
}

interface CacheRow {
  response_text: string;
  provider: 'deepseek' | 'eliza';
  actual_model: string;
  prompt_version: string;
  usage: unknown;
}

export class DatabaseAiResponseCache implements AiResponseCache {
  async get(task: AiTaskName, key: string): Promise<AiCachedResponse | null> {
    if (!isDbConfigured()) return null;
    await ensureAiRuntimeSchema();
    const rows = await sqlQuery<CacheRow[]>(
      `SELECT response_text, provider, actual_model, prompt_version, usage
       FROM ai_response_cache
       WHERE cache_key = :key
         AND task = :task
         AND expires_at > now()
       LIMIT 1`,
      { key: key.slice(0, 128), task },
    );
    const row = rows[0];
    if (!row) return null;
    const usage =
      row.usage && typeof row.usage === 'object'
        ? (row.usage as AiCachedResponse['usage'])
        : undefined;
    return {
      text: row.response_text,
      provider: row.provider,
      actualModel: row.actual_model,
      promptVersion: row.prompt_version,
      usage,
    };
  }

  async set(args: {
    task: AiTaskName;
    key: string;
    value: AiCachedResponse;
    ttlSeconds: number;
  }): Promise<void> {
    if (!isDbConfigured()) return;
    await ensureAiRuntimeSchema();
    const ttlSeconds = Math.max(60, Math.min(2_592_000, Math.round(args.ttlSeconds)));
    await sqlQuery(
      `INSERT INTO ai_response_cache (
         cache_key, task, prompt_version, provider, actual_model,
         response_text, usage, expires_at
       ) VALUES (
         :key, :task, :promptVersion, :provider, :actualModel,
         :responseText, :usage::jsonb, now() + (:ttlSeconds * interval '1 second')
       )
       ON CONFLICT (cache_key) DO UPDATE SET
         task = EXCLUDED.task,
         prompt_version = EXCLUDED.prompt_version,
         provider = EXCLUDED.provider,
         actual_model = EXCLUDED.actual_model,
         response_text = EXCLUDED.response_text,
         usage = EXCLUDED.usage,
         expires_at = EXCLUDED.expires_at,
         updated_at = now()`,
      {
        key: args.key.slice(0, 128),
        task: args.task,
        promptVersion: args.value.promptVersion.slice(0, 96),
        provider: args.value.provider,
        actualModel: args.value.actualModel.slice(0, 160),
        responseText: args.value.text,
        usage: args.value.usage ? JSON.stringify(args.value.usage) : null,
        ttlSeconds,
      },
    );
  }
}

export const databaseAiTelemetry = new DatabaseAiTelemetrySink();
export const databaseAiResponseCache = new DatabaseAiResponseCache();

export interface AiJobRecord {
  id: string;
  idempotencyKey: string;
  task: AiTaskName;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  attempts: number;
  maxAttempts: number;
  result: unknown;
  leaseToken: string | null;
}

interface AiJobRow {
  id: string;
  idempotency_key: string;
  task: AiTaskName;
  status: AiJobRecord['status'];
  attempts: number;
  max_attempts: number;
  result: unknown;
  lease_token: string | null;
}

function mapJob(row: AiJobRow): AiJobRecord {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    task: row.task,
    status: row.status,
    attempts: Number(row.attempts),
    maxAttempts: Number(row.max_attempts),
    result: row.result,
    leaseToken: row.lease_token,
  };
}

export async function enqueueAiJob(args: {
  idempotencyKey: string;
  task: AiTaskName;
  payload: unknown;
  maxAttempts?: number;
}): Promise<AiJobRecord> {
  await ensureAiRuntimeSchema();
  const rows = await sqlQuery<AiJobRow[]>(
    `INSERT INTO ai_jobs (idempotency_key, task, payload, max_attempts)
     VALUES (:key, :task, :payload::jsonb, :maxAttempts)
     ON CONFLICT (idempotency_key) DO UPDATE SET
       payload = CASE
         WHEN ai_jobs.status = 'succeeded' THEN ai_jobs.payload
         ELSE EXCLUDED.payload
       END,
       updated_at = now()
     RETURNING id, idempotency_key, task, status, attempts, max_attempts, result, lease_token`,
    {
      key: args.idempotencyKey.slice(0, 160),
      task: args.task,
      payload: JSON.stringify(args.payload ?? {}),
      maxAttempts: Math.max(1, Math.min(10, Math.round(args.maxAttempts ?? 3))),
    },
  );
  return mapJob(rows[0]);
}

export async function claimAiJob(args: {
  idempotencyKey: string;
  requestId: string;
  leaseToken: string;
}): Promise<AiJobRecord | null> {
  await ensureAiRuntimeSchema();
  const rows = await sqlQuery<AiJobRow[]>(
    `UPDATE ai_jobs
     SET status = 'running',
         attempts = attempts + 1,
         request_id = :requestId,
         lease_token = :leaseToken,
         locked_at = now(),
         last_error_code = NULL,
         updated_at = now()
     WHERE idempotency_key = :key
       AND attempts < max_attempts
       AND (
         status IN ('pending', 'failed')
         OR (status = 'running' AND locked_at < now() - interval '2 minutes')
       )
     RETURNING id, idempotency_key, task, status, attempts, max_attempts, result, lease_token`,
    {
      key: args.idempotencyKey.slice(0, 160),
      requestId: args.requestId.slice(0, 128),
      leaseToken: args.leaseToken.slice(0, 128),
    },
  );
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function completeAiJob(
  idempotencyKey: string,
  leaseToken: string,
  result: unknown,
): Promise<boolean> {
  await ensureAiRuntimeSchema();
  const rows = await sqlQuery<Array<{ id: string }>>(
    `UPDATE ai_jobs
     SET status = 'succeeded',
         result = :result::jsonb,
         locked_at = NULL,
         lease_token = NULL,
         last_error_code = NULL,
         updated_at = now()
     WHERE idempotency_key = :key
       AND status = 'running'
       AND lease_token = :leaseToken
     RETURNING id`,
    {
      key: idempotencyKey.slice(0, 160),
      leaseToken: leaseToken.slice(0, 128),
      result: JSON.stringify(result ?? {}),
    },
  );
  return rows.length === 1;
}

export async function failAiJob(
  idempotencyKey: string,
  leaseToken: string,
  errorCode: string,
): Promise<boolean> {
  await ensureAiRuntimeSchema();
  const rows = await sqlQuery<Array<{ id: string }>>(
    `UPDATE ai_jobs
     SET status = 'failed',
         locked_at = NULL,
         lease_token = NULL,
         last_error_code = :errorCode,
         updated_at = now()
     WHERE idempotency_key = :key
       AND status = 'running'
       AND lease_token = :leaseToken
     RETURNING id`,
    {
      key: idempotencyKey.slice(0, 160),
      leaseToken: leaseToken.slice(0, 128),
      errorCode: safeCode(errorCode, 80),
    },
  );
  return rows.length === 1;
}

import { createHash } from 'node:crypto';
import { sqlQuery } from '@/lib/db';
import { ensureAiRuntimeSchema } from '@/lib/ensureAiRuntimeSchema';

export interface AiRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface AiRateLimitRow {
  request_count: number | string;
  reset_at: string | Date;
}

function boundedInteger(
  value: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be finite`);
  }
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

function scopeKey(scope: string, identifier: string): string {
  const safeScope = scope
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '_')
    .slice(0, 48);
  const digest = createHash('sha256')
    .update(identifier)
    .digest('hex');
  return `${safeScope || 'ai'}:${digest}`;
}

/**
 * Atomically consumes a database-backed fixed-window allowance.
 *
 * The identifier is hashed before storage. The database clock defines the
 * window, which keeps separate serverless instances consistent.
 *
 * `cost` lets a caller spend more than one unit per request, so a budget can be
 * denominated in something other than request count. Voice synthesis spends
 * characters; ordinary callers leave it at the default of one.
 */
export async function consumeAiRateLimit(args: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
  cost?: number;
}): Promise<AiRateLimitResult> {
  const limit = boundedInteger(args.limit, 1, 100_000_000, 'limit');
  const windowSeconds = boundedInteger(
    args.windowSeconds,
    1,
    86_400,
    'windowSeconds',
  );
  const cost = boundedInteger(args.cost ?? 1, 1, 100_000_000, 'cost');
  if (!args.identifier.trim()) {
    throw new TypeError('identifier is required');
  }

  await ensureAiRuntimeSchema();
  const rows = await sqlQuery<AiRateLimitRow[]>(
    `WITH current_window AS (
       SELECT to_timestamp(
         floor(extract(epoch FROM clock_timestamp()) / :windowSeconds)
         * :windowSeconds
       ) AS window_started_at
     ),
     consumed AS (
       INSERT INTO ai_rate_limit_windows (
         scope_key,
         window_started_at,
         window_seconds,
         request_count,
         updated_at
       )
       SELECT
         :scopeKey,
         current_window.window_started_at,
         :windowSeconds,
         :cost,
         now()
       FROM current_window
       ON CONFLICT (scope_key, window_started_at, window_seconds)
       DO UPDATE SET
         request_count = ai_rate_limit_windows.request_count + :cost,
         updated_at = now()
       RETURNING request_count, window_started_at, window_seconds
     )
     SELECT
       request_count,
       window_started_at + (window_seconds * interval '1 second') AS reset_at
     FROM consumed`,
    {
      scopeKey: scopeKey(args.scope, args.identifier),
      windowSeconds,
      cost,
    },
  );
  const row = rows[0];
  if (!row) {
    throw new Error('AI rate limit did not return a result');
  }

  const count = Number(row.request_count);
  const resetAt = new Date(row.reset_at).getTime();
  if (!Number.isFinite(count) || !Number.isFinite(resetAt)) {
    throw new Error('AI rate limit returned an invalid result');
  }

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

export function getAiRateLimitHeaders(
  result: AiRateLimitResult,
): Record<string, string> {
  return {
    'Retry-After': String(
      Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1_000)),
    ),
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };
}

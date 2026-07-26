import { NextResponse } from 'next/server';
import {
  isDbConfigured,
  sqlQueryWithClient,
  withTransaction,
} from '@/lib/db';
import { ensureAiRuntimeSchema } from '@/lib/ensureAiRuntimeSchema';
import { ensureBlueMemorySchema } from '@/lib/ensureBlueMemorySchema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Blue memory retention policy:
 * - expired distributed rate-limit windows: 2 days
 * - completed extraction jobs: 7 days
 * - superseded facts: 30 days
 * - raw conversation text: 90 days
 * - active distilled facts and relationship state: 365 days without refresh
 */
async function runRetention(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'cron_unconfigured' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'not_authorized' }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }

  try {
    await Promise.all([
      ensureBlueMemorySchema(),
      ensureAiRuntimeSchema(),
    ]);
    const result = await withTransaction(async (client) => {
      const rateLimitWindows = await sqlQueryWithClient<Array<{ scope_key: string }>>(
        client,
        `DELETE FROM ai_rate_limit_windows
         WHERE window_started_at < NOW() - INTERVAL '2 days'
         RETURNING scope_key`,
      );
      const completedJobs = await sqlQueryWithClient<Array<{ id: string }>>(
        client,
        `DELETE FROM blue_memory_outbox
         WHERE status = 'completed'
           AND completed_at < NOW() - INTERVAL '7 days'
         RETURNING id`,
      );
      const facts = await sqlQueryWithClient<Array<{ id: string }>>(
        client,
        `DELETE FROM blue_memory_facts
         WHERE (
           superseded_at IS NOT NULL
           AND superseded_at < NOW() - INTERVAL '30 days'
         )
         OR updated_at < NOW() - INTERVAL '365 days'
         RETURNING id`,
      );
      const messages = await sqlQueryWithClient<Array<{ id: string }>>(
        client,
        `DELETE FROM blue_chat_messages
         WHERE created_at < NOW() - INTERVAL '90 days'
         RETURNING id`,
      );
      const redactedRelationships = await sqlQueryWithClient<Array<{ user_id: string }>>(
        client,
        `UPDATE blue_relationship_state
         SET last_user_message = NULL,
             last_blue_response = NULL,
             updated_at = NOW()
         WHERE last_interaction_at < NOW() - INTERVAL '90 days'
           AND (
             last_user_message IS NOT NULL
             OR last_blue_response IS NOT NULL
           )
         RETURNING user_id`,
      );
      const relationships = await sqlQueryWithClient<Array<{ user_id: string }>>(
        client,
        `DELETE FROM blue_relationship_state
         WHERE last_interaction_at < NOW() - INTERVAL '365 days'
         RETURNING user_id`,
      );

      return {
        rateLimitWindows: rateLimitWindows.length,
        completedJobs: completedJobs.length,
        facts: facts.length,
        messages: messages.length,
        redactedRelationships: redactedRelationships.length,
        relationships: relationships.length,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: 'retention_failed' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return runRetention(request);
}

export async function POST(request: Request) {
  return runRetention(request);
}

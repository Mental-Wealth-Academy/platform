import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import {
  consumeAiRateLimit,
  getAiRateLimitHeaders,
} from '@/lib/ai';
import {
  isDbConfigured,
  sqlQueryWithClient,
  withTransaction,
} from '@/lib/db';
import { ensureBlueMemorySchema } from '@/lib/ensureBlueMemorySchema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Erases Blue's private conversational memory for the authenticated member.
 * Financial burn records remain in their separate audit ledger.
 */
export async function DELETE() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  let rate;
  try {
    rate = await consumeAiRateLimit({
      scope: 'blue_memory_reset',
      identifier: user.id,
      limit: 3,
      windowSeconds: 3_600,
    });
  } catch {
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: getAiRateLimitHeaders(rate) },
    );
  }

  try {
    await ensureBlueMemorySchema();
    await withTransaction(async (client) => {
      await sqlQueryWithClient(
        client,
        `DELETE FROM blue_memory_outbox WHERE user_id = :userId`,
        { userId: user.id },
      );
      await sqlQueryWithClient(
        client,
        `DELETE FROM blue_memory_facts WHERE user_id = :userId`,
        { userId: user.id },
      );
      await sqlQueryWithClient(
        client,
        `DELETE FROM blue_chat_messages WHERE user_id = :userId`,
        { userId: user.id },
      );
      await sqlQueryWithClient(
        client,
        `DELETE FROM blue_relationship_state WHERE user_id = :userId`,
        { userId: user.id },
      );
    });
  } catch {
    return NextResponse.json({ error: 'memory_reset_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

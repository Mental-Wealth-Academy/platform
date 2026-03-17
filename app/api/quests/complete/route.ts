import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-side quest reward definitions — client values are IGNORED
const QUEST_REWARDS: Record<string, number> = {
  'twitter-follow-quest': 10,
  'daily-checkin': 5,
  'first-proposal': 50,
  'first-vote': 25,
  'connect-wallet': 10,
  'complete-profile': 15,
  'first-reading': 20,
  'first-journal': 20,
};

// Daily notes quests follow pattern: daily-notes-w{week}-d{day}
function getQuestShardReward(questId: string): number {
  if (QUEST_REWARDS[questId] !== undefined) {
    return QUEST_REWARDS[questId];
  }
  // Daily notes quests: daily-notes-w1-d1, daily-notes-w2-d3, etc.
  if (/^daily-notes-w\d+-d\d+$/.test(questId)) {
    return 100;
  }
  // Generic quest reward fallback (capped at safe default)
  return 10;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured on the server.' },
      { status: 503 }
    );
  }
  await ensureForumSchema();

  // Get our internal user record (authenticated via wallet address)
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const questId = body?.questId;

  if (!questId || typeof questId !== 'string') {
    return NextResponse.json({ error: 'Quest ID is required.' }, { status: 400 });
  }

  // SECURITY: Shard reward determined server-side, client value ignored
  const shardsToAward = getQuestShardReward(questId);

  try {
    // Check if quest already completed
    const existingCompletion = await sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM quest_completions 
       WHERE user_id = :userId AND quest_id = :questId 
       LIMIT 1`,
      { userId: user.id, questId }
    );

    if (existingCompletion.length > 0) {
      return NextResponse.json({ error: 'Quest already completed.' }, { status: 409 });
    }

    // Award shards and record completion
    await sqlQuery(
      `UPDATE users 
       SET shard_count = shard_count + :shards 
       WHERE id = :id`,
      { id: user.id, shards: shardsToAward }
    );

    const completionId = uuidv4();
    await sqlQuery(
      `INSERT INTO quest_completions (id, user_id, quest_id, shards_awarded)
       VALUES (:id, :userId, :questId, :shards)`,
      { id: completionId, userId: user.id, questId, shards: shardsToAward }
    );

    // Get updated shard count and check if account is linked
    const shardRows = await sqlQuery<Array<{ shard_count: number; wallet_address: string | null }>>(
      `SELECT shard_count, wallet_address FROM users WHERE id = :id LIMIT 1`,
      { id: user.id }
    );
    const newShardCount = shardRows[0]?.shard_count ?? 0;
    const hasLinkedAccount = !!shardRows[0]?.wallet_address;

    return NextResponse.json({ 
      ok: true, 
      shardsAwarded: shardsToAward,
      newShardCount,
      requiresAccountLinking: !hasLinkedAccount,
    });
  } catch (err: any) {
    console.error('Error completing quest:', err);
    return NextResponse.json({ error: 'Failed to complete quest.' }, { status: 500 });
  }
}


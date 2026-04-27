import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { ensureWeeksSchema } from '@/lib/ensureWeeksSchema';
import { ensureCustomQuestsSchema } from '@/lib/ensureCustomQuestsSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { recordBlueQuestCompletion } from '@/lib/blue-memory';
import { isDbConfigured, sqlQuery, withTransaction, sqlQueryWithClient } from '@/lib/db';
import { getQuestDefinition, getQuestDefinitionForStoredQuestId } from '@/lib/quest-definitions';
import { v4 as uuidv4 } from 'uuid';

interface CustomQuestRow {
  id: string;
  points: number;
  target_count: number;
  quest_type: string;
  assignee_wallet: string | null;
  archived_at: string | null;
  expires_at: string | null;
}

async function loadCustomQuest(questId: string): Promise<CustomQuestRow | null> {
  const baseId = questId.replace(/-\d+$/, '');
  if (!/^cq_[a-f0-9]+$/i.test(baseId)) return null;
  const rows = await sqlQuery<CustomQuestRow[]>(
    `SELECT id, points, target_count, quest_type, assignee_wallet, archived_at, expires_at
     FROM custom_quests WHERE id = :id LIMIT 1`,
    { id: baseId }
  );
  return rows[0] ?? null;
}

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
  const definition = getQuestDefinitionForStoredQuestId(questId);
  if (definition) {
    return definition.points;
  }
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
  await ensureWeeksSchema();
  await ensureCustomQuestsSchema();

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
  const definition = getQuestDefinition(questId);
  const customQuest = definition ? null : await loadCustomQuest(questId);

  if (!definition && customQuest) {
    if (customQuest.archived_at) {
      return NextResponse.json({ error: 'Quest is no longer available.' }, { status: 410 });
    }
    if (customQuest.expires_at && new Date(customQuest.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Quest has expired.' }, { status: 410 });
    }
    if (
      customQuest.assignee_wallet &&
      customQuest.assignee_wallet.toLowerCase() !== user.walletAddress.toLowerCase()
    ) {
      return NextResponse.json({ error: 'Quest is not assigned to you.' }, { status: 403 });
    }
  }

  try {
    if (definition?.questType === 'sealed-week') {
      const sealedRows = await sqlQuery<Array<{ is_sealed: boolean }>>(
        `SELECT is_sealed
         FROM weeks
         WHERE user_id = :userId AND week_number = :weekNumber
         LIMIT 1`,
        { userId: user.id, weekNumber: definition.weekNumber }
      );

      if (!sealedRows[0]?.is_sealed) {
        return NextResponse.json(
          { error: `Week ${definition.weekNumber} must be sealed on your home page before this quest can be claimed.` },
          { status: 400 }
        );
      }
    }

    let resolvedQuestId = questId;
    let shardsToAward = getQuestShardReward(questId);

    if (customQuest) {
      shardsToAward = customQuest.points;

      if (customQuest.target_count > 1) {
        const existingRows = await sqlQuery<Array<{ quest_id: string }>>(
          `SELECT quest_id FROM quests
           WHERE user_id = :userId AND quest_id LIKE :prefix`,
          { userId: user.id, prefix: `${customQuest.id}%` }
        );
        const completionCount = existingRows.length;
        if (completionCount >= customQuest.target_count) {
          return NextResponse.json({ error: 'Quest already completed.' }, { status: 409 });
        }
        resolvedQuestId = `${customQuest.id}-${completionCount + 1}`;
      } else {
        resolvedQuestId = customQuest.id;
      }
    } else if (definition && definition.targetCount > 1) {
      const existingRows = await sqlQuery<Array<{ quest_id: string }>>(
        `SELECT quest_id
         FROM quests
         WHERE user_id = :userId`,
        { userId: user.id }
      );

      const completionCount = existingRows.filter((row) => {
        const matchedDefinition = getQuestDefinitionForStoredQuestId(row.quest_id);
        return matchedDefinition?.key === definition.key;
      }).length;

      if (completionCount >= definition.targetCount) {
        return NextResponse.json({ error: 'Quest already completed.' }, { status: 409 });
      }

      resolvedQuestId = `${definition.key}-${completionCount + 1}`;
      shardsToAward = getQuestShardReward(resolvedQuestId);
    }

    // Check if quest already completed (outside transaction for early exit)
    const existingCompletion = await sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM quests
       WHERE user_id = :userId AND quest_id = :questId
       LIMIT 1`,
      { userId: user.id, questId: resolvedQuestId }
    );

    if (existingCompletion.length > 0) {
      return NextResponse.json({ error: 'Quest already completed.' }, { status: 409 });
    }

    // Award shards, record completion, and fetch updated count atomically
    const { newShardCount, hasLinkedAccount } = await withTransaction(async (client) => {
      // Re-check inside transaction to prevent race conditions
      const dupeCheck = await sqlQueryWithClient<Array<{ id: string }>>(
        client,
        `SELECT id FROM quests
         WHERE user_id = :userId AND quest_id = :questId
         LIMIT 1`,
        { userId: user.id, questId: resolvedQuestId }
      );
      if (dupeCheck.length > 0) {
        throw new Error('QUEST_ALREADY_COMPLETED');
      }

      await sqlQueryWithClient(
        client,
        `UPDATE users
         SET shard_count = shard_count + :shards
         WHERE id = :id`,
        { id: user.id, shards: shardsToAward }
      );

      const completionId = uuidv4();
      await sqlQueryWithClient(
        client,
        `INSERT INTO quests (id, user_id, quest_id, shards_awarded)
         VALUES (:id, :userId, :questId, :shards)`,
        { id: completionId, userId: user.id, questId: resolvedQuestId, shards: shardsToAward }
      );

      const shardRows = await sqlQueryWithClient<Array<{ shard_count: number; wallet_address: string | null }>>(
        client,
        `SELECT shard_count, wallet_address FROM users WHERE id = :id LIMIT 1`,
        { id: user.id }
      );

      return {
        newShardCount: shardRows[0]?.shard_count ?? 0,
        hasLinkedAccount: !!shardRows[0]?.wallet_address,
      };
    });

    try {
      await recordBlueQuestCompletion({
        userId: user.id,
        questId: resolvedQuestId,
      });
    } catch (memoryError: unknown) {
      const message = memoryError instanceof Error ? memoryError.message : 'unknown blue quest memory error';
      console.error('Blue quest memory error:', message);
    }

    return NextResponse.json({
      ok: true,
      shardsAwarded: shardsToAward,
      newShardCount,
      requiresAccountLinking: !hasLinkedAccount,
    });
  } catch (err: any) {
    if (err.message === 'QUEST_ALREADY_COMPLETED') {
      return NextResponse.json({ error: 'Quest already completed.' }, { status: 409 });
    }
    console.error('Error completing quest:', err);
    return NextResponse.json({ error: 'Failed to complete quest.' }, { status: 500 });
  }
}

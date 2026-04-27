import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { ensureCustomQuestsSchema } from '@/lib/ensureCustomQuestsSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface VisibleRow {
  id: string;
  title: string;
  description: string;
  points: number;
  quest_type: string;
  target_count: number;
  creator_wallet: string;
  creator_handle: string | null;
  assignee_wallet: string | null;
  expires_at: string | null;
  created_at: string;
}

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  }

  await ensureForumSchema();
  await ensureCustomQuestsSchema();

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rows = await sqlQuery<VisibleRow[]>(
    `SELECT id, title, description, points, quest_type, target_count, creator_wallet,
            creator_handle, assignee_wallet, expires_at, created_at
     FROM custom_quests
     WHERE archived_at IS NULL
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       AND (assignee_wallet IS NULL OR LOWER(assignee_wallet) = LOWER(:wallet))
     ORDER BY created_at DESC`,
    { wallet: user.walletAddress }
  );

  const completionRows = await sqlQuery<Array<{ quest_id: string }>>(
    `SELECT quest_id FROM quests WHERE user_id = :userId AND quest_id LIKE 'cq\\_%' ESCAPE '\\'`,
    { userId: user.id }
  );

  const completionCounts: Record<string, number> = {};
  for (const row of completionRows) {
    const baseId = row.quest_id.replace(/-\d+$/, '');
    completionCounts[baseId] = (completionCounts[baseId] ?? 0) + 1;
  }

  const quests = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    points: row.points,
    questType: row.quest_type,
    targetCount: row.target_count,
    creatorWallet: row.creator_wallet,
    creatorHandle: row.creator_handle,
    assigneeWallet: row.assignee_wallet,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    progressCount: Math.min(completionCounts[row.id] ?? 0, row.target_count),
  }));

  return NextResponse.json({ quests });
}

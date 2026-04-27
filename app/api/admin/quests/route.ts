import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { ensureCustomQuestsSchema } from '@/lib/ensureCustomQuestsSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { walletHoldsSoulKey } from '@/lib/soul-key';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set(['no-proof', 'proof-required']);
const MAX_TITLE_LEN = 80;
const MAX_DESC_LEN = 600;

interface CustomQuestRow {
  id: string;
  title: string;
  description: string;
  points: number;
  quest_type: string;
  target_count: number;
  created_by: string;
  creator_wallet: string;
  creator_handle: string | null;
  assignee_wallet: string | null;
  expires_at: string | null;
  archived_at: string | null;
  created_at: string;
}

function rowToJson(row: CustomQuestRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    points: row.points,
    questType: row.quest_type,
    targetCount: row.target_count,
    createdBy: row.created_by,
    creatorWallet: row.creator_wallet,
    creatorHandle: row.creator_handle,
    assigneeWallet: row.assignee_wallet,
    expiresAt: row.expires_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  }

  await ensureForumSchema();
  await ensureCustomQuestsSchema();

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const mine = url.searchParams.get('mine') === 'true';

  if (mine) {
    const rows = await sqlQuery<CustomQuestRow[]>(
      `SELECT id, title, description, points, quest_type, target_count, created_by,
              creator_wallet, creator_handle, assignee_wallet, expires_at, archived_at, created_at
       FROM custom_quests
       WHERE created_by = :userId AND archived_at IS NULL
       ORDER BY created_at DESC`,
      { userId: user.id }
    );
    return NextResponse.json({ quests: rows.map(rowToJson) });
  }

  return NextResponse.json({ error: 'Specify ?mine=true' }, { status: 400 });
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  }

  await ensureForumSchema();
  await ensureCustomQuestsSchema();

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const hasKey = await walletHoldsSoulKey(user.walletAddress);
  if (!hasKey) {
    return NextResponse.json(
      { error: 'A Soul Key membership is required to author quests.' },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const questType = typeof body?.questType === 'string' ? body.questType : 'no-proof';
  const points = Number.isFinite(Number(body?.points)) ? Math.round(Number(body.points)) : 50;
  const targetCount = Number.isFinite(Number(body?.targetCount)) ? Math.round(Number(body.targetCount)) : 1;
  const assigneeWalletRaw = typeof body?.assigneeWallet === 'string' ? body.assigneeWallet.trim() : '';
  const expiresAtRaw = typeof body?.expiresAt === 'string' ? body.expiresAt.trim() : '';

  if (!title || title.length > MAX_TITLE_LEN) {
    return NextResponse.json({ error: `Title must be 1–${MAX_TITLE_LEN} characters.` }, { status: 400 });
  }
  if (!description || description.length > MAX_DESC_LEN) {
    return NextResponse.json({ error: `Description must be 1–${MAX_DESC_LEN} characters.` }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(questType)) {
    return NextResponse.json({ error: 'Invalid quest type.' }, { status: 400 });
  }
  if (!Number.isFinite(points) || points < 1 || points > 1000) {
    return NextResponse.json({ error: 'Points must be between 1 and 1000.' }, { status: 400 });
  }
  if (!Number.isFinite(targetCount) || targetCount < 1 || targetCount > 50) {
    return NextResponse.json({ error: 'Target count must be between 1 and 50.' }, { status: 400 });
  }

  let assigneeWallet: string | null = null;
  if (assigneeWalletRaw) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(assigneeWalletRaw)) {
      return NextResponse.json({ error: 'Assignee must be a valid 0x wallet.' }, { status: 400 });
    }
    assigneeWallet = assigneeWalletRaw.toLowerCase();
  }

  let expiresAt: string | null = null;
  if (expiresAtRaw) {
    const parsed = new Date(expiresAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Expiry date is invalid.' }, { status: 400 });
    }
    if (parsed.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: 'Expiry must be in the future.' }, { status: 400 });
    }
    expiresAt = parsed.toISOString();
  }

  const id = `cq_${uuidv4().replace(/-/g, '').slice(0, 24)}`;

  await sqlQuery(
    `INSERT INTO custom_quests
       (id, title, description, points, quest_type, target_count, created_by,
        creator_wallet, creator_handle, assignee_wallet, expires_at)
     VALUES
       (:id, :title, :description, :points, :questType, :targetCount, :createdBy,
        :creatorWallet, :creatorHandle, :assigneeWallet, :expiresAt)`,
    {
      id,
      title,
      description,
      points,
      questType,
      targetCount,
      createdBy: user.id,
      creatorWallet: user.walletAddress.toLowerCase(),
      creatorHandle: user.username ?? null,
      assigneeWallet,
      expiresAt,
    }
  );

  const rows = await sqlQuery<CustomQuestRow[]>(
    `SELECT id, title, description, points, quest_type, target_count, created_by,
            creator_wallet, creator_handle, assignee_wallet, expires_at, archived_at, created_at
     FROM custom_quests WHERE id = :id LIMIT 1`,
    { id }
  );

  return NextResponse.json({ quest: rows[0] ? rowToJson(rows[0]) : null }, { status: 201 });
}

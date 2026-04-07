import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { getQuestDefinitionForStoredQuestId, QUEST_DEFINITIONS } from '@/lib/quest-definitions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database is not configured on the server.' }, { status: 503 });
  }

  await ensureForumSchema();

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rows = await sqlQuery<Array<{ quest_id: string }>>(
    `SELECT quest_id
     FROM quests
     WHERE user_id = :userId`,
    { userId: user.id }
  );

  const counts = Object.fromEntries(QUEST_DEFINITIONS.map((quest) => [quest.key, 0])) as Record<string, number>;

  for (const row of rows) {
    const definition = getQuestDefinitionForStoredQuestId(row.quest_id);
    if (definition) {
      counts[definition.key] = (counts[definition.key] ?? 0) + 1;
    }
  }

  return NextResponse.json({ counts });
}

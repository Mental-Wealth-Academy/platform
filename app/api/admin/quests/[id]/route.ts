import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { ensureCustomQuestsSchema } from '@/lib/ensureCustomQuestsSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  }

  await ensureForumSchema();
  await ensureCustomQuestsSchema();

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const id = params.id;
  if (!id || !/^cq_[a-f0-9]{1,40}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid quest id.' }, { status: 400 });
  }

  const rows = await sqlQuery<Array<{ created_by: string }>>(
    `SELECT created_by FROM custom_quests WHERE id = :id LIMIT 1`,
    { id }
  );
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: 'Quest not found.' }, { status: 404 });
  }
  if (row.created_by !== user.id) {
    return NextResponse.json({ error: 'You can only delete your own quests.' }, { status: 403 });
  }

  await sqlQuery(
    `UPDATE custom_quests SET archived_at = CURRENT_TIMESTAMP WHERE id = :id`,
    { id }
  );

  return NextResponse.json({ ok: true });
}

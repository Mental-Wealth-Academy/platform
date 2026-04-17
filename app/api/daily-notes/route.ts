import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { recordBlueMorningPagesEvent } from '@/lib/blue-memory';
import { ensurePrayersSchema } from '@/lib/ensurePrayersSchema';
import { encryptForUser, decryptForUser } from '@/lib/encrypt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseAllWeekPages(userId: string, progressData: any): Record<string, unknown[]> {
  if (progressData?.encrypted && progressData?.data) {
    try {
      const decrypted = decryptForUser(userId, progressData.data);
      const parsed = JSON.parse(decrypted);
      return parsed.allWeekPages ?? {};
    } catch {
      return {};
    }
  }

  return progressData?.allWeekPages ?? {};
}

function countMorningPageEntries(allWeekPages: Record<string, unknown[]>) {
  return Object.values(allWeekPages).reduce((sum, pages) => {
    return sum + (Array.isArray(pages) ? pages.length : 0);
  }, 0);
}


/**
 * GET /api/daily-notes
 * Load all 12 weeks of morning pages (decrypted) for the authenticated user
 */
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  await ensurePrayersSchema();

  const rows = await sqlQuery<Array<{ progress_data: any }>>(
    `SELECT progress_data FROM prayers
     WHERE user_id = :userId
     LIMIT 1`,
    { userId: user.id }
  );

  if (rows.length === 0) {
    return NextResponse.json({ allWeekPages: {} });
  }

  const pd = rows[0].progress_data;

  // If encrypted, decrypt
  if (pd?.encrypted && pd?.data) {
    try {
      const decrypted = decryptForUser(user.id, pd.data);
      const parsed = JSON.parse(decrypted);
      return NextResponse.json({ allWeekPages: parsed.allWeekPages ?? {} });
    } catch {
      return NextResponse.json({ allWeekPages: {} });
    }
  }

  // Legacy unencrypted data — return as-is
  return NextResponse.json({ allWeekPages: pd?.allWeekPages ?? {} });
}

/**
 * POST /api/daily-notes
 * Save all 12 weeks of morning pages (encrypted at rest)
 * Body: { allWeekPages: Record<number, MorningPageEntry[]> }
 */
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  await ensurePrayersSchema();

  const existingRows = await sqlQuery<Array<{ progress_data: any }>>(
    `SELECT progress_data FROM prayers
     WHERE user_id = :userId
     LIMIT 1`,
    { userId: user.id }
  );

  let body: { allWeekPages: Record<string, unknown[]> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Encrypt the content before storing
  const plaintext = JSON.stringify({ allWeekPages: body.allWeekPages });
  const encrypted = encryptForUser(user.id, plaintext);
  const progressData = JSON.stringify({ encrypted: true, data: encrypted });

  await sqlQuery(
    `INSERT INTO prayers (id, user_id, progress_data)
     VALUES (gen_random_uuid()::text, :userId, :progressData::jsonb)
     ON CONFLICT (user_id)
     DO UPDATE SET progress_data = :progressData::jsonb, updated_at = CURRENT_TIMESTAMP`,
    { userId: user.id, progressData }
  );

  const previousAllWeekPages = existingRows[0]
    ? parseAllWeekPages(user.id, existingRows[0].progress_data)
    : {};
  const previousCount = countMorningPageEntries(previousAllWeekPages);
  const nextCount = countMorningPageEntries(body.allWeekPages ?? {});

  if (nextCount > previousCount) {
    try {
      await recordBlueMorningPagesEvent({
        userId: user.id,
        allWeekPages: body.allWeekPages ?? {},
      });
    } catch (memoryError: unknown) {
      const message = memoryError instanceof Error ? memoryError.message : 'unknown blue morning page memory error';
      console.error('Blue morning page memory error:', message);
    }
  }

  return NextResponse.json({ ok: true });
}

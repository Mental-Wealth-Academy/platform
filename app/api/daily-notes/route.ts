import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery, sqlQueryWithClient, withTransaction } from '@/lib/db';
import { recordBlueMorningPagesEvent } from '@/lib/blue-memory';
import { ensurePrayersSchema } from '@/lib/ensurePrayersSchema';
import { recordActivityEvent } from '@/lib/ensureActivityEventsSchema';
import { encryptForUser, decryptForUser } from '@/lib/encrypt';
import { recordAgentActivity } from '@/lib/room-log';
import { postSystemMessage } from '@/lib/chat';
import { fetchDiamondBalance } from '@/lib/diamonds-balance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTEBOOK_ENTRIES_UNLOCK_CREDITS = 3_000;

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
 * Load all field notes or a specific week for the authenticated user
 */
export async function GET(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  if (request.nextUrl.searchParams.get('review') === '1') {
    const balance = (await fetchDiamondBalance(user.walletAddress)) ?? user.shardCount;
    if (balance < NOTEBOOK_ENTRIES_UNLOCK_CREDITS) {
      return NextResponse.json(
        { error: 'Notebook Entries unlock at 3,000 diamonds.', code: 'NOTEBOOK_ENTRIES_LOCKED' },
        { status: 403 },
      );
    }
  }

  await ensurePrayersSchema();

  const rows = await sqlQuery<Array<{ progress_data: any }>>(
    `SELECT progress_data FROM prayers
     WHERE user_id = :userId
     LIMIT 1`,
    { userId: user.id }
  );

  if (rows.length === 0) {
    const weekParam = Number(request.nextUrl.searchParams.get('week'));
    if (Number.isInteger(weekParam) && weekParam >= 1 && weekParam <= 12) {
      return NextResponse.json({
        weekNumber: weekParam,
        entries: [],
        previousWeekCount: weekParam === 1 ? 7 : 0,
      });
    }
    return NextResponse.json({ allWeekPages: {} });
  }

  const pd = rows[0].progress_data;
  const weekParam = Number(request.nextUrl.searchParams.get('week'));
  const requestedWeek = Number.isInteger(weekParam) && weekParam >= 1 && weekParam <= 12
    ? weekParam
    : null;
  const currentMode = request.nextUrl.searchParams.get('mode') === 'current';

  const buildWeekResponse = (allWeekPages: Record<string, unknown[]>) => {
    if (currentMode) {
      let resolvedWeek = 1;
      let resolvedEntries: unknown[] = [];
      let resolvedPreviousWeekCount = 7;

      for (let week = 1; week <= 12; week += 1) {
        const entries = Array.isArray(allWeekPages[String(week)]) ? allWeekPages[String(week)] : [];
        const previousCount = week === 1
          ? 7
          : Array.isArray(allWeekPages[String(week - 1)])
            ? allWeekPages[String(week - 1)].length
            : 0;
        const unlocked = previousCount >= 7;

        if (unlocked) {
          resolvedWeek = week;
          resolvedEntries = entries;
          resolvedPreviousWeekCount = previousCount;
        }

        if (unlocked && entries.length < 7) {
          resolvedWeek = week;
          resolvedEntries = entries;
          resolvedPreviousWeekCount = previousCount;
          break;
        }
      }

      return NextResponse.json({
        weekNumber: resolvedWeek,
        entries: resolvedEntries,
        previousWeekCount: resolvedPreviousWeekCount,
      });
    }

    if (requestedWeek === null) {
      return NextResponse.json({ allWeekPages });
    }

    const currentEntries = Array.isArray(allWeekPages[String(requestedWeek)])
      ? allWeekPages[String(requestedWeek)]
      : [];
    const previousWeekCount = requestedWeek === 1
      ? 7
      : Array.isArray(allWeekPages[String(requestedWeek - 1)])
        ? allWeekPages[String(requestedWeek - 1)].length
        : 0;

    return NextResponse.json({
      weekNumber: requestedWeek,
      entries: currentEntries,
      previousWeekCount,
    });
  };

  // If encrypted, decrypt
  if (pd?.encrypted && pd?.data) {
    try {
      const decrypted = decryptForUser(user.id, pd.data);
      const parsed = JSON.parse(decrypted);
      return buildWeekResponse(parsed.allWeekPages ?? {});
    } catch {
      if (requestedWeek !== null) {
        return NextResponse.json({
          weekNumber: requestedWeek,
          entries: [],
          previousWeekCount: requestedWeek === 1 ? 7 : 0,
        });
      }
      return NextResponse.json({ allWeekPages: {} });
    }
  }

  // Legacy unencrypted data — return as-is
  return buildWeekResponse(pd?.allWeekPages ?? {});
}

/**
 * POST /api/daily-notes
 * Save field notes (encrypted at rest)
 * Body: { weekNumber: number, entries: FieldNoteEntry[] }
 */
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let body: { weekNumber?: number; entries?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (
    !Number.isInteger(body.weekNumber)
    || (body.weekNumber as number) < 1
    || (body.weekNumber as number) > 12
    || !Array.isArray(body.entries)
  ) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const weekNumber = body.weekNumber as number;
  const rewardDay = new Date().toISOString().slice(0, 10);

  const [, existingRows, existingRewardDay] = await Promise.all([
    ensurePrayersSchema(),
    sqlQuery<Array<{ progress_data: any }>>(
      `SELECT progress_data FROM prayers
       WHERE user_id = :userId
       LIMIT 1`,
      { userId: user.id }
    ),
    sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM daily_note_completions
       WHERE user_id = :userId AND reward_day = :rewardDay
       LIMIT 1`,
      { userId: user.id, rewardDay },
    ),
  ]);

  if (existingRewardDay.length > 0) {
    return NextResponse.json({ error: 'Today\'s field note is already saved.' }, { status: 409 });
  }

  const previousAllWeekPages = existingRows[0]
    ? parseAllWeekPages(user.id, existingRows[0].progress_data)
    : {};

  const storedWeekEntries = Array.isArray(previousAllWeekPages[String(weekNumber)])
    ? previousAllWeekPages[String(weekNumber)]
    : [];
  const previousWeekEntries = weekNumber === 1
    ? Array.from({ length: 7 })
    : Array.isArray(previousAllWeekPages[String(weekNumber - 1)])
      ? previousAllWeekPages[String(weekNumber - 1)]
      : [];

  if (previousWeekEntries.length < 7) {
    return NextResponse.json({ error: 'Complete the previous week first.' }, { status: 409 });
  }
  if (storedWeekEntries.length >= 7) {
    return NextResponse.json({ error: 'This week is already complete.' }, { status: 409 });
  }
  if (body.entries.length !== storedWeekEntries.length + 1) {
    return NextResponse.json(
      { error: 'Field notes must be saved one entry at a time.' },
      { status: 409 },
    );
  }

  const candidate = body.entries[body.entries.length - 1];
  if (!candidate || typeof candidate !== 'object') {
    return NextResponse.json({ error: 'A field note entry is required.' }, { status: 400 });
  }
  const content = (candidate as Record<string, unknown>).content;
  if (typeof content !== 'string' || content.trim().length === 0 || content.length > 50_000) {
    return NextResponse.json({ error: 'Write something before saving this field note.' }, { status: 400 });
  }

  // The browser supplies private content and a display date. Reward authority
  // lives in daily_note_completions, written atomically with this encrypted blob.
  const requestedDisplayDate = (candidate as Record<string, unknown>).date;
  const displayDate = typeof requestedDisplayDate === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(requestedDisplayDate)
    ? requestedDisplayDate
    : rewardDay;
  const savedEntry = {
    day: storedWeekEntries.length + 1,
    date: displayDate,
    content,
    submittedAt: Date.now(),
  };
  const nextAllWeekPages: Record<string, unknown[]> = {
    ...previousAllWeekPages,
    [String(weekNumber)]: [...storedWeekEntries, savedEntry],
  };

  // Encrypt the content before storing
  const plaintext = JSON.stringify({ allWeekPages: nextAllWeekPages });
  const encrypted = encryptForUser(user.id, plaintext);
  const progressData = JSON.stringify({ encrypted: true, data: encrypted });

  await withTransaction(async (client) => {
    await sqlQueryWithClient(
      client,
      `INSERT INTO prayers (id, user_id, progress_data)
       VALUES (gen_random_uuid()::text, :userId, :progressData::jsonb)
       ON CONFLICT (user_id)
       DO UPDATE SET progress_data = :progressData::jsonb, updated_at = CURRENT_TIMESTAMP`,
      { userId: user.id, progressData },
    );
    await sqlQueryWithClient(
      client,
      `INSERT INTO daily_note_completions (user_id, week_number, day_number, reward_day)
       VALUES (:userId, :weekNumber, :dayNumber, :rewardDay)`,
      {
        userId: user.id,
        weekNumber,
        dayNumber: storedWeekEntries.length + 1,
        rewardDay,
      },
    );
  });

  const previousCount = countMorningPageEntries(previousAllWeekPages);
  const nextCount = countMorningPageEntries(nextAllWeekPages);

  if (nextCount > previousCount) {
    // Dispatch background tasks without blocking response latency
    void (async () => {
      try {
        await Promise.allSettled([
          recordActivityEvent(user.id, 'field_note', nextCount - previousCount).catch((ledgerError: unknown) => {
            const message = ledgerError instanceof Error ? ledgerError.message : 'unknown activity ledger error';
            console.error('Field note activity ledger error:', message);
          }),
          recordBlueMorningPagesEvent({
            userId: user.id,
            allWeekPages: nextAllWeekPages,
          }).catch((memoryError: unknown) => {
            const message = memoryError instanceof Error ? memoryError.message : 'unknown blue field note memory error';
            console.error('Blue field note memory error:', message);
          }),
          ...(user.accountType === 'agent'
            ? [
                recordAgentActivity(user.id, `${user.username} wrote a field note.`).catch((activityError: unknown) => {
                  console.error('Room Log activity error:', activityError);
                }),
              ]
            : []),
          postSystemMessage(
            user.id,
            user.username,
            user.avatarUrl,
            `${user.username} completed their field notes.`,
          ).catch((chatError: unknown) => {
            console.error('Chat notification error:', chatError);
          }),
        ]);
      } catch (bgError: unknown) {
        console.error('Background field notes side effects error:', bgError);
      }
    })();
  }

  return NextResponse.json({ ok: true });
}

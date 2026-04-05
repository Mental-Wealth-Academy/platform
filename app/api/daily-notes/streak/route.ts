import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensurePrayersSchema } from '@/lib/ensurePrayersSchema';
import { decryptForUser } from '@/lib/encrypt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MorningPageEntry {
  day: number;
  date: string;
  submittedAt: number;
}

/**
 * GET /api/daily-notes/streak
 * Returns the current consecutive-day streak and which days of the
 * current week have been completed.
 */
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ streak: 0, completedDays: [] });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ streak: 0, completedDays: [] });
  }

  await ensurePrayersSchema();

  const rows = await sqlQuery<Array<{ progress_data: any }>>(
    `SELECT progress_data FROM prayers
     WHERE user_id = :userId
     LIMIT 1`,
    { userId: user.id }
  );

  if (rows.length === 0) {
    return NextResponse.json({ streak: 0, completedDays: [] });
  }

  let allWeekPages: Record<string, MorningPageEntry[]> = {};
  const pd = rows[0].progress_data;

  if (pd?.encrypted && pd?.data) {
    try {
      const decrypted = decryptForUser(user.id, pd.data);
      const parsed = JSON.parse(decrypted);
      allWeekPages = parsed.allWeekPages ?? {};
    } catch {
      return NextResponse.json({ streak: 0, completedDays: [] });
    }
  } else {
    allWeekPages = pd?.allWeekPages ?? {};
  }

  // Collect all dates with completed entries across all weeks
  const allDates = new Set<string>();
  for (const pages of Object.values(allWeekPages)) {
    for (const entry of pages) {
      if (entry.date) allDates.add(entry.date);
    }
  }

  // Calculate consecutive-day streak ending today or yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  let streak = 0;
  let checkDate = new Date(today);

  // If today is not done, start from yesterday
  if (!allDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (allDates.has(checkDate.toISOString().split('T')[0])) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Get day-of-week completions for the current 5-day display
  // Show the last 5 days (today and 4 before)
  const completedDays: boolean[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    completedDays.push(allDates.has(d.toISOString().split('T')[0]));
  }

  return NextResponse.json({ streak, completedDays });
}

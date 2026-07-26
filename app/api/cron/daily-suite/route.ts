import { NextResponse } from 'next/server';

import { POST as runTreasuryTrade } from '@/app/api/treasury/trade/route';
import { GET as runReviewSweep } from '@/app/api/voting/proposal/review-sweep/route';
import { GET as runMembershipReconcile } from '@/app/api/membership/reconcile/route';
import { GET as runEventReminders } from '@/app/api/events/reminders/route';
import { GET as runGuideRevisionCheck } from '@/app/api/guides/revision-check/route';
import { GET as runMemoryRetention } from '@/app/api/cron/blue-memory-retention/route';
import { GET as runReflections } from '@/app/api/cron/reflections/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily Master Cron Suite
 * Consolidates all daily automated maintenance tasks into a single endpoint
 * to comply with Vercel Hobby plan cron limits (max 2 crons per project).
 */
async function handleDailySuite(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const internalSecret = request.headers.get('x-internal-secret');
  const isCronAuth = authHeader === `Bearer ${secret}`;
  const isInternalAuth = Boolean(internalSecret) && internalSecret === process.env.INTERNAL_API_SECRET;

  if (!isCronAuth && !isInternalAuth) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const dummyUrl = request.url || 'https://mwa.local/api/cron/daily-suite';
  const subRequestGet = new Request(dummyUrl, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${secret}`,
      ...(internalSecret ? { 'x-internal-secret': internalSecret } : {}),
    },
  });

  const subRequestPost = new Request(dummyUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      ...(internalSecret ? { 'x-internal-secret': internalSecret } : {}),
    },
  });

  const tasks: Record<string, unknown> = {};

  const executeTask = async (name: string, fn: (req: Request) => Promise<Response>, req: Request) => {
    try {
      const res = await fn(req);
      const data = await res.json().catch(() => ({ status: res.status, text: 'Non-JSON response' }));
      tasks[name] = { ok: res.ok, status: res.status, data };
    } catch (err) {
      console.error(`[daily-suite] Task ${name} failed:`, err);
      tasks[name] = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  await executeTask('treasuryTrade', runTreasuryTrade, subRequestPost);
  await executeTask('proposalReviewSweep', runReviewSweep, subRequestGet);
  await executeTask('membershipReconcile', runMembershipReconcile, subRequestGet);
  await executeTask('eventReminders', runEventReminders, subRequestGet);
  await executeTask('guideRevisionCheck', runGuideRevisionCheck, subRequestGet);
  await executeTask('blueMemoryRetention', runMemoryRetention, subRequestGet);
  await executeTask('reflections', runReflections, subRequestGet);

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    tasks,
  });
}

export async function GET(request: Request) {
  return handleDailySuite(request);
}

export async function POST(request: Request) {
  return handleDailySuite(request);
}

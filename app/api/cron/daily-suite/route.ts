import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily Master Cron Suite
 * Consolidates all daily automated maintenance tasks into a single endpoint.
 * Uses dynamic imports to keep cold-start module evaluation lightweight.
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

  const executeTask = async (
    name: string,
    importFn: () => Promise<Record<string, (req: Request) => Promise<Response>>>,
    methodName: 'GET' | 'POST',
    req: Request,
  ) => {
    try {
      const mod = await importFn();
      const handler = mod[methodName];
      if (typeof handler !== 'function') {
        throw new Error(`Handler ${methodName} not exported from module`);
      }
      const res = await handler(req);
      const data = await res.json().catch(() => ({ status: res.status, text: 'Non-JSON response' }));
      tasks[name] = { ok: res.ok, status: res.status, data };
    } catch (err) {
      console.error(`[daily-suite] Task ${name} failed:`, err);
      tasks[name] = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  await executeTask('treasuryTrade', () => import('@/app/api/treasury/trade/route'), 'POST', subRequestPost);
  await executeTask('proposalReviewSweep', () => import('@/app/api/voting/proposal/review-sweep/route'), 'GET', subRequestGet);
  await executeTask('membershipReconcile', () => import('@/app/api/membership/reconcile/route'), 'GET', subRequestGet);
  await executeTask('eventReminders', () => import('@/app/api/events/reminders/route'), 'GET', subRequestGet);
  await executeTask('guideRevisionCheck', () => import('@/app/api/guides/revision-check/route'), 'GET', subRequestGet);
  await executeTask('blueMemoryRetention', () => import('@/app/api/cron/blue-memory-retention/route'), 'GET', subRequestGet);
  await executeTask('reflections', () => import('@/app/api/cron/reflections/route'), 'GET', subRequestGet);

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

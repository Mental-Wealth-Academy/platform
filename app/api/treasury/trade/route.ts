import { NextResponse } from 'next/server';
import { runTradingCycle } from '@/lib/trading-engine';
import { setExecutionLogs } from '@/lib/execution-log-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/treasury/trade
 * Trading cron endpoint — scans for edge and executes trades.
 * Protected by CRON_SECRET header (Vercel cron or manual trigger).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = await runTradingCycle();

    // Persist logs to in-memory store for the frontend
    setExecutionLogs(logs, []);

    const trades = logs.filter(l => l.action === 'TRADE').length;
    const skips = logs.filter(l => l.action === 'SKIP').length;
    const errors = logs.filter(l => l.action === 'ERROR').length;

    return NextResponse.json({
      success: true,
      summary: { trades, skips, errors, totalLogs: logs.length },
      logs,
    });
  } catch (err) {
    console.error('POST /api/treasury/trade error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Trading cycle failed' },
      { status: 500 },
    );
  }
}

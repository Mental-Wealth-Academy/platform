import { NextResponse } from 'next/server';
import { getExecutionLogs } from '@/lib/execution-log-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/treasury/execution-logs
 * Returns the latest execution logs and open positions from the trading engine.
 */
export async function GET() {
  return NextResponse.json(getExecutionLogs());
}

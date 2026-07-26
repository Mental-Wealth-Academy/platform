import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { buildTopTradePlan, type TradingLog } from '@/lib/trading-engine';
import { placePolymarketOrder } from '@/lib/polymarket-trading';
import { setExecutionLogs, type PositionEntry } from '@/lib/execution-log-store';
import { getClientIdentifier, checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { isStaffUser } from '@/lib/staff-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequestCookie();
  const identifier = getClientIdentifier(request, user?.id);
  const limit = checkRateLimit({ identifier: `vip-trade:${identifier}`, max: 4, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(limit);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Trade execution is cooling down. Try again in a minute.' },
      { status: 429, headers: rateLimitHeaders },
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: 'unauthenticated', message: 'Sign in with an authorized staff wallet.' },
      { status: 401, headers: rateLimitHeaders },
    );
  }

  if (!isStaffUser(user)) {
    return NextResponse.json(
      {
        error: 'staff_required',
        message: 'Only an authorized staff wallet can execute trades from Blue.',
      },
      { status: 403, headers: rateLimitHeaders },
    );
  }

  if (!process.env.POLYMARKET_CLOB_API_KEY || !process.env.POLYMARKET_CLOB_SECRET) {
    return NextResponse.json(
      {
        error: 'polymarket_unconfigured',
        message: 'Polymarket CLOB credentials are missing. Set POLYMARKET_CLOB_API_KEY, POLYMARKET_CLOB_SECRET, and POLYMARKET_CLOB_PASSPHRASE.',
      },
      { status: 503, headers: rateLimitHeaders },
    );
  }

  try {
    const { plan, logs } = await buildTopTradePlan();
    if (!plan) {
      const skipLogs: TradingLog[] = [
        ...logs,
        { action: 'SKIP', details: 'Staff execution requested but no actionable edge was available.', timestamp: Date.now() },
      ];
      setExecutionLogs(skipLogs, []);
      return NextResponse.json(
        { success: false, message: 'No actionable edge is live right now.', logs: skipLogs },
        { status: 409, headers: rateLimitHeaders },
      );
    }

    const clientOrderId = randomUUID();
    const order = await placePolymarketOrder({
      tokenId: plan.order.tokenId,
      side: plan.order.side,
      size: plan.order.size,
      price: plan.order.price,
      orderType: 'FOK',
      clientOrderId,
    });

    const executionLogs: TradingLog[] = [
      ...logs,
      {
        action: 'TRADE',
        asset: plan.signal.asset,
        details:
          `${plan.order.side} ${plan.order.ticker} @ ${(plan.order.price * 100).toFixed(0)}c x ${plan.order.size} ` +
          `kelly:${(plan.position.kellyFraction * 100).toFixed(2)}% order:${order.order_id || order.id || clientOrderId}`,
        timestamp: Date.now(),
      },
    ];

    const livePositions: PositionEntry[] = [
      {
        asset: plan.signal.asset,
        side: plan.order.side,
        price: plan.order.price.toFixed(4),
        size: plan.order.notionalUSD.toFixed(2),
        sizeMatched: order.size_matched || plan.order.notionalUSD.toFixed(2),
        status: order.status || 'submitted',
      },
    ];

    setExecutionLogs(executionLogs, livePositions);

    return NextResponse.json(
      {
        success: true,
        order,
        plan: {
          ticker: plan.order.ticker,
          side: plan.order.side,
          count: plan.order.size,
          priceCents: plan.order.priceCents,
          notionalUSD: Number(plan.order.notionalUSD.toFixed(2)),
        },
        logs: executionLogs,
        positions: livePositions,
      },
      { headers: rateLimitHeaders },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Trade execution failed.';
    console.error('POST /api/treasury/trade/execute error:', message);
    return NextResponse.json(
      { error: 'trade_execution_failed', message },
      { status: 500, headers: rateLimitHeaders },
    );
  }
}

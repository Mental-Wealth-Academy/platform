import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { buildTopTradePlan, type TradingLog } from '@/lib/trading-engine';
import { placeKalshiOrder } from '@/lib/kalshi-trading';
import { setExecutionLogs, type PositionEntry } from '@/lib/execution-log-store';
import { getClientIdentifier, checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import {
  walletHoldsVipMembershipCard,
  VIP_MEMBERSHIP_CARD_ADDRESS,
  VIP_MEMBERSHIP_CARD_TOKEN_ID,
} from '@/lib/soul-key';

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
      { error: 'unauthenticated', message: 'Sign in with the wallet that holds the VIP Membership Card.' },
      { status: 401, headers: rateLimitHeaders },
    );
  }

  const hasVipCard = await walletHoldsVipMembershipCard(user.walletAddress);
  if (!hasVipCard) {
    return NextResponse.json(
      {
        error: 'vip_required',
        message: 'Only the verified VIP Membership Card wallet can execute trades from Blue.',
        contractAddress: VIP_MEMBERSHIP_CARD_ADDRESS,
        tokenId: VIP_MEMBERSHIP_CARD_TOKEN_ID.toString(),
      },
      { status: 403, headers: rateLimitHeaders },
    );
  }

  if (!process.env.KALSHI_API_KEY_ID || !process.env.KALSHI_API_PRIVATE_KEY) {
    return NextResponse.json(
      {
        error: 'kalshi_unconfigured',
        message: 'Kalshi credentials are missing. Set KALSHI_API_KEY_ID and KALSHI_API_PRIVATE_KEY.',
      },
      { status: 503, headers: rateLimitHeaders },
    );
  }

  try {
    const { plan, logs } = await buildTopTradePlan();
    if (!plan) {
      const skipLogs: TradingLog[] = [
        ...logs,
        { action: 'SKIP', details: 'VIP execution requested but no actionable edge was available.', timestamp: Date.now() },
      ];
      setExecutionLogs(skipLogs, []);
      return NextResponse.json(
        { success: false, message: 'No actionable edge is live right now.', logs: skipLogs },
        { status: 409, headers: rateLimitHeaders },
      );
    }

    const clientOrderId = randomUUID();
    const order = await placeKalshiOrder({
      ticker: plan.order.ticker,
      side: plan.order.side,
      count: plan.order.count,
      priceCents: plan.order.priceCents,
      clientOrderId,
    });

    const executionLogs: TradingLog[] = [
      ...logs,
      {
        action: 'TRADE',
        asset: plan.signal.asset,
        details:
          `${plan.order.side.toUpperCase()} ${plan.order.ticker} @ ${plan.order.priceCents}c x ${plan.order.count} ` +
          `kelly:${(plan.position.kellyFraction * 100).toFixed(2)}% order:${order.order_id || clientOrderId}`,
        timestamp: Date.now(),
      },
    ];

    const livePositions: PositionEntry[] = [
      {
        asset: plan.signal.asset,
        side: plan.order.side.toUpperCase(),
        price: plan.order.priceDollars.toFixed(4),
        size: plan.order.notionalUSD.toFixed(2),
        sizeMatched: plan.order.notionalUSD.toFixed(2),
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
          count: plan.order.count,
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

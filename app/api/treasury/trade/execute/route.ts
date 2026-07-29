import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { buildTopTradePlan, type TradingLog } from '@/lib/trading-engine';
import { placePolymarketOrder } from '@/lib/polymarket-trading';
import { setExecutionLogs, type PositionEntry } from '@/lib/execution-log-store';
import { getClientIdentifier, checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { isStaffUser } from '@/lib/staff-auth';
import {
  claimPolymarketTrade,
  completePolymarketTrade,
  failPolymarketTrade,
} from '@/lib/polymarket-trade-ledger';

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

  if (
    !process.env.POLYMARKET_WALLET_PRIVATE_KEY ||
    !process.env.POLYMARKET_PROXY_WALLET
  ) {
    return NextResponse.json(
      {
        error: 'polymarket_unconfigured',
        message: 'Polymarket signer or proxy wallet configuration is missing.',
      },
      { status: 503, headers: rateLimitHeaders },
    );
  }

  const body = await request.json().catch(() => null) as {
    requestId?: unknown;
  } | null;
  const requestId = typeof body?.requestId === 'string'
    ? body.requestId.trim()
    : '';
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(requestId)) {
    return NextResponse.json(
      {
        error: 'invalid_request_id',
        message: 'A valid trade request ID is required.',
      },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  let tradeClaimed = false;
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

    const publicPlan = {
      ticker: plan.order.ticker,
      side: plan.order.outcome,
      count: plan.order.size,
      priceCents: plan.order.priceCents,
      notionalUSD: Number(plan.order.notionalUSD.toFixed(2)),
    };
    const targetKey =
      `${plan.signal.market.slug || plan.order.ticker}:${plan.order.outcome}`;
    const claim = await claimPolymarketTrade({
      requestId,
      targetKey,
      userId: user.id,
      plan: publicPlan,
    });
    if (!claim.claimed) {
      if (claim.row.request_id === requestId && claim.row.status === 'submitted') {
        return NextResponse.json(
          {
            success: true,
            duplicate: true,
            order: claim.row.response,
            plan: claim.row.plan,
            message: 'This trade request was already submitted.',
          },
          { headers: rateLimitHeaders },
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: 'trade_already_claimed',
          message:
            claim.row.status === 'failed'
              ? 'This market trade is locked after a failed submission and needs manual review.'
              : 'This market trade has already been claimed.',
          requestId: claim.row.request_id,
          status: claim.row.status,
          orderId: claim.row.order_id,
        },
        { status: 409, headers: rateLimitHeaders },
      );
    }
    tradeClaimed = true;

    const order = await placePolymarketOrder({
      tokenId: plan.order.tokenId,
      side: plan.order.side,
      size: plan.order.size,
      price: plan.order.price,
      orderType: 'FOK',
      clientOrderId: requestId,
    });
    const orderId = order.orderID || order.order_id || order.id || requestId;
    await completePolymarketTrade({
      requestId,
      orderId,
      response: order,
    });

    const executionLogs: TradingLog[] = [
      ...logs,
      {
        action: 'TRADE',
        asset: plan.signal.asset,
        details:
          `BUY ${plan.order.outcome} ${plan.order.ticker} @ ${(plan.order.price * 100).toFixed(0)}c x ${plan.order.size} ` +
          `notional:${plan.order.notionalUSD.toFixed(2)} pUSD order:${orderId}`,
        timestamp: Date.now(),
      },
    ];

    const livePositions: PositionEntry[] = [
      {
        asset: plan.signal.asset,
        side: 'BUY',
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
        plan: publicPlan,
        logs: executionLogs,
        positions: livePositions,
      },
      { headers: rateLimitHeaders },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Trade execution failed.';
    if (tradeClaimed) {
      try {
        await failPolymarketTrade(requestId, message);
      } catch (ledgerError) {
        console.error('Polymarket trade ledger failure:', ledgerError);
      }
    }
    console.error('POST /api/treasury/trade/execute error:', message);
    return NextResponse.json(
      { error: 'trade_execution_failed', message },
      { status: 500, headers: rateLimitHeaders },
    );
  }
}

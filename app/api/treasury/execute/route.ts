import { NextResponse } from 'next/server';
import { placeOrder, type ClobOrder } from '@/lib/polymarket-clob';
import { setExecutionLogs } from '@/lib/execution-log-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const preferredRegion = 'lhr1'; // London — avoids US geoblock

interface TradeDecision {
  marketId: string;
  tokenID: string;
  isYes: boolean;
  price: number;
  size: number;
  edge: number;
  kellyFraction: number;
  reasoning?: string;
}

/**
 * POST /api/treasury/execute
 * Accepts pre-analyzed trade decisions from CRE workflow and executes via CLOB.
 * Protected by INTERNAL_API_SECRET.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { trades: TradeDecision[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.trades || !Array.isArray(body.trades) || body.trades.length === 0) {
    return NextResponse.json({ error: 'No trades provided' }, { status: 400 });
  }

  const results = [];
  const logs = [];
  const timestamp = Date.now();

  for (const trade of body.trades) {
    const order: ClobOrder = {
      tokenID: trade.tokenID,
      price: Math.round(trade.price * 100) / 100,
      size: trade.size,
      side: trade.isYes ? 'BUY' : 'SELL',
    };

    try {
      const response = await placeOrder(order);
      results.push({
        marketId: trade.marketId,
        orderID: response.orderID,
        status: response.status,
        side: order.side,
        price: order.price,
        size: order.size,
      });

      logs.push({
        action: 'TRADE' as const,
        asset: trade.marketId.slice(0, 8),
        details: `CRE ${order.side} @${(order.price * 100).toFixed(0)}c size:${order.size} edge:${(trade.edge * 100).toFixed(1)}% kelly:${(trade.kellyFraction * 100).toFixed(2)}% orderID:${response.orderID}`,
        timestamp,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      results.push({
        marketId: trade.marketId,
        error: msg,
        status: 'failed',
      });

      logs.push({
        action: 'ERROR' as const,
        asset: trade.marketId.slice(0, 8),
        details: `CRE order failed: ${msg}`,
        timestamp,
      });
    }
  }

  // Persist logs for the frontend
  setExecutionLogs(logs, []);

  return NextResponse.json({
    success: true,
    executed: results.filter(r => !('error' in r)).length,
    failed: results.filter(r => 'error' in r).length,
    results,
  });
}

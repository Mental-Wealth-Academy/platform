import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { fetchPolymarketMarketBySlug } from '@/lib/polymarket-api';
import { fetchPolymarketCollateralBalance } from '@/lib/polymarket-trading';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const DEFAULT_TARGET_SLUG =
  'will-there-be-no-change-in-fed-interest-rates-after-the-july-2026-meeting';

/**
 * Read-only trading readiness probe.
 *
 * The returned wallet, target, prices, balances, and allowances are public
 * Polygon/CLOB facts. Private keys and API credentials never leave the server.
 */
export async function GET() {
  const targetSlug =
    process.env.POLYMARKET_TARGET_MARKET_SLUG?.trim() || DEFAULT_TARGET_SLUG;
  const targetOutcome =
    process.env.POLYMARKET_TARGET_OUTCOME?.trim().toUpperCase() || 'YES';
  const proxyWallet = process.env.POLYMARKET_PROXY_WALLET?.trim() || null;

  if (!proxyWallet || !isAddress(proxyWallet)) {
    return NextResponse.json(
      {
        status: 'unavailable',
        ready: false,
        message: 'The Polymarket proxy wallet is not configured.',
      },
      { status: 503 },
    );
  }

  try {
    const [market, collateral] = await Promise.all([
      fetchPolymarketMarketBySlug(targetSlug),
      fetchPolymarketCollateralBalance(),
    ]);
    const outcome = targetOutcome === 'NO' ? 'NO' : 'YES';
    const tokenId = outcome === 'YES' ? market.tokenId : market.noTokenId;
    const ask = outcome === 'YES' ? market.yes_ask : market.no_ask;
    const funded = collateral.usd > 0;

    return NextResponse.json({
      status: funded ? 'ready' : 'needs_funding',
      ready: funded && collateral.hasAllowance,
      authenticated: true,
      proxyWallet,
      collateral: {
        amount: collateral.formatted,
        symbol: 'pUSD',
        allowanceCount: collateral.allowanceCount,
        hasAllowance: collateral.hasAllowance,
      },
      target: {
        slug: market.slug || targetSlug,
        question: market.question,
        conditionId: market.ticker,
        outcome,
        tokenId,
        ask,
        minOrderSize: market.minOrderSize,
        maxTradeUsdc: Number(process.env.POLYMARKET_MAX_TRADE_USDC || 5),
        maxEntryPrice: Number(process.env.POLYMARKET_MAX_ENTRY_PRICE || 0.75),
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Trading readiness failed.';
    console.error('GET /api/treasury/trade/status error:', message);
    return NextResponse.json(
      {
        status: 'unavailable',
        ready: false,
        authenticated: false,
        proxyWallet,
        message,
      },
      { status: 503 },
    );
  }
}

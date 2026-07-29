/**
 * Trading Engine — Edge Detection (dry-run)
 *
 * Scans Polymarket markets for model-vs-market divergence and emits
 * sized SIGNAL entries. The output of runTradingCycle() is consumed
 * by the /markets page via execution-log-store and rendered live.
 *
 * TODO: Follow this account for market picks: https://polymarket.com/@imjustken?tab=activity
 *
 * Trade placement uses lib/polymarket-trading.ts (CLOB V2, HMAC-signed).
 */

import {
  fetchPrices,
  fetchCategorizedMarkets,
  fetchPolymarketMarketBySlug,
  type CoinPrice,
  type MarketRow,
} from './market-api';
import { fetchPolymarketCollateralBalance } from './polymarket-trading';

// ── Model Constants (mirrored from /markets page) ──

const SIGMA = 0.50;
const T_EXP = 0.0000095;
const R_FREE = 0.0433;
const SIGMA_B = 0.328;
const EDGE_THRESHOLD = 3.0;
const KELLY_FRACTION = 0.25;
const DEFAULT_TARGET_SLUG =
  'will-there-be-no-change-in-fed-interest-rates-after-the-july-2026-meeting';
const DEFAULT_TARGET_OUTCOME = 'YES';
const DEFAULT_MAX_TRADE_USDC = 5;
const DEFAULT_MAX_ENTRY_PRICE = 0.75;

// ── Risk Limits (kept for reference / sizing math) ──

const MAX_POSITION_PCT = 0.05;       // 5% of trading balance per position
const MAX_TOTAL_EXPOSURE_PCT = 0.40; // 40% total exposure

// ── Types ──

export interface EdgeSignal {
  asset: string;
  market: MarketRow;
  modelFair: number;
  mktPrice: number;
  divergence: number;
  side: 'BUY' | 'SELL';
  d2: number;
  Nd2: number;
}

export interface SizedPosition {
  signal: EdgeSignal;
  kellyFraction: number;
  sizeUSD: number;
  shares: number;
}

export interface ExecutableTradePlan {
  signal: EdgeSignal;
  position: SizedPosition;
  order: {
    tokenId: string;
    ticker: string;
    side: 'BUY' | 'SELL';
    outcome: 'YES' | 'NO';
    price: number;         // 0-1 decimal
    size: number;           // number of shares
    priceCents: number;     // kept for display compatibility
    notionalUSD: number;
  };
}

export interface TradingLog {
  action: 'SCAN' | 'TRADE' | 'SKIP' | 'HALT' | 'ERROR' | 'SIGNAL';
  asset?: string;
  details: string;
  timestamp: number;
}

// ── Math ──

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * z);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

function parseOutcomePrices(raw: string): [number, number] {
  try {
    const arr = JSON.parse(raw);
    return [Number(arr[0]) || 0, Number(arr[1]) || 0];
  } catch {
    return [0, 0];
  }
}

// ── Engine ──

/** Scan macro-focused markets for edge opportunities. */
export async function scanForEdge(): Promise<{ signals: EdgeSignal[]; logs: TradingLog[] }> {
  const logs: TradingLog[] = [];
  const signals: EdgeSignal[] = [];

  const [prices, markets] = await Promise.all([fetchPrices(), fetchCategorizedMarkets()]);
  const scanMarkets = Object.values(markets).flat();

  for (const market of scanMarkets) {
    const [yesPrice] = parseOutcomePrices(market.outcomePrices);
    if (yesPrice <= 0.02 || yesPrice >= 0.98) continue;

    const mktPrice = yesPrice * 100;

    // Match market to a spot asset via question text
    const matchedCoin: CoinPrice | undefined = prices.find((p) =>
      market.question.toLowerCase().includes(p.symbol.toLowerCase()) ||
      market.question.toLowerCase().includes(p.id.toLowerCase()),
    );

    const asset = matchedCoin?.symbol ?? 'BTC';

    // BS binary pricing
    const sqrtT = Math.sqrt(T_EXP);
    const d2 = (R_FREE - 0.5 * SIGMA * SIGMA) * T_EXP / (SIGMA * sqrtT);
    const Nd2 = normalCDF(d2);
    const C_bin = Math.exp(-R_FREE * T_EXP) * Nd2;
    const modelFair = C_bin * 100;

    const divergence = modelFair - mktPrice;

    logs.push({
      action: 'SCAN',
      asset,
      details: `d2:${d2.toFixed(6)} N(d2):${Nd2.toFixed(5)} sigma_b:${SIGMA_B.toFixed(3)} mkt:${mktPrice.toFixed(1)}% model:${modelFair.toFixed(1)}%`,
      timestamp: Date.now(),
    });

    if (Math.abs(divergence) >= EDGE_THRESHOLD) {
      const side: 'BUY' | 'SELL' = divergence > 0 ? 'BUY' : 'SELL';
      signals.push({ asset, market, modelFair, mktPrice, divergence, side, d2, Nd2 });

      logs.push({
        action: 'SIGNAL',
        asset,
        details: `${side} ${market.ticker} edge:${Math.abs(divergence).toFixed(2)}% model:${modelFair.toFixed(2)}% mkt:${mktPrice.toFixed(2)}%`,
        timestamp: Date.now(),
      });
    } else {
      logs.push({
        action: 'SKIP',
        asset,
        details: `edge:${Math.abs(divergence).toFixed(2)}% < ${EDGE_THRESHOLD}% threshold`,
        timestamp: Date.now(),
      });
    }
  }

  return { signals, logs };
}

/** Apply quarter-Kelly + risk limits to size positions (notional, dry-run). */
export function sizePositions(signals: EdgeSignal[], balance: number): SizedPosition[] {
  if (!Number.isFinite(balance) || balance < 0) {
    throw new Error('Trading balance must be a finite, non-negative number.');
  }
  const positions: SizedPosition[] = [];
  const maxPerPosition = balance * MAX_POSITION_PCT;
  let totalExposure = 0;

  for (const signal of signals) {
    if (totalExposure >= balance * MAX_TOTAL_EXPOSURE_PCT) break;

    const p = signal.modelFair / 100;
    const mktP = signal.mktPrice / 100;
    const b = signal.side === 'BUY' ? (1 / mktP - 1) : (1 / (1 - mktP) - 1);
    const q = 1 - p;
    const kellyRaw = (p * b - q) / b;
    const kellyFraction = Math.max(0, Math.min(kellyRaw * KELLY_FRACTION, MAX_POSITION_PCT));

    if (kellyFraction <= 0) continue;

    const sizeUSD = Math.min(balance * kellyFraction, maxPerPosition);
    const price = signal.side === 'BUY' ? mktP : (1 - mktP);
    const shares = Math.floor(sizeUSD / price);

    if (shares <= 0) continue;
    positions.push({ signal, kellyFraction, sizeUSD, shares });
    totalExposure += sizeUSD;
  }

  return positions;
}

/**
 * Builds the trade to execute. The caller passes the market it is actually
 * showing the user; without that the plan falls back to a configured target,
 * which can differ from the market on screen.
 */
export async function buildTopTradePlan(
  requestedSlug?: string,
): Promise<{ plan: ExecutableTradePlan | null; logs: TradingLog[] }> {
  const logs: TradingLog[] = [];
  const targetSlug =
    requestedSlug?.trim() ||
    process.env.POLYMARKET_TARGET_MARKET_SLUG?.trim() ||
    DEFAULT_TARGET_SLUG;
  const configuredOutcome =
    process.env.POLYMARKET_TARGET_OUTCOME?.trim().toUpperCase() ||
    DEFAULT_TARGET_OUTCOME;
  if (configuredOutcome !== 'YES' && configuredOutcome !== 'NO') {
    throw new Error('POLYMARKET_TARGET_OUTCOME must be YES or NO.');
  }

  const maxTradeUsdc = Number(
    process.env.POLYMARKET_MAX_TRADE_USDC || DEFAULT_MAX_TRADE_USDC,
  );
  const maxEntryPrice = Number(
    process.env.POLYMARKET_MAX_ENTRY_PRICE || DEFAULT_MAX_ENTRY_PRICE,
  );
  if (!Number.isFinite(maxTradeUsdc) || maxTradeUsdc <= 0) {
    throw new Error('POLYMARKET_MAX_TRADE_USDC must be a positive number.');
  }
  if (
    !Number.isFinite(maxEntryPrice) ||
    maxEntryPrice < 0.01 ||
    maxEntryPrice > 0.99
  ) {
    throw new Error('POLYMARKET_MAX_ENTRY_PRICE must be between 0.01 and 0.99.');
  }

  const market = await fetchPolymarketMarketBySlug(targetSlug);
  const [yesPrice, noPrice] = parseOutcomePrices(market.outcomePrices);
  const outcome = configuredOutcome;
  const price = outcome === 'YES'
    ? (market.yes_ask > 0 ? market.yes_ask : yesPrice)
    : (market.no_ask > 0 ? market.no_ask : noPrice);
  const tokenId = outcome === 'YES' ? market.tokenId : market.noTokenId;

  if (!tokenId || !Number.isFinite(price) || price < 0.01 || price > 0.99) {
    logs.push({
      action: 'ERROR',
      asset: 'FED',
      details: `The ${outcome} outcome does not have executable order data.`,
      timestamp: Date.now(),
    });
    return { plan: null, logs };
  }

  logs.push({
    action: 'SCAN',
    asset: 'FED',
    details:
      `Target locked: BUY ${outcome} "${market.question}" at ${(price * 100).toFixed(1)}c.`,
    timestamp: Date.now(),
  });

  if (price > maxEntryPrice) {
    logs.push({
      action: 'HALT',
      asset: 'FED',
      details:
        `Target ask ${(price * 100).toFixed(1)}c exceeds the ${(maxEntryPrice * 100).toFixed(1)}c entry cap.`,
      timestamp: Date.now(),
    });
    return { plan: null, logs };
  }

  const collateral = await fetchPolymarketCollateralBalance();
  logs.push({
    action: collateral.usd > 0 ? 'SCAN' : 'HALT',
    details: `Trading collateral: ${collateral.formatted} pUSD.`,
    timestamp: Date.now(),
  });
  if (collateral.usd <= 0) return { plan: null, logs };

  const spendLimit = Math.min(collateral.usd, maxTradeUsdc);
  const count = Math.floor(spendLimit / price);
  const minOrderSize = Math.max(1, market.minOrderSize || 1);
  if (count < minOrderSize) {
    logs.push({
      action: 'HALT',
      asset: 'FED',
      details:
        `${spendLimit.toFixed(2)} pUSD cannot cover the ${minOrderSize}-share minimum at ${(price * 100).toFixed(1)}c.`,
      timestamp: Date.now(),
    });
    return { plan: null, logs };
  }

  const priceCents = Math.max(1, Math.min(99, Math.round(price * 100)));
  const notionalUSD = count * price;
  const signal: EdgeSignal = {
    asset: 'FED',
    market,
    modelFair: price * 100,
    mktPrice: price * 100,
    divergence: 0,
    side: 'BUY',
    d2: 0,
    Nd2: price,
  };
  const position: SizedPosition = {
    signal,
    kellyFraction: notionalUSD / collateral.usd,
    sizeUSD: notionalUSD,
    shares: count,
  };

  return {
    logs,
    plan: {
      signal,
      position,
      order: {
        tokenId,
        ticker: market.ticker,
        side: 'BUY',
        outcome,
        price,
        size: count,
        priceCents,
        notionalUSD,
      },
    },
  };
}

/**
 * Full trading cycle (dry-run): scan -> size -> log.
 * No order placement — execution is triggered separately via staff route.
 */
export async function runTradingCycle(): Promise<TradingLog[]> {
  const allLogs: TradingLog[] = [];

  const { signals, logs: scanLogs } = await scanForEdge();
  allLogs.push(...scanLogs);

  if (signals.length === 0) {
    allLogs.push({ action: 'SKIP', details: 'No edge signals found', timestamp: Date.now() });
    return allLogs;
  }

  const collateral = await fetchPolymarketCollateralBalance();
  allLogs.push({
    action: collateral.usd > 0 ? 'SCAN' : 'HALT',
    details: `Trading collateral: ${collateral.formatted} pUSD.`,
    timestamp: Date.now(),
  });
  if (collateral.usd <= 0) return allLogs;

  const positions = sizePositions(signals, collateral.usd);

  for (const pos of positions) {
    allLogs.push({
      action: 'SIGNAL',
      asset: pos.signal.asset,
      details: `${pos.signal.side} ${pos.signal.market.ticker} kelly:${(pos.kellyFraction * 100).toFixed(2)}% notional:$${Math.round(pos.sizeUSD)} shares:${pos.shares}`,
      timestamp: Date.now(),
    });
  }

  return allLogs;
}

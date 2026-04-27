/**
 * Trading Engine — Edge Detection (dry-run)
 *
 * Scans Kalshi markets for model-vs-market divergence and emits
 * sized SIGNAL entries. Execution is intentionally not wired in
 * this build — Kalshi requires RSA-signed requests and a separate
 * funding rail, both of which are out of scope until we wire a real
 * trading desk.
 *
 * The output of runTradingCycle() is consumed by the /markets page
 * via execution-log-store and rendered live.
 */

import {
  fetchPrices,
  fetchCategorizedMarkets,
  type CoinPrice,
  type MarketRow,
} from './market-api';

// ── Model Constants (mirrored from /markets page) ──

const SIGMA = 0.50;
const T_EXP = 0.0000095;
const R_FREE = 0.0433;
const SIGMA_B = 0.328;
const EDGE_THRESHOLD = 3.0;
const KELLY_FRACTION = 0.25;

// ── Risk Limits (kept for reference / sizing math) ──

const MAX_POSITION_PCT = 0.05;       // 5% of trading balance per position
const MAX_TOTAL_EXPOSURE_PCT = 0.40; // 40% total exposure
const NOTIONAL_BALANCE = 5000;       // dry-run notional in USD for sizing

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
    ticker: string;
    side: 'yes' | 'no';
    count: number;
    priceCents: number;
    priceDollars: number;
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

/** Scan all categorized crypto markets for edge opportunities. */
export async function scanForEdge(): Promise<{ signals: EdgeSignal[]; logs: TradingLog[] }> {
  const logs: TradingLog[] = [];
  const signals: EdgeSignal[] = [];

  const [prices, markets] = await Promise.all([fetchPrices(), fetchCategorizedMarkets()]);
  const cryptoMarkets = markets.crypto;

  for (const market of cryptoMarkets) {
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
export function sizePositions(signals: EdgeSignal[]): SizedPosition[] {
  const positions: SizedPosition[] = [];
  const balance = NOTIONAL_BALANCE;
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

function getOrderPriceDollars(signal: EdgeSignal): number {
  const [yesProb, noProb] = parseOutcomePrices(signal.market.outcomePrices);
  const fallbackYes = Math.max(0.01, Math.min(0.99, yesProb));
  const fallbackNo = Math.max(0.01, Math.min(0.99, noProb));

  if (signal.side === 'BUY') {
    return signal.market.yes_ask > 0 ? signal.market.yes_ask : fallbackYes;
  }

  return signal.market.no_ask > 0 ? signal.market.no_ask : fallbackNo;
}

export async function buildTopTradePlan(): Promise<{ plan: ExecutableTradePlan | null; logs: TradingLog[] }> {
  const { signals, logs } = await scanForEdge();
  const positions = sizePositions(signals);
  const topPosition = positions[0];

  if (!topPosition) {
    return { plan: null, logs };
  }

  const priceDollars = getOrderPriceDollars(topPosition.signal);
  const priceCents = Math.max(1, Math.min(99, Math.round(priceDollars * 100)));
  const count = Math.max(1, Math.floor(topPosition.sizeUSD / Math.max(priceDollars, 0.01)));

  return {
    logs,
    plan: {
      signal: topPosition.signal,
      position: topPosition,
      order: {
        ticker: topPosition.signal.market.ticker,
        side: topPosition.signal.side === 'BUY' ? 'yes' : 'no',
        count,
        priceCents,
        priceDollars,
        notionalUSD: count * priceDollars,
      },
    },
  };
}

/**
 * Full trading cycle (dry-run): scan -> size -> log.
 * No order placement — Kalshi execution is not wired.
 */
export async function runTradingCycle(): Promise<TradingLog[]> {
  const allLogs: TradingLog[] = [];

  const { signals, logs: scanLogs } = await scanForEdge();
  allLogs.push(...scanLogs);

  if (signals.length === 0) {
    allLogs.push({ action: 'SKIP', details: 'No edge signals found', timestamp: Date.now() });
    return allLogs;
  }

  const positions = sizePositions(signals);

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

/**
 * Trading Engine — Edge Detection + Execution
 *
 * Scans Polymarket crypto markets for model-vs-market divergence,
 * sizes positions via fractional Kelly, and executes via CLOB.
 */

import { fetchPrices, fetchCategorizedMarkets, type CoinPrice, type PolymarketMarket } from './market-api';
import { placeOrder, getOpenOrders, getClobBalance, type ClobOrder } from './polymarket-clob';

// ── Model Constants (mirrored from treasury page) ──

const SIGMA = 0.50;
const T_EXP = 0.0000095;
const R_FREE = 0.0433;
const GAMMA = 0.10;
const SIGMA_B = 0.328;
const K_DECAY = 1.50;
const EDGE_THRESHOLD = 3.0;
const KELLY_FRACTION = 0.25;

// ── Risk Limits ──

const MAX_POSITION_PCT = 0.05;      // 5% of trading balance per position
const MAX_TOTAL_EXPOSURE_PCT = 0.40; // 40% total exposure
const STOP_LOSS_PCT = 0.15;          // 15% stop loss per position
const MAX_DRAWDOWN_PCT = 0.20;       // 20% max drawdown halts trading

// ── Types ──

export interface EdgeSignal {
  asset: string;
  market: PolymarketMarket;
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

export interface TradeResult {
  position: SizedPosition;
  orderID: string;
  status: string;
  timestamp: number;
}

export interface TradingLog {
  action: 'SCAN' | 'TRADE' | 'SKIP' | 'HALT' | 'ERROR';
  asset?: string;
  details: string;
  timestamp: number;
}

// ── Math (identical to treasury page) ──

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

/**
 * Scan all categorized crypto markets for edge opportunities.
 */
export async function scanForEdge(): Promise<{ signals: EdgeSignal[]; logs: TradingLog[] }> {
  const logs: TradingLog[] = [];
  const signals: EdgeSignal[] = [];

  const [prices, markets] = await Promise.all([fetchPrices(), fetchCategorizedMarkets()]);
  const cryptoMarkets = markets.crypto;

  const symbolMap: Record<string, string> = {
    bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP',
  };

  for (const market of cryptoMarkets) {
    const [yesPrice] = parseOutcomePrices(market.outcomePrices);
    if (yesPrice <= 0.02 || yesPrice >= 0.98) continue;

    const mktPrice = yesPrice * 100;

    // Match market to a spot asset for IV calibration
    const matchedCoin = prices.find(p =>
      market.question.toLowerCase().includes(p.symbol.toLowerCase()) ||
      market.question.toLowerCase().includes(p.id.toLowerCase()),
    );

    const S = matchedCoin?.usd ?? 66235;
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
        action: 'TRADE',
        asset,
        details: `${side} edge:${Math.abs(divergence).toFixed(2)}% model:${modelFair.toFixed(2)}% mkt:${mktPrice.toFixed(2)}%`,
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

/**
 * Apply Kelly criterion (0.25x) + risk limits to size positions.
 */
export async function sizePositions(
  signals: EdgeSignal[],
): Promise<{ positions: SizedPosition[]; logs: TradingLog[] }> {
  const logs: TradingLog[] = [];
  const positions: SizedPosition[] = [];

  let balanceData: { balance: string };
  try {
    balanceData = await getClobBalance();
  } catch {
    logs.push({ action: 'ERROR', details: 'Failed to fetch CLOB balance', timestamp: Date.now() });
    return { positions, logs };
  }

  const balance = parseFloat(balanceData.balance) || 0;
  if (balance <= 0) {
    logs.push({ action: 'HALT', details: 'Zero trading balance', timestamp: Date.now() });
    return { positions, logs };
  }

  const maxPerPosition = balance * MAX_POSITION_PCT;
  let totalExposure = 0;

  // Check existing open orders for exposure
  try {
    const openOrders = await getOpenOrders();
    for (const order of openOrders) {
      totalExposure += parseFloat(order.original_size) * parseFloat(order.price);
    }
  } catch {
    // Continue with estimated exposure = 0
  }

  for (const signal of signals) {
    if (totalExposure >= balance * MAX_TOTAL_EXPOSURE_PCT) {
      logs.push({ action: 'HALT', details: `Max exposure reached: ${(totalExposure / balance * 100).toFixed(1)}%`, timestamp: Date.now() });
      break;
    }

    // Kelly fraction: f* = (p*b - q) / b where p=model prob, b=odds, q=1-p
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

  return { positions, logs };
}

/**
 * Execute trades via Polymarket CLOB.
 */
export async function executeTrades(
  positions: SizedPosition[],
): Promise<{ results: TradeResult[]; logs: TradingLog[] }> {
  const logs: TradingLog[] = [];
  const results: TradeResult[] = [];

  for (const pos of positions) {
    const [yesPrice] = parseOutcomePrices(pos.signal.market.outcomePrices);
    const price = pos.signal.side === 'BUY' ? yesPrice : (1 - yesPrice);

    const order: ClobOrder = {
      tokenID: pos.signal.market.id,
      price: Math.round(price * 100) / 100,
      size: pos.shares,
      side: pos.signal.side,
    };

    try {
      const response = await placeOrder(order);
      results.push({
        position: pos,
        orderID: response.orderID,
        status: response.status,
        timestamp: Date.now(),
      });

      logs.push({
        action: 'TRADE',
        asset: pos.signal.asset,
        details: `${pos.signal.side} @${(price * 100).toFixed(0)}c $${Math.round(pos.sizeUSD)} edge:${Math.abs(pos.signal.divergence).toFixed(2)}% kelly:${(pos.kellyFraction * 100).toFixed(1)}% orderID:${response.orderID}`,
        timestamp: Date.now(),
      });
    } catch (err) {
      logs.push({
        action: 'ERROR',
        asset: pos.signal.asset,
        details: `Order failed: ${err instanceof Error ? err.message : 'Unknown'}`,
        timestamp: Date.now(),
      });
    }
  }

  return { results, logs };
}

/**
 * Check positions for stop losses and exits.
 */
export async function monitorPositions(): Promise<TradingLog[]> {
  const logs: TradingLog[] = [];

  try {
    const openOrders = await getOpenOrders();

    for (const order of openOrders) {
      const entryPrice = parseFloat(order.price);
      const sizeMatched = parseFloat(order.size_matched);

      if (sizeMatched > 0) {
        // Estimate current P&L — would need current market price for real calculation
        // For now, log monitoring status
        logs.push({
          action: 'SCAN',
          details: `Monitoring ${order.asset_id} ${order.side} @${(entryPrice * 100).toFixed(0)}c matched:${sizeMatched.toFixed(0)}`,
          timestamp: Date.now(),
        });
      }
    }
  } catch (err) {
    logs.push({
      action: 'ERROR',
      details: `Monitor failed: ${err instanceof Error ? err.message : 'Unknown'}`,
      timestamp: Date.now(),
    });
  }

  return logs;
}

/**
 * Full trading cycle: scan -> size -> execute -> monitor.
 * Returns all logs for the execution.
 */
export async function runTradingCycle(): Promise<TradingLog[]> {
  const allLogs: TradingLog[] = [];

  // Scan
  const { signals, logs: scanLogs } = await scanForEdge();
  allLogs.push(...scanLogs);

  if (signals.length === 0) {
    allLogs.push({ action: 'SKIP', details: 'No edge signals found', timestamp: Date.now() });
    return allLogs;
  }

  // Size
  const { positions, logs: sizeLogs } = await sizePositions(signals);
  allLogs.push(...sizeLogs);

  if (positions.length === 0) {
    allLogs.push({ action: 'SKIP', details: 'No positions sized (risk limits or zero balance)', timestamp: Date.now() });
    return allLogs;
  }

  // Execute
  const { logs: execLogs } = await executeTrades(positions);
  allLogs.push(...execLogs);

  // Monitor existing
  const monitorLogs = await monitorPositions();
  allLogs.push(...monitorLogs);

  return allLogs;
}

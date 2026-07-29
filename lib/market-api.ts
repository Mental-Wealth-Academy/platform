import { fetchTreasurySnapshot } from './treasury-snapshot';

// ── Re-exports for Polymarket (replaces former Kalshi exports) ──

export {
  fetchCategorizedMarkets,
  fetchPolymarketMarkets,
  fetchPolymarketRecentTrades,
  fetchPolymarketOrderbook,
} from './polymarket-api';
export type {
  CategorizedMarkets,
  MarketCategory,
  MarketRow,
  RecentTrade,
  PolymarketMarket,
  PolymarketEvent,
  OrderbookSide,
} from './polymarket-api';


// ── Types ──

export interface CoinPrice {
  id: string;
  symbol: string;
  usd: number;
  usd_24h_change: number | null;
  usd_24h_vol: number | null;
}

export interface TreasuryBalance {
  raw: string;
  formatted: string;
  usd: number;
  wallet: { raw: string; formatted: string; usd: number };
  governance: { raw: string; formatted: string; usd: number };
  trader: { raw: string; formatted: string; usd: number };
  updatedAt: string;
}

export interface OrderFlowMetrics {
  takerBuyCount: number;
  takerSellCount: number;
  takerBuyVolume: number;
  takerSellVolume: number;
  totalTrades: number;
  takerBuyRatio: number;
  flowDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  makerEdgeEstimate: number;
  recentTrades: { price: number; size: number; side: string; ts: string }[];
}

// ── Cache ──

let _prices: { data: CoinPrice[]; ts: number } | null = null;
let _balance: { data: TreasuryBalance; ts: number } | null = null;

// ── Constants ──

const COINGECKO_IDS = 'bitcoin,ethereum,solana,ripple,pax-gold';
const SYMBOL_MAP: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  ripple: 'XRP',
  'pax-gold': 'GOLD',
};

// ── Fetchers ──

/**
 * Fetch crypto prices from CoinGecko free API.
 * 30s module-level cache; returns stale on 429.
 */
export async function fetchPrices(): Promise<CoinPrice[]> {
  if (_prices && Date.now() - _prices.ts < 30_000) return _prices.data;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 429 && _prices) return _prices.data;
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const json = await res.json();

    const coins: CoinPrice[] = Object.entries(SYMBOL_MAP).map(([id, symbol]) => ({
      id,
      symbol,
      usd: json[id]?.usd ?? 0,
      usd_24h_change: json[id]?.usd_24h_change ?? null,
      usd_24h_vol: json[id]?.usd_24h_vol ?? null,
    }));

    _prices = { data: coins, ts: Date.now() };
    return coins;
  } catch (err) {
    if (_prices) return _prices.data;
    throw err;
  }
}

function formatUsd(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Fetch the verified USDC-equivalent value of Blue's wallet and configured
 * treasury contracts. The underlying snapshot includes native ETH, USDC, and
 * cbBTC. Diamonds remain visible as an unpriced holding until a liquid market
 * supplies a defensible quote.
 */
export async function fetchTreasuryBalance(): Promise<TreasuryBalance> {
  if (_balance && Date.now() - _balance.ts < 60_000) return _balance.data;

  try {
    const snapshot = await fetchTreasurySnapshot();
    const totalValue = Number(snapshot.valuation.amountUsdc);
    if (
      snapshot.valuation.amountUsdc === null ||
      !Number.isFinite(totalValue) ||
      totalValue < 0
    ) {
      throw new Error('Treasury valuation is unavailable.');
    }

    const accountValue = (role: 'wallet' | 'governance' | 'trader') => {
      const value = Number(snapshot.accounts.find((account) => account.role === role)?.valueUsdc);
      const amount = Number.isFinite(value) && value >= 0 ? value : 0;
      return {
        raw: BigInt(Math.round(amount * 1_000_000)).toString(),
        formatted: formatUsd(amount),
        usd: amount,
      };
    };

    const result: TreasuryBalance = {
      raw: BigInt(Math.round(totalValue * 1_000_000)).toString(),
      formatted: formatUsd(totalValue),
      usd: totalValue,
      wallet: accountValue('wallet'),
      governance: accountValue('governance'),
      trader: accountValue('trader'),
      updatedAt: snapshot.updatedAt,
    };

    _balance = { data: result, ts: Date.now() };
    return result;
  } catch (err) {
    console.error('fetchTreasuryBalance error:', err);
    if (_balance) return _balance.data;
    throw new Error('Treasury balance is unavailable.');
  }
}

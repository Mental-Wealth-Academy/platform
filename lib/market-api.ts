import { providers, Contract } from 'ethers';

// ── Re-exports for Kalshi (replaces former Polymarket exports) ──

export {
  fetchCategorizedMarkets,
  fetchKalshiMarkets,
  fetchKalshiBtcTrades,
  fetchKalshiOrderbook,
} from './kalshi-api';
export type {
  CategorizedMarkets,
  MarketCategory,
  MarketRow,
  RecentTrade,
  KalshiMarket,
  KalshiTrade,
  KalshiOrderbookSide,
} from './kalshi-api';

// Legacy aliases — kept so existing call sites don't all need to change
// in lockstep. New code should import from './kalshi-api' directly.
export type { MarketRow as PolymarketMarket } from './kalshi-api';
export type { RecentTrade as PolymarketTrade } from './kalshi-api';
import { fetchKalshiBtcTrades as _fetchKalshiBtcTrades } from './kalshi-api';
export const fetchPolymarketTrades = _fetchKalshiBtcTrades;

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
  governance: { raw: string; formatted: string; usd: number };
  trader: { raw: string; formatted: string; usd: number };
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

export interface AppleTokenStats {
  price: number;
  holders: number;
  epochPnL: number;
  nextDistribution: string;
}

// ── Cache ──

let _prices: { data: CoinPrice[]; ts: number } | null = null;
let _balance: { data: TreasuryBalance; ts: number } | null = null;
let _applePrice: { data: number; ts: number } | null = null;

// ── Constants ──

const COINGECKO_IDS = 'bitcoin,ethereum,solana,ripple,pax-gold';
const SYMBOL_MAP: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  ripple: 'XRP',
  'pax-gold': 'GOLD',
};

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_BLUE_KILLSTREAK_ADDRESS ||
  '0x2cbb90a761ba64014b811be342b8ef01b471992d';
const TRADER_ADDRESS =
  process.env.NEXT_PUBLIC_BLUE_MARKET_TRADER_ADDRESS || '';
const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const RPC_URL =
  process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

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
 * Fetch on-chain USDC balance of both the governance and trader contracts.
 * Returns individual balances plus a combined total.
 * 60s module-level cache; falls back to cached/fallback on error.
 */
export async function fetchTreasuryBalance(): Promise<TreasuryBalance> {
  if (_balance && Date.now() - _balance.ts < 60_000) return _balance.data;

  try {
    const provider = new providers.JsonRpcProvider(RPC_URL);
    const usdc = new Contract(USDC_ADDRESS, USDC_ABI, provider);

    const decimals: number = await usdc.decimals();
    const divisor = 10 ** Number(decimals);

    const govRaw = await usdc.balanceOf(CONTRACT_ADDRESS);
    const govNum = Number(govRaw) / divisor;

    let traderRaw = '0';
    let traderNum = 0;
    if (TRADER_ADDRESS) {
      const rawBal = await usdc.balanceOf(TRADER_ADDRESS);
      traderRaw = rawBal.toString();
      traderNum = Number(rawBal) / divisor;
    }

    const totalNum = govNum + traderNum;

    const result: TreasuryBalance = {
      raw: (BigInt(govRaw.toString()) + BigInt(traderRaw)).toString(),
      formatted: formatUsd(totalNum),
      usd: totalNum,
      governance: { raw: govRaw.toString(), formatted: formatUsd(govNum), usd: govNum },
      trader: { raw: traderRaw, formatted: formatUsd(traderNum), usd: traderNum },
    };

    _balance = { data: result, ts: Date.now() };
    return result;
  } catch (err) {
    console.error('fetchTreasuryBalance error:', err);
    if (_balance) return _balance.data;
    const fallback = { raw: '0', formatted: '0.00', usd: 0 };
    return { raw: '0', formatted: '5,252.00', usd: 5252, governance: { raw: '0', formatted: '5,252.00', usd: 5252 }, trader: fallback };
  }
}

/**
 * Fetch APPLE token price from its Uniswap V3 pool on Base.
 * Reads slot0 for the current sqrtPriceX96 and computes the USDC price.
 * 30s module-level cache.
 */
export async function fetchApplePrice(): Promise<number> {
  if (_applePrice && Date.now() - _applePrice.ts < 30_000) return _applePrice.data;

  const poolAddress = process.env.APPLE_UNISWAP_POOL;
  if (!poolAddress) return 0;

  const POOL_ABI = [
    'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function token0() view returns (address)',
  ];

  try {
    const provider = new providers.JsonRpcProvider(RPC_URL);
    const pool = new Contract(poolAddress, POOL_ABI, provider);

    const [slot0, token0] = await Promise.all([pool.slot0(), pool.token0()]);
    const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96.toString());

    const Q96 = BigInt(2) ** BigInt(96);
    const num = sqrtPriceX96 * sqrtPriceX96;
    const denom = Q96 * Q96;

    const isToken0USDC = token0.toLowerCase() === USDC_ADDRESS.toLowerCase();

    let price: number;
    if (isToken0USDC) {
      price = Number(denom * BigInt(10 ** 12) / num) / 10 ** 12;
    } else {
      price = Number(num / (denom / BigInt(10 ** 12))) / 10 ** 12;
    }

    _applePrice = { data: price, ts: Date.now() };
    return price;
  } catch (err) {
    console.error('fetchApplePrice error:', err);
    if (_applePrice) return _applePrice.data;
    return 0;
  }
}

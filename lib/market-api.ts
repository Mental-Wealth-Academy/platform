import { providers, Contract } from 'ethers';

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
}

export interface PolymarketMarket {
  id: string;
  question: string;
  outcomePrices: string; // JSON string of [yesPrice, noPrice]
  volume: number | string;
  liquidity: number | string;
  endDate: string;
  active: boolean;
}

// ── Cache ──

let _prices: { data: CoinPrice[]; ts: number } | null = null;
let _balance: { data: TreasuryBalance; ts: number } | null = null;
let _poly: { data: PolymarketMarket[]; ts: number } | null = null;

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
  process.env.NEXT_PUBLIC_AZURA_KILLSTREAK_ADDRESS ||
  '0x2cbb90a761ba64014b811be342b8ef01b471992d';
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

/**
 * Fetch on-chain USDC balance of the treasury contract.
 * 60s module-level cache; falls back to $5,252.00 on error.
 */
export async function fetchTreasuryBalance(): Promise<TreasuryBalance> {
  if (_balance && Date.now() - _balance.ts < 60_000) return _balance.data;

  try {
    const provider = new providers.JsonRpcProvider(RPC_URL);
    const usdc = new Contract(USDC_ADDRESS, USDC_ABI, provider);

    const decimals: number = await usdc.decimals();
    const balanceRaw = await usdc.balanceOf(CONTRACT_ADDRESS);
    const balanceNum = Number(balanceRaw) / 10 ** Number(decimals);

    const result: TreasuryBalance = {
      raw: balanceRaw.toString(),
      formatted: balanceNum.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      usd: balanceNum,
    };

    _balance = { data: result, ts: Date.now() };
    return result;
  } catch (err) {
    console.error('fetchTreasuryBalance error:', err);
    if (_balance) return _balance.data;
    // Fallback matches TreasuryDisplay.tsx
    return { raw: '0', formatted: '5,252.00', usd: 5252 };
  }
}

/**
 * Fetch top crypto prediction markets from Polymarket Gamma API.
 * 60s module-level cache.
 */
export async function fetchPolymarketCrypto(): Promise<PolymarketMarket[]> {
  if (_poly && Date.now() - _poly.ts < 60_000) return _poly.data;

  const url =
    'https://gamma-api.polymarket.com/markets?tag=crypto&active=true&closed=false&limit=10&order=volume&ascending=false';

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 429 && _poly) return _poly.data;
    if (!res.ok) throw new Error(`Polymarket ${res.status}`);

    const json: PolymarketMarket[] = await res.json();
    _poly = { data: json, ts: Date.now() };
    return json;
  } catch (err) {
    if (_poly) return _poly.data;
    throw err;
  }
}

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

export interface PolymarketTrade {
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
  title: string;
  slug: string;
  outcome: string;
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

export type MarketCategory = 'crypto' | 'ai' | 'sports' | 'politics';

export interface CategorizedMarkets {
  crypto: PolymarketMarket[];
  ai: PolymarketMarket[];
  sports: PolymarketMarket[];
  politics: PolymarketMarket[];
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
let _poly: { data: PolymarketMarket[]; ts: number } | null = null;
let _polyGrouped: { data: CategorizedMarkets; ts: number } | null = null;
let _trades: { data: PolymarketTrade[]; ts: number } | null = null;
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

// ── Curated Polymarket Categories (event-based) ──

const EVENTS_URL =
  'https://gamma-api.polymarket.com/events?active=true&closed=false&order=volume&ascending=false&limit=50';

const CATEGORY_ALLOW: Record<MarketCategory, RegExp> = {
  crypto: /bitcoin|btc|ethereum|eth|solana|sol|xrp|ripple|crypto|stablecoin|defi|web3|cardano|dogecoin|coinbase|microstrategy|megaeth/i,
  ai: /\bai\b|artificial intelligence|openai|gpt|anthropic|claude|deepseek|llm|machine learning|gemini|chatgpt|frontier model/i,
  sports: /nba|nfl|mlb|nhl|premier league|champions league|super bowl|world cup|ufc|boxing|tennis|grand slam|olympics|formula 1|\bf1\b|world series|playoffs|mvp|championship|serie a|la liga|bundesliga|march madness|stanley cup|australian open/i,
  politics: /president|election|congress|senate|governor|supreme court|legislation|policy|democrat|republican|vote|ballot|cabinet|impeach|approval|parliament|tariff|federal reserve|fed chair|fed rate|treasury secretary|ceasefire|prime minister|coalition/i,
};

const BLOCKLIST =
  /elon.*tweet|tweet.*count|musk.*post|big brother|love island|reality tv|influencer|celebrity|jersey number|kanye|kardashian|tier list|zodiac|astrology|onlyfans|stranger things|jesus christ|\bgta\b|greenland/i;

const PER_CATEGORY = 3;

interface GammaEvent {
  title: string;
  slug: string;
  volume: number | string;
  markets: PolymarketMarket[];
}

/** Pick the most balanced, highest-volume market from an event. Skips lopsided (>98 or <2). */
function pickBestMarket(mkts: PolymarketMarket[]): PolymarketMarket | null {
  let best: PolymarketMarket | null = null;
  let bestScore = -1;

  for (const m of mkts) {
    let yes: number;
    try {
      const prices = JSON.parse(m.outcomePrices);
      yes = Number(prices[0]) || 0;
    } catch {
      continue;
    }
    // Skip lopsided / settled
    if (yes <= 0.02 || yes >= 0.98) continue;

    const vol = Number(m.volume) || 0;
    const balance = 1 - Math.abs(yes - 0.5) * 2; // 1.0 at 50/50, 0 at edges
    const score = balance * 0.7 + Math.min(vol / 1e7, 1.0) * 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/**
 * Fetch curated markets across crypto, AI, sports, politics.
 * Uses the events endpoint and picks the best market per event.
 * 60s module-level cache. Filters out meme/noise.
 */
export async function fetchCategorizedMarkets(): Promise<CategorizedMarkets> {
  if (_polyGrouped && Date.now() - _polyGrouped.ts < 60_000)
    return _polyGrouped.data;

  try {
    const res = await fetch(EVENTS_URL, { cache: 'no-store' });
    if (res.status === 429 && _polyGrouped) return _polyGrouped.data;
    if (!res.ok) throw new Error(`Polymarket events ${res.status}`);

    const events: GammaEvent[] = await res.json();

    const result: CategorizedMarkets = { crypto: [], ai: [], sports: [], politics: [] };

    for (const evt of events) {
      const title = evt.title || '';
      if (BLOCKLIST.test(title)) continue;

      for (const cat of ['crypto', 'ai', 'sports', 'politics'] as MarketCategory[]) {
        if (result[cat].length >= PER_CATEGORY) continue;
        if (!CATEGORY_ALLOW[cat].test(title)) continue;

        const best = pickBestMarket(evt.markets || []);
        if (best) {
          result[cat].push(best);
          break; // one event → one category
        }
      }
    }

    _polyGrouped = { data: result, ts: Date.now() };
    return result;
  } catch (err) {
    if (_polyGrouped) return _polyGrouped.data;
    throw err;
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

    // price = (sqrtPriceX96 / 2^96)^2, adjusted for decimals
    // APPLE has 18 decimals, USDC has 6 decimals
    const Q96 = BigInt(2) ** BigInt(96);
    const num = sqrtPriceX96 * sqrtPriceX96;
    const denom = Q96 * Q96;

    const isToken0USDC = token0.toLowerCase() === USDC_ADDRESS.toLowerCase();

    let price: number;
    if (isToken0USDC) {
      // price = denom / num * 10^(18-6)
      price = Number(denom * BigInt(10 ** 12) / num) / 10 ** 12;
    } else {
      // price = num / denom * 10^(6-18)
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

/**
 * Fetch recent BTC trades from Polymarket Data API.
 * 30s module-level cache; filters for BTC-related markets.
 */
export async function fetchPolymarketTrades(): Promise<PolymarketTrade[]> {
  if (_trades && Date.now() - _trades.ts < 30_000) return _trades.data;

  const url = 'https://data-api.polymarket.com/trades?limit=100';

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 429 && _trades) return _trades.data;
    if (!res.ok) throw new Error(`Polymarket Data API ${res.status}`);

    const raw: PolymarketTrade[] = await res.json();
    const btcTrades = raw.filter(
      (t) => /btc|bitcoin/i.test(t.title || '') || /btc/i.test(t.slug || ''),
    );

    _trades = { data: btcTrades, ts: Date.now() };
    return btcTrades;
  } catch (err) {
    if (_trades) return _trades.data;
    throw err;
  }
}

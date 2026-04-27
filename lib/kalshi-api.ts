/**
 * Kalshi public-data client.
 *
 * Kalshi is a CFTC-regulated US prediction market exchange. This module
 * fetches public market data (no auth) for display and analysis.
 *
 * Prices are returned by Kalshi in cents (1-99). We expose two shapes:
 *   - Native: yesAsk, yesBid, noAsk, noBid as integers in cents
 *   - Compat: outcomePrices as a JSON string `[yesProb, noProb]` in 0-1 floats,
 *     so existing UI/engine code that calls parseOutcomePrices keeps working.
 */

const KALSHI_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

// ── Types ──

export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  series_ticker?: string;
  title: string;
  yes_sub_title?: string;
  status: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
  volume_24h: number;
  open_interest: number;
  liquidity: number;
  close_time: string;
  expected_expiration_time?: string;
}

export interface KalshiTrade {
  trade_id: string;
  ticker: string;
  taker_side: 'yes' | 'no';
  yes_price: number;
  no_price: number;
  count: number;
  created_time: string;
}

export interface KalshiOrderbookSide {
  yes: [number, number][];
  no: [number, number][];
}

/**
 * Compatibility wrapper — keeps the same field names the UI and engine
 * already consume from the old PolymarketMarket shape, so we don't have
 * to rewrite every consumer in lockstep.
 */
export interface MarketRow {
  id: string;             // Kalshi ticker
  question: string;       // Kalshi title (or yes_sub_title if more specific)
  outcomePrices: string;  // JSON string `[yesProb, noProb]` in 0-1
  volume: number | string;
  liquidity: number | string;
  endDate: string;        // close_time
  active: boolean;
  ticker: string;
  event_ticker: string;
  yes_ask: number;
  no_ask: number;
}

export interface RecentTrade {
  price: number;          // 0-1 prob
  size: number;
  side: 'BUY' | 'SELL';
  timestamp: number;      // ms
  title: string;
  slug: string;
  outcome: string;
}

export type MarketCategory = 'crypto' | 'ai' | 'sports' | 'politics';

export interface CategorizedMarkets {
  crypto: MarketRow[];
  ai: MarketRow[];
  sports: MarketRow[];
  politics: MarketRow[];
}

// ── Cache ──

let _markets: { data: MarketRow[]; ts: number } | null = null;
let _grouped: { data: CategorizedMarkets; ts: number } | null = null;
let _trades: { data: RecentTrade[]; ts: number } | null = null;

// ── Helpers ──

/** Convert a Kalshi market into the compat MarketRow shape. */
function toRow(m: KalshiMarket): MarketRow {
  // yes_ask is the price you'd pay to buy YES (in cents). The implied prob
  // of YES resolution sits between yes_bid and yes_ask. We use the midpoint
  // of yes_ask/yes_bid when both are present, falling back to last_price.
  const bid = Number(m.yes_bid) || 0;
  const ask = Number(m.yes_ask) || 0;
  const last = Number(m.last_price) || 0;
  const cents =
    bid > 0 && ask > 0 ? (bid + ask) / 2
    : ask > 0 ? ask
    : bid > 0 ? bid
    : last;
  const yesProb = Math.max(0, Math.min(1, cents / 100));
  const noProb = Math.max(0, Math.min(1, 1 - yesProb));

  return {
    id: m.ticker,
    question: (m.yes_sub_title && m.yes_sub_title.length > 8) ? m.yes_sub_title : m.title,
    outcomePrices: JSON.stringify([yesProb, noProb]),
    volume: m.volume_24h ?? m.volume ?? 0,
    liquidity: m.liquidity ?? 0,
    endDate: m.close_time,
    active: m.status === 'open' || m.status === 'active',
    ticker: m.ticker,
    event_ticker: m.event_ticker,
    yes_ask: ask,
    no_ask: Number(m.no_ask) || 0,
  };
}

// ── Category routing ──
//
// Kalshi groups markets via series_ticker / event_ticker prefixes. KX is
// the modern (2025+) prefix; we also keep loose title regex as a fallback
// because Kalshi has thousands of markets and not every one fits a clean
// prefix.

const CATEGORY_TICKER_PREFIX: Record<MarketCategory, RegExp> = {
  crypto: /^KX(BTC|ETH|SOL|XRP|DOGE|LTC|BCH|CRYPTO|STABLE|ETF)/i,
  ai: /^KX(AI|GPT|OPENAI|ANTHROPIC|CLAUDE|LLM|GEMINI|DEEPSEEK)/i,
  sports: /^KX(NFL|NBA|MLB|NHL|UFC|F1|EPL|UCL|GOLF|TENNIS|MMA|SOCCER|CFB|CBB|WORLDSER|SUPERBOWL)/i,
  politics: /^KX(PRES|SENATE|HOUSE|GOV|CONGRESS|ELECT|FED|TRUMP|BIDEN|VANCE|HARRIS|TARIFF|SCOTUS|POL)/i,
};

const CATEGORY_TITLE_REGEX: Record<MarketCategory, RegExp> = {
  crypto: /bitcoin|btc|ethereum|eth|solana|sol|xrp|ripple|crypto|stablecoin|defi|web3|cardano|dogecoin|coinbase|microstrategy|binance|tether|usdc/i,
  ai: /\bai\b|artificial intelligence|openai|gpt|anthropic|claude|deepseek|llm|machine learning|gemini|chatgpt|frontier model|copilot/i,
  sports: /nba|nfl|mlb|nhl|premier league|champions league|super bowl|world cup|ufc|boxing|tennis|grand slam|olympics|formula 1|\bf1\b|world series|playoffs|mvp|championship|serie a|la liga|bundesliga|march madness|stanley cup|australian open/i,
  politics: /president|election|congress|senate|governor|supreme court|legislation|policy|democrat|republican|vote|ballot|cabinet|impeach|approval|parliament|tariff|federal reserve|fed chair|fed rate|treasury secretary|ceasefire|prime minister|coalition/i,
};

const BLOCKLIST =
  /elon.*tweet|tweet.*count|musk.*post|big brother|love island|reality tv|influencer|celebrity|jersey number|kanye|kardashian|tier list|zodiac|astrology|onlyfans|stranger things|jesus christ|\bgta\b|greenland/i;

const PER_CATEGORY = 5;
const MAX_DAYS_OUT = 90;

function categorize(m: MarketRow): MarketCategory | null {
  const title = m.question || '';
  if (BLOCKLIST.test(title)) return null;
  for (const cat of ['crypto', 'ai', 'sports', 'politics'] as MarketCategory[]) {
    if (CATEGORY_TICKER_PREFIX[cat].test(m.event_ticker || m.ticker)) return cat;
  }
  for (const cat of ['crypto', 'ai', 'sports', 'politics'] as MarketCategory[]) {
    if (CATEGORY_TITLE_REGEX[cat].test(title)) return cat;
  }
  return null;
}

/**
 * Score a market for inclusion in the curated feed:
 *   40% balance (closer to 50/50 = better for our edge model)
 *   25% volume (capped)
 *   35% end-date proximity (sooner = better)
 */
function score(m: MarketRow): number {
  let yes: number;
  try {
    const arr = JSON.parse(m.outcomePrices);
    yes = Number(arr[0]) || 0;
  } catch {
    return -1;
  }
  if (yes <= 0.02 || yes >= 0.98) return -1;

  const now = Date.now();
  const maxMs = MAX_DAYS_OUT * 86_400_000;
  const endMs = m.endDate ? new Date(m.endDate).getTime() - now : Infinity;
  if (endMs <= 0 || endMs > maxMs) return -1;

  const vol = Number(m.volume) || 0;
  const balance = 1 - Math.abs(yes - 0.5) * 2;
  const proximity = 1 - endMs / maxMs;
  return balance * 0.40 + Math.min(vol / 1e7, 1.0) * 0.25 + proximity * 0.35;
}

// ── Fetchers ──

/**
 * Fetch a broad list of active Kalshi markets.
 * 60s in-memory cache; returns stale on rate limit.
 */
export async function fetchKalshiMarkets(limit = 200): Promise<MarketRow[]> {
  if (_markets && Date.now() - _markets.ts < 60_000) return _markets.data;

  const url = `${KALSHI_BASE}/markets?status=open&limit=${limit}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 429 && _markets) return _markets.data;
    if (!res.ok) throw new Error(`Kalshi markets ${res.status}`);

    const json = await res.json();
    const rows: MarketRow[] = (json.markets || []).map((m: KalshiMarket) => toRow(m));
    _markets = { data: rows, ts: Date.now() };
    return rows;
  } catch (err) {
    if (_markets) return _markets.data;
    throw err;
  }
}

/**
 * Fetch curated markets across crypto, AI, sports, politics.
 * 60s cache. Filters meme/noise via BLOCKLIST.
 */
export async function fetchCategorizedMarkets(): Promise<CategorizedMarkets> {
  if (_grouped && Date.now() - _grouped.ts < 60_000) return _grouped.data;

  try {
    const all = await fetchKalshiMarkets(500);

    const buckets: Record<MarketCategory, { row: MarketRow; score: number }[]> = {
      crypto: [], ai: [], sports: [], politics: [],
    };

    for (const row of all) {
      const cat = categorize(row);
      if (!cat) continue;
      const s = score(row);
      if (s < 0) continue;
      buckets[cat].push({ row, score: s });
    }

    const result: CategorizedMarkets = { crypto: [], ai: [], sports: [], politics: [] };
    for (const cat of ['crypto', 'ai', 'sports', 'politics'] as MarketCategory[]) {
      buckets[cat].sort((a, b) => b.score - a.score);
      result[cat] = buckets[cat].slice(0, PER_CATEGORY).map((x) => x.row);
    }

    _grouped = { data: result, ts: Date.now() };
    return result;
  } catch (err) {
    if (_grouped) return _grouped.data;
    throw err;
  }
}

/**
 * Fetch recent BTC trades from Kalshi.
 * 30s cache; filters by event_ticker prefix KXBTC.
 */
export async function fetchKalshiBtcTrades(): Promise<RecentTrade[]> {
  if (_trades && Date.now() - _trades.ts < 30_000) return _trades.data;

  // Kalshi /markets/trades returns recent trades across all markets.
  const url = `${KALSHI_BASE}/markets/trades?limit=200`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 429 && _trades) return _trades.data;
    if (!res.ok) throw new Error(`Kalshi trades ${res.status}`);

    const json = await res.json();
    const raw: KalshiTrade[] = json.trades || [];

    const btc = raw.filter((t) => /^KXBTC/i.test(t.ticker));
    const mapped: RecentTrade[] = btc.map((t) => ({
      price: (Number(t.yes_price) || 0) / 100,
      size: Number(t.count) || 0,
      side: t.taker_side === 'yes' ? 'BUY' : 'SELL',
      timestamp: new Date(t.created_time).getTime(),
      title: t.ticker,
      slug: t.ticker.toLowerCase(),
      outcome: t.taker_side === 'yes' ? 'YES' : 'NO',
    }));

    _trades = { data: mapped, ts: Date.now() };
    return mapped;
  } catch (err) {
    if (_trades) return _trades.data;
    throw err;
  }
}

/**
 * Fetch the orderbook for a single Kalshi market.
 * No cache — orderbooks are point-in-time and consumed live.
 */
export async function fetchKalshiOrderbook(ticker: string): Promise<KalshiOrderbookSide> {
  const url = `${KALSHI_BASE}/markets/${encodeURIComponent(ticker)}/orderbook`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Kalshi orderbook ${res.status}`);
  const json = await res.json();
  return {
    yes: json.orderbook?.yes || [],
    no: json.orderbook?.no || [],
  };
}

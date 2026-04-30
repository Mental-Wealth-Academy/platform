/**
 * Kalshi public-data client.
 *
 * Kalshi is a CFTC-regulated US prediction market exchange. This module
 * fetches public market data (no auth) for display and analysis.
 *
 * Schema notes (verified against live API 2026-04-27):
 *   - Base URL: https://api.elections.kalshi.com/trade-api/v2
 *   - Price fields are STRINGS in dollars 0..1 (e.g. "0.0100" = 1¢) suffixed `_dollars`.
 *   - Counts/volumes are strings suffixed `_fp` (fixed-point as string).
 *   - Orderbook wrapper is `orderbook_fp`, sides are `yes_dollars`/`no_dollars`.
 *   - Status for live markets is `"active"` (request filter `status=open` works).
 *
 * Categorization uses curated Kalshi series tickers discovered from
 * /series and verified through /events?with_nested_markets=true.
 */

const KALSHI_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

// ── Native Kalshi types ──

export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  series_ticker?: string;
  title: string;
  subtitle?: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  status: string;
  market_type?: string;
  yes_bid_dollars: string;
  yes_ask_dollars: string;
  no_bid_dollars: string;
  no_ask_dollars: string;
  last_price_dollars: string;
  previous_price_dollars?: string;
  volume_fp: string;
  volume_24h_fp: string;
  liquidity_dollars: string;
  open_interest_fp: string;
  open_time?: string;
  close_time: string;
  expected_expiration_time?: string;
  expiration_time?: string;
}

export interface KalshiTrade {
  trade_id: string;
  ticker: string;
  taker_side: 'yes' | 'no';
  yes_price_dollars: string;
  no_price_dollars: string;
  count_fp: string;
  created_time: string;
}

export interface KalshiOrderbookSide {
  yes: [number, number][];
  no: [number, number][];
}

interface KalshiEvent {
  event_ticker: string;
  series_ticker: string;
  title: string;
  category: string;
  sub_title?: string;
  markets: KalshiMarket[];
}

// ── Compat shape ──

export interface MarketRow {
  id: string;
  question: string;
  outcomePrices: string;  // JSON `[yesProb, noProb]` 0-1
  volume: number;
  liquidity: number;
  endDate: string;
  active: boolean;
  ticker: string;
  event_ticker: string;
  yes_ask: number;
  no_ask: number;
}

export interface RecentTrade {
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
  title: string;
  slug: string;
  outcome: string;
}

export type MarketCategory = 'commodities' | 'economics' | 'ai' | 'politics';

export interface CategorizedMarkets {
  commodities: MarketRow[];
  economics: MarketRow[];
  ai: MarketRow[];
  politics: MarketRow[];
}

// ── Cache ──

let _grouped: { data: CategorizedMarkets; ts: number } | null = null;
let _trades: { data: RecentTrade[]; ts: number } | null = null;

const MARKETS_CACHE_MS = 5 * 60 * 1000;
const TRADES_CACHE_MS = 30 * 1000;

// ── Helpers ──

function num(s: string | number | undefined | null, fallback = 0): number {
  if (s == null) return fallback;
  const n = typeof s === 'number' ? s : parseFloat(s);
  return isFinite(n) ? n : fallback;
}

function pickQuestion(eventTitle: string, m: KalshiMarket): string {
  const title = (eventTitle || m.title || '').trim();
  const sub = (m.yes_sub_title || m.subtitle || '').trim();
  if (title && sub && !title.includes(sub)) return `${title} — ${sub}`;
  return title || sub || m.ticker;
}

function toRow(eventTitle: string, m: KalshiMarket): MarketRow {
  const bid = num(m.yes_bid_dollars);
  const ask = num(m.yes_ask_dollars);
  const last = num(m.last_price_dollars);

  // Detect placeholder bid==0 / ask==1 so we don't mark the midpoint as 50/50.
  const placeholder = bid === 0 && ask === 1;
  let yesProb: number;
  if (!placeholder && bid > 0 && ask > 0) yesProb = (bid + ask) / 2;
  else if (last > 0) yesProb = last;
  else if (ask > 0 && ask < 1) yesProb = ask;
  else yesProb = 0;

  yesProb = Math.max(0, Math.min(1, yesProb));
  const noProb = 1 - yesProb;

  const vol24 = num(m.volume_24h_fp);
  const volTotal = num(m.volume_fp);

  return {
    id: m.ticker,
    question: pickQuestion(eventTitle, m),
    outcomePrices: JSON.stringify([yesProb, noProb]),
    volume: vol24 > 0 ? vol24 : volTotal,
    liquidity: num(m.liquidity_dollars),
    endDate: m.close_time,
    active: m.status === 'active' || m.status === 'open',
    ticker: m.ticker,
    event_ticker: m.event_ticker,
    yes_ask: ask,
    no_ask: num(m.no_ask_dollars),
  };
}

// AI-relevant subset of "Science and Technology" — that category includes
// space launches, Mars colonization, etc. We only want AI-flavored markets.
const AI_TITLE_REGEX =
  /\bai\b|artificial intelligence|openai|gpt|chatgpt|anthropic|claude|deepseek|llm|machine learning|gemini|frontier model|copilot|grok|xai|meta ai/i;

const BLOCKLIST =
  /elon.*tweet|tweet.*count|musk.*post|big brother|love island|reality tv|influencer|celebrity|jersey number|kanye|kardashian|tier list|zodiac|astrology|onlyfans|stranger things|jesus christ|\bgta\b|greenland/i;

const PER_CATEGORY = 5;
const MAX_DAYS_OUT = 90;
const INITIAL_SERIES_PER_CATEGORY = 6;
const SERIES_FETCH_CHUNK = 3;

const MARKET_CATEGORIES: MarketCategory[] = ['commodities', 'economics', 'ai', 'politics'];

// Curated high-volume series tickers per output bucket. /series?category=
// returns the full series catalog including dead/test series — these were
// hand-picked from live data and ordered so current/recurring markets are tried first.
const CURATED_SERIES: Record<MarketCategory, string[]> = {
  commodities: [
    'KXAAAGASD', 'KXAAAGASM', 'KXAAAGASY',
    'KXDIESELM', 'KXOIL', 'WTIW',
    'NGAS', 'KXWHEAT', 'GOLD',
    'KXSPRLVL', 'CPIGAS',
  ],
  economics: [
    'FED', 'KXFEDDECISION', 'KXEFFR', 'LOWESTRATE',
    'KXPCECORE', 'PCECORE', 'LCPIMAXYOY', 'KXCOREUND',
    'KXHPI', 'HOMEUS', 'HOMEUSY', 'KXHOUSELENGTH',
    'KXU3MAX', 'KXU3MIN', 'NFPDELAY',
    'GDP', 'KXGDPYEAR', 'GDPUSMAX',
    'KXTNOTE', 'KXTNOTED', 'KX10Y2Y',
  ],
  politics: [
    'KXKASHOUT', 'KXIMPEACHCABINET', 'KXLEAVEHOUSECOMBO', 'KXLEAVEBONDI',
    'KXTRANSSPORTS', 'KXMINWAGE', 'KXSCOTUSPOWER', 'KXFENT',
    'KXTIKTOKCOURT', 'KXNATIONALE', 'KXDCEIL', 'KXMUNIBONDTAX',
    'KXICERENAME', 'KXTAIWANLVL4', 'KXZELENSKYPUTIN', 'KXINSURRECTION',
    'KXVOTEFEDCHAIR', 'KXIPCGAZA',
  ],
  ai: [
    'KXOAIAGI', 'KXGPT', 'KXOAISCREEN', 'KXAIPAUSE', 'KXOAIHARDWARE',
    'KXTOPLLM', 'KXLEAVEOPENAI', 'KXJOINANTHROPIC', 'KXCLAUDE5', 'KXCLAUDE4',
    'KXAIOPEN', 'KXFRONTIER', 'KXTOP3AI',
  ],
};

const PRIORITY_SERIES: Record<MarketCategory, string[]> = {
  commodities: ['KXAAAGASD', 'KXAAAGASM', 'KXOIL', 'WTIW', 'NGAS', 'GOLD'],
  economics: ['FED', 'KXFEDDECISION', 'KXPCECORE', 'KXEFFR', 'KXHPI', 'KXTNOTE'],
  politics: ['KXKASHOUT', 'KXMINWAGE', 'KXSCOTUSPOWER', 'KXTIKTOKCOURT', 'KXVOTEFEDCHAIR', 'KXTAIWANLVL4'],
  ai: ['KXOAIAGI', 'KXGPT', 'KXTOPLLM', 'KXCLAUDE5', 'KXFRONTIER', 'KXTOP3AI'],
};

/**
 * Score: 40% balance (closer to 50/50), 25% volume (capped), 35% end-date proximity.
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
  return balance * 0.40 + Math.min(vol / 10_000, 1.0) * 0.25 + proximity * 0.35;
}

// ── Fetchers ──

async function fetchEventsForSeries(seriesTicker: string): Promise<KalshiEvent[]> {
  const params = new URLSearchParams({
    status: 'open',
    with_nested_markets: 'true',
    series_ticker: seriesTicker,
    limit: '20',
  });
  // Retry once on 429 with a short backoff — Kalshi rate-limits modest bursts.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${KALSHI_BASE}/events?${params}`, { cache: 'no-store' });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 250 + Math.random() * 250));
        continue;
      }
      if (!res.ok) return [];
      const json = await res.json();
      return json.events || [];
    } catch {
      return [];
    }
  }
  return [];
}

async function fetchInChunks<T, R>(items: T[], chunk: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += chunk) {
    const slice = items.slice(i, i + chunk);
    const results = await Promise.all(slice.map(fn));
    out.push(...results);
  }
  return out;
}

/**
 * Fetch curated markets across commodities / economics / AI / politics.
 * 60s in-memory cache; returns stale on failure.
 */
export async function fetchCategorizedMarkets(): Promise<CategorizedMarkets> {
  if (_grouped && Date.now() - _grouped.ts < MARKETS_CACHE_MS) return _grouped.data;

  try {
    const buckets: Record<MarketCategory, { row: MarketRow; score: number }[]> = {
      commodities: [], economics: [], ai: [], politics: [],
    };

    await Promise.all(MARKET_CATEGORIES.map(async (ours) => {
      const preferred = PRIORITY_SERIES[ours];
      const fallback = CURATED_SERIES[ours].filter((ticker) => !preferred.includes(ticker));
      const series = [...preferred, ...fallback].slice(0, INITIAL_SERIES_PER_CATEGORY);
      const eventLists = await fetchInChunks(series, SERIES_FETCH_CHUNK, fetchEventsForSeries);
      const events = eventLists.flat();

      for (const evt of events) {
        if (BLOCKLIST.test(evt.title || '')) continue;
        if (ours === 'ai' && !AI_TITLE_REGEX.test(evt.title || '')) continue;

        for (const m of evt.markets || []) {
          const row = toRow(evt.title, m);
          const s = score(row);
          if (s < 0) continue;
          buckets[ours].push({ row, score: s });
        }
      }
    }));

    const result: CategorizedMarkets = { commodities: [], economics: [], ai: [], politics: [] };
    for (const cat of MARKET_CATEGORIES) {
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
 * Loose top-level export — returns the same flat list of markets used by
 * the categorizer. Kept for backwards compatibility with consumers that
 * imported fetchKalshiMarkets directly.
 */
export async function fetchKalshiMarkets(): Promise<MarketRow[]> {
  const cats = await fetchCategorizedMarkets();
  return MARKET_CATEGORIES.flatMap((cat) => cats[cat]);
}

/**
 * Recent BTC trades (filtered by KXBTC* ticker prefix client-side).
 * 30s cache.
 */
export async function fetchKalshiBtcTrades(): Promise<RecentTrade[]> {
  if (_trades && Date.now() - _trades.ts < TRADES_CACHE_MS) return _trades.data;

  const url = `${KALSHI_BASE}/markets/trades?limit=200`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 429 && _trades) return _trades.data;
    if (!res.ok) throw new Error(`Kalshi trades ${res.status}`);

    const json = await res.json();
    const raw: KalshiTrade[] = json.trades || [];

    const btc = raw.filter((t) => /^KXBTC/i.test(t.ticker));
    const mapped: RecentTrade[] = btc.map((t) => ({
      price: num(t.yes_price_dollars),
      size: num(t.count_fp),
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
 * Orderbook for a single Kalshi market.
 * No cache — orderbooks are point-in-time and consumed live.
 */
export async function fetchKalshiOrderbook(ticker: string): Promise<KalshiOrderbookSide> {
  const url = `${KALSHI_BASE}/markets/${encodeURIComponent(ticker)}/orderbook`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Kalshi orderbook ${res.status}`);
  const json = await res.json();
  const ob = json.orderbook_fp || json.orderbook || {};
  const yesRaw: [string, string][] = ob.yes_dollars || ob.yes || [];
  const noRaw: [string, string][] = ob.no_dollars || ob.no || [];
  return {
    yes: yesRaw.map(([p, s]) => [num(p), num(s)] as [number, number]),
    no: noRaw.map(([p, s]) => [num(p), num(s)] as [number, number]),
  };
}

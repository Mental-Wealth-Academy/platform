/**
 * Polymarket public-data client (Gamma API + CLOB orderbook).
 *
 * Polymarket is a decentralized prediction market on Polygon. This module
 * fetches public market data (no auth needed for reads) for display and
 * the trading engine's edge-detection scan.
 *
 * API surface:
 *   - Gamma API: https://gamma-api.polymarket.com  (events, markets, metadata)
 *   - CLOB API:  https://clob.polymarket.com        (orderbook, pricing)
 *
 * Outputs are shaped to match the same CategorizedMarkets / MarketRow / RecentTrade
 * interfaces the rest of the app already consumes, so the swap is transparent
 * to the trading engine and frontend.
 */

const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const CLOB_BASE = 'https://clob.polymarket.com';

// ── Native Polymarket types ──

export interface PolymarketOutcome {
  title: string;
  price: number;
}

export interface PolymarketMarket {
  id: string;
  condition_id: string;
  question: string;
  description?: string;
  market_slug?: string;
  end_date_iso?: string;
  closed?: boolean;
  active?: boolean;
  archived?: boolean;
  accepting_orders?: boolean;
  tokens?: Array<{
    token_id: string;
    outcome: string;
    price?: number;
    winner?: boolean;
  }>;
  outcomes?: string[];
  outcome_prices?: string;
  volume?: number;
  volume_num?: number;
  liquidity?: number;
  liquidity_num?: number;
  best_bid?: number;
  best_ask?: number;
  last_trade_price?: number;
  image?: string;
  icon?: string;
  tags?: string[];
  group_item_title?: string;
}

export interface PolymarketEvent {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  end_date_iso?: string;
  closed?: boolean;
  active?: boolean;
  archived?: boolean;
  image?: string;
  icon?: string;
  tags?: string[];
  markets: PolymarketMarket[];
  volume?: number;
  volume_num?: number;
  liquidity?: number;
  liquidity_num?: number;
}

// ── Compat shape (matches former kalshi-api exports) ──

export interface MarketRow {
  id: string;
  question: string;
  outcomePrices: string;   // JSON `[yesProb, noProb]` 0-1
  volume: number;
  liquidity: number;
  endDate: string;
  active: boolean;
  ticker: string;          // Polymarket condition_id (replaces Kalshi ticker)
  event_ticker: string;    // Polymarket event id
  yes_ask: number;
  no_ask: number;
  iconUrl?: string;
  tokenId?: string;        // YES token id, needed for order placement
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

export type MarketCategory = 'elections' | 'politics' | 'culture' | 'science';

export interface CategorizedMarkets {
  elections: MarketRow[];
  politics: MarketRow[];
  culture: MarketRow[];
  science: MarketRow[];
}

export interface OrderbookSide {
  yes: [number, number][];
  no: [number, number][];
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

/**
 * Parse Polymarket's outcome_prices string (JSON array like `["0.55","0.45"]`)
 * into a [yesProb, noProb] tuple.
 */
function parseOutcomePrices(raw: string | undefined): [number, number] {
  if (!raw) return [0, 0];
  try {
    const arr = JSON.parse(raw);
    return [num(arr[0]), num(arr[1])];
  } catch {
    return [0, 0];
  }
}

// ── Category mapping ──

const MARKET_CATEGORIES: MarketCategory[] = ['elections', 'politics', 'culture', 'science'];

/**
 * Map a Polymarket event/market into one of our four display categories
 * using tags and title keyword matching.
 */
function categorize(event: PolymarketEvent, market: PolymarketMarket): MarketCategory | null {
  const tags = [
    ...(event.tags || []),
    ...(market.tags || []),
  ].map((t) => t.toLowerCase());
  const title = `${event.title} ${market.question}`.toLowerCase();

  // Elections
  if (
    tags.some((t) => t === 'elections' || t === 'election' || t === 'midterms' || t === 'presidential') ||
    /\b(election|ballot|electoral|nominee|primary|caucus|presidential)\b/.test(title)
  ) {
    return 'elections';
  }

  // Politics
  if (
    tags.some((t) => t === 'politics' || t === 'policy' || t === 'government' || t === 'geopolitics' || t === 'regulation' || t === 'congress' || t === 'legislation') ||
    /\b(congress|senate|legislation|impeach|supreme court|sanctions|tariff|president|veto|executive order|treaty|ceasefire|war|nato|un|border)\b/.test(title)
  ) {
    return 'politics';
  }

  // Science
  if (
    tags.some((t) => t === 'science' || t === 'technology' || t === 'ai' || t === 'crypto' || t === 'bitcoin' || t === 'climate' || t === 'space' || t === 'health') ||
    /\b(ai|bitcoin|btc|ethereum|crypto|spacex|nasa|climate|vaccine|fda|patent|quantum|model|gpt|llm)\b/.test(title)
  ) {
    return 'science';
  }

  // Culture
  if (
    tags.some((t) => t === 'entertainment' || t === 'sports' || t === 'culture' || t === 'social' || t === 'pop culture' || t === 'media' || t === 'celebrity') ||
    /\b(nfl|nba|super bowl|oscar|grammy|box office|movie|album|twitter|tiktok|youtube|elon|celebrity)\b/.test(title)
  ) {
    return 'culture';
  }

  // Fallback: put untagged political-ish events in politics, otherwise culture
  if (/\b(trump|biden|harris|obama|putin|zelensky|xi jinping|modi|macron)\b/.test(title)) return 'politics';

  return null;
}

// Light junk filter — keep legitimate markets, drop spam.
const BLOCKLIST = /tweet count|number of (?:tweets|posts)|zodiac|astrology|onlyfans/i;

const PER_CATEGORY = 8;
const MAX_DAYS_OUT = 730;
const EVENTS_PAGE_LIMIT = 100;
const MAX_EVENT_PAGES = 4;

function toRow(event: PolymarketEvent, m: PolymarketMarket): MarketRow {
  // Parse outcome prices from the market
  const [yesProb, noProb] = parseOutcomePrices(m.outcome_prices);

  // Find the YES token for order placement
  const yesToken = m.tokens?.find((t) => t.outcome?.toLowerCase() === 'yes');
  const noToken = m.tokens?.find((t) => t.outcome?.toLowerCase() === 'no');

  // Prefer token prices if available, fall back to outcome_prices
  const finalYes = yesToken?.price ?? yesProb;
  const finalNo = noToken?.price ?? noProb;

  return {
    id: m.condition_id || m.id,
    question: m.group_item_title
      ? `${event.title} — ${m.group_item_title}`
      : (m.question || event.title),
    outcomePrices: JSON.stringify([finalYes, finalNo]),
    volume: num(m.volume_num ?? m.volume),
    liquidity: num(m.liquidity_num ?? m.liquidity),
    endDate: m.end_date_iso || event.end_date_iso || '',
    active: Boolean(m.active && !m.closed && !m.archived),
    ticker: m.condition_id || m.id,
    event_ticker: event.id,
    yes_ask: finalYes,
    no_ask: finalNo,
    iconUrl: event.image || event.icon || m.image || m.icon,
    tokenId: yesToken?.token_id,
  };
}

/**
 * Score: 40% balance (closer to 50/50), 25% volume (capped), 35% end-date proximity.
 * Same scoring formula as the former Kalshi client.
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

async function fetchEventsPage(offset = 0): Promise<PolymarketEvent[]> {
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    archived: 'false',
    limit: String(EVENTS_PAGE_LIMIT),
    offset: String(offset),
    order: 'volume',
    ascending: 'false',
  });

  // Retry once on 429 with a short backoff.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${GAMMA_BASE}/events?${params}`, { cache: 'no-store' });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 300 + Math.random() * 300));
        continue;
      }
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Fetch markets across Elections / Politics / Culture / Science. Pages Polymarket's
 * active events, buckets them by tag/title matching, then keeps the
 * highest-scoring near-term markets per bucket.
 * 5-min in-memory cache; returns stale on failure.
 */
export async function fetchCategorizedMarkets(): Promise<CategorizedMarkets> {
  if (_grouped && Date.now() - _grouped.ts < MARKETS_CACHE_MS) return _grouped.data;

  try {
    const buckets: Record<MarketCategory, { row: MarketRow; score: number }[]> = {
      elections: [], politics: [], culture: [], science: [],
    };

    for (let page = 0; page < MAX_EVENT_PAGES; page++) {
      const events = await fetchEventsPage(page * EVENTS_PAGE_LIMIT);
      if (events.length === 0) break;

      for (const evt of events) {
        for (const m of evt.markets || []) {
          if (!m.active || m.closed || m.archived) continue;
          if (BLOCKLIST.test(m.question || '')) continue;
          if (BLOCKLIST.test(evt.title || '')) continue;

          const cat = categorize(evt, m);
          if (!cat) continue;

          const row = toRow(evt, m);
          const s = score(row);
          if (s < 0) continue;
          buckets[cat].push({ row, score: s });
        }
      }
    }

    const result: CategorizedMarkets = { elections: [], politics: [], culture: [], science: [] };
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
 * the categorizer. Kept for backwards compatibility.
 */
export async function fetchPolymarketMarkets(): Promise<MarketRow[]> {
  const cats = await fetchCategorizedMarkets();
  return MARKET_CATEGORIES.flatMap((cat) => cats[cat]);
}

/**
 * Recent trades from Polymarket. Fetches from the Gamma API activity endpoint.
 * 30s cache.
 */
export async function fetchPolymarketRecentTrades(): Promise<RecentTrade[]> {
  if (_trades && Date.now() - _trades.ts < TRADES_CACHE_MS) return _trades.data;

  const url = `${GAMMA_BASE}/activity?limit=50`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 429 && _trades) return _trades.data;
    if (!res.ok) throw new Error(`Polymarket activity ${res.status}`);

    const json = await res.json();
    const raw: Array<{
      asset?: string;
      type?: string;
      price?: number | string;
      size?: number | string;
      side?: string;
      timestamp?: string | number;
      title?: string;
      slug?: string;
      outcome?: string;
      market_slug?: string;
      event_slug?: string;
    }> = Array.isArray(json) ? json : [];

    const mapped: RecentTrade[] = raw
      .filter((t) => t.type === 'trade' || t.price != null)
      .map((t) => ({
        price: num(t.price),
        size: num(t.size),
        side: (t.side?.toLowerCase() === 'sell' ? 'SELL' : 'BUY') as 'BUY' | 'SELL',
        timestamp: typeof t.timestamp === 'number'
          ? t.timestamp
          : new Date(t.timestamp || 0).getTime(),
        title: t.title || t.asset || '',
        slug: t.market_slug || t.event_slug || t.slug || '',
        outcome: t.outcome || (t.side?.toLowerCase() === 'sell' ? 'NO' : 'YES'),
      }));

    _trades = { data: mapped, ts: Date.now() };
    return mapped;
  } catch (err) {
    if (_trades) return _trades.data;
    throw err;
  }
}

/**
 * Orderbook for a single Polymarket market via CLOB API.
 * No cache — orderbooks are point-in-time and consumed live.
 */
export async function fetchPolymarketOrderbook(tokenId: string): Promise<OrderbookSide> {
  const url = `${CLOB_BASE}/book?token_id=${encodeURIComponent(tokenId)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Polymarket orderbook ${res.status}`);
  const json = await res.json();

  // CLOB book response: { bids: [{price, size}], asks: [{price, size}] }
  const bids: Array<{ price: string | number; size: string | number }> = json.bids || [];
  const asks: Array<{ price: string | number; size: string | number }> = json.asks || [];

  return {
    yes: asks.map((a) => [num(a.price), num(a.size)] as [number, number]),
    no: bids.map((b) => [num(b.price), num(b.size)] as [number, number]),
  };
}

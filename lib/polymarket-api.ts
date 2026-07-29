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

export interface PolymarketMarket {
  id: string;
  conditionId?: string;
  condition_id?: string;
  question: string;
  description?: string;
  slug?: string;
  market_slug?: string;
  endDate?: string;
  endDateIso?: string;
  closed?: boolean;
  active?: boolean;
  archived?: boolean;
  acceptingOrders?: boolean;
  clobTokenIds?: string;
  tokens?: Array<{
    token_id: string;
    outcome: string;
    price?: number;
    winner?: boolean;
  }>;
  outcomes?: string;
  outcomePrices?: string;
  volume?: number | string;
  volumeNum?: number;
  liquidity?: number | string;
  liquidityNum?: number;
  bestBid?: number;
  bestAsk?: number;
  lastTradePrice?: number;
  image?: string;
  icon?: string;
  tags?: any[];
  group_item_title?: string;
  orderMinSize?: number | string;
  events?: PolymarketEvent[];
}

export interface PolymarketEvent {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  endDate?: string;
  endDateIso?: string;
  closed?: boolean;
  active?: boolean;
  archived?: boolean;
  image?: string;
  icon?: string;
  tags?: any[];
  markets: PolymarketMarket[];
  volume?: number | string;
  volumeNum?: number;
  liquidity?: number | string;
  liquidityNum?: number;
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
  ticker: string;          // Polymarket conditionId (replaces Kalshi ticker)
  event_ticker: string;    // Polymarket event id
  yes_ask: number;
  no_ask: number;
  iconUrl?: string;
  tokenId?: string;        // YES token id, needed for order placement
  noTokenId?: string;      // NO token id, used when the model favors NO
  minOrderSize?: number;
  slug?: string;
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

function parseOutcomePrices(raw: string | undefined): [number, number] {
  if (!raw) return [0, 0];
  try {
    const arr = JSON.parse(raw);
    return [num(arr[0]), num(arr[1])];
  } catch {
    return [0, 0];
  }
}

function parseClobTokenIds(raw: string | undefined): [string | undefined, string | undefined] {
  if (!raw) return [undefined, undefined];
  try {
    const arr = JSON.parse(raw);
    return [arr[0], arr[1]];
  } catch {
    return [undefined, undefined];
  }
}

function extractTagStrings(tagsRaw?: any[]): string[] {
  if (!tagsRaw || !Array.isArray(tagsRaw)) return [];
  const res: string[] = [];
  for (const t of tagsRaw) {
    if (typeof t === 'string') res.push(t.toLowerCase());
    else if (typeof t === 'object' && t !== null) {
      if (t.slug) res.push(String(t.slug).toLowerCase());
      if (t.label) res.push(String(t.label).toLowerCase());
    }
  }
  return res;
}

// ── Category mapping ──

const MARKET_CATEGORIES: MarketCategory[] = ['elections', 'politics', 'culture', 'science'];

function categorize(event: PolymarketEvent, market: PolymarketMarket): MarketCategory {
  const tags = [
    ...extractTagStrings(event.tags),
    ...extractTagStrings(market.tags),
  ];
  const title = `${event.title || ''} ${market.question || ''}`.toLowerCase();

  // Elections
  if (
    tags.some((t) => t.includes('election') || t.includes('presidential') || t.includes('midterm')) ||
    /\b(election|ballot|electoral|nominee|primary|caucus|presidential|governor)\b/.test(title)
  ) {
    return 'elections';
  }

  // Politics
  if (
    tags.some((t) => t.includes('politic') || t.includes('policy') || t.includes('government') || t.includes('geopolitic') || t.includes('congress')) ||
    /\b(congress|senate|house|legislation|impeach|supreme court|sanctions|tariff|president|biden|trump|harris|vance|newsom|putin|zelensky|ceasefire|war|nato)\b/.test(title)
  ) {
    return 'politics';
  }

  // Science / Tech / Crypto / Macro
  if (
    tags.some((t) => t.includes('science') || t.includes('tech') || t.includes('ai') || t.includes('crypto') || t.includes('bitcoin') || t.includes('space')) ||
    /\b(ai|bitcoin|btc|ethereum|solana|crypto|spacex|nasa|climate|vaccine|fda|patent|quantum|model|gpt|llm|deepseek|openai|anthropic|fed|rate|inflation|cpi|gdp)\b/.test(title)
  ) {
    return 'science';
  }

  // Culture / Sports / Entertainment / Media
  if (
    tags.some((t) => t.includes('entertainment') || t.includes('sports') || t.includes('culture') || t.includes('pop') || t.includes('media') || t.includes('movie')) ||
    /\b(nfl|nba|super bowl|oscar|grammy|box office|movie|album|twitter|tiktok|youtube|elon|musk|mrbeast|gta)\b/.test(title)
  ) {
    return 'culture';
  }

  return 'politics';
}

const BLOCKLIST = /tweet count|number of (?:tweets|posts)|zodiac|astrology|onlyfans/i;

const PER_CATEGORY = 8;
const EVENTS_PAGE_LIMIT = 100;
const MAX_EVENT_PAGES = 3;

function toRow(event: PolymarketEvent, m: PolymarketMarket): MarketRow {
  const [yesProb, noProb] = parseOutcomePrices(m.outcomePrices);
  const [yesTokenId, noTokenId] = parseClobTokenIds(m.clobTokenIds);
  const isSoleMarket = (event.markets?.length ?? 0) <= 1;

  const conditionId = m.conditionId || m.condition_id || m.id;
  const endDate = m.endDateIso || m.endDate || event.endDateIso || event.endDate || '';

  return {
    id: conditionId,
    question: m.group_item_title
      ? `${event.title} — ${m.group_item_title}`
      : (m.question || event.title),
    outcomePrices: JSON.stringify([yesProb, noProb]),
    // Event totals only stand in for a single-market event. Falling back to them
    // inside a multi-market event reports the whole event's volume on every row.
    volume: num(m.volumeNum ?? m.volume ?? (isSoleMarket ? (event.volumeNum ?? event.volume) : 0)),
    liquidity: num(
      m.liquidityNum ?? m.liquidity ?? (isSoleMarket ? (event.liquidityNum ?? event.liquidity) : 0),
    ),
    endDate,
    active:
      m.active !== false &&
      !m.closed &&
      !m.archived &&
      m.acceptingOrders !== false,
    ticker: conditionId,
    event_ticker: event.id,
    yes_ask: num(m.bestAsk, yesProb),
    // On a binary market the NO ask is the complement of the YES bid. Using the
    // NO midpoint instead understates it by half the spread, which shows a price
    // nobody can fill at and makes NO limit orders miss the book.
    no_ask: num(m.bestBid) > 0 ? 1 - num(m.bestBid) : noProb,
    iconUrl: event.image || event.icon || m.image || m.icon,
    tokenId: yesTokenId,
    noTokenId,
    minOrderSize: Math.max(1, num(m.orderMinSize, 1)),
    slug: m.slug || m.market_slug,
  };
}

function score(m: MarketRow): number {
  let yes: number;
  try {
    const arr = JSON.parse(m.outcomePrices);
    yes = Number(arr[0]) || 0;
  } catch {
    return -1;
  }
  if (yes <= 0.01 || yes >= 0.99) return -1;

  const now = Date.now();
  const maxMs = 5 * 365 * 86_400_000;
  const endMs = m.endDate ? new Date(m.endDate).getTime() - now : 86_400_000 * 30;
  if (endMs <= 0) return -1;

  const vol = Number(m.volume) || 0;
  const balance = 1 - Math.abs(yes - 0.5) * 2;
  const proximity = Math.max(0, 1 - endMs / maxMs);
  return balance * 0.40 + Math.min(vol / 10_000, 1.0) * 0.35 + proximity * 0.25;
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

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${GAMMA_BASE}/events?${params}`, {
        cache: 'no-store',
        headers: { 'User-Agent': 'MentalWealthAcademy/1.0' },
      });
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
 * Fetch markets across Elections / Politics / Culture / Science.
 * Pages Polymarket's open active events, categorizes them into display buckets,
 * and keeps top-scoring near-term markets.
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
          if (m.active === false || m.closed || m.archived) continue;
          if (BLOCKLIST.test(m.question || '')) continue;
          if (BLOCKLIST.test(evt.title || '')) continue;

          const cat = categorize(evt, m);
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
 * Flat list of markets for backwards compatibility.
 */
export async function fetchPolymarketMarkets(): Promise<MarketRow[]> {
  const cats = await fetchCategorizedMarkets();
  return MARKET_CATEGORIES.flatMap((cat) => cats[cat]);
}

/**
 * Resolve one exact Polymarket market by slug.
 *
 * Execution uses this path instead of the broad discovery scanner so a staff
 * trade cannot drift to a different market as rankings and prices change.
 */
export async function fetchPolymarketMarketBySlug(slug: string): Promise<MarketRow> {
  const normalizedSlug = slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
    throw new Error('Polymarket target slug is missing or invalid.');
  }

  const response = await fetch(
    `${GAMMA_BASE}/markets?slug=${encodeURIComponent(normalizedSlug)}`,
    {
      cache: 'no-store',
      headers: { 'User-Agent': 'MentalWealthAcademy/1.0' },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Polymarket target lookup returned ${response.status}.`);
  }

  const payload = await response.json() as PolymarketMarket[];
  const market = Array.isArray(payload) ? payload[0] : null;
  if (!market) {
    throw new Error(`Polymarket target "${normalizedSlug}" was not found.`);
  }
  if (
    market.active === false ||
    market.closed ||
    market.archived ||
    market.acceptingOrders === false
  ) {
    throw new Error(`Polymarket target "${normalizedSlug}" is not accepting orders.`);
  }

  const event = market.events?.[0] || {
    id: '',
    title: market.question,
    markets: [market],
  };
  const row = toRow(event, market);
  if (!row.active || !row.tokenId || !row.noTokenId) {
    throw new Error(`Polymarket target "${normalizedSlug}" has incomplete order data.`);
  }
  return row;
}

/**
 * Recent trades from Polymarket Gamma API.
 */
export async function fetchPolymarketRecentTrades(): Promise<RecentTrade[]> {
  if (_trades && Date.now() - _trades.ts < TRADES_CACHE_MS) return _trades.data;

  const url = 'https://data-api.polymarket.com/trades?limit=50';

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'MentalWealthAcademy/1.0' },
    });
    if (res.status === 429 && _trades) return _trades.data;
    if (!res.ok) throw new Error(`Polymarket activity ${res.status}`);

    const json = await res.json();
    const raw: Array<{
      side?: string;
      price?: number | string;
      size?: number | string;
      timestamp?: number | string;
      title?: string;
      slug?: string;
      outcome?: string;
    }> = Array.isArray(json) ? json : [];

    const mapped: RecentTrade[] = raw.map((t) => ({
      price: num(t.price),
      size: num(t.size),
      side: t.side === 'SELL' ? 'SELL' : 'BUY',
      timestamp: typeof t.timestamp === 'number'
        ? (t.timestamp < 1e11 ? t.timestamp * 1000 : t.timestamp)
        : new Date(t.timestamp || 0).getTime(),
      title: t.title || '',
      slug: t.slug || '',
      outcome: t.outcome || (t.side === 'SELL' ? 'NO' : 'YES'),
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
 */
export async function fetchPolymarketOrderbook(tokenId: string): Promise<OrderbookSide> {
  const url = `${CLOB_BASE}/book?token_id=${encodeURIComponent(tokenId)}`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'MentalWealthAcademy/1.0' },
  });
  if (!res.ok) throw new Error(`Polymarket orderbook ${res.status}`);
  const json = await res.json();

  const bids: Array<{ price: string | number; size: string | number }> = json.bids || [];
  const asks: Array<{ price: string | number; size: string | number }> = json.asks || [];

  return {
    yes: asks.map((a) => [num(a.price), num(a.size)] as [number, number]),
    no: bids.map((b) => [num(b.price), num(b.size)] as [number, number]),
  };
}

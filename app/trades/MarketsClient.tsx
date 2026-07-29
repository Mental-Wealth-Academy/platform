'use client';

import { useDeferredValue, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, FormEvent } from 'react';
import Image from 'next/image';
import TreasurySnapshotCard from '@/components/treasury-snapshot/TreasurySnapshotCard';
import dynamic from 'next/dynamic';
import CtaButton from '@/components/shared/CtaButton';
import { getStorageItem, setStorageItem } from '@/lib/safe-storage';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';
import type { CoinPrice, TreasuryBalance, CategorizedMarkets, MarketCategory, MarketRow } from '@/lib/market-api';

const ProMembershipModal = dynamic(() => import('@/components/pro-membership-modal/ProMembershipModal'), { ssr: false });

// The same daily pixel-art scene the quest board and Blue's stage draw from, so
// the trading desk reads as part of the same world.
const sceneUrl = dailySceneBackgroundUrl();

// ── Helpers ──

function formatPrice(n: number): string {
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return '$' + n.toFixed(2);
  return '$' + n.toFixed(4);
}

function formatVol(raw: number | string | null): string {
  const n = Number(raw);
  if (!n || isNaN(n)) return '--';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toFixed(0);
}

function parseOutcomePrices(raw: string): [number, number] {
  try {
    const arr = JSON.parse(raw);
    return [Number(arr[0]) || 0, Number(arr[1]) || 0];
  } catch {
    return [0, 0];
  }
}

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return s + 's ago';
  return Math.floor(s / 60) + 'm ago';
}

function useLiveTick(intervalMs: number, enabled = true) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const id = setInterval(() => setTick((value) => value + 1), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);

  return tick;
}

function SkeletonLine({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <span className={`${styles.skeleton} ${className}`} style={style} aria-hidden="true" />;
}

function ShardValueSkeleton({ className = '' }: { className?: string }) {
  return <SkeletonLine className={`${styles.shardBarValueSkeleton} ${className}`} />;
}

function MarketListSkeleton() {
  return (
    <div className={styles.marketList} aria-label="Loading markets">
      {MARKET_CATEGORIES.map((cat) => (
        <div key={cat} className={styles.marketSection}>
          <SkeletonLine className={styles.marketSectionLabelSkeleton} />
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${styles.marketItem} ${styles.marketItemSkeleton}`}>
              <SkeletonLine className={i === 1 ? styles.marketQuestionSkeletonWide : styles.marketQuestionSkeleton} />
              <SkeletonLine className={styles.marketBarSkeleton} />
              <div className={styles.marketMeta}>
                <SkeletonLine className={styles.marketMetaSkeleton} />
                <SkeletonLine className={styles.marketVolumeSkeleton} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TreasuryQuickSkeleton() {
  return (
    <>
      <div className={styles.treasuryQuickPrimary}>
        <SkeletonLine className={styles.balanceHeroSkeleton} />
        <SkeletonLine className={styles.balanceLabelSkeleton} />
      </div>
      <div className={styles.treasuryQuickSpark}>
        <SkeletonLine className={styles.sparklineSkeleton} />
        <SkeletonLine className={styles.sparklineSkeleton} />
      </div>
    </>
  );
}

// ── Model Constants ──

const SIGMA = 0.50;
const T_EXP = 0.0000095;
const R_FREE = 0.0433;
const GAMMA = 0.10;
const SIGMA_B = 0.328;
const K_DECAY = 1.50;
const EDGE_THRESHOLD = 3.0;
const FALLBACK_MKT_PRICE = 53.78;

// ── Live Trading Log Entry Type ──

interface ExecutionLogEntry {
  action: 'SCAN' | 'TRADE' | 'SKIP' | 'HALT' | 'ERROR' | 'SIGNAL';
  asset?: string;
  details: string;
  timestamp: number;
}

// ── Live Position Type ──

interface LivePosition {
  asset: string;
  side: 'BUY' | 'SELL' | 'YES' | 'NO';
  price: string;
  size: string;
  sizeMatched: string;
  status: string;
}

interface TradeChatMessage {
  role: 'user' | 'blue';
  text: string;
  timestamp: number;
}

interface AccountStatusResponse {
  hasLinkedAccount?: boolean;
  hasVipMembershipCard?: boolean;
  isStaff?: boolean;
  walletAddress?: string;
}

// A market the community is actively voting on (aggregated from the debate table).
interface ActiveMarket {
  market_id: string;
  market_title: string | null;
  posts: number;
  yes: number;
  no: number;
  last_at: string;
}

const VOTE_TOKEN_ICON = '/icons/cake.webp';

// ── Math Helpers ──

/** Abramowitz & Stegun approximation for the standard normal CDF */
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

/** Find a BTC-related market, return Yes price as % */
function findBtcMarket(markets: CategorizedMarkets | null): number | null {
  if (!markets) return null;
  const allMarkets = Object.values(markets).flat() as MarketRow[];
  const match = allMarkets.find((m: MarketRow) =>
    /btc|bitcoin/i.test(m.question) ||
    /btc|bitcoin/i.test(m.event_ticker || m.ticker),
  );
  if (!match) return null;
  const [yes] = parseOutcomePrices(match.outcomePrices);
  return yes > 0 ? yes * 100 : null;
}

function formatTradeTime(ts: string): string {
  try {
    const d = new Date(Number(ts) * 1000 || ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '--:--';
  }
}

const CATEGORY_LABELS: Record<MarketCategory, string> = {
  elections: 'Elections',
  politics: 'Politics',
  culture: 'Culture',
  science: 'Science',
};

const MARKET_CATEGORIES: MarketCategory[] = ['elections', 'politics', 'culture', 'science'];

const TRADE_CHAT_SUGGESTIONS = [
  "What's the estimate?",
];
const INITIAL_VISIBLE_MARKETS = 3;
const MARKET_LOAD_MORE_STEP = 3;
const CHAT_SPOTLIGHT_KEY = 'mwa-trades-chat-daemon-seen';

// Treasury progress windows. `len` sets how many points the sparkline plots, so
// longer ranges read as more history at a glance.
const TREASURY_RANGES = [
  { id: '1d', len: 36 },
  { id: '7d', len: 80 },
  { id: '15d', len: 130 },
  { id: '30d', len: 200 },
] as const;
type TreasuryRange = (typeof TREASURY_RANGES)[number]['id'];

const INITIAL_TRADE_CHAT: TradeChatMessage[] = [
  {
    role: 'blue',
    text: "Ask me about any market and I'll give you Blue's current estimate.",
    timestamp: Date.now(),
  },
];

const CATEGORY_AVATARS: Record<MarketCategory, string> = {
  elections: '/icons/governance.svg',
  politics: '/icons/debate.svg',
  culture: '/icons/nav-gallery.svg',
  science: '/icons/atom.svg',
};

// ── Live Ticker Line ──

const TICKER_LEN = 80;
const TICKER_DRIFT = 0.25;   // upward bias per tick
const TICKER_VOL = 0.6;      // small random noise

function TickerLine({ drift = TICKER_DRIFT, vol = TICKER_VOL, stroke = 'var(--color-primary)', strokeWidth = 2.5, opacity = 0.8, speed = 300, len = TICKER_LEN }: {
  drift?: number; vol?: number; stroke?: string; strokeWidth?: number; opacity?: number; speed?: number; len?: number;
}) {
  const buf = useRef<number[]>((() => {
    const arr: number[] = [];
    let v = 0;
    for (let i = 0; i < len; i++) {
      v += drift + (Math.random() - 0.5) * vol;
      arr.push(v);
    }
    return arr;
  })());
  const [points, setPoints] = useState<string>('');

  useEffect(() => {
    function tick() {
      const arr = buf.current as number[];
      const last = arr[arr.length - 1];
      arr.push(last + drift + (Math.random() - 0.5) * vol);
      if (arr.length > len) arr.shift();

      const min = Math.min(...arr);
      const max = Math.max(...arr);
      const range = max - min || 1;
      const w = 400;
      const h = 28;
      const pad = 2;

      const pts = arr
        .map((v, i) => {
          const x = (i / (arr.length - 1)) * w;
          const y = h - pad - ((v - min) / range) * (h - pad * 2);
          return `${x},${y}`;
        })
        .join(' ');
      setPoints(pts);
    }

    tick();
    const id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [drift, vol, speed, len]);

  if (!points) return null;

  return (
    <svg className={styles.sparklineSvg} viewBox="0 0 400 28" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={opacity}
      />
    </svg>
  );
}

function LastUpdatedLabel({ timestamp }: { timestamp: number }) {
  useLiveTick(5000, timestamp > 0);

  if (timestamp <= 0) return null;

  return <span className={styles.lastUpdated}>updated {timeAgo(timestamp)}</span>;
}

// ── Market Debate ──

interface DebatePost {
  id: string;
  stance: 'yes' | 'no';
  body: string;
  created_at: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  is_own: boolean;
}

function debateTimeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function MarketDebate({ marketId, marketTitle }: { marketId: string; marketTitle: string }) {
  const [posts, setPosts] = useState<DebatePost[] | null>(null);
  const [stance, setStance] = useState<'yes' | 'no'>('yes');
  const [draft, setDraft] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/treasury/market-debate?marketId=${encodeURIComponent(marketId)}`);
        if (!res.ok) throw new Error();
        const data: { posts?: DebatePost[] } = await res.json();
        if (!cancelled) setPosts(data.posts || []);
      } catch {
        if (!cancelled) setPosts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [marketId]);

  const yesCount = posts?.filter((post) => post.stance === 'yes').length ?? 0;
  const noCount = (posts?.length ?? 0) - yesCount;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isPosting) return;
    setIsPosting(true);
    setError(null);

    try {
      const res = await fetch('/api/treasury/market-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId, marketTitle, stance, body }),
      });
      const data: { post?: DebatePost; error?: string } = await res.json();

      if (!res.ok || !data.post) {
        setError(res.status === 401 ? 'Sign in to join the debate.' : (data.error || 'Could not post your take.'));
        return;
      }

      setPosts((current) => [data.post as DebatePost, ...(current || [])]);
      setDraft('');
    } catch {
      setError('Could not post your take.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    setPosts((current) => (current || []).filter((post) => post.id !== postId));
    try {
      await fetch('/api/treasury/market-debate', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
    } catch {
      // Optimistic removal stands; the post will reappear on next open if the delete failed.
    }
  };

  return (
    <div className={styles.debateSection}>
      <div className={styles.debateHeader}>
        <span className={styles.debateTitle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={VOTE_TOKEN_ICON} alt="" className={styles.debateVoteIcon} width={16} height={16} />
          Cast your vote
        </span>
        <span className={styles.debateTally}>
          <span className={styles.debateTallyYes}>{yesCount} yes</span>
          <span className={styles.debateTallyNo}>{noCount} no</span>
        </span>
      </div>

      <form className={styles.debateComposer} onSubmit={handleSubmit}>
        <div className={styles.debateStanceToggle} role="radiogroup" aria-label="Your stance">
          <button
            type="button"
            role="radio"
            aria-checked={stance === 'yes'}
            className={`${styles.debateStanceButton} ${stance === 'yes' ? styles.debateStanceButtonYes : ''}`}
            onClick={() => setStance('yes')}
          >
            Yes
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={stance === 'no'}
            className={`${styles.debateStanceButton} ${stance === 'no' ? styles.debateStanceButtonNo : ''}`}
            onClick={() => setStance('no')}
          >
            No
          </button>
        </div>
        <textarea
          className={styles.debateInput}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Make your case..."
          rows={2}
          maxLength={500}
          disabled={isPosting}
        />
        <button type="submit" className={styles.debateSubmit} disabled={!draft.trim() || isPosting}>
          {isPosting ? 'Casting...' : 'Cast vote'}
        </button>
      </form>
      {error && <p className={styles.debateError}>{error}</p>}

      <div className={styles.debateList}>
        {posts === null && <p className={styles.debateEmpty}>Loading the votes...</p>}
        {posts !== null && posts.length === 0 && (
          <p className={styles.debateEmpty}>No votes yet. Cast the first one for Blue to act on.</p>
        )}
        {posts?.map((post) => (
          <div key={post.id} className={styles.debatePost}>
            {post.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.avatar_url} alt="" className={styles.debateAvatar} width={26} height={26} />
            ) : (
              <span className={`${styles.debateAvatar} ${styles.debateAvatarFallback}`} aria-hidden="true" />
            )}
            <div className={styles.debatePostMain}>
              <div className={styles.debatePostMeta}>
                <span className={styles.debateAuthor}>{post.username || 'member'}</span>
                <span className={post.stance === 'yes' ? styles.debateStanceYes : styles.debateStanceNo}>
                  {post.stance === 'yes' ? 'Yes' : 'No'}
                </span>
                <span className={styles.debateTime}>{debateTimeAgo(post.created_at)}</span>
                {post.is_own && (
                  <button type="button" className={styles.debateDelete} onClick={() => void handleDelete(post.id)}>
                    Delete
                  </button>
                )}
              </div>
              <p className={styles.debateBody}>{post.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──

export default function Markets() {
  const { play } = useSound();
  const [prices, setPrices] = useState<CoinPrice[] | null>(null);
  const [balance, setBalance] = useState<TreasuryBalance | null>(null);
  const [kalshiMarkets, setKalshiMarkets] = useState<CategorizedMarkets | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogEntry[]>([]);
  const [livePositions, setLivePositions] = useState<LivePosition[]>([]);
  const [balanceError, setBalanceError] = useState(false);
  const [kalshiError, setKalshiError] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number>(0);
  const [tradeChatMessages, setTradeChatMessages] = useState<TradeChatMessage[]>(INITIAL_TRADE_CHAT);
  const [tradeChatInput, setTradeChatInput] = useState('');
  const [isTradeChatSending, setIsTradeChatSending] = useState(false);
  const [isTradeExecuting, setIsTradeExecuting] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  // The board's main tab: the market feed, or Blue's quant engine readout.
  const [boardTab, setBoardTab] = useState<'markets' | 'quant'>('markets');
  const [hasVipMembershipCard, setHasVipMembershipCard] = useState<boolean | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  // Staff hold execution authority server-side, so the desk unlocks for them too.
  const canExecuteTrades = hasVipMembershipCard === true || isStaff === true;
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<{ category: MarketCategory; market: MarketRow } | null>(null);
  // Modal visibility is intentionally separate from the selection: closing the
  // pop-up keeps the market featured (highlighted + pinned) in the feed.
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  // Feed controls: which markets the community is actively voting on vs. the
  // full list, plus a free-text market search. Blue is the trader; users vote.
  const [marketTab, setMarketTab] = useState<'active' | 'all'>('all');
  const [marketSearch, setMarketSearch] = useState('');
  const [activeMarkets, setActiveMarkets] = useState<ActiveMarket[]>([]);
  // One-time Daemon spotlight that flags this chat as the community trading desk
  // (not the usual Blue companion). Persisted via safe-storage so it shows once.
  const [showChatSpotlight, setShowChatSpotlight] = useState(false);
  // Execution receipts live in a pop-up opened from the treasury card, so the
  // market feed owns the full column width.
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  // Treasury progress window (1d / 7d / 15d / 30d).
  const [treasuryRange, setTreasuryRange] = useState<TreasuryRange>('7d');
  const [visibleMarketCounts, setVisibleMarketCounts] = useState<Record<MarketCategory, number>>({
    elections: INITIAL_VISIBLE_MARKETS,
    politics: INITIAL_VISIBLE_MARKETS,
    culture: INITIAL_VISIBLE_MARKETS,
    science: INITIAL_VISIBLE_MARKETS,
  });
  const tradeChatScrollRef = useRef<HTMLDivElement | null>(null);
  const deferredKalshiMarkets = useDeferredValue(kalshiMarkets);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/treasury/prices');
      if (!res.ok) throw new Error();
      const data: CoinPrice[] = await res.json();
      setPrices(data);
      setLastPriceUpdate(Date.now());
    } catch {
      // The pricing model has stable fallbacks, so the page can keep operating.
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/treasury/balance');
      if (!res.ok) throw new Error();
      const data: TreasuryBalance = await res.json();
      setBalance(data);
      setBalanceError(false);
    } catch {
      setBalanceError(true);
    }
  }, []);

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch('/api/treasury/markets');
      if (!res.ok) throw new Error();
      const data: CategorizedMarkets = await res.json();
      setKalshiMarkets(data);
      setKalshiError(false);
    } catch {
      setKalshiError(true);
    }
  }, []);

  const fetchExecutionLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/treasury/execution-logs');
      if (!res.ok) return;
      const data = await res.json();
      if (data.logs) setExecutionLogs(data.logs);
      if (data.positions) setLivePositions(data.positions);
    } catch { /* silent */ }
  }, []);

  const fetchActiveMarkets = useCallback(async () => {
    try {
      const res = await fetch('/api/treasury/market-debate?active=1');
      if (!res.ok) return;
      const data: { activeMarkets?: ActiveMarket[] } = await res.json();
      if (Array.isArray(data.activeMarkets)) setActiveMarkets(data.activeMarkets);
    } catch { /* silent */ }
  }, []);

  const fetchAccountStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/account/status');
      if (!res.ok) {
        setHasVipMembershipCard(false);
        return;
      }

      const data: AccountStatusResponse = await res.json();
      setHasVipMembershipCard(Boolean(data.hasVipMembershipCard));
      setIsStaff(Boolean(data.isStaff));
    } catch {
      setHasVipMembershipCard(false);
      setIsStaff(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchPrices();
    fetchBalance();
    fetchMarkets();

    // Polling intervals
    const priceInterval = setInterval(fetchPrices, 30_000);
    const balanceInterval = setInterval(fetchBalance, 60_000);
    const kalshiInterval = setInterval(fetchMarkets, 60_000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(balanceInterval);
      clearInterval(kalshiInterval);
    };
  }, [fetchPrices, fetchBalance, fetchMarkets]);

  useEffect(() => {
    void fetchAccountStatus();
  }, [fetchAccountStatus]);

  useEffect(() => {
    setVisibleMarketCounts({
      elections: INITIAL_VISIBLE_MARKETS,
      politics: INITIAL_VISIBLE_MARKETS,
      culture: INITIAL_VISIBLE_MARKETS,
      science: INITIAL_VISIBLE_MARKETS,
    });
  }, [kalshiMarkets]);

  // Surface the Daemon spotlight once, a beat after load, if it hasn't been seen.
  useEffect(() => {
    if (getStorageItem(CHAT_SPOTLIGHT_KEY) === '1') return;
    const timer = setTimeout(() => setShowChatSpotlight(true), 1100);
    return () => clearTimeout(timer);
  }, []);

  const dismissChatSpotlight = useCallback(() => {
    setShowChatSpotlight(false);
    setStorageItem(CHAT_SPOTLIGHT_KEY, '1');
  }, []);

  // Fetch execution logs and the actively-voted markets
  useEffect(() => {
    fetchExecutionLogs();
    fetchActiveMarkets();
    const logsInterval = setInterval(fetchExecutionLogs, 30_000);
    const activeInterval = setInterval(fetchActiveMarkets, 30_000);
    return () => {
      clearInterval(logsInterval);
      clearInterval(activeInterval);
    };
  }, [fetchExecutionLogs, fetchActiveMarkets]);

  // Fast tick for live model parameter animation
  const modelTick = useLiveTick(1200);

  // ── Derived values from live prices + Kalshi ──
  const derived = useMemo(() => {
    const jitter = (base: number, scale: number, seed: number) =>
      base + Math.sin(modelTick * 0.55 + seed) * scale;

    // Jittered model parameters
    const sigma = jitter(SIGMA, 0.005, 0.7);
    const sigma_b = jitter(SIGMA_B, 0.003, 1.3);
    const lambda_jump = jitter(2.46, 0.05, 2.1);
    const mu_J = jitter(0.071, 0.003, 2.9);
    const q_inv = Math.round(jitter(-1187, 15, 3.6));

    // Step 1-2: Spot & strike (ATM) with micro-movement
    const S = jitter(prices?.find(c => c.symbol === 'BTC')?.usd ?? 66235, 8, 4.2);
    const K = S;

    // Step 3: d2 (ATM: ln(S/K)=0)
    const sqrtT = Math.sqrt(T_EXP);
    const d2 = (R_FREE - 0.5 * sigma * sigma) * T_EXP / (sigma * sqrtT);

    // Step 4-5: N(d2) and C_bin
    const Nd2 = normalCDF(d2);
    const C_bin = Math.exp(-R_FREE * T_EXP) * Nd2;

    // Step 6-7: Logit transform
    const p_t = C_bin;
    const x_t = Math.log(p_t / (1 - p_t));

    // Step 8: A-S half-spread (using jittered sigma_b)
    const delta_x = GAMMA * sigma_b * sigma_b * T_EXP / 2 + (1 / GAMMA) * Math.log(1 + GAMMA / K_DECAY);

    // Step 9: Bid/ask probabilities
    const p_bid = 1 / (1 + Math.exp(-(x_t - delta_x)));
    const p_ask = 1 / (1 + Math.exp(-(x_t + delta_x)));

    // Step 10-11: Edge detection
    const model_fair = C_bin * 100;
    const mkt_price = findBtcMarket(kalshiMarkets) ?? FALLBACK_MKT_PRICE;

    // Step 12-13: Divergence & signal
    const divergence = model_fair - mkt_price;
    const signal = Math.abs(divergence) > EDGE_THRESHOLD ? 'TRADE' : 'SKIP';

    // Step 14: Fee
    const fee = (p_t * (1 - p_t) + 0.0625) * 100;

    return {
      S, K, d2, Nd2, C_bin, p_t, x_t, delta_x,
      p_bid, p_ask, model_fair, mkt_price, divergence,
      signal, fee,
      sigma, sigma_b, lambda_jump, mu_J, q_inv,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices, kalshiMarkets, modelTick]);

  const mixedMarkets = useMemo(() => {
    if (!deferredKalshiMarkets) return [];

    const perCategory = MARKET_CATEGORIES.map((category) => ({
      category,
      items: (deferredKalshiMarkets[category] || []).slice(0, visibleMarketCounts[category] ?? INITIAL_VISIBLE_MARKETS),
    }));

    const maxLength = Math.max(0, ...perCategory.map(({ items }) => items.length));
    const mixed: Array<{ category: MarketCategory; market: MarketRow }> = [];

    for (let index = 0; index < maxLength; index += 1) {
      for (const entry of perCategory) {
        const market = entry.items[index];
        if (market) mixed.push({ category: entry.category, market });
      }
    }

    return mixed;
  }, [deferredKalshiMarkets, visibleMarketCounts]);

  const hasMoreMixedMarkets = useMemo(() => {
    if (!deferredKalshiMarkets) return false;
    return MARKET_CATEGORIES.some((category) => {
      const total = deferredKalshiMarkets[category]?.length ?? 0;
      return total > (visibleMarketCounts[category] ?? INITIAL_VISIBLE_MARKETS);
    });
  }, [deferredKalshiMarkets, visibleMarketCounts]);

  // Map of market id -> live vote activity, so cards can show a vote count and
  // the "Active" tab can surface what the community is voting on.
  const activeById = useMemo(() => {
    const map = new Map<string, ActiveMarket>();
    for (const market of activeMarkets) map.set(market.market_id, market);
    return map;
  }, [activeMarkets]);

  const allEntries = useMemo(() => {
    if (!deferredKalshiMarkets) return [];
    const out: Array<{ category: MarketCategory; market: MarketRow }> = [];
    for (const category of MARKET_CATEGORIES) {
      for (const market of deferredKalshiMarkets[category] || []) out.push({ category, market });
    }
    return out;
  }, [deferredKalshiMarkets]);

  // Markets the community is actively voting on, built from the discussion data
  // itself (not just the live feed) so a discussed market still shows even after
  // it rotates out of the curated Kalshi feed. Matched markets keep their live
  // price; unmatched ones fall back to the community vote split.
  const activeEntries = useMemo(() => {
    return activeMarkets.map((am) => {
      const matched = allEntries.find((entry) => (entry.market.ticker || entry.market.id) === am.market_id);
      if (matched) return matched;
      const total = am.yes + am.no;
      const yesFrac = total ? am.yes / total : 0;
      const market: MarketRow = {
        id: am.market_id,
        ticker: am.market_id,
        event_ticker: am.market_id,
        question: am.market_title || am.market_id,
        outcomePrices: JSON.stringify([yesFrac, total ? 1 - yesFrac : 0]),
        volume: 0,
        liquidity: 0,
        endDate: '',
        active: true,
        yes_ask: 0,
        no_ask: 0,
      };
      return { category: 'politics' as MarketCategory, market };
    });
  }, [activeMarkets, allEntries]);

  // Either the active/searched subset, or the default interleaved feed.
  const isFilteredView = marketTab === 'active' || marketSearch.trim() !== '';

  const filteredMarkets = useMemo(() => {
    const query = marketSearch.trim().toLowerCase();
    let list = marketTab === 'active' ? activeEntries : allEntries;
    if (query) list = list.filter((entry) => entry.market.question.toLowerCase().includes(query));
    return list.slice(0, 60);
  }, [activeEntries, allEntries, marketTab, marketSearch]);

  const baseMarkets = isFilteredView ? filteredMarkets : mixedMarkets;

  // The selected market is pinned to the top of the feed as the featured card,
  // but only when it's part of the current view (tab + search).
  const orderedMarkets = useMemo(() => {
    if (!selectedMarket) return baseMarkets;
    const selectedId = selectedMarket.market.id;
    const fresh = baseMarkets.find((entry) => entry.market.id === selectedId);
    if (!fresh) return baseMarkets;
    const rest = baseMarkets.filter((entry) => entry.market.id !== selectedId);
    return [fresh, ...rest];
  }, [baseMarkets, selectedMarket]);

  const showLoadMore = !isFilteredView && hasMoreMixedMarkets;

  useEffect(() => {
    const node = tradeChatScrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [tradeChatMessages, isTradeChatSending]);


  const buildBlueTradingMessage = useCallback((userMessage: string) => {
    const priceSnapshot = prices?.slice(0, 6).map((coin) => (
      `${coin.symbol}: ${formatPrice(coin.usd)}, 24h volume ${formatVol(coin.usd_24h_vol)}`
    )).join('\n') || 'price feed not loaded';

    const signalMarkets = deferredKalshiMarkets
      ? MARKET_CATEGORIES
        .flatMap((cat) => (deferredKalshiMarkets[cat] || []).slice(0, 2).map((market) => {
          const [yes, no] = parseOutcomePrices(market.outcomePrices);
          return `${CATEGORY_LABELS[cat]}: ${market.question} | yes ${Math.round(yes * 100)}% no ${Math.round(no * 100)}% volume ${formatVol(market.volume)}`;
        }))
        .slice(0, 6)
        .join('\n')
      : 'Polymarket feed not loaded';

    const recentExecution = executionLogs.slice(0, 5).map((log) => (
      `${formatTradeTime(String(log.timestamp / 1000))} ${log.action}${log.asset ? ` ${log.asset}` : ''}: ${log.details}`
    )).join('\n') || 'no recent execution logs';

    const openPositionSummary = livePositions.length > 0
      ? livePositions.map((position) => (
        `${position.asset} ${position.side} @ ${Math.round(parseFloat(position.price) * 100)}c size ${position.sizeMatched || position.size} status ${position.status}`
      )).join('\n')
      : 'no open positions';

    return [
      'You are Blue responding inside the /markets trading desk.',
      'The user wants Blue to trade for them. Treat direct trade requests as trading instructions for the protected trading engine.',
      'If the user asks to "stage the highest-conviction trade", treat that as the strongest staging request and explicitly weigh trade size, the price gap threshold, live asks, open positions, and execution safety before answering.',
      'Execution is VIP-gated. Only the verified VIP Membership Card wallet can submit a live Polymarket order.',
      'Do not claim an order filled unless the execution log confirms it. If execution is not confirmed, say you are routing, monitoring, or preparing the trade.',
      'When useful, answer with the intended market, direction, sizing posture, risk check, and next execution step. Keep it concise and conversational.',
      '',
      'Live model snapshot:',
      `signal: ${derived.signal}`,
      `Blue estimate: ${derived.model_fair.toFixed(2)}%`,
      `market price: ${derived.mkt_price.toFixed(2)}%`,
      `price gap: ${derived.divergence >= 0 ? '+' : ''}${derived.divergence.toFixed(2)}%`,
      `size cap: 0.25x`,
      `USDC markets balance: ${balance ? '$' + balance.formatted : 'not loaded'}`,
      '',
      'Price snapshot:',
      priceSnapshot,
      '',
      'Signal markets:',
      signalMarkets,
      '',
      'Open positions:',
      openPositionSummary,
      '',
      'Recent execution:',
      recentExecution,
      '',
      `User command: ${userMessage}`,
    ].join('\n');
  }, [balance, deferredKalshiMarkets, derived, executionLogs, livePositions, prices]);

  const generateLocalTradeResponse = useCallback((userMessage: string) => {
    const command = userMessage.toLowerCase();
    const posture = Math.abs(derived.divergence) > EDGE_THRESHOLD ? 'actionable' : 'below threshold';
    const direction = derived.divergence >= 0 ? 'yes/upside' : 'no/downside';

    if (command.includes('trade') || command.includes('buy') || command.includes('sell') || command.includes('size')) {
      return `I'm reading that as a ${direction} instruction, but the signal is still ${posture}. Blue's estimate is ${derived.model_fair.toFixed(2)}%, the market price is ${derived.mkt_price.toFixed(2)}%, and I'll keep size capped at 0.25x until the protected route confirms the order.`;
    }

    return `Current read: ${derived.signal.toLowerCase()}. Blue's estimate is ${derived.model_fair.toFixed(2)}%, the market price is ${derived.mkt_price.toFixed(2)}%, and the price gap is ${derived.divergence >= 0 ? '+' : ''}${derived.divergence.toFixed(2)}%.`;
  }, [derived]);

  const sendTradeChatMessage = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isTradeChatSending) return;

    setTradeChatMessages((current) => [
      ...current,
      { role: 'user', text, timestamp: Date.now() },
    ]);
    setTradeChatInput('');
    setIsTradeChatSending(true);

    try {
      const res = await fetch('/api/chat/blue-markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: buildBlueTradingMessage(text),
        }),
      });

      const data: { response?: string; error?: string; message?: string } = await res.json();
      const responseText = (res.ok && data.response) ? data.response : generateLocalTradeResponse(text);

      setTradeChatMessages((current) => [
        ...current,
        { role: 'blue', text: responseText, timestamp: Date.now() },
      ]);
    } catch {
      setTradeChatMessages((current) => [
        ...current,
        { role: 'blue', text: generateLocalTradeResponse(text), timestamp: Date.now() },
      ]);
    } finally {
      setIsTradeChatSending(false);
    }
  }, [buildBlueTradingMessage, generateLocalTradeResponse, isTradeChatSending]);

  // Open the chat with Blue already analyzing the clicked market. The selection
  // is kept so the market stays featured in the feed while the debate runs.
  const askBlueAboutMarket = useCallback((entry: { category: MarketCategory; market: MarketRow }) => {
    const [yes, no] = parseOutcomePrices(entry.market.outcomePrices);
    const question =
      `What's your read on this market: "${entry.market.question}"? ` +
      `It's trading Yes ${Math.round(yes * 100)}% / No ${Math.round(no * 100)}%. Is there an edge?`;
    setIsMarketModalOpen(false);
    setIsChatOpen(true);
    void sendTradeChatMessage(question);
  }, [sendTradeChatMessage]);

  const executedTrades = executionLogs.filter((log) => log.action === 'TRADE');

  const handleTradeChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendTradeChatMessage(tradeChatInput);
  };

  const handleExecuteTrade = useCallback(async (sourceText: string) => {
    if (isTradeExecuting) return;

    if (!canExecuteTrades) {
      setIsMembershipOpen(true);
      return;
    }

    setIsTradeExecuting(true);

    try {
      const res = await fetch('/api/treasury/trade/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          sourceText,
          slug: selectedMarket?.market.slug,
        }),
      });

      const data: {
        success?: boolean;
        error?: string;
        message?: string;
        order?: { status?: string };
        plan?: { side: 'YES' | 'NO'; ticker: string; count: number; priceCents: number };
        logs?: ExecutionLogEntry[];
        positions?: LivePosition[];
      } = await res.json();

      if (!res.ok || !data.success || !data.plan) {
        const failureMessage = data.message || 'execution did not complete.';
        setTradeChatMessages((current) => [
          ...current,
          { role: 'blue', text: failureMessage, timestamp: Date.now() },
        ]);
        if (res.status === 401 || res.status === 403) {
          setIsMembershipOpen(true);
        }
        return;
      }

      if (data.logs) setExecutionLogs(data.logs);
      if (data.positions) setLivePositions(data.positions);

      const sideLabel = data.plan.side.toUpperCase();
      const confirmation =
        `vip route confirmed: ${sideLabel} ${data.plan.ticker} @ ${data.plan.priceCents}c x ${data.plan.count}. ` +
        `polymarket status: ${data.order?.status || 'submitted'}.`;

      setTradeChatMessages((current) => [
        ...current,
        { role: 'blue', text: confirmation, timestamp: Date.now() },
      ]);
    } catch {
      setTradeChatMessages((current) => [
        ...current,
        {
          role: 'blue',
          text: 'the vip router hit an execution error before Polymarket confirmed the order.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTradeExecuting(false);
    }
  }, [canExecuteTrades, isTradeExecuting, selectedMarket]);

  return (
    <main
      className={styles.main}
      style={{ '--trades-scene': `url(${sceneUrl})` } as CSSProperties}
    >
      <div className={styles.scene} aria-hidden="true" />
      <div className={styles.content}>

        {/* ── Left column: treasury balance, token holdings and wallet as one piece ── */}
        <aside className={styles.sideColumn}>
          <section className={styles.deskPanel} aria-label="Trades treasury">
            <div className={styles.panelHead}>
              <span className={styles.panelHeadTitle}>
                <span className={styles.panelHeadJa} lang="ja">金庫</span> Trades Treasury
              </span>
              <button
                type="button"
                className={styles.treasuryReceiptHint}
                onClick={() => setIsReceiptOpen(true)}
              >
                Receipts
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className={styles.treasuryBody}>
            {(() => {
              const rangeLen = TREASURY_RANGES.find((range) => range.id === treasuryRange)?.len ?? 80;
              return (
                <div className={styles.treasuryFloat}>
                  {!balance && !balanceError && <TreasuryQuickSkeleton />}
                  {balanceError && !balance && <span className={styles.errorText}>Failed to load balance</span>}
                  {balance && (
                    <>
                      <div className={styles.treasuryQuickPrimary}>
                        <div className={styles.balanceHero}>${balance.formatted}</div>
                        <div className={styles.balanceLabel}>Priceable treasury value in USDC</div>
                      </div>
                      <div className={styles.treasuryQuickSpark}>
                        <TickerLine key={`a-${treasuryRange}`} len={rangeLen} stroke="var(--color-primary)" strokeWidth={2} opacity={0.85} />
                        <TickerLine key={`b-${treasuryRange}`} len={rangeLen} drift={0.18} vol={0.8} stroke="var(--color-tertiary)" strokeWidth={1.5} opacity={0.55} speed={350} />
                        <TickerLine key={`c-${treasuryRange}`} len={rangeLen} drift={0.05} vol={0.5} stroke="var(--color-primary)" strokeWidth={1.5} opacity={0.5} speed={500} />
                      </div>
                      <div className={styles.treasuryRange} role="group" aria-label="Treasury range">
                        {TREASURY_RANGES.map((range) => (
                          <button
                            key={range.id}
                            type="button"
                            className={`${styles.treasuryRangeButton} ${treasuryRange === range.id ? styles.treasuryRangeButtonActive : ''}`}
                            onClick={() => setTreasuryRange(range.id)}
                          >
                            {range.id}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
              <TreasurySnapshotCard />
            </div>
          </section>
        </aside>

        {/* ── Right column: the market board, with Blue's quant engine one tab over ── */}
        <div className={styles.boardColumn}>
          <section className={styles.deskPanel} aria-label="Prediction markets">
            <div className={styles.panelHead}>
              <span className={styles.panelHeadTitle}>
                <span className={styles.panelHeadJa} lang="ja">市場</span> Prediction Markets
              </span>
              {lastPriceUpdate > 0 && <LastUpdatedLabel timestamp={lastPriceUpdate} />}
            </div>

            <div className={styles.boardToolbar}>
              <div className={styles.searchBar}>
                <input
                  type="search"
                  className={styles.searchInput}
                  value={marketSearch}
                  onChange={(event) => setMarketSearch(event.target.value)}
                  onClick={() => play('input-focus')}
                  placeholder="Search markets"
                  aria-label="Search markets"
                />
                <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className={styles.boardTabs} role="tablist" aria-label="Trading desk sections">
              <button
                type="button"
                role="tab"
                aria-selected={boardTab === 'markets'}
                className={`${styles.boardTab} ${boardTab === 'markets' ? styles.boardTabActive : ''}`}
                onClick={() => { play('click'); setBoardTab('markets'); }}
              >
                Markets
                {orderedMarkets.length > 0 && <span className={styles.boardTabCount}>{orderedMarkets.length}</span>}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={boardTab === 'quant'}
                className={`${styles.boardTab} ${boardTab === 'quant' ? styles.boardTabActive : ''}`}
                onClick={() => { play('click'); setBoardTab('quant'); }}
              >
                Quant
              </button>
            </div>

          {/* ════ Quant tab: Blue's model readout ════ */}
          <div className={styles.modelsColumn} hidden={boardTab !== 'quant'}>
            <div className={styles.statusBar}>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>model</span>
                <span className={styles.statusHighlight}>Black-Scholes binary</span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>MC_paths:</span>
                <span className={styles.statusValue}>200,000</span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>feeds:</span>
                <span className={styles.statusValue}>30-60s</span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>pulse:</span>
                <span className={styles.statusValue}>1.2s</span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>edge_threshold:</span>
                <span className={styles.statusHighlight}>3%</span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>kelly:</span>
                <span className={styles.statusValue}>0.25x</span>
              </div>
            </div>

            {/* Black-Scholes Binary Pricing */}
            <div className={styles.modelPanel}>
              <div className={styles.modelName}>{'// black-scholes binary pricing'}</div>
              <div className={styles.modelFormula}>
                C_binary = e^(-rT) &middot; N(d&#x2082;)
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>d&#x2082;</span>
                <span><span className={styles.paramValue}>{derived.d2.toFixed(6)}</span></span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>N(d&#x2082;)</span>
                <span><span className={styles.paramValue}>{derived.Nd2.toFixed(5)}</span></span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>C_bin</span>
                <span><span className={styles.paramValue}>{'$' + derived.C_bin.toFixed(4)}</span></span>
              </div>
              <div style={{ marginTop: 10 }}>
                <div className={styles.modelName}>{'// parameters'}</div>
                <div className={styles.paramRow}>
                  <span className={styles.paramKey}>S</span>
                  <span>
                    <span className={styles.paramValue}>{'$' + derived.S.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                    <span className={styles.paramComment}>{'// spot'}</span>
                  </span>
                </div>
                <div className={styles.paramRow}>
                  <span className={styles.paramKey}>K</span>
                  <span>
                    <span className={styles.paramValue}>{'$' + derived.K.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                    <span className={styles.paramComment}>{'// strike'}</span>
                  </span>
                </div>
                <div className={styles.paramRow}>
                  <span className={styles.paramKey}>&sigma;</span>
                  <span>
                    <span className={styles.paramValue}>{(derived.sigma * 100).toFixed(2)}%</span>
                    <span className={styles.paramComment}>{'// annual IV'}</span>
                  </span>
                </div>
                <div className={styles.paramRow}>
                  <span className={styles.paramKey}>T</span>
                  <span>
                    <span className={styles.paramValue}>0.0000095</span>
                    <span className={styles.paramComment}>{'// 5min/yr'}</span>
                  </span>
                </div>
                <div className={styles.paramRow}>
                  <span className={styles.paramKey}>r</span>
                  <span>
                    <span className={styles.paramValue}>4.33%</span>
                    <span className={styles.paramComment}>{'// risk-free'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Logit Jump-Diffusion */}
            <div className={styles.modelPanel}>
              <div className={styles.modelName}>{'// logit jump-diffusion'}</div>
              <div className={styles.modelFormula}>
                x_t = ln(p/(1-p))
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>x_t</span>
                <span><span className={styles.paramValue}>{derived.x_t.toFixed(4)}</span></span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>p_t</span>
                <span><span className={styles.paramValue}>{derived.p_t.toFixed(4)}</span></span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>&sigma;_b</span>
                <span>
                  <span className={styles.paramValue}>{derived.sigma_b.toFixed(3)}</span>
                  <span className={styles.paramComment}>{'// belief vol'}</span>
                </span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>&lambda;_jump</span>
                <span>
                  <span className={styles.paramValue}>{derived.lambda_jump.toFixed(2)}</span>
                  <span className={styles.paramComment}>{'// intensity'}</span>
                </span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>&mu;_J</span>
                <span>
                  <span className={styles.paramValue}>{derived.mu_J.toFixed(3)}</span>
                  <span className={styles.paramComment}>{'// jump size'}</span>
                </span>
              </div>
            </div>

            {/* Avellaneda-Stoikov Market Making */}
            <div className={styles.modelPanel}>
              <div className={styles.modelName}>{'// avellaneda-stoikov market making'}</div>
              <div className={styles.modelFormula}>
                r_x = x_t - q&middot;&gamma;&middot;&sigma;&sup2;_b&middot;(T-t)
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>q_inv</span>
                <span>
                  <span className={styles.paramValue}>{derived.q_inv.toLocaleString('en-US').replace(/,/g, ' ')}</span>
                  <span className={styles.paramComment}>{'// inventory'}</span>
                </span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>&gamma;</span>
                <span>
                  <span className={styles.paramValue}>0.10</span>
                  <span className={styles.paramComment}>{'// risk aversion'}</span>
                </span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>k</span>
                <span>
                  <span className={styles.paramValue}>1.50</span>
                  <span className={styles.paramComment}>{'// arrival decay'}</span>
                </span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>&delta;_x</span>
                <span>
                  <span className={styles.paramValue}>{derived.delta_x.toFixed(4)}</span>
                  <span className={styles.paramComment}>{'// half-spread'}</span>
                </span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>p_bid</span>
                <span><span className={styles.paramValue}>{(derived.p_bid * 100).toFixed(1)}&cent;</span></span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>p_ask</span>
                <span><span className={styles.paramValue}>{(derived.p_ask * 100).toFixed(1)}&cent;</span></span>
              </div>
            </div>

            {/* Edge Detection Pipeline */}
            <div className={styles.modelPanel}>
              <div className={styles.modelName}>{'// edge detection pipeline'}</div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>model_fair</span>
                <span><span className={styles.paramValue}>{derived.model_fair.toFixed(2)}%</span></span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>mkt_price</span>
                <span><span className={styles.paramValue}>{derived.mkt_price.toFixed(2)}%</span></span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>divergence</span>
                <span><span className={styles.paramValue}>{derived.divergence >= 0 ? '+' : ''}{derived.divergence.toFixed(2)}%</span></span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>threshold</span>
                <span><span className={styles.paramValue}>3.00%</span></span>
              </div>
              <div
                className={styles.signalRow}
                style={derived.signal === 'SKIP' ? { background: 'color-mix(in oklch, var(--markets-no) 9%, transparent)', borderColor: 'color-mix(in oklch, var(--markets-no) 22%, transparent)' } : undefined}
              >
                <span className={styles.signalLabel}>signal</span>
                <span className={derived.signal === 'TRADE' ? styles.signalValue : styles.signalSkip}>
                  &rarr; {derived.signal}
                </span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>kelly_f</span>
                <span><span className={styles.paramValue}>0.25x</span></span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>fee</span>
                <span>
                  <span className={styles.paramValue}>{derived.fee.toFixed(2)}%</span>
                  <span className={styles.paramComment}>{'// p(1-p)+0.0625'}</span>
                </span>
              </div>
              <p className={styles.tradeCheckHelp}>
                Blue only considers a trade when her estimate and the market price are at least 3% apart.
              </p>
            </div>
          </div>

          {/* ════ Markets tab: the community feed Blue trades from ════ */}
          <div className={styles.kalshiPanel} hidden={boardTab !== 'markets'}>
            <div className={styles.feedControls}>
              <div className={styles.feedTabs} role="tablist" aria-label="Market filter">
                <button
                  type="button"
                  role="tab"
                  aria-selected={marketTab === 'active'}
                  className={`${styles.feedTab} ${marketTab === 'active' ? styles.feedTabActive : ''}`}
                  onClick={() => setMarketTab('active')}
                >
                  Active
                  {activeMarkets.length > 0 && <span className={styles.feedTabCount}>{activeMarkets.length}</span>}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={marketTab === 'all'}
                  className={`${styles.feedTab} ${marketTab === 'all' ? styles.feedTabActive : ''}`}
                  onClick={() => setMarketTab('all')}
                >
                  All markets
                </button>
              </div>
            </div>
            <div className={styles.marketArena}>
              {!deferredKalshiMarkets && !kalshiError && (
                <MarketListSkeleton />
              )}
              {kalshiError && !deferredKalshiMarkets && (
                <span className={styles.errorText}>Failed to load Kalshi data</span>
              )}
              {deferredKalshiMarkets && orderedMarkets.length === 0 && (
                <p className={styles.feedEmpty}>
                  {marketTab === 'active'
                    ? 'No markets are being voted on yet. Open any market and cast the first vote — Blue trades what the community backs.'
                    : `No markets match "${marketSearch.trim()}".`}
                </p>
              )}
              {deferredKalshiMarkets && orderedMarkets.length > 0 && (
                <>
                  <div className={styles.marketCards}>
                    {orderedMarkets.map(({ category, market }) => {
                      const [yes, no] = parseOutcomePrices(market.outcomePrices);
                      const yesPct = Math.round(yes * 100);
                      const noPct = Math.round(no * 100);
                      const iconSrc = market.iconUrl || CATEGORY_AVATARS[category];
                      const isFeatured = selectedMarket?.market.id === market.id;
                      const isMuted = Boolean(selectedMarket) && !isFeatured;
                      const active = activeById.get(market.ticker || market.id);

                      return (
                        <button
                          key={market.id}
                          type="button"
                          className={`${styles.marketItem} ${isFeatured ? styles.marketItemFeatured : ''} ${isMuted ? styles.marketItemMuted : ''}`}
                          onClick={() => {
                            setSelectedMarket({ category, market });
                            setIsMarketModalOpen(true);
                          }}
                        >
                          <div className={styles.marketItemTop}>
                            <div className={styles.marketItemHeader}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={iconSrc}
                                alt=""
                                className={styles.marketIcon}
                                width={44}
                                height={44}
                                loading="lazy"
                              />
                              <div className={styles.marketQuestion}>{market.question}</div>
                            </div>
                            <div className={styles.marketPillGroup}>
                              {isFeatured && <span className={styles.marketFeaturedTag}>Featured</span>}
                              <div className={styles.marketPill}>{CATEGORY_LABELS[category]}</div>
                            </div>
                          </div>
                          <div className={styles.marketBarWrap}>
                            <div className={styles.marketBar}>
                              <div className={styles.marketYes} style={{ width: `${yesPct}%` }} />
                              <div className={styles.marketNo} style={{ width: `${noPct}%` }} />
                            </div>
                            <div className={styles.marketBarValues}>
                              <span className={styles.marketBarValueYes}>Yes {yesPct}%</span>
                              <span className={styles.marketBarValueNo}>No {noPct}%</span>
                            </div>
                          </div>
                          <div className={styles.marketMeta}>
                            <span>Volume {formatVol(market.volume)}</span>
                            {active && active.posts > 0 && (
                              <span className={styles.marketVotes}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={VOTE_TOKEN_ICON} alt="" className={styles.voteIcon} width={14} height={14} />
                                {active.posts} vote{active.posts === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {showLoadMore && (
                    <button
                      type="button"
                      className={styles.marketLoadMore}
                      onClick={() => {
                        setVisibleMarketCounts((current) => (
                          MARKET_CATEGORIES.reduce<Record<MarketCategory, number>>((next, category) => {
                            const total = deferredKalshiMarkets[category]?.length ?? 0;
                            next[category] = Math.min((current[category] ?? INITIAL_VISIBLE_MARKETS) + 1, total);
                            return next;
                          }, { ...current })
                        ));
                      }}
                    >
                      Show more
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          </section>
        </div>

        {/* ════ Blue Trading Chat panel ════ */}
          <section
            className={`${styles.blueTradeColumn} ${isChatOpen ? styles.blueTradeColumnOpen : ''}`}
            aria-label="Blue trading chat"
            aria-hidden={!isChatOpen}
          >
            <div className={styles.blueChatHeader}>
              <span className={styles.blueChatTitle}>Trade Using Blue</span>
              <button
                type="button"
                className={styles.blueChatClose}
                onClick={() => setIsChatOpen(false)}
                aria-label="Close chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className={styles.blueChatMessages} ref={tradeChatScrollRef}>
              {tradeChatMessages.map((message, index) => {
                const canExecute = message.role === 'blue' && index > 0 && tradeChatMessages[index - 1].role === 'user';
                return (
                  <div
                    key={`${message.timestamp}-${index}`}
                    className={`${styles.blueChatBubble} ${message.role === 'user' ? styles.blueChatUser : styles.blueChatBlue}`}
                  >
                    {message.role === 'blue' && (
                      <div className={styles.blueAvatar} aria-hidden="true">
                        <Image src="/uploads/blueagent.png" alt="" width={28} height={28} className={styles.blueAvatarImage} />
                      </div>
                    )}
                    <div className={styles.blueBubbleStack}>
                      <div className={styles.blueBubbleText}>{message.text}</div>
                      {canExecute && (
                        <button
                          type="button"
                          className={styles.blueExecuteButton}
                          onClick={() => void handleExecuteTrade(tradeChatMessages[index - 1]?.text || message.text)}
                          disabled={isTradeExecuting}
                        >
                          {canExecuteTrades
                            ? (isTradeExecuting ? 'Routing...' : 'Execute this trade')
                            : (hasVipMembershipCard === null ? 'Checking access...' : 'VIP card required')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {isTradeChatSending && (
                <div className={`${styles.blueChatBubble} ${styles.blueChatBlue}`}>
                  <div className={styles.blueAvatar} aria-hidden="true">
                    <Image src="/uploads/blueagent.png" alt="" width={28} height={28} className={styles.blueAvatarImage} />
                  </div>
                  <div className={styles.blueTyping}>
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.blueQuickActions} aria-label="Suggested trading prompts">
              {TRADE_CHAT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendTradeChatMessage(suggestion)}
                  disabled={isTradeChatSending || isTradeExecuting}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form className={styles.blueTradeComposer} onSubmit={handleTradeChatSubmit}>
              <textarea
                value={tradeChatInput}
                onChange={(event) => setTradeChatInput(event.target.value)}
                onKeyDown={(event) => {
                  play('click');
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendTradeChatMessage(tradeChatInput);
                  }
                }}
                placeholder="Ask Blue..."
                rows={2}
                disabled={isTradeChatSending || isTradeExecuting}
              />
              <button type="submit" disabled={!tradeChatInput.trim() || isTradeChatSending || isTradeExecuting}>
                {isTradeExecuting ? 'Busy' : 'Send'}
              </button>
            </form>
          </section>

        {/* ── Docked chat launcher + one-time Daemon spotlight ── */}
        <div className={styles.chatDock}>
          {showChatSpotlight && !isChatOpen && (
            <div className={styles.daemonSpotlight} role="status">
              <div className={styles.daemonSpotlightHead}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/daemon.svg" alt="" className={styles.daemonSpotlightIcon} width={15} height={15} />
                <span className={styles.daemonSpotlightKicker}>Daemon</span>
                <button
                  type="button"
                  className={styles.daemonSpotlightClose}
                  onClick={dismissChatSpotlight}
                  aria-label="Dismiss"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <p className={styles.daemonSpotlightBody}>
                New desk unlocked. Blue trades the community treasury &mdash; pick a market, vote a
                side, and win the case to send her in.
              </p>
            </div>
          )}

          <button
            type="button"
            className={styles.chatFab}
            onClick={() => {
              setIsChatOpen((open) => !open);
              dismissChatSpotlight();
            }}
            aria-expanded={isChatOpen}
            aria-label={isChatOpen ? 'Close Blue trading chat' : 'Trade using Blue'}
          >
            <span className={styles.chatFabShine} aria-hidden="true" />
            <span className={styles.chatFabContent}>
              <svg viewBox="0 0 511.893 511.893" className={styles.chatFabIcon} fill="currentColor" aria-hidden="true">
                <path d="M458.599,261.333c32.107-47.253,41.707-94.293,21.44-129.387c-19.947-34.453-64.213-49.6-119.787-46.187C335.079,32.853,297.959,0,255.932,0s-79.147,32.96-104.427,85.867c-0.747,0-1.6-0.213-2.347-0.213c-56.64-3.093-98.347,13.44-117.333,46.187c-20.267,35.2-10.667,82.133,21.44,129.387c-32.107,47.253-41.707,94.293-21.44,129.387c18.133,31.36,56.213,46.827,104.747,46.827c6.613,0,13.44-0.32,20.373-0.853c24.96,46.72,59.84,75.307,99.093,75.307s74.133-28.587,99.093-75.307c6.933,0.533,13.76,0.853,20.267,0.853c48.427,0,86.613-15.467,104.747-46.827C500.306,355.627,490.706,308.587,458.599,261.333z M461.586,142.613c14.933,25.813,7.147,62.08-16.96,99.947c-16.427-20.053-34.773-38.293-54.827-54.613c-3.84-27.627-10.667-54.613-20.373-80.747C412.839,105.813,446.972,117.333,461.586,142.613z M373.266,256c0,22.933-1.813,45.867-5.333,68.587c-17.173,13.547-35.307,25.813-54.293,36.8c-18.56,10.667-37.867,20.053-57.707,28.053c-19.84-8-39.147-17.387-57.707-28.053c-18.987-10.987-37.12-23.253-54.293-36.8c-6.507-41.387-7.04-83.52-1.707-125.12c17.707-14.08,36.373-26.773,56-38.187c18.667-10.773,37.973-20.16,57.92-28.16c19.84,8,39.04,17.493,57.6,28.16c19.52,11.307,38.293,24.107,55.893,38.187C372.092,218.24,373.266,237.12,373.266,256z M255.932,21.333c31.04,0,59.84,25.707,81.067,66.88c-27.733,4.267-55.04,11.52-81.173,21.867c-26.133-10.24-53.333-17.493-81.067-21.653C195.986,47.147,224.786,21.333,255.932,21.333z M50.279,142.613c14.187-24.533,46.933-37.013,92.267-35.627c-9.813,26.133-16.64,53.333-20.48,81.067c-20.053,16.32-38.507,34.56-54.827,54.613C43.132,204.693,35.346,168.427,50.279,142.613z M50.279,380.053c-14.933-25.813-7.147-62.08,16.96-99.947c16.853,20.693,35.947,39.573,56.747,56.213c5.013,29.12,12.8,55.68,22.72,79.04C101.266,417.6,65.319,406.187,50.279,380.053z M255.932,490.667c-28.48,0-55.04-21.653-75.627-56.853c24-3.947,49.493-11.093,75.627-21.227c26.133,10.133,51.627,17.28,75.627,21.227C310.972,469.013,284.412,490.667,255.932,490.667z M461.586,380.053c-15.04,26.133-50.987,37.44-96.427,35.307c9.92-23.253,17.6-49.92,22.72-79.04c20.8-16.747,39.893-35.52,56.747-56.213C468.732,317.973,476.519,354.24,461.586,380.053z" />
                <path d="M255.932,224c-23.573,0-42.667,19.093-42.667,42.667s19.093,42.667,42.667,42.667c23.573,0,42.667-19.093,42.667-42.667S279.506,224,255.932,224z" />
              </svg>
              <span className={styles.chatFabTitle}>{isChatOpen ? 'Close chat' : 'Trade Using Blue'}</span>
            </span>
          </button>
        </div>
      </div>
      <ProMembershipModal isOpen={isMembershipOpen} onClose={() => setIsMembershipOpen(false)} />

      {isReceiptOpen && typeof document !== 'undefined' && createPortal(
        <div className={styles.receiptModalOverlay} onClick={() => setIsReceiptOpen(false)}>
          <div
            className={styles.receiptModalCard}
            role="dialog"
            aria-modal="true"
            aria-label="Execution receipts"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.receiptModalClose}
              onClick={() => setIsReceiptOpen(false)}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className={styles.receipt} aria-label="Executed trades history">
              <div className={styles.receiptHead}>
                <span className={styles.receiptShop}>MWA Trading Desk</span>
                <span className={styles.receiptSub}>execution receipts</span>
              </div>
              <div className={styles.receiptRule} />
              <div className={styles.receiptBody}>
                {executedTrades.length === 0 ? (
                  <p className={styles.receiptEmpty}>- awaiting first execution -</p>
                ) : (
                  executedTrades.map((log, i) => (
                    <div key={`${log.timestamp}-${i}`} className={styles.receiptItem}>
                      <div className={styles.receiptItemTop}>
                        <span>{formatTradeTime(String(log.timestamp / 1000))}</span>
                        <span className={styles.receiptAction}>{log.action}</span>
                      </div>
                      <div className={styles.receiptItemDetail}>
                        {log.asset ? `${log.asset} ` : ''}{log.details}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className={styles.receiptRule} />
              <div className={styles.receiptFoot}>
                <span>{executedTrades.length} fill{executedTrades.length === 1 ? '' : 's'}</span>
                <span aria-hidden="true">* * *</span>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {selectedMarket && isMarketModalOpen && typeof document !== 'undefined' && createPortal(
        (() => {
          const [yes, no] = parseOutcomePrices(selectedMarket.market.outcomePrices);
          const yesPct = Math.round(yes * 100);
          const noPct = Math.round(no * 100);
          const iconSrc = selectedMarket.market.iconUrl || CATEGORY_AVATARS[selectedMarket.category];
          return (
            <div className={styles.marketModalOverlay} onClick={() => setIsMarketModalOpen(false)}>
              <div
                className={styles.marketModalCard}
                role="dialog"
                aria-modal="true"
                aria-label="Market detail"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className={styles.marketModalClose}
                  onClick={() => setIsMarketModalOpen(false)}
                  aria-label="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>

                <div className={styles.marketModalBody}>
                  {/* Top: market name, position, and volume */}
                  <div className={styles.marketModalHero}>
                    <div className={styles.marketModalHead}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={iconSrc} alt="" className={styles.marketModalIcon} width={56} height={56} />
                      <div className={styles.marketModalHeadText}>
                        <span className={styles.marketPill}>{CATEGORY_LABELS[selectedMarket.category]}</span>
                        <h2 className={styles.marketModalTitle}>{selectedMarket.market.question}</h2>
                      </div>
                    </div>
                    <div className={styles.marketBar}>
                      <div className={styles.marketYes} style={{ width: `${yesPct}%` }} />
                      <div className={styles.marketNo} style={{ width: `${noPct}%` }} />
                    </div>
                    <div className={styles.heroStats}>
                      <div className={styles.heroStat}>
                        <span className={styles.heroStatLabel}>Yes</span>
                        <span className={`${styles.heroStatNum} ${styles.heroStatYes}`}>{yesPct}%</span>
                      </div>
                      <div className={styles.heroStat}>
                        <span className={styles.heroStatLabel}>No</span>
                        <span className={`${styles.heroStatNum} ${styles.heroStatNo}`}>{noPct}%</span>
                      </div>
                      <div className={styles.heroStat}>
                        <span className={styles.heroStatLabel}>Volume</span>
                        <span className={styles.heroStatNum}>{formatVol(selectedMarket.market.volume)}</span>
                      </div>
                    </div>
                  </div>

                  {/* The vote */}
                  <MarketDebate
                    marketId={selectedMarket.market.ticker || selectedMarket.market.id}
                    marketTitle={selectedMarket.market.question}
                  />

                  {/* How Blue acts on the vote — sits underneath the vote */}
                  <div className={styles.voteIntro}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={VOTE_TOKEN_ICON} alt="" className={styles.voteIntroIcon} width={36} height={36} />
                    <div className={styles.voteIntroText}>
                      <span className={styles.voteIntroTitle}>Post Your Beliefs</span>
                      <span className={styles.voteIntroSub}>
                        Blue snaps live trading data and runs it through a quantum processing script
                        and elf magic to position trades.
                      </span>
                    </div>
                  </div>

                  <CtaButton
                    variant="secondary"
                    block
                    onClick={() => askBlueAboutMarket(selectedMarket)}
                  >
                    Ask Blue about this market
                  </CtaButton>
                </div>
              </div>
            </div>
          );
        })(),
        document.body,
      )}
    </main>
  );
}

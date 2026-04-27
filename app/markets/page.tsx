'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { HowToButton } from '@/components/treasury-how-to/TreasuryHowTo';
import ProMembershipModal from '@/components/pro-membership-modal/ProMembershipModal';
import styles from './page.module.css';
import type { CoinPrice, TreasuryBalance, CategorizedMarkets, MarketCategory, MarketRow, AppleTokenStats as ShardTokenStats } from '@/lib/market-api';

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
  walletAddress?: string;
}

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

/** Find a BTC-related Kalshi market, return Yes price as % */
function findBtcMarket(markets: CategorizedMarkets | null): number | null {
  if (!markets) return null;
  const match = markets.crypto.find((m: MarketRow) =>
    /^KXBTC/i.test(m.event_ticker || m.ticker) ||
    /btc|bitcoin/i.test(m.question),
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
  crypto: 'CRYPTO',
  ai: 'AI',
  sports: 'SPORTS',
  politics: 'POLITICS',
};

const TRADE_CHAT_SUGGESTIONS = [
  'KELLY-LOCK+ scan the strongest edge right now.',
  'Size a conservative market entry.',
  'Stage the highest-conviction trade.',
];
const BLUE_ROUTE_TRIGGER_TEXT =
  'Blue checks live markets, Kelly sizing, open positions, and the KELLY-LOCK+ order path before acting.';

const INITIAL_TRADE_CHAT: TradeChatMessage[] = [
  {
    role: 'blue',
    text: "Hey, what's up?",
    timestamp: Date.now(),
  },
];

// ── Live Ticker Line ──

const TICKER_LEN = 80;
const TICKER_DRIFT = 0.25;   // upward bias per tick
const TICKER_VOL = 0.6;      // small random noise

function TickerLine({ drift = TICKER_DRIFT, vol = TICKER_VOL, stroke = 'var(--color-primary)', strokeWidth = 2.5, opacity = 0.8, speed = 300 }: {
  drift?: number; vol?: number; stroke?: string; strokeWidth?: number; opacity?: number; speed?: number;
}) {
  const buf = useRef<number[]>((() => {
    const arr: number[] = [];
    let v = 0;
    for (let i = 0; i < TICKER_LEN; i++) {
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
      if (arr.length > TICKER_LEN) arr.shift();

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
  }, [drift, vol, speed]);

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

// ── Page ──

export default function Markets() {
  const [prices, setPrices] = useState<CoinPrice[] | null>(null);
  const [balance, setBalance] = useState<TreasuryBalance | null>(null);
  const [kalshiMarkets, setKalshiMarkets] = useState<CategorizedMarkets | null>(null);
  const [shardStats, setShardStats] = useState<ShardTokenStats | null>(null);
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
  const [hasVipMembershipCard, setHasVipMembershipCard] = useState<boolean | null>(null);
  const [isHistoryHighlighted, setIsHistoryHighlighted] = useState(false);
  const tradeChatScrollRef = useRef<HTMLDivElement | null>(null);
  const tradeHistoryRef = useRef<HTMLDivElement | null>(null);
  const historyHighlightTimeoutRef = useRef<number | null>(null);

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

  const fetchKalshi = useCallback(async () => {
    try {
      const res = await fetch('/api/treasury/kalshi');
      if (!res.ok) throw new Error();
      const data: CategorizedMarkets = await res.json();
      setKalshiMarkets(data);
      setKalshiError(false);
    } catch {
      setKalshiError(true);
    }
  }, []);

  const fetchShardStats = useCallback(async () => {
    try {
      const res = await fetch('/api/treasury/apple-stats');
      if (!res.ok) return;
      const data: ShardTokenStats = await res.json();
      setShardStats(data);
    } catch { /* silent */ }
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

  const fetchAccountStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/account/status');
      if (!res.ok) {
        setHasVipMembershipCard(false);
        return;
      }

      const data: AccountStatusResponse = await res.json();
      setHasVipMembershipCard(Boolean(data.hasVipMembershipCard));
    } catch {
      setHasVipMembershipCard(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchPrices();
    fetchBalance();
    fetchKalshi();

    // Polling intervals
    const priceInterval = setInterval(fetchPrices, 30_000);
    const balanceInterval = setInterval(fetchBalance, 60_000);
    const kalshiInterval = setInterval(fetchKalshi, 60_000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(balanceInterval);
      clearInterval(kalshiInterval);
    };
  }, [fetchPrices, fetchBalance, fetchKalshi]);

  useEffect(() => {
    void fetchAccountStatus();
  }, [fetchAccountStatus]);

  // Fetch SHARDS stats and execution logs
  useEffect(() => {
    fetchShardStats();
    fetchExecutionLogs();
    const shardInterval = setInterval(fetchShardStats, 60_000);
    const logsInterval = setInterval(fetchExecutionLogs, 30_000);
    return () => {
      clearInterval(shardInterval);
      clearInterval(logsInterval);
    };
  }, [fetchShardStats, fetchExecutionLogs]);

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

  useEffect(() => {
    const node = tradeChatScrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [tradeChatMessages, isTradeChatSending]);

  useEffect(() => {
    return () => {
      if (historyHighlightTimeoutRef.current !== null) {
        window.clearTimeout(historyHighlightTimeoutRef.current);
      }
    };
  }, []);

  const focusTradeHistory = useCallback(() => {
    const node = tradeHistoryRef.current;
    if (!node) return;

    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setIsHistoryHighlighted(true);

    if (historyHighlightTimeoutRef.current !== null) {
      window.clearTimeout(historyHighlightTimeoutRef.current);
    }

    historyHighlightTimeoutRef.current = window.setTimeout(() => {
      setIsHistoryHighlighted(false);
      historyHighlightTimeoutRef.current = null;
    }, 1600);
  }, []);

  const buildBlueTradingMessage = useCallback((userMessage: string) => {
    const priceSnapshot = prices?.slice(0, 6).map((coin) => (
      `${coin.symbol}: ${formatPrice(coin.usd)}, 24h volume ${formatVol(coin.usd_24h_vol)}`
    )).join('\n') || 'price feed not loaded';

    const signalMarkets = kalshiMarkets
      ? (['crypto', 'ai', 'sports', 'politics'] as MarketCategory[])
        .flatMap((cat) => (kalshiMarkets[cat] || []).slice(0, 2).map((market) => {
          const [yes, no] = parseOutcomePrices(market.outcomePrices);
          return `${CATEGORY_LABELS[cat]}: ${market.question} | yes ${Math.round(yes * 100)}% no ${Math.round(no * 100)}% volume ${formatVol(market.volume)}`;
        }))
        .slice(0, 6)
        .join('\n')
      : 'Kalshi feed not loaded';

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
      'Trigger word: KELLY-LOCK+. If the user or desk banner includes it, explicitly weigh Kelly sizing, the edge threshold, live asks, open positions, and execution safety before answering.',
      'Execution is VIP-gated. Only the verified VIP Membership Card wallet can submit a live Kalshi order.',
      'Do not claim an order filled unless the execution log confirms it. If execution is not confirmed, say you are routing, monitoring, or preparing the trade.',
      'When useful, answer with the intended market, direction, sizing posture, risk check, and next execution step. Keep it concise and conversational.',
      '',
      'Live model snapshot:',
      `signal: ${derived.signal}`,
      `model fair: ${derived.model_fair.toFixed(2)}%`,
      `market price: ${derived.mkt_price.toFixed(2)}%`,
      `divergence: ${derived.divergence >= 0 ? '+' : ''}${derived.divergence.toFixed(2)}%`,
      `kelly cap: 0.25x`,
      `USDC markets balance: ${balance ? '$' + balance.formatted : 'not loaded'}`,
      `SHARDS price: ${shardStats ? formatPrice(shardStats.price) : 'not loaded'}`,
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
  }, [shardStats, balance, derived, executionLogs, livePositions, kalshiMarkets, prices]);

  const generateLocalTradeResponse = useCallback((userMessage: string) => {
    const command = userMessage.toLowerCase();
    const posture = Math.abs(derived.divergence) > EDGE_THRESHOLD ? 'actionable' : 'below threshold';
    const direction = derived.divergence >= 0 ? 'yes/upside' : 'no/downside';

    if (command.includes('trade') || command.includes('buy') || command.includes('sell') || command.includes('size')) {
      return `i'm reading this as a ${direction} instruction, but the signal is ${posture}: model fair ${derived.model_fair.toFixed(2)}% vs market ${derived.mkt_price.toFixed(2)}%. i'll keep it kelly-capped at 0.25x and only route once the protected execution path confirms the order.`;
    }

    return `current read: ${derived.signal.toLowerCase()}, fair ${derived.model_fair.toFixed(2)}%, market ${derived.mkt_price.toFixed(2)}%, divergence ${derived.divergence >= 0 ? '+' : ''}${derived.divergence.toFixed(2)}%. ask me to trade, size, hedge, or wait and i'll translate it into the next engine step.`;
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

  const handleTradeChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendTradeChatMessage(tradeChatInput);
  };

  const handleExecuteTrade = useCallback(async (sourceText: string) => {
    if (isTradeExecuting) return;

    if (hasVipMembershipCard !== true) {
      setIsMembershipOpen(true);
      return;
    }

    setIsTradeExecuting(true);

    try {
      const res = await fetch('/api/treasury/trade/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceText }),
      });

      const data: {
        success?: boolean;
        error?: string;
        message?: string;
        order?: { status?: string };
        plan?: { side: 'yes' | 'no'; ticker: string; count: number; priceCents: number };
        logs?: ExecutionLogEntry[];
        positions?: LivePosition[];
      } = await res.json();

      if (!res.ok || !data.success || !data.plan) {
        const failureMessage = data.message || 'kalshi execution did not complete.';
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
        `kalshi status: ${data.order?.status || 'submitted'}.`;

      setTradeChatMessages((current) => [
        ...current,
        { role: 'blue', text: confirmation, timestamp: Date.now() },
      ]);
      focusTradeHistory();
    } catch {
      setTradeChatMessages((current) => [
        ...current,
        {
          role: 'blue',
          text: 'the vip router hit an execution error before Kalshi confirmed the order.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTradeExecuting(false);
    }
  }, [focusTradeHistory, hasVipMembershipCard, isTradeExecuting]);

  return (
    <main className={styles.main}>
      <SideNavigation />
      <div className={styles.pageLayout}>

        {/* ── Status Bar ── */}
        <div className={styles.statusBar}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>model</span>
            <span className={styles.statusHighlight}>BLACK-SCHOLES BINARY</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>markets:</span>
            <span className={styles.statusValue}>BTC ETH SOL XRP GOLD</span>
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
          {lastPriceUpdate > 0 && (
            <div className={styles.statusItem}>
              <LastUpdatedLabel timestamp={lastPriceUpdate} />
            </div>
          )}
          <div className={styles.statusItem}>
            <HowToButton />
          </div>
        </div>

        {/* ── SHARDS Stats Bar ── */}
        <div className={styles.shardBar}>
          <div className={styles.shardBarItem}>
            <span className={styles.shardBarLabel}>$SHARDS</span>
            <span className={styles.shardBarValue}>
              {shardStats ? formatPrice(shardStats.price) : '--'}
            </span>
          </div>
          <div className={styles.shardBarItem}>
            <span className={styles.shardBarLabel}>holders</span>
            <span className={styles.shardBarValue}>
              {shardStats ? shardStats.holders.toLocaleString() : '--'}
            </span>
          </div>
          <div className={styles.shardBarItem}>
            <span className={styles.shardBarLabel}>epoch P&L</span>
            <span className={`${styles.shardBarValue} ${shardStats && shardStats.epochPnL >= 0 ? styles.shardBarPositive : styles.shardBarNegative}`}>
              {shardStats ? (shardStats.epochPnL >= 0 ? '+' : '') + '$' + Math.abs(shardStats.epochPnL).toFixed(2) : '--'}
            </span>
          </div>
          <div className={styles.shardBarItem}>
            <span className={styles.shardBarLabel}>next distribution</span>
            <span className={styles.shardBarValue}>
              {shardStats?.nextDistribution || '--'}
            </span>
          </div>
        </div>

        {/* ── Dashboard Grid ── */}
        <div className={styles.grid}>

          {/* ════ LEFT COLUMN: Model Parameters ════ */}
          <div className={styles.modelsColumn}>

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
                style={derived.signal === 'SKIP' ? { background: 'rgba(226, 86, 123, 0.08)', borderColor: 'rgba(226, 86, 123, 0.2)' } : undefined}
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
            </div>
          </div>

          {/* ════ CENTER: Charts ════ */}

          {/* Kalshi Signal Markets */}
          <div className={`${styles.panel} ${styles.chartPanel} ${styles.kalshiPanel}`}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Kalshi &middot; Signal Markets &middot; Top by Volume</span>
              <span className={styles.panelBadge}>live</span>
            </div>
            {!kalshiMarkets && !kalshiError && (
              <span className={styles.loadingText}>Loading markets...</span>
            )}
            {kalshiError && !kalshiMarkets && (
              <span className={styles.errorText}>Failed to load Kalshi data</span>
            )}
            {kalshiMarkets && (
              <div className={styles.marketList}>
                {(['crypto', 'ai', 'sports', 'politics'] as MarketCategory[]).map((cat) => {
                  const items = kalshiMarkets[cat];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={cat} className={styles.marketSection}>
                      <div className={styles.marketSectionLabel}>{CATEGORY_LABELS[cat]}</div>
                      {items.map((m) => {
                        const [yes, no] = parseOutcomePrices(m.outcomePrices);
                        const yesPct = Math.round(yes * 100);
                        const noPct = Math.round(no * 100);
                        return (
                          <div key={m.id} className={styles.marketItem}>
                            <div className={styles.marketQuestion}>{m.question}</div>
                            <div className={styles.marketBar}>
                              <div className={styles.marketYes} style={{ width: `${yesPct}%` }} />
                              <div className={styles.marketNo} style={{ width: `${noPct}%` }} />
                            </div>
                            <div className={styles.marketMeta}>
                              <span>Yes {yesPct}% / No {noPct}%</span>
                              <span>Vol: {formatVol(m.volume)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Execution Log */}
          <div
            ref={tradeHistoryRef}
            className={`${styles.panel} ${styles.logPanel} ${isHistoryHighlighted ? styles.logPanelHighlighted : ''}`}
          >
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Execution Log &middot; Edge Capture</span>
              <span className={styles.panelBadge}>live</span>
            </div>
            <div className={styles.logEntries}>
              {executionLogs.length === 0 && (
                <span className={styles.loadingText}>Waiting for trading cycle...</span>
              )}
              {executionLogs.map((log, i) => (
                <div key={i} className={styles.logEntry}>
                  <span className={styles.logTime}>{formatTradeTime(String(log.timestamp / 1000))}</span>
                  <span className={`${styles.logAction} ${
                    log.action === 'TRADE' ? styles.logTrade
                    : log.action === 'SKIP' ? styles.logSkip
                    : log.action === 'ERROR' ? styles.logSkip
                    : styles.logScan
                  }`}>{log.action}</span>
                  <span className={styles.logDetails}>
                    {log.asset ? `${log.asset} ` : ''}{log.details}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Treasury Quick Data */}
          <div className={`${styles.panel} ${styles.chartPanel} ${styles.treasuryPanel}`}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Markets Treasury &middot; Quick Data</span>
              <span className={styles.panelBadge}>on-chain</span>
            </div>
            <div className={styles.treasuryQuickGrid}>
              {!balance && !balanceError && (
                <span className={styles.loadingText}>Loading balance...</span>
              )}
              {balanceError && !balance && (
                <span className={styles.errorText}>Failed to load balance</span>
              )}
              {balance && (
                <>
                  <div className={styles.treasuryQuickPrimary}>
                    <div className={styles.balanceHero}>${balance.formatted}</div>
                    <div className={styles.balanceLabel}>USDC Markets Balance</div>
                  </div>
                  <div className={styles.treasuryQuickMeta}>
                    <div className={styles.treasuryQuickItem}>
                      <span>deployable</span>
                      <strong>{derived.signal === 'TRADE' ? 'armed' : 'standby'}</strong>
                    </div>
                    <div className={styles.treasuryQuickItem}>
                      <span>kelly cap</span>
                      <strong>0.25x</strong>
                    </div>
                    <div className={styles.treasuryQuickItem}>
                      <span>fair</span>
                      <strong>{derived.model_fair.toFixed(2)}%</strong>
                    </div>
                    <div className={styles.treasuryQuickItem}>
                      <span>edge</span>
                      <strong>{derived.divergence >= 0 ? '+' : ''}{derived.divergence.toFixed(2)}%</strong>
                    </div>
                  </div>
                  <div className={styles.treasuryQuickSpark}>
                    <TickerLine stroke="var(--color-primary)" />
                    <TickerLine drift={0.18} vol={0.8} stroke="var(--color-tertiary)" strokeWidth={1.5} opacity={0.5} speed={350} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ════ RIGHT COLUMN: Blue Trading Chat ════ */}
          <section className={styles.blueTradeColumn} aria-label="Blue trading chat">
            <div className={styles.blueTradeHeader}>
              <div className={styles.blueDeskIdentity}>
                <div className={styles.blueHeaderAvatar} aria-hidden="true">
                  <Image src="/uploads/blueagent.png" alt="" width={40} height={40} className={styles.blueAvatarImage} />
                </div>
                <div className={styles.blueHeaderCopy}>
                  <div className={styles.panelTitle}>Blue</div>
                  <h2 className={styles.blueTradeTitle}>VIP Desk</h2>
                </div>
              </div>
              <button
                type="button"
                className={styles.tradeHistoryButton}
                aria-label="View trade history"
                onClick={focusTradeHistory}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 4v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className={styles.blueTradeVitals}>
              <div className={styles.blueVital}>
                <span>fair</span>
                <strong>{derived.model_fair.toFixed(2)}%</strong>
              </div>
              <div className={styles.blueVital}>
                <span>mkt</span>
                <strong>{derived.mkt_price.toFixed(2)}%</strong>
              </div>
              <div className={styles.blueVital}>
                <span>edge</span>
                <strong>{derived.divergence >= 0 ? '+' : ''}{derived.divergence.toFixed(2)}%</strong>
              </div>
            </div>

            <div className={styles.blueRouteCard}>
              <span className={styles.blueRouteDot} aria-hidden="true" />
              <span>{BLUE_ROUTE_TRIGGER_TEXT}</span>
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
                          {hasVipMembershipCard === true
                            ? (isTradeExecuting ? 'Routing...' : 'Execute this trade')
                            : (hasVipMembershipCard === null ? 'Checking VIP...' : 'VIP card required')}
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
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendTradeChatMessage(tradeChatInput);
                  }
                }}
                placeholder="Ask Blue to size or route a VIP trade..."
                rows={3}
                disabled={isTradeChatSending || isTradeExecuting}
              />
              <button type="submit" disabled={!tradeChatInput.trim() || isTradeChatSending || isTradeExecuting}>
                {isTradeExecuting ? 'Busy' : 'Send'}
              </button>
            </form>
          </section>

        </div>
      </div>
      <ProMembershipModal isOpen={isMembershipOpen} onClose={() => setIsMembershipOpen(false)} />
    </main>
  );
}

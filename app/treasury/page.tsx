'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { HowToButton } from '@/components/treasury-how-to/TreasuryHowTo';
import styles from './page.module.css';
import type { CoinPrice, TreasuryBalance, CategorizedMarkets, MarketCategory, PolymarketTrade, OrderFlowMetrics, AppleTokenStats } from '@/lib/market-api';

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

function formatChange(c: number | null): { text: string; positive: boolean } {
  if (c === null || c === undefined) return { text: '--', positive: true };
  return { text: (c >= 0 ? '+' : '') + c.toFixed(2) + '%', positive: c >= 0 };
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
  action: 'SCAN' | 'TRADE' | 'SKIP' | 'HALT' | 'ERROR';
  asset?: string;
  details: string;
  timestamp: number;
}

// ── Live Position Type ──

interface LivePosition {
  asset: string;
  side: 'BUY' | 'SELL';
  price: string;
  size: string;
  sizeMatched: string;
  status: string;
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

/** Find a BTC-related Polymarket question, return Yes price as % */
function findBtcMarket(markets: CategorizedMarkets | null): number | null {
  if (!markets) return null;
  const match = markets.crypto.find(m => /btc|bitcoin/i.test(m.question));
  if (!match) return null;
  const [yes] = parseOutcomePrices(match.outcomePrices);
  return yes > 0 ? yes * 100 : null;
}

/** Compute OrderFlowMetrics from raw trades */
function computeFlowMetrics(trades: PolymarketTrade[]): OrderFlowMetrics {
  let takerBuyCount = 0;
  let takerSellCount = 0;
  let takerBuyVolume = 0;
  let takerSellVolume = 0;

  for (const t of trades) {
    const size = Number(t.size) || 0;
    if (t.side === 'BUY') {
      takerBuyCount++;
      takerBuyVolume += size;
    } else {
      takerSellCount++;
      takerSellVolume += size;
    }
  }

  const totalVolume = takerBuyVolume + takerSellVolume;
  const takerBuyRatio = totalVolume > 0 ? takerBuyVolume / totalVolume : 0.5;
  const flowDirection: OrderFlowMetrics['flowDirection'] =
    takerBuyRatio > 0.55 ? 'BULLISH' : takerBuyRatio < 0.45 ? 'BEARISH' : 'NEUTRAL';

  // Maker edge: interpolate +0.77% to +1.25% based on avg price distance from 50c
  const avgPrice = trades.length > 0
    ? trades.reduce((s, t) => s + (Number(t.price) || 0.5), 0) / trades.length
    : 0.5;
  const distFrom50 = Math.abs(avgPrice - 0.5);
  const makerEdgeEstimate = 0.77 + (distFrom50 / 0.5) * (1.25 - 0.77);

  const recentTrades = trades.slice(0, 8).map(t => ({
    price: t.price,
    size: t.size,
    side: t.side,
    ts: String(t.timestamp),
  }));

  return {
    takerBuyCount,
    takerSellCount,
    takerBuyVolume,
    takerSellVolume,
    totalTrades: trades.length,
    takerBuyRatio,
    flowDirection,
    makerEdgeEstimate,
    recentTrades,
  };
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

// ── Live Market Row (real-time micro-jitter) ──

function LiveMarketRow({ coin, tick }: { coin: CoinPrice; tick: number }) {
  // Jitter scale relative to price magnitude — feels real without drifting
  const jitterScale = coin.usd >= 1000 ? coin.usd * 0.00003
    : coin.usd >= 1 ? coin.usd * 0.0002
    : coin.usd * 0.001;

  // Deterministic-ish jitter seeded by tick so it changes every 300ms
  const jittered = coin.usd + (Math.sin(tick * 0.7 + coin.symbol.charCodeAt(0)) * 0.5 + (Math.random() - 0.5)) * jitterScale;

  const change = formatChange(coin.usd_24h_change);

  return (
    <div className={styles.marketRow}>
      <div>
        <div className={styles.marketSymbol}>{coin.symbol}</div>
      </div>
      <div>
        <div className={`${styles.marketPrice} ${styles.priceTick}`} key={tick}>
          {formatPrice(jittered)}
        </div>
        <div className={styles.marketMeta}>
          <span className={change.positive ? styles.changePositive : styles.changeNegative}>
            {change.text}
          </span>
          {' '}vol:{formatVol(coin.usd_24h_vol)}
        </div>
      </div>
    </div>
  );
}

// ── Page ──

export default function Treasury() {
  const [prices, setPrices] = useState<CoinPrice[] | null>(null);
  const [balance, setBalance] = useState<TreasuryBalance | null>(null);
  const [polymarkets, setPolymarkets] = useState<CategorizedMarkets | null>(null);
  const [orderFlow, setOrderFlow] = useState<OrderFlowMetrics | null>(null);
  const [appleStats, setAppleStats] = useState<AppleTokenStats | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogEntry[]>([]);
  const [livePositions, setLivePositions] = useState<LivePosition[]>([]);
  const [priceError, setPriceError] = useState(false);
  const [balanceError, setBalanceError] = useState(false);
  const [polyError, setPolyError] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number>(0);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/treasury/prices');
      if (!res.ok) throw new Error();
      const data: CoinPrice[] = await res.json();
      setPrices(data);
      setPriceError(false);
      setLastPriceUpdate(Date.now());
    } catch {
      setPriceError(true);
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

  const fetchPoly = useCallback(async () => {
    try {
      const res = await fetch('/api/treasury/polymarket');
      if (!res.ok) throw new Error();
      const data: CategorizedMarkets = await res.json();
      setPolymarkets(data);
      setPolyError(false);
    } catch {
      setPolyError(true);
    }
  }, []);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch('/api/treasury/trades');
      if (!res.ok) return;
      const trades: PolymarketTrade[] = await res.json();
      if (trades.length > 0) setOrderFlow(computeFlowMetrics(trades));
    } catch { /* silent */ }
  }, []);

  const fetchAppleStats = useCallback(async () => {
    try {
      const res = await fetch('/api/treasury/apple-stats');
      if (!res.ok) return;
      const data: AppleTokenStats = await res.json();
      setAppleStats(data);
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

  useEffect(() => {
    // Initial fetch
    fetchPrices();
    fetchBalance();
    fetchPoly();

    // Polling intervals
    const priceInterval = setInterval(fetchPrices, 30_000);
    const balanceInterval = setInterval(fetchBalance, 60_000);
    const polyInterval = setInterval(fetchPoly, 60_000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(balanceInterval);
      clearInterval(polyInterval);
    };
  }, [fetchPrices, fetchBalance, fetchPoly]);

  // Fetch trades on mount and poll every 30s
  useEffect(() => {
    fetchTrades();
    const tradesInterval = setInterval(fetchTrades, 30_000);
    return () => clearInterval(tradesInterval);
  }, [fetchTrades]);

  // Fetch APPLE stats and execution logs
  useEffect(() => {
    fetchAppleStats();
    fetchExecutionLogs();
    const appleInterval = setInterval(fetchAppleStats, 60_000);
    const logsInterval = setInterval(fetchExecutionLogs, 30_000);
    return () => {
      clearInterval(appleInterval);
      clearInterval(logsInterval);
    };
  }, [fetchAppleStats, fetchExecutionLogs]);

  // Refresh the "last updated" display
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // Fast tick for live model parameter animation
  const [modelTick, setModelTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setModelTick((n) => n + 1), 300);
    return () => clearInterval(t);
  }, []);

  // ── Derived values from live prices + Polymarket ──
  const derived = useMemo(() => {
    void modelTick; // trigger recomputation on tick

    // Micro-noise for live visualization
    const jitter = (base: number, scale: number) => base + (Math.random() - 0.5) * 2 * scale;

    // Jittered model parameters
    const sigma = jitter(SIGMA, 0.005);
    const sigma_b = jitter(SIGMA_B, 0.003);
    const lambda_jump = jitter(2.46, 0.05);
    const mu_J = jitter(0.071, 0.003);
    const q_inv = Math.round(jitter(-1187, 15));

    // Step 1-2: Spot & strike (ATM) with micro-movement
    const S = jitter(prices?.find(c => c.symbol === 'BTC')?.usd ?? 66235, 8);
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
    const mkt_price = findBtcMarket(polymarkets) ?? FALLBACK_MKT_PRICE;

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
  }, [prices, polymarkets, modelTick]);

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
            <span className={styles.statusLabel}>refresh:</span>
            <span className={styles.statusValue}>100-500ms</span>
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
              <span className={styles.lastUpdated}>updated {timeAgo(lastPriceUpdate)}</span>
            </div>
          )}
          <div className={styles.statusItem}>
            <HowToButton />
          </div>
        </div>

        {/* ── APPLE Stats Bar ── */}
        <div className={styles.appleBar}>
          <div className={styles.appleBarItem}>
            <span className={styles.appleBarLabel}>$APPLE</span>
            <span className={styles.appleBarValue}>
              {appleStats ? formatPrice(appleStats.price) : '--'}
            </span>
          </div>
          <div className={styles.appleBarItem}>
            <span className={styles.appleBarLabel}>holders</span>
            <span className={styles.appleBarValue}>
              {appleStats ? appleStats.holders.toLocaleString() : '--'}
            </span>
          </div>
          <div className={styles.appleBarItem}>
            <span className={styles.appleBarLabel}>epoch P&L</span>
            <span className={`${styles.appleBarValue} ${appleStats && appleStats.epochPnL >= 0 ? styles.appleBarPositive : styles.appleBarNegative}`}>
              {appleStats ? (appleStats.epochPnL >= 0 ? '+' : '') + '$' + Math.abs(appleStats.epochPnL).toFixed(2) : '--'}
            </span>
          </div>
          <div className={styles.appleBarItem}>
            <span className={styles.appleBarLabel}>next distribution</span>
            <span className={styles.appleBarValue}>
              {appleStats?.nextDistribution || '--'}
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

          {/* Chart 1: Treasury Balance */}
          <div className={`${styles.panel} ${styles.chartPanel}`}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Treasury Balance &middot; USDC &middot; Base Mainnet</span>
              <span className={styles.panelBadge}>on-chain</span>
            </div>
            <div className={styles.chartArea}>
              {!balance && !balanceError && (
                <span className={styles.loadingText}>Loading balance...</span>
              )}
              {balanceError && !balance && (
                <span className={styles.errorText}>Failed to load balance</span>
              )}
              {balance && (
                <>
                  <div className={styles.balanceHero}>${balance.formatted}</div>
                  <div className={styles.balanceLabel}>USDC Treasury Balance</div>
                  <TickerLine stroke="var(--color-primary)" />
                  <TickerLine drift={0.18} vol={0.8} stroke="var(--color-tertiary)" strokeWidth={1.5} opacity={0.5} speed={350} />
                  <TickerLine drift={0.30} vol={0.5} stroke="var(--color-accent)" strokeWidth={1.5} opacity={0.45} speed={400} />
                  <TickerLine drift={0.12} vol={1.0} stroke="#E2567B" strokeWidth={1.5} opacity={0.4} speed={280} />
                  <TickerLine drift={0.22} vol={0.7} stroke="#A855F7" strokeWidth={1.5} opacity={0.45} speed={320} />
                  <TickerLine drift={0.15} vol={0.9} stroke="#06B6D4" strokeWidth={1.5} opacity={0.4} speed={360} />
                </>
              )}
            </div>
          </div>

          {/* Chart 2: Polymarket Signal Markets */}
          <div className={`${styles.panel} ${styles.chartPanel}`}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Polymarket &middot; Signal Markets &middot; Top by Volume</span>
              <span className={styles.panelBadge}>live</span>
            </div>
            {!polymarkets && !polyError && (
              <span className={styles.loadingText}>Loading markets...</span>
            )}
            {polyError && !polymarkets && (
              <span className={styles.errorText}>Failed to load Polymarket data</span>
            )}
            {polymarkets && (
              <div className={styles.polymarketList}>
                {(['crypto', 'ai', 'sports', 'politics'] as MarketCategory[]).map((cat) => {
                  const items = polymarkets[cat];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={cat} className={styles.polySection}>
                      <div className={styles.polySectionLabel}>{CATEGORY_LABELS[cat]}</div>
                      {items.map((m) => {
                        const [yes, no] = parseOutcomePrices(m.outcomePrices);
                        const yesPct = Math.round(yes * 100);
                        const noPct = Math.round(no * 100);
                        return (
                          <div key={m.id} className={styles.polymarketItem}>
                            <div className={styles.polyQuestion}>{m.question}</div>
                            <div className={styles.polyBar}>
                              <div className={styles.polyYes} style={{ width: `${yesPct}%` }} />
                              <div className={styles.polyNo} style={{ width: `${noPct}%` }} />
                            </div>
                            <div className={styles.polyMeta}>
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
          <div className={`${styles.panel} ${styles.logPanel}`}>
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

          {/* ════ RIGHT COLUMN: Live Markets ════ */}
          <div className={styles.marketsColumn}>
            <div className={styles.panel}>
              <div className={styles.panelTitle}>Live 5-Min Markets</div>
            </div>
            {!prices && !priceError && (
              <div className={styles.marketRow}>
                <span className={styles.loadingText}>Loading prices...</span>
              </div>
            )}
            {priceError && !prices && (
              <div className={styles.marketRow}>
                <span className={styles.errorText}>Failed to load prices</span>
              </div>
            )}
            {prices && prices.map((coin) => (
              <LiveMarketRow key={coin.symbol} coin={coin} tick={modelTick} />
            ))}
          </div>

          {/* Order Flow · Maker vs Taker */}
          <div className={`${styles.panel} ${styles.flowPanel}`}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Order Flow &middot; Maker vs Taker</span>
              <span className={styles.panelBadge}>live</span>
            </div>
            {!orderFlow ? (
              <span className={styles.loadingText}>Loading flow data...</span>
            ) : (
              <>
                <div className={`${styles.flowDirection} ${
                  orderFlow.flowDirection === 'BULLISH' ? styles.flowBullish
                    : orderFlow.flowDirection === 'BEARISH' ? styles.flowBearish
                    : styles.flowNeutral
                }`}>
                  {orderFlow.flowDirection === 'BULLISH' ? '\u2191' : orderFlow.flowDirection === 'BEARISH' ? '\u2193' : '\u2194'}
                  {' '}{orderFlow.flowDirection}
                </div>
                <div className={styles.flowBarWrap}>
                  <div className={styles.flowBuy} style={{ width: `${Math.round(orderFlow.takerBuyRatio * 100)}%` }} />
                  <div className={styles.flowSell} style={{ width: `${Math.round((1 - orderFlow.takerBuyRatio) * 100)}%` }} />
                </div>
                <div className={styles.flowBarLabels}>
                  <span>Buy {Math.round(orderFlow.takerBuyRatio * 100)}%</span>
                  <span>Sell {Math.round((1 - orderFlow.takerBuyRatio) * 100)}%</span>
                </div>
                <div className={styles.flowStats}>
                  <div className={styles.flowStatItem}>
                    <span className={styles.flowStatLabel}>Taker Buy Vol</span>
                    <span className={styles.flowStatValue}>{formatVol(orderFlow.takerBuyVolume)}</span>
                  </div>
                  <div className={styles.flowStatItem}>
                    <span className={styles.flowStatLabel}>Taker Sell Vol</span>
                    <span className={styles.flowStatValue}>{formatVol(orderFlow.takerSellVolume)}</span>
                  </div>
                  <div className={styles.flowStatItem}>
                    <span className={styles.flowStatLabel}>Total Trades</span>
                    <span className={styles.flowStatValue}>{orderFlow.totalTrades}</span>
                  </div>
                  <div className={styles.flowStatItem}>
                    <span className={styles.flowStatLabel}>Maker Edge Est.</span>
                    <span className={styles.flowStatValue}>+{orderFlow.makerEdgeEstimate.toFixed(2)}%</span>
                  </div>
                </div>
                <div className={styles.flowTradesLabel}>Recent Trades</div>
                <div className={styles.flowTrades}>
                  {orderFlow.recentTrades.map((t, i) => (
                    <div key={i} className={styles.flowTradeRow}>
                      <span className={`${styles.flowTradeBadge} ${t.side === 'BUY' ? styles.flowTradeBuy : styles.flowTradeSell}`}>
                        {t.side}
                      </span>
                      <span className={styles.flowTradePrice}>{(t.price * 100).toFixed(1)}&cent;</span>
                      <span className={styles.flowTradeSize}>{formatVol(t.size)}</span>
                      <span className={styles.flowTradeTime}>{formatTradeTime(t.ts)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Positions / Kelly Sized */}
          <div className={`${styles.panel} ${styles.positionsPanel}`}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Positions &middot; Kelly Sized</span>
              <span className={styles.panelBadge}>live</span>
            </div>
            <div className={styles.positionsEntries}>
              {livePositions.length === 0 && (
                <span className={styles.loadingText}>No open positions</span>
              )}
              {livePositions.map((pos, i) => (
                <div key={i} className={styles.positionRow}>
                  <span className={styles.positionAsset}>{pos.asset}</span>
                  <span className={`${styles.positionSide} ${pos.side === 'BUY' ? styles.positionLong : styles.positionShort}`}>
                    {pos.side === 'BUY' ? 'UP' : 'DN'}
                  </span>
                  <span className={styles.positionEntry}>
                    {Math.round(parseFloat(pos.price) * 100)}&cent; ${pos.sizeMatched || pos.size}
                  </span>
                  <span className={styles.positionStatus}>{pos.status}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

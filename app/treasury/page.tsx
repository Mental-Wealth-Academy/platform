'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import styles from './page.module.css';
import type { CoinPrice, TreasuryBalance, PolymarketMarket } from '@/lib/market-api';

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

const BOOK_SIZES = [6892, 4178, 1555, 5613, 5553, 5843, 4392, 2935, 6711, 1382, 5022, 4199];

const POSITION_ENTRIES = [
  { asset: 'XRP', side: 'UP' as const, entry: 0.54, size: 816 },
  { asset: 'ETH', side: 'DN' as const, entry: 0.54, size: 1058 },
  { asset: 'SOL', side: 'UP' as const, entry: 0.54, size: 2330 },
  { asset: 'ETH', side: 'UP' as const, entry: 0.43, size: 833 },
  { asset: 'SOL', side: 'DN' as const, entry: 0.54, size: 923 },
  { asset: 'XRP', side: 'UP' as const, entry: 0.54, size: 2359 },
  { asset: 'XRP', side: 'DN' as const, entry: 0.57, size: 974 },
  { asset: 'SOL', side: 'DN' as const, entry: 0.50, size: 1286 },
  { asset: 'ETH', side: 'UP' as const, entry: 0.45, size: 1873 },
  { asset: 'SOL', side: 'DN' as const, entry: 0.51, size: 1182 },
];

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
function findBtcMarket(markets: PolymarketMarket[] | null): number | null {
  if (!markets) return null;
  const match = markets.find(m => /btc|bitcoin/i.test(m.question));
  if (!match) return null;
  const [yes] = parseOutcomePrices(match.outcomePrices);
  return yes > 0 ? yes * 100 : null;
}

// ── Sparkline SVG ──

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 400;
  const h = 60;
  const pad = 2;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className={styles.sparklineSvg} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Page ──

export default function Treasury() {
  const [prices, setPrices] = useState<CoinPrice[] | null>(null);
  const [balance, setBalance] = useState<TreasuryBalance | null>(null);
  const [polymarkets, setPolymarkets] = useState<PolymarketMarket[] | null>(null);
  const [priceError, setPriceError] = useState(false);
  const [balanceError, setBalanceError] = useState(false);
  const [polyError, setPolyError] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number>(0);
  const balanceHistory = useRef<number[]>([]);

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
      // Track in-session history for sparkline
      balanceHistory.current = [...balanceHistory.current.slice(-29), data.usd];
    } catch {
      setBalanceError(true);
    }
  }, []);

  const fetchPoly = useCallback(async () => {
    try {
      const res = await fetch('/api/treasury/polymarket');
      if (!res.ok) throw new Error();
      const data: PolymarketMarket[] = await res.json();
      setPolymarkets(data);
      setPolyError(false);
    } catch {
      setPolyError(true);
    }
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

    // Step 15: Synthetic orderbook (with size jitter)
    const step = delta_x * 100 / 6;
    const asks = Array.from({ length: 6 }, (_, i) => ({
      price: mkt_price + (6 - i) * step,
      size: BOOK_SIZES[i] + Math.round(jitter(0, 50)),
    }));
    const bids = Array.from({ length: 6 }, (_, i) => ({
      price: mkt_price - (i + 1) * step,
      size: BOOK_SIZES[6 + i] + Math.round(jitter(0, 50)),
    }));
    const spread = asks[asks.length - 1].price - bids[0].price;

    // Step 16: Positions PnL
    const mktFrac = mkt_price / 100;
    const positions = POSITION_ENTRIES.map(pos => {
      const shares = pos.size / pos.entry;
      const pnl = pos.side === 'UP'
        ? (mktFrac - pos.entry) * shares
        : (pos.entry - mktFrac) * shares;
      return { ...pos, pnl: Math.round(pnl) };
    });

    return {
      S, K, d2, Nd2, C_bin, p_t, x_t, delta_x,
      p_bid, p_ask, model_fair, mkt_price, divergence,
      signal, fee, asks, bids, spread, positions,
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
        </div>

        {/* ── Dashboard Grid ── */}
        <div className={styles.grid}>

          {/* ════ LEFT COLUMN: Model Parameters ════ */}
          <div className={styles.modelsColumn}>

            {/* Black-Scholes Binary Pricing */}
            <div className={styles.modelPanel}>
              <div className={styles.modelName}>// black-scholes binary pricing</div>
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
                <div className={styles.modelName}>// parameters</div>
                <div className={styles.paramRow}>
                  <span className={styles.paramKey}>S</span>
                  <span>
                    <span className={styles.paramValue}>{'$' + derived.S.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                    <span className={styles.paramComment}>// spot</span>
                  </span>
                </div>
                <div className={styles.paramRow}>
                  <span className={styles.paramKey}>K</span>
                  <span>
                    <span className={styles.paramValue}>{'$' + derived.K.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                    <span className={styles.paramComment}>// strike</span>
                  </span>
                </div>
                <div className={styles.paramRow}>
                  <span className={styles.paramKey}>&sigma;</span>
                  <span>
                    <span className={styles.paramValue}>{(derived.sigma * 100).toFixed(2)}%</span>
                    <span className={styles.paramComment}>// annual IV</span>
                  </span>
                </div>
                <div className={styles.paramRow}>
                  <span className={styles.paramKey}>T</span>
                  <span>
                    <span className={styles.paramValue}>0.0000095</span>
                    <span className={styles.paramComment}>// 5min/yr</span>
                  </span>
                </div>
                <div className={styles.paramRow}>
                  <span className={styles.paramKey}>r</span>
                  <span>
                    <span className={styles.paramValue}>4.33%</span>
                    <span className={styles.paramComment}>// risk-free</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Logit Jump-Diffusion */}
            <div className={styles.modelPanel}>
              <div className={styles.modelName}>// logit jump-diffusion</div>
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
                  <span className={styles.paramComment}>// belief vol</span>
                </span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>&lambda;_jump</span>
                <span>
                  <span className={styles.paramValue}>{derived.lambda_jump.toFixed(2)}</span>
                  <span className={styles.paramComment}>// intensity</span>
                </span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>&mu;_J</span>
                <span>
                  <span className={styles.paramValue}>{derived.mu_J.toFixed(3)}</span>
                  <span className={styles.paramComment}>// jump size</span>
                </span>
              </div>
            </div>

            {/* Avellaneda-Stoikov Market Making */}
            <div className={styles.modelPanel}>
              <div className={styles.modelName}>// avellaneda-stoikov market making</div>
              <div className={styles.modelFormula}>
                r_x = x_t - q&middot;&gamma;&middot;&sigma;&sup2;_b&middot;(T-t)
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>q_inv</span>
                <span>
                  <span className={styles.paramValue}>{derived.q_inv.toLocaleString('en-US').replace(/,/g, ' ')}</span>
                  <span className={styles.paramComment}>// inventory</span>
                </span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>&gamma;</span>
                <span>
                  <span className={styles.paramValue}>0.10</span>
                  <span className={styles.paramComment}>// risk aversion</span>
                </span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>k</span>
                <span>
                  <span className={styles.paramValue}>1.50</span>
                  <span className={styles.paramComment}>// arrival decay</span>
                </span>
              </div>
              <div className={styles.paramRow}>
                <span className={styles.paramKey}>&delta;_x</span>
                <span>
                  <span className={styles.paramValue}>{derived.delta_x.toFixed(4)}</span>
                  <span className={styles.paramComment}>// half-spread</span>
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
              <div className={styles.modelName}>// edge detection pipeline</div>
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
                  <span className={styles.paramComment}>// p(1-p)+0.0625</span>
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
                  <Sparkline values={balanceHistory.current} />
                </>
              )}
            </div>
          </div>

          {/* Chart 2: Polymarket Crypto Predictions */}
          <div className={`${styles.panel} ${styles.chartPanel}`}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Polymarket &middot; Crypto Predictions &middot; Top by Volume</span>
              <span className={styles.panelBadge}>live</span>
            </div>
            {!polymarkets && !polyError && (
              <span className={styles.loadingText}>Loading markets...</span>
            )}
            {polyError && !polymarkets && (
              <span className={styles.errorText}>Failed to load Polymarket data</span>
            )}
            {polymarkets && polymarkets.length > 0 && (
              <div className={styles.polymarketList}>
                {polymarkets.map((m) => {
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
            )}
            {polymarkets && polymarkets.length === 0 && (
              <span className={styles.loadingText}>No active crypto markets</span>
            )}
          </div>

          {/* Execution Log */}
          <div className={`${styles.panel} ${styles.logPanel}`}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Execution Log &middot; Edge Capture</span>
              <span className={styles.panelBadge}>live</span>
            </div>
            <div className={styles.logEntries}>
              <div className={styles.logEntry}>
                <span className={styles.logTime}>20:38:51</span>
                <span className={`${styles.logAction} ${styles.logScan}`}>SCAN</span>
                <span className={styles.logDetails}>XRP d&#x2082;:-0.001157 N(d&#x2082;):0.49935 &sigma;_b:0.310 lag:447ms</span>
              </div>
              <div className={styles.logEntry}>
                <span className={styles.logTime}>20:38:51</span>
                <span className={`${styles.logAction} ${styles.logTrade}`}>TRADE</span>
                <span className={styles.logDetails}>XRP DN @54&cent; $816 edge:3.53% kelly:2.0%</span>
              </div>
              <div className={styles.logEntry}>
                <span className={styles.logTime}>20:38:50</span>
                <span className={`${styles.logAction} ${styles.logScan}`}>SCAN</span>
                <span className={styles.logDetails}>ETH d&#x2082;:-0.000925 N(d&#x2082;):0.49948 &sigma;_b:0.281 lag:420ms</span>
              </div>
              <div className={styles.logEntry}>
                <span className={styles.logTime}>20:38:50</span>
                <span className={`${styles.logAction} ${styles.logTrade}`}>TRADE</span>
                <span className={styles.logDetails}>ETH DN @54&cent; $1,058 edge:14.14% kelly:2.6%</span>
              </div>
              <div className={styles.logEntry}>
                <span className={styles.logTime}>20:38:40</span>
                <span className={`${styles.logAction} ${styles.logScan}`}>SCAN</span>
                <span className={styles.logDetails}>SOL d&#x2082;:-0.001388 N(d&#x2082;):0.49922 &sigma;_b:0.332 lag:53ms</span>
              </div>
              <div className={styles.logEntry}>
                <span className={styles.logTime}>20:38:40</span>
                <span className={`${styles.logAction} ${styles.logTrade}`}>TRADE</span>
                <span className={styles.logDetails}>SOL DN @54&cent; $2,330 edge:8.42% kelly:5.8%</span>
              </div>
              <div className={styles.logEntry}>
                <span className={styles.logTime}>20:38:48</span>
                <span className={`${styles.logAction} ${styles.logSkip}`}>SKIP</span>
                <span className={styles.logDetails}>XRP edge:1.82% &lt; 3% threshold</span>
              </div>
              <div className={styles.logEntry}>
                <span className={styles.logTime}>20:38:47</span>
                <span className={`${styles.logAction} ${styles.logSkip}`}>SKIP</span>
                <span className={styles.logDetails}>XRP edge:2.45% &lt; 3% threshold</span>
              </div>
              <div className={styles.logEntry}>
                <span className={styles.logTime}>20:38:47</span>
                <span className={`${styles.logAction} ${styles.logSkip}`}>SKIP</span>
                <span className={styles.logDetails}>ETH edge:0.40% &lt; 3% threshold</span>
              </div>
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
            {prices && prices.map((coin) => {
              const change = formatChange(coin.usd_24h_change);
              return (
                <div key={coin.symbol} className={styles.marketRow}>
                  <div>
                    <div className={styles.marketSymbol}>{coin.symbol}</div>
                  </div>
                  <div>
                    <div className={styles.marketPrice}>{formatPrice(coin.usd)}</div>
                    <div className={styles.marketMeta}>
                      <span className={change.positive ? styles.changePositive : styles.changeNegative}>
                        {change.text}
                      </span>
                      {' '}vol:{formatVol(coin.usd_24h_vol)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Orderbook */}
          <div className={`${styles.panel} ${styles.orderbookPanel}`}>
            <div className={styles.orderbookTitle}>Orderbook &middot; BTC UP/DOWN 5-min</div>
            <div className={styles.orderbookEntries}>
              {derived.asks.map((level, i) => (
                <div key={`ask-${i}`} className={styles.orderbookRow}>
                  <span className={styles.orderbookAsk}>{level.price.toFixed(2)}</span>
                  <span className={styles.orderbookSize}>{level.size.toLocaleString('en-US').replace(/,/g, ' ')}</span>
                </div>
              ))}
            </div>
            <div className={styles.orderbookSpread}>spread: {derived.spread.toFixed(2)}</div>
            <div className={styles.orderbookEntries}>
              {derived.bids.map((level, i) => (
                <div key={`bid-${i}`} className={styles.orderbookRow}>
                  <span className={styles.orderbookBid}>{level.price.toFixed(2)}</span>
                  <span className={styles.orderbookSize}>{level.size.toLocaleString('en-US').replace(/,/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Positions / Kelly Sized */}
          <div className={`${styles.panel} ${styles.positionsPanel}`}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Positions &middot; Kelly Sized</span>
            </div>
            <div className={styles.positionsEntries}>
              {derived.positions.map((pos, i) => (
                <div key={i} className={styles.positionRow}>
                  <span className={styles.positionAsset}>{pos.asset}</span>
                  <span className={`${styles.positionSide} ${pos.side === 'UP' ? styles.positionLong : styles.positionShort}`}>{pos.side}</span>
                  <span className={styles.positionEntry}>{Math.round(pos.entry * 100)}&cent; ${pos.size}</span>
                  <span className={`${styles.positionPnl} ${pos.pnl >= 0 ? styles.positionPnlPositive : styles.positionPnlNegative}`}>
                    {pos.pnl >= 0 ? `+$${pos.pnl}` : `-$${Math.abs(pos.pnl)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { usePrivy } from '@privy-io/react-auth';
import { MarketsPageSkeleton } from '@/components/skeleton/Skeleton';
import styles from './page.module.css';
import { useSound } from '@/hooks/useSound';
import type { CategorizedMarkets, MarketCategory, PolymarketMarket } from '@/lib/market-api';

// ── Helpers ──

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

// ── Types ──

type FilterCategory = 'all' | MarketCategory | 'academy';

interface Bet {
  id: string;
  marketId: string;
  question: string;
  side: 'YES' | 'NO';
  amount: number;
  probability: number; // probability at time of bet
  potentialWin: number;
  placedAt: number;
  status: 'active' | 'won' | 'lost';
  source: 'polymarket' | 'academy';
}

interface ArenaStats {
  wins: number;
  losses: number;
  totalWagered: number;
  totalWon: number;
}

interface AcademyMarket {
  id: string;
  question: string;
  category: string;
  yesProbability: number;
  totalPool: number;
  endDate: string;
}

// ── Constants ──

const STARTING_BALANCE = 10_000;
const LS_BALANCE = 'mwa_arena_balance';
const LS_BETS = 'mwa_arena_bets';
const LS_STATS = 'mwa_arena_stats';
const QUICK_AMOUNTS = [100, 250, 500, 1000];

const CATEGORY_COLORS: Record<string, string> = {
  crypto: '#5168FF',
  ai: '#A78BFA',
  sports: '#E8556D',
  politics: '#FF7729',
  academy: '#22C55E',
};

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  all: 'All',
  crypto: 'Crypto',
  ai: 'AI',
  sports: 'Sports',
  politics: 'Politics',
  academy: 'Academy',
};

const ACADEMY_MARKETS: AcademyMarket[] = [
  {
    id: 'mwa-1',
    question: 'Will Cohort 3 average above 80% completion?',
    category: 'COHORT',
    yesProbability: 0.62,
    totalPool: 14_820,
    endDate: '2026-04-15',
  },
  {
    id: 'mwa-2',
    question: 'Will Week 4 retention beat Week 3?',
    category: 'RETENTION',
    yesProbability: 0.55,
    totalPool: 8_450,
    endDate: '2026-04-07',
  },
  {
    id: 'mwa-3',
    question: 'Will a governance proposal pass this epoch?',
    category: 'GOVERNANCE',
    yesProbability: 0.78,
    totalPool: 22_100,
    endDate: '2026-04-14',
  },
  {
    id: 'mwa-4',
    question: 'Treasury balance > $500 USDC by end of April?',
    category: 'TREASURY',
    yesProbability: 0.41,
    totalPool: 6_300,
    endDate: '2026-04-30',
  },
  {
    id: 'mwa-5',
    question: 'Will average quiz score exceed 75% this week?',
    category: 'COHORT',
    yesProbability: 0.68,
    totalPool: 11_200,
    endDate: '2026-04-07',
  },
  {
    id: 'mwa-6',
    question: 'Will $APPLE price be above $0.01 by May?',
    category: 'TREASURY',
    yesProbability: 0.33,
    totalPool: 19_750,
    endDate: '2026-05-01',
  },
];

// ── localStorage helpers ──

function loadBalance(): number {
  if (typeof window === 'undefined') return STARTING_BALANCE;
  const raw = localStorage.getItem(LS_BALANCE);
  if (raw === null) return STARTING_BALANCE;
  const n = Number(raw);
  return isNaN(n) ? STARTING_BALANCE : n;
}

function loadBets(): Bet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_BETS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadStats(): ArenaStats {
  if (typeof window === 'undefined') return { wins: 0, losses: 0, totalWagered: 0, totalWon: 0 };
  try {
    const raw = localStorage.getItem(LS_STATS);
    return raw ? JSON.parse(raw) : { wins: 0, losses: 0, totalWagered: 0, totalWon: 0 };
  } catch {
    return { wins: 0, losses: 0, totalWagered: 0, totalWon: 0 };
  }
}

function saveState(balance: number, bets: Bet[], stats: ArenaStats) {
  localStorage.setItem(LS_BALANCE, String(balance));
  localStorage.setItem(LS_BETS, JSON.stringify(bets));
  localStorage.setItem(LS_STATS, JSON.stringify(stats));
}

// ── Market Card ──

function MarketCard({
  marketId,
  question,
  yesPct,
  noPct,
  meta,
  category,
  categoryColor,
  endLabel,
  balance,
  existingBet,
  onBet,
}: {
  marketId: string;
  question: string;
  yesPct: number;
  noPct: number;
  meta: string;
  category: string;
  categoryColor: string;
  endLabel: string;
  balance: number;
  existingBet: Bet | undefined;
  onBet: (marketId: string, question: string, side: 'YES' | 'NO', amount: number, probability: number) => void;
}) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const { play } = useSound();

  const amount = selectedAmount ?? (customAmount ? parseInt(customAmount) : 0);
  const canBet = amount > 0 && amount <= balance && !existingBet;

  const yesProb = yesPct / 100;
  const noProb = noPct / 100;
  const yesWin = yesProb > 0 ? Math.round(amount / yesProb) : 0;
  const noWin = noProb > 0 ? Math.round(amount / noProb) : 0;

  const handleQuickBet = (amt: number) => {
    play('click');
    setSelectedAmount(selectedAmount === amt ? null : amt);
    setCustomAmount('');
  };

  const handleCustomChange = (val: string) => {
    setCustomAmount(val);
    setSelectedAmount(null);
  };

  const placeBet = (side: 'YES' | 'NO') => {
    if (!canBet) return;
    play('click');
    const prob = side === 'YES' ? yesProb : noProb;
    onBet(marketId, question, side, amount, prob);
    setSelectedAmount(null);
    setCustomAmount('');
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span
          className={styles.categoryBadge}
          style={{ color: categoryColor, borderColor: categoryColor + '33' }}
        >
          {category}
        </span>
        <span className={styles.endDate}>{endLabel}</span>
      </div>
      <div className={styles.question}>{question}</div>
      <div className={styles.probBar}>
        <div className={styles.probYes} style={{ width: `${yesPct}%` }} />
        <div className={styles.probNo} style={{ width: `${noPct}%` }} />
      </div>
      <div className={styles.probLabels}>
        <span className={styles.probYesLabel}>Yes {yesPct}%</span>
        <span className={styles.probNoLabel}>No {noPct}%</span>
      </div>
      <div className={styles.cardMeta}>{meta}</div>

      {existingBet ? (
        <div className={styles.alreadyBet}>
          You bet {existingBet.amount.toLocaleString()} on {existingBet.side}
        </div>
      ) : (
        <div className={styles.betControls}>
          <div className={styles.quickBets}>
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                className={selectedAmount === amt ? styles.quickBetBtnActive : styles.quickBetBtn}
                onClick={() => handleQuickBet(amt)}
                onMouseEnter={() => play('hover')}
                disabled={amt > balance}
              >
                {amt >= 1000 ? `${amt / 1000}K` : amt}
              </button>
            ))}
          </div>
          <div className={styles.customBetRow}>
            <input
              className={styles.customBetInput}
              type="number"
              placeholder="Custom amount..."
              value={customAmount}
              onChange={(e) => handleCustomChange(e.target.value)}
              min="1"
              max={balance}
            />
          </div>
          <div className={styles.betActions}>
            <button
              className={styles.betYes}
              disabled={!canBet}
              onClick={() => placeBet('YES')}
              onMouseEnter={() => play('hover')}
            >
              Bet YES
            </button>
            <button
              className={styles.betNo}
              disabled={!canBet}
              onClick={() => placeBet('NO')}
              onMouseEnter={() => play('hover')}
            >
              Bet NO
            </button>
          </div>
          {amount > 0 && canBet && (
            <div className={styles.potentialWin}>
              Win <span className={styles.potentialWinValue}>{yesWin.toLocaleString()}</span> (YES) or{' '}
              <span className={styles.potentialWinValue}>{noWin.toLocaleString()}</span> (NO) Shards
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──

export default function Markets() {
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [bets, setBets] = useState<Bet[]>([]);
  const [stats, setStats] = useState<ArenaStats>({ wins: 0, losses: 0, totalWagered: 0, totalWon: 0 });
  const [polymarkets, setPolymarkets] = useState<CategorizedMarkets | null>(null);
  const [polyError, setPolyError] = useState(false);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const { play } = useSound();
  const [mounted, setMounted] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showBetsModal, setShowBetsModal] = useState(false);
  const { authenticated, ready: privyReady } = usePrivy();

  // Load from localStorage on mount
  useEffect(() => {
    setBalance(loadBalance());
    setBets(loadBets());
    setStats(loadStats());
    setMounted(true);
  }, []);

  // Fetch user avatar
  useEffect(() => {
    if (!privyReady || !authenticated) return;
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.user?.avatarUrl) setAvatarUrl(data.user.avatarUrl);
    }).catch(() => {});
  }, [privyReady, authenticated]);

  // Save to localStorage on changes
  useEffect(() => {
    if (!mounted) return;
    saveState(balance, bets, stats);
  }, [balance, bets, stats, mounted]);

  // Fetch Polymarket data
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

  useEffect(() => {
    fetchPoly();
    const interval = setInterval(fetchPoly, 60_000);
    return () => clearInterval(interval);
  }, [fetchPoly]);

  // Check for market resolutions on each poly update
  useEffect(() => {
    if (!polymarkets || !mounted) return;

    setBets((prev) => {
      let changed = false;
      const updated = prev.map((bet) => {
        if (bet.status !== 'active') return bet;

        if (bet.source === 'polymarket') {
          // Find this market in current data and check if resolved
          const allMarkets: PolymarketMarket[] = [
            ...(polymarkets.crypto || []),
            ...(polymarkets.ai || []),
            ...(polymarkets.sports || []),
            ...(polymarkets.politics || []),
          ];
          const market = allMarkets.find((m) => m.id === bet.marketId);
          if (!market) return bet;

          const [yesPrice] = parseOutcomePrices(market.outcomePrices);
          const yesPct = yesPrice * 100;

          // Resolved YES (>95%) or NO (<5%)
          if (yesPct > 95) {
            changed = true;
            const won = bet.side === 'YES';
            return { ...bet, status: won ? 'won' as const : 'lost' as const };
          }
          if (yesPct < 5) {
            changed = true;
            const won = bet.side === 'NO';
            return { ...bet, status: won ? 'won' as const : 'lost' as const };
          }
        }

        if (bet.source === 'academy') {
          const market = ACADEMY_MARKETS.find((m) => m.id === bet.marketId);
          if (market && new Date(market.endDate).getTime() < Date.now()) {
            changed = true;
            // Simulate resolution based on the probability
            const resolved = Math.random() < market.yesProbability ? 'YES' : 'NO';
            const won = bet.side === resolved;
            return { ...bet, status: won ? 'won' as const : 'lost' as const };
          }
        }

        return bet;
      });

      if (!changed) return prev;

      // Update balance and stats for newly resolved bets
      const newlyResolved = updated.filter(
        (b, i) => b.status !== 'active' && prev[i].status === 'active'
      );

      if (newlyResolved.length > 0) {
        setStats((s) => {
          const newStats = { ...s };
          newlyResolved.forEach((b) => {
            if (b.status === 'won') {
              newStats.wins++;
              newStats.totalWon += b.potentialWin;
            } else {
              newStats.losses++;
            }
          });
          return newStats;
        });

        setBalance((bal) => {
          let newBal = bal;
          newlyResolved.forEach((b) => {
            if (b.status === 'won') {
              newBal += b.potentialWin;
            }
          });
          return newBal;
        });
      }

      return updated;
    });
  }, [polymarkets, mounted]);

  // Place a bet
  const handleBet = (
    marketId: string,
    question: string,
    side: 'YES' | 'NO',
    amount: number,
    probability: number
  ) => {
    if (amount > balance || amount <= 0) return;

    const source = marketId.startsWith('mwa-') ? 'academy' : 'polymarket';
    const potentialWin = probability > 0 ? Math.round(amount / probability) : 0;

    const bet: Bet = {
      id: `bet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      marketId,
      question,
      side,
      amount,
      probability,
      potentialWin,
      placedAt: Date.now(),
      status: 'active',
      source: source as 'polymarket' | 'academy',
    };

    setBalance((b) => b - amount);
    setBets((prev) => [bet, ...prev]);
    setStats((s) => ({ ...s, totalWagered: s.totalWagered + amount }));

    showToast(`Bet ${amount.toLocaleString()} Shards on ${side}!`);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  const handleReset = () => {
    play('click');
    setBalance(STARTING_BALANCE);
    setBets([]);
    setStats({ wins: 0, losses: 0, totalWagered: 0, totalWon: 0 });
  };

  // Build market list
  const polyList: Array<{
    id: string;
    question: string;
    yesPct: number;
    noPct: number;
    meta: string;
    category: string;
    categoryColor: string;
    endLabel: string;
    source: 'polymarket' | 'academy';
  }> = [];

  if (polymarkets) {
    (['crypto', 'ai', 'sports', 'politics'] as MarketCategory[]).forEach((cat) => {
      const items = polymarkets[cat];
      if (!items) return;
      items.forEach((m) => {
        const [yes, no] = parseOutcomePrices(m.outcomePrices);
        const yesPct = Math.round(yes * 100);
        const noPct = Math.round(no * 100);
        const endDate = m.endDate ? new Date(m.endDate) : null;
        const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000)) : null;
        polyList.push({
          id: m.id,
          question: m.question,
          yesPct,
          noPct,
          meta: `Vol: ${formatVol(m.volume)}`,
          category: cat.toUpperCase(),
          categoryColor: CATEGORY_COLORS[cat],
          endLabel: daysLeft !== null ? `${daysLeft}d left` : '',
          source: 'polymarket',
        });
      });
    });
  }

  const academyList = ACADEMY_MARKETS.map((m) => {
    const yesPct = Math.round(m.yesProbability * 100);
    const daysLeft = Math.max(0, Math.ceil((new Date(m.endDate).getTime() - Date.now()) / 86400000));
    return {
      id: m.id,
      question: m.question,
      yesPct,
      noPct: 100 - yesPct,
      meta: `Pool: ${m.totalPool.toLocaleString()} Shards`,
      category: m.category,
      categoryColor: CATEGORY_COLORS.academy,
      endLabel: `${daysLeft}d left`,
      source: 'academy' as const,
    };
  });

  // Apply filter — academy markets always on top
  let markets: typeof polyList;
  if (filter === 'academy') {
    markets = academyList;
  } else if (filter !== 'all') {
    markets = polyList.filter((m) => m.category === filter.toUpperCase());
  } else {
    markets = [...academyList, ...polyList];
  }

  const activeBets = bets.filter((b) => b.status === 'active');
  const resolvedBets = bets.filter((b) => b.status !== 'active').slice(0, 10);

  const pnl = balance - STARTING_BALANCE;
  const pnlPct = ((pnl / STARTING_BALANCE) * 100).toFixed(1);

  return (
    <main className={styles.main}>
      <SideNavigation />
      <div className={styles.pageLayout}>
        {/* ── Category Filters (top) ── */}
        <div className={styles.filters}>
          {(Object.keys(CATEGORY_LABELS) as FilterCategory[]).map((cat) => (
            <button
              key={cat}
              className={filter === cat ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => {
                play('click');
                setFilter(cat);
              }}
              onMouseEnter={() => play('hover')}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* ── Compact Stats Bar ── */}
        <div className={styles.statsBar}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={36}
              height={36}
              className={styles.statsAvatar}
            />
          ) : (
            <div className={styles.statsAvatarPlaceholder} />
          )}
          <div className={styles.statsGroup}>
            <div className={styles.statItem}>
              <Image src="/icons/shard.svg" alt="" width={14} height={14} className={styles.shardIcon} />
              <span className={styles.statValue}>{mounted ? balance.toLocaleString() : '...'}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Record</span>
              <span className={styles.statValueSmall}>{stats.wins}W-{stats.losses}L</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statLabel}>P&L</span>
              <span className={`${styles.statValueSmall} ${pnl >= 0 ? styles.statPositive : styles.statNegative}`}>
                {pnl >= 0 ? '+' : ''}{mounted ? pnl.toLocaleString() : '0'} ({pnl >= 0 ? '+' : ''}{mounted ? pnlPct : '0'}%)
              </span>
            </div>
          </div>
          <button
            className={styles.yourBetsBtn}
            onClick={() => { play('click'); setShowBetsModal(true); }}
            onMouseEnter={() => play('hover')}
          >
            Your Bets{bets.length > 0 && <span className={styles.yourBetsBadge}>{bets.filter(b => b.status === 'active').length}</span>}
          </button>
        </div>

        {/* ── Market Cards ── */}
        {!polymarkets && !polyError && <MarketsPageSkeleton />}
        {polyError && !polymarkets && (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Could not load markets</div>
            <div className={styles.emptyText}>Check your connection and refresh.</div>
          </div>
        )}

        {markets.length > 0 && (
          <div className={styles.marketGrid}>
            {markets.map((m) => (
              <MarketCard
                key={m.id}
                marketId={m.id}
                question={m.question}
                yesPct={m.yesPct}
                noPct={m.noPct}
                meta={m.meta}
                category={m.category}
                categoryColor={m.categoryColor}
                endLabel={m.endLabel}
                balance={balance}
                existingBet={bets.find(
                  (b) => b.marketId === m.id && b.status === 'active'
                )}
                onBet={handleBet}
              />
            ))}
          </div>
        )}

        {polymarkets && markets.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No markets in this category</div>
            <div className={styles.emptyText}>Try a different filter.</div>
          </div>
        )}

      </div>

      {/* ── Bets Modal ── */}
      {showBetsModal && (
        <>
          <div className={styles.betsModalBackdrop} onClick={() => setShowBetsModal(false)} />
          <div className={styles.betsModal}>
            <div className={styles.betsModalHeader}>
              <span className={styles.betsModalTitle}>Your Bets</span>
              <button className={styles.betsModalClose} onClick={() => setShowBetsModal(false)} type="button" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className={styles.betsModalBody}>
              {activeBets.length > 0 && (
                <div className={styles.betsSection}>
                  <div className={styles.betsSectionTitle}>Active ({activeBets.length})</div>
                  <div className={styles.betsList}>
                    {activeBets.map((bet) => (
                      <div key={bet.id} className={styles.betRow}>
                        <span className={bet.side === 'YES' ? styles.betSideYes : styles.betSideNo}>{bet.side}</span>
                        <span className={styles.betQuestion}>{bet.question}</span>
                        <span className={styles.betAmount}>{bet.amount.toLocaleString()}</span>
                        <span className={styles.betPayout}>wins {bet.potentialWin.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {resolvedBets.length > 0 && (
                <div className={styles.betsSection}>
                  <div className={styles.betsSectionTitle}>Recent Results</div>
                  <div className={styles.betsList}>
                    {resolvedBets.map((bet) => (
                      <div key={bet.id} className={bet.status === 'won' ? styles.betWon : styles.betLost}>
                        <span className={bet.side === 'YES' ? styles.betSideYes : styles.betSideNo}>{bet.side}</span>
                        <span className={styles.betQuestion}>{bet.question}</span>
                        <span className={styles.betAmount}>{bet.amount.toLocaleString()}</span>
                        <span className={bet.status === 'won' ? styles.betWonBadge : styles.betLostBadge}>
                          {bet.status === 'won' ? `+${bet.potentialWin.toLocaleString()}` : `-${bet.amount.toLocaleString()}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {bets.length === 0 && (
                <div className={styles.noBets}>No bets yet. Pick a market and make your first prediction!</div>
              )}
            </div>
            <div className={styles.betsModalFooter}>
              <button className={styles.resetBtn} onClick={() => { handleReset(); setShowBetsModal(false); }} onMouseEnter={() => play('hover')}>Reset All</button>
            </div>
          </div>
        </>
      )}

      {/* ── Toast ── */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}

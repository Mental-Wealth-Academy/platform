'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { SealCheck, CircleNotch, Gavel } from '@phosphor-icons/react';
import { useSound } from '@/hooks/useSound';
import styles from './VerifierBadges.module.css';

// Mirrors VerifierStats from lib/verifier-prestige-db (kept in-file so this stays
// a lean client bundle — no server-lib import).
interface PrestigeCredential {
  subject: string;
  maxLevel: number;
  earnedVia: string;
}

interface VerifierStats {
  panelsServed: number;
  votesCast: number;
  resolvedVotes: number;
  upheldVotes: number;
  upheldRate: number;
  credentials: PrestigeCredential[];
}

/** Tier names by credential level: Reader → Verifier → Arbiter at 1 / 2 / 3+. */
function tierName(level: number): string {
  if (level >= 3) return 'Arbiter';
  if (level === 2) return 'Verifier';
  return 'Reader';
}

/** Roman numeral for the level ring (level 0 shows as the entry tier "0"). */
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
function roman(level: number): string {
  return ROMAN[level] ?? String(level);
}

/**
 * Prestige badges for the signed-in verifier: per-subject credential chips (a
 * Space Grotesk level ring + tier name), a panels-served count, and an
 * upheld-rate meter. Self-fetching from /api/guides/verifier-test/stats; renders
 * nothing intrusive when the member holds no credentials and has served no panels.
 *
 * Sits above the existing VerifierCredentials "become a verifier" flow on the
 * profile page.
 */
export default function VerifierBadges() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { play } = useSound();

  const [stats, setStats] = useState<VerifierStats | null>(null);
  const [loading, setLoading] = useState(true);

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const token = await getAccessToken().catch(() => null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/guides/verifier-test/stats', {
        cache: 'no-store',
        headers: await authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats as VerifierStats);
      }
    } catch {
      /* non-fatal — the section below still renders the join flow */
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (ready && authenticated) loadStats();
    else setLoading(false);
  }, [ready, authenticated, loadStats]);

  if (loading) {
    return (
      <div className={styles.state}>
        <CircleNotch size={16} className={styles.spinner} />
        <span>Loading your standing…</span>
      </div>
    );
  }

  const hasStanding =
    !!stats && (stats.credentials.length > 0 || stats.panelsServed > 0);

  if (!hasStanding) {
    // Nothing earned yet — stay quiet; the join flow below is the call to action.
    return null;
  }

  const upheldPct = Math.round(stats!.upheldRate * 100);

  return (
    <div className={styles.wrapper} aria-label="Verifier prestige">
      <header className={styles.header}>
        <SealCheck size={18} weight="fill" className={styles.headerIcon} />
        <h3 className={styles.title}>Verifier prestige</h3>
      </header>

      {/* ── Per-subject credential chips ── */}
      {stats!.credentials.length > 0 && (
        <ul className={styles.chips}>
          {stats!.credentials.map((c) => (
            <li
              key={c.subject}
              className={styles.chip}
              onClick={() => play('click')}
              onMouseEnter={() => play('soft-hover')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  play('click');
                }
              }}
            >
              <span className={styles.ring} aria-hidden="true">
                {roman(c.maxLevel)}
              </span>
              <span className={styles.chipBody}>
                <span className={styles.chipSubject}>{c.subject}</span>
                <span className={styles.chipTier}>{tierName(c.maxLevel)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ── Panels served + upheld-rate meter ── */}
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricValue}>
            <Gavel size={14} weight="fill" className={styles.metricIcon} />
            {stats!.panelsServed}
          </span>
          <span className={styles.metricLabel}>
            {stats!.panelsServed === 1 ? 'Panel served' : 'Panels served'}
          </span>
        </div>

        <div className={styles.meterBlock}>
          <div className={styles.meterHead}>
            <span className={styles.metricLabel}>Upheld rate</span>
            <span className={styles.meterPct}>
              {stats!.resolvedVotes > 0 ? `${upheldPct}%` : '—'}
            </span>
          </div>
          <div
            className={styles.meter}
            role="meter"
            aria-valuenow={upheldPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Upheld rate"
          >
            <span
              className={styles.meterFill}
              style={{ width: `${stats!.resolvedVotes > 0 ? upheldPct : 0}%` }}
            />
          </div>
          <span className={styles.meterNote}>
            {stats!.upheldVotes}/{stats!.resolvedVotes} resolved votes upheld
          </span>
        </div>
      </div>
    </div>
  );
}

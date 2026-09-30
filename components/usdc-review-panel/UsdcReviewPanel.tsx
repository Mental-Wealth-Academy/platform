'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { CheckCircle, XCircle, ArrowsClockwise, Coins } from '@phosphor-icons/react';
import styles from './UsdcReviewPanel.module.css';

interface ReviewClaim {
  id: string;
  status: 'pending' | 'approved';
  txHash: string | null;
  questId: string;
  questTitle: string;
  recipientWallet: string;
  usdcAmount: number;
  username: string | null;
  createdAt: string;
}

interface ProofSubmission {
  id: string;
  questId: string;
  questTitle: string;
  shards: number;
  proofText: string | null;
  proofUrl: string | null;
  username: string | null;
  createdAt: string;
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url);
}

interface UsdcReviewPanelProps {
  fetchWithAuth: (url: string, init?: RequestInit) => Promise<Response>;
}

function truncate(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';
}

export default function UsdcReviewPanel({ fetchWithAuth }: UsdcReviewPanelProps) {
  const [claims, setClaims] = useState<ReviewClaim[]>([]);
  const [proofs, setProofs] = useState<ProofSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usdcRes, proofRes] = await Promise.all([
        fetchWithAuth('/api/quests/usdc/review'),
        fetchWithAuth('/api/quests/proof/review'),
      ]);
      if (usdcRes.ok) {
        const data = await usdcRes.json();
        setClaims(data.claims ?? []);
      } else {
        setClaims([]);
      }
      if (proofRes.ok) {
        const data = await proofRes.json();
        setProofs(data.submissions ?? []);
      } else {
        setProofs([]);
      }
    } catch {
      setClaims([]);
      setProofs([]);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = useCallback(
    async (claim: ReviewClaim, action: 'approve' | 'reject') => {
      if (busyId) return;
      let note: string | null = null;
      if (action === 'reject') {
        note = window.prompt('Optional note for the member (why this was not approved):') || null;
      } else if (
        !window.confirm(
          claim.status === 'approved'
            ? `Check the payout confirmation for ${truncate(claim.recipientWallet)}?`
            : `Approve and send $${claim.usdcAmount} USDC to ${truncate(claim.recipientWallet)}? This moves real funds from Blue's wallet.`,
        )
      ) {
        return;
      }

      setBusyId(claim.id);
      try {
        const res = await fetchWithAuth('/api/quests/usdc/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimId: claim.id, action, note }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setClaims((prev) => prev.filter((c) => c.id !== claim.id));
        } else {
          window.alert(data.error || 'Could not complete the review. Please try again.');
          if (res.status === 409) void load();
        }
      } catch {
        window.alert('Could not complete the review. Please try again.');
      } finally {
        setBusyId(null);
      }
    },
    [busyId, fetchWithAuth, load],
  );

  const reviewProof = useCallback(
    async (submission: ProofSubmission, action: 'approve' | 'reject') => {
      if (busyId) return;
      let note: string | null = null;
      if (action === 'reject') {
        note = window.prompt('Optional note for the member (why this was not approved):') || null;
      } else if (
        !window.confirm(
          `Approve "${submission.questTitle}" and release ${submission.shards} diamonds to ${submission.username ? `@${submission.username}` : 'this member'}?`,
        )
      ) {
        return;
      }

      setBusyId(submission.id);
      try {
        const res = await fetchWithAuth('/api/quests/proof/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId: submission.id, action, note }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setProofs((prev) => prev.filter((s) => s.id !== submission.id));
        } else {
          window.alert(data.error || 'Could not complete the review. Please try again.');
          if (res.status === 409) void load();
        }
      } catch {
        window.alert('Could not complete the review. Please try again.');
      } finally {
        setBusyId(null);
      }
    },
    [busyId, fetchWithAuth, load],
  );

  const total = claims.length + proofs.length;

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <span className={styles.headIcon} aria-hidden="true">
            <Coins size={15} weight="fill" />
          </span>
          <span className={styles.title}>Quests to review</span>
          {!loading && total > 0 && <span className={styles.count}>{total}</span>}
        </div>
        <button
          type="button"
          className={`${styles.refresh} ${loading ? styles.refreshSpin : ''}`}
          onClick={() => void load()}
          aria-label="Refresh"
          disabled={loading}
        >
          <ArrowsClockwise size={13} weight="bold" />
        </button>
      </div>

      {loading ? (
        <div className={styles.skeletonList}>
          <span className={styles.skeletonRow} />
          <span className={styles.skeletonRow} />
        </div>
      ) : total === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyMark} aria-hidden="true">
            <CheckCircle size={20} weight="fill" />
          </span>
          <span className={styles.emptyTitle}>All caught up</span>
          <span className={styles.emptyText}>Nothing is waiting for review.</span>
        </div>
      ) : (
        <ul className={styles.list}>
          {proofs.map((submission) => (
            <li key={submission.id} className={`${styles.row} ${styles.rowProof}`}>
              <div className={styles.rowHead}>
                <div className={styles.rowInfo}>
                  <span className={styles.rowTitle}>{submission.questTitle}</span>
                  <span className={styles.rowMeta}>
                    {submission.username ? `@${submission.username}` : 'Member'}
                  </span>
                </div>
                <span className={styles.rowAmount}>
                  <Image src="/icons/ui-diamond.svg" alt="" width={13} height={13} />
                  {submission.shards}
                </span>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.reject}
                    onClick={() => reviewProof(submission, 'reject')}
                    disabled={busyId === submission.id}
                    aria-label="Reject submission"
                    title="Reject"
                  >
                    <XCircle size={16} weight="fill" />
                  </button>
                  <button
                    type="button"
                    className={styles.approve}
                    onClick={() => reviewProof(submission, 'approve')}
                    disabled={busyId === submission.id}
                  >
                    <CheckCircle size={15} weight="fill" />
                    {busyId === submission.id ? 'Saving…' : 'Approve'}
                  </button>
                </div>
              </div>
              {submission.proofText && (
                <p className={styles.proofText}>{submission.proofText}</p>
              )}
              {submission.proofUrl && (
                <a
                  href={submission.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.proofAttachment}
                >
                  {isImageUrl(submission.proofUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={submission.proofUrl} alt="Proof attachment" className={styles.proofThumb} />
                  ) : (
                    <span className={styles.proofLink}>View attachment</span>
                  )}
                </a>
              )}
            </li>
          ))}
          {claims.map((claim) => {
            const isReconciling = claim.status === 'approved';
            return (
            <li key={claim.id} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowTitle}>{claim.questTitle}</span>
                <span className={styles.rowMeta}>
                  {claim.username ? `@${claim.username}` : 'Member'} · {truncate(claim.recipientWallet)}
                  {isReconciling ? ' · Awaiting payout confirmation' : ''}
                </span>
              </div>
              <span className={styles.rowAmount}>${claim.usdcAmount}</span>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.reject}
                  onClick={() => review(claim, 'reject')}
                  disabled={busyId === claim.id || isReconciling}
                  aria-label="Reject claim"
                  title="Reject"
                >
                  <XCircle size={16} weight="fill" />
                </button>
                <button
                  type="button"
                  className={styles.approve}
                  onClick={() => review(claim, 'approve')}
                  disabled={busyId === claim.id}
                >
                  <CheckCircle size={15} weight="fill" />
                  {busyId === claim.id
                    ? (isReconciling ? 'Checking…' : 'Sending…')
                    : (isReconciling ? 'Check payout' : 'Approve & pay')}
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

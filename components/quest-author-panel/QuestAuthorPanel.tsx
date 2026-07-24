'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash, ArrowRight, Check, X } from '@phosphor-icons/react';
import styles from './QuestAuthorPanel.module.css';

interface AuthoredQuest {
  id: string;
  title: string;
  description: string;
  points: number;
  questType: string;
  targetCount: number;
  assigneeWallet: string | null;
  expiresAt: string | null;
  createdAt: string;
  rewardKind?: 'credits' | 'usdc';
  rewardAmount?: number;
  escrowStatus?: string;
}

interface PendingClaim {
  id: string;
  status: 'pending' | 'approved';
  txHash: string | null;
  questId: string;
  questTitle: string;
  recipientWallet: string | null;
  usdcAmount: number;
  rewardKind: 'usdc' | 'credits';
  proofText: string | null;
  proofUrl: string | null;
  username: string | null;
  createdAt: string;
  escrowRemaining: number | null;
}

interface QuestAuthorPanelProps {
  authoredQuests: AuthoredQuest[];
  fetchWithAuth: (url: string, init?: RequestInit) => Promise<Response>;
  onCreated: () => void;
  onDelete: (id: string) => void;
}

const QuestAuthorPanel: React.FC<QuestAuthorPanelProps> = ({
  authoredQuests,
  fetchWithAuth,
  onCreated,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(50);
  const [targetCount, setTargetCount] = useState(1);
  const [questType, setQuestType] = useState<'no-proof' | 'proof-required'>('no-proof');
  const [assigneeWallet, setAssigneeWallet] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [reviewingClaimId, setReviewingClaimId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const loadClaims = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/quests/usdc/creator-review');
      if (res.ok) {
        const data = await res.json();
        setPendingClaims(data.claims ?? []);
      }
    } catch {
      // silent — the approvals list just won't show
    }
  }, [fetchWithAuth]);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  const reviewClaim = async (claimId: string, action: 'approve' | 'reject') => {
    setReviewingClaimId(claimId);
    setClaimError(null);
    try {
      const res = await fetchWithAuth('/api/quests/usdc/creator-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClaimError(data.error || 'Could not process that claim.');
        return;
      }
      await loadClaims();
      onCreated();
    } catch {
      setClaimError('Network error processing the claim.');
    } finally {
      setReviewingClaimId(null);
    }
  };

  const reset = () => {
    setTitle('');
    setDescription('');
    setPoints(50);
    setTargetCount(1);
    setQuestType('no-proof');
    setAssigneeWallet('');
    setExpiresAt('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    if (assigneeWallet && !/^0x[a-fA-F0-9]{40}$/.test(assigneeWallet.trim())) {
      setError('Assignee wallet must be a valid 0x address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/quests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          points,
          targetCount,
          questType,
          assigneeWallet: assigneeWallet.trim() || undefined,
          expiresAt: expiresAt || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create quest.');
        setSubmitting(false);
        return;
      }

      reset();
      onCreated();
    } catch {
      setError('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.panel}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formHeader}>
          <h3 className={styles.formTitle}>Create a quest</h3>
          <p className={styles.formSubtitle}>
            Publish to everyone or assign to a wallet. The credits are held in escrow and paid out as people complete it. For USDC-funded quests, ask Blue in chat to forge one.
          </p>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Title</span>
          <input
            className={styles.input}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Share your first reflection"
            maxLength={80}
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Description</span>
          <textarea
            className={styles.textarea}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what the user should do to complete this quest."
            maxLength={600}
            required
          />
        </label>

        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>Type</span>
            <select
              className={styles.input}
              value={questType}
              onChange={(e) => setQuestType(e.target.value as 'no-proof' | 'proof-required')}
            >
              <option value="no-proof">Mission (no proof)</option>
              <option value="proof-required">Submit (proof required)</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Credits</span>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={1000}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              required
            />
          </label>
        </div>

        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>Target count</span>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={50}
              value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value))}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Expires at <span className={styles.optional}>(optional)</span></span>
            <input
              className={styles.input}
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>
            Assignee wallet <span className={styles.optional}>(optional — leave blank to publish globally)</span>
          </span>
          <input
            className={styles.input}
            type="text"
            value={assigneeWallet}
            onChange={(e) => setAssigneeWallet(e.target.value)}
            placeholder="0x…"
          />
        </label>

        {error && <p className={styles.errorText}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryBtn} onClick={reset} disabled={submitting}>
            Reset
          </button>
          <button type="submit" className={styles.primaryBtn} disabled={submitting}>
            {submitting ? 'Publishing…' : 'Publish quest'}
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </form>

      {pendingClaims.length > 0 && (
        <div className={styles.list}>
          <div className={styles.listHeader}>
            <h4 className={styles.listTitle}>Completions to approve</h4>
            <span className={styles.listMeta}>{pendingClaims.length}</span>
          </div>
          {claimError && <p className={styles.errorText}>{claimError}</p>}
          <ul className={styles.listItems}>
            {pendingClaims.map((claim) => {
              const isUsdc = claim.rewardKind !== 'credits';
              const isReconciling = claim.status === 'approved';
              const rewardLabel = isUsdc
                ? `$${claim.usdcAmount} USDC`
                : `${claim.usdcAmount} credits`;
              const escrowLabel = claim.escrowRemaining != null
                ? (isUsdc ? `$${claim.escrowRemaining} left` : `${claim.escrowRemaining} left`)
                : null;
              const who = claim.username
                ? `@${claim.username}`
                : claim.recipientWallet
                  ? `${claim.recipientWallet.slice(0, 6)}…${claim.recipientWallet.slice(-4)}`
                  : 'Member';
              return (
              <li key={claim.id} className={styles.listItem}>
                <div className={styles.itemBody}>
                  <span className={styles.itemTitle}>{claim.questTitle}</span>
                  <span className={styles.itemMetaRow}>
                    <span className={styles.itemMetaChip}>{rewardLabel}</span>
                    <span className={styles.itemMetaChip}>{who}</span>
                    {escrowLabel && (
                      <span className={styles.itemMetaChip}>{escrowLabel}</span>
                    )}
                    {isReconciling && (
                      <span className={styles.itemMetaChip}>Awaiting payout confirmation</span>
                    )}
                  </span>
                  {claim.proofText && (
                    <p className={styles.itemProof}>{claim.proofText}</p>
                  )}
                  {claim.proofUrl && (
                    <a
                      href={claim.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.itemProofLink}
                    >
                      View attachment
                    </a>
                  )}
                </div>
                <div className={styles.claimActions}>
                  <button
                    type="button"
                    className={styles.claimApprove}
                    onClick={() => reviewClaim(claim.id, 'approve')}
                    disabled={reviewingClaimId === claim.id}
                    aria-label={isReconciling ? `Reconcile payout for ${claim.questTitle}` : `Approve and pay ${claim.questTitle}`}
                  >
                    <Check size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    className={styles.claimReject}
                    onClick={() => reviewClaim(claim.id, 'reject')}
                    disabled={reviewingClaimId === claim.id || isReconciling}
                    aria-label={`Reject ${claim.questTitle}`}
                  >
                    <X size={14} weight="bold" />
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className={styles.list}>
        <div className={styles.listHeader}>
          <h4 className={styles.listTitle}>Your published quests</h4>
          <span className={styles.listMeta}>{authoredQuests.length}</span>
        </div>

        {authoredQuests.length === 0 ? (
          <p className={styles.emptyList}>You haven&apos;t published any quests yet.</p>
        ) : (
          <ul className={styles.listItems}>
            {authoredQuests.map((q) => {
              const expired = q.expiresAt ? new Date(q.expiresAt).getTime() < Date.now() : false;
              return (
                <li key={q.id} className={styles.listItem}>
                  <div className={styles.itemBody}>
                    <span className={styles.itemTitle}>{q.title}</span>
                    <span className={styles.itemMetaRow}>
                      <span className={styles.itemMetaChip}>
                        {q.rewardKind === 'usdc'
                          ? `$${q.rewardAmount ?? 0} USDC`
                          : `${q.rewardAmount ?? q.points} credits`}
                      </span>
                      {q.escrowStatus === 'pending_funding' && (
                        <span className={styles.itemExpired}>Awaiting funding</span>
                      )}
                      <span className={styles.itemMetaChip}>{q.questType === 'no-proof' ? 'Mission' : 'Submit'}</span>
                      {q.targetCount > 1 && (
                        <span className={styles.itemMetaChip}>×{q.targetCount}</span>
                      )}
                      {q.assigneeWallet ? (
                        <span className={styles.itemMetaChip}>
                          {q.assigneeWallet.slice(0, 6)}…{q.assigneeWallet.slice(-4)}
                        </span>
                      ) : (
                        <span className={styles.itemMetaChip}>Global</span>
                      )}
                      {expired && <span className={styles.itemExpired}>Expired</span>}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.itemDelete}
                    onClick={() => onDelete(q.id)}
                    aria-label={`Delete ${q.title}`}
                  >
                    <Trash size={14} weight="bold" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default QuestAuthorPanel;

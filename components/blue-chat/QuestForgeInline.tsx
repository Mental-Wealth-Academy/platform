'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from './QuestForgeInline.module.css';
import { FORGE_LIMITS, type QuestForgeType, type RewardKind } from '@/lib/quest-forge';

export interface QuestForgeDraft {
  title: string;
  description: string;
  questType: QuestForgeType;
  rewardKind: RewardKind;
  rewardAmount: number;
  targetCount: number;
}

export interface QuestForgeRequest {
  title: string;
  description: string;
  questType: QuestForgeType;
  rewardKind: RewardKind;
  rewardAmount: number;
  targetCount: number;
  assigneeWallet?: string;
  expiresAt?: string;
}

interface QuestForgeInlineProps {
  isBusy: boolean;
  /** Blue's drafted fields. Re-applied whenever draftNonce changes. */
  draft: QuestForgeDraft | null;
  draftNonce: number;
  /** Creator's current credit balance, for the escrow affordability hint. */
  creditBalance: number | null;
  onSubmit: (request: QuestForgeRequest) => void;
  onClose: () => void;
}

const QuestForgeInline: React.FC<QuestForgeInlineProps> = ({
  isBusy,
  draft,
  draftNonce,
  creditBalance,
  onSubmit,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questType, setQuestType] = useState<QuestForgeType>('no-proof');
  const [rewardKind, setRewardKind] = useState<RewardKind>('credits');
  const [rewardAmount, setRewardAmount] = useState<number>(50);
  const [targetCount, setTargetCount] = useState<number>(1);
  const [assigneeWallet, setAssigneeWallet] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Apply Blue's draft whenever she produces a fresh one.
  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title);
    setDescription(draft.description);
    setQuestType(draft.questType);
    setRewardKind(draft.rewardKind);
    setRewardAmount(draft.rewardAmount);
    setTargetCount(draft.targetCount);
    setError(null);
    setIsMinimized(false);
  }, [draft, draftNonce]);

  const escrowTotal = useMemo(() => {
    const total = rewardAmount * targetCount;
    return rewardKind === 'usdc' ? Math.round(total * 100) / 100 : Math.round(total);
  }, [rewardAmount, targetCount, rewardKind]);

  const switchRewardKind = (kind: RewardKind) => {
    if (kind === rewardKind) return;
    setRewardKind(kind);
    // Snap the amount into the new kind's sensible default range.
    setRewardAmount(kind === 'usdc' ? 1 : 50);
    setError(null);
  };

  const submit = () => {
    setError(null);
    if (!title.trim() || !description.trim()) {
      setError('Give the quest a title and a description.');
      return;
    }
    if (rewardKind === 'credits' && (rewardAmount < FORGE_LIMITS.creditsMin || rewardAmount > FORGE_LIMITS.creditsMax)) {
      setError(`Credit reward must be between ${FORGE_LIMITS.creditsMin} and ${FORGE_LIMITS.creditsMax}.`);
      return;
    }
    if (rewardKind === 'usdc' && (rewardAmount < FORGE_LIMITS.usdcMin || rewardAmount > FORGE_LIMITS.usdcMax)) {
      setError(`USDC reward must be between $${FORGE_LIMITS.usdcMin} and $${FORGE_LIMITS.usdcMax} per completion.`);
      return;
    }
    if (rewardKind === 'usdc' && escrowTotal > FORGE_LIMITS.usdcEscrowTotalMax) {
      setError(`Total USDC escrow ($${escrowTotal}) is over the $${FORGE_LIMITS.usdcEscrowTotalMax} limit.`);
      return;
    }
    if (assigneeWallet && !/^0x[a-fA-F0-9]{40}$/.test(assigneeWallet.trim())) {
      setError('Assignee wallet must be a valid 0x address.');
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      questType,
      rewardKind,
      rewardAmount,
      targetCount,
      assigneeWallet: assigneeWallet.trim() || undefined,
      expiresAt: expiresAt || undefined,
    });
  };

  const creditsShort =
    rewardKind === 'credits' && creditBalance != null && escrowTotal > creditBalance;

  if (isMinimized) {
    return (
      <div className={styles.minimizedChip}>
        <span className={styles.title}>Quest forge</span>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setIsMinimized(false)}
          aria-label="Expand quest forge"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.titleBar}>
        <span className={styles.title}>Quest forge</span>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setIsMinimized(true)}
          aria-label="Minimize quest forge"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>
      <div className={styles.content}>
        <p className={styles.desc}>
          Tell me the quest in a sentence and I&apos;ll fill this in — or edit it yourself. You fund the reward up front and I hold it until a completer is paid.
        </p>

        <div className={styles.section}>
          <span className={styles.label}>Title</span>
          <input
            className={styles.input}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Share your first reflection"
            maxLength={FORGE_LIMITS.titleMax}
            disabled={isBusy}
          />
        </div>

        <div className={styles.section}>
          <span className={styles.label}>What to do</span>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain exactly what a completer should do."
            maxLength={FORGE_LIMITS.descMax}
            rows={3}
            disabled={isBusy}
          />
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Reward</span>
          <div className={styles.pills}>
            {([['credits', 'Diamonds'], ['usdc', 'USDC']] as Array<[RewardKind, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`${styles.pill} ${rewardKind === value ? styles.pillActive : ''}`}
                onClick={() => switchRewardKind(value)}
                disabled={isBusy}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.section}>
            <span className={styles.label}>
              {rewardKind === 'usdc' ? 'USDC each ($)' : 'Diamonds each'}
            </span>
            <input
              className={styles.input}
              type="number"
              min={rewardKind === 'usdc' ? FORGE_LIMITS.usdcMin : FORGE_LIMITS.creditsMin}
              max={rewardKind === 'usdc' ? FORGE_LIMITS.usdcMax : FORGE_LIMITS.creditsMax}
              step={rewardKind === 'usdc' ? 0.25 : 1}
              value={rewardAmount}
              onChange={(e) => setRewardAmount(Number(e.target.value))}
              disabled={isBusy}
            />
          </div>
          <div className={styles.section}>
            <span className={styles.label}>How many can complete</span>
            <input
              className={styles.input}
              type="number"
              min={FORGE_LIMITS.targetMin}
              max={FORGE_LIMITS.targetMax}
              step={1}
              value={targetCount}
              onChange={(e) => setTargetCount(Math.max(1, Math.round(Number(e.target.value))))}
              disabled={isBusy}
            />
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Completion</span>
          <div className={styles.pills}>
            {([['no-proof', 'No proof'], ['proof-required', 'Proof required']] as Array<[QuestForgeType, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`${styles.pill} ${questType === value ? styles.pillActive : ''}`}
                onClick={() => setQuestType(value)}
                disabled={isBusy}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.section}>
            <span className={styles.label}>Assign to wallet (optional)</span>
            <input
              className={styles.input}
              type="text"
              value={assigneeWallet}
              onChange={(e) => setAssigneeWallet(e.target.value)}
              placeholder="0x… — blank = everyone"
              disabled={isBusy}
            />
          </div>
          <div className={styles.section}>
            <span className={styles.label}>Expires (optional)</span>
            <input
              className={styles.input}
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={isBusy}
            />
          </div>
        </div>

        <div className={styles.escrowNote}>
          {rewardKind === 'usdc'
            ? `I'll hold $${escrowTotal} USDC in escrow — you send it from your wallet next.`
            : `I'll hold ${escrowTotal} diamonds in escrow${creditBalance != null ? ` (you have ${creditBalance.toLocaleString()})` : ''}.`}
        </div>

        {creditsShort && (
          <div className={styles.error}>
            Not enough diamonds — this quest needs {escrowTotal.toLocaleString()}.
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isBusy}>
          Close
        </button>
        <button
          type="button"
          className={styles.submitButton}
          onClick={submit}
          disabled={isBusy || !title.trim() || !description.trim() || (creditsShort ?? false)}
        >
          {rewardKind === 'usdc' ? 'Fund & forge' : 'Forge quest'}
        </button>
      </div>
    </div>
  );
};

export default QuestForgeInline;

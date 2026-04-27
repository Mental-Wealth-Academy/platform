'use client';

import React, { useState } from 'react';
import { Trash, ArrowRight } from '@phosphor-icons/react';
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
}

interface QuestAuthorPanelProps {
  authoredQuests: AuthoredQuest[];
  fetchWithAuth: (url: string, init?: RequestInit) => Promise<Response>;
  onCreated: () => void;
  onDelete: (id: string) => void;
}

const QuestAuthorPanel: React.FC<QuestAuthorPanelProps> = ({
  authoredQuests,
  fetchWithAuth: _fetchWithAuth,
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
            Publish to everyone or assign to a specific wallet.
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
            <span className={styles.label}>Shards</span>
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
                      <span className={styles.itemMetaChip}>{q.points} shards</span>
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

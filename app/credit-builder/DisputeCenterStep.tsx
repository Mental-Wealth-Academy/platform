'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { CreditDispute, DisputeTypeId, DisputeStatus } from '@/types/credit-builder';
import { DISPUTE_TYPES, BUREAU_INFO, getDisputeType } from '@/lib/credit-builder-domain';
import styles from './credit-builder.module.css';

interface DisputeWithDays extends CreditDispute {
  daysRemaining: number | null;
}

interface Props {
  initialDisputeType?: string;
  initialTargetEntity?: string;
}

export default function DisputeCenterStep({ initialDisputeType, initialTargetEntity }: Props) {
  const [disputes, setDisputes] = useState<DisputeWithDays[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showNewDispute, setShowNewDispute] = useState(!!initialDisputeType);
  const [selectedDispute, setSelectedDispute] = useState<DisputeWithDays | null>(null);

  // New dispute form
  const [disputeType, setDisputeType] = useState<DisputeTypeId>((initialDisputeType as DisputeTypeId) || 'basic_bureau');
  const [targetBureau, setTargetBureau] = useState('equifax');
  const [targetEntity, setTargetEntity] = useState(initialTargetEntity || '');
  const [accountRef, setAccountRef] = useState('');
  const [itemDetails, setItemDetails] = useState('');

  const fetchDisputes = useCallback(async () => {
    try {
      const res = await fetch('/api/credit-builder/disputes', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/credit-builder/disputes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disputeType, targetBureau, targetEntity, accountRef, itemDetails }),
      });
      if (res.ok) {
        setShowNewDispute(false);
        setTargetEntity('');
        setAccountRef('');
        setItemDetails('');
        await fetchDisputes();
      }
    } catch {} finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (disputeId: string, status: DisputeStatus, resolutionNote?: string) => {
    try {
      await fetch('/api/credit-builder/disputes', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disputeId, status, resolutionNote }),
      });
      await fetchDisputes();
      if (selectedDispute?.id === disputeId) {
        setSelectedDispute(null);
      }
    } catch {}
  };

  const statusLabel = (status: DisputeStatus) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'sent': return 'Sent';
      case 'pending_response': return 'Awaiting Response';
      case 'resolved_positive': return 'Resolved (Removed)';
      case 'resolved_negative': return 'Resolved (Denied)';
      case 'escalated': return 'Escalated';
      default: return status;
    }
  };

  const statusColor = (status: DisputeStatus) => {
    switch (status) {
      case 'draft': return '#888';
      case 'sent': return '#5168FF';
      case 'pending_response': return '#F5A623';
      case 'resolved_positive': return '#74C465';
      case 'resolved_negative': return '#E8556D';
      case 'escalated': return '#9724A6';
      default: return '#888';
    }
  };

  const disputeInfo = getDisputeType(disputeType);

  // Letter viewer
  if (selectedDispute) {
    const info = getDisputeType(selectedDispute.disputeType);
    return (
      <div className={styles.stepContainer}>
        <button type="button" className={styles.backLink} onClick={() => setSelectedDispute(null)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Disputes
        </button>

        <div className={styles.card}>
          <div className={styles.disputeDetailHeader}>
            <h3 className={styles.cardTitle}>{info?.label || selectedDispute.disputeType}</h3>
            <span className={styles.statusBadge} style={{ color: statusColor(selectedDispute.status) }}>
              {statusLabel(selectedDispute.status)}
            </span>
          </div>
          {selectedDispute.targetEntity && <p className={styles.cardHint}>To: {selectedDispute.targetEntity}</p>}
          {selectedDispute.daysRemaining !== null && selectedDispute.status === 'sent' && (
            <div className={styles.deadlineBar}>
              <span>{selectedDispute.daysRemaining > 0 ? `${selectedDispute.daysRemaining} days until response deadline` : 'Response deadline passed'}</span>
              {selectedDispute.daysRemaining <= 0 && (
                <span className={styles.overdue}>OVERDUE -- Consider escalating</span>
              )}
            </div>
          )}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Letter Content</h3>
          <div className={styles.letterContent}>
            {selectedDispute.letterContent}
          </div>
        </div>

        <div className={styles.disputeActions}>
          {selectedDispute.status === 'draft' && (
            <>
              <button type="button" className={styles.btnPrimary} onClick={() => updateStatus(selectedDispute.id, 'sent')}>
                Mark as Sent
              </button>
              <p className={styles.cardHint}>Copy the letter above, print it, and send via certified mail to the bureau/creditor address.</p>
            </>
          )}
          {selectedDispute.status === 'sent' && (
            <div className={styles.resolveActions}>
              <button type="button" className={styles.btnSuccess} onClick={() => updateStatus(selectedDispute.id, 'resolved_positive')}>
                Item Removed
              </button>
              <button type="button" className={styles.btnDanger} onClick={() => updateStatus(selectedDispute.id, 'resolved_negative')}>
                Dispute Denied
              </button>
              {selectedDispute.daysRemaining !== null && selectedDispute.daysRemaining <= 0 && (
                <button type="button" className={styles.btnSecondary} onClick={() => updateStatus(selectedDispute.id, 'escalated')}>
                  Escalate
                </button>
              )}
            </div>
          )}
          {selectedDispute.status === 'resolved_negative' && info?.escalatesTo && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                setSelectedDispute(null);
                setDisputeType(info.escalatesTo!);
                setTargetEntity(selectedDispute.targetEntity || '');
                setShowNewDispute(true);
              }}
            >
              Escalate: Send {getDisputeType(info.escalatesTo)?.label}
            </button>
          )}
        </div>

        {/* Bureau Mailing Addresses */}
        {selectedDispute.targetBureau && BUREAU_INFO[selectedDispute.targetBureau as keyof typeof BUREAU_INFO] && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Mailing Address</h3>
            <pre className={styles.addressBlock}>
              {BUREAU_INFO[selectedDispute.targetBureau as keyof typeof BUREAU_INFO].disputeAddress}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>Step 3: Dispute Center</h2>
        <p className={styles.stepDesc}>
          Generate legally-grounded dispute letters and track their progress. Each letter cites specific federal laws that protect your rights.
        </p>
      </div>

      {/* New Dispute Form */}
      {showNewDispute ? (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Generate New Dispute Letter</h3>
          <div className={styles.fieldGrid}>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.label}>Letter Type</label>
              <select value={disputeType} onChange={e => setDisputeType(e.target.value as DisputeTypeId)} className={styles.input}>
                {DISPUTE_TYPES.map(dt => (
                  <option key={dt.id} value={dt.id}>{dt.label} -- {dt.bestFor}</option>
                ))}
              </select>
              {disputeInfo && (
                <span className={styles.hint}>Legal authority: {disputeInfo.legalAuthority}</span>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Send To (Bureau)</label>
              <select value={targetBureau} onChange={e => setTargetBureau(e.target.value)} className={styles.input}>
                <option value="equifax">Equifax</option>
                <option value="experian">Experian</option>
                <option value="transunion">TransUnion</option>
                <option value="creditor">Direct to Creditor</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Creditor / Entity Name</label>
              <input type="text" value={targetEntity} onChange={e => setTargetEntity(e.target.value)} placeholder="e.g., Capital One" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Account Number (optional)</label>
              <input type="text" value={accountRef} onChange={e => setAccountRef(e.target.value)} placeholder="Last 4 digits" className={styles.input} />
            </div>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.label}>Item Details</label>
              <textarea
                value={itemDetails}
                onChange={e => setItemDetails(e.target.value)}
                placeholder="Describe the inaccurate item and why it should be removed..."
                className={styles.textarea}
                rows={3}
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.btnSecondary} onClick={() => setShowNewDispute(false)}>Cancel</button>
            <button type="button" className={styles.btnPrimary} onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating Letter...' : 'Generate Dispute Letter'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.addBtn} onClick={() => setShowNewDispute(true)} style={{ width: '100%' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          New Dispute Letter
        </button>
      )}

      {/* Disputes List */}
      {loading ? (
        <div className={styles.card}><p className={styles.cardHint}>Loading disputes...</p></div>
      ) : disputes.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.emptyState}>No disputes yet. Generate your first dispute letter to get started.</p>
        </div>
      ) : (
        <div className={styles.disputesList}>
          {disputes.map(d => {
            const info = getDisputeType(d.disputeType);
            return (
              <button
                key={d.id}
                type="button"
                className={styles.disputeRow}
                onClick={() => setSelectedDispute(d)}
              >
                <div className={styles.disputeRowLeft}>
                  <span className={styles.disputeRowType}>{info?.label || d.disputeType}</span>
                  {d.targetEntity && <span className={styles.disputeRowEntity}>{d.targetEntity}</span>}
                </div>
                <div className={styles.disputeRowRight}>
                  <span className={styles.statusBadge} style={{ color: statusColor(d.status) }}>
                    {statusLabel(d.status)}
                  </span>
                  {d.daysRemaining !== null && d.status === 'sent' && (
                    <span className={d.daysRemaining <= 0 ? styles.overdue : styles.daysLeft}>
                      {d.daysRemaining > 0 ? `${d.daysRemaining}d left` : 'Overdue'}
                    </span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

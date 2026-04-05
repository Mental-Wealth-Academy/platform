'use client';

import React, { useState, useEffect } from 'react';
import type { CreditDispute, DisputeStatus, AuditResult } from '@/types/credit-builder';
import { getDisputeType } from '@/lib/credit-builder-domain';
import styles from './credit-builder.module.css';

interface DisputeWithDays extends CreditDispute {
  daysRemaining: number | null;
}

interface Props {
  auditResult: AuditResult | null;
}

export default function ProgressTrackingStep({ auditResult }: Props) {
  const [disputes, setDisputes] = useState<DisputeWithDays[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/credit-builder/disputes', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setDisputes(d.disputes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: disputes.length,
    sent: disputes.filter(d => d.status === 'sent').length,
    resolved: disputes.filter(d => d.status === 'resolved_positive' || d.status === 'resolved_negative').length,
    positive: disputes.filter(d => d.status === 'resolved_positive').length,
    negative: disputes.filter(d => d.status === 'resolved_negative').length,
    overdue: disputes.filter(d => d.daysRemaining !== null && d.daysRemaining <= 0 && d.status === 'sent').length,
    draft: disputes.filter(d => d.status === 'draft').length,
  };

  const estimatedGain = auditResult
    ? auditResult.disputeRecommendations
        .filter(r => disputes.some(d => d.status === 'resolved_positive' && d.targetEntity === r.targetEntity))
        .reduce((sum, r) => sum + r.estimatedGain, 0)
    : 0;

  const statusColor = (status: DisputeStatus) => {
    switch (status) {
      case 'resolved_positive': return '#74C465';
      case 'resolved_negative': return '#E8556D';
      case 'sent': return '#5168FF';
      case 'escalated': return '#9724A6';
      default: return '#888';
    }
  };

  if (loading) {
    return (
      <div className={styles.stepContainer}>
        <div className={styles.card}><p className={styles.cardHint}>Loading progress...</p></div>
      </div>
    );
  }

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>Step 4: Track Your Progress</h2>
        <p className={styles.stepDesc}>
          Monitor dispute outcomes and estimated score improvements.
        </p>
      </div>

      {/* Stats Overview */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Total Disputes</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#5168FF' }}>{stats.sent}</span>
          <span className={styles.statLabel}>In Progress</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#74C465' }}>{stats.positive}</span>
          <span className={styles.statLabel}>Items Removed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#E8556D' }}>{stats.negative}</span>
          <span className={styles.statLabel}>Denied</span>
        </div>
      </div>

      {estimatedGain > 0 && (
        <div className={styles.card}>
          <div className={styles.gainBanner}>
            <span className={styles.gainValue}>+{estimatedGain}</span>
            <span className={styles.gainLabel}>Estimated points gained from successful disputes</span>
          </div>
        </div>
      )}

      {stats.overdue > 0 && (
        <div className={styles.card} style={{ borderColor: '#E8556D40' }}>
          <h3 className={styles.cardTitle} style={{ color: '#E8556D' }}>
            {stats.overdue} Overdue Response{stats.overdue > 1 ? 's' : ''}
          </h3>
          <p className={styles.cardHint}>
            Bureaus are required to respond within 30 days under FCRA. For overdue items, consider filing a CFPB complaint or escalating to the next dispute type.
          </p>
        </div>
      )}

      {/* Timeline */}
      {disputes.length > 0 ? (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Dispute Timeline</h3>
          <div className={styles.timeline}>
            {disputes
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(d => {
                const info = getDisputeType(d.disputeType);
                return (
                  <div key={d.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot} style={{ backgroundColor: statusColor(d.status) }} />
                    <div className={styles.timelineContent}>
                      <span className={styles.timelineType}>{info?.label || d.disputeType}</span>
                      {d.targetEntity && <span className={styles.timelineEntity}>{d.targetEntity}</span>}
                      <span className={styles.timelineDate}>
                        Created {new Date(d.createdAt).toLocaleDateString()}
                        {d.sentAt && ` | Sent ${new Date(d.sentAt).toLocaleDateString()}`}
                        {d.resolvedAt && ` | Resolved ${new Date(d.resolvedAt).toLocaleDateString()}`}
                      </span>
                      {d.status === 'sent' && d.daysRemaining !== null && (
                        <span className={d.daysRemaining <= 0 ? styles.overdue : styles.daysLeft}>
                          {d.daysRemaining > 0 ? `${d.daysRemaining} days until deadline` : 'Response deadline passed'}
                        </span>
                      )}
                    </div>
                    <span className={styles.statusBadge} style={{ color: statusColor(d.status) }}>
                      {d.status === 'resolved_positive' ? 'Removed' : d.status === 'resolved_negative' ? 'Denied' : d.status}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <p className={styles.emptyState}>
            No disputes yet. Go to the Dispute Center to generate your first dispute letter.
          </p>
        </div>
      )}

      {stats.draft > 0 && (
        <div className={styles.card}>
          <p className={styles.cardHint}>
            You have {stats.draft} draft dispute{stats.draft > 1 ? 's' : ''} ready to send. Print and mail via certified mail to start the 30-day clock.
          </p>
        </div>
      )}
    </div>
  );
}

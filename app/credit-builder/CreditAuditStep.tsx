'use client';

import React from 'react';
import type { AuditResult } from '@/types/credit-builder';
import { FICO_FACTORS, getScoreRange } from '@/lib/credit-builder-domain';
import styles from './credit-builder.module.css';

interface Props {
  auditResult: AuditResult;
  onStartDispute: (disputeType: string, targetEntity: string) => void;
  onRerunAudit: () => void;
  loading?: boolean;
}

const gradeColor = (grade: string) => {
  switch (grade) {
    case 'A': return '#74C465';
    case 'B': return '#5168FF';
    case 'C': return '#F5A623';
    case 'D': return '#E8556D';
    case 'F': return '#cc2244';
    default: return '#888';
  }
};

export default function CreditAuditStep({ auditResult, onStartDispute, onRerunAudit, loading }: Props) {
  const scoreRange = getScoreRange(auditResult.currentScoreAvg);
  const potentialGain = auditResult.estimatedScoreAfterFixes - auditResult.currentScoreAvg;

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>Step 2: Your Credit Audit</h2>
        <p className={styles.stepDesc}>
          AI-powered analysis of your credit profile with personalized recommendations.
        </p>
      </div>

      {/* Score Overview */}
      <div className={styles.card}>
        <div className={styles.auditOverview}>
          <div className={styles.auditScore}>
            <span className={styles.auditScoreLabel}>Current Score</span>
            <span className={styles.auditScoreValue} style={{ color: scoreRange.color }}>
              {auditResult.currentScoreAvg}
            </span>
            <span className={styles.auditScoreRange}>{scoreRange.label}</span>
          </div>
          <div className={styles.auditGrade}>
            <span className={styles.auditGradeLabel}>Overall Grade</span>
            <span className={styles.auditGradeValue} style={{ color: gradeColor(auditResult.overallGrade) }}>
              {auditResult.overallGrade}
            </span>
          </div>
          {potentialGain > 0 && (
            <div className={styles.auditPotential}>
              <span className={styles.auditPotentialLabel}>Potential Gain</span>
              <span className={styles.auditPotentialValue}>+{potentialGain} pts</span>
              <span className={styles.auditPotentialTarget}>Target: {auditResult.estimatedScoreAfterFixes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className={styles.card}>
        <p className={styles.auditSummary}>{auditResult.summary}</p>
      </div>

      {/* FICO Factors Breakdown */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>FICO Factor Breakdown</h3>
        <div className={styles.factorsList}>
          {auditResult.factors.map(factor => {
            const ficoInfo = FICO_FACTORS.find(f => f.id === factor.category);
            return (
              <div key={factor.category} className={styles.factorItem}>
                <div className={styles.factorHeader}>
                  <span className={styles.factorName}>{ficoInfo?.label || factor.category}</span>
                  <span className={styles.factorWeight}>{Math.round(factor.weight * 100)}%</span>
                  <span className={styles.factorGrade} style={{ color: gradeColor(factor.grade) }}>{factor.grade}</span>
                </div>
                <div className={styles.factorBar}>
                  <div
                    className={styles.factorBarFill}
                    style={{ width: `${factor.score}%`, backgroundColor: gradeColor(factor.grade) }}
                  />
                </div>
                {factor.findings.length > 0 && (
                  <ul className={styles.factorFindings}>
                    {factor.findings.map((f, i) => (
                      <li key={i} className={styles.factorFinding}>{f}</li>
                    ))}
                  </ul>
                )}
                {factor.recommendations.length > 0 && (
                  <ul className={styles.factorRecommendations}>
                    {factor.recommendations.map((r, i) => (
                      <li key={i} className={styles.factorRecommendation}>{r}</li>
                    ))}
                  </ul>
                )}
                {factor.estimatedGain > 0 && (
                  <span className={styles.factorGain}>+{factor.estimatedGain} pts potential</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dispute Recommendations */}
      {auditResult.disputeRecommendations.length > 0 && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Recommended Disputes</h3>
          <p className={styles.cardHint}>These items on your report may be disputable</p>
          <div className={styles.disputeRecList}>
            {auditResult.disputeRecommendations
              .sort((a, b) => a.priority - b.priority)
              .map((rec, i) => (
                <div key={i} className={styles.disputeRecItem}>
                  <div className={styles.disputeRecInfo}>
                    <span className={styles.disputeRecPriority}>#{rec.priority}</span>
                    <div>
                      <span className={styles.disputeRecEntity}>{rec.targetEntity}</span>
                      <span className={styles.disputeRecReason}>{rec.reason}</span>
                      <span className={styles.disputeRecMeta}>
                        +{rec.estimatedGain} pts | {Math.round(rec.successProbability * 100)}% success rate
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.btnSmall}
                    onClick={() => onStartDispute(rec.disputeType, rec.targetEntity)}
                  >
                    Start Dispute
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Priority Actions */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Priority Actions</h3>
        <ol className={styles.actionList}>
          {auditResult.prioritizedActions.map((action, i) => (
            <li key={i} className={styles.actionItem}>{action}</li>
          ))}
        </ol>
      </div>

      <button type="button" className={styles.btnSecondary} onClick={onRerunAudit} disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Re-analyzing...' : 'Re-run Audit with Updated Info'}
      </button>
    </div>
  );
}

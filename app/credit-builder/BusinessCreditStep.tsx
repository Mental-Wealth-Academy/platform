'use client';

import React, { useState, useEffect } from 'react';
import type { BusinessPhaseId, BusinessPhaseData } from '@/types/credit-builder';
import { BUSINESS_CREDIT_PHASES } from '@/lib/credit-builder-domain';
import styles from './credit-builder.module.css';

export default function BusinessCreditStep() {
  const [currentPhase, setCurrentPhase] = useState<BusinessPhaseId>('foundation');
  const [phaseData, setPhaseData] = useState<BusinessPhaseData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/credit-builder/business', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.progress) {
          setCurrentPhase(data.progress.currentPhase);
          setPhaseData(data.progress.phaseData);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (newPhase: BusinessPhaseId, newData: BusinessPhaseData) => {
    setSaving(true);
    try {
      await fetch('/api/credit-builder/business', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: newPhase, phaseData: newData }),
      });
    } catch {} finally {
      setSaving(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const newData = { ...phaseData, [itemId]: !phaseData[itemId] };
    setPhaseData(newData);

    // Check if current phase is complete
    const phase = BUSINESS_CREDIT_PHASES.find(p => p.id === currentPhase);
    if (phase) {
      const requiredItems = phase.checklist.filter(c => c.required);
      const allComplete = requiredItems.every(c => newData[c.id]);
      const phaseIndex = BUSINESS_CREDIT_PHASES.findIndex(p => p.id === currentPhase);
      const nextPhase = allComplete && phaseIndex < BUSINESS_CREDIT_PHASES.length - 1
        ? BUSINESS_CREDIT_PHASES[phaseIndex + 1].id
        : currentPhase;

      if (nextPhase !== currentPhase) {
        setCurrentPhase(nextPhase);
        save(nextPhase, newData);
      } else {
        save(currentPhase, newData);
      }
    } else {
      save(currentPhase, newData);
    }
  };

  if (loading) {
    return (
      <div className={styles.stepContainer}>
        <div className={styles.card}><p className={styles.cardHint}>Loading business credit progress...</p></div>
      </div>
    );
  }

  const currentPhaseIndex = BUSINESS_CREDIT_PHASES.findIndex(p => p.id === currentPhase);

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>Step 5: Build Business Credit</h2>
        <p className={styles.stepDesc}>
          Separate your business finances from personal. Business credit doesn&apos;t affect your personal score and unlocks larger credit lines.
        </p>
      </div>

      {/* Phase Progress */}
      <div className={styles.phaseProgress}>
        {BUSINESS_CREDIT_PHASES.map((phase, i) => {
          const isActive = phase.id === currentPhase;
          const isComplete = i < currentPhaseIndex;
          const isFuture = i > currentPhaseIndex;
          return (
            <button
              key={phase.id}
              type="button"
              className={`${styles.phaseStep} ${isActive ? styles.phaseStepActive : ''} ${isComplete ? styles.phaseStepComplete : ''} ${isFuture ? styles.phaseStepFuture : ''}`}
              onClick={() => { setCurrentPhase(phase.id); }}
            >
              <span className={styles.phaseStepNumber}>
                {isComplete ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                ) : i + 1}
              </span>
              <span className={styles.phaseStepLabel}>{phase.label}</span>
            </button>
          );
        })}
      </div>

      {/* Current Phase Detail */}
      {BUSINESS_CREDIT_PHASES.map(phase => {
        if (phase.id !== currentPhase) return null;

        const completedCount = phase.checklist.filter(c => phaseData[c.id]).length;
        const totalCount = phase.checklist.length;

        return (
          <div key={phase.id}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>{phase.label}</h3>
              <p className={styles.cardHint}>{phase.description}</p>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
              <span className={styles.progressText}>{completedCount} of {totalCount} completed</span>
            </div>

            <div className={styles.checklistCard}>
              {phase.checklist.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.checklistItem} ${phaseData[item.id] ? styles.checklistItemDone : ''}`}
                  onClick={() => toggleItem(item.id)}
                  disabled={saving}
                >
                  <span className={styles.checkbox}>
                    {phaseData[item.id] && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </span>
                  <div className={styles.checklistInfo}>
                    <span className={styles.checklistLabel}>
                      {item.label}
                      {item.required && <span className={styles.requiredBadge}>Required</span>}
                    </span>
                    <span className={styles.checklistDesc}>{item.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

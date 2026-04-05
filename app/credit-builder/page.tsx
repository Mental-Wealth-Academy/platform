'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import { CREDIT_STEPS } from '@/lib/credit-builder-domain';
import type { CreditStep, CreditData, AuditResult } from '@/types/credit-builder';
import CreditIntakeStep from './CreditIntakeStep';
import CreditAuditStep from './CreditAuditStep';
import DisputeCenterStep from './DisputeCenterStep';
import ProgressTrackingStep from './ProgressTrackingStep';
import BusinessCreditStep from './BusinessCreditStep';
import styles from './credit-builder.module.css';

export default function CreditBuilderPage() {
  const { play } = useSound();
  const [currentStep, setCurrentStep] = useState<CreditStep>('intake');
  const [creditData, setCreditData] = useState<CreditData | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditing, setAuditing] = useState(false);

  // Dispute pre-fill from audit recommendations
  const [prefilledDisputeType, setPrefilledDisputeType] = useState<string | undefined>();
  const [prefilledTargetEntity, setPrefilledTargetEntity] = useState<string | undefined>();

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/credit-builder/profile', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setCurrentStep(data.profile.currentStep);
          setCreditData(data.profile.creditData);
          setAuditResult(data.profile.auditResult);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleIntakeSubmit = async (data: CreditData) => {
    setSaving(true);
    try {
      const res = await fetch('/api/credit-builder/profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditData: data, step: 'intake' }),
      });
      if (res.ok) {
        setCreditData(data);
        // Auto-trigger audit
        await runAudit();
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const runAudit = async () => {
    setAuditing(true);
    try {
      const res = await fetch('/api/credit-builder/audit', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAuditResult(data.auditResult);
        setCurrentStep('audit');
      }
    } catch {} finally {
      setAuditing(false);
    }
  };

  const handleStartDispute = (disputeType: string, targetEntity: string) => {
    play('click');
    setPrefilledDisputeType(disputeType);
    setPrefilledTargetEntity(targetEntity);
    setCurrentStep('disputes');
  };

  const navigateToStep = (step: CreditStep) => {
    play('click');
    // Clear prefill when navigating normally
    if (step !== 'disputes') {
      setPrefilledDisputeType(undefined);
      setPrefilledTargetEntity(undefined);
    }
    setCurrentStep(step);
  };

  const stepIndex = CREDIT_STEPS.findIndex(s => s.id === currentStep);

  if (loading) {
    return (
      <>
        <SideNavigation />
        <main className={styles.pageLayout}>
          <div className={styles.loadingState}>Loading Credit Builder...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <SideNavigation />
      <main className={styles.pageLayout}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Credit Builder</h1>
          <p className={styles.headerSub}>
            Analyze, dispute, and build your credit -- step by step
          </p>
        </div>

        {/* Step Navigation */}
        <div className={styles.stepNav}>
          {CREDIT_STEPS.map((step, i) => {
            const isActive = step.id === currentStep;
            const isCompleted = i < stepIndex;
            const isAccessible = i <= stepIndex || (creditData && i <= 4);
            return (
              <button
                key={step.id}
                type="button"
                className={`${styles.stepNavItem} ${isActive ? styles.stepNavItemActive : ''} ${isCompleted ? styles.stepNavItemCompleted : ''}`}
                onClick={() => isAccessible && navigateToStep(step.id)}
                onMouseEnter={() => isAccessible && play('hover')}
                disabled={!isAccessible}
              >
                <span className={styles.stepNavNumber}>
                  {isCompleted ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : step.number}
                </span>
                <span className={styles.stepNavLabel}>{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <div className={styles.stepContent}>
          {currentStep === 'intake' && (
            <CreditIntakeStep
              initialData={creditData || undefined}
              onSubmit={handleIntakeSubmit}
              loading={saving || auditing}
            />
          )}
          {currentStep === 'audit' && auditResult && (
            <CreditAuditStep
              auditResult={auditResult}
              onStartDispute={handleStartDispute}
              onRerunAudit={runAudit}
              loading={auditing}
            />
          )}
          {currentStep === 'audit' && !auditResult && (
            <div className={styles.card}>
              <p className={styles.emptyState}>No audit results yet. Complete the intake step first.</p>
              <button type="button" className={styles.btnPrimary} onClick={() => setCurrentStep('intake')}>
                Go to Intake
              </button>
            </div>
          )}
          {currentStep === 'disputes' && (
            <DisputeCenterStep
              initialDisputeType={prefilledDisputeType}
              initialTargetEntity={prefilledTargetEntity}
            />
          )}
          {currentStep === 'tracking' && (
            <ProgressTrackingStep auditResult={auditResult} />
          )}
          {currentStep === 'business' && (
            <BusinessCreditStep />
          )}
        </div>
      </main>
    </>
  );
}

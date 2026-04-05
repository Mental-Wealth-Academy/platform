'use client';

import React, { useState } from 'react';
import styles from './CreditBuilderInline.module.css';

interface Props {
  onComplete: (data: CreditIntakeData) => void;
  onRequestPayment: () => void;
  step: 'intake' | 'payment' | 'processing' | 'done';
}

export interface CreditIntakeData {
  equifax: number | null;
  experian: number | null;
  transunion: number | null;
  totalDebt: number | null;
  totalCreditLimit: number | null;
  oldestAccountYears: number | null;
  hardInquiries: number;
  latePayments: number;
  collections: number;
  chargeOffs: number;
}

export default function CreditBuilderInline({ onComplete, onRequestPayment, step }: Props) {
  const [equifax, setEquifax] = useState('');
  const [experian, setExperian] = useState('');
  const [transunion, setTransunion] = useState('');
  const [totalDebt, setTotalDebt] = useState('');
  const [totalCreditLimit, setTotalCreditLimit] = useState('');
  const [oldestYears, setOldestYears] = useState('');
  const [hardInquiries, setHardInquiries] = useState('0');
  const [latePayments, setLatePayments] = useState('0');
  const [collections, setCollections] = useState('0');
  const [chargeOffs, setChargeOffs] = useState('0');

  const hasAtLeastOneScore = equifax || experian || transunion;

  const handleSubmit = () => {
    const data: CreditIntakeData = {
      equifax: equifax ? parseInt(equifax, 10) : null,
      experian: experian ? parseInt(experian, 10) : null,
      transunion: transunion ? parseInt(transunion, 10) : null,
      totalDebt: totalDebt ? parseFloat(totalDebt) : null,
      totalCreditLimit: totalCreditLimit ? parseFloat(totalCreditLimit) : null,
      oldestAccountYears: oldestYears ? parseInt(oldestYears, 10) : null,
      hardInquiries: parseInt(hardInquiries, 10) || 0,
      latePayments: parseInt(latePayments, 10) || 0,
      collections: parseInt(collections, 10) || 0,
      chargeOffs: parseInt(chargeOffs, 10) || 0,
    };
    onComplete(data);
  };

  if (step === 'done') {
    return (
      <div className={styles.container}>
        <div className={styles.doneCard}>
          <div className={styles.doneIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#74C465" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className={styles.doneText}>Credit audit activated. Check your full results on the Credit Builder page.</p>
          <a href="/credit-builder" className={styles.viewBtn}>View Full Report</a>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className={styles.container}>
        <div className={styles.processingCard}>
          <div className={styles.spinner} />
          <p className={styles.processingText}>Running your credit audit...</p>
        </div>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div className={styles.container}>
        <div className={styles.paymentCard}>
          <h4 className={styles.paymentTitle}>Activate Credit Audit</h4>
          <p className={styles.paymentDesc}>Send payment to Blue's wallet to activate your personalized AI credit audit, dispute letter generation, and progress tracking.</p>
          <div className={styles.paymentDetails}>
            <span className={styles.paymentLabel}>Cost</span>
            <span className={styles.paymentAmount}>50 Shards</span>
          </div>
          <button type="button" className={styles.payBtn} onClick={onRequestPayment}>
            Pay 50 Shards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h4 className={styles.formTitle}>Credit Profile Intake</h4>

        {/* Scores */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Credit Scores (300-850)</span>
          <div className={styles.row3}>
            <div className={styles.field}>
              <label className={styles.label}>Equifax</label>
              <input type="number" min="300" max="850" value={equifax} onChange={e => setEquifax(e.target.value)} placeholder="---" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Experian</label>
              <input type="number" min="300" max="850" value={experian} onChange={e => setExperian(e.target.value)} placeholder="---" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>TransUnion</label>
              <input type="number" min="300" max="850" value={transunion} onChange={e => setTransunion(e.target.value)} placeholder="---" className={styles.input} />
            </div>
          </div>
        </div>

        {/* Financials */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Financial Overview</span>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Total Debt ($)</label>
              <input type="number" value={totalDebt} onChange={e => setTotalDebt(e.target.value)} placeholder="0" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Credit Limit ($)</label>
              <input type="number" value={totalCreditLimit} onChange={e => setTotalCreditLimit(e.target.value)} placeholder="0" className={styles.input} />
            </div>
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Oldest Account (yrs)</label>
              <input type="number" min="0" max="50" value={oldestYears} onChange={e => setOldestYears(e.target.value)} placeholder="0" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Hard Inquiries</label>
              <input type="number" min="0" value={hardInquiries} onChange={e => setHardInquiries(e.target.value)} className={styles.input} />
            </div>
          </div>
        </div>

        {/* Negative Items */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Negative Items</span>
          <div className={styles.row3}>
            <div className={styles.field}>
              <label className={styles.label}>Late Payments</label>
              <input type="number" min="0" value={latePayments} onChange={e => setLatePayments(e.target.value)} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Collections</label>
              <input type="number" min="0" value={collections} onChange={e => setCollections(e.target.value)} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Charge-offs</label>
              <input type="number" min="0" value={chargeOffs} onChange={e => setChargeOffs(e.target.value)} className={styles.input} />
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!hasAtLeastOneScore}
        >
          Submit Credit Info
        </button>
      </div>
    </div>
  );
}

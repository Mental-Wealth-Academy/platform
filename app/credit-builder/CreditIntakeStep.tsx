'use client';

import React, { useState } from 'react';
import type { CreditData, CreditScoreEntry, CreditAccount, DerogatoryItem } from '@/types/credit-builder';
import { CREDIT_SCORE_RANGES } from '@/lib/credit-builder-domain';
import styles from './credit-builder.module.css';

interface Props {
  initialData?: CreditData;
  onSubmit: (data: CreditData) => void;
  loading?: boolean;
}

const EMPTY_CREDIT_DATA: CreditData = {
  scores: [],
  accounts: [],
  inquiries: [],
  derogatory: [],
};

export default function CreditIntakeStep({ initialData, onSubmit, loading }: Props) {
  const [data, setData] = useState<CreditData>(initialData || EMPTY_CREDIT_DATA);

  // Score inputs
  const [equifaxScore, setEquifaxScore] = useState(initialData?.scores.find(s => s.bureau === 'equifax')?.score?.toString() || '');
  const [experianScore, setExperianScore] = useState(initialData?.scores.find(s => s.bureau === 'experian')?.score?.toString() || '');
  const [transunionScore, setTransunionScore] = useState(initialData?.scores.find(s => s.bureau === 'transunion')?.score?.toString() || '');

  // Summary inputs
  const [totalDebt, setTotalDebt] = useState(initialData?.totalDebt?.toString() || '');
  const [totalCreditLimit, setTotalCreditLimit] = useState(initialData?.totalCreditLimit?.toString() || '');
  const [oldestAccountYears, setOldestAccountYears] = useState(initialData?.oldestAccountAge ? Math.round(initialData.oldestAccountAge / 12).toString() : '');
  const [hardInquiries, setHardInquiries] = useState(initialData?.inquiries.filter(i => i.type === 'hard').length.toString() || '0');

  // Negative items
  const [latePayments, setLatePayments] = useState('0');
  const [collections, setCollections] = useState('0');
  const [chargeOffs, setChargeOffs] = useState('0');

  // Add derogatory item form
  const [showAddNegative, setShowAddNegative] = useState(false);
  const [negCreditor, setNegCreditor] = useState('');
  const [negType, setNegType] = useState<DerogatoryItem['type']>('collection');
  const [negAmount, setNegAmount] = useState('');

  const addNegativeItem = () => {
    if (!negCreditor.trim()) return;
    const item: DerogatoryItem = {
      type: negType,
      creditor: negCreditor.trim(),
      amount: negAmount ? parseFloat(negAmount) : undefined,
    };
    setData(prev => ({ ...prev, derogatory: [...prev.derogatory, item] }));
    setNegCreditor('');
    setNegAmount('');
    setShowAddNegative(false);
  };

  const removeNegativeItem = (index: number) => {
    setData(prev => ({ ...prev, derogatory: prev.derogatory.filter((_, i) => i !== index) }));
  };

  const handleSubmit = () => {
    const scores: CreditScoreEntry[] = [];
    if (equifaxScore) scores.push({ bureau: 'equifax', score: parseInt(equifaxScore, 10) });
    if (experianScore) scores.push({ bureau: 'experian', score: parseInt(experianScore, 10) });
    if (transunionScore) scores.push({ bureau: 'transunion', score: parseInt(transunionScore, 10) });

    // Build accounts from the summary numbers
    const accounts: CreditAccount[] = [];
    const lateCount = parseInt(latePayments, 10) || 0;
    const collectionCount = parseInt(collections, 10) || 0;
    const chargeOffCount = parseInt(chargeOffs, 10) || 0;

    for (let i = 0; i < lateCount; i++) {
      accounts.push({ name: `Late Account ${i + 1}`, type: 'revolving', balance: 0, limit: null, status: 'late' });
    }
    for (let i = 0; i < collectionCount; i++) {
      accounts.push({ name: `Collection ${i + 1}`, type: 'collection', balance: 0, limit: null, status: 'collection' });
    }
    for (let i = 0; i < chargeOffCount; i++) {
      accounts.push({ name: `Charge-off ${i + 1}`, type: 'other', balance: 0, limit: null, status: 'charged_off' });
    }

    const inquiries = [];
    const hardCount = parseInt(hardInquiries, 10) || 0;
    for (let i = 0; i < hardCount; i++) {
      inquiries.push({ creditor: `Inquiry ${i + 1}`, date: new Date().toISOString(), type: 'hard' as const });
    }

    const result: CreditData = {
      scores,
      accounts: [...accounts, ...data.accounts],
      inquiries,
      derogatory: data.derogatory,
      totalDebt: totalDebt ? parseFloat(totalDebt) : undefined,
      totalCreditLimit: totalCreditLimit ? parseFloat(totalCreditLimit) : undefined,
      oldestAccountAge: oldestAccountYears ? parseInt(oldestAccountYears, 10) * 12 : undefined,
    };

    onSubmit(result);
  };

  const avgScore = [equifaxScore, experianScore, transunionScore]
    .filter(Boolean)
    .map(Number)
    .reduce((sum, s, _, arr) => sum + s / arr.length, 0);

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>Step 1: Enter Your Credit Info</h2>
        <p className={styles.stepDesc}>
          Enter your current credit scores and basic information. You can find your scores for free at annualcreditreport.com or through your bank.
        </p>
      </div>

      {/* Credit Scores */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Credit Scores</h3>
        <p className={styles.cardHint}>Enter scores from any or all three bureaus (300-850)</p>
        <div className={styles.scoreGrid}>
          <div className={styles.scoreInput}>
            <label className={styles.label}>Equifax</label>
            <input
              type="number"
              min="300"
              max="850"
              value={equifaxScore}
              onChange={e => setEquifaxScore(e.target.value)}
              placeholder="---"
              className={styles.input}
            />
          </div>
          <div className={styles.scoreInput}>
            <label className={styles.label}>Experian</label>
            <input
              type="number"
              min="300"
              max="850"
              value={experianScore}
              onChange={e => setExperianScore(e.target.value)}
              placeholder="---"
              className={styles.input}
            />
          </div>
          <div className={styles.scoreInput}>
            <label className={styles.label}>TransUnion</label>
            <input
              type="number"
              min="300"
              max="850"
              value={transunionScore}
              onChange={e => setTransunionScore(e.target.value)}
              placeholder="---"
              className={styles.input}
            />
          </div>
        </div>
        {avgScore > 0 && (
          <div className={styles.scorePreview}>
            <span className={styles.scorePreviewLabel}>Average Score</span>
            <span className={styles.scorePreviewValue} style={{
              color: avgScore >= 740 ? CREDIT_SCORE_RANGES.veryGood.color
                : avgScore >= 670 ? CREDIT_SCORE_RANGES.good.color
                : avgScore >= 580 ? CREDIT_SCORE_RANGES.fair.color
                : CREDIT_SCORE_RANGES.poor.color
            }}>
              {Math.round(avgScore)}
            </span>
          </div>
        )}
      </div>

      {/* Financial Overview */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Financial Overview</h3>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Total Debt</label>
            <div className={styles.inputPrefix}>
              <span className={styles.prefix}>$</span>
              <input type="number" value={totalDebt} onChange={e => setTotalDebt(e.target.value)} placeholder="0" className={styles.input} />
            </div>
            <span className={styles.hint}>All balances across all accounts</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Total Credit Limit</label>
            <div className={styles.inputPrefix}>
              <span className={styles.prefix}>$</span>
              <input type="number" value={totalCreditLimit} onChange={e => setTotalCreditLimit(e.target.value)} placeholder="0" className={styles.input} />
            </div>
            <span className={styles.hint}>Combined limit across all cards</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Oldest Account (years)</label>
            <input type="number" min="0" max="50" value={oldestAccountYears} onChange={e => setOldestAccountYears(e.target.value)} placeholder="0" className={styles.input} />
            <span className={styles.hint}>Age of your oldest credit account</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Hard Inquiries (last 2 years)</label>
            <input type="number" min="0" max="50" value={hardInquiries} onChange={e => setHardInquiries(e.target.value)} placeholder="0" className={styles.input} />
            <span className={styles.hint}>From applying for credit</span>
          </div>
        </div>
      </div>

      {/* Negative Items Summary */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Negative Items</h3>
        <p className={styles.cardHint}>Count of negative marks on your report</p>
        <div className={styles.fieldGrid}>
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

      {/* Specific Derogatory Items */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Specific Negative Items (Optional)</h3>
        <p className={styles.cardHint}>Adding details helps generate better dispute letters</p>

        {data.derogatory.length > 0 && (
          <div className={styles.negativeList}>
            {data.derogatory.map((item, i) => (
              <div key={i} className={styles.negativeItem}>
                <div className={styles.negativeInfo}>
                  <span className={styles.negativeType}>{item.type.replace(/_/g, ' ')}</span>
                  <span className={styles.negativeCreditor}>{item.creditor}</span>
                  {item.amount && <span className={styles.negativeAmount}>${item.amount.toLocaleString()}</span>}
                </div>
                <button type="button" className={styles.removeBtn} onClick={() => removeNegativeItem(i)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {showAddNegative ? (
          <div className={styles.addNegativeForm}>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Type</label>
                <select value={negType} onChange={e => setNegType(e.target.value as DerogatoryItem['type'])} className={styles.input}>
                  <option value="collection">Collection</option>
                  <option value="late_payment">Late Payment</option>
                  <option value="charge_off">Charge-off</option>
                  <option value="bankruptcy">Bankruptcy</option>
                  <option value="judgment">Judgment</option>
                  <option value="tax_lien">Tax Lien</option>
                  <option value="repossession">Repossession</option>
                  <option value="foreclosure">Foreclosure</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Creditor / Collector</label>
                <input type="text" value={negCreditor} onChange={e => setNegCreditor(e.target.value)} placeholder="e.g., Capital One" className={styles.input} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Amount (optional)</label>
                <div className={styles.inputPrefix}>
                  <span className={styles.prefix}>$</span>
                  <input type="number" value={negAmount} onChange={e => setNegAmount(e.target.value)} placeholder="0" className={styles.input} />
                </div>
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowAddNegative(false)}>Cancel</button>
              <button type="button" className={styles.btnPrimary} onClick={addNegativeItem} disabled={!negCreditor.trim()}>Add Item</button>
            </div>
          </div>
        ) : (
          <button type="button" className={styles.addBtn} onClick={() => setShowAddNegative(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add Negative Item
          </button>
        )}
      </div>

      <button
        type="button"
        className={styles.btnPrimary}
        onClick={handleSubmit}
        disabled={loading || (!equifaxScore && !experianScore && !transunionScore)}
        style={{ width: '100%', marginTop: 8 }}
      >
        {loading ? 'Saving...' : 'Save and Run Credit Audit'}
      </button>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { providers, Contract, utils } from 'ethers';
import styles from './BlueChat.module.css';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  description: string;
  price: string;
  priceUsdc: number;
}

interface ResearchCardsProps {
  sources: ResearchSource[];
  payTo: string;
  topic: string;
  onComplete: (synthesis: string) => void;
  onError: (message: string) => void;
}

type Step = 'select' | 'confirm' | 'paying' | 'fetching';

const ResearchCards: React.FC<ResearchCardsProps> = ({
  sources,
  payTo,
  topic,
  onComplete,
  onError,
}) => {
  const { connector, isConnected } = useAccount();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<Step>('select');

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalUsdc = sources
    .filter((s) => selected.has(s.id))
    .reduce((sum, s) => sum + s.priceUsdc, 0);

  const handleConfirm = () => {
    if (selected.size === 0) return;
    setStep('confirm');
  };

  const handlePay = async () => {
    if (!isConnected || !connector) {
      onError('connect your wallet first.');
      return;
    }

    setStep('paying');

    try {
      const rawProvider = await connector.getProvider();
      const provider = new providers.Web3Provider(rawProvider as providers.ExternalProvider);
      const signer = provider.getSigner();
      const usdc = new Contract(USDC_ADDRESS, USDC_ABI, signer);
      const amount = utils.parseUnits(totalUsdc.toFixed(6), 6);
      const tx = await usdc.transfer(payTo, amount);
      await tx.wait();

      // Payment confirmed -- fetch content
      setStep('fetching');

      const selectedSources = sources.filter((s) => selected.has(s.id));
      const res = await fetch('/api/research/fetch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          sources: selectedSources.map((s) => ({
            id: s.id,
            url: s.url,
            title: s.title,
          })),
          txHash: tx.hash,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'fetch failed');
      }

      const data = await res.json();
      onComplete(data.synthesis);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'payment failed';
      onError(msg.includes('user rejected') ? 'payment cancelled.' : msg);
      setStep('select');
    }
  };

  const handleCancel = () => setStep('select');

  if (sources.length === 0) return null;

  return (
    <div className={styles.researchCards}>
      {step === 'select' && (
        <>
          <div className={styles.researchLabel}>select sources to purchase</div>
          <div className={styles.researchGrid}>
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                className={`${styles.researchCard} ${selected.has(source.id) ? styles.researchCardSelected : ''}`}
                onClick={() => toggle(source.id)}
              >
                <span className={styles.researchCardTitle}>{source.title}</span>
                {source.description && (
                  <span className={styles.researchCardDesc}>
                    {source.description.slice(0, 80)}
                  </span>
                )}
                <span className={styles.researchCardPrice}>{source.price}</span>
              </button>
            ))}
          </div>
          {selected.size > 0 && (
            <button
              type="button"
              className={styles.shardConfirmYes}
              onClick={handleConfirm}
            >
              Review ({selected.size} source{selected.size > 1 ? 's' : ''})
            </button>
          )}
        </>
      )}

      {step === 'confirm' && (
        <>
          <div className={styles.researchLabel}>
            {selected.size} source{selected.size > 1 ? 's' : ''} selected
          </div>
          <div className={styles.researchCost}>
            Total: {totalUsdc.toFixed(2)} USDC
          </div>
          <div className={styles.shardConfirmButtons}>
            <button
              type="button"
              className={styles.shardConfirmYes}
              onClick={handlePay}
            >
              Pay {totalUsdc.toFixed(2)} USDC
            </button>
            <button
              type="button"
              className={styles.shardConfirmNo}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {step === 'paying' && (
        <div className={styles.researchLabel}>
          confirming payment on Base...
        </div>
      )}

      {step === 'fetching' && (
        <div className={styles.researchLabel}>
          fetching research via x402...
        </div>
      )}
    </div>
  );
};

export default ResearchCards;

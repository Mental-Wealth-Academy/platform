'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { providers, Contract } from 'ethers';
import { useSound } from '@/hooks/useSound';
import styles from './TreasuryDisplay.module.css';

interface TreasuryDisplayProps {
  contractAddress: string;
  usdcAddress: string;
}

const BLUE_WALLET = '0x0920553CcA188871b146ee79f562B4Af46aB4f8a';

const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const TreasuryDisplay: React.FC<TreasuryDisplayProps> = ({
  contractAddress,
  usdcAddress,
}) => {
  const { play } = useSound();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);

  const loadBalance = useCallback(async () => {
    try {
      let provider: providers.Provider | null = null;

      if (process.env.NEXT_PUBLIC_ALCHEMY_ID) {
        const alchemyUrl = `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`;
        provider = new providers.JsonRpcProvider(alchemyUrl);
      } else if (typeof window !== 'undefined' && window.ethereum) {
        provider = new providers.Web3Provider(window.ethereum);
      } else {
        const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
        provider = new providers.JsonRpcProvider(rpcUrl);
      }

      const usdcContract = new Contract(usdcAddress, USDC_ABI, provider);
      const balanceRaw = await usdcContract.balanceOf(BLUE_WALLET);
      const decimals = await usdcContract.decimals();
      const balanceNum = Number(balanceRaw) / (10 ** Number(decimals));

      setBalance(balanceNum.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }));

      if (balanceNum === 0) {
        setBalance('0.00');
      }
    } catch (error) {
      console.error('Error loading Blue wallet balance:', error);
      setBalance('0.00');
    } finally {
      setLoading(false);
    }
  }, [usdcAddress]);

  useEffect(() => {
    loadBalance();
    const interval = setInterval(loadBalance, 30000);
    return () => clearInterval(interval);
  }, [loadBalance]);

  return (
    <div className={`${styles.container} ${loading ? styles.loading : ''}`}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.icon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M2 10H22" stroke="currentColor" strokeWidth="2"/>
              <circle cx="17" cy="15" r="2" fill="currentColor"/>
            </svg>
          </div>
          <div className={styles.titleText}>
            <p className={styles.label}>Agent Wallet</p>
            <h3 className={styles.title}>Blue&apos;s Wallet</h3>
          </div>
        </div>
      </div>

      <p className={styles.balance}>
        ${balance}
        <span className={styles.currency}>USDC</span>
      </p>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <p className={styles.statLabel}>Wallet</p>
          <a
            href={`https://basescan.org/address/${BLUE_WALLET}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contractLink}
            onClick={() => play('navigation')}
            onMouseEnter={() => play('hover')}
          >
            {BLUE_WALLET.slice(0, 6)}...{BLUE_WALLET.slice(-4)}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </a>
        </div>
        <div className={styles.statItem}>
          <p className={styles.statLabel}>Network</p>
          <p className={styles.statValue}>Base Mainnet</p>
        </div>
      </div>
    </div>
  );
};

export default TreasuryDisplay;

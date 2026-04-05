'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { providers, Contract } from 'ethers';
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
  usdcAddress,
}) => {
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
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="6" width="20" height="14" rx="2" fill="currentColor"/>
              <rect x="2" y="9" width="20" height="3" fill="currentColor" opacity="0.7"/>
              <circle cx="17" cy="16" r="2" fill="#ffffff"/>
            </svg>
          </div>
          <div className={styles.titleText}>
            <p className={styles.label}>Agent Account</p>
            <h3 className={styles.title}>Blue&apos;s Wallet</h3>
          </div>
        </div>
      </div>

      <p className={styles.balance}>
        ${balance}
        <span className={styles.currency}>USDC</span>
      </p>
    </div>
  );
};

export default TreasuryDisplay;

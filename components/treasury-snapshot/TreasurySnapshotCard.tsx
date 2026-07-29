'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import TreasurySwapModal from '@/components/treasury-swap/TreasurySwapModal';
import type { TreasurySnapshot } from '@/lib/treasury-snapshot';
import styles from './TreasurySnapshotCard.module.css';

function formatBalance(amount: string | null, maximumFractionDigits: number): string {
  if (amount === null) return 'Unavailable';
  const value = Number(amount);
  if (!Number.isFinite(value)) return 'Unavailable';
  if (value === 0) return '0';

  return value.toLocaleString('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: value < 0.01 ? Math.min(maximumFractionDigits, 4) : 0,
  });
}

function formatUsdcValue(amount: string | null): string | null {
  if (amount === null) return null;
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function TreasurySnapshotCard() {
  const [treasury, setTreasury] = useState<TreasurySnapshot | null>(null);
  const [treasuryLoading, setTreasuryLoading] = useState(true);
  const [treasuryFailed, setTreasuryFailed] = useState(false);
  const [showTreasurySwap, setShowTreasurySwap] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTreasury() {
      try {
        const response = await fetch('/api/treasury/snapshot', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Treasury request failed');
        setTreasury(await response.json() as TreasurySnapshot);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setTreasuryFailed(true);
      } finally {
        if (!controller.signal.aborted) setTreasuryLoading(false);
      }
    }

    loadTreasury();
    return () => controller.abort();
  }, []);

  return (
    <>
      <section className={styles.card} aria-label="Treasury holdings">
        {treasuryLoading ? (
          <div className={styles.skeleton} aria-label="Loading Blue's treasures" aria-live="polite">
            <span /><span /><span />
          </div>
        ) : treasuryFailed ? (
          <p className={styles.empty}>Blue&apos;s wallet balances are temporarily unavailable.</p>
        ) : treasury ? (
          <>
            <div className={styles.metrics} aria-live="polite">
              <div className={`${styles.metric} ${styles.primaryMetric}`}>
                <Image className={styles.metricIcon} src="/tokens/cbbtc.webp" alt="" width={20} height={20} />
                <span className={styles.metricLabel}>Blue&apos;s Bitcoin</span>
                <strong className={styles.metricValue}>
                  {formatBalance(treasury.balances.cbBtc.amount, 8)}
                  {treasury.balances.cbBtc.amount !== null && <small> Bitcoin</small>}
                </strong>
                {formatUsdcValue(treasury.balances.cbBtc.usdcValue) && (
                  <span className={styles.metricQuote}>
                    {formatUsdcValue(treasury.balances.cbBtc.usdcValue)} USDC
                  </span>
                )}
              </div>
              <div className={`${styles.metric} ${styles.secondaryMetric}`}>
                <Image className={styles.metricIcon} src="/tokens/eth.png" alt="" width={20} height={20} />
                <span className={styles.metricLabel}>Ether</span>
                <strong className={styles.metricValue}>
                  {formatBalance(treasury.balances.native.amount, 6)}
                  {treasury.balances.native.amount !== null && <small> ETH</small>}
                </strong>
                {formatUsdcValue(treasury.balances.native.usdcValue) && (
                  <span className={styles.metricQuote}>
                    {formatUsdcValue(treasury.balances.native.usdcValue)} USDC
                  </span>
                )}
              </div>
              <div className={`${styles.metric} ${styles.secondaryMetric}`}>
                <Image className={styles.metricIcon} src="/tokens/usdc.webp" alt="" width={20} height={20} />
                <span className={styles.metricLabel}>Base USDC</span>
                <strong className={styles.metricValue}>
                  {formatBalance(treasury.balances.usdc.amount, 2)}
                  {treasury.balances.usdc.amount !== null && <small> USDC</small>}
                </strong>
              </div>
              <div className={`${styles.metric} ${styles.secondaryMetric}`}>
                <Image className={styles.metricIcon} src="/tokens/usdc.webp" alt="" width={20} height={20} />
                <span className={styles.metricLabel}>Polymarket collateral</span>
                <strong className={styles.metricValue}>
                  {formatBalance(treasury.balances.tradingCollateral.amount, 2)}
                  {treasury.balances.tradingCollateral.amount !== null && <small> pUSD</small>}
                </strong>
                <span className={styles.metricQuote}>Tradable on the CLOB</span>
              </div>
              <div className={`${styles.metric} ${styles.secondaryMetric}`}>
                <Image className={styles.metricIcon} src="/tokens/usdc.webp" alt="" width={20} height={20} />
                <span className={styles.metricLabel}>Polygon USDC.e</span>
                <strong className={styles.metricValue}>
                  {formatBalance(treasury.balances.wrappableUsdc.amount, 2)}
                  {treasury.balances.wrappableUsdc.amount !== null && <small> USDC.e</small>}
                </strong>
                <span className={styles.metricQuote}>
                  Wrap into pUSD before trading. {formatBalance(treasury.balances.polygonNative.amount, 4)} POL for gas
                </span>
              </div>
              <div className={`${styles.metric} ${styles.secondaryMetric}`}>
                <Image className={styles.metricIcon} src="/icons/ui-diamond.svg" alt="" width={20} height={20} />
                <span className={styles.metricLabel}>Diamonds</span>
                <strong className={styles.metricValue}>
                  {formatBalance(treasury.balances.credits.amount, 2)}
                  {treasury.balances.credits.amount !== null && <small> Diamonds</small>}
                </strong>
                <span className={styles.metricQuote}>Unpriced</span>
              </div>
            </div>
            <div className={styles.footer}>
              {treasury.wallet.address && treasury.wallet.explorerUrl && (
                <a className={styles.walletLink} href={treasury.wallet.explorerUrl} target="_blank" rel="noreferrer">
                  <span>Wallet {shortAddress(treasury.wallet.address)}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              )}
              <button
                type="button"
                className={styles.swapBadge}
                onClick={() => setShowTreasurySwap(true)}
              >
                Swap
              </button>
            </div>
          </>
        ) : null}
      </section>

      <TreasurySwapModal open={showTreasurySwap} onClose={() => setShowTreasurySwap(false)} />
    </>
  );
}

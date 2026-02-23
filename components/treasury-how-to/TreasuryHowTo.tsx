'use client';

import { useState } from 'react';
import styles from './TreasuryHowTo.module.css';

const UNISWAP_LINK = `https://app.uniswap.org/swap?outputCurrency=${process.env.NEXT_PUBLIC_APPLE_TOKEN_ADDRESS || '0xE8a48daB9d307d74aBC8657421f8a2803661FB07'}&chain=base`;

export function HowToButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={styles.howToButton} onClick={() => setOpen(true)}>
        How It Works
      </button>
      {open && <TreasuryHowToModal onClose={() => setOpen(false)} />}
    </>
  );
}

function TreasuryHowToModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>How It Works</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.body}>
          {/* What is $APPLE */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>What is $APPLE?</div>
            <p className={styles.sectionText}>
              <span className={styles.highlight}>$APPLE</span> is a token that shares profits. Hold it and you earn a cut of Azura&apos;s weekly trading wins.
            </p>
          </div>

          {/* How to Buy */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>How to Buy</div>
            <p className={styles.sectionText}>
              Swap USDC for APPLE on Uniswap (Base).
            </p>
            <a
              href={UNISWAP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.buyLink}
            >
              Buy $APPLE &rarr;
            </a>
          </div>

          {/* How Profits Work */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>How Profits Work</div>
            <ol className={styles.stepList}>
              <li className={styles.step}>
                <span className={styles.stepNumber}>1</span>
                <span>Azura finds bets where the price looks wrong.</span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber}>2</span>
                <span>If the gap is big enough, Azura trades.</span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber}>3</span>
                <span>Every week, profits are added up.</span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber}>4</span>
                <span>Good week: <span className={styles.highlight}>80%</span> sent to holders, <span className={styles.highlight}>20%</span> kept for costs.</span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber}>5</span>
                <span>Bad week: nothing happens. Holders don&apos;t lose.</span>
              </li>
            </ol>
          </div>

          {/* Risk Disclaimers */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Risks</div>
            <div className={styles.disclaimer}>
              This is experimental. You could lose money. The token price can drop to zero. Only spend what you can afford to lose. Not financial advice.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default TreasuryHowToModal;

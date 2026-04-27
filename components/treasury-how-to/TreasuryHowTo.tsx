'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './TreasuryHowTo.module.css';

export function HowToButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={styles.howToButton} onClick={() => setOpen(true)}>
        How It Works
      </button>
      {open && createPortal(
        <TreasuryHowToModal onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}

function TreasuryHowToModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>How Blue Trades</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.body}>
          {/* Overview */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Edge Detection on Kalshi</div>
            <p className={styles.sectionText}>
              Blue scans <span className={styles.highlight}>Kalshi</span>, a CFTC-regulated US prediction market exchange, for binary outcomes that look mispriced relative to a <span className={styles.highlight}>Black-Scholes</span> short-dated model. When the market price diverges from the model fair by more than 3%, it logs a sized signal you can review before any capital is committed.
            </p>
          </div>

          {/* The Pipeline */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>The Pipeline</div>
            <ol className={styles.stepList}>
              <li className={styles.step}>
                <span className={styles.stepNumber}>1</span>
                <div>
                  <span className={styles.stepLabel}>Scan</span>
                  <span className={styles.stepDesc}>Fetch curated Kalshi markets across crypto, AI, sports, and politics. Filter for active markets with 2-98% prices, sufficient volume, and end dates within 90 days.</span>
                </div>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber}>2</span>
                <div>
                  <span className={styles.stepLabel}>Price</span>
                  <span className={styles.stepDesc}>Run a Black-Scholes binary pricer against the live spot tape from CoinGecko. Compute model fair value, market price, and divergence in real time.</span>
                </div>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber}>3</span>
                <div>
                  <span className={styles.stepLabel}>Size</span>
                  <span className={styles.stepDesc}>Apply quarter-Kelly criterion to determine notional size. Max 5% per position, max 40% total exposure. Conservative sizing survives estimation errors.</span>
                </div>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber}>4</span>
                <div>
                  <span className={styles.stepLabel}>Signal</span>
                  <span className={styles.stepDesc}>Emit a SIGNAL entry to the live execution log with direction, ticker, edge, and Kelly fraction. Order placement is gated &mdash; nothing routes without explicit approval.</span>
                </div>
              </li>
            </ol>
          </div>

          {/* Decision Framework */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Bayesian Decision Framework</div>
            <div className={styles.frameworkGrid}>
              <div className={styles.frameworkItem}>
                <span className={styles.frameworkLabel}>EV</span>
                <span className={styles.frameworkDesc}>Tells you whether to act</span>
              </div>
              <div className={styles.frameworkItem}>
                <span className={styles.frameworkLabel}>Base Rates</span>
                <span className={styles.frameworkDesc}>Ground estimates in reality</span>
              </div>
              <div className={styles.frameworkItem}>
                <span className={styles.frameworkLabel}>Sunk Costs</span>
                <span className={styles.frameworkDesc}>Tell you what to ignore</span>
              </div>
              <div className={styles.frameworkItem}>
                <span className={styles.frameworkLabel}>Bayes&apos; Theorem</span>
                <span className={styles.frameworkDesc}>How to update beliefs</span>
              </div>
              <div className={styles.frameworkItem}>
                <span className={styles.frameworkLabel}>Survivorship Bias</span>
                <span className={styles.frameworkDesc}>What&apos;s missing from the picture</span>
              </div>
              <div className={styles.frameworkItem}>
                <span className={styles.frameworkLabel}>Quarter-Kelly</span>
                <span className={styles.frameworkDesc}>How much to commit</span>
              </div>
            </div>
          </div>

          {/* Risk Controls */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Risk Controls</div>
            <div className={styles.riskGrid}>
              <div className={styles.riskItem}>
                <span className={styles.riskValue}>3%</span>
                <span className={styles.riskLabel}>Min edge to trade</span>
              </div>
              <div className={styles.riskItem}>
                <span className={styles.riskValue}>5%</span>
                <span className={styles.riskLabel}>Max per position</span>
              </div>
              <div className={styles.riskItem}>
                <span className={styles.riskValue}>2</span>
                <span className={styles.riskLabel}>Max trades per cycle</span>
              </div>
              <div className={styles.riskItem}>
                <span className={styles.riskValue}>30+</span>
                <span className={styles.riskLabel}>Min confidence score</span>
              </div>
            </div>
          </div>

          {/* Architecture */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Architecture</div>
            <div className={styles.archDiagram}>
              <div className={styles.archRow}>
                <span className={styles.archNode}>Vercel Cron</span>
                <span className={styles.archArrow}>&rarr;</span>
                <span className={styles.archNode}>Kalshi API</span>
                <span className={styles.archArrow}>&rarr;</span>
                <span className={styles.archNode}>Black-Scholes</span>
              </div>
              <div className={styles.archRow}>
                <span className={styles.archNode}>Quarter-Kelly</span>
                <span className={styles.archArrow}>&rarr;</span>
                <span className={styles.archNode}>Signal Log</span>
                <span className={styles.archArrow}>&rarr;</span>
                <span className={styles.archNodeHighlight}>Kalshi Orderbook</span>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className={styles.section}>
            <div className={styles.disclaimer}>
              Experimental autonomous trading system. Past performance does not predict future results. The trading treasury is separate from governance funds. Only deposit what you can afford to lose.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default TreasuryHowToModal;

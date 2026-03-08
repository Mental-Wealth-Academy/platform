'use client';

import { useState } from 'react';
import styles from './TreasuryHowTo.module.css';

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
          <h2 className={styles.title}>How Azura Trades</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.body}>
          {/* Overview */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Autonomous Prediction Market Trading</div>
            <p className={styles.sectionText}>
              Azura is a <span className={styles.highlight}>Chainlink CRE workflow</span> that runs inside the Decentralized Oracle Network (DON). Every 30 minutes, it scans Polymarket for mispriced markets, analyzes them with <span className={styles.highlight}>Anthropic Claude</span>, and executes trades autonomously &mdash; no centralized server, no human in the loop.
            </p>
          </div>

          {/* The Pipeline */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>The CRE Pipeline</div>
            <ol className={styles.stepList}>
              <li className={styles.step}>
                <span className={styles.stepNumber}>1</span>
                <div>
                  <span className={styles.stepLabel}>Scan</span>
                  <span className={styles.stepDesc}>Fetch top markets from the Polymarket CLOB via Gamma API. Filter for active markets with 5-95% prices and sufficient liquidity.</span>
                </div>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber}>2</span>
                <div>
                  <span className={styles.stepLabel}>Analyze</span>
                  <span className={styles.stepDesc}>Send candidates to Claude with a Bayesian framework: base rates, Bayes&apos; theorem updates, survivorship bias checks, sunk cost detection, and expected value calculation.</span>
                </div>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber}>3</span>
                <div>
                  <span className={styles.stepLabel}>Size</span>
                  <span className={styles.stepDesc}>Apply quarter-Kelly criterion to determine position size. Max 5% of treasury per trade, scaled by confidence score. Conservative sizing survives estimation errors.</span>
                </div>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber}>4</span>
                <div>
                  <span className={styles.stepLabel}>Execute</span>
                  <span className={styles.stepDesc}>Submit DON-signed reports to AzuraMarketTrader on-chain. The contract routes USDC into the Polymarket CLOB position.</span>
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
                <span className={styles.archNode}>CRE Cron (30m)</span>
                <span className={styles.archArrow}>&rarr;</span>
                <span className={styles.archNode}>Gamma API</span>
                <span className={styles.archArrow}>&rarr;</span>
                <span className={styles.archNode}>Claude Analysis</span>
              </div>
              <div className={styles.archRow}>
                <span className={styles.archNode}>Quarter-Kelly</span>
                <span className={styles.archArrow}>&rarr;</span>
                <span className={styles.archNode}>DON Report</span>
                <span className={styles.archArrow}>&rarr;</span>
                <span className={styles.archNodeHighlight}>Polymarket CLOB</span>
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

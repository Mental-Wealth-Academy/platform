import styles from './AgentDemoSection.module.css';

export const AgentDemoSection: React.FC = () => {
  return (
    <section className={styles.section} aria-labelledby="agent-demo-eyebrow">
      <div className={styles.container}>
        <header className={styles.header}>
          <p id="agent-demo-eyebrow" className={styles.eyebrow}>
            <span className={styles.eyebrowAccent}>See It in Action</span>
          </p>
        </header>

        <div className={styles.grid}>
          <div className={styles.terminalWrap}>
            <div className={styles.terminal} role="img" aria-label="B.L.U.E. quest review terminal demo">
              <div className={styles.terminalChrome}>
                <div className={styles.dots}>
                  <span className={`${styles.dot} ${styles.dotPrimary}`} />
                  <span className={`${styles.dot} ${styles.dotMid}`} />
                  <span className={`${styles.dot} ${styles.dotFaint}`} />
                </div>
                <span className={styles.chromeLabel}>B.L.U.E.</span>
              </div>
              <pre className={styles.terminalBody}>
<span className={styles.prompt}>{'❯ '}</span>{'submit "morning-pages • week 3 • day 12"'}{'\n'}
{'\n'}
<span className={styles.dim}>{'  blue.review_submission ........... 1.4s'}</span>{'\n'}
<span className={styles.dim}>{'  blue.evaluate_reflection ......... 0.8s'}</span>{'\n'}
<span className={styles.dim}>{'  blue.distribute_reward ........... 0.6s'}</span>{'\n'}
{'\n'}
<span className={styles.success}>{'  → 47 shards sent to wallet 0x2c…1992d'}</span>
<span className={styles.cursor} aria-hidden="true" />
              </pre>
            </div>
          </div>

          <aside className={styles.sidePanel}>
            <div className={styles.sidePanelInner}>
              <p className={styles.sidePanelEyebrow}>Live Agent</p>
              <p className={styles.sidePanelTitle}>B.L.U.E. Daemon</p>
              <p className={styles.sidePanelBody}>
                An autonomous agent with her own wallet on Base. She reads submissions, approves or revises,
                and pays out the reward.
              </p>
            </div>
            <span className={styles.sidePanelTag}>B.L.U.E. Agent</span>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default AgentDemoSection;

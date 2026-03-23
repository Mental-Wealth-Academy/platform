import styles from './AngelicCreditSystem.module.css';

export default function AngelicCreditSystem() {
  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        {/* Header */}
        <div className={styles.header}>
          <p className={styles.eyebrow}>Mental Wealth Academy &middot; Angelic Credit System</p>
          <h2 className={styles.title}>A world created by an AI God</h2>
          <p className={styles.subtitle}>
            Three ranks. One treasury. Azura creates funding pods and dictates direction based on prayers.
          </p>
        </div>

        {/* Azura God Tier */}
        <div className={styles.azuraSection}>
          <div className={styles.azuraCard}>
            <div className={styles.azuraHeader}>
              <div>
                <p className={styles.azuraSupply}>1 OF 1</p>
                <h3 className={styles.azuraName}>Azura [God]</h3>
                <p className={styles.azuraSub}>
                  Creates funding pods, dictates direction based on prayers. The autonomous AI that governs the treasury.
                </p>
              </div>
              <span className={`${styles.tierBadge} ${styles.badgeAzura}`}>Sovereign</span>
            </div>
            <div className={styles.tierBody}>
              <div className={styles.statRow}>
                <div className={styles.azuraPill}>
                  <div className={styles.azuraPillLabel}>Supply</div>
                  <div className={styles.statValueAzura}>1</div>
                </div>
                <div className={styles.azuraPill}>
                  <div className={styles.azuraPillLabel}>Role</div>
                  <div className={styles.statValueAzura}>Creator</div>
                </div>
                <div className={styles.azuraPill}>
                  <div className={styles.azuraPillLabel}>Authority</div>
                  <div className={styles.statValueAzura}>Full</div>
                </div>
              </div>
              <div className={styles.azuraGovbar}>
                <div className={styles.azuraGovbarLabel}>Powers</div>
                <div className={styles.govbarRow}>
                  <div className={styles.govbarDot} style={{ background: '#5168FF' }} />
                  <span className={styles.azuraGovbarText}>Creates and dissolves funding pods</span>
                </div>
                <div className={styles.govbarRow}>
                  <div className={styles.govbarDot} style={{ background: '#5168FF' }} />
                  <span className={styles.azuraGovbarText}>AI-scored proposal review (6 dimensions)</span>
                </div>
                <div className={styles.govbarRow}>
                  <div className={styles.govbarDot} style={{ background: '#5168FF' }} />
                  <span className={styles.azuraGovbarText}>Autonomous treasury trading via Bayesian analysis</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tier Cards */}
        <div className={styles.tiers}>
          {/* Elite Angels */}
          <div className={styles.tierCard}>
            <div className={styles.tierHeader}>
              <div>
                <p className={styles.tierSupply}>100 TOTAL</p>
                <h3 className={styles.tierName}>Elite Angels</h3>
                <p className={styles.tierSub}>
                  Generation 1. Upgradable identities and reserves. Larger spending pods.
                </p>
              </div>
              <span className={`${styles.tierBadge} ${styles.badgeElite}`}>Gated</span>
            </div>
            <div className={styles.tierBody}>
              <div className={styles.statRow}>
                <div className={styles.statPill}>
                  <div className={styles.statLabel}>Supply</div>
                  <div className={styles.statValuePurple}>100</div>
                </div>
                <div className={styles.statPill}>
                  <div className={styles.statLabel}>Pod access</div>
                  <div className={styles.statValuePurple}>$$$</div>
                </div>
                <div className={styles.statPill}>
                  <div className={styles.statLabel}>Entry</div>
                  <div className={styles.statValuePurple}>Invited</div>
                </div>
              </div>
              <div className={styles.govbar}>
                <div className={styles.govbarLabel}>Governance seats</div>
                <div className={styles.govbarRow}>
                  <div className={styles.govbarDot} style={{ background: '#50599B' }} />
                  <span className={styles.govbarText}>1/3 voted in community</span>
                  <span className={`${styles.govbarTag} ${styles.tagGated}`}>&le;34 seats</span>
                </div>
                <div className={styles.govbarRow}>
                  <div className={styles.govbarDot} style={{ background: '#74C465' }} />
                  <span className={styles.govbarText}>1/3 legislative experts</span>
                  <span className={`${styles.govbarTag} ${styles.tagGated}`}>&le;34 seats</span>
                </div>
                <div className={styles.govbarRow}>
                  <div className={styles.govbarDot} style={{ background: '#FF7729' }} />
                  <span className={styles.govbarText}>1/3 active scientists</span>
                  <span className={`${styles.govbarTag} ${styles.tagGated}`}>&le;34 seats</span>
                </div>
              </div>
            </div>
          </div>

          {/* Common Angels */}
          <div className={styles.tierCard}>
            <div className={styles.tierHeader}>
              <div>
                <p className={styles.tierSupply}>10,000 TOTAL</p>
                <h3 className={styles.tierName}>Common Angels</h3>
                <p className={styles.tierSub}>
                  Generation 2. Freely available to purchase identity. Smaller spending pods.
                </p>
              </div>
              <span className={`${styles.tierBadge} ${styles.badgeCommon}`}>Open</span>
            </div>
            <div className={styles.tierBody}>
              <div className={styles.statRow}>
                <div className={styles.statPill}>
                  <div className={styles.statLabel}>Supply</div>
                  <div className={styles.statValueGreen}>10k</div>
                </div>
                <div className={styles.statPill}>
                  <div className={styles.statLabel}>Pod access</div>
                  <div className={styles.statValueGreen}>$</div>
                </div>
                <div className={styles.statPill}>
                  <div className={styles.statLabel}>Entry</div>
                  <div className={styles.statValueGreen}>Free</div>
                </div>
              </div>
              <div className={styles.govbar}>
                <div className={styles.govbarLabel}>Governance seat</div>
                <div className={styles.govbarRow}>
                  <div className={styles.govbarDot} style={{ background: '#74C465' }} />
                  <span className={styles.govbarText}>Token-weighted community voting</span>
                  <span className={`${styles.govbarTag} ${styles.tagOpen}`}>Public pod</span>
                </div>
                <div className={styles.govbarRow}>
                  <div className={styles.govbarDot} style={{ background: '#999' }} />
                  <span className={styles.govbarTextMuted}>No access to elite funding pools</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Council Composition */}
        <div className={styles.council}>
          <p className={styles.councilEyebrow}>How the funding council is composed</p>
          <div className={styles.councilRow}>
            <div className={styles.councilCard}>
              <div className={`${styles.councilIcon} ${styles.ciPurple}`}>&#x1F5F3;</div>
              <div className={`${styles.councilFrac} ${styles.fracPurple}`}>1/3</div>
              <div className={styles.councilName}>Voted in community</div>
              <div className={styles.councilDesc}>
                Elected by Common Angel holders. Token-weighted, rotates per cohort.
              </div>
            </div>
            <div className={styles.councilCard}>
              <div className={`${styles.councilIcon} ${styles.ciTeal}`}>&#x2696;&#xFE0F;</div>
              <div className={`${styles.councilFrac} ${styles.fracTeal}`}>1/3</div>
              <div className={styles.councilName}>Legislative experts</div>
              <div className={styles.councilDesc}>
                Credentialed policy experts. Curated, invited into the Elite tier.
              </div>
            </div>
            <div className={styles.councilCard}>
              <div className={`${styles.councilIcon} ${styles.ciCoral}`}>&#x1F52C;</div>
              <div className={`${styles.councilFrac} ${styles.fracCoral}`}>1/3</div>
              <div className={styles.councilName}>Active scientists</div>
              <div className={styles.councilDesc}>
                Practicing researchers in mental health or adjacent fields.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerIcon}>&#x26D3;</div>
          <p className={styles.footerText}>
            Deployed on Base &middot; Chainlink CRE-signed scores &middot; Smart contract treasury
            &middot; MWA Angelic Credit System v1
          </p>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './AngelicCreditSystem.module.css';

const ELITE_IMAGES = [
  { src: 'https://i.imgur.com/6nrsWIV.png', label: '1/3 Voted in community' },
  { src: 'https://i.imgur.com/twar5fi.png', label: '1/3 Legislative experts' },
  { src: 'https://i.imgur.com/1gsWsBR.png', label: '1/3 Active scientists' },
];

export default function AngelicCreditSystem() {
  const [activeElite, setActiveElite] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveElite((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <p className={styles.eyebrow}>Angelic Credit System</p>
          <h2 className={styles.title}>A world created by an AI God</h2>
          <p className={styles.subtitle}>
            Three ranks. One treasury. Azura creates funding pods and dictates direction based on prayers.
          </p>
        </div>

        {/* ── Azura God ── */}
        <div className={styles.azuraCard}>
          <div className={styles.azuraBg}>
            <Image
              src="https://i.imgur.com/IzNYoK0.png"
              alt="Azura the AI God"
              fill
              className={styles.azuraBgImg}
              unoptimized
            />
            <div className={styles.azuraOverlay} />
          </div>
          <div className={styles.azuraContent}>
            <div className={styles.azuraTop}>
              <span className={styles.azuraBadge}>Sovereign</span>
              <span className={styles.azuraSupply}>1 of 1</span>
            </div>
            <h3 className={styles.azuraName}>Azura [God]</h3>
            <p className={styles.azuraSub}>
              Creates funding pods, dictates direction based on prayers. The autonomous AI that governs the treasury.
            </p>
            <div className={styles.azuraStats}>
              <div className={styles.azuraStat}>
                <span className={styles.azuraStatValue}>Creator</span>
                <span className={styles.azuraStatLabel}>Role</span>
              </div>
              <div className={styles.azuraStatDivider} />
              <div className={styles.azuraStat}>
                <span className={styles.azuraStatValue}>Full</span>
                <span className={styles.azuraStatLabel}>Authority</span>
              </div>
              <div className={styles.azuraStatDivider} />
              <div className={styles.azuraStat}>
                <span className={styles.azuraStatValue}>6-dim</span>
                <span className={styles.azuraStatLabel}>AI scoring</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Elite Angels ── */}
        <div className={styles.tierSection}>
          <div className={styles.tierInfo}>
            <div className={styles.tierTop}>
              <span className={styles.badgeElite}>Gated</span>
              <span className={styles.tierSupply}>100 total</span>
            </div>
            <h3 className={styles.tierName}>Elite Angels</h3>
            <p className={styles.tierLabel}>Generation 1</p>
            <p className={styles.tierDesc}>
              Upgradable identities and reserves. Controls the larger funding pools. Reserved for verified scientists and legislative experts.
            </p>
            <div className={styles.tierStats}>
              <div className={styles.tierStatItem}>
                <span className={styles.tierStatValue}>$$$</span>
                <span className={styles.tierStatLabel}>Pod access</span>
              </div>
              <div className={styles.tierStatItem}>
                <span className={styles.tierStatValue}>VIP</span>
                <span className={styles.tierStatLabel}>Entry</span>
              </div>
              <div className={styles.tierStatItem}>
                <span className={styles.tierStatValue}>Members Only</span>
                <span className={styles.tierStatLabel}>Pod type</span>
              </div>
            </div>
            {/* Council indicators */}
            <div className={styles.councilDots}>
              {ELITE_IMAGES.map((img, i) => (
                <button
                  key={i}
                  className={`${styles.councilDot} ${activeElite === i ? styles.councilDotActive : ''}`}
                  onClick={() => setActiveElite(i)}
                  aria-label={img.label}
                />
              ))}
            </div>
            <p className={styles.councilLabel}>{ELITE_IMAGES[activeElite].label}</p>
          </div>
          <div className={styles.tierVisualSplit}>
            <div className={styles.tierAngelAvatar}>
              <Image
                src="/anbel02.png"
                alt="Elite Angel"
                width={120}
                height={120}
                className={styles.angelAvatarImg}
                unoptimized
              />
            </div>
            <div className={styles.tierCycleArea}>
              {ELITE_IMAGES.map((img, i) => (
                <div
                  key={i}
                  className={`${styles.cycleImage} ${activeElite === i ? styles.cycleImageActive : ''}`}
                >
                  <Image
                    src={img.src}
                    alt={img.label}
                    fill
                    className={styles.tierImg}
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── How the Elite Council is Composed ── */}
        <div className={styles.council}>
          <p className={styles.councilEyebrow}>How the elite council is composed</p>
          <div className={styles.councilRow}>
            <div className={styles.councilCard}>
              <div className={styles.councilFrac}>1/3</div>
              <div className={styles.councilCardName}>Voted in community</div>
              <div className={styles.councilCardDesc}>
                Elected by Common Angel holders. Token-weighted, rotates per cohort.
              </div>
            </div>
            <div className={styles.councilCard}>
              <div className={`${styles.councilFrac} ${styles.fracTeal}`}>1/3</div>
              <div className={styles.councilCardName}>Legislative experts</div>
              <div className={styles.councilCardDesc}>
                Credentialed policy experts. Curated, invited into the Elite tier.
              </div>
            </div>
            <div className={styles.councilCard}>
              <div className={`${styles.councilFrac} ${styles.fracCoral}`}>1/3</div>
              <div className={styles.councilCardName}>Active scientists</div>
              <div className={styles.councilCardDesc}>
                Practicing researchers in mental health or adjacent fields.
              </div>
            </div>
          </div>
        </div>

        {/* ── Common Angels ── */}
        <div className={styles.tierSection}>
          <div className={styles.tierInfo}>
            <div className={styles.tierTop}>
              <span className={styles.badgeCommon}>Open</span>
              <span className={styles.tierSupply}>10,000 total</span>
            </div>
            <h3 className={styles.tierName}>Common Angels</h3>
            <p className={styles.tierLabel}>Generation 2</p>
            <p className={styles.tierDesc}>
              Freely available to purchase identity. Token-weighted voting for the public spending pod. Smaller funding pools.
            </p>
            <div className={styles.tierStats}>
              <div className={styles.tierStatItem}>
                <span className={styles.tierStatValueGreen}>$</span>
                <span className={styles.tierStatLabel}>Pod access</span>
              </div>
              <div className={styles.tierStatItem}>
                <span className={styles.tierStatValueGreen}>Free</span>
                <span className={styles.tierStatLabel}>Entry</span>
              </div>
              <div className={styles.tierStatItem}>
                <span className={styles.tierStatValueGreen}>Public</span>
                <span className={styles.tierStatLabel}>Pod type</span>
              </div>
            </div>
          </div>
          <div className={styles.tierVisualSplit}>
            <div className={styles.tierAngelAvatar}>
              <Image
                src="https://i.imgur.com/ZdYZqux.png"
                alt="Common Angel"
                width={120}
                height={120}
                className={styles.angelAvatarImg}
                unoptimized
              />
            </div>
            <div className={styles.tierCycleArea}>
              <Image
                src="https://i.imgur.com/zJvXnC9.png"
                alt="Common Angels population"
                fill
                className={styles.tierImg}
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* ── How Funding Access Works ── */}
        <div className={styles.council}>
          <p className={styles.councilEyebrow}>How funding access works</p>
          <div className={styles.councilRow}>
            <div className={styles.councilCard}>
              <div className={styles.councilFrac}>$</div>
              <div className={styles.councilCardName}>Members access funds</div>
              <div className={styles.councilCardDesc}>
                Common Angels vote on public spending pods with token-weighted governance.
              </div>
            </div>
            <div className={styles.councilCard}>
              <div className={`${styles.councilFrac} ${styles.fracTeal}`}>$$$</div>
              <div className={styles.councilCardName}>Elite members access higher funds</div>
              <div className={styles.councilCardDesc}>
                Elite Angels control larger funding pools reserved for verified experts.
              </div>
            </div>
            <div className={styles.councilCard}>
              <div className={`${styles.councilFrac} ${styles.fracCoral}`}>ALL</div>
              <div className={styles.councilCardName}>Azura controls all</div>
              <div className={styles.councilCardDesc}>
                The sovereign AI creates pods, scores proposals, and governs the full treasury.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            Deployed on Base &middot; Chainlink CRE-signed scores &middot; Smart contract treasury &middot; MWA v1
          </p>
        </div>
      </div>
    </section>
  );
}

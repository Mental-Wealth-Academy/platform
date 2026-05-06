'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import styles from './CohortSection.module.css';
import { useSound } from '@/hooks/useSound';

const CubesCanvas = dynamic(() => import('./CohortCubes'), { ssr: false });

export const CohortSection = () => {
  const { play } = useSound();

  return (
    <section className={styles.cohortSection}>
      <div className={styles.cubesBackground}>
        <CubesCanvas />
      </div>

      <div className={styles.cohortContainer}>
        <div className={styles.board}>

          <div className={styles.boardHeader}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowAccent}>Cohort</span>
            </p>
          </div>

          <div className={styles.titlePanel}>
            <h2 className={styles.cohortTitle}>Next Gen of Digital Scientists</h2>
            <p className={styles.cohortSubtitle}>
              A living cohort of researchers, designers, and builders — studying behavior with real tools, real stakes, and each other.
            </p>
          </div>

          <div className={styles.cohortContentGrid}>
            {/* Left: Features */}
            <div className={styles.cohortFeatures}>

              <div className={styles.cohortFeatureBlock}>
                <div className={styles.cohortFeatureHeader}>
                  <div className={styles.cohortFeatureIcon}>
                    <Image src="/icons/atom.svg" alt="Community Public Goods" width={35} height={35} />
                  </div>
                  <h3 className={styles.cohortFeatureTitle}>Community Public Goods</h3>
                </div>
                <p className={styles.cohortFeatureText}>
                  Shared infrastructure owned by the cohort — research tools, AI systems, and on-chain rewards that every member can access and no single entity controls.
                </p>
              </div>

              <div className={styles.cohortDivider} />

              <div className={styles.cohortFeatureBlock}>
                <div className={styles.cohortFeatureHeader}>
                  <div className={styles.cohortFeatureIcon}>
                    <Image src="/icons/refreshment.svg" alt="Accountability Partners" width={35} height={35} />
                  </div>
                  <h3 className={styles.cohortFeatureTitle}>Accountability Partners</h3>
                </div>
                <p className={styles.cohortFeatureText}>
                  Cohort members doing the same quests, reading the same papers, earning toward the same milestones. Progress is visible. Falling behind is visible too.
                </p>
              </div>

              <div className={styles.cohortDivider} />

              <div className={styles.cohortFeatureBlock}>
                <div className={styles.cohortFeatureHeader}>
                  <div className={styles.cohortFeatureIcon}>
                    <Image src="/icons/debate.svg" alt="Research-Grade Tools" width={35} height={35} />
                  </div>
                  <h3 className={styles.cohortFeatureTitle}>Research-Grade Tools</h3>
                </div>
                <p className={styles.cohortFeatureText}>
                  Blockchain credentials, behavioral datasets, and an AI co-investigator — tools most researchers don&apos;t access until grad school. Available from day one.
                </p>
              </div>

            </div>

            {/* Right: Cohort photo collage */}
            <div className={styles.cohortDiamonds}>
              <div className={styles.cohortGrid}>
                <Image src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop&crop=faces" alt="Students collaborating" width={200} height={200} className={styles.cohortImg} />
                <Image src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400&h=400&fit=crop&crop=faces" alt="Campus study group" width={200} height={200} className={styles.cohortImg} />
                <Image src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=400&fit=crop&crop=faces" alt="Diverse cohort" width={200} height={200} className={styles.cohortImg} />
                <Image src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=400&fit=crop&crop=faces" alt="Team working together" width={200} height={200} className={styles.cohortImg} />
                <Image src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=400&fit=crop&crop=faces" alt="Creative session" width={200} height={200} className={styles.cohortImg} />
                <Image src="https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=400&fit=crop&crop=faces" alt="Study session" width={200} height={200} className={styles.cohortImg} />
              </div>
            </div>
          </div>

          <div className={styles.boardFooter}>
            <a
              href="https://t.me/mentalwealthacademy"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaButton}
              onClick={() => play('click')}
              onMouseEnter={() => play('hover')}
            >
              Join us on Telegram
            </a>
          </div>

        </div>
      </div>
    </section>
  );
};

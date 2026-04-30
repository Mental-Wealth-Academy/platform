'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import styles from './SwarmsSection.module.css';
import { useSound } from '@/hooks/useSound';

const CubesCanvas = dynamic(() => import('./SwarmsCubes'), { ssr: false });

export const SwarmsSection = () => {
  const { play } = useSound();

  return (
    <section className={styles.swarmsSection}>
      <div className={styles.cubesBackground}>
        <CubesCanvas />
      </div>
      <div className={styles.swarmsContainer}>
        {/* Title */}
        <h2 className={styles.swarmsTitle}>
          Next Gen of Digital Scientists
        </h2>
        <p className={styles.swarmsSubtitle}>
          Build real friendships with people who support your growth.
        </p>

        {/* Content Grid  */}
        <div className={styles.swarmsContentGrid}>
          {/* Left: Features */}
          <div className={styles.swarmsFeatures}>
            {/* Feature 1 */}
            <div className={styles.swarmsDivider} />
            <div className={styles.swarmsFeatureBlock}>
              <div className={styles.swarmsFeatureHeader}>
                <div className={styles.swarmsFeatureIcon}>
                  <Image src="/icons/atom.svg" alt="Academic Foundation" width={35} height={35} />
                </div>
                <h3 className={styles.swarmsFeatureTitle}>Community Public Goods</h3>
              </div>
              <p className={styles.swarmsFeatureText}>
                Learn practical ideas that help you grow, reflect, and feel better each week.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={styles.swarmsDivider} />
            <div className={styles.swarmsFeatureBlock}>
              <div className={styles.swarmsFeatureHeader}>
                <div className={styles.swarmsFeatureIcon}>
                  <Image src="/icons/refreshment.svg" alt="Intellectual Refreshment" width={35} height={35} />
                </div>
                <h3 className={styles.swarmsFeatureTitle}>Accountability Partners</h3>
              </div>
              <p className={styles.swarmsFeatureText}>
                Stay on track with people who check in, support you, and want you to win.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={styles.swarmsDivider} />
            <div className={styles.swarmsFeatureBlock}>
              <div className={styles.swarmsFeatureHeader}>
                <div className={styles.swarmsFeatureIcon}>
                  <Image src="/icons/debate.svg" alt="Oracle Network" width={35} height={35} />
                </div>
                <h3 className={styles.swarmsFeatureTitle}>Futuristic Growth</h3>
              </div>
              <p className={styles.swarmsFeatureText}>
                Use simple tools, rewards, and progress tracking that make growth feel fun and interconnected.
              </p>
            </div>
          </div>

          {/* Right: Cohort photo collage */}
          <div className={styles.swarmsDiamonds}>
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
        {/* CTA */}
        <div className={styles.ctaWrapper}>
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
    </section>
  );
};

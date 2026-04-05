import React from 'react';
import Image from 'next/image';
import styles from './Hero.module.css';

const Hero: React.FC = () => {
  return (
    <div className={styles.heroContainer}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBackground}></div>
          <div className={styles.logoContainer}>
            <Image
              src="/icons/logo-spacey2k.png"
              alt="Spacey2k Logo"
              width={400}
              height={400}
              className={styles.logo}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;


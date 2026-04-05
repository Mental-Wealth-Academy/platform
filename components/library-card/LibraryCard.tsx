import React from 'react';
import Image from 'next/image';
import styles from './LibraryCard.module.css';

const LibraryCard: React.FC = () => {
  return (
    <div className={styles.libraryCard} data-intro="library-card">
      <div className={styles.header}>
        <span className={styles.title}>IPFS://Library</span>
        <div className={styles.icons}>
          <Image 
            src="/icons/badge-love.svg" 
            alt="Love badge" 
            width={24}
            height={24}
            className={styles.iconFrame}
          />
          <Image 
            src="/icons/badge-level-2.svg" 
            alt="Badge 2" 
            width={24}
            height={24}
            className={styles.iconFrame}
          />
          <Image 
            src="/icons/badge-level-3.svg" 
            alt="Badge 3" 
            width={24}
            height={24}
            className={styles.iconFrame}
          />
        </div>
      </div>
      
      <div className={styles.wrapper}>
        <div className={styles.transmissionCard}>
          <div className={styles.transmissionHeader}>
            <span className={styles.messageText}>message</span>
            <span className={styles.transmissionText}>INCOMING Transmission</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill}></div>
          </div>
        </div>
        
        <div className={styles.footer}>
          <span className={styles.footerText}>GM, let&apos;s check out some books...</span>
        </div>
      </div>
    </div>
  );
};

export default LibraryCard;


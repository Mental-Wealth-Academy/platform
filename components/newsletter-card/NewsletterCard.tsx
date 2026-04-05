import React from 'react';
import Image from 'next/image';
import styles from './NewsletterCard.module.css';

const NewsletterCard: React.FC = () => {
  return (
    <div className={styles.newsletterCard}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <span className={styles.title}>DAEMON://NEWSLETTER</span>
          <div className={styles.rightIcon}>
            <Image 
              src="/icons/badge-love.svg" 
              alt="Badge" 
              width={17.52} 
              height={17.52} 
              className={styles.iconImage}
            />
          </div>
        </div>
        
        <div className={styles.buttonWrapper}>
          <div className={styles.buttonBorder}>
            <a 
              href="https://mentalwealthacademy.net" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.newsletterButton}
            >
              <span className={styles.buttonText}>NEWSLETTER</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsletterCard;


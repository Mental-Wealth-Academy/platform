'use client';

import HomeBento from '@/components/home-bento/HomeBento';
import WelcomePremiumGate from '@/components/welcome-premium/WelcomePremiumGate';
import styles from './page.module.css';

export default function DaoPage() {
  return (
    <div className={styles.pageLayout}>
      <main className={styles.content}>
        <HomeBento />
      </main>
      <WelcomePremiumGate />
    </div>
  );
}

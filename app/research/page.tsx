'use client';

import SideNavigation from '@/components/side-navigation/SideNavigation';
import ResearchTab from './ResearchTab';
import styles from './research-page.module.css';

export default function ResearchPage() {
  return (
    <>
      <SideNavigation />
      <main className={styles.pageLayout}>
        <div className={styles.toolContent}>
          <ResearchTab />
        </div>
      </main>
    </>
  );
}

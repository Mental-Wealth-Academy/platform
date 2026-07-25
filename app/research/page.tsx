'use client';

import ResearchTab from './ResearchTab';
import styles from './research-page.module.css';

export default function ResearchPage() {
  return (
    <>
      <main className={styles.pageLayout}>
        <div className={styles.toolContent}>
          <ResearchTab />
        </div>
      </main>
    </>
  );
}

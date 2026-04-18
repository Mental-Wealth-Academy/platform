'use client';

import SideNavigation from '@/components/side-navigation/SideNavigation';
import GeneticsTab from '@/app/research/GeneticsTab';
import styles from '@/app/research/research-page.module.css';

export default function GeneticsPage() {
  return (
    <>
      <SideNavigation />
      <main className={styles.pageLayout}>
        <GeneticsTab />
      </main>
    </>
  );
}

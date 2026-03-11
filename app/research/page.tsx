'use client';

import { useState } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import GuidanceTab from './GuidanceTab';
import GeneticsTab from './GeneticsTab';
import ResearchTab from './ResearchTab';
import styles from './research-page.module.css';

type Tab = 'guidance' | 'genetics' | 'research';

const TABS: { id: Tab; label: string }[] = [
  { id: 'guidance', label: 'Guidance' },
  { id: 'genetics', label: 'Genetics' },
  { id: 'research', label: 'Research' },
];

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<Tab>('guidance');
  const { play } = useSound();

  return (
    <>
      <SideNavigation />
      <main className={styles.pageLayout}>
        <div className={styles.tabBar}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
              onClick={() => { play('click'); setActiveTab(tab.id); }}
              onMouseEnter={() => play('hover')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'guidance' && <GuidanceTab />}
          {activeTab === 'genetics' && <GeneticsTab />}
          {activeTab === 'research' && <ResearchTab />}
        </div>
      </main>
    </>
  );
}

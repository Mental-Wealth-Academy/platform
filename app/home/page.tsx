'use client';

import React from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import SurveyController from '@/components/survey-controller/SurveyController';
import SurveySpace from '@/components/survey-space/SurveySpace';
import BlueTerminal from '@/components/blue-terminal/BlueTerminal';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.content}>
        <SurveyController />
        <SurveySpace
          label="BLUE.SYS // TERMINAL"
          badges={[
            { label: 'ONLINE' },
            { label: 'SECURE' },
            { label: 'READY' },
            { label: 'MWA-36B' },
          ]}
        >
          <BlueTerminal />
        </SurveySpace>
      </main>
    </div>
  );
}

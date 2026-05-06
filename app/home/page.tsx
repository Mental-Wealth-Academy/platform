'use client';

import React, { useState, useCallback } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import SurveyController from '@/components/survey-controller/SurveyController';
import SurveySpace from '@/components/survey-space/SurveySpace';
import BlueTerminal, { type TestData } from '@/components/blue-terminal/BlueTerminal';
import SignFormModal from '@/components/sign-form-modal/SignFormModal';
import styles from './page.module.css';

export default function HomePage() {
  const [difficulty, setDifficulty] = useState(101);
  const [isSignFormOpen, setIsSignFormOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testData, setTestData] = useState<TestData | null>(null);

  const handleSignForm = useCallback(() => {
    setIsSignFormOpen(true);
  }, []);

  const handleLaunchQuest = useCallback(async () => {
    setIsSignFormOpen(false);
    setIsGenerating(true);
    setTestData(null);
    try {
      const res = await fetch('/api/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ difficulty, persona: 'B.L.U.E.' }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestData(data as TestData);
      }
    } catch {
      /* terminal will stay in generating state briefly then fall back */
    } finally {
      setIsGenerating(false);
    }
  }, [difficulty]);

  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.content}>
        <SurveyController
          onSignForm={handleSignForm}
          onDifficultyChange={setDifficulty}
        />
        <SurveySpace
          label="BLUE.SYS // TERMINAL"
          badges={[
            { label: 'ONLINE' },
            { label: 'SECURE' },
            { label: 'READY' },
            { label: 'MWA-36B' },
          ]}
        >
          <BlueTerminal testData={testData} isGenerating={isGenerating} />
        </SurveySpace>
      </main>

      {isSignFormOpen && (
        <SignFormModal
          difficulty={difficulty}
          onLaunch={handleLaunchQuest}
          onClose={() => setIsSignFormOpen(false)}
        />
      )}
    </div>
  );
}

'use client';

import React, { useState, useCallback } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import SurveyController from '@/components/survey-controller/SurveyController';
import SurveySpace from '@/components/survey-space/SurveySpace';
import BlueTerminal, { type TestAnswers, type TestCompletionResult, type TestData } from '@/components/blue-terminal/BlueTerminal';
import SignFormModal from '@/components/sign-form-modal/SignFormModal';
import { getTestShardReward } from '@/lib/test-rewards';
import styles from './page.module.css';

export default function HomePage() {
  const [difficulty, setDifficulty] = useState(101);
  const [isSignFormOpen, setIsSignFormOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const shardReward = getTestShardReward(difficulty);

  const handleSignForm = useCallback(() => {
    setIsSignFormOpen(true);
  }, []);

  const handleLaunchQuest = useCallback(async () => {
    setIsSignFormOpen(false);
    setIsGenerating(true);
    setTestData(null);
    setErrorMessage(null);
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
      } else {
        const data: { error?: string } = await res.json().catch(() => ({}));
        setErrorMessage(data.error || 'Test engine rejected the request. Sign in and try again.');
      }
    } catch {
      setErrorMessage('Test engine connection failed. Try again in a moment.');
    } finally {
      setIsGenerating(false);
    }
  }, [difficulty]);

  const handleSubmitQuest = useCallback(async (answers: TestAnswers): Promise<TestCompletionResult> => {
    if (!testData?.testId) {
      throw new Error('This test was not linked to your account. Generate a new test and try again.');
    }

    const res = await fetch('/api/generate-test/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ testId: testData.testId, answers }),
    });

    const data: { error?: string; shardsAwarded?: number; newShardCount?: number } = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Shard award failed.');
    }

    window.dispatchEvent(new Event('shardsUpdated'));
    return {
      shardsAwarded: data.shardsAwarded ?? testData.shardReward ?? shardReward,
      newShardCount: data.newShardCount ?? null,
    };
  }, [shardReward, testData]);

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
          <BlueTerminal
            testData={testData}
            isGenerating={isGenerating}
            errorMessage={errorMessage}
            onSubmitQuest={handleSubmitQuest}
          />
        </SurveySpace>
      </main>

      {isSignFormOpen && (
        <SignFormModal
          difficulty={difficulty}
          shardReward={shardReward}
          onLaunch={handleLaunchQuest}
          onClose={() => setIsSignFormOpen(false)}
        />
      )}
    </div>
  );
}

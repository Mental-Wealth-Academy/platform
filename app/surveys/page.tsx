'use client';

import React, { useCallback, useMemo, useState } from 'react';
import SurveyController from '@/components/survey-controller/SurveyController';
import SurveySpace from '@/components/survey-space/SurveySpace';
import BlueTerminal from '@/components/blue-terminal/BlueTerminal';
import QuizModal from '@/components/survey/QuizModal';
import SurveyResultsModal from '@/components/survey/SurveyResultsModal';
import AttachmentCertificateMint from '@/components/survey/AttachmentCertificateMint';
import { STANDARD_SURVEYS } from '@/components/survey/Surveys';
import type { Survey, SurveyAnswers, SurveyResults } from '@/components/survey/types';
import { VIA_SURVEY } from '@/components/survey/viaQuestions';
import styles from './page.module.css';

const AVAILABLE_SURVEYS: Survey[] = [VIA_SURVEY, ...STANDARD_SURVEYS];

function getSurveyById(id: string): Survey {
  return AVAILABLE_SURVEYS.find((survey) => survey.id === id) ?? AVAILABLE_SURVEYS[0];
}

function getSurveyIntroCopy(survey: Survey): { meta: string; text: string; note: string } {
  switch (survey.id) {
    case 'via-character-strengths':
      return {
        meta: '240-item strengths inventory',
        text: 'The VIA is a peer-reviewed instrument used in clinical psychology and positive psychology research worldwide. It maps 24 character strengths across 6 virtues and ranks them from your highest to lowest.',
        note: 'Developed by Martin Seligman and Christopher Peterson at UPenn.',
      };
    case 'big-five':
      return {
        meta: '20-question personality model',
        text: 'The most replicated personality framework in psychological science. Your scores on Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism describe how you actually operate — not how you wish you did.',
        note: 'Used in clinical research, hiring science, and relationship psychology worldwide.',
      };
    case 'moral-foundations':
      return {
        meta: 'Values mapping',
        text: "Jonathan Haidt's research found that moral disagreements run deeper than opinion — people weight different foundations entirely. This shows which of the five foundations are driving your sense of right and wrong.",
        note: 'Care, Fairness, Loyalty, Authority, Sanctity.',
      };
    case 'attachment-style':
      return {
        meta: 'Relationship psychology',
        text: 'Your attachment style shapes how you connect, communicate, and respond under relational stress. Secure, Anxious, Avoidant, or Fearful-Avoidant — knowing yours is one of the most practically useful things in mental health.',
        note: 'Based on decades of research by Fraley, Hazan, and Shaver.',
      };
    default:
      return {
        meta: '10 question personality read',
        text: 'A short personality quiz with sharper teeth. Pick the answer with the strongest charge and let Blue turn the pattern into a clean read.',
        note: 'No wrong answers. Only suspiciously revealing ones.',
      };
  }
}

export default function SurveysPage() {
  const [selectedSurveyId, setSelectedSurveyId] = useState(AVAILABLE_SURVEYS[0].id);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showMintInterstitial, setShowMintInterstitial] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [surveyResults, setSurveyResults] = useState<SurveyResults | null>(null);
  const [mintInfo, setMintInfo] = useState<{ username: string; walletAddress: string; profileType: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSurvey = useMemo(() => getSurveyById(selectedSurveyId), [selectedSurveyId]);
  const selectedSurveyIntro = useMemo(() => getSurveyIntroCopy(selectedSurvey), [selectedSurvey]);

  const handleSurveyTypeChange = useCallback((surveyId: string) => {
    setSelectedSurveyId(surveyId);
    setErrorMessage(null);
    setShowQuizModal(false);
    setShowMintInterstitial(false);
    setShowResultsModal(false);
    setActiveSurvey(null);
    setSurveyResults(null);
    setMintInfo(null);
  }, []);

  const handleStartSurvey = useCallback(() => {
    setActiveSurvey(selectedSurvey);
    setShowQuizModal(true);
    setShowMintInterstitial(false);
    setShowResultsModal(false);
    setSurveyResults(null);
    setMintInfo(null);
    setErrorMessage(null);
  }, [selectedSurvey]);

  const handleSurveyComplete = useCallback(async (answers: SurveyAnswers) => {
    if (!activeSurvey) return;

    try {
      const processResponse = await fetch('/api/survey/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          surveyId: activeSurvey.id,
          surveyTitle: activeSurvey.title,
          answers,
        }),
      });

      const processData: {
        success?: boolean;
        results?: SurveyResults;
        error?: string;
        mintInfo?: { username: string; walletAddress: string; profileType: string };
      } = await processResponse.json().catch(() => ({}));

      if (!processResponse.ok || !processData.success || !processData.results) {
        throw new Error(processData.error || 'Failed to process survey results.');
      }

      setSurveyResults(processData.results);
      setShowQuizModal(false);
      setErrorMessage(null);

      if (processData.mintInfo && activeSurvey?.id === 'attachment-style') {
        setMintInfo(processData.mintInfo);
        setShowMintInterstitial(true);
      } else {
        setShowResultsModal(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete survey. Please try again.';
      setErrorMessage(message);
      alert(message);
      throw error;
    }
  }, [activeSurvey]);

  const handleMintDone = useCallback(() => {
    setShowMintInterstitial(false);
    setShowResultsModal(true);
  }, []);

  return (
    <div className={styles.pageLayout}>
      <main className={styles.content}>
        <SurveyController
          selectedSurveyId={selectedSurveyId}
          onSurveyTypeChange={handleSurveyTypeChange}
          onStartSurvey={handleStartSurvey}
          showDifficulty={false}
          ctaLabel="Begin survey"
        />
        <SurveySpace label="" badges={[]}>
          {showQuizModal ? (
            <QuizModal
              isOpen={showQuizModal}
              onClose={() => {
                setShowQuizModal(false);
                setActiveSurvey(null);
              }}
              survey={activeSurvey}
              variant="inline"
              onComplete={handleSurveyComplete}
            />
          ) : showMintInterstitial && mintInfo ? (
            <AttachmentCertificateMint
              profileType={mintInfo.profileType}
              username={mintInfo.username}
              walletAddress={mintInfo.walletAddress}
              onMintComplete={handleMintDone}
              onSkip={handleMintDone}
            />
          ) : showResultsModal ? (
            <SurveyResultsModal
              isOpen={showResultsModal}
              onClose={() => {
                setShowResultsModal(false);
                setSurveyResults(null);
              }}
              results={surveyResults}
              variant="inline"
            />
          ) : (
            <BlueTerminal
              errorMessage={errorMessage}
              idleMeta={selectedSurveyIntro.meta}
              idleTitle={selectedSurvey.title}
              idleText={selectedSurveyIntro.text}
              idleNote={selectedSurveyIntro.note}
            />
          )}
        </SurveySpace>
      </main>
    </div>
  );
}

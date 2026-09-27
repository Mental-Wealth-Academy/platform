'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SurveyController from '@/components/survey-controller/SurveyController';
import SurveySpace from '@/components/survey-space/SurveySpace';
import BlueTerminal from '@/components/blue-terminal/BlueTerminal';
import QuizModal from '@/components/survey/QuizModal';
import SurveyAnalysisProgress from '@/components/survey/SurveyAnalysisProgress';
import SurveyEmailGateModal from '@/components/survey/SurveyEmailGateModal';
import SurveyResultsModal from '@/components/survey/SurveyResultsModal';
import AttachmentCertificateMint from '@/components/survey/AttachmentCertificateMint';
import { STANDARD_SURVEYS } from '@/components/survey/Surveys';
import type { Survey, SurveyAnswers, SurveyResults } from '@/components/survey/types';
import { VIA_SURVEY } from '@/components/survey/viaQuestions';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import { usePrivy } from '@privy-io/react-auth';
import styles from './page.module.css';

const sceneUrl = dailySceneBackgroundUrl();

const [attachmentSurvey, ...otherStandardSurveys] = STANDARD_SURVEYS;
const AVAILABLE_SURVEYS: Survey[] = [attachmentSurvey, VIA_SURVEY, ...otherStandardSurveys];

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
  const { authenticated, login } = usePrivy();
  const [selectedSurveyId, setSelectedSurveyId] = useState(AVAILABLE_SURVEYS[0].id);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [showMintInterstitial, setShowMintInterstitial] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [surveyResults, setSurveyResults] = useState<SurveyResults | null>(null);
  const [completedAnswers, setCompletedAnswers] = useState<SurveyAnswers | null>(null);
  const [mintInfo, setMintInfo] = useState<{ username: string; walletAddress: string; profileType: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const selectedSurvey = useMemo(() => getSurveyById(selectedSurveyId), [selectedSurveyId]);
  const selectedSurveyIntro = useMemo(() => getSurveyIntroCopy(selectedSurvey), [selectedSurvey]);

  const handleSurveyTypeChange = useCallback((surveyId: string) => {
    setSelectedSurveyId(surveyId);
    setErrorMessage(null);
    setShowQuizModal(false);
    setIsAnalyzing(false);
    setShowEmailGate(false);
    setShowMintInterstitial(false);
    setShowResultsModal(false);
    setActiveSurvey(null);
    setSurveyResults(null);
    setCompletedAnswers(null);
    setMintInfo(null);
  }, []);

  const handleStartSurvey = useCallback(() => {
    setActiveSurvey(selectedSurvey);
    setShowQuizModal(true);
    setIsAnalyzing(false);
    setShowEmailGate(false);
    setShowMintInterstitial(false);
    setShowResultsModal(false);
    setSurveyResults(null);
    setCompletedAnswers(null);
    setMintInfo(null);
    setErrorMessage(null);
  }, [selectedSurvey]);

  const handleSurveyComplete = useCallback(async (answers: SurveyAnswers) => {
    if (!activeSurvey) return;

    setShowQuizModal(false);
    setIsAnalyzing(true);
    setErrorMessage(null);

    const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 2800));

    try {
      const processPromise = fetch('/api/survey/process', {
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
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success || !data.results) {
          throw new Error(data.error || 'Failed to process survey results.');
        }
        return data;
      });

      const [processData] = await Promise.all([processPromise, minDelayPromise]);

      setCompletedAnswers(answers);
      setSurveyResults(processData.results);
      if (processData.mintInfo) {
        setMintInfo(processData.mintInfo);
      }
      setIsAnalyzing(false);

      if (!authenticated && !processData.authenticated) {
        setShowEmailGate(true);
      } else {
        setShowResultsModal(true);
      }
    } catch (error) {
      setIsAnalyzing(false);
      const message = error instanceof Error ? error.message : 'Failed to complete survey. Please try again.';
      setErrorMessage(message);
      alert(message);
      throw error;
    }
  }, [activeSurvey, authenticated]);

  const handleEmailGateUnlock = useCallback(() => {
    setShowEmailGate(false);
    setShowResultsModal(true);
  }, []);

  const handleSignIn = useCallback(() => {
    login();
  }, [login]);

  useEffect(() => {
    if (authenticated && showEmailGate) {
      setShowEmailGate(false);
      setShowResultsModal(true);
    }
  }, [authenticated, showEmailGate]);

  useEffect(() => {
    if (authenticated && activeSurvey && completedAnswers) {
      fetch('/api/survey/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          surveyId: activeSurvey.id,
          surveyTitle: activeSurvey.title,
          answers: completedAnswers,
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (data?.mintInfo) setMintInfo(data.mintInfo);
        })
        .catch(() => {});
    }
  }, [authenticated, activeSurvey, completedAnswers]);

  const handleMintDone = useCallback(() => {
    setShowMintInterstitial(false);
    setShowResultsModal(true);
  }, []);

  return (
    <div
      className={styles.pageLayout}
      style={{ '--quests-scene': `url(${sceneUrl})` } as React.CSSProperties}
    >
      <div className={styles.scene} aria-hidden="true" />
      <main className={styles.content}>
        <SurveyController
          userName="You Toxic or Fun Type Shi?"
          selectedSurveyId={selectedSurveyId}
          onSurveyTypeChange={handleSurveyTypeChange}
          onStartSurvey={handleStartSurvey}
          showDifficulty={false}
          ctaLabel="Begin survey"
        />
        <SurveySpace
          label=""
          badges={[]}
          className={(!showQuizModal && !isAnalyzing && !showEmailGate && !showResultsModal && !showMintInterstitial) || (isMobile && (showQuizModal || isAnalyzing || showEmailGate || showResultsModal)) ? styles.idleSurveySpace : ''}
        >
          {showQuizModal ? (
            <QuizModal
              isOpen={showQuizModal}
              onClose={() => {
                setShowQuizModal(false);
                setActiveSurvey(null);
              }}
              survey={activeSurvey}
              variant={isMobile ? 'modal' : 'inline'}
              onComplete={handleSurveyComplete}
            />
          ) : isAnalyzing ? (
            <SurveyAnalysisProgress
              variant={isMobile ? 'modal' : 'inline'}
            />
          ) : showEmailGate ? (
            <SurveyEmailGateModal
              isOpen={showEmailGate}
              variant={isMobile ? 'modal' : 'inline'}
              onUnlock={handleEmailGateUnlock}
              onSignIn={handleSignIn}
              onClose={() => {
                setShowEmailGate(false);
                setShowResultsModal(true);
              }}
              archetypePreviewTitle={surveyResults?.profileType || surveyResults?.personalizedTitle}
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
              variant={isMobile ? 'modal' : 'inline'}
              onOpenMint={mintInfo && activeSurvey?.id === 'attachment-style' ? () => setShowMintInterstitial(true) : undefined}
              mintInfo={mintInfo}
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

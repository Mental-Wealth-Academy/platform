'use client'

import { useState } from 'react'
import Image from 'next/image'
import QuizModal from './QuizModal'
import SurveyResultsModal from './SurveyResultsModal'
import type { Survey, SurveyAnswers, SurveyResults } from './types'
import { BIG_FIVE_LIKERT_OPTIONS } from './bigFiveScoring'
import { MORAL_FOUNDATIONS_OPTIONS } from './moralFoundationsScoring'
import { ATTACHMENT_OPTIONS } from './attachmentScoring'
import styles from './Surveys.module.css'

export const STANDARD_SURVEYS: Survey[] = [
  {
    id: 'attachment-style',
    title: 'Attachment Style',
    description: 'Assess your patterns of attachment anxiety and avoidance to identify whether your style is secure, anxious, avoidant, or fearful.',
    questionType: 'likert',
    pageSize: 12,
    questions: [
      { id: 1, text: 'I worry that people I care about will eventually leave me', options: ATTACHMENT_OPTIONS },
      { id: 2, text: 'I need frequent reassurance that I am loved', options: ATTACHMENT_OPTIONS },
      { id: 3, text: 'I feel anxious when someone close to me is unavailable', options: ATTACHMENT_OPTIONS },
      { id: 4, text: 'I worry that I want closeness more than others want it with me', options: ATTACHMENT_OPTIONS },
      { id: 5, text: 'I fear being rejected by people who matter to me', options: ATTACHMENT_OPTIONS },
      { id: 6, text: "I get upset when my partner or close friend doesn't prioritize me", options: ATTACHMENT_OPTIONS },
      { id: 7, text: 'I prefer not to share my true feelings with others', options: ATTACHMENT_OPTIONS },
      { id: 8, text: 'I find it difficult to depend on other people', options: ATTACHMENT_OPTIONS },
      { id: 9, text: 'I feel uncomfortable when others get emotionally close to me', options: ATTACHMENT_OPTIONS },
      { id: 10, text: 'I prefer to handle problems alone rather than rely on others', options: ATTACHMENT_OPTIONS },
      { id: 11, text: 'I find it natural to turn to others for comfort', options: ATTACHMENT_OPTIONS, reverseScore: true },
      { id: 12, text: 'I feel comfortable showing affection to people I care about', options: ATTACHMENT_OPTIONS, reverseScore: true },
    ],
  },
  {
    id: 'big-five',
    title: 'Big Five Personality',
    description: 'Measure the five core dimensions of personality: openness, conscientiousness, extraversion, agreeableness, and neuroticism.',
    questionType: 'likert',
    pageSize: 10,
    questions: [
      { id: 1, text: 'I have an active imagination', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 2, text: 'I am curious about many different things', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 3, text: 'I have few artistic interests', options: BIG_FIVE_LIKERT_OPTIONS, reverseScore: true },
      { id: 4, text: 'I enjoy coming up with new and original ideas', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 5, text: 'I do a thorough job', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 6, text: 'I tend to be lazy', options: BIG_FIVE_LIKERT_OPTIONS, reverseScore: true },
      { id: 7, text: 'I do things efficiently and follow through', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 8, text: 'I make plans and stick to them', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 9, text: 'I am talkative', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 10, text: 'I tend to be reserved and quiet', options: BIG_FIVE_LIKERT_OPTIONS, reverseScore: true },
      { id: 11, text: 'I am full of energy', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 12, text: 'I generate a lot of enthusiasm in others', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 13, text: 'I am sometimes rude or short with others', options: BIG_FIVE_LIKERT_OPTIONS, reverseScore: true },
      { id: 14, text: 'I have a forgiving nature', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 15, text: 'I am considerate and kind to almost everyone', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 16, text: 'I tend to find fault with others', options: BIG_FIVE_LIKERT_OPTIONS, reverseScore: true },
      { id: 17, text: 'I worry a lot', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 18, text: 'I am emotionally stable and not easily upset', options: BIG_FIVE_LIKERT_OPTIONS, reverseScore: true },
      { id: 19, text: 'I can be moody', options: BIG_FIVE_LIKERT_OPTIONS },
      { id: 20, text: 'I remain calm in tense situations', options: BIG_FIVE_LIKERT_OPTIONS, reverseScore: true },
    ],
  },
  {
    id: 'moral-foundations',
    title: 'Moral Foundations',
    description: "Identify which moral foundations — care, fairness, loyalty, authority, and sanctity — drive your ethical intuitions.",
    questionType: 'likert',
    pageSize: 10,
    questions: [
      { id: 1, text: 'It is wrong to cause emotional pain in others, even unintentionally', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 2, text: "Compassion for those who suffer is one of the most important virtues", options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 3, text: 'I am deeply troubled when innocent people are harmed', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 4, text: "A person's suffering matters morally, regardless of who caused it", options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 5, text: 'Fairness and equal treatment are the foundation of a good society', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 6, text: 'People should be judged by their own merits, not their group', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 7, text: 'Justice and equal rights matter more than social harmony', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 8, text: 'It is morally important that people get what they deserve', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 9, text: "Loyalty to one's group is a core moral value", options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 10, text: "People should stand by their group even when it's difficult", options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 11, text: 'Being a team player matters more than personal recognition', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 12, text: 'Betraying your group or country is one of the worst things a person can do', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 13, text: 'Respecting authority is an important virtue', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 14, text: 'Traditions and customs deserve respect even when we disagree', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 15, text: 'Social order depends on people respecting those in authority', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 16, text: 'Children should be taught to respect and obey those above them', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 17, text: 'Some acts are morally wrong because they violate standards of purity', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 18, text: 'The human body should be treated with dignity and not degraded', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 19, text: 'It is wrong to do things that are unnatural, even if no one is harmed', options: MORAL_FOUNDATIONS_OPTIONS },
      { id: 20, text: 'Acting with moral purity and spiritual integrity matters to me', options: MORAL_FOUNDATIONS_OPTIONS },
    ],
  },
]

export const SURVEYS = STANDARD_SURVEYS

export default function Surveys() {
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [surveyResults, setSurveyResults] = useState<SurveyResults | null>(null)

  const handleStartSurvey = (survey: Survey) => {
    setSelectedSurvey(survey)
    setShowQuizModal(true)
  }

  const handleSurveyComplete = async (answers: SurveyAnswers) => {
    if (!selectedSurvey) return

    try {
      // Process survey answers and get results
      const processResponse = await fetch('/api/survey/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId: selectedSurvey.id,
          surveyTitle: selectedSurvey.title,
          answers,
        }),
      })

      if (!processResponse.ok) {
        const errorData = await processResponse.json()
        throw new Error(errorData.error || 'Failed to process survey results')
      }

      const processData = await processResponse.json()

      if (!processData.success || !processData.results) {
        throw new Error('Failed to generate survey results')
      }

      setSurveyResults(processData.results)
      setShowQuizModal(false)
      setShowResultsModal(true)
    } catch (error) {
      console.error('[Surveys] Error completing survey:', error)
      alert(error instanceof Error ? error.message : 'Failed to complete survey. Please try again.')
    }
  }

  return (
    <>
      <div className={styles.surveysSection}>
        <h3 className={styles.surveysTitle}>Earn For Surveys</h3>
        <div className={styles.surveysGrid}>
          {STANDARD_SURVEYS.map((survey) => (
            <div 
              key={survey.id} 
              className={styles.surveyCard}
              onClick={() => handleStartSurvey(survey)}
            >
              <div className={styles.surveyCardContent}>
                <div className={styles.surveyCardIconBox}>
                  <Image 
                    src="/icons/survey.svg" 
                    alt="Survey icon" 
                    width={48}
                    height={48}
                    className={styles.surveyCardIcon}
                  />
                </div>
                <div className={styles.surveyCardTitleGroup}>
                  <h3 className={styles.surveyCardTitle}>{survey.title}</h3>
                  <div className={styles.surveyCardMeta}>
                    <span className={styles.surveyCardQuestions}>{survey.questions.length} questions</span>
                  </div>
                </div>
                <button
                  className={styles.surveyCardButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartSurvey(survey)
                  }}
                >
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <QuizModal
        isOpen={showQuizModal}
        onClose={() => {
          setShowQuizModal(false)
          setSelectedSurvey(null)
        }}
        survey={selectedSurvey}
        onComplete={handleSurveyComplete}
      />

      <SurveyResultsModal
        isOpen={showResultsModal}
        onClose={() => {
          setShowResultsModal(false)
          setSurveyResults(null)
        }}
        results={surveyResults}
      />
    </>
  )
}

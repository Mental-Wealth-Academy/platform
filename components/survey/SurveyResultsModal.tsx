'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import CtaButton from '@/components/shared/CtaButton'
import type { SurveyResults } from './types'
import styles from './SurveyResultsModal.module.css'

interface SurveyResultsModalProps {
  isOpen: boolean
  onClose: () => void
  results: SurveyResults | null
  variant?: 'modal' | 'inline'
}

export default function SurveyResultsModal({ isOpen, onClose, results, variant = 'modal' }: SurveyResultsModalProps) {
  const [showContent, setShowContent] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen && results) {
      setTimeout(() => setShowContent(true), 300)
    } else {
      setShowContent(false)
    }
  }, [isOpen, results])

  useEffect(() => {
    if (variant !== 'modal') return

    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, variant])

  const handleClose = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setShowContent(false)
    setTimeout(() => onClose(), 200)
  }, [onClose])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, handleClose])

  if (!isOpen || !results || !mounted) return null
  const hasStrengthRankings = results.resultType === 'via' && results.strengthRankings && results.strengthRankings.length > 0

  const panelContent = (
    <div
      className={`${styles.resultsModalContainer} ${showContent ? styles.resultsModalContainerVisible : ''} ${variant === 'inline' ? styles.resultsModalContainerInline : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with close button */}
      <div className={styles.resultsModalHeader}>
        <div className={styles.resultsModalHeaderContent}>
          <h2 className={styles.resultsModalTitle}>Survey complete</h2>
          <button
            onClick={(e) => handleClose(e)}
            className={styles.resultsModalClose}
            aria-label="Close results"
          >
            x
          </button>
        </div>
      </div>

      {/* Animated Content */}
      <div className={styles.resultsModalContent}>
        {/* Success Animation */}
        <div className={`${styles.resultsModalSuccessIcon} ${showContent ? styles.resultsModalSuccessIconVisible : ''}`}>
          <svg
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        {/* Personalized Title */}
        <div className={`${styles.resultsModalTitleSection} ${showContent ? styles.resultsModalTitleSectionVisible : ''}`}>
          <h3 className={styles.resultsModalPersonalizedTitle}>
            {results.personalizedTitle || results.surveyTitle}
          </h3>
          <p className={styles.resultsModalSurveyTitle}>
            {results.surveyTitle}
          </p>
        </div>

        {/* Analysis Text */}
        <div className={`${styles.resultsModalAnalysis} ${showContent ? styles.resultsModalAnalysisVisible : ''}`}>
          <p className={styles.resultsModalAnalysisText}>
            {results.analysis}
          </p>
        </div>

        {/* Insights */}
        {results.insights && results.insights.length > 0 && (
          <div className={`${styles.resultsModalInsights} ${showContent ? styles.resultsModalInsightsVisible : ''}`}>
            <h4 className={styles.resultsModalInsightsTitle}>
              {hasStrengthRankings ? 'Top strengths' : 'Key insights'}
            </h4>
            <div className={styles.resultsModalInsightsList}>
              {results.insights.map((insight, index) => (
                <div key={index} className={styles.resultsModalInsightItem}>
                  <p className={styles.resultsModalInsightText}>
                    - {insight}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.dimensions && results.dimensions.length > 0 && (
          <div className={`${styles.resultsModalDimensions} ${showContent ? styles.resultsModalDimensionsVisible : ''}`}>
            <h4 className={styles.resultsModalInsightsTitle}>
              {results.resultType === 'attachment' ? 'Your scores' : 'Trait scores'}
            </h4>
            {results.dimensions.map((dim) => (
              <div key={dim.id} className={styles.dimensionRow}>
                <div className={styles.dimensionMeta}>
                  <span className={styles.dimensionLabel}>{dim.label}</span>
                  <span className={styles.dimensionPct}>{Math.round(dim.score)}%</span>
                </div>
                <div className={styles.dimensionTrack}>
                  <div className={styles.dimensionFill} style={{ width: `${dim.score}%` }} />
                </div>
                <p className={styles.dimensionDesc}>{dim.description}</p>
              </div>
            ))}
          </div>
        )}

        {hasStrengthRankings && (
          <div className={`${styles.resultsModalRankings} ${showContent ? styles.resultsModalRankingsVisible : ''}`}>
            <h4 className={styles.resultsModalInsightsTitle}>
              Full ranking
            </h4>
            <div className={styles.resultsModalStrengthList}>
              {results.strengthRankings?.map((strength) => (
                <div key={strength.id} className={styles.resultsModalStrengthItem}>
                  <div className={styles.resultsModalStrengthRank}>
                    {strength.rank}
                  </div>
                  <div className={styles.resultsModalStrengthMain}>
                    <p className={styles.resultsModalStrengthName}>
                      {strength.label}
                    </p>
                    <p className={styles.resultsModalStrengthMeta}>
                      {strength.virtue} - {strength.description}
                    </p>
                  </div>
                  <div className={styles.resultsModalStrengthScore}>
                    {strength.score}/{strength.maxScore}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`${styles.resultsModalFooter} ${showContent ? styles.resultsModalFooterVisible : ''}`}>
        <CtaButton
          variant="primary"
          size="md"
          block
          onClick={handleClose}
          className={styles.resultsModalCloseButton}
        >
          Close
        </CtaButton>
      </div>
    </div>
  )

  if (variant === 'inline') {
    return <div className={styles.resultsModalInlineShell}>{panelContent}</div>
  }

  return createPortal((
    <div
      className={styles.resultsModalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      {panelContent}
    </div>
  ), document.body)
}

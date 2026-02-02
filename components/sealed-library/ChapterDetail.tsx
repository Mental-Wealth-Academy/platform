'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import WritingPrompt from './WritingPrompt';
import AzuraGatekeeper from './AzuraGatekeeper';
import styles from './ChapterDetail.module.css';

interface Prompt {
  id: number;
  chapter_id: number;
  day_number: number;
  prompt_text: string;
  placeholder_text: string;
  min_characters: number;
  completed: boolean;
  writing: {
    id: number;
    content: string;
    word_count: number;
    created_at: string;
  } | null;
  isCurrentPrompt: boolean;
}

interface ChapterInfo {
  id: number;
  chapter_number: number;
  title: string;
  description: string;
  theme: string;
  status: 'locked' | 'in_progress' | 'unsealed';
  writingsCompleted: number;
  totalWritings: number;
  azuraMessage: string;
}

interface ChapterDetailProps {
  chapterId: number;
  onClose: () => void;
  onChapterComplete: () => void;
}

const ChapterDetail: React.FC<ChapterDetailProps> = ({
  chapterId,
  onClose,
  onChapterComplete,
}) => {
  const [chapter, setChapter] = useState<ChapterInfo | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWritingPrompt, setShowWritingPrompt] = useState(false);
  const [expandedWriting, setExpandedWriting] = useState<number | null>(null);
  const [showUnsealAnimation, setShowUnsealAnimation] = useState(false);

  useEffect(() => {
    fetchChapterDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  const fetchChapterDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chapters/${chapterId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chapter details');
      }

      const data = await response.json();
      setChapter(data.chapter);
      setPrompts(data.prompts || []);
      setCurrentPrompt(data.currentPrompt || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chapter');
    } finally {
      setLoading(false);
    }
  };

  const handleWritingSubmitted = async (result: {
    chapterUnsealed: boolean;
    shardsAwarded: number;
    bonusShards: number;
  }) => {
    // Refresh chapter details
    await fetchChapterDetails();

    // Close writing prompt
    setShowWritingPrompt(false);

    // If chapter was unsealed, show animation
    if (result.chapterUnsealed) {
      setShowUnsealAnimation(true);

      // Notify parent and trigger shard update
      window.dispatchEvent(new Event('shardsUpdated'));
      onChapterComplete();

      // Hide animation after a delay
      setTimeout(() => {
        setShowUnsealAnimation(false);
      }, 4000);
    } else {
      // Still award shards for writing
      window.dispatchEvent(new Event('shardsUpdated'));
    }
  };

  const handleStartWriting = () => {
    if (currentPrompt) {
      setShowWritingPrompt(true);
    }
  };

  const toggleWritingExpand = (promptId: number) => {
    setExpandedWriting(expandedWriting === promptId ? null : promptId);
  };

  if (loading) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
            <p className={styles.loadingText}>Loading chapter...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <button className={styles.closeButton} onClick={onClose} type="button">
            Close
          </button>
          <div className={styles.errorContainer}>
            <p className={styles.errorText}>{error || 'Chapter not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose} type="button">
          Close
        </button>

        {/* Unseal Animation Overlay */}
        {showUnsealAnimation && (
          <div className={styles.unsealOverlay}>
            <div className={styles.unsealContent}>
              <Image
                src="/uploads/AzuraSeal.png"
                alt="Seal Breaking"
                width={120}
                height={120}
                className={styles.breakingSeal}
                unoptimized
              />
              <h2 className={styles.unsealTitle}>Chapter Unsealed!</h2>
              <p className={styles.unsealMessage}>
                You&apos;ve completed 7 days of writing. The next chapter awaits...
              </p>
            </div>
          </div>
        )}

        {/* Writing Prompt Modal */}
        {showWritingPrompt && currentPrompt && (
          <WritingPrompt
            prompt={currentPrompt}
            chapterTitle={chapter.title}
            onClose={() => setShowWritingPrompt(false)}
            onSubmitted={handleWritingSubmitted}
          />
        )}

        <div className={styles.content}>
          {/* Azura Gatekeeper */}
          <AzuraGatekeeper
            message={chapter.azuraMessage}
            status={chapter.status}
            writingsCompleted={chapter.writingsCompleted}
          />

          {/* Chapter Header */}
          <div className={styles.header}>
            <div className={styles.chapterNumber}>Chapter {chapter.chapter_number}</div>
            <h1 className={styles.title}>{chapter.title}</h1>
            <div className={styles.theme}>{chapter.theme}</div>
            <p className={styles.description}>{chapter.description}</p>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressSection}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(chapter.writingsCompleted / 7) * 100}%` }}
              />
            </div>
            <div className={styles.progressLabel}>
              {chapter.writingsCompleted} of 7 days completed
            </div>
          </div>

          {/* Action Button */}
          {currentPrompt && chapter.status !== 'unsealed' && (
            <button
              className={styles.startButton}
              onClick={handleStartWriting}
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              {chapter.writingsCompleted === 0 ? 'Begin Day 1' : `Continue Day ${chapter.writingsCompleted + 1}`}
            </button>
          )}

          {chapter.status === 'unsealed' && (
            <div className={styles.completedBadge}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Chapter Complete
            </div>
          )}

          {/* Prompts List */}
          <div className={styles.promptsList}>
            <h3 className={styles.promptsTitle}>Your Journey</h3>
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                className={`${styles.promptItem} ${prompt.completed ? styles.promptCompleted : ''} ${prompt.isCurrentPrompt ? styles.promptCurrent : ''}`}
              >
                <div className={styles.promptHeader}>
                  <div className={styles.promptDay}>Day {prompt.day_number}</div>
                  {prompt.completed ? (
                    <button
                      className={styles.expandButton}
                      onClick={() => toggleWritingExpand(prompt.id)}
                      type="button"
                    >
                      {expandedWriting === prompt.id ? 'Hide' : 'Read'}
                    </button>
                  ) : prompt.isCurrentPrompt ? (
                    <span className={styles.currentBadge}>Current</span>
                  ) : (
                    <span className={styles.lockedBadge}>Locked</span>
                  )}
                </div>

                {/* Show prompt text for completed or current */}
                {(prompt.completed || prompt.isCurrentPrompt) && (
                  <p className={styles.promptText}>{prompt.prompt_text}</p>
                )}

                {/* Expanded writing content */}
                {expandedWriting === prompt.id && prompt.writing && (
                  <div className={styles.writingContent}>
                    <p className={styles.writingText}>{prompt.writing.content}</p>
                    <div className={styles.writingMeta}>
                      {prompt.writing.word_count} words &bull;{' '}
                      {new Date(prompt.writing.created_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterDetail;

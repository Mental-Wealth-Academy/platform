'use client';

import React, { useState, useEffect } from 'react';
import styles from './WritingPrompt.module.css';

interface Prompt {
  id: number;
  chapter_id: number;
  day_number: number;
  prompt_text: string;
  placeholder_text: string;
  min_characters: number;
}

interface WritingPromptProps {
  prompt: Prompt;
  chapterTitle: string;
  onClose: () => void;
  onSubmitted: (result: {
    chapterUnsealed: boolean;
    shardsAwarded: number;
    bonusShards: number;
  }) => void;
}

const MIN_CHARACTERS = 100;
const DRAFT_KEY_PREFIX = 'writing_draft_';

const WritingPrompt: React.FC<WritingPromptProps> = ({
  prompt,
  chapterTitle,
  onClose,
  onSubmitted,
}) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    shardsAwarded: number;
    bonusShards: number;
    chapterUnsealed: boolean;
  } | null>(null);

  // Load draft from localStorage
  useEffect(() => {
    const draftKey = `${DRAFT_KEY_PREFIX}${prompt.id}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setContent(savedDraft);
    }
  }, [prompt.id]);

  // Auto-save draft
  useEffect(() => {
    const draftKey = `${DRAFT_KEY_PREFIX}${prompt.id}`;
    if (content.length > 0) {
      localStorage.setItem(draftKey, content);
    }
  }, [content, prompt.id]);

  const handleSubmit = async () => {
    if (content.trim().length < MIN_CHARACTERS) {
      setError(`Please write at least ${MIN_CHARACTERS} characters.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/chapters/writings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          promptId: prompt.id,
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save writing');
      }

      const data = await response.json();

      // Clear draft
      const draftKey = `${DRAFT_KEY_PREFIX}${prompt.id}`;
      localStorage.removeItem(draftKey);

      // Show success state
      setSuccessData({
        shardsAwarded: data.shardsAwarded,
        bonusShards: data.bonusShards,
        chapterUnsealed: data.chapterUnsealed,
      });
      setShowSuccess(true);

      // After delay, notify parent
      setTimeout(() => {
        onSubmitted({
          chapterUnsealed: data.chapterUnsealed,
          shardsAwarded: data.shardsAwarded,
          bonusShards: data.bonusShards,
        });
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save writing');
    } finally {
      setSubmitting(false);
    }
  };

  const characterCount = content.trim().length;
  const isValidLength = characterCount >= MIN_CHARACTERS;
  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;

  if (showSuccess && successData) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.successContent}>
            <div className={styles.successIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <h2 className={styles.successTitle}>Writing Saved!</h2>
            <div className={styles.shardReward}>
              <span className={styles.shardIcon}>✦</span>
              <span className={styles.shardAmount}>+{successData.shardsAwarded} Shards</span>
            </div>
            {successData.bonusShards > 0 && (
              <div className={styles.bonusReward}>
                <span className={styles.bonusIcon}>🎉</span>
                <span className={styles.bonusAmount}>+{successData.bonusShards} Bonus for unsealing!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose} type="button">
          Close
        </button>

        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.dayBadge}>Seal {prompt.day_number}</div>
            <div className={styles.chapterTitle}>{chapterTitle}</div>
          </div>

          <div className={styles.promptSection}>
            <p className={styles.promptText}>{prompt.prompt_text}</p>
          </div>

          <div className={styles.editorSection}>
            <textarea
              className={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={prompt.placeholder_text || 'Begin writing your thoughts...'}
              disabled={submitting}
              autoFocus
            />

            <div className={styles.editorFooter}>
              <div className={`${styles.charCount} ${isValidLength ? styles.charCountValid : ''}`}>
                {characterCount} / {MIN_CHARACTERS} characters
                {wordCount > 0 && <span className={styles.wordCount}> ({wordCount} words)</span>}
              </div>
              {content.length > 0 && (
                <div className={styles.draftSaved}>Draft saved</div>
              )}
            </div>
          </div>

          {error && (
            <div className={styles.error}>{error}</div>
          )}

          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={submitting || !isValidLength}
            type="button"
          >
            {submitting ? (
              <>
                <div className={styles.buttonSpinner} />
                Saving...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Break Seal {prompt.day_number}
              </>
            )}
          </button>

          <p className={styles.hint}>
            Your writing is private and only visible to you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WritingPrompt;

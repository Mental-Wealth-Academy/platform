'use client';

import React, { useState, useRef, useEffect } from 'react';
import ModalShell from '@/components/shared/ModalShell';
import styles from './SupportModal.module.css';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [activeTab, setActiveTab] = useState<'bug' | 'suggestion'>('bug');
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenshots, setScreenshots] = useState<{ id: string; url: string; file: File }[]>([]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      screenshots.forEach(s => URL.revokeObjectURL(s.url));
    };
  }, [screenshots]);

  if (!isOpen) return null;

  const handleTabChange = (tab: 'bug' | 'suggestion') => {
    setActiveTab(tab);
    setText('');
    screenshots.forEach(s => URL.revokeObjectURL(s.url));
    setScreenshots([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const availableSlots = 3 - screenshots.length;
    
    const filesToAdd = files.slice(0, availableSlots).map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      url: URL.createObjectURL(file),
      file
    }));
    
    setScreenshots(prev => [...prev, ...filesToAdd]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeScreenshot = (id: string) => {
    setScreenshots(prev => {
      const match = prev.find(s => s.id === id);
      if (match) URL.revokeObjectURL(match.url);
      return prev.filter(s => s.id !== id);
    });
  };

  const handleSubmit = () => {
    // Show success state and close
    alert('Submitted successfully!');
    setText('');
    screenshots.forEach(s => URL.revokeObjectURL(s.url));
    setScreenshots([]);
    onClose();
  };

  const slots = [0, 1, 2];

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Support Portal" maxWidth="md">

        <div className={styles.content}>
          <div className={styles.tabSwitcher} role="tablist">
            <span
              className={styles.tabThumb}
              style={{ transform: activeTab === 'bug' ? 'translateX(0%)' : 'translateX(100%)' }}
              aria-hidden="true"
            />
            <button
              role="tab"
              aria-selected={activeTab === 'bug'}
              className={`${styles.tab} ${activeTab === 'bug' ? styles.activeTab : ''}`}
              onClick={() => handleTabChange('bug')}
            >
              Bug report
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'suggestion'}
              className={`${styles.tab} ${activeTab === 'suggestion' ? styles.activeTab : ''}`}
              onClick={() => handleTabChange('suggestion')}
            >
              Suggestions
            </button>
          </div>

          <div className={styles.formContainer}>
            {activeTab === 'bug' ? (
              <>
                <p className={styles.prompt}>Please describe:</p>
                <ol className={styles.list}>
                  <li>Your issue</li>
                  <li>How you encountered it</li>
                  <li>What should be happening instead</li>
                </ol>
              </>
            ) : (
              <>
                <p className={styles.prompt}>We&apos;d love to hear your thoughts!</p>
                <ol className={styles.list}>
                  <li>What feature or improvement are you suggesting?</li>
                  <li>How would it make the Academy better?</li>
                </ol>
              </>
            )}
            
            <div className={styles.textareaWrapper}>
              <textarea
                className={styles.textarea}
                placeholder="Start typing..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={5000}
              />
              <div className={styles.characterCount}>
                {text.length}/5000
              </div>
            </div>

            <div className={styles.uploaderSection}>
              <p className={styles.uploaderTitle}>Attach up to 3 screenshots</p>
              <div className={styles.uploaderContainer}>
                <div className={styles.uploaderSlots}>
                  {slots.map((i) => {
                    const screenshot = screenshots[i];
                    if (screenshot) {
                      return (
                        <div key={screenshot.id} className={styles.uploadSlotWithPreview}>
                          <img src={screenshot.url} alt="Screenshot preview" className={styles.previewImage} />
                          <button
                            type="button"
                            className={styles.removeSlotBtn}
                            onClick={() => removeScreenshot(screenshot.id)}
                            aria-label="Remove screenshot"
                          >
                            ×
                          </button>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={i}
                        type="button"
                        className={styles.uploadSlot}
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Upload screenshot"
                      >
                        +
                      </button>
                    );
                  })}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button
              className={styles.submitButton}
              onClick={handleSubmit}
              type="button"
              disabled={!text.trim()}
            >
              {activeTab === 'bug' ? 'Submit issue' : 'Submit suggestion'}
            </button>
          </div>
        </div>
    </ModalShell>
  );
}

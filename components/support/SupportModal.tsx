import React, { useState } from 'react';
import styles from './SupportModal.module.css';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [activeTab, setActiveTab] = useState<'bug' | 'suggestion'>('bug');
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Show success state and close
    alert('Submitted successfully!');
    setText('');
    onClose();
  };

  const playPokeSound = () => {
    // Mock sound interaction
    console.log('Poke sound played');
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContainer}>
        <div className={styles.titleBar}>
          <h2 className={styles.title}>支持 Bug Report / Suggestions</h2>
          <button className={styles.closeButton} onClick={onClose}>CLOSE</button>
        </div>

        <div className={styles.content}>
          <div className={styles.tabSelector}>
            <button
              className={`${styles.tab} ${activeTab === 'bug' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('bug')}
            >
              Bug Report
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'suggestion' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('suggestion')}
            >
              Suggestions
            </button>
          </div>

          {activeTab === 'bug' && (
            <div className={styles.formContainer}>
              <p className={styles.prompt}>Please describe:</p>
              <ol className={styles.list}>
                <li>Your issue</li>
                <li>How you encountered it</li>
                <li>What should be happening instead</li>
              </ol>
              
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
                <p className={styles.uploaderTitle}>PLEASE ATTACH UP TO 3 SCREENSHOTS OF THE ISSUE!!</p>
                <div className={styles.uploaderSlots}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={styles.uploadSlot}>+</div>
                  ))}
                </div>
              </div>

              <div className={styles.actionRow}>
                <button className={styles.pokeButton} onClick={playPokeSound} type="button">
                  👊 Poke Dev
                </button>
                <button className={styles.submitButton} onClick={handleSubmit} type="button">
                  Submit Issue
                </button>
              </div>
            </div>
          )}

          {activeTab === 'suggestion' && (
            <div className={styles.formContainer}>
              <p className={styles.prompt}>We'd love to hear your thoughts!</p>
              <ol className={styles.list}>
                <li>What feature or improvement are you suggesting?</li>
                <li>How would it make the Academy better?</li>
              </ol>
              
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
                <p className={styles.uploaderTitle}>PLEASE ATTACH UP TO 3 SCREENSHOTS OF THE ISSUE!!</p>
                <div className={styles.uploaderSlots}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={styles.uploadSlot}>+</div>
                  ))}
                </div>
              </div>

              <div className={styles.actionRow}>
                <button className={styles.pokeButton} onClick={playPokeSound} type="button">
                  👊 Poke Dev
                </button>
                <button className={styles.submitButton} onClick={handleSubmit} type="button">
                  Submit Suggestion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

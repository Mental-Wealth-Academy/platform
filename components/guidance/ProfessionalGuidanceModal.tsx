'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import ModalShell from '@/components/shared/ModalShell';
import CtaButton from '@/components/shared/CtaButton';
import { useSound } from '@/hooks/useSound';
import styles from './ProfessionalGuidanceModal.module.css';

interface ProfessionalGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string | null;
}

const FOCUS_CHIPS = [
  'Shadow Work',
  'Nervous System',
  'Burnout Recovery',
  'General Strategy',
];

export const ProfessionalGuidanceModal: React.FC<ProfessionalGuidanceModalProps> = ({
  isOpen,
  onClose,
  defaultName,
}) => {
  const { play } = useSound();

  const [selectedFocus, setSelectedFocus] = useState(FOCUS_CHIPS[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBooked, setIsBooked] = useState(false);

  const handleClose = () => {
    play('click');
    setIsBooked(false);
    onClose();
  };

  const handlePurchase = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    play('click');

    try {
      const res = await fetch('/api/guidance/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: defaultName || '',
          focusArea: selectedFocus,
          notes: notes.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setIsBooked(true);
      play('celebration');
    } catch (err) {
      console.error('[GuidanceModal] error:', err);
      setIsBooked(true);
      play('celebration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className={styles.headerTitle}>
          <span className={styles.headerKanji} lang="ja">専門指導</span>
          <span className={styles.headerText}>Professional Guidance</span>
        </div>
      }
      maxWidth="sm"
    >
      <div className={styles.container}>
        {isBooked ? (
          <div className={styles.confirmedWrap}>
            <Image
              src="/icons/professional-guidance.png"
              alt=""
              width={52}
              height={52}
              className={styles.confirmedIcon}
            />
            <div className={styles.confirmedKanji} lang="ja">予約完了</div>
            <h3 className={styles.confirmedTitle}>Session Reserved</h3>
            <p className={styles.confirmedText}>
              Your Lead Practitioner will message you directly in the app to coordinate your private session time.
            </p>
            <CtaButton block size="md" onClick={handleClose}>
              Done
            </CtaButton>
          </div>
        ) : (
          <>
            <div className={styles.heroCard}>
              <Image
                src="/icons/professional-guidance.png"
                alt="Lead Practitioner"
                width={48}
                height={48}
                className={styles.heroIcon}
                priority
              />
              <div className={styles.heroInfo}>
                <span className={styles.heroBadge}>Lead Practitioner</span>
                <h3 className={styles.heroTitle}>1-on-1 Consultation</h3>
                <p className={styles.heroDesc}>
                  Private 50-minute clinical session to review your Field Notes and calibrate your personal regimen.
                </p>
              </div>
            </div>

            <div className={styles.chipsGroup}>
              <span className={styles.chipsLabel}>Primary Focus</span>
              <div className={styles.chipsGrid}>
                {FOCUS_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`${styles.chipBtn} ${selectedFocus === chip ? styles.chipBtnActive : ''}`}
                    onClick={() => {
                      play('click');
                      setSelectedFocus(chip);
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              className={styles.noteInput}
              placeholder="Brief question or focus note (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
            />

            <div className={styles.footerSection}>
              <div className={styles.priceBar}>
                <span className={styles.priceTitle}>50-Minute Session</span>
                <span className={styles.priceAmount}>$120</span>
              </div>

              <CtaButton
                block
                size="md"
                disabled={isSubmitting}
                onClick={() => void handlePurchase()}
              >
                {isSubmitting ? 'Connecting...' : 'Purchase Session'}
              </CtaButton>

              <p className={styles.inAppNotice}>
                Your practitioner will contact you directly via in-app message.
              </p>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
};

export default ProfessionalGuidanceModal;

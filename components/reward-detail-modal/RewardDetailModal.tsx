'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import styles from './RewardDetailModal.module.css';
import { ConfettiCelebration } from '../quests/ConfettiCelebration';
import { ShardAnimation } from '../quests/ShardAnimation';
import { XConnectingModal } from '../x-connecting/XConnectingModal';
import type { QuestType } from '@/lib/quest-definitions';

export interface Quest {
  id: string;
  title: string;
  points: number;
  desc: string;
  rewardType: QuestType;
  targetCount?: number;
  progressCount?: number;
  claimedCount?: number;
  weekNumber?: number;
  icon?: string;
}

export type Reward = Quest;

interface RewardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward: Quest | null;
}

const CloseIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const QuestDetailModal: React.FC<RewardDetailModalProps> = ({ isOpen, onClose, reward: quest }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { address, isConnected } = useAccount();
  const [step1Completed, setStep1Completed] = useState(false);
  const [step2Completed, setStep2Completed] = useState(false);
  const [isCheckingFollow, setIsCheckingFollow] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShardAnimation, setShowShardAnimation] = useState(false);
  const [shardsAwarded, setShardsAwarded] = useState(0);
  const [showConnectingModal, setShowConnectingModal] = useState(false);
  const [startingShards, setStartingShards] = useState(0);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Check Twitter link status for twitter-follow rewards
  useEffect(() => {
    if (!quest || quest.rewardType !== 'twitter-follow' || !isConnected) {
      setStep1Completed(false);
      setStep2Completed(false);
      return;
    }

    const checkXAccountAndFollow = async (autoCheckFollow = false) => {
      if (!isConnected || !address) {
        setStep1Completed(false);
        return;
      }

      try {
        const response = await fetch('/api/x-auth/status', {
          cache: 'no-store',
          credentials: 'include',
        });

        if (response.status === 401) {
          setStep1Completed(false);
          return;
        }

        const data = await response.json();
        const connected = data.connected === true;
        setStep1Completed(connected);

        if (connected && autoCheckFollow && !step2Completed) {
          const followResponse = await fetch('/api/x-auth/check-follow', {
            method: 'POST',
            cache: 'no-store',
            credentials: 'include',
          });
          const followData = await followResponse.json();

          if (followData.isFollowing) {
            setStep2Completed(true);

            try {
              const completeResponse = await fetch('/api/quests/auto-complete-twitter-quest', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'include',
              });
              const completeData = await completeResponse.json();

              if (completeData.ok && completeData.shardsAwarded > 0) {
                setShardsAwarded(completeData.shardsAwarded);
                setStartingShards(completeData.startingShards || 0);
                setShowConfetti(true);
                setShowShardAnimation(true);
                window.dispatchEvent(new Event('shardsUpdated'));
                setTimeout(() => {
                  setShowConfetti(false);
                  setShowShardAnimation(false);
                }, 5000);
              }
            } catch (error) {
              console.error('Failed to auto-complete reward:', error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check X account:', error);
        setStep1Completed(false);
      }
    };

    const params = new URLSearchParams(window.location.search);
    const autoCheck = params.get('auto_check');
    checkXAccountAndFollow(autoCheck === 'true');

    const handleFocus = () => checkXAccountAndFollow(true);
    const handleXAccountUpdate = () => checkXAccountAndFollow(true);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('xAccountUpdated', handleXAccountUpdate);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('xAccountUpdated', handleXAccountUpdate);
    };
  }, [quest, isConnected, address, step2Completed]);

  const handleConnectTwitter = async () => {
    try {
      setShowConnectingModal(true);
      const response = await fetch('/api/x-auth/initiate', { credentials: 'include' });

      if (response.status === 401) {
        setShowConnectingModal(false);
        alert('Please sign in to connect your X account.');
        return;
      }

      if (!response.ok) {
        setShowConnectingModal(false);
        return;
      }

      const data = await response.json();
      if (data.authUrl) {
        setTimeout(() => { window.location.href = data.authUrl; }, 800);
      } else {
        setShowConnectingModal(false);
      }
    } catch (error) {
      console.error('Failed to connect X account:', error);
      setShowConnectingModal(false);
    }
  };

  const handleCheckFollow = async () => {
    setIsCheckingFollow(true);
    try {
      const response = await fetch('/api/x-auth/check-follow', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
      });
      const data = await response.json();

      if (data.isFollowing) {
        setStep2Completed(true);
      } else if (data.requiresManualVerification) {
        setStep2Completed(true);
      } else if (data.error) {
        alert(data.message || 'Failed to verify follow status. Please try again.');
      } else {
        alert('Please make sure you are following @MentalWealthDAO on X, then click Verify again.');
      }
    } catch (error) {
      console.error('Failed to check follow status:', error);
      alert('Failed to check follow status. Please try again.');
    } finally {
      setIsCheckingFollow(false);
    }
  };

  const handleCompleteReward = async () => {
    if (!quest) return;

    if ((quest.claimedCount ?? 0) >= (quest.targetCount ?? 1)) return;
    if (quest.rewardType === 'sealed-week' && (quest.progressCount ?? 0) < (quest.targetCount ?? 1)) return;
    if (quest.rewardType === 'twitter-follow' && (!step1Completed || !step2Completed)) return;

    setIsCompleting(true);
    try {
      const meResponse = await fetch('/api/me', {
        cache: 'no-store',
        credentials: 'include',
      });
      const meData = await meResponse.json();
      const currentStartingShards = meData?.user?.shardCount ?? 0;
      setStartingShards(currentStartingShards);

      const shardReward = quest.points;
      const response = await fetch('/api/quests/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questId: quest.id,
          shards: shardReward,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setShardsAwarded(shardReward);
        setShowConfetti(true);
        setShowShardAnimation(true);
        window.dispatchEvent(new Event('shardsUpdated'));

        setTimeout(() => {
          onClose();
          setTimeout(() => {
            setShowConfetti(false);
            setShowShardAnimation(false);
            setShardsAwarded(0);
          }, 2000);
        }, 5000);
      } else {
        alert(data.error || 'Failed to complete quest. Please try again.');
      }
    } catch (error) {
      console.error('Failed to complete quest:', error);
      alert('Failed to complete quest. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (!quest || !shouldRender) return null;

  const questTypeLabel: Record<QuestType, string> = {
    'proof-required': 'Proof Required',
    'no-proof': 'No Proof Needed',
    'twitter-follow': 'Social',
    'follow-and-own': 'Follow & Own',
    'sealed-week': 'Course Milestone',
  };
  const targetCount = quest.targetCount ?? 1;
  const progressCount = quest.progressCount ?? 0;
  const claimedCount = quest.claimedCount ?? 0;
  const questIsComplete = claimedCount >= targetCount;
  const canClaimSealedWeek = quest.rewardType === 'sealed-week' && progressCount >= targetCount && !questIsComplete;
  const questProgressLabel = `${progressCount}/${targetCount}`;

  return (
    <>
      <div className={`${styles.backdrop} ${isAnimating ? styles.backdropVisible : ''}`} onClick={onClose} />
      <div className={`${styles.modal} ${isAnimating ? styles.modalOpen : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Quest Details</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Top Section */}
        <div className={styles.topSection}>
          <div className={styles.rewardBadge}>
            <div className={styles.rewardIcon}>
              <Image
                src={quest.icon || '/icons/ui-coin.svg'}
                alt={quest.title}
                width={32}
                height={32}
              />
            </div>
          </div>
          <h1 className={styles.rewardTitle}>{quest.title}</h1>
          <p className={styles.rewardDesc}>{quest.desc}</p>
          <span className={styles.pointsBadge}>{quest.points} pts</span>

          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Type</span>
              <span className={styles.detailValue}>{questTypeLabel[quest.rewardType]}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Progress</span>
              <span className={styles.detailValue}>{questProgressLabel}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Resolver</span>
              <span className={styles.detailValue}>{quest.rewardType === 'sealed-week' ? 'Home Progress' : 'Academy Oracle'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Claims</span>
              <span className={styles.detailValue}>
                <Image src="/icons/ui-coin.svg" alt="Daemon" width={14} height={14} />
                {claimedCount}/{targetCount}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Section - conditional on reward type */}
        <div className={styles.bottomSection}>
          {quest.rewardType === 'sealed-week' && (
            <>
              <h3 className={styles.sectionTitle}>Seal Progress Required</h3>
              <p className={styles.sectionDescription}>
                This quest checks your actual Week {quest.weekNumber} seal status from the home page. Once that week is sealed, you can claim this quest here.
              </p>

              <div className={styles.actionBox}>
                <div className={styles.actionIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3L19 6V11C19 16 15.5 20 12 21C8.5 20 5 16 5 11V6L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className={styles.actionText}>
                  {progressCount >= targetCount
                    ? `Week ${quest.weekNumber} is sealed. You can claim this quest now.`
                    : `Week ${quest.weekNumber} is not sealed yet. Seal it on the home page first.`}
                </p>
              </div>

              <button
                className={styles.submitButton}
                type="button"
                onClick={handleCompleteReward}
                disabled={!canClaimSealedWeek || isCompleting}
              >
                {questIsComplete ? 'Quest completed' : isCompleting ? 'Claiming...' : `Claim ${quest.points} pts`}
              </button>
            </>
          )}

          {/* Proof Required */}
          {quest.rewardType === 'proof-required' && (
            <>
              <h3 className={styles.sectionTitle}>Submit Quest Entry</h3>
              <p className={styles.sectionDescription}>
                Each submission advances this quest by one entry. Track your count here until you reach {targetCount}/{targetCount}.
              </p>

              <div className={styles.uploadArea}>
                <div className={styles.uploadContent}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.uploadIcon}>
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className={styles.uploadText}>Click to upload or drag and drop</p>
                  <p className={styles.uploadSubtext}>Upload your proof (images, videos, PDFs)</p>
                </div>
                <input
                  type="file"
                  className={styles.fileInput}
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log('File selected:', file);
                    }
                  }}
                />
              </div>

              <div className={styles.infoBox}>
                <div className={styles.infoBoxHeader}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.infoIcon}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className={styles.infoBoxTitle}>ZK-Rollup Processing</span>
                </div>
                <p className={styles.infoBoxText}>
                  Your proof will be encrypted and processed through a ZK-Rollup for privacy and verification.
                </p>
              </div>

              <button
                className={styles.submitButton}
                type="button"
                onClick={handleCompleteReward}
                disabled={isCompleting || questIsComplete}
              >
                {questIsComplete ? 'Quest completed' : isCompleting ? 'Submitting...' : `Submit entry (${questProgressLabel})`}
              </button>
            </>
          )}

          {/* No Proof */}
          {quest.rewardType === 'no-proof' && (
            <>
              <h3 className={styles.sectionTitle}>Complete Quest</h3>
              <p className={styles.sectionDescription}>
                Complete the task described above, then claim your {quest.points} points here.
              </p>

              <div className={styles.actionBox}>
                <div className={styles.actionIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className={styles.actionText}>
                  Once you&apos;ve completed the task, claim your quest below.
                </p>
              </div>

              <button
                className={styles.submitButton}
                type="button"
                onClick={handleCompleteReward}
                disabled={isCompleting || questIsComplete}
              >
                {questIsComplete ? 'Quest completed' : isCompleting ? 'Claiming...' : `Claim ${quest.points} pts`}
              </button>
            </>
          )}

          {/* Twitter Follow */}
          {quest.rewardType === 'twitter-follow' && (
            <>
              <h3 className={styles.sectionTitle}>Complete Quest</h3>
              <p className={styles.sectionDescription}>
                Connect your X account and follow @MentalWealthDAO to complete this quest.
              </p>

              <div className={styles.requirementsList}>
                <div className={styles.requirementItem}>
                  <div className={`${styles.checkIcon} ${step1Completed ? styles.checkIconCompleted : ''}`}>
                    {step1Completed ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>
                    )}
                  </div>
                  <div className={styles.requirementContent}>
                    <span className={styles.requirementTitle}>Step 1: Connect X Account</span>
                    <span className={styles.requirementDescription}>Link your X (Twitter) account to get started</span>
                  </div>
                  {!step1Completed && isConnected && (
                    <button className={styles.stepButton} onClick={handleConnectTwitter}>
                      Connect X
                    </button>
                  )}
                </div>

                <div className={styles.requirementItem}>
                  <div className={`${styles.checkIcon} ${step2Completed ? styles.checkIconCompleted : ''}`}>
                    {step2Completed ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>
                    )}
                  </div>
                  <div className={styles.requirementContent}>
                    <span className={styles.requirementTitle}>Step 2: Follow @MentalWealthDAO</span>
                    <span className={styles.requirementDescription}>Follow @MentalWealthDAO on X (Twitter)</span>
                  </div>
                  {step1Completed && !step2Completed && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <a
                        href="https://twitter.com/MentalWealthDAO"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.stepButton}
                        style={{ textDecoration: 'none' }}
                      >
                        Open Twitter
                      </a>
                      <button
                        className={styles.stepButton}
                        onClick={handleCheckFollow}
                        disabled={isCheckingFollow}
                      >
                        {isCheckingFollow ? 'Checking...' : 'Verify'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {step1Completed && step2Completed && (
                <button
                  className={styles.submitButton}
                  type="button"
                  onClick={handleCompleteReward}
                  disabled={isCompleting || questIsComplete}
                >
                  {questIsComplete ? 'Quest completed' : isCompleting ? 'Claiming...' : 'Complete quest'}
                </button>
              )}

              {!isConnected && (
                <div className={styles.infoBox}>
                  <p className={styles.infoBoxText}>Please sign in to complete this quest.</p>
                </div>
              )}
            </>
          )}

          {/* Follow and Own */}
          {quest.rewardType === 'follow-and-own' && (
            <>
              <h3 className={styles.sectionTitle}>Complete Quest</h3>
              <p className={styles.sectionDescription}>
                Follow the Farcaster account @daemonagent and own an Academic Angel to complete this quest.
              </p>

              <div className={styles.requirementsList}>
                <div className={styles.requirementItem}>
                  <div className={styles.checkIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div className={styles.requirementContent}>
                    <span className={styles.requirementTitle}>Follow @daemonagent</span>
                    <span className={styles.requirementDescription}>Follow the Farcaster account on Warpcast</span>
                  </div>
                </div>
                <div className={styles.requirementItem}>
                  <div className={styles.checkIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div className={styles.requirementContent}>
                    <span className={styles.requirementTitle}>Own an Academic Angel</span>
                    <span className={styles.requirementDescription}>Verify ownership of an Academic Angel NFT</span>
                  </div>
                </div>
              </div>

              <div className={styles.infoBox}>
                <div className={styles.infoBoxHeader}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.infoIcon}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className={styles.infoBoxTitle}>Verification</span>
                </div>
                <p className={styles.infoBoxText}>
                  Your Farcaster follow status and Academic Angel ownership will be automatically verified.
                </p>
              </div>

              <button className={styles.submitButton} type="button">
                Verify Completion
              </button>
            </>
          )}
        </div>
      </div>

      <ConfettiCelebration trigger={showConfetti} />
      {showShardAnimation && (
        <ShardAnimation
          shards={shardsAwarded}
          startingShards={startingShards}
          onComplete={() => setShowShardAnimation(false)}
        />
      )}
      <XConnectingModal isOpen={showConnectingModal} />
    </>
  );
};

export default QuestDetailModal;

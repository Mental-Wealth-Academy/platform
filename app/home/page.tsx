'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import OnboardingTour from '@/components/onboarding-tour/OnboardingTour';
import AvatarSelectionModal from '@/components/avatar-selection/AvatarSelectionModal';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { ShardAnimation } from '@/components/quests/ShardAnimation';
import { ConfettiCelebration } from '@/components/quests/ConfettiCelebration';
import { CalendarDays } from '@/components/calendar-days/CalendarDays';
import { CheckinCard } from '@/components/checkin-card/CheckinCard';
import { CoursesShowcase } from '@/components/landing/CoursesShowcase';
import Surveys from '@/components/survey/Surveys';
import AngelMintSection from '@/components/angel-mint-section/AngelMintSection';
import MintModal from '@/components/mint-modal/MintModal';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useBaseKitAutoSignin } from '@/components/miniapp/useBaseKitAutoSignin';
import {
  CalendarDaysSkeleton,
  CheckinCardSkeleton,
  SurveysSkeleton,
} from '@/components/skeleton/Skeleton';
import styles from './page.module.css';

export default function Home() {
  const { isConnected, address } = useAccount();
  const { isBaseKit } = useBaseKitAutoSignin();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [me, setMe] = useState<{ avatarUrl: string | null; username?: string | null; shardCount?: number; eventReservations?: string[] } | null>(null);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [rewardData, setRewardData] = useState<{ shards: number; startingShards: number } | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(true);

  // Staggered content loading - show skeletons briefly then reveal content
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsContentLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Handle X auth callback and auto quest completion
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const xAuth = params.get('x_auth');
    const autoCheck = params.get('auto_check');
    const onboardingParam = params.get('onboarding');

    // Check for onboarding query parameter
    if (onboardingParam === 'true') {
      window.history.replaceState({}, '', '/home');
      setShowOnboarding(true);
    }

    if (xAuth) {
      window.history.replaceState({}, '', '/home');
      if (xAuth === 'success') {
        window.dispatchEvent(new Event('xAccountUpdated'));

        if (autoCheck === 'true') {
          const autoCompleteQuest = async () => {
            try {
              const meResponse = await fetch('/api/me', { cache: 'no-store' });
              const meData = await meResponse.json();
              const startingShards = meData?.user?.shardCount ?? 0;

              const response = await fetch('/api/quests/auto-complete-twitter-quest', {
                method: 'POST',
                cache: 'no-store',
              });

              const data = await response.json();

              if (data.ok && data.shardsAwarded > 0) {
                setRewardData({
                  shards: data.shardsAwarded,
                  startingShards: data.startingShards || startingShards,
                });
                setShowRewardAnimation(true);
                window.dispatchEvent(new Event('shardsUpdated'));

                setTimeout(() => {
                  setShowRewardAnimation(false);
                  setRewardData(null);
                }, 5000);
              }
            } catch (error) {
              console.error('Failed to auto-complete quest:', error);
            }
          };

          setTimeout(() => {
            autoCompleteQuest();
          }, 1000);
        }
      }
    }
  }, []);

  // Fetch user data (non-blocking)
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/me', {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await response.json();

        if (data.user) {
          setMe(data.user);

          // Check if user needs onboarding
          try {
            const profileResponse = await fetch('/api/profile', {
              cache: 'no-store',
              credentials: 'include',
            });

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              const userProfile = profileData.user;

              const hasUsername = userProfile.username &&
                !userProfile.username.startsWith('user_');
              const needsOnboarding = !hasUsername;
              const isBaseKitUserWithCompleteProfile = isBaseKit && !needsOnboarding;

              if (needsOnboarding && !isBaseKitUserWithCompleteProfile) {
                setShowOnboarding(true);
              } else if (!data.user.avatarUrl) {
                setShowAvatarModal(true);
              }
            } else if (!data.user.avatarUrl) {
              setShowAvatarModal(true);
            }
          } catch (profileError) {
            console.error('Failed to fetch profile:', profileError);
            if (!data.user.avatarUrl) {
              setShowAvatarModal(true);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      }
    };

    fetchUserData();
  }, [isBaseKit]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = async () => {
      try {
        const meResponse = await fetch('/api/me', {
          cache: 'no-store',
          credentials: 'include',
        });
        const meData = await meResponse.json();

        if (meData.user) {
          setMe(meData.user);

          if (showOnboarding) {
            const profileResponse = await fetch('/api/profile', {
              cache: 'no-store',
              credentials: 'include',
            });

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              const userProfile = profileData.user;

              const hasUsername = userProfile.username &&
                !userProfile.username.startsWith('user_');
              const needsOnboarding = !hasUsername;

              if (!needsOnboarding) {
                setShowOnboarding(false);
                if (!meData.user.avatarUrl) {
                  setShowAvatarModal(true);
                }
              }
            }
          } else if (meData.user.avatarUrl) {
            setShowAvatarModal(false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [showOnboarding]);

  // Listen for openOnboarding event
  useEffect(() => {
    const handleOpenOnboarding = () => {
      setShowOnboarding(true);
    };

    window.addEventListener('openOnboarding', handleOpenOnboarding);
    return () => window.removeEventListener('openOnboarding', handleOpenOnboarding);
  }, []);

  return (
    <main className={styles.main}>
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        isWalletSignup={isConnected && !!address}
      />
      <AvatarSelectionModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onAvatarSelected={async () => {
          fetch('/api/me', {
            cache: 'no-store',
            credentials: 'include',
          })
            .then(res => res.json())
            .then(data => {
              if (data.user) {
                setMe(data.user);
              }
            })
            .catch(err => console.error('Failed to fetch user data:', err));
        }}
      />
      <OnboardingTour
        isBlocked={showOnboarding || showAvatarModal}
      />
      <SideNavigation />
      <div className={styles.pageLayout}>
        <div className={`${styles.content} ${!isContentLoading ? styles.contentLoaded : ''}`}>
          {isContentLoading ? (
            <>
              <CalendarDaysSkeleton />
              <CheckinCardSkeleton />
              <SurveysSkeleton />
            </>
          ) : (
            <>
              {me?.username && !me.username.startsWith('user_') && (
                <h1 className={styles.welcomeHeading}>Welcome {me.username}</h1>
              )}
              <div className={styles.staggeredItem}>
                <CalendarDays />
              </div>
              <div className={styles.staggeredItem}>
                <CheckinCard />
              </div>
              <div className={styles.staggeredItem}>
                <CoursesShowcase />
              </div>
              <div className={styles.staggeredItem}>
                <Surveys />
              </div>
            </>
          )}
        </div>
      </div>
      <AngelMintSection onOpenMintModal={() => setShowMintModal(true)} />
      <MintModal isOpen={showMintModal} onClose={() => setShowMintModal(false)} />
      {showRewardAnimation && rewardData && (
        <>
          <ConfettiCelebration trigger={true} />
          <ShardAnimation
            shards={rewardData.shards}
            startingShards={rewardData.startingShards}
            onComplete={() => setShowRewardAnimation(false)}
          />
        </>
      )}
    </main>
  );
}

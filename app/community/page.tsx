'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { providers } from 'ethers';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import AngelMintSection from '@/components/angel-mint-section/AngelMintSection';
import MintModal from '@/components/mint-modal/MintModal';
import StillTutorial, { TutorialStep } from '@/components/still-tutorial/StillTutorial';
import { AzuraPowerIndicator } from '@/components/soul-gems/SoulGemDisplay';
import TreasuryDisplay from '@/components/treasury-display/TreasuryDisplay';
import ProposalCard from '@/components/proposal-card/ProposalCard';
import ProposalDetailsModal from '@/components/proposal-card/ProposalDetailsModal';
import SubmitProposalModal from '@/components/voting/SubmitProposalModal';
import SwapModal from '@/components/swap/SwapModal';
import { VotingPageSkeleton, ProposalCardSkeleton } from '@/components/skeleton/Skeleton';
import CyberpunkDataViz from '@/components/cyberpunk-data-viz/CyberpunkDataViz';
import RewardDetailModal, { Reward } from '@/components/reward-detail-modal/RewardDetailModal';
import IntroLoaderOverlay from '@/components/intro-loader/IntroLoaderOverlay';
import {
  fetchProposal,
  ProposalStatus
} from '@/lib/azura-contract';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

interface ProposalReview {
  decision: 'approved' | 'rejected';
  reasoning: string;
  tokenAllocation: number | null;
  scores: {
    clarity: number;
    impact: number;
    feasibility: number;
    budget: number;
    ingenuity: number;
    chaos: number;
  } | null;
  reviewedAt: string;
  onChainProposalId: string | null;
}

interface DatabaseProposal {
  id: string;
  title: string;
  proposalMarkdown: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'active' | 'completed';
  walletAddress: string;
  createdAt: string;
  onChainProposalId: string | null;
  onChainTxHash: string | null;
  user: {
    username: string | null;
    avatarUrl: string | null;
  };
  review: ProposalReview | null;
}

interface MergedProposal extends DatabaseProposal {
  onChainData?: {
    forVotes: string;
    againstVotes: string;
    votingDeadline: number;
    azuraLevel: number;
    executed: boolean;
  };
}

interface CommunityAvatarUser {
  username: string;
  avatarUrl: string | null;
}

interface LeaderboardUser {
  username: string;
  avatarUrl: string | null;
}

const getTutorialSteps = (): TutorialStep[] => [
  {
    message: 'Hey there! Welcome to the Decision Room. I\'m Blue, your friendly co-pilot. Think of this space as our community garden—where good ideas get the sunshine they need to grow.',
    emotion: 'happy',
  },
  {
    message: 'Got an idea? Submit it and I\'ll give it a thoughtful read. I check for clarity, positive impact, and whether it\'s doable. Clear proposals help everyone feel heard and understood.',
    emotion: 'happy',
    targetElement: '[data-tutorial-target="voting-stages"]',
  },
  {
    message: 'Once a proposal passes my vibe check, it goes to the whole community. Your voice matters here—every vote helps shape what we build together. Collective wisdom is powerful.',
    emotion: 'happy',
    targetElement: '[data-tutorial-target="admin-room"]',
  },
  {
    message: 'Each proposal is someone\'s way of saying "I care about this community." Whether it passes or not, putting ideas out there takes courage. We celebrate that energy.',
    emotion: 'confused',
    targetElement: '[data-tutorial-target="submission"]',
  },
  {
    message: 'This space is about us supporting each other\'s growth. You bring the ideas, I help nurture them, and together we make something meaningful. Ready to participate?',
    emotion: 'happy',
  },
];


const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AZURA_KILLSTREAK_ADDRESS || '0x2cbb90a761ba64014b811be342b8ef01b471992d';
const GOV_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS || '0x84939fEc50EfdEDC8522917645AAfABFd5b3EA6F';
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base mainnet USDC
const AZURA_ADDRESS = '0x0920553CcA188871b146ee79f562B4Af46aB4f8a';

export default function VotingPage() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [proposals, setProposals] = useState<MergedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<MergedProposal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [showMintModal, setShowMintModal] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [activeTab, setActiveTab] = useState<'proposals' | 'pods' | 'rewards'>('pods');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [communityAvatars, setCommunityAvatars] = useState<CommunityAvatarUser[]>([]);
  const [showIntroLoader, setShowIntroLoader] = useState(true);
  const { play } = useSound();

  useEffect(() => {
    setIsLoaded(true);
    // Show skeleton briefly, then reveal content
    const timer = setTimeout(() => {
      setIsContentLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchProposals();
    fetchCommunityAvatars();
  }, []);

  const fetchCommunityAvatars = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard users');
      }

      const data = await response.json();
      const users: LeaderboardUser[] = Array.isArray(data.users) ? data.users : [];
      const uniqueUsers = users
        .filter((user: LeaderboardUser) => Boolean(user?.username))
        .filter((user: LeaderboardUser, index: number, list: LeaderboardUser[]) =>
          list.findIndex((entry) => entry.username === user.username) === index
        )
        .slice(0, 7)
        .map((user: LeaderboardUser) => ({
          username: user.username,
          avatarUrl: user.avatarUrl ?? null,
        }));

      setCommunityAvatars(uniqueUsers);
    } catch (error) {
      console.error('Error fetching community avatars:', error);
      setCommunityAvatars([]);
    }
  };

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch reviewed proposals from database
      const dbResponse = await fetch('/api/voting/proposals');
      if (!dbResponse.ok) {
        throw new Error('Failed to fetch proposals from database');
      }

      const dbData = await dbResponse.json();
      const dbProposals: DatabaseProposal[] = dbData.proposals || [];

      // For proposals with on_chain_proposal_id, fetch on-chain data
      const mergedProposals: MergedProposal[] = await Promise.all(
        dbProposals.map(async (proposal) => {
          // If proposal has on-chain ID, fetch on-chain data
          if (
            proposal.review?.onChainProposalId &&
            (proposal.status === 'approved' || proposal.status === 'active' || proposal.status === 'completed')
          ) {
            try {
              // Use wallet provider if available, otherwise fall back to public RPC
              const provider = typeof window.ethereum !== 'undefined'
                ? new providers.Web3Provider(window.ethereum)
                : new providers.JsonRpcProvider('https://mainnet.base.org');
              const onChainProposal = await fetchProposal(
                CONTRACT_ADDRESS,
                parseInt(proposal.review.onChainProposalId),
                provider as providers.Web3Provider
              );

              return {
                ...proposal,
                onChainData: {
                  forVotes: onChainProposal.forVotes,
                  againstVotes: onChainProposal.againstVotes,
                  votingDeadline: onChainProposal.votingDeadline,
                  azuraLevel: onChainProposal.azuraLevel,
                  executed: onChainProposal.executed,
                },
              };
            } catch (error) {
              console.error(`Error fetching on-chain data for proposal ${proposal.id}:`, error);
              // Continue without on-chain data
            }
          }

          return proposal as MergedProposal;
        })
      );

      setProposals(mergedProposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      setError('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const handleTutorialComplete = () => {
    localStorage.setItem('hasSeenAdminTutorial', 'true');
    setShowTutorial(false);
  };

  const handleViewDetails = (proposalId: string) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (proposal) {
      setSelectedProposal(proposal);
      setIsModalOpen(true);
    }
  };

  return (
    <>
      {showIntroLoader && (
        <IntroLoaderOverlay
          src="/loaders/Gradient%20Dots%20Background.lottie"
          label="Opening community"
          onFinish={() => setShowIntroLoader(false)}
        />
      )}

      <StillTutorial
        steps={getTutorialSteps()}
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={handleTutorialComplete}
        title="Voting Guide"
        showProgress={true}
      />
      <div className={styles.pageLayout}>
        <SideNavigation />
        <main className={styles.page}>
        <div className={styles.content}>
          {isContentLoading ? (
            <VotingPageSkeleton />
          ) : (
          <>
          <div className={`${styles.hero} ${isLoaded ? styles.heroLoaded : ''}`}>
            <header className={styles.header}>
              <div className={styles.headerContent}>
                <div className={styles.headerText}>
                  <div className={styles.heroActions}>
                    <div className={styles.heroAzura}>
                      <div className={styles.exchangeBg}><CyberpunkDataViz /></div>
                      <AzuraPowerIndicator
                        soulGems="40000"
                        walletAddress={AZURA_ADDRESS}
                        governanceTokenAddress={GOV_TOKEN_ADDRESS}
                        memberAvatars={communityAvatars.map((user) => ({
                          src: user.avatarUrl,
                          alt: user.username,
                          fallback: user.username.slice(0, 1).toUpperCase(),
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </div>

          {/* Stat Cards — side by side */}
          <div className={styles.statCardsRow}>
            <div className={styles.statCardCompact}>
              <TreasuryDisplay
                contractAddress={CONTRACT_ADDRESS}
                usdcAddress={USDC_ADDRESS}
                className={styles.treasuryHeroCard}
              />
            </div>
            <div className={styles.statCardCompact}>
              <div className={`${styles.exchangeCard} ${styles.votingPowerCard} ${styles.staticInfoCard}`}>
                <div className={styles.exchangeHeader}>
                  <div className={styles.exchangeIcon}>
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 9.5H20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      <path d="M6 14.5H18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      <circle cx="8" cy="9.5" r="1.8" fill="currentColor"/>
                      <circle cx="16" cy="14.5" r="1.8" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className={styles.exchangeTitleText}>
                    <span className={styles.exchangeLabel}>Community Reserve</span>
                    <span className={styles.exchangeTitle}>Treasury</span>
                  </div>
                </div>
                <div className={styles.exchangePriceRow}>
                  <span className={styles.exchangePrice}>$5,200</span>
                  <span className={styles.exchangeCurrency}>USDC available</span>
                </div>
                <p className={styles.exchangeDesc}>
                  Shared community reserve for wellness support, platform infrastructure, creator rewards, and proposals the community votes to fund together over time.
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <section className={styles.podGrid}>
            <div
              className={`${styles.podCard} ${activeTab === 'pods' ? styles.podCardActive : ''}`}
              onClick={() => { play('click'); setActiveTab('pods'); }}
              onMouseEnter={() => play('hover')}
            >
              <div className={styles.podIcon}>
                <Image src="/icons/community-pods.svg" alt="Community Pods" width={40} height={40} />
              </div>
              <h3 className={styles.podTitle}>Treasury</h3>
              <p className={styles.podDesc}>Shared budgets for wellness, infrastructure, and community initiatives</p>
            </div>
            <div
              className={`${styles.podCard} ${activeTab === 'rewards' ? styles.podCardActive : ''}`}
              onClick={() => { play('click'); setActiveTab('rewards'); }}
              onMouseEnter={() => play('hover')}
            >
              <div className={styles.podIcon}>
                <Image src="/icons/rewards.svg" alt="Quests" width={40} height={40} />
              </div>
              <h3 className={styles.podTitle}>Quests</h3>
              <p className={styles.podDesc}>Earn from contributing to shared resources and collective growth</p>
            </div>
            <div
              className={`${styles.podCard} ${activeTab === 'proposals' ? styles.podCardActive : ''}`}
              onClick={() => { play('click'); setActiveTab('proposals'); }}
              onMouseEnter={() => play('hover')}
            >
              <div className={styles.podIcon}>
                <Image src="/icons/proposals.svg" alt="Proposals" width={40} height={40} />
              </div>
              <h3 className={styles.podTitle}>Proposals</h3>
              <p className={styles.podDesc}>A shared reserve that grows when the community invests together</p>
            </div>
          </section>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {activeTab === 'proposals' && (
              <>
              <button
                className={styles.primaryCta}
                onClick={() => { play('click'); setIsSubmitModalOpen(true); }}
                onMouseEnter={() => play('hover')}
                type="button"
              >
                <span className={styles.proposalLabel}>Submit a Proposal</span>
                <span className={styles.proposalPrice}>100 shards to submit</span>
              </button>
              {loading ? (
                  <div className={styles.proposalsGrid}>
                    {[...Array(3)].map((_, i) => (
                      <ProposalCardSkeleton key={i} />
                    ))}
                  </div>
                ) : proposals.length === 0 ? (
                  <div className={styles.emptyState}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <h3>No proposals yet</h3>
                    <p>Be the first to submit a proposal to the community!</p>
                  </div>
                ) : error ? (
                  <div className={styles.errorState}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <h3>Error Loading Proposals</h3>
                    <p>{error}</p>
                    <button onClick={() => { play('click'); window.location.reload(); }} onMouseEnter={() => play('hover')} className={styles.retryButton} type="button">
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className={styles.proposalsGrid} data-tutorial-target="submission">
                    {proposals.map((proposal) => (
                      <div key={proposal.id} className={styles.proposalCardContainer} onMouseEnter={() => play('hover')}>
                        <ProposalCard
                          id={proposal.id}
                          title={proposal.title}
                          proposalMarkdown={proposal.proposalMarkdown}
                          status={proposal.status}
                          walletAddress={proposal.walletAddress}
                          createdAt={proposal.createdAt}
                          user={proposal.user}
                          review={proposal.review}
                          onViewDetails={handleViewDetails}
                          showAvatar={false}
                          onChainProposalId={proposal.review?.onChainProposalId ? parseInt(proposal.review.onChainProposalId) : null}
                          onChainData={proposal.onChainData || null}
                        />

                        {proposal.onChainTxHash && (
                          <div className={styles.onChainInfo}>
                            <div className={styles.onChainBadge}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="currentColor"/>
                                <path d="M3 17L12 22L21 17" fill="currentColor" fillOpacity="0.6"/>
                                <path d="M3 12L12 17L21 12" fill="currentColor" fillOpacity="0.8"/>
                              </svg>
                              <span>Recorded Transparently</span>
                            </div>
                            <a
                              href={`https://basescan.org/tx/${proposal.onChainTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.txLink}
                              onClick={() => play('navigation')}
                              onMouseEnter={() => play('hover')}
                            >
                              View Transaction →
                            </a>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'pods' && (
              <section className={styles.fundingSection}>
                <p className={styles.fundingSectionLabel}>Funding Pods</p>
                <div className={styles.fundingGrid}>
                {[
                  {
                    title: 'Brand Awareness',
                    amount: 2100,
                    total: 5200,
                    desc: 'Outreach, partnerships, and marketing that drives community growth',
                    accent: 'var(--color-primary)',
                  },
                  {
                    title: 'Internal Research',
                    amount: 1820,
                    total: 5200,
                    desc: 'R&D, tooling, and knowledge infrastructure for the academy',
                    accent: 'var(--color-tertiary)',
                  },
                  {
                    title: 'Emergency Individual Support',
                    amount: 1280,
                    total: 5200,
                    desc: 'Safety net for members facing unexpected hardship',
                    accent: '#E85D3A',
                  },
                ].map((pod) => (
                  <div key={pod.title} className={styles.fundingCard} onMouseEnter={() => play('hover')}>
                    <div className={styles.fundingAccent} style={{ background: pod.accent }} />
                    <div className={styles.fundingLeft}>
                      <div className={styles.fundingAmount}>${pod.amount.toLocaleString()}</div>
                      <span className={styles.fundingPercent}>
                        {Math.round((pod.amount / pod.total) * 100)}%
                      </span>
                    </div>
                    <div className={styles.fundingRight}>
                      <h3 className={styles.fundingTitle}>{pod.title}</h3>
                      <p className={styles.fundingDesc}>{pod.desc}</p>
                      <div className={styles.fundingBar}>
                        <div
                          className={styles.fundingBarFill}
                          style={{ width: `${(pod.amount / pod.total) * 100}%`, background: pod.accent }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </section>
            )}

            {activeTab === 'rewards' && (
              <section className={styles.bountyGrid}>
                {([
                  { id: 'reward-blog', title: 'Write a community blog post', points: 50, desc: 'Share knowledge or a personal story with the community', rewardType: 'proof-required' as const },
                  { id: 'reward-onboard', title: 'Onboard a new member', points: 75, desc: 'Walk someone through their first week in the academy', rewardType: 'no-proof' as const },
                  { id: 'reward-study', title: 'Host a study session', points: 100, desc: 'Lead a group learning session on any relevant topic', rewardType: 'proof-required' as const },
                  { id: 'reward-bug', title: 'Submit a bug report', points: 30, desc: 'Find and document a bug in the platform with steps to reproduce', rewardType: 'proof-required' as const },
                  { id: 'reward-social', title: 'Design a social media asset', points: 60, desc: 'Create a shareable graphic that represents MWA values', rewardType: 'proof-required' as const },
                  { id: 'reward-twitter', title: 'Follow @MentalWealthDAO on X', points: 40, desc: 'Connect your X account and follow the official MWA account', rewardType: 'twitter-follow' as const },
                ] satisfies Reward[]).map((bounty) => (
                  <div
                    key={bounty.id}
                    className={styles.bountyCard}
                    onMouseEnter={() => play('hover')}
                    onClick={() => { play('click'); setSelectedReward(bounty); setIsRewardModalOpen(true); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.bountyHeader}>
                      <h3 className={styles.bountyTitle}>{bounty.title}</h3>
                      <span className={styles.bountyPoints}>{bounty.points} pts</span>
                    </div>
                    <p className={styles.podDesc}>{bounty.desc}</p>
                  </div>
                ))}
              </section>
            )}
          </div>

          <AngelMintSection onOpenMintModal={() => setShowMintModal(true)} />
          </>
          )}
        </div>
      </main>
      </div>
      <MintModal isOpen={showMintModal} onClose={() => setShowMintModal(false)} />

      {selectedProposal && (
        <ProposalDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProposal(null);
          }}
          proposal={selectedProposal}
          onChainProposalId={selectedProposal.review?.onChainProposalId ? parseInt(selectedProposal.review.onChainProposalId) : null}
          contractAddress={CONTRACT_ADDRESS}
          onVoted={fetchProposals}
        />
      )}

      <SubmitProposalModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSuccess={fetchProposals}
      />

      <SwapModal isOpen={isSwapOpen} onClose={() => setIsSwapOpen(false)} />

      <RewardDetailModal
        isOpen={isRewardModalOpen}
        onClose={() => { setIsRewardModalOpen(false); setSelectedReward(null); }}
        reward={selectedReward}
      />

      {showDemo && (
        <div className={styles.demoOverlay} onClick={() => setShowDemo(false)}>
          <div className={styles.demoContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.demoHeader}>
              <span className={styles.demoLabel}>DEMO // TRANSMISSION</span>
              <button
                className={styles.demoClose}
                onClick={() => { play('click'); setShowDemo(false); }}
                onMouseEnter={() => play('hover')}
                type="button"
                aria-label="Close demo"
              >
                &times;
              </button>
            </div>
            <div className={styles.demoVideoWrapper}>
              <iframe
                src="https://www.youtube.com/embed/_i2itVBQSX4?autoplay=1&mute=1"
                title="Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className={styles.demoVideo}
              />
            </div>
            <div className={styles.demoScanline} />
          </div>
        </div>
      )}
    </>
  );
}

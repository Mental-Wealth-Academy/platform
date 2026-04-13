'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { providers } from 'ethers';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import AngelMintSection from '@/components/angel-mint-section/AngelMintSection';
import MintModal from '@/components/mint-modal/MintModal';
import StillTutorial, { TutorialStep } from '@/components/still-tutorial/StillTutorial';
import TreasuryDisplay from '@/components/treasury-display/TreasuryDisplay';
import ProposalCard from '@/components/proposal-card/ProposalCard';
import ProposalDetailsModal from '@/components/proposal-card/ProposalDetailsModal';
import SubmitProposalModal from '@/components/voting/SubmitProposalModal';
import { VotingPageSkeleton, ProposalCardSkeleton } from '@/components/skeleton/Skeleton';
import IntroLoaderOverlay from '@/components/intro-loader/IntroLoaderOverlay';
import {
  fetchProposal
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
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base mainnet USDC
const FUNDING_PODS = [
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
    accent: '#2FB7A0',
  },
  {
    title: 'Emergency Individual Support',
    amount: 1280,
    total: 5200,
    desc: 'Safety net for members facing unexpected hardship',
    accent: '#E85D3A',
  },
] as const;

export default function VotingPage() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [proposals, setProposals] = useState<MergedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<MergedProposal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [showMintModal, setShowMintModal] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [communityView, setCommunityView] = useState<'overview' | 'proposals'>('overview');
  const [activeFundingSlide, setActiveFundingSlide] = useState(1);
  const [isFundingTransitionEnabled, setIsFundingTransitionEnabled] = useState(true);
  const [showIntroLoader, setShowIntroLoader] = useState(true);
  const { play } = useSound();

  useEffect(() => {
    // Show skeleton briefly, then reveal content
    const timer = setTimeout(() => {
      setIsContentLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchProposals();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveFundingSlide((prev) => prev + 1);
    }, 4200);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isFundingTransitionEnabled) {
      const frame = window.requestAnimationFrame(() => {
        setIsFundingTransitionEnabled(true);
      });

      return () => window.cancelAnimationFrame(frame);
    }
  }, [isFundingTransitionEnabled]);

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

  const fundingSlides = [
    FUNDING_PODS[FUNDING_PODS.length - 1],
    ...FUNDING_PODS,
    FUNDING_PODS[0],
  ];
  const activeFundingIndicator = (activeFundingSlide - 1 + FUNDING_PODS.length) % FUNDING_PODS.length;
  const handleFundingTrackTransitionEnd = () => {
    if (activeFundingSlide === FUNDING_PODS.length + 1) {
      setIsFundingTransitionEnabled(false);
      setActiveFundingSlide(1);
    }
  };

  return (
    <>
      {showIntroLoader && (
        <IntroLoaderOverlay
          src="/loaders/Treasure%20Chest.lottie"
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
          <div className={styles.communityTopbar}>
            <div className={styles.communityTabs} role="tablist" aria-label="Community views">
              <button
                type="button"
                role="tab"
                aria-selected={communityView === 'overview'}
                className={`${styles.communityTab} ${communityView === 'overview' ? styles.communityTabActive : ''}`}
                onClick={() => { play('click'); setCommunityView('overview'); }}
                onMouseEnter={() => play('hover')}
              >
                Community
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={communityView === 'proposals'}
                className={`${styles.communityTab} ${communityView === 'proposals' ? styles.communityTabActive : ''}`}
                onClick={() => { play('click'); setCommunityView('proposals'); }}
                onMouseEnter={() => play('hover')}
              >
                Proposals
              </button>
            </div>

            {communityView === 'overview' && (
              <button
                type="button"
                className={styles.proposalsEntryButton}
                onClick={() => { play('click'); setCommunityView('proposals'); }}
                onMouseEnter={() => play('hover')}
              >
                <div className={styles.proposalsEntryIcon}>
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 6.5H17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M7 12H17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M7 17.5H13.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="17.5" cy="17.5" r="1.5" fill="currentColor" />
                  </svg>
                </div>
                <div className={styles.proposalsEntryContent}>
                  <span className={styles.proposalsEntryLabel}>Proposals</span>
                  <span className={styles.proposalsEntryMeta}>Submit ideas for funding and shape what the community builds next.</span>
                </div>
              </button>
            )}
          </div>

          <div className={styles.communityViewViewport}>
            <div
              className={styles.communityViewTrack}
              style={{ transform: communityView === 'proposals' ? 'translateX(-50%)' : 'translateX(0%)' }}
            >
              <section className={styles.communityViewPanel}>
                <section className={styles.fundingSection}>
                  <div className={styles.fundingCarouselViewport}>
                    <div
                      className={styles.fundingCarouselTrack}
                      style={{
                        transform: `translateX(-${activeFundingSlide * 20}%)`,
                        transition: isFundingTransitionEnabled ? 'transform 760ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
                      }}
                      onTransitionEnd={handleFundingTrackTransitionEnd}
                    >
                      {fundingSlides.map((pod, index) => (
                        <div key={`${pod.title}-${index}`} className={styles.fundingCarouselSlide}>
                          <div
                            className={`${styles.exchangeCard} ${styles.staticInfoCard} ${styles.fundingStateCard}`}
                            onMouseEnter={() => play('hover')}
                            style={{ ['--funding-accent' as string]: pod.accent }}
                          >
                            <div className={styles.exchangeHeader}>
                              <div className={`${styles.exchangeIcon} ${styles.fundingStateIcon}`}>
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4 12h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                  <path d="M8 8h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                  <path d="M8 16h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                </svg>
                              </div>
                              <div className={styles.exchangeTitleText}>
                                <span className={styles.exchangeLabel}>Funding Pod</span>
                                <span className={styles.exchangeTitle}>{pod.title}</span>
                              </div>
                            </div>
                            <div className={styles.fundingStateMetrics}>
                              <div className={styles.exchangePriceRow}>
                                <span className={styles.exchangePrice}>${pod.amount.toLocaleString()}</span>
                                <span className={styles.exchangeCurrency}>allocated</span>
                              </div>
                              <span className={styles.fundingStatePercent}>
                                {Math.round((pod.amount / pod.total) * 100)}% of treasury
                              </span>
                            </div>
                            <p className={styles.exchangeDesc}>{pod.desc}</p>
                            <div className={styles.fundingStateProgress}>
                              <div
                                className={styles.fundingStateProgressFill}
                                style={{ width: `${(pod.amount / pod.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.fundingIndicators} aria-label="Funding pod states">
                    {FUNDING_PODS.map((pod, index) => (
                      <button
                        key={pod.title}
                        type="button"
                        className={`${styles.fundingIndicator} ${index === activeFundingIndicator ? styles.fundingIndicatorActive : ''}`}
                        onClick={() => {
                          play('click');
                          setIsFundingTransitionEnabled(true);
                          setActiveFundingSlide(index + 1);
                        }}
                        onMouseEnter={() => play('hover')}
                        aria-pressed={index === activeFundingIndicator}
                        aria-label={`Show ${pod.title}`}
                        style={{ ['--funding-accent' as string]: pod.accent }}
                      />
                    ))}
                  </div>
                </section>

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

                <AngelMintSection onOpenMintModal={() => setShowMintModal(true)} />
              </section>

              <section className={styles.communityViewPanel}>
                <div className={styles.tabContent}>
                  <button
                    className={styles.primaryCta}
                    onClick={() => { play('click'); setIsSubmitModalOpen(true); }}
                    onMouseEnter={() => play('hover')}
                    type="button"
                  >
                    <span className={styles.proposalLabel}>Submit a Proposal</span>
                    <span className={styles.proposalReward}>
                      <span className={styles.proposalRewardIcon} aria-hidden="true">
                        <Image
                          src="/icons/ui-shard.svg"
                          alt=""
                          width={16}
                          height={16}
                          unoptimized
                        />
                      </span>
                      <span className={styles.proposalRewardValue}>+500</span>
                    </span>
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
                </div>
              </section>
            </div>
          </div>
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

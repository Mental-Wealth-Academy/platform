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

const FUNDING_CAROUSEL_REPEAT_COUNT = 4;
const FUNDING_CAROUSEL_START_INDEX = FUNDING_PODS.length;

const SENTIMENT_CHART_WIDTH = 100;
const SENTIMENT_CHART_HEIGHT = 60;

type SentimentSeries = { label: string; color: string; values: number[] };

const SENTIMENT_SERIES: SentimentSeries[] = [
  {
    label: 'Ascension',
    color: '#79c6ff',
    values: [0.30, 0.34, 0.42, 0.48, 0.44, 0.38, 0.36, 0.42, 0.50, 0.54, 0.58, 0.52, 0.46, 0.50],
  },
  {
    label: 'Abundance',
    color: '#5168FF',
    values: [0.46, 0.52, 0.55, 0.52, 0.48, 0.54, 0.62, 0.68, 0.70, 0.64, 0.58, 0.62, 0.66, 0.70],
  },
  {
    label: 'Radiance',
    color: '#8a7dff',
    values: [0.58, 0.66, 0.74, 0.68, 0.60, 0.54, 0.64, 0.78, 0.92, 0.96, 0.88, 0.80, 0.74, 0.78],
  },
  {
    label: 'Expansion',
    color: '#74C465',
    values: [0.38, 0.42, 0.48, 0.52, 0.54, 0.48, 0.44, 0.50, 0.56, 0.60, 0.56, 0.50, 0.48, 0.52],
  },
  {
    label: 'Benevolence',
    color: '#E85D9F',
    values: [0.24, 0.28, 0.32, 0.34, 0.36, 0.40, 0.44, 0.46, 0.50, 0.52, 0.54, 0.56, 0.55, 0.58],
  },
  {
    label: 'Charity',
    color: '#F97A3F',
    values: [0.26, 0.24, 0.22, 0.30, 0.40, 0.46, 0.50, 0.42, 0.36, 0.42, 0.50, 0.56, 0.50, 0.42],
  },
];

function buildStreamLayers(series: SentimentSeries[], width: number, height: number) {
  const n = series[0].values.length;
  const totals = Array.from({ length: n }, (_, i) =>
    series.reduce((acc, s) => acc + s.values[i], 0)
  );
  const maxTotal = Math.max(...totals);
  const scale = (height - 6) / maxTotal;
  const center = height / 2;
  const xs = Array.from({ length: n }, (_, i) => (i / (n - 1)) * width);

  return series.map((s, layerIdx) => {
    const points = xs.map((x, i) => {
      const stackedBelow = series.slice(0, layerIdx).reduce((acc, ss) => acc + ss.values[i], 0);
      const y0 = center - (totals[i] / 2 - stackedBelow) * scale;
      const y1 = y0 - s.values[i] * scale;
      return { x, y0, y1 };
    });
    return { label: s.label, color: s.color, points };
  });
}

function smoothBetween(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const cx = ((p1.x + p2.x) / 2).toFixed(2);
    d += ` C ${cx} ${p1.y.toFixed(2)}, ${cx} ${p2.y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function streamLayerPath(points: { x: number; y0: number; y1: number }[]): string {
  const top = points.map((p) => ({ x: p.x, y: p.y1 }));
  const bottom = points.map((p) => ({ x: p.x, y: p.y0 })).reverse();
  const topPath = smoothBetween(top);
  const bottomSegments = bottom
    .slice(1)
    .map((point, index) => {
      const prev = bottom[index];
      const cx = ((prev.x + point.x) / 2).toFixed(2);
      return `C ${cx} ${prev.y.toFixed(2)}, ${cx} ${point.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(' ');
  return `${topPath} L ${bottom[0].x.toFixed(2)} ${bottom[0].y.toFixed(2)} ${bottomSegments} Z`;
}

const SENTIMENT_STREAM_LAYERS = buildStreamLayers(
  SENTIMENT_SERIES,
  SENTIMENT_CHART_WIDTH,
  SENTIMENT_CHART_HEIGHT,
).map((layer) => ({ ...layer, d: streamLayerPath(layer.points) }));

const VOTER_TONES = ['Blue', 'Violet', 'Warm', 'Teal', 'Amber'] as const;

function deriveInitials(value: string | null | undefined): string {
  if (!value) return '··';
  const trimmed = value.replace(/^0x/i, '').trim();
  if (!trimmed) return '··';
  const letters = trimmed.replace(/[^a-z0-9]/gi, '');
  return (letters.slice(0, 2) || trimmed.slice(0, 2)).toUpperCase();
}

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
  const [activeFundingSlide, setActiveFundingSlide] = useState<number>(FUNDING_CAROUSEL_START_INDEX);
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
    }, 5600);

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

  const recentVoters = (() => {
    const seen = new Set<string>();
    const picks: {
      id: string;
      avatarUrl: string | null;
      name: string;
      initials: string;
      tone: (typeof VOTER_TONES)[number];
    }[] = [];
    for (const p of proposals) {
      if (!(p.user.username || p.user.avatarUrl || p.walletAddress)) continue;
      const key = (p.walletAddress || p.user.username || p.id).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      picks.push({
        id: p.id,
        avatarUrl: p.user.avatarUrl,
        name: p.user.username || p.walletAddress || 'Community member',
        initials: deriveInitials(p.user.username || p.walletAddress),
        tone: VOTER_TONES[picks.length % VOTER_TONES.length],
      });
      if (picks.length === VOTER_TONES.length) break;
    }
    return picks;
  })();

  const fundingSlides = Array.from(
    { length: FUNDING_CAROUSEL_REPEAT_COUNT },
    () => FUNDING_PODS
  ).flat();
  const fundingSlideWidth = 100 / fundingSlides.length;
  const activeFundingIndicator = activeFundingSlide % FUNDING_PODS.length;
  const handleFundingTrackTransitionEnd = () => {
    if (activeFundingSlide >= fundingSlides.length - FUNDING_PODS.length) {
      setIsFundingTransitionEnabled(false);
      setActiveFundingSlide(FUNDING_CAROUSEL_START_INDEX);
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
          <div className={styles.communityMainWrapper}>
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
            </div>

            <div className={styles.communityViewViewport}>
              {communityView === 'overview' && (
                <section className={styles.communityViewPanel}>
                <div className={styles.reserveCard}>
                  <header className={styles.reserveHeader}>
                    <div className={styles.reserveHeaderLeft}>
                      <div className={styles.reserveIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <rect x="2" y="6" width="20" height="14" rx="2" fill="currentColor" />
                          <rect x="2" y="9" width="20" height="3" fill="currentColor" opacity="0.7" />
                          <circle cx="17" cy="16" r="2" fill="#ffffff" />
                        </svg>
                      </div>
                      <div className={styles.reserveTitleText}>
                        <span className={styles.reserveTitle}>Community Treasury</span>
                      </div>
                    </div>
                    <div className={styles.reserveAmountCol}>
                      <span className={styles.reserveAmount}>$5,200</span>
                      <span className={styles.reserveUnit}>USDC pooled</span>
                    </div>
                  </header>
                  <div className={styles.reserveInsightsGrid}>
                    <section className={styles.reserveInsightCard}>
                      <div className={styles.reserveInsightHeader}>
                        <span className={styles.reserveInsightLabel}>Recent Votes</span>
                        <span className={styles.reserveInsightMeta}>{recentVoters.length || 0} members</span>
                      </div>
                      <div className={styles.reserveAvatarRow} aria-label="Recent voter activity">
                        {recentVoters.length === 0 ? (
                          <span className={styles.reserveAvatarEmpty}>No votes yet</span>
                        ) : (
                          recentVoters.map((voter) => (
                            <span
                              key={voter.id}
                              className={`${styles.reserveAvatar} ${styles[`reserveAvatar${voter.tone}`]}`}
                              title={voter.name}
                            >
                              {voter.avatarUrl ? (
                                <Image
                                  src={voter.avatarUrl}
                                  alt={voter.name}
                                  width={34}
                                  height={34}
                                  className={styles.reserveAvatarImage}
                                  unoptimized
                                />
                              ) : (
                                <span className={styles.reserveAvatarInitials}>{voter.initials}</span>
                              )}
                            </span>
                          ))
                        )}
                      </div>
                      <p className={styles.reserveInsightText}>A calm majority is forming around care and research tools.</p>
                    </section>

                    <section className={styles.reserveInsightCard}>
                      <div className={styles.reserveInsightHeader}>
                        <span className={styles.reserveInsightLabel}>Sentiment</span>
                        <span className={styles.reserveSentimentValue}>Radiant</span>
                      </div>
                      <div
                        className={styles.reserveSentimentChart}
                        role="img"
                        aria-label={`Stacked sentiment flow across ${SENTIMENT_SERIES.map((s) => s.label).join(', ')}`}
                      >
                        <svg
                          viewBox={`0 0 ${SENTIMENT_CHART_WIDTH} ${SENTIMENT_CHART_HEIGHT}`}
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          {SENTIMENT_STREAM_LAYERS.map((layer) => (
                            <path
                              key={layer.label}
                              d={layer.d}
                              fill={layer.color}
                              fillOpacity="0.88"
                            />
                          ))}
                        </svg>
                      </div>
                      <div className={styles.reserveSentimentLegend} aria-hidden="true">
                        {SENTIMENT_SERIES.map((facet) => (
                          <span key={facet.label} className={styles.reserveSentimentLegendItem}>
                            <span
                              className={styles.reserveSentimentLegendDot}
                              style={{ backgroundColor: facet.color }}
                            />
                            {facet.label}
                          </span>
                        ))}
                      </div>
                    </section>
                  </div>
                  <div className={styles.reserveFundingSection}>
                    <div className={styles.reserveInsightHeader}>
                      <span className={styles.reserveInsightLabel}>Recently Funded</span>
                      <span className={styles.reserveInsightMeta}>Last 3 approvals</span>
                    </div>
                    <div className={styles.reserveFundingList}>
                      <article className={styles.reserveFundingItem}>
                        <div>
                          <p className={styles.reserveFundingTitle}>Peer support sprint</p>
                          <p className={styles.reserveFundingNote}>Member care pod</p>
                        </div>
                        <span className={styles.reserveFundingAmount}>$1.2k</span>
                      </article>
                      <article className={styles.reserveFundingItem}>
                        <div>
                          <p className={styles.reserveFundingTitle}>Research library credits</p>
                          <p className={styles.reserveFundingNote}>Knowledge tools</p>
                        </div>
                        <span className={styles.reserveFundingAmount}>$640</span>
                      </article>
                      <article className={styles.reserveFundingItem}>
                        <div>
                          <p className={styles.reserveFundingTitle}>Emergency relief grant</p>
                          <p className={styles.reserveFundingNote}>Fast-track aid</p>
                        </div>
                        <span className={styles.reserveFundingAmount}>$400</span>
                      </article>
                    </div>
                  </div>
                </div>

                <div className={styles.overviewAngelSection}>
                  <AngelMintSection onOpenMintModal={() => setShowMintModal(true)} />
                </div>

                <section className={styles.fundingSection}>
                  <div className={styles.fundingCarouselViewport}>
                    <div className={styles.fundingCarouselMask}>
                      <div
                        className={styles.fundingCarouselTrack}
                        style={{
                          width: `${fundingSlides.length * 100}%`,
                          transform: `translateX(-${activeFundingSlide * fundingSlideWidth}%)`,
                          transition: isFundingTransitionEnabled ? 'transform 1150ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
                        }}
                        onTransitionEnd={handleFundingTrackTransitionEnd}
                      >
                        {fundingSlides.map((pod, index) => (
                          <div
                            key={`${pod.title}-${index}`}
                            className={styles.fundingCarouselSlide}
                            style={{ width: `${fundingSlideWidth}%`, flexBasis: `${fundingSlideWidth}%` }}
                          >
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
                          setActiveFundingSlide(FUNDING_CAROUSEL_START_INDEX + index);
                        }}
                        onMouseEnter={() => play('hover')}
                        aria-pressed={index === activeFundingIndicator}
                        aria-label={`Show ${pod.title}`}
                        style={{ ['--funding-accent' as string]: pod.accent }}
                      />
                    ))}
                  </div>
                </section>

                </section>
              )}

              {communityView === 'proposals' && (
                <section className={styles.communityViewPanel}>
                  <div className={`${styles.tabContent} ${styles.proposalsTabContent}`}>
                    <button
                      className={styles.proposalsEntryButton}
                      onClick={() => { play('click'); setIsSubmitModalOpen(true); }}
                      onMouseEnter={() => play('hover')}
                      type="button"
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
                        <span className={styles.proposalsEntryLabel}>Submit Proposal</span>
                      </div>
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
                        <span className={styles.proposalRewardValue}>-500</span>
                      </span>
                    </button>
                    <TreasuryDisplay
                      contractAddress={CONTRACT_ADDRESS}
                      usdcAddress={USDC_ADDRESS}
                      className={styles.treasuryHeroCard}
                    />
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
              )}
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

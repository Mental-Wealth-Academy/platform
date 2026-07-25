'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import type { TutorialStep } from '@/components/still-tutorial/StillTutorial';
import ProposalCard from '@/components/proposal-card/ProposalCard';
import BlueChatBubble from '@/components/blue-chat-bubble/BlueChatBubble';
import Button from '@/components/button/Button';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

// ─── Seed social-feed posts ───────────────────────────────────────────────────

type FeedCategory = 'Funding' | 'Mental Health' | 'Neuroscience' | 'Research';

interface SeedPost {
  id: string;
  author: string;
  avatar: string;
  category: FeedCategory;
  title: string;
  body: string;
  ts: number;
  likes: number;
  replies: number;
}

const NOW = Date.now();

const SEED_POSTS: SeedPost[] = [
  {
    id: 'sp-1',
    author: 'OpenGrants_DAO',
    avatar: '/uploads/vesper-landing-avatar.png',
    category: 'Funding',
    title: 'If the treasury could fund one wild idea, what would yours be?',
    body: 'If the treasury could fund one wild idea no questions asked, what would you pitch? Dream big — sometimes the weird ones are the best ones.',
    ts: NOW - 1000 * 60 * 18,
    likes: 112,
    replies: 45,
  },
  {
    id: 'sp-2',
    author: 'MindBridge_Collective',
    avatar: 'https://images.unsplash.com/photo-1540206395-68808572332f?w=96&h=96&fit=crop&auto=format',
    category: 'Mental Health',
    title: 'What daily habit changed your mental health the most?',
    body: 'One small habit that shifted everything for me was morning walks with no phone. What tiny routine made the biggest difference for you?',
    ts: NOW - 1000 * 60 * 60 * 5,
    likes: 67,
    replies: 28,
  },
  {
    id: 'sp-3',
    author: 'NeuroCognitive_Lab',
    avatar: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=96&h=96&fit=crop&auto=format',
    category: 'Neuroscience',
    title: 'Would you try a brain-training game designed by the community?',
    body: 'Thinking about a community-built focus game backed by real neuroscience. Would you play it? What would make you actually stick with it?',
    ts: NOW - 1000 * 60 * 60 * 22,
    likes: 34,
    replies: 12,
  },
  {
    id: 'sp-4',
    author: 'SynapticFlow_Research',
    avatar: '/prompts/CharacterBlue.png',
    category: 'Research',
    title: 'Open Dataset: Attention Metrics in LLM-Augmented Dev Workflows',
    body: "Releasing an anonymized 6-month dataset of human attention patterns when working alongside AI coding agents. Looking for collaborators to co-analyze and co-publish. DM to join.",
    ts: NOW - 1000 * 60 * 60 * 48,
    likes: 29,
    replies: 9,
  },
  {
    id: 'sp-5',
    author: 'Clarity_Initiative',
    avatar: '/uploads/vesper-landing-avatar.png',
    category: 'Mental Health',
    title: 'RFC: Open Protocol for Burnout Detection in Dev Teams',
    body: 'Working with occupational psychologists to build a privacy-first burnout signal protocol. Agents could surface these patterns to team leads without surveillance. RFC stage — feedback welcome.',
    ts: NOW - 1000 * 60 * 60 * 72,
    likes: 18,
    replies: 7,
  },
];

const COMMUNITY_BLUE_MESSAGE =
  'Here is where I manage proposals for the treasury, and plans of action for Mental Wealth Academy organization. Transparently on the blockchain.';

function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}


const StillTutorial = dynamic(() => import('@/components/still-tutorial/StillTutorial'), {
  ssr: false,
});
const ProposalDetailsModal = dynamic(() => import('@/components/proposal-card/ProposalDetailsModal'), {
  ssr: false,
});
const SubmitProposalModal = dynamic(() => import('@/components/voting/SubmitProposalModal'), {
  ssr: false,
});
const TreasuryDisplay = dynamic(() => import('@/components/treasury-display/TreasuryDisplay'));
const ActivateVotesCard = dynamic(() => import('@/components/voting/ActivateVotesCard'), { ssr: false });

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
  tokenAmount: string | null;
  recipientAddress: string | null;
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
    blueLevel: number;
    executed: boolean;
    status: number;
    recipient: string;
    usdcAmount: string;
  };
}


const getTutorialSteps = (): TutorialStep[] => [
  {
    message: 'Call this the Decision Room. Proposals land here, the treasury breathes here, and I read every signal that passes through.',
    emotion: 'happy',
  },
  {
    message: 'Bring me an idea and I will hold it up to the light. Clarity, impact, feasibility. Vague requests do not survive the review.',
    emotion: 'happy',
    targetElement: '[data-tutorial-target="voting-stages"]',
  },
  {
    message: 'A proposal that clears review walks into the open vote. Each vote shifts the weight, and the heavier side gets built.',
    emotion: 'happy',
    targetElement: '[data-tutorial-target="admin-room"]',
  },
  {
    message: 'A proposal is a request with its edges exposed. Nothing here is approved by default, so make the specifics do the work.',
    emotion: 'confused',
    targetElement: '[data-tutorial-target="submission"]',
  },
  {
    message: 'Bring a proposal, sit in on the review, or cast your vote. Every decision in this room leaves a trail back to you.',
    emotion: 'happy',
  },
];


const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BLUE_KILLSTREAK_ADDRESS || '0x09a4FEfEe8245B644713546FDF28b4160218f7Fc';
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base mainnet USDC
const TREASURY_BALANCE = 100;
const TREASURY_DISPLAY_BALANCE = 5343;
const DEFAULT_ACTIVE_MEMBER_COUNT = 128;
const FUNDING_PODS = [
  {
    title: 'Brand Awareness',
    amount: 2100,
    total: TREASURY_BALANCE,
    desc: 'Outreach, partnerships, and marketing that drives community growth',
    accent: 'var(--color-primary)',
  },
  {
    title: 'Internal Research',
    amount: 1820,
    total: TREASURY_BALANCE,
    desc: 'R&D, tooling, and knowledge infrastructure for the academy',
    accent: '#2FB7A0',
  },
  {
    title: 'Emergency Funds',
    amount: 1280,
    total: TREASURY_BALANCE,
    desc: 'Safety net for members facing unexpected hardship',
    accent: '#E85D3A',
  },
] as const;

const DASHBOARD_PARTICIPANTS: ReadonlyArray<{
  label: string;
  accent: string;
  image?: string;
}> = [
  { label: 'Seraph', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&auto=format', accent: styles.dashboardAvatarImageWrap },
  { label: 'Halo', image: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=96&h=96&fit=crop&auto=format', accent: styles.dashboardAvatarImageWrap },
  { label: 'Vesper', image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=96&h=96&fit=crop&auto=format', accent: styles.dashboardAvatarImageWrap },
  { label: 'Orbit', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=96&h=96&fit=crop&auto=format', accent: styles.dashboardAvatarImageWrap },
  { label: 'Prism', image: 'https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=96&h=96&fit=crop&auto=format', accent: styles.dashboardAvatarImageWrap },
];

const TOP_CONTRIBUTORS = [
  { participant: DASHBOARD_PARTICIPANTS[0], contributions: 42 },
  { participant: DASHBOARD_PARTICIPANTS[1], contributions: 37 },
  { participant: DASHBOARD_PARTICIPANTS[2], contributions: 29 },
];

const podTotal = FUNDING_PODS.reduce((total, pod) => total + pod.amount, 0);
const TREASURY_DONUT_GAP = 6;
let podArcCursor = 0;
const podArcs = FUNDING_PODS.map((pod) => {
  const percent = (pod.amount / podTotal) * 100;
  const rotation = podArcCursor * 3.6 - 90;
  podArcCursor += percent;
  const visible = Math.max(percent - TREASURY_DONUT_GAP, 1);
  return {
    title: pod.title,
    accent: pod.accent,
    dashArray: `${visible.toFixed(2)} ${(100 - visible).toFixed(2)}`,
    rotation: rotation.toFixed(2),
  };
});

function DashboardAvatarStack({
  participants = DASHBOARD_PARTICIPANTS,
  className = '',
}: {
  participants?: typeof DASHBOARD_PARTICIPANTS;
  className?: string;
}) {
  return (
    <div className={`${styles.dashboardAvatarStack} ${className}`} aria-hidden="true">
      {participants.map((participant) => (
        <span
          key={participant.label}
          className={`${styles.dashboardAvatar} ${participant.accent}`}
          title={participant.label}
        >
          {participant.image ? (
            <Image
              src={participant.image}
              alt=""
              width={34}
              height={34}
              className={styles.dashboardAvatarImage}
              unoptimized
            />
          ) : (
            participant.label
          )}
        </span>
      ))}
    </div>
  );
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <span className={`${styles.skeletonLine} ${className}`} aria-hidden="true" />;
}


function ProposalSkeletonCard() {
  return (
    <div className={styles.proposalSkeletonCard} aria-hidden="true">
      <div className={styles.proposalSkeletonHeader}>
        <SkeletonLine className={styles.proposalSkeletonTitle} />
        <SkeletonLine className={styles.proposalSkeletonBadge} />
      </div>
      <SkeletonLine className={styles.proposalSkeletonTextWide} />
      <SkeletonLine className={styles.proposalSkeletonText} />
      <div className={styles.proposalSkeletonFooter}>
        <SkeletonLine className={styles.proposalSkeletonMeta} />
        <SkeletonLine className={styles.proposalSkeletonAction} />
      </div>
    </div>
  );
}

function ProposalSkeletonList() {
  return (
    <div className={styles.overviewProposalsList} aria-label="Loading proposals">
      {[0, 1, 2].map((i) => (
        <ProposalSkeletonCard key={i} />
      ))}
    </div>
  );
}

export default function VotingPage() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [proposals, setProposals] = useState<MergedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeMemberCount, setActiveMemberCount] = useState(DEFAULT_ACTIVE_MEMBER_COUNT);
  const { play } = useSound();
  const selectedProposal = selectedProposalId
    ? proposals.find((proposal) => proposal.id === selectedProposalId) ?? null
    : null;
  const isPageLoading = loading && proposals.length === 0;

  const fetchProposals = useCallback(async () => {
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
      setProposals(dbProposals as MergedProposal[]);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      setError('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCommunityStats = useCallback(async () => {
    try {
      const response = await fetch('/api/community/stats', { cache: 'no-store' });
      if (!response.ok) return;
      const data: { registeredAccounts?: number } = await response.json();
      if (typeof data.registeredAccounts === 'number' && Number.isFinite(data.registeredAccounts)) {
        setActiveMemberCount(Math.max(0, Math.floor(data.registeredAccounts)));
      }
    } catch (statsError) {
      console.error('Error fetching community stats:', statsError);
    }
  }, []);

  useEffect(() => {
    void fetchProposals();
  }, [fetchProposals]);

  useEffect(() => {
    void fetchCommunityStats();
  }, [fetchCommunityStats]);

  // Mark community as visited so the nav red dot clears
  useEffect(() => {
    try { localStorage.setItem('mwa-community-last-visit', Date.now().toString()); } catch { /* ignore */ }
    window.dispatchEvent(new Event('communityVisited'));
  }, []);

  const handleTutorialComplete = () => {
    try { localStorage.setItem('hasSeenAdminTutorial', 'true'); } catch { /* ignore */ }
    setShowTutorial(false);
  };

  const handleViewDetails = (proposalId: string) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (proposal) {
      setSelectedProposalId(proposalId);
      setIsModalOpen(true);
    }
  };


  return (
    <>
      {showTutorial && (
        <StillTutorial
          steps={getTutorialSteps()}
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          onComplete={handleTutorialComplete}
          title="Voting Guide"
          showProgress={true}
        />
      )}
      <div className={styles.pageLayout}>
        <main className={styles.page}>
        <div className={styles.content}>
          <>
          <div className={styles.communityMainWrapper}>
              <div className={styles.communityViewViewport}>
                <section className={styles.communityViewPanel}>
                  <div className={styles.communityDashGrid}>
                    <div className={styles.communityDashMain}>
                      <section className={styles.communityHero}>
                        <div className={styles.communityHeroContent}>
                          <span className={styles.communityHeroEyebrow}>Mental Wealth Academy</span>
                          <div className={styles.communityHeroTitleRow}>
                            <h1 className={styles.dashboardTitle}>Community Hub</h1>
                          </div>
                          <p className={styles.dashboardSubtitle}>Shared treasury. Shared decisions.</p>
                          <div className={styles.communityHeroMembers}>
                            <DashboardAvatarStack />
                            <span>{activeMemberCount} members online</span>
                          </div>
                        </div>
                      </section>
                      <BlueChatBubble
                        className={styles.communityBlueBubble}
                        message={COMMUNITY_BLUE_MESSAGE}
                        variant="featured"
                        stackOnMobile
                      />

                      <div className={styles.communityCardRow}>
                        <article className={`${styles.dashCard} ${styles.fundingVillageCard}`}>
                          <div className={styles.fundingVillageContent}>
                            <span className={styles.dashCardEyebrow}>Community Capital</span>
                            <h2 className={styles.dashCardTitle}>Funding the Village</h2>
                            <div className={styles.fundingVillageAmount}>${TREASURY_BALANCE.toLocaleString()}</div>
                            <a href="#active-proposals" className={styles.fundingVillageLink}>
                              <span>View latest proposal</span>
                              <svg viewBox="0 0 16 16" aria-hidden="true">
                                <path d="M6 3.5 10.5 8 6 12.5" />
                              </svg>
                            </a>
                          </div>
                          <Image
                            src="/images/treasury.png"
                            alt=""
                            width={120}
                            height={120}
                            className={styles.fundingVillageSticker}
                            unoptimized
                          />
                        </article>

                        <article className={`${styles.dashCard} ${styles.topContributorsCard}`}>
                          <div className={styles.dashCardHeader}>
                            <div>
                              <span className={styles.dashCardEyebrow}>Participation</span>
                              <h2 className={styles.dashCardTitle}>Top Contributors</h2>
                            </div>
                          </div>
                          <div className={styles.topContributorsBody}>
                            <div className={styles.topContributorsList}>
                              {TOP_CONTRIBUTORS.map(({ participant, contributions }, index) => (
                                <div key={participant.label} className={styles.topContributorRow}>
                                  <span className={styles.topContributorRank}>{index + 1}</span>
                                  <span className={`${styles.dashboardAvatar} ${participant.accent}`}>
                                    {participant.image ? (
                                      <Image
                                        src={participant.image}
                                        alt={participant.label}
                                        width={34}
                                        height={34}
                                        className={styles.dashboardAvatarImage}
                                        unoptimized
                                      />
                                    ) : (
                                      participant.label.slice(0, 1)
                                    )}
                                  </span>
                                  <span className={styles.topContributorName}>{participant.label}</span>
                                  <strong>{contributions}</strong>
                                </div>
                              ))}
                            </div>
                            <Image
                              src="/images/trophy.svg"
                              alt=""
                              width={84}
                              height={84}
                              className={styles.topContributorsTrophy}
                              unoptimized
                            />
                          </div>
                        </article>
                      </div>

                      <section id="active-proposals" className={styles.activeProposalsSection}>
                        <div className={styles.proposalsHeaderRow}>
                          <div className={styles.feedSectionLabel}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5" />
                            </svg>
                            Active Proposals
                          </div>
                          <Button
                            size="compact"
                            onClick={() => { play('click'); setIsSubmitModalOpen(true); }}
                            onMouseEnter={() => play('hover')}
                            startIcon={
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                            }
                          >
                            Submit a Proposal
                          </Button>
                        </div>
                        <ActivateVotesCard />
                        {isPageLoading || (loading && proposals.length > 0) ? (
                          <ProposalSkeletonList />
                        ) : error ? (
                          <div className={styles.errorState}>
                            <h3>Error Loading Proposals</h3>
                            <p>{error}</p>
                            <button onClick={() => { play('click'); void fetchProposals(); }} onMouseEnter={() => play('hover')} className={styles.retryButton} type="button">Retry</button>
                          </div>
                        ) : proposals.length === 0 ? (
                          <div className={styles.emptyState}>
                            <h3>No proposals yet</h3>
                            <p>Be the first to submit a proposal to the community!</p>
                          </div>
                        ) : (
                          <div className={styles.overviewProposalsList} data-tutorial-target="submission">
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
                                    <a href={`https://basescan.org/tx/${proposal.onChainTxHash}`} target="_blank" rel="noopener noreferrer" className={styles.txLink} onClick={() => play('navigation')} onMouseEnter={() => play('hover')}>
                                      View Transaction →
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>

                    <aside className={styles.communityDashRail}>
                      <article className={`${styles.dashCard} ${styles.treasuryBalanceCard}`}>
                        <div className={styles.treasuryBalanceHeader}>
                          <h2 className={styles.dashCardTitle}>Shared Treasury</h2>
                          <strong className={styles.treasuryBalanceDelta}>+12.6%</strong>
                        </div>
                        <div className={styles.treasuryBalanceValue}>${TREASURY_DISPLAY_BALANCE.toLocaleString()}</div>
                      </article>

                      <article className={`${styles.dashCard} ${styles.treasuryBreakdownCard}`}>
                        <div className={styles.dashCardHeader}>
                          <div>
                            <span className={styles.dashCardEyebrow}>Treasury Pods</span>
                            <h2 className={styles.dashCardTitle}>Treasury Breakdown</h2>
                          </div>
                          <span className={styles.dashCardIcon} aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                              <path d="M12 3v18M3 12h18" />
                            </svg>
                          </span>
                        </div>
                        <div className={styles.treasuryBreakdownBody}>
                          <div
                            className={styles.treasuryBreakdownDonut}
                            role="img"
                            aria-label="Treasury pod allocation chart"
                          >
                            <svg viewBox="0 0 42 42" className={styles.treasuryDonutSvg} aria-hidden="true">
                              <circle className={styles.treasuryDonutTrack} cx="21" cy="21" r="15.915" />
                              {podArcs.map((arc) => (
                                <circle
                                  key={arc.title}
                                  className={styles.treasuryDonutSegment}
                                  cx="21"
                                  cy="21"
                                  r="15.915"
                                  strokeDasharray={arc.dashArray}
                                  transform={`rotate(${arc.rotation} 21 21)`}
                                  style={{ stroke: arc.accent }}
                                />
                              ))}
                            </svg>
                            <div className={styles.treasuryDonutCenter}>
                              <span className={styles.treasuryDonutValue}>${podTotal.toLocaleString()}</span>
                              <span className={styles.treasuryDonutLabel}>Allocated</span>
                            </div>
                          </div>
                          <div className={styles.treasuryBreakdownLegend}>
                            {FUNDING_PODS.map((pod) => (
                              <div key={pod.title} className={styles.treasuryBreakdownLegendItem}>
                                <span className={styles.treasuryBreakdownDot} style={{ background: pod.accent }} />
                                <span>{pod.title}</span>
                                <strong>${pod.amount.toLocaleString()}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      </article>

                      <TreasuryDisplay
                        contractAddress={CONTRACT_ADDRESS}
                        usdcAddress={USDC_ADDRESS}
                        compact
                        className={styles.dashboardWalletCard}
                      />

                      <article className={`${styles.dashCard} ${styles.activeMembersCard}`}>
                        <span className={styles.dashCardEyebrow}>Active Members</span>
                        <div className={styles.activeMembersInline}>
                          <strong>{activeMemberCount}</strong>
                          <DashboardAvatarStack className={styles.activeMembersAvatars} />
                        </div>
                      </article>

                      <article className={`${styles.dashCard} ${styles.recentActivityCard}`}>
                        <div className={styles.dashCardHeader}>
                          <div>
                            <span className={styles.dashCardEyebrow}>Room Log</span>
                            <h2 className={styles.dashCardTitle}>Recent Activity</h2>
                          </div>
                        </div>
                        <div className={styles.recentActivityList}>
                          {SEED_POSTS.map((post) => (
                            <div key={post.id} className={styles.recentActivityItem}>
                              <span>{post.title}</span>
                              <time>{relTime(post.ts)}</time>
                            </div>
                          ))}
                        </div>
                        <a href="#active-proposals" className={styles.recentActivityLink}>
                          View all activity
                        </a>
                      </article>
                    </aside>
                  </div>
                </section>
              </div>
          </div>
          </>
        </div>
      </main>
      </div>

      {selectedProposal && (
        <ProposalDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProposalId(null);
          }}
          proposal={selectedProposal}
          onChainProposalId={selectedProposal.review?.onChainProposalId ? parseInt(selectedProposal.review.onChainProposalId) : null}
          contractAddress={CONTRACT_ADDRESS}
          onVoted={fetchProposals}
        />
      )}

      {isSubmitModalOpen && (
        <SubmitProposalModal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onSuccess={fetchProposals}
        />
      )}

    </>
  );
}

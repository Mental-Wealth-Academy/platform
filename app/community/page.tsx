'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState, useEffect, useCallback, type MouseEvent } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import type { TutorialStep } from '@/components/still-tutorial/StillTutorial';
import TreasuryDisplay from '@/components/treasury-display/TreasuryDisplay';
import ProposalCard from '@/components/proposal-card/ProposalCard';
import BlueDialogue from '@/components/blue-dialogue/BlueDialogue';
import { VotingPageSkeleton, ProposalCardSkeleton } from '@/components/skeleton/Skeleton';
import { useSound } from '@/hooks/useSound';
import { useScrollLock } from '@/hooks/useScrollLock';
import { normalizeCommunityArticleUrl } from '@/lib/community-links';
import styles from './page.module.css';

const StillTutorial = dynamic(() => import('@/components/still-tutorial/StillTutorial'), {
  ssr: false,
});
const ProposalDetailsModal = dynamic(() => import('@/components/proposal-card/ProposalDetailsModal'), {
  ssr: false,
});
const SubmitProposalModal = dynamic(() => import('@/components/voting/SubmitProposalModal'), {
  ssr: false,
});

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
    blueLevel: number;
    executed: boolean;
  };
}

interface NewsItem {
  title: string;
  url: string;
  source: string;
  createdAt: string;
}

interface NewsTopic {
  topic: string;
  color: string;
  items: NewsItem[];
}

interface ArticlePreviewState {
  title: string;
  source: string;
  canonicalUrl: string;
  summary: string;
  status: 'loading' | 'ready' | 'error';
  isRecovered: boolean;
}

function formatPublishedDate(isoString: string): string {
  const publishedAt = new Date(isoString);

  if (Number.isNaN(publishedAt.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(publishedAt);
}

const getTutorialSteps = (): TutorialStep[] => [
  {
    message: 'Welcome to the Decision Room. I\'m Blue. This is where proposals, treasury activity, and community signals are reviewed in one place.',
    emotion: 'happy',
  },
  {
    message: 'Got an idea? Submit it and I\'ll review it for clarity, impact, and feasibility. Better proposals lead to better decisions.',
    emotion: 'happy',
    targetElement: '[data-tutorial-target="voting-stages"]',
  },
  {
    message: 'Once a proposal clears review, it moves to community voting. Every vote changes what gets funded and what gets built next.',
    emotion: 'happy',
    targetElement: '[data-tutorial-target="admin-room"]',
  },
  {
    message: 'Each proposal puts a concrete request in front of the group. Approval is not guaranteed, so specifics matter.',
    emotion: 'confused',
    targetElement: '[data-tutorial-target="submission"]',
  },
  {
    message: 'Bring a proposal, review the room, or cast a vote. This space is for shared decisions and transparent follow-through.',
    emotion: 'happy',
  },
];


const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BLUE_KILLSTREAK_ADDRESS || '0x2cbb90a761ba64014b811be342b8ef01b471992d';
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base mainnet USDC
const TREASURY_BALANCE = 5200;
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

const FUNDING_CAROUSEL_REPEAT_COUNT = 4;
const FUNDING_CAROUSEL_START_INDEX = FUNDING_PODS.length;


const DASHBOARD_PARTICIPANTS: ReadonlyArray<{
  label: string;
  accent: string;
  image?: string;
}> = [
  { label: 'Blue', image: '/prompts/CharacterBlue.png', accent: styles.dashboardAvatarImageWrap },
  { label: 'Vesper', image: '/uploads/vesper-landing-avatar.png', accent: styles.dashboardAvatarImageWrap },
  { label: 'Orbit', image: '/anbel09.png', accent: styles.dashboardAvatarImageWrap },
  { label: 'Prism', image: '/anbel11.png', accent: styles.dashboardAvatarImageWrap },
];

export default function VotingPage() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [proposals, setProposals] = useState<MergedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeFundingSlide, setActiveFundingSlide] = useState<number>(FUNDING_CAROUSEL_START_INDEX);
  const [isFundingTransitionEnabled, setIsFundingTransitionEnabled] = useState(true);
  const [newsTopics, setNewsTopics] = useState<NewsTopic[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [articlePreview, setArticlePreview] = useState<ArticlePreviewState | null>(null);
  const { play } = useSound();
  const selectedProposal = selectedProposalId
    ? proposals.find((proposal) => proposal.id === selectedProposalId) ?? null
    : null;
  const isPageLoading = loading && proposals.length === 0;

  useScrollLock(Boolean(articlePreview));

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

  useEffect(() => {
    let active = true;

    const loadNews = async () => {
      try {
        const res = await fetch('/api/community/news');

        if (!res.ok) {
          throw new Error(`News fetch failed with status ${res.status}`);
        }

        const data = await res.json();

        if (!active) return;

        setNewsTopics(Array.isArray(data.topics) ? data.topics : []);
        setNewsError(null);
      } catch (error) {
        if (!active) return;

        console.error('Error loading community news:', error);
        setNewsTopics([]);
        setNewsError('News feed unavailable right now.');
      } finally {
        if (active) {
          setNewsLoading(false);
        }
      }
    };

    void loadNews();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!articlePreview) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setArticlePreview(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [articlePreview]);

  const enrichProposals = useCallback(async (dbProposals: DatabaseProposal[]) => {
    const proposalsNeedingChainData = dbProposals.filter((proposal) =>
      proposal.review?.onChainProposalId &&
      (proposal.status === 'approved' || proposal.status === 'active' || proposal.status === 'completed')
    );

    if (proposalsNeedingChainData.length === 0) return;

    try {
      const [{ providers }, { fetchProposal }] = await Promise.all([
        import('ethers'),
        import('@/lib/blue-contract'),
      ]);

      const provider = typeof window.ethereum !== 'undefined'
        ? new providers.Web3Provider(window.ethereum)
        : new providers.JsonRpcProvider('https://mainnet.base.org');

      const updates = await Promise.all(
        proposalsNeedingChainData.map(async (proposal) => {
          try {
            const onChainProposal = await fetchProposal(
              CONTRACT_ADDRESS,
              parseInt(proposal.review!.onChainProposalId!, 10),
              provider as any,
            );

            return {
              id: proposal.id,
              onChainData: {
                forVotes: onChainProposal.forVotes,
                againstVotes: onChainProposal.againstVotes,
                votingDeadline: onChainProposal.votingDeadline,
                blueLevel: onChainProposal.blueLevel,
                executed: onChainProposal.executed,
              },
            };
          } catch (chainError) {
            console.error(`Error fetching on-chain data for proposal ${proposal.id}:`, chainError);
            return null;
          }
        }),
      );

      const updatesById = new Map(
        updates
          .filter((update): update is NonNullable<typeof update> => update !== null)
          .map((update) => [update.id, update.onChainData]),
      );

      if (updatesById.size === 0) return;

      setProposals((current) =>
        current.map((proposal) =>
          updatesById.has(proposal.id)
            ? { ...proposal, onChainData: updatesById.get(proposal.id) }
            : proposal,
        ),
      );
    } catch (chainError) {
      console.error('Error enriching proposals with on-chain data:', chainError);
    }
  }, []);

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
      void enrichProposals(dbProposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      setError('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }, [enrichProposals]);

  useEffect(() => {
    void fetchProposals();
  }, [fetchProposals]);

  const handleTutorialComplete = () => {
    localStorage.setItem('hasSeenAdminTutorial', 'true');
    setShowTutorial(false);
  };

  const handleViewDetails = (proposalId: string) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (proposal) {
      setSelectedProposalId(proposalId);
      setIsModalOpen(true);
    }
  };

  const handleArticleClick = useCallback(async (event: MouseEvent<HTMLAnchorElement>, item: NewsItem) => {
    event.preventDefault();
    const normalizedUrl = normalizeCommunityArticleUrl(item.url);

    play('click');
    setArticlePreview({
      title: item.title,
      source: item.source,
      canonicalUrl: normalizedUrl,
      summary: 'I am scanning this article now so I can pull out the key signal before you leave the Decision Room.',
      status: 'loading',
      isRecovered: normalizedUrl !== item.url,
    });

    try {
      const response = await fetch(`/api/community/article-preview?url=${encodeURIComponent(item.url)}`);

      if (!response.ok) {
        throw new Error(`Article preview failed with status ${response.status}`);
      }

      const data = await response.json();

      setArticlePreview({
        title: data.title || item.title,
        source: data.source || item.source,
        canonicalUrl: data.canonicalUrl || normalizedUrl,
        summary: `${data.summary || 'This article is ready.'} Continue to the full article?`,
        status: 'ready',
        isRecovered: Boolean(data.isRecovered),
      });
    } catch (error) {
      console.error('Error loading article preview:', error);
      setArticlePreview({
        title: item.title,
        source: item.source,
        canonicalUrl: normalizedUrl,
        summary: 'I could not generate a clean summary for this one, but the article destination is ready if you want to keep reading.',
        status: 'error',
        isRecovered: normalizedUrl !== item.url,
      });
    }
  }, [play]);

  const handleContinueReading = useCallback(() => {
    if (!articlePreview) return;
    play('navigation');
    window.open(articlePreview.canonicalUrl, '_blank', 'noopener,noreferrer');
    setArticlePreview(null);
  }, [articlePreview, play]);

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
        <SideNavigation />
        <main className={styles.page}>
        <div className={styles.content}>
          <>
          <div className={styles.communityMainWrapper}>
            <div className={styles.dashboardChrome}>
              <header className={styles.dashboardMasthead}>
                <div className={styles.dashboardBrand}>
                  <div className={styles.dashboardBrandMark} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className={styles.dashboardBrandText}>
                    <span className={styles.dashboardBrandName}>Mental Wealth Academy</span>
                    <span className={styles.dashboardBrandMeta}>Decision Room</span>
                  </div>
                </div>
                <div className={styles.dashboardSearch} aria-label="Dashboard search">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 5a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm8 14l-3.4-3.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span>Search proposals, treasury activity, and member signals</span>
                </div>
                <div className={styles.dashboardPresence} aria-label="Active members">
                  {DASHBOARD_PARTICIPANTS.map((participant) => (
                    <span
                      key={participant.label}
                      className={`${styles.dashboardAvatar} ${participant.accent}`}
                      title={participant.label}
                    >
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
                        participant.label
                      )}
                    </span>
                  ))}
                </div>
              </header>

              <div className={styles.dashboardTitleRow}>
                <div className={styles.dashboardTitleBlock}>
                  <h1 className={styles.dashboardTitle}>
                    MWA <span className={styles.dashboardTitleAccent}>Community Hub</span>
                  </h1>
                  <p className={styles.dashboardSubtitle}>
                    Shared treasury. Shared decisions.
                  </p>
                  <p className={styles.dashboardTreasuryBalance}>$5,343</p>
                </div>
                <div className={styles.dashboardTitleRightGroup}>
                  <div className={styles.fundingPodsStack}>
                    {FUNDING_PODS.map((pod) => (
                      <div
                        key={pod.title}
                        className={styles.fundingPodMini}
                        style={{ ['--funding-accent' as string]: pod.accent }}
                      >
                        <div className={styles.fundingPodMiniHeader}>
                          <span className={styles.fundingPodMiniTitle}>{pod.title}</span>
                          <span className={styles.fundingPodMiniAmount}>${pod.amount.toLocaleString()}</span>
                        </div>
                        <div className={styles.fundingStateProgress}>
                          <div
                            className={styles.fundingStateProgressFill}
                            style={{ width: `${(pod.amount / pod.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            <div className={styles.communityViewViewport}>
              <section className={styles.communityViewPanel}>
                  <div className={styles.overviewColumns}>

                    <div className={styles.latestNewsSection}>
                      <TreasuryDisplay
                        contractAddress={CONTRACT_ADDRESS}
                        usdcAddress={USDC_ADDRESS}
                        compact
                        className={styles.dashboardWalletCard}
                      />
                      <span className={styles.latestNewsLabel}>Latest News</span>
                      {newsLoading ? (
                        <div className={styles.newsLoadingStack}>
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className={styles.newsLoadingCard} />
                          ))}
                        </div>
                      ) : newsError ? (
                        <div className={styles.newsEmptyCard}>
                          <span className={styles.newsEmptyText}>
                            {newsError} Treasury and proposal tools are still available below.
                          </span>
                        </div>
                      ) : newsTopics.length === 0 ? (
                        <div className={styles.newsEmptyCard}>
                          <span className={styles.newsEmptyText}>
                            No recent stories surfaced in the tracked feeds.
                          </span>
                        </div>
                      ) : (
                        <div className={styles.newsStack}>
                          {newsTopics.map((topic) => (
                            <article key={topic.topic} className={styles.newsTopicCard}>
                              <span className={styles.newsTopicLabel} style={{ color: topic.color }}>
                                {topic.topic}
                              </span>
                              <div className={styles.newsTopicDivider} />
                              {topic.items.length === 0 ? (
                                <span className={styles.newsEmptyText}>No recent stories surfaced.</span>
                              ) : (
                                <ul className={styles.newsArticleList}>
                                  {topic.items.map((item, i) => (
                                    <li key={i} className={styles.newsArticleItem}>
                                      <a
                                        href={normalizeCommunityArticleUrl(item.url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.newsArticleLink}
                                        onClick={(event) => void handleArticleClick(event, item)}
                                        onMouseEnter={() => play('hover')}
                                      >
                                        <span className={styles.newsArticleTitle}>{item.title}</span>
                                        <span className={styles.newsArticleMeta}>
                                          {item.source} · {formatPublishedDate(item.createdAt)}
                                        </span>
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </article>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={styles.overviewProposalsColumn}>
                      {loading && proposals.length > 0 ? (
                        <div className={styles.overviewProposalsList}>
                          {[...Array(3)].map((_, i) => (
                            <ProposalCardSkeleton key={i} />
                          ))}
                        </div>
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
                    </div>

                  </div>
                </section>

            </div>
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

      {articlePreview && (
        <div className={styles.articlePreviewOverlay} onClick={() => setArticlePreview(null)}>
          <div
            className={styles.articlePreviewCard}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="article-preview-title"
          >
            <div className={styles.articlePreviewDialogueWrap}>
              <BlueDialogue
                key={`${articlePreview.canonicalUrl}-${articlePreview.status}`}
                message={articlePreview.summary}
                emotion="happy"
                variant="overlay"
                showSkip={false}
              />
            </div>

            <div className={styles.articlePreviewHeader}>
              <div className={styles.articlePreviewMetaRow}>
                <span className={styles.articlePreviewSource}>{articlePreview.source}</span>
                {articlePreview.isRecovered && (
                  <span className={styles.articlePreviewRecovered}>Recovered Link</span>
                )}
              </div>
              <h2 id="article-preview-title" className={styles.articlePreviewTitle}>
                {articlePreview.title}
              </h2>
            </div>

            <div className={styles.articlePreviewActions}>
              <button
                type="button"
                className={styles.articlePreviewDismiss}
                onClick={() => {
                  play('click');
                  setArticlePreview(null);
                }}
                onMouseEnter={() => play('hover')}
              >
                Stay Here
              </button>
              <button
                type="button"
                className={styles.articlePreviewContinue}
                onClick={handleContinueReading}
                onMouseEnter={() => play('hover')}
              >
                Continue Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

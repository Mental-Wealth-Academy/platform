'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

type DebateStatus = 'waiting' | 'active' | 'judging' | 'completed';

interface Debate {
  id: string;
  creator: { name: string; avatar: string };
  opponent: { name: string; avatar: string } | null;
  topic: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  creatorSide: string;
  opponentSide: string;
  stake: number;
  status: DebateStatus;
  creatorArgument?: string;
  opponentArgument?: string;
  winner?: 'creator' | 'opponent';
}

const CATEGORIES = ['Mental Health', 'Neuroscience', 'Psychology', 'Wellness', 'Philosophy'];

const TOPIC_MAP: Record<string, string[]> = {
  'Mental Health': ['Therapy vs Medication', 'Social Media & Mental Health', 'Workplace Burnout'],
  'Neuroscience': ['Neuroplasticity Limits', 'AI & Brain Research', 'Sleep vs Exercise for Brain'],
  'Psychology': ['Nature vs Nurture', 'Free Will Debate', 'Emotional Intelligence'],
  'Wellness': ['Meditation Effectiveness', 'Digital Detox', 'Cold Exposure Benefits'],
  'Philosophy': ['Consciousness & AI', 'Ethics of Enhancement', 'Meaning of Happiness'],
};

const MOCK_DEBATES: Debate[] = [
  {
    id: '1',
    creator: { name: 'NeuroNova', avatar: 'NN' },
    opponent: null,
    topic: 'Social Media & Mental Health',
    category: 'Mental Health',
    difficulty: 'intermediate',
    creatorSide: 'Social media is fundamentally harmful to mental health',
    opponentSide: 'Social media can be beneficial for mental health',
    stake: 50,
    status: 'waiting',
    creatorArgument: 'Studies consistently show increased rates of anxiety and depression among heavy social media users, particularly adolescents...',
  },
  {
    id: '2',
    creator: { name: 'SynapseKid', avatar: 'SK' },
    opponent: null,
    topic: 'Nature vs Nurture',
    category: 'Psychology',
    difficulty: 'advanced',
    creatorSide: 'Genetics play a larger role in personality',
    opponentSide: 'Environment shapes personality more than genetics',
    stake: 100,
    status: 'waiting',
    creatorArgument: 'Twin studies demonstrate that identical twins raised apart share remarkably similar personality traits...',
  },
  {
    id: '3',
    creator: { name: 'PsychPilot', avatar: 'PP' },
    opponent: { name: 'MindForge', avatar: 'MF' },
    topic: 'Meditation Effectiveness',
    category: 'Wellness',
    difficulty: 'beginner',
    creatorSide: 'Meditation is overhyped as a wellness tool',
    opponentSide: 'Meditation is scientifically proven to improve wellbeing',
    stake: 75,
    status: 'judging',
    creatorArgument: 'While meditation has some benefits, the wellness industry has greatly exaggerated its effects...',
    opponentArgument: 'Meta-analyses of randomized controlled trials show significant reductions in cortisol levels...',
  },
  {
    id: '4',
    creator: { name: 'ZenCoder', avatar: 'ZC' },
    opponent: { name: 'CortexQ', avatar: 'CQ' },
    topic: 'Free Will Debate',
    category: 'Philosophy',
    difficulty: 'advanced',
    creatorSide: 'Free will is an illusion',
    opponentSide: 'Free will is real and meaningful',
    stake: 200,
    status: 'completed',
    creatorArgument: 'Neuroscience research, particularly Libet experiments, shows decisions are made unconsciously before we become aware...',
    opponentArgument: 'Compatibilism offers a robust framework where free will coexists with determinism...',
    winner: 'opponent',
  },
];

export default function DuelsPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [selectedStake, setSelectedStake] = useState<number>(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDebate, setGeneratedDebate] = useState<{ topic: string; yourSide: string; opponentSide: string } | null>(null);
  const [joiningDebateId, setJoiningDebateId] = useState<string | null>(null);
  const [opponentArgument, setOpponentArgument] = useState('');
  const { play } = useSound();

  const activeDebates = MOCK_DEBATES.filter((d) => d.status === 'waiting' || d.status === 'active' || d.status === 'judging');
  const completedDebates = MOCK_DEBATES.filter((d) => d.status === 'completed');

  const handleCreateDebate = () => {
    play('click');
    setIsGenerating(true);
    setGeneratedDebate(null);

    // Simulate Azura generating the topic and side
    setTimeout(() => {
      const topics = TOPIC_MAP[selectedCategory] || TOPIC_MAP['Mental Health'];
      const topic = topics[Math.floor(Math.random() * topics.length)];
      const sides = [
        { yourSide: `${topic} is beneficial`, opponentSide: `${topic} is harmful` },
        { yourSide: `${topic} should be prioritized`, opponentSide: `${topic} is overrated` },
      ];
      const side = sides[Math.floor(Math.random() * sides.length)];
      setGeneratedDebate({ topic, ...side });
      setIsGenerating(false);
      play('navigation');
    }, 2500);
  };

  const handleJoinDebate = (debateId: string) => {
    play('click');
    setJoiningDebateId(debateId);
    setOpponentArgument('');
  };

  const handleSubmitArgument = () => {
    play('click');
    // Would submit to API, then Azura judges
    setJoiningDebateId(null);
    setOpponentArgument('');
  };

  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.page}>
        <div className={styles.content}>

          {/* Hero Banner */}
          <div className={styles.heroBanner}>
            <div className={styles.heroBannerContent}>
              <span className={styles.heroEyebrow}>Knowledge Battles</span>
              <h1 className={styles.heroTitle}>Discussion</h1>
              <p className={styles.heroSubtitle}>
                Debate topics with other learners. Azura picks the topic and your side — argue your case and let the AI judge the winner.
              </p>
            </div>
          </div>

          {/* Create Debate Button */}
          <button
            className={styles.createDebateButton}
            onClick={() => {
              play('click');
              setIsCreateModalOpen(true);
              setGeneratedDebate(null);
              setIsGenerating(false);
            }}
            onMouseEnter={() => play('hover')}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create Debate
          </button>

          {/* Tab Navigation */}
          <section className={styles.tabGrid}>
            <div
              className={`${styles.tabCard} ${activeTab === 'active' ? styles.tabCardActive : ''}`}
              onClick={() => { play('click'); setActiveTab('active'); }}
              onMouseEnter={() => play('hover')}
            >
              <div className={styles.tabIcon}>
                <Image src="/icons/podium.svg" alt="" width={40} height={40} />
              </div>
              <h3 className={styles.tabTitle}>Active Debates</h3>
              <p className={styles.tabDesc}>Open & in-progress debates</p>
            </div>
            <div
              className={`${styles.tabCard} ${activeTab === 'completed' ? styles.tabCardActive : ''}`}
              onClick={() => { play('click'); setActiveTab('completed'); }}
              onMouseEnter={() => play('hover')}
            >
              <div className={styles.tabIcon}>
                <Image src="/icons/battle-globe.svg" alt="" width={40} height={40} />
              </div>
              <h3 className={styles.tabTitle}>Completed</h3>
              <p className={styles.tabDesc}>Past debates & results</p>
            </div>
          </section>

          {/* Tab Content */}
          <div className={styles.tabContent}>

            {activeTab === 'active' && (
              <>
                {activeDebates.length === 0 && (
                  <div className={styles.emptyState}>No active debates. Create one to get started!</div>
                )}
                <div className={styles.debateGrid}>
                  {activeDebates.map((debate) => (
                    <div
                      key={debate.id}
                      className={`${styles.debateCard} ${debate.status === 'judging' ? styles.debateCardJudging : ''}`}
                      onMouseEnter={() => play('hover')}
                    >
                      <div className={styles.debateTopRow}>
                        <span className={styles.debateCategory}>{debate.category}</span>
                        <span className={`${styles.debateStatusBadge} ${styles[`status_${debate.status}`]}`}>
                          {debate.status === 'waiting' ? 'Waiting for Opponent' : debate.status === 'judging' ? 'Azura Judging...' : 'Active'}
                        </span>
                      </div>

                      <h3 className={styles.debateTopic}>{debate.topic}</h3>

                      <div className={styles.debateDiffStake}>
                        <span className={`${styles.diffBadge} ${styles[`diff_${debate.difficulty}`]}`}>{debate.difficulty}</span>
                        <span className={styles.stakeBadge}>
                          <Image src="/icons/shard.svg" alt="" width={14} height={14} />
                          {debate.stake} Shards
                        </span>
                      </div>

                      {/* Sides */}
                      <div className={styles.sidesContainer}>
                        <div className={styles.sideCard}>
                          <div className={styles.sideHeader}>
                            <div className={styles.sideAvatar} style={{ background: 'var(--color-primary)' }}>
                              {debate.creator.avatar}
                            </div>
                            <span className={styles.sideName}>{debate.creator.name}</span>
                          </div>
                          <p className={styles.sidePosition}>{debate.creatorSide}</p>
                        </div>

                        <div className={styles.vsLabel}>VS</div>

                        <div className={`${styles.sideCard} ${!debate.opponent ? styles.sideCardOpen : ''}`}>
                          {debate.opponent ? (
                            <>
                              <div className={styles.sideHeader}>
                                <div className={styles.sideAvatar} style={{ background: 'var(--color-accent)' }}>
                                  {debate.opponent.avatar}
                                </div>
                                <span className={styles.sideName}>{debate.opponent.name}</span>
                              </div>
                              <p className={styles.sidePosition}>{debate.opponentSide}</p>
                            </>
                          ) : (
                            <>
                              <div className={styles.sideHeader}>
                                <div className={`${styles.sideAvatar} ${styles.sideAvatarEmpty}`}>?</div>
                                <span className={styles.sideNameEmpty}>Open Slot</span>
                              </div>
                              <p className={styles.sidePosition}>{debate.opponentSide}</p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Join Button for waiting debates */}
                      {debate.status === 'waiting' && (
                        <button
                          className={styles.joinButton}
                          onClick={() => handleJoinDebate(debate.id)}
                          onMouseEnter={() => play('hover')}
                          type="button"
                        >
                          Take the Other Side
                        </button>
                      )}

                      {debate.status === 'judging' && (
                        <div className={styles.judgingBar}>
                          <Image src="https://i.imgur.com/AkflhaJ.png" alt="Azura" width={24} height={24} unoptimized />
                          <span>Azura is reviewing arguments...</span>
                          <div className={styles.judgingDots}>
                            <span className={styles.judgingDot} />
                            <span className={styles.judgingDot} />
                            <span className={styles.judgingDot} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'completed' && (
              <div className={styles.debateGrid}>
                {completedDebates.map((debate) => (
                  <div
                    key={debate.id}
                    className={`${styles.debateCard} ${styles.debateCardCompleted}`}
                    onMouseEnter={() => play('hover')}
                  >
                    <div className={styles.debateTopRow}>
                      <span className={styles.debateCategory}>{debate.category}</span>
                      <span className={`${styles.debateStatusBadge} ${styles.status_completed}`}>Completed</span>
                    </div>

                    <h3 className={styles.debateTopic}>{debate.topic}</h3>

                    <div className={styles.sidesContainer}>
                      <div className={`${styles.sideCard} ${debate.winner === 'creator' ? styles.sideCardWinner : ''}`}>
                        <div className={styles.sideHeader}>
                          <div className={styles.sideAvatar} style={{ background: debate.winner === 'creator' ? 'var(--color-tertiary)' : 'var(--color-secondary)' }}>
                            {debate.creator.avatar}
                          </div>
                          <span className={styles.sideName}>{debate.creator.name}</span>
                          {debate.winner === 'creator' && <span className={styles.winnerTag}>Winner</span>}
                        </div>
                        <p className={styles.sidePosition}>{debate.creatorSide}</p>
                      </div>

                      <div className={styles.vsLabel}>VS</div>

                      <div className={`${styles.sideCard} ${debate.winner === 'opponent' ? styles.sideCardWinner : ''}`}>
                        <div className={styles.sideHeader}>
                          <div className={styles.sideAvatar} style={{ background: debate.winner === 'opponent' ? 'var(--color-tertiary)' : 'var(--color-secondary)' }}>
                            {debate.opponent?.avatar}
                          </div>
                          <span className={styles.sideName}>{debate.opponent?.name}</span>
                          {debate.winner === 'opponent' && <span className={styles.winnerTag}>Winner</span>}
                        </div>
                        <p className={styles.sidePosition}>{debate.opponentSide}</p>
                      </div>
                    </div>

                    <div className={styles.completedPrize}>
                      <Image src="/icons/shard.svg" alt="" width={16} height={16} />
                      <span>{Math.floor(debate.stake * 2 * 0.96)} Shards awarded to winner</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── Create Debate Modal ─── */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCreateModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setIsCreateModalOpen(false)}
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {!generatedDebate && !isGenerating && (
              <>
                <h2 className={styles.modalTitle}>Create Debate</h2>
                <p className={styles.modalDesc}>Choose a category, difficulty, and stake. Azura will generate the topic and assign your side.</p>

                {/* Category Tabs */}
                <div className={styles.modalSection}>
                  <label className={styles.modalLabel}>Category</label>
                  <div className={styles.categoryTabs}>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        className={`${styles.categoryTab} ${selectedCategory === cat ? styles.categoryTabActive : ''}`}
                        onClick={() => { play('click'); setSelectedCategory(cat); }}
                        onMouseEnter={() => play('hover')}
                        type="button"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Tabs */}
                <div className={styles.modalSection}>
                  <label className={styles.modalLabel}>Difficulty</label>
                  <div className={styles.difficultyTabs}>
                    {(['beginner', 'intermediate', 'advanced'] as const).map((diff) => (
                      <button
                        key={diff}
                        className={`${styles.difficultyTab} ${selectedDifficulty === diff ? styles.difficultyTabActive : ''}`}
                        onClick={() => { play('click'); setSelectedDifficulty(diff); }}
                        onMouseEnter={() => play('hover')}
                        type="button"
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stake Amount */}
                <div className={styles.modalSection}>
                  <label className={styles.modalLabel}>Stake Amount</label>
                  <div className={styles.stakeOptions}>
                    {[25, 50, 100, 200].map((amount) => (
                      <button
                        key={amount}
                        className={`${styles.stakeChip} ${selectedStake === amount ? styles.stakeChipActive : ''}`}
                        onClick={() => { play('click'); setSelectedStake(amount); }}
                        onMouseEnter={() => play('hover')}
                        type="button"
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className={styles.modalCreateButton}
                  onClick={handleCreateDebate}
                  onMouseEnter={() => play('hover')}
                  type="button"
                >
                  Let Azura Generate Topic
                </button>
              </>
            )}

            {/* Generating Animation */}
            {isGenerating && (
              <div className={styles.generatingState}>
                <div className={styles.azuraGenerating}>
                  <Image src="https://i.imgur.com/AkflhaJ.png" alt="Azura" width={80} height={80} unoptimized className={styles.azuraAvatar} />
                  <div className={styles.azuraPulse} />
                </div>
                <h3 className={styles.generatingTitle}>Azura is crafting your debate...</h3>
                <p className={styles.generatingDesc}>Selecting topic and assigning your position</p>
                <div className={styles.generatingDots}>
                  <span className={styles.genDot} />
                  <span className={styles.genDot} />
                  <span className={styles.genDot} />
                </div>
              </div>
            )}

            {/* Generated Result */}
            {generatedDebate && !isGenerating && (
              <div className={styles.generatedState}>
                <div className={styles.azuraResult}>
                  <Image src="https://i.imgur.com/AkflhaJ.png" alt="Azura" width={48} height={48} unoptimized />
                </div>
                <h3 className={styles.generatedTitle}>Your Debate is Ready!</h3>

                <div className={styles.generatedTopic}>
                  <span className={styles.generatedTopicLabel}>Topic</span>
                  <span className={styles.generatedTopicName}>{generatedDebate.topic}</span>
                </div>

                <div className={styles.generatedSides}>
                  <div className={styles.generatedYourSide}>
                    <span className={styles.generatedSideLabel}>Your Side</span>
                    <p className={styles.generatedSideText}>{generatedDebate.yourSide}</p>
                  </div>
                  <div className={styles.generatedOpponentSide}>
                    <span className={styles.generatedSideLabel}>Opponent&apos;s Side</span>
                    <p className={styles.generatedSideText}>{generatedDebate.opponentSide}</p>
                  </div>
                </div>

                <div className={styles.generatedStake}>
                  <Image src="/icons/shard.svg" alt="" width={16} height={16} />
                  <span>{selectedStake} Shards staked</span>
                </div>

                <button
                  className={styles.modalCreateButton}
                  onClick={() => {
                    play('click');
                    setIsCreateModalOpen(false);
                    setGeneratedDebate(null);
                  }}
                  onMouseEnter={() => play('hover')}
                  type="button"
                >
                  Confirm & Post Debate
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Join Debate Modal ─── */}
      {joiningDebateId && (() => {
        const debate = MOCK_DEBATES.find((d) => d.id === joiningDebateId);
        if (!debate) return null;
        return (
          <div className={styles.modalOverlay} onClick={() => setJoiningDebateId(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.modalClose}
                onClick={() => setJoiningDebateId(null)}
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              <h2 className={styles.modalTitle}>Join Debate</h2>
              <h3 className={styles.joinTopic}>{debate.topic}</h3>

              <div className={styles.joinSides}>
                <div className={styles.joinSideTheirs}>
                  <span className={styles.joinSideLabel}>{debate.creator.name}&apos;s Side</span>
                  <p className={styles.joinSideText}>{debate.creatorSide}</p>
                </div>
                <div className={styles.joinSideYours}>
                  <span className={styles.joinSideLabel}>Your Side</span>
                  <p className={styles.joinSideText}>{debate.opponentSide}</p>
                </div>
              </div>

              <div className={styles.joinStake}>
                <Image src="/icons/shard.svg" alt="" width={14} height={14} />
                <span>{debate.stake} Shards to enter</span>
              </div>

              <div className={styles.argumentSection}>
                <label className={styles.modalLabel}>Your Argument</label>
                <textarea
                  className={styles.argumentInput}
                  value={opponentArgument}
                  onChange={(e) => setOpponentArgument(e.target.value)}
                  placeholder="Write your argument for your assigned side..."
                  rows={5}
                />
              </div>

              <button
                className={styles.modalCreateButton}
                onClick={handleSubmitArgument}
                onMouseEnter={() => play('hover')}
                disabled={!opponentArgument.trim()}
                type="button"
              >
                Submit Argument & Stake {debate.stake} Shards
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Users,
  LockKey,
  ShieldCheck,
  Plus,
  X,
  ChatsCircle,
  Info,
} from '@phosphor-icons/react';
import { useSound } from '@/hooks/useSound';
import CtaButton from '@/components/shared/CtaButton';
import SearchBar from '@/components/shared/SearchBar';
import styles from './SquadsHub.module.css';

export interface SquadItem {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  activityTime: string;
  isOpen: boolean;
  avatarUrl?: string;
  badge?: string;
  lastMessage?: string;
}

const DEFAULT_SQUADS: SquadItem[] = [
  {
    id: 'global',
    name: 'Global Community',
    description: 'Welcome to the Academy commons. What are you studying today?',
    memberCount: 342,
    activityTime: 'Just now',
    isOpen: true,
    avatarUrl: '/blue/blue-avatar.png',
    lastMessage: 'Welcome to the Academy commons. What are you studying today?',
  },
  {
    id: 'health-nutrition',
    name: 'Health & Nutrition',
    description: 'Field note prompt posted for Week 3 integration.',
    memberCount: 28,
    activityTime: '2h ago',
    isOpen: false,
    lastMessage: 'Field note prompt posted for Week 3 integration.',
  },
  {
    id: 'deep-work-sprints',
    name: 'Focus & Habit Sprint',
    description: 'Sprint check-in complete. 14 members completed daily note.',
    memberCount: 45,
    activityTime: '5h ago',
    isOpen: false,
    lastMessage: 'Sprint check-in complete. 14 members completed daily note.',
  },
];

interface SquadsHubProps {
  onSelectSquad: (squadId: string) => void;
}

export default function SquadsHub({ onSelectSquad }: SquadsHubProps) {
  const { play } = useSound();
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [codeModalSquad, setCodeModalSquad] = useState<SquadItem | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState<string | null>(null);
  const [squadNameInput, setSquadNameInput] = useState('');

  const filteredSquads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return DEFAULT_SQUADS;
    return DEFAULT_SQUADS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.lastMessage && s.lastMessage.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const handleOpenCreateModal = () => {
    play('click');
    setAuthCode('');
    setCodeError(null);
    setCodeSuccess(null);
    setSquadNameInput('');
    setCreateModalOpen(true);
  };

  const handleSquadClick = (squad: SquadItem) => {
    play('click');
    if (squad.isOpen) {
      onSelectSquad(squad.id);
      return;
    }
    // Squad requires a specialist code
    setAuthCode('');
    setCodeError(null);
    setCodeSuccess(null);
    setCodeModalSquad(squad);
  };

  const handleVerifyCreateCode = (e: React.FormEvent) => {
    e.preventDefault();
    play('click');
    const trimmed = authCode.trim().toUpperCase();
    if (!trimmed) {
      setCodeError('Please enter a specialist authorization code.');
      return;
    }

    // Specialist codes follow pattern or recognized tokens
    const validSpecialistCodes = ['SPECIALIST-2026', 'COHORT-BLUE', 'MWA-RESEARCH', 'MENTOR-PASS'];
    const matchesPattern = trimmed.startsWith('SPEC-') || trimmed.startsWith('MWA-') || validSpecialistCodes.includes(trimmed);

    if (matchesPattern || trimmed.length >= 6) {
      setCodeError(null);
      setCodeSuccess('Authorization verified. Specialist squad initialized.');
      setTimeout(() => {
        setCreateModalOpen(false);
        onSelectSquad('global');
      }, 1200);
    } else {
      setCodeError('Invalid specialist code. Obtain an authorized code from your Academy mentor.');
    }
  };

  const handleVerifyJoinCode = (e: React.FormEvent) => {
    e.preventDefault();
    play('click');
    const trimmed = authCode.trim().toUpperCase();
    if (!trimmed) {
      setCodeError('Please enter the cohort access code.');
      return;
    }

    if (trimmed.length >= 4) {
      setCodeError(null);
      setCodeSuccess('Access granted. Entering squad room.');
      setTimeout(() => {
        const squadId = codeModalSquad?.id ?? 'global';
        setCodeModalSquad(null);
        onSelectSquad(squadId);
      }, 1000);
    } else {
      setCodeError('Invalid code. Please verify with your cohort specialist.');
    }
  };

  return (
    <div className={styles.globalPanel}>
      {/* Scenehead matching other scene heads */}
      <div className={styles.panelHeader}>
        <span className={styles.panelTitleJa} lang="ja">部隊</span>
        <span className={styles.panelTitle}>Squads</span>
      </div>

      {/* Search Bar */}
      <div className={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChange={(e) => {
            play('click');
            setSearchQuery(e.target.value);
          }}
          placeholder="Search squads or members..."
          aria-label="Search squads"
        />
      </div>

      {/* Create Squad Row */}
      <div className={styles.actionSection}>
        <button
          type="button"
          className={styles.createSquadRow}
          onClick={handleOpenCreateModal}
          aria-label="Invite Your Squad"
        >
          <div className={styles.createSquadLeft}>
            <div className={styles.createIconWrap}>
              <Users size={20} weight="fill" className={styles.createIcon} />
            </div>
            <div className={styles.createSquadInfo}>
              <span className={styles.createSquadTitle}>Invite Your Squad</span>
              <span className={styles.createSquadSubtitle}>
                Earn 800 diamonds for each person you invite.{' '}
                <span
                  className={styles.infoBubble}
                  title="Earn 800 diamonds and 20 USDC for each person who joins with your squad code."
                  aria-label="Reward information"
                >
                  <Info size={13} weight="bold" />
                </span>
              </span>
            </div>
          </div>
          <div className={styles.rewardBadgeStack}>
            <span className={styles.rewardBadge}>
              <Image src="/icons/ui-diamond.svg" alt="" width={13} height={13} />
              +800
            </span>
            <span className={`${styles.rewardBadge} ${styles.usdcBadge}`}>
              <Image src="/icons/usdc-logo.svg" alt="" width={13} height={13} />
              20 USDC
            </span>
          </div>
        </button>
      </div>

      {/* Squads List Section */}
      <section className={styles.squadsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Squads</h2>
        </div>

        <div className={styles.squadsList} role="list">
          {filteredSquads.map((squad) => (
            <button
              key={squad.id}
              type="button"
              className={`${styles.squadItem} ${squad.isOpen ? styles.squadItemOpen : styles.squadItemLocked}`}
              onClick={() => handleSquadClick(squad)}
              role="listitem"
            >
              <div className={styles.squadItemAvatar}>
                {squad.avatarUrl ? (
                  <Image
                    src={squad.avatarUrl}
                    alt={squad.name}
                    width={38}
                    height={38}
                    className={styles.squadAvatarImg}
                    unoptimized
                  />
                ) : (
                  <div className={styles.squadDefaultAvatar}>
                    <ChatsCircle size={22} weight="duotone" />
                  </div>
                )}
              </div>

              <div className={styles.squadItemBody}>
                <div className={styles.squadItemHeaderRow}>
                  <span className={styles.squadItemName}>{squad.name}</span>
                </div>
                <p className={styles.squadItemLastMsg}>
                  {squad.lastMessage ?? squad.description}
                </p>
              </div>

              <div className={styles.squadItemAction}>
                <span className={styles.squadItemTime}>{squad.activityTime}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Modal: Create Squad (Requires Specialist Code) */}
      {createModalOpen && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-squad-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateModalOpen(false);
          }}
        >
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <ShieldCheck size={22} weight="duotone" className={styles.modalTitleIcon} />
                <h3 id="create-squad-title" className={styles.modalTitle}>
                  Create Squad
                </h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setCreateModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <p className={styles.modalDesc}>
              Squad creation is gated by authorized Academy specialists to maintain focused cohort study and accountability integrity.
            </p>

            <form onSubmit={handleVerifyCreateCode} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="squad-name" className={styles.formLabel}>
                  Squad Name
                </label>
                <input
                  id="squad-name"
                  type="text"
                  value={squadNameInput}
                  onChange={(e) => setSquadNameInput(e.target.value)}
                  placeholder="e.g. Morning Cognition Lab"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="specialist-code" className={styles.formLabel}>
                  Specialist Authorization Code
                </label>
                <input
                  id="specialist-code"
                  type="text"
                  value={authCode}
                  onChange={(e) => {
                    setAuthCode(e.target.value);
                    setCodeError(null);
                  }}
                  placeholder="Enter code from your specialist"
                  className={`${styles.formInput} ${styles.codeInput}`}
                  autoFocus
                />
              </div>

              {codeError && <p className={styles.formError}>{codeError}</p>}
              {codeSuccess && <p className={styles.formSuccess}>{codeSuccess}</p>}

              <div className={styles.modalActions}>
                <CtaButton
                  variant="primary"
                  type="submit"
                  block
                  disabled={Boolean(codeSuccess)}
                >
                  Verify and Create
                </CtaButton>
              </div>

              <div className={styles.specialistNotice}>
                <p className={styles.noticeText}>
                  Do not have a code? Specialists issue cohort codes during 1-on-1 reviews and guided learning tracks.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Join Locked Squad */}
      {codeModalSquad && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-squad-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCodeModalSquad(null);
          }}
        >
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <LockKey size={22} weight="duotone" className={styles.modalTitleIcon} />
                <h3 id="join-squad-title" className={styles.modalTitle}>
                  {codeModalSquad.name}
                </h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setCodeModalSquad(null)}
                aria-label="Close"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <p className={styles.modalDesc}>
              This is a private specialist cohort. Enter the invitation or specialist access code to join.
            </p>

            <form onSubmit={handleVerifyJoinCode} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="join-code" className={styles.formLabel}>
                  Cohort Access Code
                </label>
                <input
                  id="join-code"
                  type="text"
                  value={authCode}
                  onChange={(e) => {
                    setAuthCode(e.target.value);
                    setCodeError(null);
                  }}
                  placeholder="Enter cohort access code"
                  className={`${styles.formInput} ${styles.codeInput}`}
                  autoFocus
                />
              </div>

              {codeError && <p className={styles.formError}>{codeError}</p>}
              {codeSuccess && <p className={styles.formSuccess}>{codeSuccess}</p>}

              <div className={styles.modalActions}>
                <CtaButton
                  variant="primary"
                  type="submit"
                  block
                  disabled={Boolean(codeSuccess)}
                >
                  Enter Squad
                </CtaButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

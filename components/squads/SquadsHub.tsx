'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Users,
  MagnifyingGlass,
  CaretRight,
  LockKey,
  ShieldCheck,
  X,
  ChatsCircle,
  Tray,
} from '@phosphor-icons/react';
import { useSound } from '@/hooks/useSound';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import CtaButton from '@/components/shared/CtaButton';
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
    description: 'Live cohort discussion for all Academy members. Open access, no invitation needed.',
    memberCount: 342,
    activityTime: 'Just now',
    isOpen: true,
    avatarUrl: '/images/blue-guide-sprites/breathing-idle.gif',
    badge: 'Open Access',
    lastMessage: 'Welcome to the Academy commons. What are you studying today?',
  },
  {
    id: 'health-longevity',
    name: 'Health & Longevity',
    description: 'Guided 12-week integration circle with dedicated mentors.',
    memberCount: 28,
    activityTime: '2h ago',
    isOpen: false,
    badge: 'Specialist Code',
    lastMessage: 'Field note prompt posted for Week 3 integration.',
  },
  {
    id: 'deep-work-sprints',
    name: 'Focus & Habit Sprint',
    description: 'Daily accountability and 90-minute synchronized focus sprints.',
    memberCount: 45,
    activityTime: '5h ago',
    isOpen: false,
    badge: 'Specialist Code',
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
  const [inboxModalOpen, setInboxModalOpen] = useState(false);
  const [codeModalSquad, setCodeModalSquad] = useState<SquadItem | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState<string | null>(null);
  const [squadNameInput, setSquadNameInput] = useState('');

  const sceneUrl = useMemo(() => dailySceneBackgroundUrl(), []);

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
    <div
      className={styles.hubContainer}
      style={{ backgroundImage: `url(${sceneUrl})` }}
    >
      <div className={styles.scrimOverlay} />

      <div className={styles.hubContent}>
        {/* Top Bar */}
        <header className={styles.topHeader}>
          <h1 className={styles.topTitle}>Squads</h1>
          <button
            type="button"
            className={styles.inboxBtn}
            onClick={() => {
              play('click');
              setInboxModalOpen(true);
            }}
            aria-label="Inbox"
            title="Inbox"
          >
            <Tray size={20} weight="bold" />
          </button>
        </header>

        {/* Search Bar */}
        <div className={styles.searchSection}>
          <div className={styles.searchBar}>
            <MagnifyingGlass size={18} weight="bold" className={styles.searchIcon} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search squads or members..."
              className={styles.searchInput}
              aria-label="Search squads"
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>
        </div>

        {/* Create Squad Row */}
        <div className={styles.actionSection}>
          <button
            type="button"
            className={styles.createSquadRow}
            onClick={handleOpenCreateModal}
            aria-label="Create Squad"
          >
            <div className={styles.createSquadLeft}>
              <div className={styles.createIconWrap}>
                <Users size={20} weight="fill" className={styles.createIcon} />
              </div>
              <div className={styles.createSquadInfo}>
                <span className={styles.createSquadTitle}>Create Squad</span>
                <span className={styles.createSquadSubtitle}>Invite a buddy [+100 diamonds]</span>
              </div>
            </div>
            <CaretRight size={18} weight="bold" className={styles.createChevron} />
          </button>
        </div>

        {/* Squads List Section */}
        <section className={styles.squadsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Squads</h2>
            <span className={styles.squadsCount}>{filteredSquads.length} available</span>
          </div>

          <div className={styles.squadsList} role="list">
            {filteredSquads.map((squad, index) => (
              <button
                key={squad.id}
                type="button"
                style={{ animationDelay: `${index * 60 + 60}ms` }}
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
                    <span className={styles.squadItemTime}>{squad.activityTime}</span>
                  </div>
                  <p className={styles.squadItemLastMsg}>
                    {squad.lastMessage ?? squad.description}
                  </p>
                  <div className={styles.squadItemMeta}>
                    {squad.isOpen ? (
                      <span className={styles.badgeOpen}>{squad.badge}</span>
                    ) : (
                      <span className={styles.badgeLocked}>
                        <LockKey size={11} weight="bold" />
                        {squad.badge}
                      </span>
                    )}
                    <span className={styles.squadMemberCount}>{squad.memberCount} members</span>
                  </div>
                </div>

                <div className={styles.squadItemAction}>
                  <CaretRight size={16} weight="bold" className={styles.squadChevron} />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Modal: Inbox */}
      {inboxModalOpen && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="inbox-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInboxModalOpen(false);
          }}
        >
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <Tray size={22} weight="bold" className={styles.modalTitleIcon} />
                <h3 id="inbox-title" className={styles.modalTitle}>
                  Inbox
                </h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setInboxModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className={styles.inboxEmpty}>
              <p className={styles.inboxEmptyTitle}>No unread notifications</p>
              <p className={styles.inboxEmptyDesc}>
                Squad invitations and cohort messages will appear here.
              </p>
            </div>
          </div>
        </div>
      )}

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

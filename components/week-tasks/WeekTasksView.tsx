'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { usePrivy } from '@privy-io/react-auth';
import styles from './WeekTasksView.module.css';
import jStyles from '@/components/accordion-journal/AccordionJournalCard.module.css';
import { useCourseSections } from '@/lib/vip-course-legacy';
import type { JournalSection } from '@/lib/vip-course-legacy';
import { useSound } from '@/hooks/useSound';

// Reward overlays shared with the Field Notes flow, so sealing a week
// celebrates the same way completing a field note does.
const DiamondReward = dynamic(() => import('@/components/rewards/DiamondReward').then(mod => mod.DiamondReward), {
  ssr: false,
  loading: () => null,
});
const ConfettiCelebration = dynamic(() => import('@/components/quests/ConfettiCelebration').then(mod => mod.ConfettiCelebration), {
  ssr: false,
  loading: () => null,
});

const WEEK_COLORS: Record<number, string> = {
  0: '#5168FF', 1: '#5168FF', 2: '#3B82F6', 3: '#06B6D4',
  4: '#14B8A6', 5: '#22C55E', 6: '#4ECDC4', 7: '#45B7D1',
  8: '#5168FF', 9: '#7C3AED', 10: '#A855F7', 11: '#D946EF',
  12: '#EC4899', 13: '#EC4899',
};

// Per-task "calm rainbow" palette — mirrors the onboarding/intake survey hues
// (indigo → violet → sky → green), no warning reds/oranges. Tasks 1–8 flow
// top-to-bottom; cycles past index 7 if a week has more than 8 sections.
const TASK_ACCENTS = [
  '#5168FF', // 1 — indigo (brand)
  '#7C8FFF', // 2 — soft indigo
  '#8B5CF6', // 3 — violet
  '#A855F7', // 4 — purple
  '#38BDF8', // 5 — sky
  '#22D3EE', // 6 — cyan
  '#2DD4BF', // 7 — teal
  '#34D399', // 8 — emerald
];

interface BlurtEntry { id: string; blurt: string; affirmation: string; }

type TaskArtVariant = 'aurora' | 'sunrise' | 'orbit' | 'bloom' | 'ribbon' | 'prism';

function getTaskArtVariant(section: JournalSection): TaskArtVariant {
  const id = `${section.id}-${section.type}`;

  if (id.includes('walk') || id.includes('date') || id.includes('enjoy')) return 'sunrise';
  if (id.includes('life') || id.includes('affirm') || id.includes('champion')) return 'bloom';
  if (id.includes('time') || id.includes('map') || id.includes('pie')) return 'orbit';
  if (id.includes('letter') || id.includes('text') || id.includes('reading')) return 'ribbon';
  if (id.includes('enemy') || id.includes('monster') || id.includes('check')) return 'prism';
  return 'aurora';
}

function getTaskArtLabel(section: JournalSection): string {
  switch (getTaskArtVariant(section)) {
    case 'sunrise':
      return 'Calm horizon illustration';
    case 'bloom':
      return 'Botanical gradient illustration';
    case 'orbit':
      return 'Orbital abstract illustration';
    case 'ribbon':
      return 'Layered ribbon illustration';
    case 'prism':
      return 'Prismatic abstract illustration';
    default:
      return 'Aurora gradient illustration';
  }
}

interface WeekTasksViewProps {
  weekNumber: number;
  enablePersistence?: boolean;
  isLocked?: boolean;
  initialIsSealed?: boolean;
  initialSealTxHash?: string | null;
  onSealComplete?: (weekNumber: number, txHash: string | null) => void;
  /** Reports week progress so a parent can render a diamonds/progress badge. */
  onStats?: (stats: { weekNumber: number; completed: number; total: number }) => void;
  /** Controlled section selection used by the desktop course detail panel. */
  selectedSectionId?: string | null;
  onSectionSelect?: (sectionId: string | null) => void;
  /** Keep task editors in the list below this breakpoint; portal them on desktop. */
  renderDetailInPanel?: boolean;
  detailPortalTarget?: HTMLElement | null;
}

export default function WeekTasksView({
  weekNumber,
  enablePersistence = false,
  isLocked = false,
  initialIsSealed,
  initialSealTxHash,
  onSealComplete,
  onStats,
  selectedSectionId,
  onSectionSelect,
  renderDetailInPanel = false,
  detailPortalTarget,
}: WeekTasksViewProps) {
  const { sections: fetchedSections, loading: sectionsLoading } = useCourseSections('creative-healing', weekNumber);
  const journalSections: JournalSection[] = useMemo(
    () => fetchedSections || [],
    [fetchedSections],
  );
  const weekColor = WEEK_COLORS[weekNumber] || '#5168FF';

  const { play } = useSound();
  const { authenticated, getAccessToken, login } = usePrivy();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [sectionData, setSectionData] = useState<Record<string, unknown>>({});
  const [blurtEntries, setBlurtEntries] = useState<BlurtEntry[]>([
    { id: '1', blurt: '', affirmation: '' },
    { id: '2', blurt: '', affirmation: '' },
    { id: '3', blurt: '', affirmation: '' },
  ]);
  const [checklistStates, setChecklistStates] = useState<Record<string, boolean[]>>({});
  const [enjoyListEntries, setEnjoyListEntries] = useState(
    Array.from({ length: 20 }, () => ({ activity: '', lastDate: '' }))
  );
  const [timeMapActivities, setTimeMapActivities] = useState(
    Array.from({ length: 5 }, () => ({ activity: '', time: '', wantOrShould: '', forWhom: '' }))
  );
  const [lifePieValues, setLifePieValues] = useState<Record<string, number>>({
    spirituality: 50, exercise: 50, play: 50, work: 50, friends: 50, romance: 50,
  });
  const [isSealed, setIsSealed] = useState(initialIsSealed ?? false);
  const [isSealing, setIsSealing] = useState(false);
  const [sealStep, setSealStep] = useState<'confirm' | 'sealing'>('confirm');
  const [showSealModal, setShowSealModal] = useState(false);
  const [sealError, setSealError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [shardsAwarded, setShardsAwarded] = useState(100);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [showMissionReward, setShowMissionReward] = useState(false);
  const [missionRewardKey, setMissionRewardKey] = useState(0);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [sealTxHash, setSealTxHash] = useState<string | null>(initialSealTxHash ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);
  const lastSliderSoundRef = useRef(0);

  useEffect(() => {
    if (initialIsSealed !== undefined) setIsSealed(initialIsSealed);
    if (initialSealTxHash !== undefined) setSealTxHash(initialSealTxHash ?? null);
  }, [initialIsSealed, initialSealTxHash]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.user?.username) setUsername(data.user.username);
        }
      } catch {}
    })();
  }, []);

  const collectProgressData = useCallback(() => ({
    sectionData,
    blurtEntries,
    checklistStates,
    enjoyListEntries,
    timeMapActivities,
    lifePieValues,
    completedSections: Array.from(completedSections),
  }), [sectionData, blurtEntries, checklistStates, enjoyListEntries, timeMapActivities, lifePieValues, completedSections]);

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  // Load progress
  useEffect(() => {
    if (hasLoadedRef.current || !enablePersistence) { setIsLoading(false); return; }
    hasLoadedRef.current = true;
    (async () => {
      try {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`/api/ethereal-progress?week=${weekNumber}`, {
          credentials: 'include',
          headers: authHeaders,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.progressData && Object.keys(data.progressData).length > 0) {
          const pd = data.progressData;
          if (pd.sectionData) setSectionData(pd.sectionData);
          if (pd.blurtEntries) setBlurtEntries(pd.blurtEntries);
          if (pd.checklistStates) setChecklistStates(pd.checklistStates);
          if (pd.enjoyListEntries) setEnjoyListEntries(pd.enjoyListEntries);
          if (pd.timeMapActivities) setTimeMapActivities(pd.timeMapActivities);
          if (pd.lifePieValues) setLifePieValues(pd.lifePieValues);
          if (pd.completedSections) setCompletedSections(new Set(pd.completedSections));
        }
        if (data.isSealed) setIsSealed(true);
        if (data.sealTxHash) setSealTxHash(data.sealTxHash);
      } catch {}
      finally { setIsLoading(false); }
    })();
  }, [weekNumber, enablePersistence, getAuthHeaders]);

  // Report {completed, total} upward so the panel badge can show diamonds left
  // and week progress without re-fetching the section list.
  useEffect(() => {
    if (isLoading || sectionsLoading) return;
    onStats?.({ weekNumber, completed: completedSections.size, total: journalSections.length });
  }, [completedSections, journalSections.length, isLoading, sectionsLoading, weekNumber, onStats]);

  // Persist the current progress snapshot. Kept in a ref so the unmount
  // flush below always calls the latest version.
  const persistProgress = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/ethereal-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({ weekNumber, progressData: collectProgressData() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.creditsAwarded > 0 && typeof window !== 'undefined') {
          window.dispatchEvent(new Event('shardsUpdated'));
        }
      }
    } catch { /* silent */ }
  }, [weekNumber, collectProgressData, getAuthHeaders]);
  const persistRef = useRef(persistProgress);
  persistRef.current = persistProgress;
  // True when an edit has been made that the debounced save hasn't flushed yet.
  const pendingSaveRef = useRef(false);

  // Auto-save
  useEffect(() => {
    if (!hasLoadedRef.current || isSealed || !enablePersistence) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    pendingSaveRef.current = true;
    saveTimerRef.current = setTimeout(() => {
      pendingSaveRef.current = false;
      persistProgress();
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [sectionData, blurtEntries, checklistStates, enjoyListEntries, timeMapActivities, lifePieValues, completedSections, weekNumber, isSealed, enablePersistence, persistProgress]);

  // Flush any pending save on unmount so switching weeks/closing the panel
  // mid-debounce doesn't silently discard the last edit.
  useEffect(() => {
    return () => { if (pendingSaveRef.current) persistRef.current(); };
  }, []);

  // Init checklists
  useEffect(() => {
    setChecklistStates(prev => {
      if (Object.keys(prev).length > 0) return prev;
      const init: Record<string, boolean[]> = {};
      journalSections.forEach(s => {
        if (s.type === 'checklist' && s.checkItems) init[s.id] = new Array(s.checkItems.length).fill(false);
      });
      return init;
    });
  }, [journalSections]);

  const completedCount = completedSections.size;
  const totalSections = journalSections.length;
  const canSeal = completedCount >= totalSections && !isSealed;

  const activeSectionId = selectedSectionId === undefined ? expandedSection : selectedSectionId;

  const toggleExpand = (id: string) => {
    const nextId = activeSectionId === id ? null : id;
    play(nextId === null ? 'toggle-off' : 'toggle-on');
    if (onSectionSelect) {
      onSectionSelect(nextId);
      return;
    }
    setExpandedSection(nextId);
  };

  // Completion is permanent: finished tasks can't be unchecked, and the
  // diamonds are claimed through an explicit confirm step. Reading is open
  // to everyone — completing is the moment that needs an account.
  const markComplete = (id: string) => {
    if (completedSections.has(id)) return;
    if (!authenticated) {
      login();
      return;
    }
    play('click');
    setPendingTaskId(id);
  };

  const confirmComplete = () => {
    const id = pendingTaskId;
    if (!id || completedSections.has(id)) { setPendingTaskId(null); return; }
    play('celebration');
    setPendingTaskId(null);
    setShowMissionReward(true);
    setMissionRewardKey(k => k + 1);
    // Let the first-run course walkthrough know a mission was just finished,
    // so it can surface its closing spotlights (shop + Ask Blue).
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('missionCompleted'));
    setCompletedSections(prev => new Set(prev).add(id));
  };

  const handleTextChange = (sectionId: string, index: number | null, value: string) => {
    setSectionData(prev => {
      const key = index !== null ? `${sectionId}-${index}` : sectionId;
      return { ...prev, [key]: value };
    });
  };

  const handleBlurtChange = (entryId: string, field: 'blurt' | 'affirmation', value: string) => {
    setBlurtEntries(prev => prev.map(e => e.id === entryId ? { ...e, [field]: value } : e));
  };

  const addBlurtEntry = () => {
    setBlurtEntries(prev => [...prev, { id: String(Date.now()), blurt: '', affirmation: '' }]);
  };

  const handleChecklistToggle = (sectionId: string, idx: number) => {
    setChecklistStates(prev => {
      const updated = [...(prev[sectionId] || [])];
      updated[idx] = !updated[idx];
      return { ...prev, [sectionId]: updated };
    });
  };

  const handleEnjoyListChange = (idx: number, field: 'activity' | 'lastDate', value: string) => {
    setEnjoyListEntries(prev => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; return u; });
  };

  const handleTimeMapChange = (idx: number, field: string, value: string) => {
    setTimeMapActivities(prev => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; return u; });
  };

  const handleLifePieChange = (area: string, value: number) => {
    setLifePieValues(prev => ({ ...prev, [area]: value }));
    const now = Date.now();
    if (now - lastSliderSoundRef.current > 80) {
      lastSliderSoundRef.current = now;
      play('hum');
    }
  };

  const handleSealWeek = async () => {
    if (!authenticated) {
      login();
      return;
    }
    if (!canSeal || isSealing) return;
    setIsSealing(true);
    setSealStep('sealing');
    setSealError(null);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/ethereal-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({ weekNumber, progressData: collectProgressData(), seal: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seal failed');
      setSealTxHash(data.txHash ?? null);
      setShardsAwarded(typeof data.shardsAwarded === 'number' ? data.shardsAwarded : 100);
      setIsSealed(true);
      // Collapse whatever task module was open so the user lands on the
      // celebration rather than a now-locked editor.
      setExpandedSection(null);
      // Close the modal and hand off to the shared reward overlays
      // (confetti + credit count-up), the same celebration Field Notes uses.
      setShowSealModal(false);
      setSealStep('confirm');
      setShowRewardAnimation(true);
      // Tell the navbar credit counter (and anything else listening) to refresh.
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('shardsUpdated'));
      // The authenticated seal API posts the completion to Global Chat as a
      // grey system message. Refresh non-realtime clients after it returns.
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('globalChatUpdate'));
      if (onSealComplete) onSealComplete(weekNumber, data.txHash ?? null);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([50, 30, 50, 30, 100]);
    } catch (err) {
      console.error('Seal failed:', err);
      setSealError(err instanceof Error ? err.message : 'Seal failed. Please try again.');
      setSealStep('confirm');
    } finally { setIsSealing(false); }
  };

  const renderSectionContent = (section: JournalSection) => {
    const disabled = isSealed;
    switch (section.type) {
      case 'text':
        return (
          <textarea
            className={jStyles.textarea}
            placeholder={section.placeholder}
            value={(sectionData[section.id] as string) || ''}
            onChange={e => handleTextChange(section.id, null, e.target.value)}
            rows={4}
            disabled={disabled}
          />
        );
      case 'list':
      case 'numbered-list':
        return (
          <div className={jStyles.listInputs}>
            {Array.from({ length: section.listCount || 3 }).map((_, idx) => (
              <div key={idx} className={jStyles.listItem}>
                <label className={jStyles.listLabel}>{section.listLabels?.[idx] || `Item ${idx + 1}`}</label>
                {(section.listLabels?.[idx]?.includes('Horror Story') ||
                  section.listLabels?.[idx]?.includes('Letter') ||
                  section.listLabels?.[idx]?.includes('How I completed')) ? (
                  <textarea
                    className={jStyles.textarea}
                    placeholder="Write here..."
                    value={(sectionData[`${section.id}-${idx}`] as string) || ''}
                    onChange={e => handleTextChange(section.id, idx, e.target.value)}
                    rows={4}
                    disabled={disabled}
                  />
                ) : (
                  <input
                    type="text"
                    className={jStyles.input}
                    placeholder={section.type === 'numbered-list' ? '' : 'Enter here...'}
                    value={(sectionData[`${section.id}-${idx}`] as string) || ''}
                    onChange={e => handleTextChange(section.id, idx, e.target.value)}
                    disabled={disabled}
                  />
                )}
              </div>
            ))}
          </div>
        );
      case 'blurts':
        return (
          <div className={jStyles.blurtsContainer}>
            <div className={jStyles.blurtsHeader}>
              <span className={jStyles.blurtColumnHeader}>Negative Blurt</span>
              <span className={jStyles.blurtColumnHeader}>Positive Affirmation</span>
            </div>
            {blurtEntries.map(entry => (
              <div key={entry.id} className={jStyles.blurtRow}>
                <input type="text" className={jStyles.blurtInput} placeholder="I'm stupid..."
                  value={entry.blurt} onChange={e => handleBlurtChange(entry.id, 'blurt', e.target.value)} disabled={disabled} />
                <span className={jStyles.blurtArrow}>&rarr;</span>
                <input type="text" className={jStyles.affirmationInput} placeholder="I'm always learning"
                  value={entry.affirmation} onChange={e => handleBlurtChange(entry.id, 'affirmation', e.target.value)} disabled={disabled} />
              </div>
            ))}
            <button type="button" className={jStyles.addBlurtButton}
              onClick={() => { play('click'); addBlurtEntry(); }}
              onMouseEnter={() => play('hover')}
              disabled={disabled}>
              + Add another blurt
            </button>
          </div>
        );
      case 'lives': {
        const startNum = section.startNumber || 1;
        return (
          <div className={jStyles.livesContainer}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className={jStyles.lifeItem}>
                <span className={jStyles.lifeNumber}>{startNum + idx}</span>
                <input type="text" className={jStyles.lifeInput}
                  placeholder="If I could be anything, I'd be a..."
                  value={(sectionData[`${section.id}-${idx}`] as string) || ''}
                  onChange={e => handleTextChange(section.id, idx, e.target.value)} disabled={disabled} />
              </div>
            ))}
            <div className={jStyles.lifeAction}>
              <label className={jStyles.listLabel}>This week I will try:</label>
              <textarea className={jStyles.textarea}
                placeholder="Pick one life and describe what you'll do to explore it this week..."
                value={(sectionData[`${section.id}-action`] as string) || ''}
                onChange={e => setSectionData(p => ({ ...p, [`${section.id}-action`]: e.target.value }))}
                rows={3} disabled={disabled} />
            </div>
          </div>
        );
      }
      case 'checklist':
        return (
          <div className={jStyles.checklistContainer}>
            {section.checkItems?.map((item, idx) => (
              <label key={idx} className={jStyles.checklistItem}>
                <input type="checkbox" checked={checklistStates[section.id]?.[idx] || false}
                  onChange={() => {
                    play(checklistStates[section.id]?.[idx] ? 'click' : 'success');
                    handleChecklistToggle(section.id, idx);
                  }} className={jStyles.checkbox} disabled={disabled} />
                <span className={jStyles.checklistText}>{item}</span>
              </label>
            ))}
          </div>
        );
      case 'time-map':
        return (
          <div className={jStyles.timeMapContainer}>
            <div className={jStyles.timeMapTable}>
              <div className={jStyles.timeMapHeader}>
                <span>Activity</span><span>Time</span><span>Want/Should</span><span>For Me/Others</span>
              </div>
              {timeMapActivities.map((a, idx) => (
                <div key={idx} className={jStyles.timeMapRow}>
                  <input type="text" className={jStyles.input} placeholder={`Activity ${idx + 1}`}
                    value={a.activity} onChange={e => handleTimeMapChange(idx, 'activity', e.target.value)} disabled={disabled} />
                  <input type="text" className={jStyles.input} placeholder="Hours"
                    value={a.time} onChange={e => handleTimeMapChange(idx, 'time', e.target.value)} disabled={disabled} />
                  <select className={jStyles.select} value={a.wantOrShould}
                    onPointerDown={() => play('click')}
                    onChange={e => { play('navigation'); handleTimeMapChange(idx, 'wantOrShould', e.target.value); }} disabled={disabled}>
                    <option value="">Select</option><option value="want">Want to</option><option value="should">Should</option>
                  </select>
                  <select className={jStyles.select} value={a.forWhom}
                    onPointerDown={() => play('click')}
                    onChange={e => { play('navigation'); handleTimeMapChange(idx, 'forWhom', e.target.value); }} disabled={disabled}>
                    <option value="">Select</option><option value="me">For me</option><option value="others">For others</option>
                  </select>
                </div>
              ))}
            </div>
            <div className={jStyles.safetyMapSection}>
              <h4 className={jStyles.subSectionTitle}>Safety Map</h4>
              <div className={jStyles.safetyMapInputs}>
                <div className={jStyles.safetyMapColumn}>
                  <label className={jStyles.listLabel}>Topics & People to Protect (Inside Circle)</label>
                  <textarea className={jStyles.textarea} placeholder="Topics I need to protect, supportive people..."
                    value={(sectionData['time-map-protect'] as string) || ''}
                    onChange={e => setSectionData(p => ({ ...p, 'time-map-protect': e.target.value }))} rows={3} disabled={disabled} />
                </div>
                <div className={jStyles.safetyMapColumn}>
                  <label className={jStyles.listLabel}>People to Be Self-Protective Around (Outside Circle)</label>
                  <textarea className={jStyles.textarea} placeholder="People I need to be cautious around right now..."
                    value={(sectionData['time-map-cautious'] as string) || ''}
                    onChange={e => setSectionData(p => ({ ...p, 'time-map-cautious': e.target.value }))} rows={3} disabled={disabled} />
                </div>
              </div>
              <div className={jStyles.listItem}>
                <label className={jStyles.listLabel}>Doubts that were triggered this week</label>
                <textarea className={jStyles.textarea} placeholder="Have any of your blocked friends triggered doubts in you?"
                  value={(sectionData['time-map-doubts'] as string) || ''}
                  onChange={e => setSectionData(p => ({ ...p, 'time-map-doubts': e.target.value }))} rows={2} disabled={disabled} />
              </div>
            </div>
          </div>
        );
      case 'enjoy-list':
        return (
          <div className={jStyles.enjoyListContainer}>
            <div className={jStyles.enjoyListHeader}><span>Thing I Enjoy</span><span>Last Time I Did It</span></div>
            {enjoyListEntries.map((entry, idx) => (
              <div key={idx} className={jStyles.enjoyListRow}>
                <span className={jStyles.enjoyListNumber}>{idx + 1}</span>
                <input type="text" className={jStyles.input} placeholder="Something I enjoy..."
                  value={entry.activity} onChange={e => handleEnjoyListChange(idx, 'activity', e.target.value)} disabled={disabled} />
                <input type="text" className={jStyles.dateInput} placeholder="Date"
                  value={entry.lastDate} onChange={e => handleEnjoyListChange(idx, 'lastDate', e.target.value)} disabled={disabled} />
              </div>
            ))}
          </div>
        );
      case 'affirmations':
        return (
          <div className={jStyles.affirmationsContainer}>
            <div className={jStyles.listInputs}>
              {[1, 2, 3].map(num => (
                <div key={num} className={jStyles.listItem}>
                  <label className={jStyles.listLabel}>Chosen Affirmation {num}</label>
                  <input type="text" className={jStyles.affirmationInputGreen}
                    placeholder="I am creative and my ideas have value..."
                    value={(sectionData[`affirmation-${num}`] as string) || ''}
                    onChange={e => setSectionData(p => ({ ...p, [`affirmation-${num}`]: e.target.value }))} disabled={disabled} />
                </div>
              ))}
            </div>
            <div className={jStyles.affirmationReminder}><p>Write each affirmation 5 times daily in your field notes</p></div>
          </div>
        );
      case 'life-pie': {
        const areas = [
          { key: 'spirituality', label: 'Values' }, { key: 'exercise', label: 'Exercise' },
          { key: 'play', label: 'Play' }, { key: 'work', label: 'Work' },
          { key: 'friends', label: 'Friends' }, { key: 'romance', label: 'Romance/Adventure' },
        ];
        return (
          <div className={jStyles.lifePieContainer}>
            <p className={jStyles.lifePieInstructions}>Rate each area from 0 (not fulfilled) to 100 (very fulfilled):</p>
            <div className={jStyles.lifePieSliders}>
              {areas.map(({ key, label }) => (
                <div key={key} className={jStyles.lifePieSlider}>
                  <label className={jStyles.lifePieLabel}>
                    <span>{label}</span><span className={jStyles.lifePieValue}>{lifePieValues[key]}%</span>
                  </label>
                  <input type="range" min="0" max="100" value={lifePieValues[key]}
                    onChange={e => handleLifePieChange(key, parseInt(e.target.value))}
                    className={jStyles.slider} disabled={disabled} />
                </div>
              ))}
            </div>
            <div className={jStyles.listItem}>
              <label className={jStyles.listLabel}>Reflection: Which areas need attention?</label>
              <textarea className={jStyles.textarea} placeholder="What small actions could nurture your impoverished areas?"
                value={(sectionData['life-pie-reflection'] as string) || ''}
                onChange={e => setSectionData(p => ({ ...p, 'life-pie-reflection': e.target.value }))} rows={3} disabled={disabled} />
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  if (isLoading || sectionsLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingDot} />
        <div className={styles.loadingDot} />
        <div className={styles.loadingDot} />
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className={styles.lockedMessage}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>This week hasn&apos;t started yet</span>
      </div>
    );
  }

  return (
    <div
      className={styles.container}
      data-week-number={weekNumber}
      style={{ '--week-color': weekColor } as React.CSSProperties}
      onKeyDown={(e) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') play('click');
      }}
    >
      {journalSections.map((section, idx) => {
        const isOpen = activeSectionId === section.id;
        const isDone = completedSections.has(section.id);
        const artVariant = getTaskArtVariant(section);
        const taskAccent = TASK_ACCENTS[idx % TASK_ACCENTS.length];
        const expandedContent = (
          <div className={styles.taskCardContent}>
            <p className={styles.taskInstructions}>{section.instructions}</p>
            <div
              className={styles.taskEditor}
              onFocus={(e) => {
                // Selects have their own onPointerDown sound; skip to avoid double-play.
                if ((e.target as HTMLElement).tagName !== 'SELECT') play('hover');
              }}
            >
              {renderSectionContent(section)}
            </div>
            {!isSealed && (
              <button
                type="button"
                className={`${styles.markDoneBtn} ${isDone ? styles.markDoneBtnActive : ''}`}
                onClick={() => markComplete(section.id)}
                onMouseEnter={() => play('hover')}
                disabled={isDone}
              >
                {isDone ? (
                  'Completed'
                ) : (
                  <>
                    Complete task
                    <span className={styles.markDoneCredits}>
                      <Image src="/icons/ui-diamond.svg" alt="" width={12} height={12} />
                      +50 diamonds
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        );
        const desktopDetail = (
          <div
            className={`${styles.taskCard} ${styles.taskPanelCard} ${isDone ? styles.taskCardDone : ''}`}
            style={{ '--task-accent': taskAccent } as React.CSSProperties}
          >
            <div className={styles.taskPanelHeader}>
              <span className={styles.taskAccent} aria-hidden="true" />
              <div className={`${styles.taskArtwork} ${styles[`taskArtwork${artVariant[0].toUpperCase()}${artVariant.slice(1)}` as keyof typeof styles]}`} aria-hidden="true">
                <div className={styles.taskArtworkGlow} />
                <div className={styles.taskArtworkLine} />
              </div>
              <span className={styles.taskTitle}>{section.title}</span>
              <button
                type="button"
                className={styles.taskPanelClose}
                onClick={() => onSectionSelect?.(null)}
                aria-label={`Close ${section.title}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            {expandedContent}
          </div>
        );
        return (
          <div
            key={section.id}
            data-tour={idx === 0 ? 'course-mission' : undefined}
            className={`${styles.taskCard} ${isOpen ? styles.taskCardActive : ''} ${isDone ? styles.taskCardDone : ''} ${isSealed ? styles.taskCardSealed : ''}`}
            style={{ '--task-accent': taskAccent } as React.CSSProperties}
          >
            <button
              type="button"
              className={styles.taskCardHeader}
              onClick={() => {
                if (isSealed) return;
                toggleExpand(section.id);
              }}
              onMouseEnter={() => play('hover')}
            >
              <span className={styles.taskAccent} aria-hidden="true" />
              <div className={`${styles.taskArtwork} ${styles[`taskArtwork${artVariant[0].toUpperCase()}${artVariant.slice(1)}` as keyof typeof styles]}`} aria-hidden="true">
                <div className={styles.taskArtworkGlow} />
                <div className={styles.taskArtworkLine} />
              </div>
              <div className={styles.taskInfo}>
                <span className={styles.taskTitle}>{section.title}</span>
              </div>
              <div className={styles.taskRight}>
                {isDone ? (
                  <div className={styles.taskCheckDone}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : (
                  <div className={styles.taskCheckEmpty} />
                )}
                <svg
                  className={`${styles.expandArrow} ${renderDetailInPanel ? styles.expandArrowPanel : (isOpen ? styles.expandArrowOpen : '')}`}
                  width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>

            {isOpen && (
              renderDetailInPanel
                ? (detailPortalTarget ? createPortal(desktopDetail, detailPortalTarget) : null)
                : expandedContent
            )}
          </div>
        );
      })}

      {/* Seal Button */}
      {!isSealed && (
        <div className={styles.sealSection}>
          <div className={styles.progressInfo}>
            <span className={styles.progressText}>{completedCount} / {totalSections} tasks completed</span>
          </div>
          <button
            type="button"
            className={`${styles.sealBtn} ${canSeal ? styles.sealBtnReady : ''}`}
            disabled={!canSeal}
            onClick={() => { play('click'); setSealError(null); setShowSealModal(true); }}
            onMouseEnter={() => play('hover')}
          >
            Seal the week
          </button>
          {!canSeal && (
            <span className={styles.sealHint}>Complete all {totalSections} tasks to seal</span>
          )}
        </div>
      )}

      {isSealed && (
        <div className={styles.sealedBanner}>
          <Image src="/uploads/BlueSeal.svg" alt="" width={20} height={20} />
          <span>Week {weekNumber} sealed</span>
          {sealTxHash && (
            <span className={styles.sealedHash}>{sealTxHash.slice(0, 10)}...</span>
          )}
        </div>
      )}

      {/* Mission Completion Modal */}
      {showSealModal && (
        <div className={styles.missionModalOverlay} onClick={() => { if (sealStep === 'confirm') { play('toggle-off'); setShowSealModal(false); } }}>
          <div className={styles.missionModal} onClick={e => e.stopPropagation()}>
            {sealStep === 'confirm' && (
              <>
                <div className={styles.missionModalHeader}>
                  <span className={styles.missionModalKanji}>任務記録</span>
                  <span className={styles.missionModalTitle}>Mission log</span>
                </div>
                <div className={styles.missionModalBody}>
                  <p className={styles.missionModalText}>
                    Are you really sure you&apos;re ready to wrap up this mission? After completion, there&apos;s no turning back...
                  </p>
                  {sealError && (
                    <p className={styles.missionModalError}>{sealError}</p>
                  )}
                </div>
                <div className={styles.missionModalFooter}>
                  <button className={styles.missionModalBack}
                    onClick={() => { play('toggle-off'); setShowSealModal(false); setSealError(null); }}
                    onMouseEnter={() => play('hover')}>Go back</button>
                  <button className={styles.missionModalConfirm}
                    onClick={() => { play('celebration'); handleSealWeek(); }}
                    onMouseEnter={() => play('hover')}>Completed</button>
                </div>
              </>
            )}
            {sealStep === 'sealing' && (
              <div className={styles.missionModalProgress}>
                <div className={styles.missionSpinner} />
                <span>Sealing week...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task completion confirm — completion is permanent */}
      {pendingTaskId && (
        <div className={styles.missionModalOverlay} onClick={() => { play('toggle-off'); setPendingTaskId(null); }}>
          <div className={styles.missionModal} onClick={e => e.stopPropagation()}>
            <div className={styles.missionModalHeader}>
              <span className={styles.missionModalKanji}>任務記録</span>
              <span className={styles.missionModalTitle}>Mission log</span>
            </div>
            <div className={styles.missionModalBody}>
              <p className={styles.missionModalText}>
                Completing a task is permanent — it can&apos;t be unchecked later. Ready to finish it and receive your 50 diamonds?
              </p>
            </div>
            <div className={styles.missionModalFooter}>
              <button className={styles.missionModalBack}
                onClick={() => { play('toggle-off'); setPendingTaskId(null); }}
                onMouseEnter={() => play('hover')}>Go back</button>
              <button className={styles.missionModalConfirm}
                onClick={confirmComplete}
                onMouseEnter={() => play('hover')}>Complete task</button>
            </div>
          </div>
        </div>
      )}

      {/* Per-mission +50 credit pop-up */}
      {showMissionReward && (
        <DiamondReward
          key={missionRewardKey}
          amount={50}
          onComplete={() => setShowMissionReward(false)}
        />
      )}

      {/* Reward celebration — shared with Field Notes */}
      {showRewardAnimation && (
        <>
          <ConfettiCelebration trigger={true} />
          <DiamondReward
            amount={shardsAwarded}
            onComplete={() => setShowRewardAnimation(false)}
          />
        </>
      )}
    </div>
  );
}

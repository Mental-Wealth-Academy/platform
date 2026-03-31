'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './WeekTasksView.module.css';
import jStyles from '@/components/accordion-journal/AccordionJournalCard.module.css';
import { weekSectionsMap } from '@/components/accordion-journal/weekSections';
import { week1Sections, week2Sections } from '@/components/accordion-journal/AccordionJournalCard';
import type { JournalSection } from '@/components/accordion-journal/AccordionJournalCard';
import { useSound } from '@/hooks/useSound';

const WEEK_COLORS: Record<number, string> = {
  0: '#FF6B6B', 1: '#FF6B6B', 2: '#FF8E53', 3: '#FFB347',
  4: '#FFD93D', 5: '#6BCB77', 6: '#4ECDC4', 7: '#45B7D1',
  8: '#5168FF', 9: '#7C3AED', 10: '#A855F7', 11: '#D946EF',
  12: '#EC4899', 13: '#EC4899',
};

interface BlurtEntry { id: string; blurt: string; affirmation: string; }

interface WeekTasksViewProps {
  weekNumber: number;
  enablePersistence?: boolean;
  isLocked?: boolean;
  initialIsSealed?: boolean;
  initialSealTxHash?: string | null;
  onSealComplete?: (weekNumber: number, txHash: string) => void;
}

export default function WeekTasksView({
  weekNumber,
  enablePersistence = false,
  isLocked = false,
  initialIsSealed,
  initialSealTxHash,
  onSealComplete,
}: WeekTasksViewProps) {
  const journalSections: JournalSection[] =
    weekSectionsMap[weekNumber] || (weekNumber === 2 ? week2Sections : week1Sections);
  const weekColor = WEEK_COLORS[weekNumber] || '#5168FF';

  const { play } = useSound();
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
  const [sealStep, setSealStep] = useState<'confirm' | 'verifying' | 'signing' | 'complete'>('confirm');
  const [showSealModal, setShowSealModal] = useState(false);
  const [sealTxHash, setSealTxHash] = useState<string | null>(initialSealTxHash ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (initialIsSealed !== undefined) setIsSealed(initialIsSealed);
    if (initialSealTxHash !== undefined) setSealTxHash(initialSealTxHash ?? null);
  }, [initialIsSealed, initialSealTxHash]);

  const collectProgressData = useCallback(() => ({
    sectionData,
    blurtEntries,
    checklistStates,
    enjoyListEntries,
    timeMapActivities,
    lifePieValues,
    completedSections: Array.from(completedSections),
  }), [sectionData, blurtEntries, checklistStates, enjoyListEntries, timeMapActivities, lifePieValues, completedSections]);

  // Load progress
  useEffect(() => {
    if (hasLoadedRef.current || !enablePersistence) { setIsLoading(false); return; }
    hasLoadedRef.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/ethereal-progress?week=${weekNumber}`, { credentials: 'include' });
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
  }, [weekNumber, enablePersistence]);

  // Auto-save
  useEffect(() => {
    if (!hasLoadedRef.current || isSealed || !enablePersistence) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/ethereal-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ weekNumber, progressData: collectProgressData() }),
        });
      } catch { /* silent */ }
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [sectionData, blurtEntries, checklistStates, enjoyListEntries, timeMapActivities, lifePieValues, completedSections, weekNumber, isSealed, enablePersistence, collectProgressData]);

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
  const canSeal = completedCount >= Math.ceil(totalSections / 2) && !isSealed;

  const toggleExpand = (id: string) => {
    play(expandedSection === id ? 'toggle-off' : 'toggle-on');
    setExpandedSection(prev => prev === id ? null : id);
  };

  const markComplete = (id: string) => {
    play('click');
    setCompletedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
  };

  const generateContentHash = async (): Promise<string> => {
    const data = new TextEncoder().encode(JSON.stringify({
      weekNumber, sectionData, blurtEntries: blurtEntries.filter(e => e.blurt || e.affirmation),
      checklistStates, enjoyListEntries: enjoyListEntries.filter(e => e.activity),
      timeMapActivities: timeMapActivities.filter(a => a.activity), lifePieValues,
      completedSections: Array.from(completedSections), timestamp: Date.now(),
    }));
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSealWeek = async () => {
    if (!canSeal || isSealing) return;
    setIsSealing(true);
    setSealStep('verifying');
    try {
      await generateContentHash();
      await new Promise(r => setTimeout(r, 800));
      setSealStep('signing');
      const res = await fetch('/api/ethereal-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ weekNumber, progressData: collectProgressData(), seal: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seal failed');
      setSealTxHash(data.txHash);
      setSealStep('complete');
      setIsSealed(true);
      if (onSealComplete && data.txHash) onSealComplete(weekNumber, data.txHash);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([50, 30, 50, 30, 100]);
    } catch (err) {
      console.error('Seal failed:', err);
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
            <button type="button" className={jStyles.addBlurtButton} onClick={addBlurtEntry} disabled={disabled}>
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
                  onChange={() => handleChecklistToggle(section.id, idx)} className={jStyles.checkbox} disabled={disabled} />
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
                    onChange={e => handleTimeMapChange(idx, 'wantOrShould', e.target.value)} disabled={disabled}>
                    <option value="">Select</option><option value="want">Want to</option><option value="should">Should</option>
                  </select>
                  <select className={jStyles.select} value={a.forWhom}
                    onChange={e => handleTimeMapChange(idx, 'forWhom', e.target.value)} disabled={disabled}>
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
            <div className={jStyles.affirmationReminder}><p>Write each affirmation 5 times daily in your morning pages</p></div>
          </div>
        );
      case 'life-pie': {
        const areas = [
          { key: 'spirituality', label: 'Spirituality' }, { key: 'exercise', label: 'Exercise' },
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

  if (isLoading) {
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
    <div className={styles.container} style={{ '--week-color': weekColor } as React.CSSProperties}>
{journalSections.map(section => {
        const isOpen = expandedSection === section.id;
        const isDone = completedSections.has(section.id);
        return (
          <div key={section.id} className={`${styles.taskCard} ${isDone ? styles.taskCardDone : ''} ${isSealed ? styles.taskCardSealed : ''}`}>
            <button
              type="button"
              className={styles.taskCardHeader}
              onClick={() => { if (!isSealed) toggleExpand(section.id); }}
              onMouseEnter={() => play('hover')}
            >
              <div className={styles.taskIcon}>{section.icon}</div>
              <div className={styles.taskInfo}>
                <span className={styles.taskTitle}>{section.title}</span>
                {!isOpen && (
                  <span className={styles.taskPreview}>
                    {section.instructions.slice(0, 60)}...
                  </span>
                )}
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
                  className={`${styles.expandArrow} ${isOpen ? styles.expandArrowOpen : ''}`}
                  width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className={styles.taskCardContent}>
                <p className={styles.taskInstructions}>{section.instructions}</p>
                <div className={styles.taskEditor}>
                  {renderSectionContent(section)}
                </div>
                {!isSealed && (
                  <button
                    type="button"
                    className={`${styles.markDoneBtn} ${isDone ? styles.markDoneBtnActive : ''}`}
                    onClick={() => markComplete(section.id)}
                    onMouseEnter={() => play('hover')}
                  >
                    {isDone ? 'Completed' : 'Mark Complete'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Seal Button */}
      {!isSealed && (
        <div className={styles.sealSection}>
          <div className={styles.progressInfo}>
            <span className={styles.progressText}>{completedCount} / {totalSections} tasks completed</span>
            <div className={styles.progressBar}>
              <div className={styles.progressBarFill} style={{ width: `${(completedCount / totalSections) * 100}%` }} />
            </div>
          </div>
          <button
            type="button"
            className={`${styles.sealBtn} ${canSeal ? styles.sealBtnReady : ''}`}
            disabled={!canSeal}
            onClick={() => { play('click'); setShowSealModal(true); }}
            onMouseEnter={() => play('hover')}
          >
            <Image src="/icons/seal.svg" alt="" width={18} height={18} />
            Seal Week {weekNumber}
          </button>
          {!canSeal && (
            <span className={styles.sealHint}>Complete at least {Math.ceil(totalSections / 2)} tasks to seal</span>
          )}
        </div>
      )}

      {isSealed && (
        <div className={styles.sealedBanner}>
          <Image src="/icons/seal.svg" alt="" width={20} height={20} />
          <span>Week {weekNumber} sealed</span>
          {sealTxHash && (
            <span className={styles.sealedHash}>{sealTxHash.slice(0, 10)}...</span>
          )}
        </div>
      )}

      {/* Seal Confirmation Modal */}
      {showSealModal && (
        <div className={styles.sealModalOverlay} onClick={() => { if (sealStep === 'confirm') setShowSealModal(false); }}>
          <div className={styles.sealModal} onClick={e => e.stopPropagation()}>
            {sealStep === 'confirm' && (
              <>
                <h3 className={styles.sealModalTitle}>Seal Week {weekNumber}?</h3>
                <p className={styles.sealModalText}>
                  This will finalize your work and award 700 shards. You won&apos;t be able to edit after sealing.
                </p>
                <div className={styles.sealModalButtons}>
                  <button className={styles.sealModalCancel} onClick={() => setShowSealModal(false)}>Cancel</button>
                  <button className={styles.sealModalConfirm} onClick={handleSealWeek}>Seal</button>
                </div>
              </>
            )}
            {sealStep === 'verifying' && (
              <div className={styles.sealModalProgress}>
                <div className={styles.sealSpinner} />
                <span>Verifying content...</span>
              </div>
            )}
            {sealStep === 'signing' && (
              <div className={styles.sealModalProgress}>
                <div className={styles.sealSpinner} />
                <span>Signing attestation...</span>
              </div>
            )}
            {sealStep === 'complete' && (
              <div className={styles.sealModalComplete}>
                <Image src="/icons/seal.svg" alt="" width={40} height={40} />
                <h3>Week {weekNumber} Sealed</h3>
                <p>+700 shards awarded</p>
                <button className={styles.sealModalConfirm} onClick={() => { setShowSealModal(false); setSealStep('confirm'); }}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

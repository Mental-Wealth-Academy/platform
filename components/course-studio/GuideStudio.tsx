'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Trash, Eye, PencilSimple, X, Plus } from '@phosphor-icons/react';
import CtaButton from '@/components/shared/CtaButton';
import ComponentPalette from './ComponentPalette';
import ComponentConfigEditor from './ComponentConfigEditor';
import GuideBody from '@/components/guides/GuideBody';
import type {
  GuideRecord,
  GuideBodyComponent,
  GuideLink,
  ForwardRef,
  GuideSubjectDefinition,
} from '@/lib/guides-db';
import type { ComponentType } from '@/lib/vip-course-db';
import { EDUCATION_LEVELS, GUIDE_GOALS, type EducationLevel, type GuideGoal } from '@/lib/guide-discovery-filters';
import styles from './GuideStudio.module.css';

interface GuideStudioProps {
  /** Slug of an existing draft to edit; omit to create a new guide. */
  slug?: string;
  authHeaders: () => Promise<HeadersInit>;
  onExit: () => void;
  /** Called with the new slug once a fresh guide is created (so the route can update). */
  onCreated?: (slug: string) => void;
}

const COMPONENT_LABELS: Record<string, string> = {
  rich_text: 'Rich text',
  text_input: 'Text input',
  multiple_choice: 'Multiple choice',
  rating_scale: 'Rating scale',
  media_embed: 'Media',
  image_embed: 'Image',
  video_embed: 'Video',
  reflection_journal: 'Field notes',
  file_upload: 'File upload',
  quiz_block: 'Quiz',
  nft_gate: 'NFT gate',
};

function tempId() {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveSlug(val: string) {
  return val
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

export default function GuideStudio({ slug, authHeaders, onExit, onCreated }: GuideStudioProps) {
  const [loading, setLoading] = useState(!!slug);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const [guideId, setGuideId] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | undefined>(slug);
  const [status, setStatus] = useState<GuideRecord['status']>('draft');
  const [topicTitle, setTopicTitle] = useState('');
  const [topicAliases, setTopicAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState('');
  const [summary, setSummary] = useState('');
  const [intendedAudience, setIntendedAudience] = useState('');
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [goals, setGoals] = useState<GuideGoal[]>([]);
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [sourceProvenance, setSourceProvenance] = useState('');
  const [sourceReviewedAt, setSourceReviewedAt] = useState('');
  const [subjectCatalog, setSubjectCatalog] = useState<GuideSubjectDefinition[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [legacySubjects, setLegacySubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState('');
  const [evidenceCriteria, setEvidenceCriteria] = useState<string[]>([]);
  const [body, setBody] = useState<GuideBodyComponent[]>([]);
  const [dirty, setDirty] = useState(false);

  const [dagLevel, setDagLevel] = useState<number>(0);
  const [dependents, setDependents] = useState<GuideLink[]>([]);
  const [prereqs, setPrereqs] = useState<GuideLink[]>([]);
  const [prereqQuery, setPrereqQuery] = useState('');
  const [prereqCandidates, setPrereqCandidates] = useState<GuideLink[]>([]);
  const [prereqError, setPrereqError] = useState<string | null>(null);
  const [forwardRefs, setForwardRefs] = useState<ForwardRef[]>([]);
  const [forwardRefInput, setForwardRefInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ memberCount: number } | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  // ── Load existing draft ────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(`/api/guides/${slug}`, { cache: 'no-store', headers });
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        const guide: GuideRecord = data.guide;
        setGuideId(guide.id);
        setStatus(guide.status);
        setTopicTitle(guide.topicTitle);
        setTopicAliases(guide.topicAliases ?? []);
        setSummary(guide.summary ?? '');
        setIntendedAudience(guide.intendedAudience ?? '');
        setEducationLevels(guide.educationLevels ?? []);
        setGoals(guide.goals ?? []);
        setEstimatedMinutes(
          guide.estimatedMinutes === null || guide.estimatedMinutes === undefined
            ? ''
            : String(guide.estimatedMinutes),
        );
        setSourceProvenance(guide.sourceProvenance ?? '');
        setSourceReviewedAt(guide.sourceReviewedAt?.slice(0, 10) ?? '');
        setSubjectIds(guide.subjectIds ?? []);
        setLegacySubjects(guide.subjects ?? []);
        setEvidenceCriteria(Array.isArray(guide.evidenceCriteria) ? guide.evidenceCriteria : []);
        setBody(Array.isArray(guide.body) ? guide.body : []);
        setDagLevel(typeof data.level === 'number' ? data.level : 0);
        setPrereqs(Array.isArray(data.prereqs) ? data.prereqs : []);
        setDependents(Array.isArray(data.dependents) ? data.dependents : []);
        setDirty(false);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, authHeaders]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/guides/subjects', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setSubjectCatalog(Array.isArray(data.subjects) ? data.subjects : []);
      } catch {
        /* The author can keep editing while the catalog request is unavailable. */
      }
    })();
  }, []);

  useEffect(() => {
    if (subjectCatalog.length === 0 || subjectIds.length > 0 || legacySubjects.length === 0) {
      return;
    }
    const legacyKeys = new Set(legacySubjects.map((subject) => subject.trim().toLowerCase()));
    const matched = subjectCatalog
      .filter((subject) => {
        const names = [subject.label, ...subject.aliases].map((name) => name.toLowerCase());
        return names.some((name) => legacyKeys.has(name));
      })
      .map((subject) => subject.id);
    if (matched.length > 0) setSubjectIds(matched);
  }, [legacySubjects, subjectCatalog, subjectIds.length]);

  useEffect(() => {
    if (!slug && titleRef.current) titleRef.current.focus();
  }, [slug]);

  // ── Prereq candidate search (only meaningful once the guide exists) ─────────
  const refreshPrereqs = useCallback(async () => {
    if (!currentSlug || status !== 'draft') return;
    try {
      const headers = await authHeaders();
      const [prereqRes, detailRes] = await Promise.all([
        fetch(
          `/api/guides/${currentSlug}/prereqs?q=${encodeURIComponent(prereqQuery)}`,
          { cache: 'no-store', headers },
        ),
        fetch(`/api/guides/${currentSlug}`, { cache: 'no-store', headers }),
      ]);
      if (prereqRes.ok) {
        const data = await prereqRes.json();
        setPrereqs(data.prereqs ?? []);
        setPrereqCandidates(data.candidates ?? []);
        setForwardRefs(data.forwardRefs ?? []);
      }
      if (detailRes.ok) {
        const detail = await detailRes.json();
        if (typeof detail.level === 'number') setDagLevel(detail.level);
        if (Array.isArray(detail.dependents)) setDependents(detail.dependents);
      }
    } catch {
      /* ignore */
    }
  }, [currentSlug, status, prereqQuery, authHeaders]);

  useEffect(() => {
    if (!currentSlug || status !== 'draft') return;
    const t = setTimeout(refreshPrereqs, 250);
    return () => clearTimeout(t);
  }, [currentSlug, status, prereqQuery, refreshPrereqs]);

  // ── Body editing ────────────────────────────────────────────────────────────
  const addComponent = (type: ComponentType, config?: Record<string, unknown>) => {
    setBody((prev) => [
      ...prev,
      { id: tempId(), componentType: type, title: '', config: config ?? {} },
    ]);
    setDirty(true);
  };

  const updateComponent = (id: string, updates: Partial<GuideBodyComponent>) => {
    setBody((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    setDirty(true);
  };

  const moveComponent = (id: string, dir: -1 | 1) => {
    setBody((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      const next = idx + dir;
      if (idx === -1 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
    setDirty(true);
  };

  const removeComponent = (id: string) => {
    setBody((prev) => prev.filter((c) => c.id !== id));
    setDirty(true);
  };

  // ── Canonical metadata ───────────────────────────────────────────────────────
  const addSubject = () => {
    if (!subjectInput) return;
    if (!subjectIds.includes(subjectInput)) {
      setSubjectIds((prev) => [...prev, subjectInput]);
      setDirty(true);
    }
    setSubjectInput('');
  };

  const removeSubject = (subjectId: string) => {
    setSubjectIds((prev) => prev.filter((id) => id !== subjectId));
    setDirty(true);
  };

  const addAlias = () => {
    const alias = aliasInput.trim().replace(/\s+/g, ' ');
    if (!alias || alias.toLowerCase() === topicTitle.trim().toLowerCase()) return;
    if (!topicAliases.some((item) => item.toLowerCase() === alias.toLowerCase())) {
      setTopicAliases((prev) => [...prev, alias].slice(0, 12));
      setDirty(true);
    }
    setAliasInput('');
  };

  const removeAlias = (alias: string) => {
    setTopicAliases((prev) => prev.filter((item) => item !== alias));
    setDirty(true);
  };

  // ── Evidence criteria (2–5 observable statements) ────────────────────────────
  const addCriterion = () => {
    setEvidenceCriteria((prev) => (prev.length >= 5 ? prev : [...prev, '']));
    setDirty(true);
  };

  const updateCriterion = (index: number, value: string) => {
    setEvidenceCriteria((prev) => prev.map((c, i) => (i === index ? value : c)));
    setDirty(true);
  };

  const removeCriterion = (index: number) => {
    setEvidenceCriteria((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  // ── Save (create or update draft) ────────────────────────────────────────────
  const save = useCallback(async (): Promise<string | null> => {
    if (!topicTitle.trim()) {
      setError('Give the guide a topic title first.');
      return null;
    }
    setError(null);
    setSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };

      if (!currentSlug) {
        // Create the draft, then persist body + subjects via PATCH.
        const createRes = await fetch('/api/guides', {
          method: 'POST',
          headers,
          body: JSON.stringify({ topicTitle: topicTitle.trim() }),
        });
        const createData = await createRes.json().catch(() => ({}));
        if (!createRes.ok) throw new Error(createData.error ?? 'Failed to create guide.');
        const guide: GuideRecord = createData.guide;
        setGuideId(guide.id);
        setCurrentSlug(guide.slug);
        setStatus(guide.status);

        const patchRes = await fetch(`/api/guides/${guide.slug}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            body,
            topicAliases,
            summary,
            intendedAudience,
            educationLevels,
            goals,
            estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
            sourceProvenance,
            sourceReviewedAt: sourceReviewedAt || null,
            subjectIds,
            evidenceCriteria,
          }),
        });
        const patchData = await patchRes.json().catch(() => ({}));
        if (!patchRes.ok) throw new Error(patchData.error ?? 'Failed to save guide content.');

        setDirty(false);
        onCreated?.(guide.slug);
        return guide.slug;
      }

      // Update existing draft.
      const res = await fetch(`/api/guides/${currentSlug}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          topicTitle: topicTitle.trim(),
          topicAliases,
          summary,
          intendedAudience,
          educationLevels,
          goals,
          estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
          sourceProvenance,
          sourceReviewedAt: sourceReviewedAt || null,
          body,
          subjectIds,
          evidenceCriteria,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed to save guide.');
      setDirty(false);
      return currentSlug;
    } catch (err: any) {
      setError(err.message ?? 'Save failed.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [
    topicTitle,
    currentSlug,
    topicAliases,
    summary,
    intendedAudience,
    educationLevels,
    goals,
    estimatedMinutes,
    sourceProvenance,
    sourceReviewedAt,
    body,
    subjectIds,
    evidenceCriteria,
    authHeaders,
    onCreated,
  ]);

  // ── Prereqs ──────────────────────────────────────────────────────────────────
  const addPrereq = async (prereqId: string) => {
    if (!currentSlug) return;
    setPrereqError(null);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const res = await fetch(`/api/guides/${currentSlug}/prereqs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prereqId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPrereqError(data.error ?? 'Could not add prerequisite.');
        return;
      }
      setPrereqs(data.prereqs ?? []);
      setPrereqCandidates((prev) => prev.filter((c) => c.id !== prereqId));
    } catch {
      setPrereqError('Could not add prerequisite.');
    }
  };

  const removePrereq = async (prereqId: string) => {
    if (!currentSlug) return;
    setPrereqError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `/api/guides/${currentSlug}/prereqs?prereqId=${encodeURIComponent(prereqId)}`,
        { method: 'DELETE', headers },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPrereqError(data.error ?? 'Could not remove prerequisite.');
        return;
      }
      setPrereqs(data.prereqs ?? []);
      refreshPrereqs();
    } catch {
      setPrereqError('Could not remove prerequisite.');
    }
  };

  // ── Forward refs ──────────────────────────────────────────────────────────────
  const addForwardRef = async () => {
    if (!currentSlug || !forwardRefInput.trim()) return;
    setPrereqError(null);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const res = await fetch(`/api/guides/${currentSlug}/prereqs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ forwardRef: true, topicTitle: forwardRefInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPrereqError(data.error ?? 'Could not add forward reference.');
        return;
      }
      setForwardRefs(data.forwardRefs ?? []);
      setForwardRefInput('');
    } catch {
      setPrereqError('Could not add forward reference.');
    }
  };

  const removeForwardRef = async (refId: string) => {
    if (!currentSlug) return;
    setPrereqError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `/api/guides/${currentSlug}/prereqs?forwardRefId=${encodeURIComponent(refId)}`,
        { method: 'DELETE', headers },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPrereqError(data.error ?? 'Could not remove forward reference.');
        return;
      }
      setForwardRefs(data.forwardRefs ?? []);
    } catch {
      setPrereqError('Could not remove forward reference.');
    }
  };

  // ── Submit for verification ──────────────────────────────────────────────────
  const submitForVerification = async () => {
    // Persist any pending edits first.
    if (dirty || !currentSlug) {
      const savedSlug = await save();
      if (!savedSlug) return;
    }
    if (!guideId) {
      setError('Save the guide before submitting.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const res = await fetch('/api/guides/verification/submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({ guideId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Submission failed.');
      setStatus('pending_verification');
      setSubmitResult({ memberCount: data.memberCount ?? 0 });
    } catch (err: any) {
      setError(err.message ?? 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel =
    status === 'published'
      ? 'Published'
      : status === 'pending_verification'
        ? 'In review'
        : 'Draft';
  const statusClass =
    status === 'published'
      ? styles.statusPublished
      : status === 'pending_verification'
        ? styles.statusPending
        : styles.statusDraft;

  const previewSlug = currentSlug ?? deriveSlug(topicTitle);
  const isDraft = status === 'draft';

  return (
    <div className={styles.layout}>
      <div className={styles.body}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button type="button" className={styles.backBtn} onClick={onExit}>
              <ArrowLeft size={15} weight="bold" /> Knowledge Base
            </button>
            <span className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</span>
            <span className={styles.slugRow}>/home/guides/{previewSlug || '…'}</span>
          </div>
          <div className={styles.headerActions}>
            {error && <span className={styles.errorText}>{error}</span>}
            {dirty && <span className={styles.dirtyLabel}>Unsaved changes</span>}
            <CtaButton
              variant="secondary"
              size="sm"
              onClick={() => setPreviewMode((p) => !p)}
            >
              {previewMode ? (
                <><PencilSimple size={14} weight="bold" /> Edit</>
              ) : (
                <><Eye size={14} weight="bold" /> Preview</>
              )}
            </CtaButton>
            {isDraft && (
              <CtaButton size="sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : currentSlug ? 'Save draft' : 'Create draft'}
              </CtaButton>
            )}
          </div>
        </header>

        {loading && <div className={styles.state}>Loading guide…</div>}
        {notFound && !loading && (
          <div className={styles.state}>
            Guide not found, or it is not yours to edit.
          </div>
        )}

        {!loading && !notFound && (
          <div className={styles.content}>
            {previewMode ? (
              <>
                <h1 style={{ margin: 0 }}>{topicTitle || 'Untitled guide'}</h1>
                {summary && <p className={styles.previewSummary}>{summary}</p>}
                <GuideBody body={body} />
              </>
            ) : (
              <>
                {/* Topic title */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="guide-topic">Topic title</label>
                  <input
                    id="guide-topic"
                    ref={titleRef}
                    className={styles.titleInput}
                    value={topicTitle}
                    onChange={(e) => {
                      setTopicTitle(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="e.g. Understanding compound interest"
                    disabled={!isDraft}
                  />
                  <span className={styles.fieldHint}>
                    One definitive guide per topic. The URL slug is derived from the title when the draft is created and stays fixed after that.
                  </span>
                </div>

                {/* Topic metadata */}
                <div>
                  <h2 className={styles.sectionHeading}>Topic record</h2>
                  <p className={styles.sectionSub}>
                    Give learners a clear preview and help contributors find the canonical topic.
                  </p>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="guide-summary">Summary</label>
                  <textarea
                    id="guide-summary"
                    className={styles.textArea}
                    value={summary}
                    onChange={(event) => {
                      setSummary(event.target.value);
                      setDirty(true);
                    }}
                    placeholder="Explain what the learner will understand or practice."
                    maxLength={280}
                    rows={3}
                    disabled={!isDraft}
                  />
                  <span className={styles.fieldCounter}>{summary.length}/280</span>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Topic aliases</label>
                  <span className={styles.fieldHint}>
                    Add common names and search terms for this topic.
                  </span>
                  {topicAliases.length > 0 && (
                    <div className={styles.chips}>
                      {topicAliases.map((alias) => (
                        <span key={alias} className={styles.chip}>
                          {alias}
                          {isDraft && (
                            <button
                              type="button"
                              className={styles.chipRemove}
                              onClick={() => removeAlias(alias)}
                              aria-label={`Remove ${alias}`}
                            >
                              <X size={12} weight="bold" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {isDraft && topicAliases.length < 12 && (
                    <div className={styles.subjectAddRow}>
                      <input
                        className={styles.textInput}
                        value={aliasInput}
                        onChange={(event) => setAliasInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addAlias();
                          }
                        }}
                        placeholder="Add an alias"
                      />
                      <CtaButton variant="secondary" size="sm" onClick={addAlias}>
                        <Plus size={14} weight="bold" /> Add
                      </CtaButton>
                    </div>
                  )}
                </div>

                <div className={styles.metadataGrid}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="guide-audience">
                      Intended audience
                    </label>
                    <input
                      id="guide-audience"
                      className={styles.textInput}
                      value={intendedAudience}
                      onChange={(event) => {
                        setIntendedAudience(event.target.value);
                        setDirty(true);
                      }}
                      placeholder="Who benefits from this guide?"
                      maxLength={280}
                      disabled={!isDraft}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="guide-minutes">
                      Estimated minutes
                    </label>
                    <input
                      id="guide-minutes"
                      className={styles.textInput}
                      type="number"
                      min={1}
                      max={600}
                      step={1}
                      value={estimatedMinutes}
                      onChange={(event) => {
                        setEstimatedMinutes(event.target.value);
                        setDirty(true);
                      }}
                      placeholder="15"
                      disabled={!isDraft}
                    />
                  </div>
                </div>

                <div className={styles.metadataGrid}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Education levels</span>
                    <div className={styles.discoveryTags}>
                      {EDUCATION_LEVELS.map((level) => {
                        const selected = educationLevels.includes(level);
                        return (
                          <button
                            key={level}
                            type="button"
                            className={`${styles.discoveryTag} ${selected ? styles.discoveryTagSelected : ''}`}
                            aria-pressed={selected}
                            disabled={!isDraft}
                            onClick={() => {
                              setEducationLevels((current) => selected ? current.filter((item) => item !== level) : [...current, level]);
                              setDirty(true);
                            }}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Goals</span>
                    <div className={styles.discoveryTags}>
                      {GUIDE_GOALS.map((goal) => {
                        const selected = goals.includes(goal);
                        return (
                          <button
                            key={goal}
                            type="button"
                            className={`${styles.discoveryTag} ${selected ? styles.discoveryTagSelected : ''}`}
                            aria-pressed={selected}
                            disabled={!isDraft}
                            onClick={() => {
                              setGoals((current) => selected ? current.filter((item) => item !== goal) : [...current, goal]);
                              setDirty(true);
                            }}
                          >
                            {goal}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Subjects */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Subjects</label>
                  <span className={styles.fieldHint}>
                    Choose the academic areas used across the knowledge map.
                  </span>
                  {subjectIds.length > 0 && (
                    <div className={styles.chips}>
                      {subjectIds.map((subjectId) => {
                        const subject = subjectCatalog.find((item) => item.id === subjectId);
                        return (
                        <span key={subjectId} className={styles.chip}>
                          {subject?.label ?? subjectId}
                          {isDraft && (
                            <button
                              type="button"
                              className={styles.chipRemove}
                              onClick={() => removeSubject(subjectId)}
                              aria-label={`Remove ${subject?.label ?? subjectId}`}
                            >
                              <X size={12} weight="bold" />
                            </button>
                          )}
                        </span>
                        );
                      })}
                    </div>
                  )}
                  {isDraft && (
                    <div className={styles.subjectAddRow}>
                      <select
                        className={styles.selectInput}
                        value={subjectInput}
                        onChange={(event) => setSubjectInput(event.target.value)}
                        aria-label="Choose a subject"
                      >
                        <option value="">Choose a subject</option>
                        {subjectCatalog
                          .filter((subject) => !subjectIds.includes(subject.id))
                          .map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.label}
                            </option>
                          ))}
                      </select>
                      <CtaButton variant="secondary" size="sm" onClick={addSubject}>
                        <Plus size={14} weight="bold" /> Add
                      </CtaButton>
                    </div>
                  )}
                </div>

                <div className={styles.metadataGrid}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="guide-provenance">
                      Source provenance
                    </label>
                    <textarea
                      id="guide-provenance"
                      className={styles.textArea}
                      value={sourceProvenance}
                      onChange={(event) => {
                        setSourceProvenance(event.target.value);
                        setDirty(true);
                      }}
                      placeholder="Name the research, publication, or lived-experience source."
                      maxLength={4000}
                      rows={4}
                      disabled={!isDraft}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="guide-reviewed-at">
                      Sources reviewed
                    </label>
                    <input
                      id="guide-reviewed-at"
                      className={styles.textInput}
                      type="date"
                      value={sourceReviewedAt}
                      onChange={(event) => {
                        setSourceReviewedAt(event.target.value);
                        setDirty(true);
                      }}
                      disabled={!isDraft}
                    />
                    <span className={styles.fieldHint}>
                      Record when you last checked the source material.
                    </span>
                  </div>
                </div>

                {/* Evidence criteria */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Evidence criteria</label>
                  <span className={styles.fieldHint}>
                    {'How a learner knows they have got it. Write two to five short, observable statements, like "The learner can name three cognitive distortions in their own thinking". Verifiers read these when they review your guide.'}
                  </span>
                  {evidenceCriteria.length > 0 && (
                    <div className={styles.criterionList}>
                      {evidenceCriteria.map((c, i) => (
                        <div key={i} className={styles.criterionRow}>
                          <span className={styles.criterionNum}>{i + 1}</span>
                          <input
                            className={styles.textInput}
                            value={c}
                            onChange={(e) => updateCriterion(i, e.target.value)}
                            placeholder="The learner can…"
                            disabled={!isDraft}
                          />
                          {isDraft && (
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                              onClick={() => removeCriterion(i)}
                              aria-label={`Remove criterion ${i + 1}`}
                            >
                              <X size={15} weight="bold" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {isDraft && evidenceCriteria.length < 5 && (
                    <div className={styles.criterionAddRow}>
                      <CtaButton variant="secondary" size="sm" onClick={addCriterion}>
                        <Plus size={14} weight="bold" /> Add criterion
                      </CtaButton>
                    </div>
                  )}
                </div>

                <hr className={styles.divider} />

                {/* Body */}
                <div>
                  <h2 className={styles.sectionHeading}>Guide content</h2>
                  <p className={styles.sectionSub}>
                    Build the guide from the same content blocks used across courses. Reorder or remove blocks as needed.
                  </p>
                </div>

                {body.length === 0 ? (
                  <div className={styles.emptyBody}>
                    No content yet. Add a block from the palette below.
                  </div>
                ) : (
                  <div className={styles.componentList}>
                    {body.map((c, i) => (
                      <div key={c.id} className={styles.componentCard}>
                        <div className={styles.componentHeader}>
                          <span className={styles.componentType}>
                            {COMPONENT_LABELS[c.componentType] ?? c.componentType}
                          </span>
                          <input
                            className={styles.componentTitleInput}
                            value={c.title ?? ''}
                            onChange={(e) => updateComponent(c.id, { title: e.target.value })}
                            placeholder="Optional section title"
                            disabled={!isDraft}
                          />
                          {isDraft && (
                            <>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => moveComponent(c.id, -1)}
                                disabled={i === 0}
                                aria-label="Move up"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => moveComponent(c.id, 1)}
                                disabled={i === body.length - 1}
                                aria-label="Move down"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                onClick={() => removeComponent(c.id)}
                                aria-label="Remove block"
                              >
                                <Trash size={15} weight="bold" />
                              </button>
                            </>
                          )}
                        </div>
                        {isDraft && (
                          <div className={styles.componentBody}>
                            <ComponentConfigEditor
                              componentType={c.componentType}
                              config={c.config}
                              onUpdate={(config) => updateComponent(c.id, { config })}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isDraft && (
                  <div className={styles.paletteWrap}>
                    <p className={styles.paletteHint}>Add a block</p>
                    <ComponentPalette onAddComponent={addComponent} />
                  </div>
                )}

                <hr className={styles.divider} />

                {/* Prerequisites */}
                <div>
                  <h2 className={styles.sectionHeading}>Prerequisites</h2>
                  <p className={styles.sectionSub}>
                    Published guides a learner should complete before this one. These form the knowledge-base skill tree.
                  </p>
                </div>

                {!currentSlug ? (
                  <p className={styles.fieldHint}>
                    Create the draft first to link prerequisites.
                  </p>
                ) : (
                  <>
                    {prereqError && <span className={styles.errorText}>{prereqError}</span>}

                    {/* DAG position indicator */}
                    <div className={styles.dagPosition}>
                      <span className={styles.dagPositionLabel}>Skill tree position</span>
                      <div className={styles.dagPositionBody}>
                        <span className={styles.dagLevelBadge}>
                          Depth {dagLevel}
                        </span>
                        {prereqs.length > 0 && (
                          <span className={styles.dagPrereqCount}>
                            {prereqs.length} prereq{prereqs.length === 1 ? '' : 's'}
                          </span>
                        )}
                        {dependents.length > 0 && (
                          <span className={styles.dagDepCount}>
                            {dependents.length} dependent{dependents.length === 1 ? '' : 's'}
                          </span>
                        )}
                        {prereqs.length === 0 && dependents.length === 0 && (
                          <span className={styles.dagPrimitive}>Primitive guide (starts a new branch)</span>
                        )}
                      </div>
                    </div>

                    {prereqs.length > 0 && (
                      <div className={styles.prereqList}>
                        {prereqs.map((p) => (
                          <div key={p.id} className={styles.prereqRow}>
                            <span className={styles.prereqName}>{p.topicTitle}</span>
                            {isDraft && (
                              <button
                                type="button"
                                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                onClick={() => removePrereq(p.id)}
                                aria-label={`Remove ${p.topicTitle}`}
                              >
                                <X size={15} weight="bold" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {isDraft && (
                      <div className={styles.field}>
                        <input
                          className={styles.textInput}
                          value={prereqQuery}
                          onChange={(e) => setPrereqQuery(e.target.value)}
                          placeholder="Search published guides to add as a prerequisite"
                        />
                        <div className={styles.searchResults}>
                          {prereqCandidates.length === 0 ? (
                            <span className={styles.searchEmpty}>
                              {prereqQuery ? 'No matching published guides.' : 'Start typing to search published guides.'}
                            </span>
                          ) : (
                            prereqCandidates.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className={styles.searchResult}
                                onClick={() => addPrereq(c.id)}
                              >
                                <span>{c.topicTitle}</span>
                                <Plus size={15} weight="bold" />
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Forward references */}
                    {forwardRefs.length > 0 && (
                      <div className={styles.forwardRefList}>
                        {forwardRefs.map((ref) => (
                          <div key={ref.id} className={styles.forwardRefRow}>
                            <div className={styles.forwardRefInfo}>
                              <span className={styles.forwardRefTitle}>
                                {ref.topicTitle}
                              </span>
                              <span className={`${styles.forwardRefStatus} ${
                                ref.resolvedGuideId ? styles.forwardRefResolved : styles.forwardRefPending
                              }`}>
                                {ref.resolvedGuideId ? 'Resolved' : 'Forthcoming'}
                              </span>
                            </div>
                            {isDraft && (
                              <button
                                type="button"
                                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                onClick={() => removeForwardRef(ref.id)}
                                aria-label={`Remove forward ref ${ref.topicTitle}`}
                              >
                                <X size={15} weight="bold" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {isDraft && (
                      <div className={styles.forwardRefAddRow}>
                        <input
                          className={styles.textInput}
                          value={forwardRefInput}
                          onChange={(e) => setForwardRefInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addForwardRef();
                            }
                          }}
                          placeholder="Add a forthcoming prerequisite topic"
                        />
                        <CtaButton variant="secondary" size="sm" onClick={addForwardRef}>
                          <Plus size={14} weight="bold" /> Add future topic
                        </CtaButton>
                      </div>
                    )}
                  </>
                )}

                <hr className={styles.divider} />

                {/* Submit for verification */}
                {status === 'pending_verification' ? (
                  <div className={styles.pendingBanner}>
                    This guide is in review. A jury of credentialed verifiers is evaluating it.
                    {submitResult && submitResult.memberCount > 0
                      ? ` ${submitResult.memberCount} verifier${submitResult.memberCount === 1 ? '' : 's'} were drawn for the panel.`
                      : ''}{' '}
                    You will be able to publish once the panel reaches a verdict. Editing is locked while in review.
                  </div>
                ) : status === 'published' ? (
                  <div className={styles.pendingBanner}>
                    This guide is published and live in the Knowledge Base.
                  </div>
                ) : (
                  <div className={styles.submitPanel}>
                    <h2 className={styles.submitPanelTitle}>Submit for verification</h2>
                    <p className={styles.submitPanelText}>
                      When your draft is ready, submit it for review. Here is what happens next:
                    </p>
                    <ol className={styles.submitPanelSteps}>
                      <li>A panel of credentialed verifiers is drawn to review your guide.</li>
                      <li>They evaluate it for accuracy, clarity, and fit as the definitive guide for this topic.</li>
                      <li>Editing is locked while in review; once the panel reaches a verdict, the guide can be published.</li>
                    </ol>
                    <div className={styles.actionsRow}>
                      <CtaButton onClick={submitForVerification} disabled={submitting || saving}>
                        {submitting ? 'Submitting…' : 'Submit for verification'}
                      </CtaButton>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

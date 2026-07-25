'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { ArrowCounterClockwise, Eye } from '@phosphor-icons/react';
import CoursePreview from './CoursePreview';
import styles from './CourseStudioModal.module.css';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';


function collisionFallback(args: Parameters<typeof closestCenter>[0]) {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return closestCenter(args);
}
import { useSound } from '@/hooks/useSound';
import ComponentPalette from './ComponentPalette';
import ComponentPanel from './ComponentPanel';
import MissionEditor from './MissionEditor';
import dynamic from 'next/dynamic';

const ReadingEditor = dynamic(() => import('./ReadingEditor'), { ssr: false });
import CourseBuilderTour from './CourseBuilderTour';
import type { VipCourseFull, CourseComponentRecord, MissionBlockRecord, ComponentType, VipCourseStatus } from '@/lib/vip-course-db';
import { validateCourseContent, type ValidatableWeek } from '@/lib/course-validation';

interface CourseStudioProps {
  authHeaders: () => Promise<HeadersInit>;
  onClose: () => void;
  onCourseCreated: () => void;
  existingCourseId?: string;
  initialCourse?: {
    title: string;
    focus: string;
    weeks: Array<{
      weekNumber: number;
      title: string;
      theme: string;
      components: Array<{
        componentType: string;
        title: string;
        config: Record<string, unknown>;
        required?: boolean;
        blocks?: Array<{
          blockType: string;
          config: Record<string, unknown>;
          required?: boolean;
        }>;
      }>;
    }>;
  };
}

type CourseDraft = {
  weeks: Array<{
    id: string;
    weekNumber: number;
    title: string;
    theme: string;
    components: CourseComponentRecord[];
  }>;
};

function createBlankWeek(weekNumber: number): {
  id: string;
  weekNumber: number;
  title: string;
  theme: string;
  components: CourseComponentRecord[];
} {
  return {
    id: `temp-${Date.now()}-${weekNumber}`,
    weekNumber,
    title: `Week ${weekNumber}`,
    theme: '',
    components: [],
  };
}

export default function CourseStudioModal({
  authHeaders,
  onClose,
  onCourseCreated,
  existingCourseId,
  initialCourse,
}: CourseStudioProps) {
  const { play } = useSound();
  const [phase, setPhase] = useState<'loading' | 'edit' | 'saving'>(existingCourseId ? 'loading' : 'edit');
  // Blue's intake questionnaire runs once, before building a brand-new course.
  const [showIntake, setShowIntake] = useState(!existingCourseId && !initialCourse);
  const [courseId, setCourseId] = useState<string | null>(existingCourseId ?? null);
  const [title, setTitle] = useState('');
  const [focus, setFocus] = useState('');
  const [slug, setSlug] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<CourseDraft['weeks']>(() => {
    if (initialCourse?.weeks?.length) {
      const now = Date.now();
      return initialCourse.weeks.map((w, i) => ({
        id: `gen-${now}-${i}`,
        weekNumber: w.weekNumber,
        title: w.title,
        theme: w.theme,
        components: [],
      }));
    }
    return [createBlankWeek(1)];
  });
  const [selectedWeekId, setSelectedWeekId] = useState(weeks[0]?.id ?? '');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<{ type: ComponentType; label?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [readingByWeek, setReadingByWeek] = useState<Record<string, { content: string; imageUrl: string }>>({});
  const [readingDirty, setReadingDirty] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<'reading' | null>(null);
  const [deletedComponent, setDeletedComponent] = useState<{
    component: CourseComponentRecord;
    weekId: string;
    sortOrder: number;
  } | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [status, setStatus] = useState<VipCourseStatus>('draft');
  const [publishing, setPublishing] = useState(false);
  const [showPublishReview, setShowPublishReview] = useState(false);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewDesc, setReviewDesc] = useState('');
  const [reviewSlug, setReviewSlug] = useState('');
  const [reviewCoverImage, setReviewCoverImage] = useState('');
  const [publishIssues, setPublishIssues] = useState<string[]>([]);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const deriveSlug = (val: string) =>
    val.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');

  // Fill the viewport below the fixed top nav; only page scroll is locked
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  // Auto-focus the title input for new courses
  useEffect(() => {
    if (phase === 'edit' && !existingCourseId && !showIntake && titleRef.current) {
      titleRef.current.focus();
    }
  }, [phase, existingCourseId, showIntake]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Load existing course
  useEffect(() => {
    if (!existingCourseId) { return; }
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`/api/vip/courses/${existingCourseId}`, { headers });
        const data = await res.json();
        const course: VipCourseFull = data.course;
        setTitle(course.title);
        setFocus(course.focus);
        setSlug(course.slug);
        setCoverImageUrl(course.coverImageUrl);
        setCourseId(course.id);
        setStatus(course.status);
        const readingMap: Record<string, { content: string; imageUrl: string }> = {};
        const mapped = course.weeks.map((w) => {
          const readingComp = w.components.find(
            (c) => c.componentType === 'rich_text' && (c.config as any)?._isReading,
          );
          if (readingComp) {
            readingMap[w.id] = {
              content: (readingComp.config as any)?.content ?? '',
              imageUrl: (readingComp.config as any)?.imageUrl ?? '',
            };
            return {
              id: w.id,
              weekNumber: w.weekNumber,
              title: w.title,
              theme: w.theme,
              components: w.components.filter(
                (c) => !(c.componentType === 'rich_text' && (c.config as any)?._isReading),
              ),
            };
          }
          return {
            id: w.id,
            weekNumber: w.weekNumber,
            title: w.title,
            theme: w.theme,
            components: w.components,
          };
        });
        setWeeks(mapped.length ? mapped : [createBlankWeek(1)]);
        setSelectedWeekId(mapped[0]?.id ?? '');
        setReadingByWeek(readingMap);
        setDirty(false);
        setPhase('edit');
      } catch {
        setError('Failed to load course.');
        setPhase('edit');
      }
    })();
  }, [existingCourseId, authHeaders]);

  // Pre-populate from AI-generated course
  useEffect(() => {
    if (!initialCourse) return;
    setTitle(initialCourse.title);
    setFocus(initialCourse.focus);
    setSlug(deriveSlug(initialCourse.title));
    if (initialCourse.weeks?.length) {
      setSelectedWeekId(weeks[0]?.id ?? '');
      const readingMap: Record<string, { content: string; imageUrl: string }> = {};
      weeks.forEach((w) => {
        const genWeek = initialCourse.weeks.find((gw) => gw.weekNumber === w.weekNumber);
        if (genWeek) {
          const rc = genWeek.components.find(
            (c) => c.componentType === 'rich_text' && (c.config as any)?._isReading,
          );
          if (rc) {
            readingMap[w.id] = {
              content: (rc.config as any)?.content ?? '',
              imageUrl: (rc.config as any)?.imageUrl ?? '',
            };
          }
        }
      });
      if (Object.keys(readingMap).length > 0) {
        setReadingByWeek(readingMap);
      }
    }
    setPhase('edit');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const updateWeek = (weekId: string, updates: { title?: string; theme?: string }) => {
    setWeeks((prev) =>
      prev.map((w) => (w.id === weekId ? { ...w, ...updates } : w)),
    );
    setDirty(true);
  };

  const tempId = () => `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const addComponentToWeek = (weekId: string, type: ComponentType, config?: Record<string, unknown>) => {
    const isContainer = type === 'mission_container';
    const newComp: CourseComponentRecord = {
      id: tempId(),
      weekId,
      sortOrder: weeks.find((w) => w.id === weekId)?.components.length ?? 0,
      componentType: type,
      title: isContainer ? 'Mission' : '',
      config: isContainer ? {} : (config ?? {}),
      required: false,
      blocks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWeeks((prev) =>
      prev.map((w) => (w.id === weekId ? { ...w, components: [...w.components, newComp] } : w)),
    );
    setSelectedComponentId(newComp.id);
    setDirty(true);
  };

  const updateComponent = (compId: string, updates: Partial<CourseComponentRecord>) => {
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        components: w.components.map((c) => (c.id === compId ? { ...c, ...updates } : c)),
      })),
    );
    setDirty(true);
  };

  const addBlockToComponent = (compId: string, blockType: ComponentType, config?: Record<string, unknown>) => {
    const block: MissionBlockRecord = {
      id: tempId(),
      missionId: compId,
      blockType,
      sortOrder: 0,
      config: config ?? {},
      required: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        components: w.components.map((c) => {
          if (c.id !== compId) return c;
          const blocks = [...(c.blocks || []), { ...block, sortOrder: c.blocks?.length ?? 0 }];
          return { ...c, blocks };
        }),
      })),
    );
    setDirty(true);
  };

  const updateBlock = (compId: string, blockId: string, updates: Partial<MissionBlockRecord>) => {
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        components: w.components.map((c) => {
          if (c.id !== compId) return c;
          return {
            ...c,
            blocks: c.blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b)),
          };
        }),
      })),
    );
    setDirty(true);
  };

  const deleteBlock = (compId: string, blockId: string) => {
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        components: w.components.map((c) => {
          if (c.id !== compId) return c;
          return {
            ...c,
            blocks: c.blocks.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, sortOrder: i })),
          };
        }),
      })),
    );
    setDirty(true);
  };

  const deleteComponent = (compId: string) => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    let stored: { component: CourseComponentRecord; weekId: string; sortOrder: number } | null = null;
    setWeeks((prev) => {
      const next = prev.map((w) => {
        const idx = w.components.findIndex((c) => c.id === compId);
        if (idx !== -1) {
          stored = { component: w.components[idx], weekId: w.id, sortOrder: idx };
          return { ...w, components: w.components.filter((c) => c.id !== compId) };
        }
        return w;
      });
      return next;
    });
    setSelectedComponentId(null);
    setDirty(true);
    if (stored) {
      setDeletedComponent(stored);
      undoTimeoutRef.current = setTimeout(() => setDeletedComponent(null), 5000);
    }
  };

  const undoDelete = () => {
    if (!deletedComponent) return;
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    const { component, weekId, sortOrder } = deletedComponent;
    const newId = tempId();
    setWeeks((prev) =>
      prev.map((w) => {
        if (w.id !== weekId) return w;
        const comps = [...w.components];
        comps.splice(sortOrder, 0, { ...component, id: newId });
        return { ...w, components: comps.map((c, i) => ({ ...c, sortOrder: i })) };
      }),
    );
    setSelectedComponentId(newId);
    setDirty(true);
    setDeletedComponent(null);
  };

  const addWeek = () => {
    const nextNumber = weeks.length + 1;
    const newWeek = createBlankWeek(nextNumber);
    setWeeks((prev) => [...prev, newWeek]);
    setSelectedWeekId(newWeek.id);
    setDirty(true);
  };

  const deleteWeek = (weekId: string) => {
    if (weeks.length <= 1) return;
    const idx = weeks.findIndex((w) => w.id === weekId);
    setWeeks((prev) => prev.filter((w) => w.id !== weekId));
    if (selectedWeekId === weekId) {
      const remaining = weeks.filter((w) => w.id !== weekId);
      const newIdx = Math.min(idx, remaining.length - 1);
      setSelectedWeekId(remaining[newIdx]?.id ?? remaining[0]?.id ?? '');
    }
    setDirty(true);
  };

  const addBlankMission = () => {
    addComponentToWeek(selectedWeekId, 'mission_container');
  };

  const addBlockToSelectedMission = (blockType: ComponentType, config?: Record<string, unknown>) => {
    const targetId = selectedComponentId ?? tempId();
    if (!selectedComponentId) {
      const newComp: CourseComponentRecord = {
        id: targetId,
        weekId: selectedWeekId,
        sortOrder: weeks.find((w) => w.id === selectedWeekId)?.components.length ?? 0,
        componentType: 'mission_container',
        title: '',
        config: {},
        required: false,
        blocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setWeeks((prev) =>
        prev.map((w) => (w.id === selectedWeekId ? { ...w, components: [...w.components, newComp] } : w)),
      );
      setSelectedComponentId(targetId);
    }
    const block: MissionBlockRecord = {
      id: tempId(),
      missionId: targetId,
      blockType,
      sortOrder: 0,
      config: config ?? {},
      required: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        components: w.components.map((c) => {
          if (c.id !== targetId) return c;
          const blocks = [...(c.blocks || []), { ...block, sortOrder: c.blocks?.length ?? 0 }];
          return { ...c, blocks };
        }),
      })),
    );
    setDirty(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.source === 'palette') {
      setActiveDragItem({ type: data.type as ComponentType, label: (data as any).paletteLabel as string | undefined });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Palette → add block to selected mission (or auto-create one)
    if (activeData?.source === 'palette') {
      const blockType = activeData.type as ComponentType;
      const config = activeData.config as Record<string, unknown> | undefined;
      addBlockToSelectedMission(blockType, config);
      return;
    }
  };

  const saveCourse = async () => {
    setError(null);
    setPhase('saving');
    try {
      await saveCourseData();
      onCourseCreated();
    } catch (err: any) {
      setError(err.message ?? 'Save failed');
      setPhase('edit');
    }
  };

  const saveCourseData = async () => {
    const headers = await authHeaders();
    let currentCourseId = courseId;

    // Step 1: Save course metadata
    if (currentCourseId) {
      const res = await fetch(`/api/vip/courses/${currentCourseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ title: title.trim(), slug: slug.trim(), focus: focus.trim(), coverImageUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save course');
      }
    } else {
      const slugVal = slug.trim() || deriveSlug(title.trim()) || `course-${Date.now()}`;
      const titleVal = title.trim() || 'Untitled Course';
      const res = await fetch('/api/vip/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ title: titleVal, slug: slugVal, focus: focus.trim(), coverImageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create course');
      setCourseId(data.course.id);
      currentCourseId = data.course.id;
    }

    // Step 2: Save weeks and components via bulk content endpoint
    if (currentCourseId) {
      const contentRes = await fetch(`/api/vip/courses/${currentCourseId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          weeks: weeks.map((w, i) => {
            const comps = [...w.components];
            const wkReading = readingByWeek[w.id];
            if (wkReading?.content) {
              comps.unshift({
                id: '',
                weekId: w.id,
                sortOrder: 0,
                componentType: 'rich_text',
                title: 'Weekly Read',
                config: { content: wkReading.content, imageUrl: wkReading.imageUrl || '', _isReading: true, format: 'html' },
                required: false,
                blocks: [],
                createdAt: '',
                updatedAt: '',
              });
            }
            return {
              weekNumber: w.weekNumber,
              title: w.title,
              theme: w.theme,
              sortOrder: i,
              components: comps.map((c, ci) => ({
                componentType: c.componentType,
                title: c.title,
                config: c.config,
                sortOrder: ci,
                required: c.required,
                blocks: (c.blocks || []).map((b, bi) => ({
                  blockType: b.blockType,
                  config: b.config,
                  sortOrder: bi,
                  required: b.required,
                })),
              })),
            };
          }),
        }),
      });
      if (!contentRes.ok) {
        const data = await contentRes.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save course content');
      }
      const { course: savedCourse } = await contentRes.json();

      // Update local state with real DB IDs from the saved course
      setWeeks(
        savedCourse.weeks.map((w: any) => ({
          id: w.id,
          weekNumber: w.weekNumber,
          title: w.title,
          theme: w.theme,
          components: w.components.map((c: any) => ({
            id: c.id,
            weekId: c.weekId,
            sortOrder: c.sortOrder,
            componentType: c.componentType,
            title: c.title,
            config: c.config,
            required: c.required,
            blocks: (c.blocks || []).map((b: any) => ({
              id: b.id,
              missionId: b.missionId,
              blockType: b.blockType,
              sortOrder: b.sortOrder,
              config: b.config,
              required: b.required,
              createdAt: b.createdAt,
              updatedAt: b.updatedAt,
            })),
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
        })),
      );
      setSelectedWeekId(savedCourse.weeks[0]?.id ?? weeks[0]?.id ?? '');
    }

    setDirty(false);
    setPhase('edit');
    return currentCourseId;
  };

  const buildValidatableWeeks = (): ValidatableWeek[] =>
    weeks.map((w) => {
      const comps = w.components.map((c) => ({
        componentType: c.componentType,
        title: c.title,
        config: c.config,
        blocks: (c.blocks || []).map((b) => ({ blockType: b.blockType, config: b.config })),
      }));
      const reading = readingByWeek[w.id];
      if (reading?.content) {
        comps.unshift({
          componentType: 'rich_text',
          title: 'Weekly Read',
          config: { content: reading.content, _isReading: true },
          blocks: [],
        });
      }
      return { weekNumber: w.weekNumber, components: comps };
    });

  const handleOpenPublishReview = async () => {
    if (dirty) {
      setPhase('saving');
      try {
        await saveCourseData();
      } catch (err: any) {
        setError(err.message ?? 'Save failed');
        setPhase('edit');
        return;
      }
    }
    setPhase('edit');
    setReviewTitle(title);
    setReviewDesc(focus);
    setReviewSlug(slug || deriveSlug(title));
    setReviewCoverImage(coverImageUrl || '');
    setPublishIssues(validateCourseContent(buildValidatableWeeks()));
    setShowPublishReview(true);
  };

  const confirmPublish = async () => {
    if (status !== 'published') {
      const issues = validateCourseContent(buildValidatableWeeks());
      setPublishIssues(issues);
      if (issues.length > 0) return;
    }
    setPublishing(true);
    setError(null);
    try {
      // Save all content (weeks, components, reading) first
      setPhase('saving');
      const savedId = await saveCourseData();
      const pubCourseId = savedId ?? courseId;
      if (!pubCourseId) {
        throw new Error('Save the course first');
      }

      const headers = await authHeaders();
      const metaRes = await fetch(`/api/vip/courses/${pubCourseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          title: reviewTitle.trim(),
          slug: reviewSlug.trim(),
          focus: reviewDesc.trim(),
          coverImageUrl: reviewCoverImage.trim() || null,
        }),
      });
      if (!metaRes.ok) {
        const data = await metaRes.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save metadata');
      }
      const pubRes = await fetch(`/api/vip/courses/${pubCourseId}/publish`, {
        method: 'POST',
        headers,
      });
      if (!pubRes.ok) {
        const data = await pubRes.json().catch(() => ({}));
        if (Array.isArray(data.issues) && data.issues.length > 0) {
          setPublishIssues(data.issues);
        }
        throw new Error(data.error ?? 'Publish failed');
      }
      setTitle(reviewTitle.trim());
      setFocus(reviewDesc.trim());
      setSlug(reviewSlug.trim());
      setCoverImageUrl(reviewCoverImage.trim() || null);
      setStatus('published');
      setShowPublishReview(false);
    } catch (err: any) {
      setError(err.message ?? 'Publish failed');
      setPhase('edit');
      setDirty(true);
    } finally {
      setPublishing(false);
    }
  };

  const handleBack = async () => {
    if (previewMode) {
      setPreviewMode(false);
      return;
    }
    if (dirty || readingDirty) {
      setPhase('saving');
      try {
        await saveCourseData();
      } catch (err: any) {
        setError(err.message ?? 'Save failed');
        setPhase('edit');
        return;
      }
    }
    onClose();
  };

  if (phase === 'loading') {
    return (
      <div className={styles.loadingOverlay}>
        <div className={styles.loadingSpinner} />
        <span className={styles.loadingText}>Loading course...</span>
      </div>
    );
  }

  const currentWeek = weeks.find((w) => w.id === selectedWeekId);
  const currentWeekComponents = currentWeek?.components ?? [];
  const selectedComponent = currentWeekComponents.find((c) => c.id === selectedComponentId) ?? null;
  const currentReading = selectedWeekId ? readingByWeek[selectedWeekId] : undefined;
  const readingContent = currentReading?.content ?? '';
  const readingImageUrl = currentReading?.imageUrl ?? '';

  return (
    <>
    <style>{`
      body { overflow: hidden !important; }
    `}</style>
    <div className={styles.layout}>
      <SideNavigation />
      <DndContext
        sensors={sensors}
        collisionDetection={collisionFallback}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.body}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button
                type="button"
                onClick={handleBack}
                className={styles.backBtn}
                title="Back to courses"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <div className={styles.headerMeta}>
                {courseId && (
                  <button
                    type="button"
                    onClick={handleOpenPublishReview}
                    className={`${styles.statusBadge} ${status === 'published' ? styles.statusPublished : ''}`}
                    title={status === 'published' ? 'Edit course card settings' : 'Review & Publish'}
                  >
                    {status === 'published' ? 'Published' : 'Draft'}
                  </button>
                )}
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                  onKeyDown={() => play('click')}
                  placeholder="Course title"
                  className={styles.titleInput}
                  data-tour="builder-title"
                />
              </div>
            </div>
            <div className={styles.headerActions}>
              {error && <span className={styles.errorText}>{error}</span>}
              <span className={styles.dirtyDot} data-visible={dirty ? '' : undefined} />
              <button
                type="button"
                onClick={() => setPreviewMode((p) => !p)}
                className={styles.previewBtn}
                title={previewMode ? 'Back to editing' : 'Preview course'}
              >
                <Eye size={14} weight="bold" />
                {previewMode ? 'Edit' : 'Preview'}
              </button>
              {courseId && status !== 'published' && (
                <button
                  type="button"
                  onClick={handleOpenPublishReview}
                  disabled={publishing || phase === 'saving'}
                  className={styles.publishBtn}
                >
                  Review & Publish
                </button>
              )}
              <button
                type="button"
                onClick={saveCourse}
                disabled={phase === 'saving'}
                className={styles.saveBtn}
              >
                {phase === 'saving' ? 'Saving...' : courseId ? 'Save' : 'Create course'}
              </button>
            </div>
          </div>

          {/* Body */}
          {previewMode ? (
            <CoursePreview
              weeks={weeks}
              readingByWeek={readingByWeek}
            />
          ) : (
            <div className={styles.editorArea}>
              {/* Left: Component panel */}
              <motion.aside
                className={styles.componentPanel}
                initial={{ x: -320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                data-tour="builder-panel"
              >
                <div className={styles.panelCard}>
                  <ComponentPanel
                    weeks={weeks}
                    selectedWeekId={selectedWeekId}
                    onSelectWeek={(id) => {
                      if (selectedSlot === 'reading' && readingDirty) {
                        const ok = window.confirm('Discard unsaved changes to the Weekly Read?');
                        if (!ok) return;
                        setReadingDirty(false);
                      }
                      setSelectedWeekId(id);
                    }}
                    onAddWeek={addWeek}
                    onDeleteWeek={deleteWeek}
                    onUpdateWeek={updateWeek}
                    readingContent={readingContent}
                    readingImageUrl={readingImageUrl}
                    missions={currentWeekComponents}
                    selectedMissionId={selectedComponentId}
                    onSelectMission={(id) => {
                      if (selectedSlot === 'reading' && readingDirty) {
                        const ok = window.confirm('Discard unsaved changes to the Weekly Read?');
                        if (!ok) return;
                        setReadingDirty(false);
                      }
                      setSelectedComponentId(id); setSelectedSlot(null);
                    }}
                    onDeleteMission={deleteComponent}
                    onAddBlankMission={addBlankMission}
                    onEditReading={() => { setSelectedSlot('reading'); setSelectedComponentId(null); }}
                  />
                </div>
              </motion.aside>

              {/* Right: Component editor — always block-based MissionEditor */}
              {selectedComponent ? (
                <main className={styles.missionEditor}>
                  <MissionEditor
                    component={selectedComponent}
                    onUpdate={updateComponent}
                    onDelete={deleteComponent}
                    onAddBlock={(blockType, config) => addBlockToComponent(selectedComponent.id, blockType, config)}
                    onUpdateBlock={(blockId, updates) => updateBlock(selectedComponent.id, blockId, updates)}
                    onDeleteBlock={(blockId) => deleteBlock(selectedComponent.id, blockId)}
                  />
                </main>
              ) : selectedSlot === 'reading' ? (
                <main className={styles.missionEditor}>
                  <ReadingEditor
                    key={selectedWeekId}
                    content={readingContent}
                    imageUrl={readingImageUrl}
                    onDirtyChange={setReadingDirty}
                    onImageUrlChange={(url) => {
                      if (selectedWeekId) {
                        setReadingByWeek((prev) => ({
                          ...prev,
                          [selectedWeekId]: { ...prev[selectedWeekId], content: prev[selectedWeekId]?.content ?? '', imageUrl: url },
                        }));
                        setDirty(true);
                      }
                    }}
                    onSave={(content) => {
                      if (selectedWeekId) {
                        setReadingByWeek((prev) => ({
                          ...prev,
                          [selectedWeekId]: { content, imageUrl: prev[selectedWeekId]?.imageUrl ?? '' },
                        }));
                        setDirty(true);
                      }
                      setReadingDirty(false);
                    }}
                    onClose={() => setSelectedSlot(null)}
                  />
                </main>
              ) : (
                <main className={styles.editorEmptyBase}>
                  <div className={styles.editorEmptyCard}>
                    <p className={styles.editorEmptyText}>Select a mission to edit or add one from the palette below</p>
                  </div>
                </main>
              )}

              {/* Floating save bar — always visible above the palette */}
              <div className={styles.floatingSaveBar}>
                <div className={styles.floatingSaveLeft}>
                  {error && <span className={styles.errorText}>{error}</span>}
                  <span className={styles.dirtyDot} data-visible={dirty ? '' : undefined} />
                  {dirty && <span className={styles.floatingDirtyLabel}>Unsaved changes</span>}
                </div>
                <button
                  type="button"
                  onClick={saveCourse}
                  disabled={phase === 'saving'}
                  className={styles.saveBtn}
                >
                  {phase === 'saving' ? 'Saving...' : courseId ? 'Save' : 'Create course'}
                </button>
              </div>

              {/* Bottom: Component palette */}
              <aside className={`${styles.bottomPalette} ${drawerOpen ? '' : styles.bottomPaletteClosed}`} data-tour="builder-palette">
                <button
                  type="button"
                  className={styles.paletteToggle}
                  onClick={() => setDrawerOpen((o) => !o)}
                  title={drawerOpen ? 'Close component palette' : 'Open component palette'}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: drawerOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                  Components
                </button>
                <div className={styles.paletteBody}>
                  <ComponentPalette onAddComponent={(type, config) => addBlockToSelectedMission(type, config)} />
                </div>
              </aside>
            </div>
          )}
        </div>

        {deletedComponent && (
          <div className={styles.toast}>
            <span>Component removed</span>
            <button type="button" className={styles.undoBtn} onClick={undoDelete}>
              <ArrowCounterClockwise size={14} weight="bold" />
              Undo
            </button>
          </div>
        )}

        <DragOverlay>
          <AnimatePresence>
            {activeDragItem && (
              <motion.div
                className={styles.dragOverlay}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <span className={styles.dragOverlayLabel}>
                  + {activeDragItem.label ?? activeDragItem.type.replace(/_/g, ' ')}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </DragOverlay>

        {showPublishReview && (
          <div className={styles.publishOverlay} onClick={() => setShowPublishReview(false)}>
            <div className={styles.publishDialog} onClick={(e) => e.stopPropagation()}>
              <div className={styles.publishCardPreview}>
                <div className={styles.previewCard}>
                  <div className={styles.previewCardThumb}>
                    <div className={styles.previewCardBadge}>
                      <span className={styles.previewBadgeValue}>{weeks.length} session{weeks.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className={styles.previewCardBody}>
                    <h3 className={styles.previewCardTitle}>{reviewTitle || 'Course Title'}</h3>
                    <p className={styles.previewCardDesc}>{reviewDesc || 'No description yet'}</p>
                  </div>
                </div>
              </div>
              <div className={styles.publishForm}>
                <h2 className={styles.publishFormTitle}>{status === 'published' ? 'Course Card Settings' : 'Pre-publish Review'}</h2>
                <p className={styles.publishFormSub}>{status === 'published' ? 'Edit the title, description, URL slug, and card preview shown on Home.' : 'Set the title, description, and URL slug before publishing.'}</p>
                <label className={styles.publishField}>
                  <span className={styles.publishFieldLabel}>Title</span>
                  <input
                    value={reviewTitle}
                    onChange={(e) => {
                      setReviewTitle(e.target.value);
                      setReviewSlug(deriveSlug(e.target.value));
                    }}
                    placeholder="Course title"
                    className={styles.publishFieldInput}
                  />
                </label>
                <label className={styles.publishField}>
                  <span className={styles.publishFieldLabel}>Description</span>
                  <textarea
                    value={reviewDesc}
                    onChange={(e) => setReviewDesc(e.target.value)}
                    placeholder="Short description for the course card"
                    rows={3}
                    className={styles.publishFieldTextarea}
                  />
                </label>
                <label className={styles.publishField}>
                  <span className={styles.publishFieldLabel}>URL Slug</span>
                  <div className={styles.publishSlugRow}>
                    <span className={styles.publishSlugPrefix}>/</span>
                    <input
                      value={reviewSlug}
                      onChange={(e) => setReviewSlug(e.target.value)}
                      placeholder="url-slug"
                      className={styles.publishFieldInput}
                    />
                  </div>
                </label>
                <label className={styles.publishField}>
                  <span className={styles.publishFieldLabel}>Cover Image URL</span>
                  <input
                    value={reviewCoverImage}
                    onChange={(e) => setReviewCoverImage(e.target.value)}
                    placeholder="https://example.com/course-image.jpg"
                    className={styles.publishFieldInput}
                  />
                </label>
                {publishIssues.length > 0 && status !== 'published' && (
                  <div className={styles.publishIssues}>
                    <span className={styles.publishIssuesTitle}>
                      Fix {publishIssues.length === 1 ? 'this' : `these ${publishIssues.length} things`} before publishing
                    </span>
                    <ul className={styles.publishIssuesList}>
                      {publishIssues.map((issue, i) => (
                        <li key={i} className={styles.publishIssueItem}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className={styles.publishActions}>
                  <button
                    type="button"
                    onClick={() => setShowPublishReview(false)}
                    className={styles.publishCancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmPublish}
                    disabled={publishing || !reviewTitle.trim() || !reviewSlug.trim() || (status !== 'published' && publishIssues.length > 0)}
                    className={styles.publishConfirmBtn}
                  >
                    {publishing ? 'Saving...' : status === 'published' ? 'Save Settings' : 'Confirm & Publish'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DndContext>

      {/* First-run tour waits until Blue's intake questionnaire is done */}
      {!showIntake && <CourseBuilderTour />}
    </div>
    </>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

// ── Canvas Data ──

interface CanvasData {
  cells: Record<string, string>;
  cynefin: string | null;
  frames: [string, string, string];
  solutions: { answer: string; assumptions: string; test: string }[];
}

const STORAGE_KEY = 'mwa-problem-canvas';

const EMPTY_CANVAS: CanvasData = {
  cells: {},
  cynefin: null,
  frames: ['', '', ''],
  solutions: [
    { answer: '', assumptions: '', test: '' },
    { answer: '', assumptions: '', test: '' },
    { answer: '', assumptions: '', test: '' },
  ],
};

// ── Component ──

export default function GuidancePage() {
  const [canvas, setCanvas] = useState<CanvasData>(EMPTY_CANVAS);
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { play } = useSound();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCanvas({
          cells: parsed.cells || {},
          cynefin: parsed.cynefin ?? null,
          frames: Array.isArray(parsed.frames) ? parsed.frames : ['', '', ''],
          solutions: Array.isArray(parsed.solutions) && parsed.solutions.length === 3
            ? parsed.solutions
            : EMPTY_CANVAS.solutions,
        });
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  const persist = useCallback((data: CanvasData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, 500);
  }, []);

  const updateCell = (id: string, value: string) => {
    setCanvas((prev) => {
      const next = { ...prev, cells: { ...prev.cells, [id]: value } };
      persist(next);
      return next;
    });
  };

  const setCynefin = (value: string) => {
    setCanvas((prev) => {
      const next = { ...prev, cynefin: prev.cynefin === value ? null : value };
      persist(next);
      return next;
    });
  };

  const updateFrame = (index: number, value: string) => {
    setCanvas((prev) => {
      const frames: [string, string, string] = [...prev.frames];
      frames[index] = value;
      const next = { ...prev, frames };
      persist(next);
      return next;
    });
  };

  const updateSolution = (index: number, field: 'answer' | 'assumptions' | 'test', value: string) => {
    setCanvas((prev) => {
      const solutions = prev.solutions.map((s, i) => i === index ? { ...s, [field]: value } : s);
      const next = { ...prev, solutions };
      persist(next);
      return next;
    });
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(canvas));
    setToast('Canvas saved');
    setTimeout(() => setToast(null), 2000);
  };

  const handleClear = () => {
    if (!confirm('Clear all canvas data? This cannot be undone.')) return;
    setCanvas(EMPTY_CANVAS);
    localStorage.removeItem(STORAGE_KEY);
    setToast('Canvas cleared');
    setTimeout(() => setToast(null), 2000);
  };

  const handleFocus = useCallback((e: React.FocusEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') play('hover');
  }, [play]);

  return (
    <div className={styles.main} onFocus={handleFocus}>
      <SideNavigation />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Problem Framing Canvas</h1>
          <span className={styles.subtitle}>Mental Wealth Academy Framework</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => { play('click'); handleClear(); }} onMouseEnter={() => play('hover')}>Clear</button>
          <button className={styles.btnPrimary} onClick={() => { play('success'); handleSave(); }} onMouseEnter={() => play('hover')}>Save</button>
        </div>
      </div>

      {/* ── Row 1 ── */}
      <div className={styles.gridRow}>
        {/* First-cut problem statement */}
        <div className={styles.card}>
          <div className={styles.cardQuestion}>First-cut problem statement:</div>
          <div className={styles.cardPrompts}>
            <span className={styles.cardPrompt}>Whose problem is it? (a human view)</span>
            <span className={styles.cardPrompt}>What is the need?</span>
            <span className={styles.cardPrompt}>Why is this a problem?</span>
          </div>
          <textarea
            className={styles.cardTextarea}
            placeholder="Describe the problem as you currently see it..."
            value={canvas.cells['first-cut'] || ''}
            onChange={(e) => updateCell('first-cut', e.target.value)}
          />
        </div>

        {/* Problem behind the problem */}
        <div className={styles.card}>
          <div className={styles.cardQuestion}>Is there a problem behind the problem?</div>
          <div className={styles.cardPrompts}>
            <span className={styles.cardPrompt}>Any insights from the 5 Whys?</span>
          </div>
          <textarea
            className={styles.cardTextarea}
            placeholder="Dig deeper — what's the root cause?"
            value={canvas.cells['behind'] || ''}
            onChange={(e) => updateCell('behind', e.target.value)}
          />
        </div>

        {/* How Might We */}
        <div className={styles.card}>
          <div className={styles.cardQuestion}>Problem framed as an opportunity question — How Might We......?</div>
          <div className={styles.cardPrompts}>
            <span className={styles.cardPrompt}>A question that could spark at least 10 ideas about potential responses</span>
          </div>
          <textarea
            className={styles.cardTextarea}
            placeholder="How might we..."
            value={canvas.cells['hmw'] || ''}
            onChange={(e) => updateCell('hmw', e.target.value)}
          />
        </div>

        {/* Cynefin */}
        <div className={styles.cynefinCard}>
          <div className={styles.cardQuestion}>What type of problem is this?</div>
          <div className={styles.cynefinGrid}>
            {['Complex', 'Complicated', 'Chaotic', 'Clear'].map((q) => (
              <div
                key={q}
                className={`${styles.cynefinQuadrant} ${canvas.cynefin === q ? styles.cynefinSelected : ''}`}
                onClick={() => { play(canvas.cynefin === q ? 'toggle-off' : 'toggle-on'); setCynefin(q); }}
                onMouseEnter={() => play('hover')}
              >
                {q}
              </div>
            ))}
          </div>
          <div className={styles.cynefinSource}>Source: thecynefin.co</div>
        </div>
      </div>

      {/* ── Row 2 ── */}
      <div className={styles.gridRow}>
        {/* Rich picture */}
        <div className={styles.card}>
          <div className={styles.cardQuestion}>Draw out the problem — create a rich picture</div>
          <div className={styles.cardPrompts}>
            <span className={styles.cardPrompt}>What is the story of this problem?</span>
            <span className={styles.cardPrompt}>How does the problem &lsquo;work&rsquo;?</span>
          </div>
          <textarea
            className={styles.cardTextarea}
            placeholder="Describe or sketch the problem landscape..."
            value={canvas.cells['rich-picture'] || ''}
            onChange={(e) => updateCell('rich-picture', e.target.value)}
          />
          <div className={styles.cardPrompts}>
            <span className={styles.cardPrompt}>What does this reveal about how you &lsquo;see&rsquo; the problem?</span>
          </div>
        </div>

        {/* Frame in three ways */}
        <div className={styles.frameCard}>
          <div className={styles.cardQuestion}>Frame the problem in three different ways:</div>
          <div className={styles.frameInputs}>
            <textarea
              className={styles.frameInput}
              placeholder="Framing 1..."
              value={canvas.frames[0]}
              onChange={(e) => updateFrame(0, e.target.value)}
            />
            <textarea
              className={styles.frameInput}
              placeholder="Framing 2..."
              value={canvas.frames[1]}
              onChange={(e) => updateFrame(1, e.target.value)}
            />
            <textarea
              className={styles.frameInput}
              placeholder="Framing 3..."
              value={canvas.frames[2]}
              onChange={(e) => updateFrame(2, e.target.value)}
            />
          </div>
        </div>

        {/* Stakeholders */}
        <div className={styles.stackedCard}>
          <div className={styles.cardQuestion}>Who cares about the problem enough to act on it?</div>
          <div className={styles.cardPrompts}>
            <span className={styles.cardPrompt}>Who has a stake in the problem or its resolution?</span>
          </div>
          <textarea
            className={styles.cardTextarea}
            placeholder="Key stakeholders..."
            value={canvas.cells['stakeholders'] || ''}
            onChange={(e) => updateCell('stakeholders', e.target.value)}
          />
          <div className={styles.stackedDivider} />
          <div className={styles.cardQuestion}>Does anyone benefit from the problem as a problem?</div>
          <textarea
            className={styles.cardTextarea}
            placeholder="Who benefits from the status quo?"
            value={canvas.cells['beneficiaries'] || ''}
            onChange={(e) => updateCell('beneficiaries', e.target.value)}
          />
        </div>

        {/* Revised statement */}
        <div className={styles.card}>
          <div className={styles.cardQuestion}>Any changes to your first cut problem statement?</div>
          <textarea
            className={styles.cardTextarea}
            placeholder="Revise your problem statement based on what you've explored..."
            value={canvas.cells['revised'] || ''}
            onChange={(e) => updateCell('revised', e.target.value)}
          />
        </div>
      </div>

      {/* ── Solutions Section ── */}
      <div className={styles.solutionsHeader}>
        Based on my knowledge + experience, my top of mind three &lsquo;best guess&rsquo; answers / solutions to the problem are:
      </div>

      <div className={styles.solutionsRow} style={{ marginTop: 14 }}>
        {canvas.solutions.map((sol, i) => (
          <div key={i} className={styles.solutionCard}>
            <span className={styles.solutionNum}>Solution {i + 1}</span>
            <textarea
              className={styles.solutionTextarea}
              placeholder={`Best guess answer ${i + 1}...`}
              value={sol.answer}
              onChange={(e) => updateSolution(i, 'answer', e.target.value)}
            />
            <span className={styles.subLabel}>Assumptions:</span>
            <textarea
              className={styles.subTextarea}
              placeholder="What assumptions are you making?"
              value={sol.assumptions}
              onChange={(e) => updateSolution(i, 'assumptions', e.target.value)}
            />
            <span className={styles.subLabel}>Low Cost Test:</span>
            <textarea
              className={styles.subTextarea}
              placeholder="How could you test this cheaply?"
              value={sol.test}
              onChange={(e) => updateSolution(i, 'test', e.target.value)}
            />
          </div>
        ))}

        {/* Success card */}
        <div className={styles.card}>
          <div className={styles.cardQuestion}>What does success look like for responding to this problem?</div>
          <textarea
            className={styles.cardTextarea}
            placeholder="Define what a successful outcome looks like..."
            value={canvas.cells['success'] || ''}
            onChange={(e) => updateCell('success', e.target.value)}
          />
        </div>
      </div>

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

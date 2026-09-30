'use client';

import React, { useState } from 'react';
import DailyNoteCelebrationModal from '@/components/daily-notes/DailyNoteCelebrationModal';

export default function CelebrationPreviewPage() {
  const [open, setOpen] = useState(true);
  const [credits, setCredits] = useState(100);
  const [streak, setStreak] = useState(10);
  const [timeSpent, setTimeSpent] = useState(446); // 7:26

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b131b',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 24,
      fontFamily: 'var(--font-primary, sans-serif)',
    }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Field Notes Celebration Preview</h1>
      <p style={{ color: '#94a3b8' }}>
        Preview the 3-screen Duolingo-style completion flow for Mental Wealth Academy.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: '10px 20px',
            borderRadius: 999,
            background: '#0284c7',
            color: '#fff',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Open celebration modal
        </button>
      </div>

      <DailyNoteCelebrationModal
        open={open}
        onClose={() => setOpen(false)}
        creditsEarned={credits}
        streakDays={streak}
        timeSpentSeconds={timeSpent}
        focusAccuracy={94}
      />
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import DailyNoteCelebrationModal from '@/components/daily-notes/DailyNoteCelebrationModal';

export default function CelebrationPreviewPage() {
  const [open, setOpen] = useState(true);
  const [diamonds, setDiamonds] = useState(100);
  const [streak, setStreak] = useState(10);
  const [timeSpent, setTimeSpent] = useState(446); // 7:26

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7f8ff',
      color: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 24,
      fontFamily: 'var(--font-primary, sans-serif)',
    }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Field Notes Celebration Preview</h1>
      <p style={{ color: '#64748b' }}>
        Preview the 3-screen Duolingo-style completion flow for Mental Wealth Academy in the light-design system.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: '10px 20px',
            borderRadius: 999,
            background: 'linear-gradient(180deg, #6b7fff 0%, #465BE0 100%)',
            color: '#fff',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(70, 91, 224, 0.25)',
          }}
        >
          Open celebration modal
        </button>
      </div>

      <DailyNoteCelebrationModal
        open={open}
        onClose={() => setOpen(false)}
        diamondsEarned={diamonds}
        streakDays={streak}
        timeSpentSeconds={timeSpent}
        focusAccuracy={94}
      />
    </div>
  );
}

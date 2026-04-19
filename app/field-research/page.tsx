'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import Image from 'next/image';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import FieldTaskCard, { FieldTask } from '@/components/field-task-card/FieldTaskCard';
import styles from './page.module.css';

const FieldScanner = dynamic(() => import('@/components/field-scanner/FieldScanner'), {
  ssr: false,
  loading: () => null,
});

const FIELD_TASKS: FieldTask[] = [
  {
    id: 'plant-scan',
    name: 'Plant Scan',
    category: 'botany',
    shards: 350,
    timeMin: 10,
    gradientFrom: '#0f2d1a',
    gradientTo: '#1e5c35',
    azuraImage: '/images/blue-happy.png',
    illustrationEmoji: '🌿',
  },
  {
    id: 'water-test',
    name: 'Water Test',
    category: 'chemistry',
    shards: 500,
    timeMin: 15,
    gradientFrom: '#071730',
    gradientTo: '#0d3d72',
    azuraImage: '/images/blue-joyful.png',
    illustrationEmoji: '💧',
  },
  {
    id: 'soil-map',
    name: 'Soil Map',
    category: 'geology',
    shards: 400,
    timeMin: 20,
    gradientFrom: '#2a1608',
    gradientTo: '#5c3317',
    azuraImage: '/images/blue-surprised.png',
    illustrationEmoji: '🪨',
  },
  {
    id: 'mineral-hunt',
    name: 'Mineral Hunt',
    category: 'mineralogy',
    shards: 600,
    timeMin: 25,
    gradientFrom: '#1e0840',
    gradientTo: '#4a1080',
    azuraImage: '/images/blue-happy.png',
    illustrationEmoji: '💎',
  },
  {
    id: 'air-quality',
    name: 'Air Quality',
    category: 'environmental',
    shards: 450,
    timeMin: 12,
    gradientFrom: '#05182e',
    gradientTo: '#0a4060',
    azuraImage: '/images/blue-joyful.png',
    illustrationEmoji: '🌬️',
  },
  {
    id: 'fungi-field',
    name: 'Fungi Field',
    category: 'mycology',
    shards: 700,
    timeMin: 30,
    gradientFrom: '#2d0620',
    gradientTo: '#6b0f46',
    azuraImage: '/images/blue-happy.png',
    illustrationEmoji: '🍄',
  },
  {
    id: 'bird-watch',
    name: 'Bird Watch',
    category: 'ornithology',
    shards: 300,
    timeMin: 20,
    gradientFrom: '#0c1f38',
    gradientTo: '#1a4a6e',
    azuraImage: '/images/blue-surprised.png',
    illustrationEmoji: '🪶',
  },
  {
    id: 'rock-study',
    name: 'Rock Study',
    category: 'petrology',
    shards: 420,
    timeMin: 18,
    gradientFrom: '#1a1a2e',
    gradientTo: '#3a3a5c',
    azuraImage: '/images/blue-joyful.png',
    illustrationEmoji: '🧱',
  },
];

type TabId = 'all' | 'active' | 'starred';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All Tasks' },
  { id: 'active', label: 'Active' },
  { id: 'starred', label: 'Starred' },
];

export default function FieldResearchPage() {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [scannerTask, setScannerTask] = useState<FieldTask | null>(null);

  const handleStar = (id: string) => {
    setStarredIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleTasks = FIELD_TASKS.filter((t) => {
    if (activeTab === 'starred') return starredIds.has(t.id);
    return true;
  });

  return (
    <>
      <div className={styles.pageLayout}>
        <SideNavigation />
        <main className={styles.page}>

          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIconWrap}>
                <Image
                  src="/icons/bluescanner.png"
                  alt=""
                  width={26}
                  height={26}
                  unoptimized
                />
              </div>
              <div>
                <h1 className={styles.headerTitle}>Field Research</h1>
                <p className={styles.headerSub}>Identify · Analyze · Build</p>
              </div>
            </div>
            <button
              type="button"
              className={styles.scanNowBtn}
              onClick={() => setScannerTask(FIELD_TASKS[0])}
            >
              Scan Now
            </button>
          </header>

          {/* Tabs */}
          <div className={styles.tabs} role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.id === 'starred' && starredIds.size > 0 && (
                  <span className={styles.tabBadge}>{starredIds.size}</span>
                )}
              </button>
            ))}
          </div>

          {/* Task grid */}
          {visibleTasks.length > 0 ? (
            <div className={styles.grid}>
              {visibleTasks.map((task) => (
                <FieldTaskCard
                  key={task.id}
                  task={task}
                  isStarred={starredIds.has(task.id)}
                  onStar={() => handleStar(task.id)}
                  onStart={() => setScannerTask(task)}
                  onDetails={() => setScannerTask(task)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyEmoji}>⭐</span>
              <p className={styles.emptyText}>No starred tasks yet</p>
              <p className={styles.emptyHint}>Tap ☆ on any task to save it here</p>
            </div>
          )}

        </main>
      </div>

      {scannerTask && (
        <FieldScanner
          task={scannerTask}
          onClose={() => setScannerTask(null)}
        />
      )}
    </>
  );
}

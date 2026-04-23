'use client';

import React, { useMemo, useState } from 'react';
import styles from './BlueChat.module.css';

export interface AutoDistributionRequest {
  brief: string;
  goal: 'launch' | 'engagement' | 'ads' | 'nurture';
  platforms: Array<'gmail' | 'twitter' | 'bluesky'>;
  deliverables: Array<'posts' | 'images' | 'videos' | 'ads' | 'engagement'>;
}

interface AutoDistributionInlineProps {
  isBusy: boolean;
  xConnection: {
    loading: boolean;
    connected: boolean;
    username: string | null;
    error: string | null;
  };
  onConnectX: () => void;
  onGenerate: (request: AutoDistributionRequest) => void;
  onClose: () => void;
}

const AutoDistributionInline: React.FC<AutoDistributionInlineProps> = ({
  isBusy,
  xConnection,
  onConnectX,
  onGenerate,
  onClose,
}) => {
  const [brief, setBrief] = useState('');
  const [goal, setGoal] = useState<AutoDistributionRequest['goal']>('launch');
  const [platforms, setPlatforms] = useState<Record<AutoDistributionRequest['platforms'][number], boolean>>({
    gmail: true,
    twitter: true,
    bluesky: true,
  });
  const [deliverables, setDeliverables] = useState<Record<AutoDistributionRequest['deliverables'][number], boolean>>({
    posts: true,
    images: true,
    videos: true,
    ads: true,
    engagement: true,
  });

  const selectedPlatforms = useMemo(
    () => (Object.entries(platforms).filter(([, enabled]) => enabled).map(([key]) => key) as AutoDistributionRequest['platforms']),
    [platforms]
  );

  const selectedDeliverables = useMemo(
    () => (Object.entries(deliverables).filter(([, enabled]) => enabled).map(([key]) => key) as AutoDistributionRequest['deliverables']),
    [deliverables]
  );

  const submit = () => {
    if (!brief.trim() || selectedPlatforms.length === 0 || selectedDeliverables.length === 0 || isBusy) return;
    onGenerate({
      brief: brief.trim(),
      goal,
      platforms: selectedPlatforms,
      deliverables: selectedDeliverables,
    });
  };

  return (
    <div className={styles.autoDistributionPanel}>
      <span className={styles.autoDistributionTitle}>Auto-Distribution</span>
      <p className={styles.autoDistributionDesc}>
        Connect approved accounts, define the campaign, then generate posts, image prompts, video concepts, ad angles,
        and engagement-search ideas before anything gets published.
      </p>

      <div className={styles.autoDistributionGrid}>
        <div className={styles.autoDistributionCard}>
          <div className={styles.autoDistributionCardTop}>
            <span className={styles.autoDistributionChannel}>Gmail</span>
            <span className={`${styles.autoDistributionStatus} ${styles.autoDistributionStatusPending}`}>Draft Only</span>
          </div>
          <span className={styles.autoDistributionMeta}>Newsletter copy, subject lines, nurture sequences.</span>
          <span className={styles.autoDistributionHint}>Google OAuth route still needs to be wired.</span>
        </div>

        <div className={styles.autoDistributionCard}>
          <div className={styles.autoDistributionCardTop}>
            <span className={styles.autoDistributionChannel}>Twitter / X</span>
            <span className={`${styles.autoDistributionStatus} ${xConnection.connected ? styles.autoDistributionStatusConnected : styles.autoDistributionStatusReady}`}>
              {xConnection.loading ? 'Checking...' : xConnection.connected ? `Connected ${xConnection.username ? `@${xConnection.username}` : ''}` : 'Connectable'}
            </span>
          </div>
          <span className={styles.autoDistributionMeta}>Posts, replies, threads, quote-tweet angles.</span>
          <div className={styles.autoDistributionActionRow}>
            <button
              type="button"
              className={styles.autoDistributionConnect}
              onClick={onConnectX}
              disabled={isBusy || xConnection.loading}
            >
              {xConnection.connected ? 'Reconnect X' : 'Connect X'}
            </button>
            {xConnection.error && <span className={styles.autoDistributionError}>{xConnection.error}</span>}
          </div>
        </div>

        <div className={styles.autoDistributionCard}>
          <div className={styles.autoDistributionCardTop}>
            <span className={styles.autoDistributionChannel}>Bluesky</span>
            <span className={`${styles.autoDistributionStatus} ${styles.autoDistributionStatusPending}`}>Draft Only</span>
          </div>
          <span className={styles.autoDistributionMeta}>Posts, starter-pack ideas, conversation hooks.</span>
          <span className={styles.autoDistributionHint}>OAuth or app-password flow still needs to be added.</span>
        </div>
      </div>

      <div className={styles.autoDistributionSection}>
        <span className={styles.autoDistributionLabel}>Campaign Goal</span>
        <div className={styles.autoDistributionPills}>
          {[
            ['launch', 'Launch'],
            ['engagement', 'Engagement'],
            ['ads', 'Ads'],
            ['nurture', 'Nurture'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`${styles.autoDistributionPill} ${goal === value ? styles.autoDistributionPillActive : ''}`}
              onClick={() => setGoal(value as AutoDistributionRequest['goal'])}
              disabled={isBusy}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.autoDistributionSection}>
        <span className={styles.autoDistributionLabel}>Where To Distribute</span>
        <div className={styles.autoDistributionPills}>
          {[
            ['gmail', 'Gmail'],
            ['twitter', 'Twitter / X'],
            ['bluesky', 'Bluesky'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`${styles.autoDistributionPill} ${platforms[value as keyof typeof platforms] ? styles.autoDistributionPillActive : ''}`}
              onClick={() => setPlatforms((prev) => ({ ...prev, [value]: !prev[value as keyof typeof prev] }))}
              disabled={isBusy}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.autoDistributionSection}>
        <span className={styles.autoDistributionLabel}>Generate</span>
        <div className={styles.autoDistributionPills}>
          {[
            ['posts', 'Posts'],
            ['images', 'Images'],
            ['videos', 'Videos'],
            ['ads', 'Ads'],
            ['engagement', 'Engage'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`${styles.autoDistributionPill} ${deliverables[value as keyof typeof deliverables] ? styles.autoDistributionPillActive : ''}`}
              onClick={() => setDeliverables((prev) => ({ ...prev, [value]: !prev[value as keyof typeof prev] }))}
              disabled={isBusy}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.autoDistributionSection}>
        <span className={styles.autoDistributionLabel}>Brief</span>
        <textarea
          className={styles.autoDistributionTextarea}
          placeholder="What are we distributing? Include the offer, audience, tone, and any constraints."
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          disabled={isBusy}
          rows={5}
        />
      </div>

      <div className={styles.autoDistributionFooter}>
        <span className={styles.autoDistributionHint}>
          Unconnected channels will get review-ready drafts and setup recommendations, not live publishing.
        </span>
        <div className={styles.autoDistributionButtons}>
          <button type="button" className={styles.gpuPickerCancel} onClick={onClose} disabled={isBusy}>
            Close
          </button>
          <button type="button" className={styles.gpuPickerProceed} onClick={submit} disabled={isBusy || !brief.trim() || selectedPlatforms.length === 0 || selectedDeliverables.length === 0}>
            Build Campaign
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoDistributionInline;

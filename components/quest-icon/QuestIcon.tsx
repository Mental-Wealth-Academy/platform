'use client';

import React from 'react';
import {
  Sun,
  Heart,
  Brain,
  Plant,
  Sparkle,
  Compass,
  Feather,
  ShieldCheck,
} from '@phosphor-icons/react';
import styles from './QuestIcon.module.css';

export interface QuestThemeDef {
  name: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; weight?: 'bold' | 'duotone' | 'fill' | 'light' | 'regular' | 'thin'; className?: string }>;
}

export const WELLNESS_THEMES: QuestThemeDef[] = [
  {
    name: 'sun',
    label: 'Clarity & Awakening',
    icon: Sun,
  },
  {
    name: 'heart',
    label: 'Emotional Harmony',
    icon: Heart,
  },
  {
    name: 'brain',
    label: 'Mind & Reflection',
    icon: Brain,
  },
  {
    name: 'plant',
    label: 'Habit & Growth',
    icon: Plant,
  },
  {
    name: 'sparkle',
    label: 'Creative Spark',
    icon: Sparkle,
  },
  {
    name: 'compass',
    label: 'Purpose & Direction',
    icon: Compass,
  },
  {
    name: 'feather',
    label: 'Calm & Flow',
    icon: Feather,
  },
  {
    name: 'shield',
    label: 'Inner Sanctuary',
    icon: ShieldCheck,
  },
];

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getWellnessTheme(seedOrIndex: number | string): QuestThemeDef {
  const idx = typeof seedOrIndex === 'number'
    ? Math.abs(seedOrIndex) % WELLNESS_THEMES.length
    : stringToSeed(seedOrIndex) % WELLNESS_THEMES.length;
  return WELLNESS_THEMES[idx];
}

interface QuestIconProps {
  seedOrIndex: number | string;
  size?: number;
  iconSize?: number;
  className?: string;
}

export default function QuestIcon({
  seedOrIndex,
  size = 54,
  iconSize = 26,
  className = '',
}: QuestIconProps) {
  const theme = getWellnessTheme(seedOrIndex);
  const IconComponent = theme.icon;

  return (
    <div
      className={`${styles.iconTile} ${className}`}
      data-theme={theme.name}
      style={{
        width: size,
        height: size,
      }}
      aria-label={theme.label}
      role="img"
    >
      <IconComponent size={iconSize} weight="duotone" className={styles.svgIcon} />
    </div>
  );
}

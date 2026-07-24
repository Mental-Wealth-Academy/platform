'use client';

import React from 'react';
import { CursorClick, X } from '@phosphor-icons/react';
import QuestDetailPanel from '@/components/quest-detail-panel/QuestDetailPanel';
import type { UnifiedQuest } from '@/components/quest-list-panel/QuestListPanel';
import styles from './QuestSidePanel.module.css';

interface QuestSidePanelProps {
  quest?: UnifiedQuest | null;
  onDeselect?: () => void;
}

const KIND_LABEL: Record<string, string> = {
  course: 'Course',
  mission: 'Mission',
  submit: 'Submit',
  social: 'Social',
  custom: 'Custom',
};

export default function QuestSidePanel({ quest, onDeselect }: QuestSidePanelProps) {
  if (quest) {
    return (
      <div className={styles.panel}>
        <div className={styles.listHeader}>
          <span className={styles.listHeaderKind}>{KIND_LABEL[quest.kind] ?? quest.kind}</span>
          <span className={styles.listHeaderQuestTitle}>{quest.title}</span>
          {onDeselect && (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onDeselect}
              aria-label="Back to quest log"
            >
              <X size={13} weight="bold" />
            </button>
          )}
        </div>
        <div className={styles.detailWrap}>
          <QuestDetailPanel quest={quest} onDeselect={onDeselect ?? (() => {})} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.listHeader}>
        <span className={styles.listHeaderTitle}>
          <span className={styles.listHeaderJa}>探索</span> Quest Log
        </span>
      </div>

      <div className={styles.hint}>
        <CursorClick size={16} weight="duotone" className={styles.hintIcon} />
        <span>Pick a quest from the board to see its details and claim rewards.</span>
      </div>
    </div>
  );
}

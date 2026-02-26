'use client';

import { useMemo, type ReactElement } from 'react';
import { extractTemplateData, parseWikiContent } from '@/lib/wiki-parser';
import styles from './WikiContent.module.css';

interface WikiContentProps {
  content: string;
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function getValueClass(key: string, value: unknown): string {
  if (key.toLowerCase() === 'repute' && typeof value === 'string') {
    const lv = value.toLowerCase();
    if (lv === 'bad' || lv === 'pathogenic') return styles.valueBad;
    if (lv === 'good' || lv === 'benign') return styles.valueGood;
  }
  return styles.value;
}

function renderValue(key: string, value: unknown): ReactElement {
  if (value === null || value === undefined) return <span className={styles.valueNA}>N/A</span>;
  if (typeof value === 'boolean') return <span className={styles.value}>{value ? 'Yes' : 'No'}</span>;

  if (typeof value === 'number' || typeof value === 'string') {
    const stringValue = String(value);
    if (key.toLowerCase() === 'magnitude') {
      return <span className={styles.magnitudeValue}>{stringValue}</span>;
    }
    return <span className={getValueClass(key, value)}>{stringValue}</span>;
  }

  if (Array.isArray(value)) {
    return <span className={styles.value}>{value.map((item, idx) => (
      <span key={idx}>{idx > 0 && ', '}{String(item)}</span>
    ))}</span>;
  }

  if (typeof value === 'object') {
    return <TemplateDataRenderer data={value as Record<string, unknown>} nested />;
  }

  return <span className={styles.value}>{String(value)}</span>;
}

function TemplateDataRenderer({ data, nested = false }: { data: Record<string, unknown>; nested?: boolean }) {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return null;

  return (
    <div className={nested ? styles.nestedGrid : styles.templateGrid}>
      {entries.map(([key, value]) => (
        <div key={key} className={styles.templateRow}>
          <span className={styles.templateKey}>{formatKey(key)}</span>
          {renderValue(key, value)}
        </div>
      ))}
    </div>
  );
}

export function WikiContent({ content }: WikiContentProps) {
  const parsedContent = useMemo(() => {
    if (!content) return null;
    const templateData = extractTemplateData(content);
    const parsed = parseWikiContent(content);
    if (!parsed) return null;
    return { templateData, htmlContent: parsed.html || '' };
  }, [content]);

  if (!parsedContent) return null;
  const { templateData, htmlContent } = parsedContent;

  return (
    <div className={styles.wikiContent}>
      {templateData && Object.keys(templateData).length > 0 && (
        <div className={styles.templateBox}>
          <div className={styles.templateTitle}>Template Information</div>
          <TemplateDataRenderer data={templateData} />
        </div>
      )}
      {htmlContent && (
        <div className={styles.htmlContent} dangerouslySetInnerHTML={{ __html: htmlContent }} />
      )}
    </div>
  );
}

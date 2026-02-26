'use client';

import { useState, useCallback, type DragEvent, type ChangeEvent } from 'react';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const SUPPORTED_FORMATS = [
  { name: '23andMe', extensions: '.txt, .csv' },
  { name: 'AncestryDNA', extensions: '.txt, .csv' },
  { name: 'MyHeritage', extensions: '.csv' },
  { name: 'FamilyTreeDNA', extensions: '.csv' },
];

export function FileUpload({ onFileSelect, disabled = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFileSelect(files[0]);
  }, [disabled, onFileSelect]);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) onFileSelect(files[0]);
  }, [onFileSelect]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ''} ${disabled ? styles.dropzoneDisabled : ''}`}
    >
      <input
        type="file"
        id="genetics-file-input"
        accept=".txt,.csv"
        onChange={handleFileInput}
        disabled={disabled}
        className={styles.hiddenInput}
      />
      <label htmlFor="genetics-file-input" className={styles.dropzoneLabel}>
        <div className={styles.uploadIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className={styles.uploadTitle}>
          {isDragging ? 'Drop your DNA file here' : 'Drag & drop your DNA data file'}
        </div>
        <div className={styles.uploadSubtitle}>or click to browse</div>
        <div className={styles.formatsSection}>
          <div className={styles.formatsTitle}>Supported Formats</div>
          <div className={styles.formatsList}>
            {SUPPORTED_FORMATS.map((format) => (
              <div key={format.name} className={styles.formatItem}>
                <span className={styles.formatName}>{format.name}</span>
                <span className={styles.formatExt}>({format.extensions})</span>
              </div>
            ))}
          </div>
          <div className={styles.autoDetect}>Format will be auto-detected</div>
        </div>
      </label>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import {
  ChalkboardTeacher,
  BookOpen,
  Folders,
  Sparkle,
  X,
  UploadSimple,
} from '@phosphor-icons/react';
import { createPortal } from 'react-dom';
import { useSound } from '@/hooks/useSound';
import styles from './LandingPage.module.css';

type TeacherTab = 'course' | 'materials' | 'social';

/** Visual-only upload row. No file handling wired up yet. */
function UploadField({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <label className={styles.teachersUpload}>
      <span className={styles.teachersUploadIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.teachersUploadText}>
        <span className={styles.teachersUploadLabel}>{label}</span>
        <span className={styles.teachersUploadHint}>{hint}</span>
      </span>
      <span className={styles.teachersUploadAction} aria-hidden="true">
        <UploadSimple size={16} weight="bold" />
      </span>
      <input type="file" className={styles.teachersUploadInput} />
    </label>
  );
}

export default function ForTeachersModal() {
  const { play } = useSound();
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<TeacherTab>('course');

  const open = () => {
    play('click');
    setSubmitted(false);
    setActiveTab('course');
    setIsOpen(true);
  };

  const close = () => {
    play('click');
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={open}
        onMouseEnter={() => play('hover')}
        className={`${styles.fancyButton} ${styles.fancyButtonTeachers}`}
      >
        <span className={styles.fancyButtonInner}>
          <span className={styles.fancyButtonIcon} aria-hidden="true">
            <ChalkboardTeacher size={20} weight="regular" />
          </span>
          <span className={styles.heroSlideWrap}>
            <span className={styles.heroSlideText}>For Teachers</span>
            <span className={`${styles.heroSlideText} ${styles.heroSlideClone}`}>For Teachers</span>
          </span>
        </span>
      </button>

      {isOpen && createPortal(
        <div
          className={styles.teachersOverlay}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="For teachers"
        >
          <div className={styles.teachersModal} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.teachersClose}
              onClick={close}
              onMouseEnter={() => play('hover')}
              aria-label="Close"
            >
              <X size={18} weight="bold" />
            </button>

            <div className={styles.teachersHeader}>
              <span className={styles.teachersHeaderIcon} aria-hidden="true">
                <ChalkboardTeacher size={22} weight="fill" />
              </span>
              <div>
                <h2 className={styles.teachersTitle}>Bring your classroom in</h2>
              </div>
            </div>

            {submitted ? (
              <div className={styles.teachersSuccess}>
                <span className={styles.teachersSuccessIcon} aria-hidden="true">
                  <Sparkle size={26} weight="fill" />
                </span>
                <p className={styles.teachersSuccessTitle}>You are on the list</p>
                <p className={styles.teachersSuccessText}>
                  We will reach out to finish setting up your classroom.
                </p>
                <button
                  type="button"
                  className={styles.teachersSubmit}
                  onClick={close}
                  onMouseEnter={() => play('hover')}
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                className={styles.teachersForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  play('click');
                  setSubmitted(true);
                }}
              >
                <div className={styles.teachersTabs} role="tablist" aria-label="Teacher setup sections">
                  {([
                    ['course', 'Course'],
                    ['materials', 'Materials'],
                    ['social', 'Social'],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === id}
                      className={`${styles.teachersTab} ${activeTab === id ? styles.teachersTabActive : ''}`}
                      onClick={() => setActiveTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {activeTab === 'course' && (
                  <div className={styles.teachersFormGrid}>
                    <label className={styles.teachersField}>
                      <span className={styles.teachersFieldLabel}>Organization</span>
                      <input className={styles.teachersInput} name="organization" required />
                    </label>
                    <label className={styles.teachersField}>
                      <span className={styles.teachersFieldLabel}>Work email</span>
                      <input className={styles.teachersInput} name="email" type="email" required />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" name="ferpa" required />
                        <span className={styles.teachersFieldLabel} style={{ marginBottom: 0 }}>I comply with FERPA requirements</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" name="studentData" required />
                        <span className={styles.teachersFieldLabel} style={{ marginBottom: 0 }}>I agree to the Student Data Agreement</span>
                      </label>
                    </div>
                  </div>
                )}
                {activeTab === 'materials' && (
                  <div className={styles.teachersUploads}>
                    <UploadField
                      icon={<BookOpen size={20} weight="regular" />}
                      label="Curriculum"
                      hint="Syllabus or course outline"
                    />
                    <UploadField
                      icon={<Folders size={20} weight="regular" />}
                      label="Materials"
                      hint="Readings, slides, or worksheets"
                    />
                    <UploadField
                      icon={<BookOpen size={20} weight="regular" />}
                      label="Student roster"
                      hint="Names and email addresses"
                    />
                  </div>
                )}
                {activeTab === 'social' && (
                  <label className={styles.teachersField}>
                    <span className={styles.teachersFieldLabel}>Point system</span>
                    <input
                      className={styles.teachersInput}
                      name="pointSystem"
                      defaultValue="Diamonds"
                    />
                  </label>
                )}
                <button
                  type="submit"
                  className={styles.teachersSubmit}
                  onMouseEnter={() => play('hover')}
                >
                  Request access
                </button>
              </form>
            )}
          </div>
        </div>
        ,
        document.body,
      )}
    </>
  );
}

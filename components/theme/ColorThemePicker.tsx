'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSound } from '@/hooks/useSound';
import { useTheme, COLOR_THEMES } from '@/components/theme/ThemeProvider';
import styles from './ColorThemePicker.module.css';

/**
 * Colour theme popover. Holds both the light/dark switch and the accent-hue
 * picker, which lets users tint the whole UI with a calmer palette — an
 * accessibility option for light-sensitive and neurodivergent users. The
 * lightness (light/dark) and hue (colour theme) axes are independent.
 */
const ColorThemePicker: React.FC = () => {
  const { play } = useSound();
  const { theme, toggleTheme, colorTheme, setColorTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const activeLabel = COLOR_THEMES.find((c) => c.id === colorTheme)?.label ?? 'Academy';

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => {
          play('toggle-on');
          setOpen((v) => !v);
        }}
        onMouseEnter={() => play('hover')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Appearance: ${theme} mode, ${activeLabel} colour theme. Change appearance`}
      >
        <span style={{ fontSize: '18px', lineHeight: 1 }} aria-hidden="true">🎨</span>
      </button>

      {open && (
        <div className={styles.popover} role="menu" aria-label="Colour themes">
          <p className={styles.heading}>Appearance</p>
          <div className={styles.modeRow} role="radiogroup" aria-label="Light or dark mode">
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'light'}
              className={`${styles.modeBtn} ${theme === 'light' ? styles.modeActive : ''}`}
              onClick={() => {
                if (theme !== 'light') {
                  play('toggle-on');
                  toggleTheme();
                }
              }}
              onMouseEnter={() => play('hover')}
            >
              Light
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'dark'}
              className={`${styles.modeBtn} ${theme === 'dark' ? styles.modeActive : ''}`}
              onClick={() => {
                if (theme !== 'dark') {
                  play('toggle-on');
                  toggleTheme();
                }
              }}
              onMouseEnter={() => play('hover')}
            >
              Dark
            </button>
          </div>

          <p className={styles.heading}>Colour theme</p>
          <div className={styles.grid}>
            {COLOR_THEMES.map((c) => {
              const active = c.id === colorTheme;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  className={`${styles.swatchBtn} ${active ? styles.swatchActive : ''}`}
                  onClick={() => {
                    play('toggle-on');
                    setColorTheme(c.id);
                  }}
                  onMouseEnter={() => play('hover')}
                >
                  <span
                    className={styles.swatch}
                    data-color={c.id === 'default' ? 'academy' : c.id}
                    aria-hidden="true"
                  />
                  <span className={styles.swatchLabel}>{c.label}</span>
                </button>
              );
            })}
          </div>
          <p className={styles.hint}>Softer palettes reduce visual strain.</p>
        </div>
      )}
    </div>
  );
};

export default ColorThemePicker;

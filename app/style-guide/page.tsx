'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  Info,
  Warning,
  XCircle,
} from '@phosphor-icons/react';
import CtaButton from '@/components/shared/CtaButton';
import { COLOR_THEMES, type ColorTheme } from '@/components/theme/ThemeProvider';
import styles from './page.module.css';

type ColorToken = {
  label: string;
  token: string;
  role: string;
  foreground?: string;
};

const coreColors: ColorToken[] = [
  { label: 'Canvas', token: '--color-canvas', role: 'Single light-mode foundation' },
  { label: 'Academy Blue', token: '--color-brand', role: 'Brand marks and signature moments' },
  { label: 'Action Blue', token: '--color-action', role: 'Primary controls and links', foreground: '--color-on-action' },
  { label: 'Growth Emerald', token: '--color-positive', role: 'Mastery, progress, and completed states', foreground: '--color-on-positive' },
  { label: 'Study Violet', token: '--color-accent', role: 'Restrained secondary emphasis', foreground: '--color-on-accent' },
  { label: 'Blackpill Text', token: '--color-text-dark', role: 'Primary text and precise detail' },
];

const semanticColors: ColorToken[] = [
  { label: 'Action', token: '--color-action', role: 'Interactive emphasis', foreground: '--color-on-action' },
  { label: 'Positive', token: '--color-positive', role: 'Completed, earned, approved', foreground: '--color-on-positive' },
  { label: 'Accent', token: '--color-accent', role: 'Secondary emphasis', foreground: '--color-on-accent' },
  { label: 'Warning', token: '--color-warning', role: 'A condition that needs attention', foreground: '--color-on-warning' },
  { label: 'Danger', token: '--color-danger', role: 'Destructive or failed state', foreground: '--color-on-danger' },
];

const surfaceColors: ColorToken[] = [
  { label: 'Canvas', token: '--color-canvas', role: 'Page foundation' },
  { label: 'Surface one', token: '--color-surface-1', role: 'Cards and panels' },
  { label: 'Surface two', token: '--color-surface-2', role: 'Nested and selected regions' },
  { label: 'Surface three', token: '--color-surface-3', role: 'Strongest surface separation' },
  { label: 'Inverse surface one', token: '--color-inverse-surface-1', role: 'Quiet glass on dark or brand fields' },
  { label: 'Inverse surface two', token: '--color-inverse-surface-2', role: 'Cards on dark or brand fields' },
  { label: 'Inverse surface three', token: '--color-inverse-surface-3', role: 'Selected cards on dark or brand fields' },
  { label: 'Subtle border', token: '--color-border-subtle', role: 'Quiet boundaries' },
  { label: 'Strong border', token: '--color-border-strong', role: 'Interactive boundaries' },
];

const typeSamples = [
  { name: 'Display', className: 'type-display', copy: 'Mental Wealth Academy' },
  { name: 'Heading one', className: 'type-h1', copy: 'Build mental wealth deliberately' },
  { name: 'Heading two', className: 'type-h2', copy: 'Study, practice, and reflect' },
  { name: 'Heading three', className: 'type-h3', copy: 'A clear section title' },
  { name: 'Body large', className: 'type-body-lg', copy: 'Long-form lessons use a calm rhythm and a comfortable measure.' },
  { name: 'Body', className: 'type-body', copy: 'Interface copy stays direct, academic, and readable.' },
  { name: 'Caption', className: 'type-caption', copy: 'Updated after the latest review' },
  { name: 'Label', className: 'type-label', copy: 'Module label' },
] as const;

const spaces = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-6', '--space-8', '--space-12', '--space-16'];
const radii = ['--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-2xl', '--radius-full'];

export default function StyleGuidePage() {
  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Academy design system</p>
          <h1 className={styles.title}>One visual language</h1>
          <p className={styles.subtitle}>
            Live tokens, accessible pairings, typography, and canonical controls. The color values on this page resolve directly from <code>styles/color-system.css</code>.
          </p>
        </header>

        <GuideSection title="Core palette" description="A compact foundation with one canvas and three purposeful chromatic roles.">
          <div className={styles.colorGrid}>
            {coreColors.map((color) => <TokenSwatch key={color.token} {...color} />)}
          </div>
        </GuideSection>

        <GuideSection title="Semantic roles" description="Components consume roles. Palette names stay inside the token source.">
          <div className={styles.colorGrid}>
            {semanticColors.map((color) => <TokenSwatch key={color.label} {...color} />)}
          </div>
          <div className={styles.statusRow}>
            <StatusSample icon={<CheckCircle />} label="Approved" tone="positive" />
            <StatusSample icon={<Info />} label="Information" tone="action" />
            <StatusSample icon={<Warning />} label="Needs attention" tone="warning" />
            <StatusSample icon={<XCircle />} label="Failed" tone="danger" />
          </div>
        </GuideSection>

        <GuideSection title="Surfaces" description="The canvas is the only light foundation. Elevated surfaces are derived from it.">
          <div className={styles.colorGrid}>
            {surfaceColors.map((color) => <TokenSwatch key={color.token} {...color} />)}
          </div>
        </GuideSection>

        <GuideSection title="Theme spectrum" description="Every optional accent theme is shown in light and dark mode with the shared positive and accent roles.">
          <div className={styles.themeGrid}>
            {COLOR_THEMES.map((theme) => (
              <ThemePair key={theme.id} theme={theme.id} label={theme.label} />
            ))}
          </div>
        </GuideSection>

        <GuideSection title="Typography" description="Labels remain small text for contrast testing, regardless of weight or letter case.">
          <div className={styles.typeList}>
            {typeSamples.map((sample) => (
              <div className={styles.typeSample} key={sample.name}>
                <div className={styles.sampleMeta}>
                  <span>{sample.name}</span>
                  <code>.{sample.className}</code>
                </div>
                <div className={sample.className}>{sample.copy}</div>
              </div>
            ))}
          </div>
        </GuideSection>

        <GuideSection title="Spacing and shape" description="Use shared spacing and radius variables before introducing a local value.">
          <div className={styles.scaleColumns}>
            <div className={styles.scaleCard}>
              <h3>Spacing</h3>
              {spaces.map((space) => (
                <div className={styles.spaceRow} key={space}>
                  <code>{space}</code>
                  <span className={styles.spaceBar} style={{ width: `var(${space})` }} />
                </div>
              ))}
            </div>
            <div className={styles.scaleCard}>
              <h3>Radius</h3>
              <div className={styles.radiusGrid}>
                {radii.map((radius) => (
                  <div key={radius} className={styles.radiusItem}>
                    <span style={{ borderRadius: `var(${radius})` }} />
                    <code>{radius}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GuideSection>

        <GuideSection title="Canonical actions" description="Use CtaButton for product actions. Its semantic colors are protected by contrast tests.">
          <div className={styles.buttonGrid}>
            <CtaButton>Primary action</CtaButton>
            <CtaButton variant="secondary">Secondary action</CtaButton>
            <CtaButton variant="ghost">Quiet action</CtaButton>
            <CtaButton disabled>Disabled action</CtaButton>
          </div>
          <div className={styles.formPreview}>
            <label>
              <span>Course title</span>
              <input defaultValue="Creative Healing" />
            </label>
            <CtaButton size="sm">Continue <ArrowRight aria-hidden="true" /></CtaButton>
          </div>
        </GuideSection>

        <GuideSection title="Usage rules" description="These constraints keep new work aligned while legacy colors are migrated.">
          <ul className={styles.rules}>
            <li>Use semantic color roles in component CSS.</li>
            <li>Keep Academy Blue for brand marks and signature moments.</li>
            <li>Use indigo for rewards, completion, and positive states.</li>
            <li>Reserve gold and red for meaningful warning and danger states.</li>
            <li>Run <code>npm run lint:design</code> and the contrast suite before shipping visual changes.</li>
          </ul>
        </GuideSection>
      </div>
    </main>
  );
}

function GuideSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function TokenSwatch({ label, token, role, foreground }: ColorToken) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      setValue(getComputedStyle(ref.current).getPropertyValue(token).trim());
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-color'] });
    return () => observer.disconnect();
  }, [token]);

  return (
    <div className={styles.colorCard} ref={ref}>
      <div
        className={styles.colorSwatch}
        style={{
          background: `var(${token})`,
          color: foreground ? `var(${foreground})` : 'var(--color-text-dark)',
        }}
      >
        {foreground ? <span>Aa</span> : null}
      </div>
      <div className={styles.colorInfo}>
        <strong>{label}</strong>
        <p>{role}</p>
        <code>{token}</code>
        <span className={styles.computedValue}>{value}</span>
      </div>
    </div>
  );
}

function ThemePair({ theme, label }: { theme: ColorTheme; label: string }) {
  const color = theme === 'default' ? 'academy' : theme;
  return (
    <article className={styles.themePair}>
      <h3>{label}</h3>
      <div className={styles.themeModes}>
        <ThemePreview color={color} mode="light" />
        <ThemePreview color={color} mode="dark" />
      </div>
    </article>
  );
}

function ThemePreview({ color, mode }: { color: string; mode: 'light' | 'dark' }) {
  return (
    <div className={styles.themePreview} data-color={color} data-theme={mode}>
      <div className={styles.themePreviewTop}>
        <span>{mode}</span>
        <span className={styles.themeAction}>Action</span>
      </div>
      <div className={styles.themeSurface}>
        <span className={styles.themePositive}>Positive</span>
        <span className={styles.themeAccent}>Accent</span>
      </div>
    </div>
  );
}

function StatusSample({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: 'positive' | 'action' | 'warning' | 'danger' }) {
  return <span className={`${styles.status} ${styles[tone]}`}>{icon}{label}</span>;
}

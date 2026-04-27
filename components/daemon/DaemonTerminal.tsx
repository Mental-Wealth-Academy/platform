'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import styles from './DaemonTerminal.module.css';

type Mode = 'rewrite' | 'tone' | 'critique' | 'summarize';
type Tone = 'concise' | 'warm' | 'formal' | 'friendly' | 'direct';
type View = 'toolGrid' | 'terminal' | 'editAgents';
type Agent = 'blue' | 'guy';

const ICON_ARROW = '/icons/ui-arrow.svg';

// Compound Components
function ToolCard({
  title,
  desc,
  icon,
  disabled = false,
  variant,
  onClick
}: {
  title: string;
  desc: string;
  icon?: string;
  disabled?: boolean;
  variant?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.toolCard} ${variant ? styles[variant] : ''} ${disabled ? styles.toolCardDisabled : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className={styles.toolInner}>
        {icon && (
          <Image
            src={icon}
            alt=""
            width={24}
            height={24}
            className={styles.toolIcon}
          />
        )}
        <h1 className={styles.toolTitle}>{title}</h1>
        <div className={styles.toolDesc}>{desc}</div>
      </div>
    </button>
  );
}

function ActionCard({ 
  title, 
  desc, 
  active = false, 
  onClick 
}: { 
  title: string; 
  desc: string; 
  active?: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.actionCard} ${active ? styles.actionCardActive : ''}`}
      onClick={onClick}
    >
      <div className={styles.actionTitle}>{title}</div>
      <div className={styles.actionDesc}>{desc}</div>
    </button>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.label}>{label}</div>
      {children}
    </div>
  );
}

function Button({ 
  variant = 'secondary', 
  children, 
  onClick, 
  disabled = false 
}: { 
  variant?: 'primary' | 'secondary'; 
  children: React.ReactNode; 
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function DaemonTerminal() {
  const [view, setView] = useState<View>('toolGrid');
  const [mode, setMode] = useState<Mode>('rewrite');
  const [tone, setTone] = useState<Tone>('warm');
  const [contextEmail, setContextEmail] = useState('');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const modeCards = useMemo(
    () =>
      [
        { id: 'rewrite' as const, title: 'Polish', desc: 'Clean up and organize.' },
        { id: 'tone' as const, title: 'Tone Shift', desc: 'Change voice, keep meaning.' },
        { id: 'critique' as const, title: 'Critique', desc: 'Clarity + structure notes.' },
        { id: 'summarize' as const, title: 'Summarize', desc: 'Key points + next steps.' },
      ],
    []
  );

  const agents = useMemo(
    () => [
      {
        id: 'blue' as const,
        name: 'Blue',
        desc: 'Warm and supportive AI companion focused on emotional wellness.',
        avatar: 'https://i.imgur.com/1q1EfBX.png',
      },
      {
        id: 'guy' as const,
        name: 'Guy',
        desc: 'Direct and practical AI assistant for productivity and clarity.',
        avatar: 'https://i.imgur.com/9Wvq3Rm.png',
      },
    ],
    []
  );

  async function runDaemon() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/daemon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, tone, input, contextEmail }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Daemon request failed');

      setOutput(String(data?.output || ''));
    } catch (e: any) {
      setError(e?.message || 'Failed to run Daemon');
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      // ignore
    }
  }

  return (
    <section className={styles.terminal}>
      <div className={styles.terminalHeader}>
        <div className={styles.headerLeft} aria-hidden="true">
          <div className={styles.dots}>
            <div className={`${styles.dot} ${styles.dotRed}`} />
            <div className={`${styles.dot} ${styles.dotYellow}`} />
            <div className={`${styles.dot} ${styles.dotGreen}`} />
          </div>
        </div>
        <div className={styles.headerTitle}>Mental Wealth AI</div>
        <div className={styles.headerRight}>
          {view !== 'toolGrid' ? (
            <button
              type="button"
              className={styles.backButton}
              onClick={() => setView('toolGrid')}
              aria-label="Back"
            >
              <Image
                src={ICON_ARROW}
                alt=""
                width={18}
                height={18}
                className={styles.backArrow}
              />
              <span className={styles.backText}>BACK</span>
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}
        </div>
      </div>

      {view === 'toolGrid' && (
        <div className={styles.toolGridWrap}>
          <div className={styles.toolGrid}>
            <ToolCard
              title="Text Helper"
              desc="Polish your drafts with ease."
              icon="/icons/mental-health.svg"
              variant="toolCardReviser"
              onClick={() => setView('terminal')}
            />
            <ToolCard
              title="Edit Agents"
              desc="Configure your AI companions."
              icon="/icons/daemon.svg"
              variant="toolCardEditAgents"
              onClick={() => setView('editAgents')}
            />
            <ToolCard
              title="Share Sheets"
              desc="Shared spreadsheets for MWA researchers."
              icon="/icons/ui-book.svg"
              variant="toolCardShareSheets"
              disabled
            />
            <ToolCard
              title="Dream Reader"
              desc="Study your unique Daemon."
              icon="/icons/ui-eye.svg"
              variant="toolCardDreamReader"
              disabled
            />
          </div>
        </div>
      )}

      {view === 'terminal' && (
        <div className={styles.centerPanelEnter}>
          <div className={styles.centerPanel}>
            <div className={styles.actionGrid}>
              {modeCards.map((c) => (
                <ActionCard
                  key={c.id}
                  title={c.title}
                  desc={c.desc}
                  active={mode === c.id}
                  onClick={() => setMode(c.id)}
                />
              ))}
            </div>

            <div className={styles.chat}>
              <FormRow label="Tone">
                <select
                  className={`${styles.field} ${styles.select}`}
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                >
                  <option value="concise">Concise</option>
                  <option value="warm">Warm</option>
                  <option value="formal">Formal</option>
                  <option value="friendly">Friendly</option>
                  <option value="direct">Direct</option>
                </select>
              </FormRow>

              {mode !== 'rewrite' && (
                <FormRow label="Context">
                  <textarea
                    className={`${styles.field} ${styles.textarea}`}
                    value={contextEmail}
                    onChange={(e) => setContextEmail(e.target.value)}
                    placeholder="Optional: paste the email you're replying to…"
                  />
                </FormRow>
              )}

              <FormRow label="Input">
                <textarea
                  className={`${styles.field} ${styles.textarea}`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste text to refine…"
                />
              </FormRow>

              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setContextEmail('');
                    setInput('');
                    setOutput('');
                    setError(null);
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="primary"
                  onClick={runDaemon}
                  disabled={loading}
                >
                  <Image
                    src="/icons/ui-coin.svg"
                    alt="Daemon"
                    width={16}
                    height={16}
                    className={styles.shardIcon}
                  />
                  <span>{loading ? 'Generating…' : 'Generate'}</span>
                  <span className={styles.rewardText}>(+30)</span>
                </Button>
              </div>

              <div className={styles.output}>
                <div className={styles.outputHeader}>
                  <div className={styles.outputTitle}>Output</div>
                  <Button
                    variant="secondary"
                    onClick={copyOutput}
                    disabled={!output}
                  >
                    Copy
                  </Button>
                </div>
                <div className={styles.outputBody}>{output || 'Your output will appear here.'}</div>
              </div>

              {error && <div className={styles.error}>{error}</div>}
            </div>
          </div>
        </div>
      )}

      {view === 'editAgents' && (
        <div className={styles.centerPanelEnter}>
          <div className={styles.centerPanel}>
            <div className={styles.agentHeader}>
              <h2 className={styles.agentTitle}>Select an Agent to Configure</h2>
              <p className={styles.agentSubtitle}>Choose your AI companion to customize their behavior and personality.</p>
            </div>
            <div className={styles.agentGrid}>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  className={`${styles.agentCard} ${selectedAgent === agent.id ? styles.agentCardActive : ''}`}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                  <div className={styles.agentAvatar}>
                    <Image
                      src={agent.avatar}
                      alt={agent.name}
                      width={64}
                      height={64}
                    />
                  </div>
                  <div className={styles.agentInfo}>
                    <h3 className={styles.agentName}>{agent.name}</h3>
                    <p className={styles.agentDesc}>{agent.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {selectedAgent && (
              <div className={styles.agentConfigSection}>
                <div className={styles.agentConfigHeader}>
                  <h3 className={styles.agentConfigTitle}>
                    Configuring {agents.find(a => a.id === selectedAgent)?.name}
                  </h3>
                </div>
                <div className={styles.agentConfigPlaceholder}>
                  Agent configuration options coming soon.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

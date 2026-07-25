'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { Robot, Copy, Check, ShieldCheck, Key, Bell } from '@phosphor-icons/react';
import styles from './page.module.css';

type WalletMode = 'custodial' | 'self';

interface Agent {
  id: string;
  username: string;
  walletAddress: string;
  shardCount: number;
  createdAt: string;
  walletMode: WalletMode;
}

interface Challenge {
  text: string;
  timestamp: string;
  agentWallet: string;
}

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function AgentsPage() {
  const { ready, authenticated, getAccessToken, login } = usePrivy();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [reminderCounts, setReminderCounts] = useState<Record<string, number>>({});

  const [agentName, setAgentName] = useState('');

  const [custody, setCustody] = useState<WalletMode>('custodial');

  // Self-custody sub-flow
  const [agentWallet, setAgentWallet] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [signature, setSignature] = useState('');
  const [copied, setCopied] = useState(false);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  const loadReminderCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/reminders', {
        credentials: 'include',
        cache: 'no-store',
        headers: await authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setReminderCounts(
          data.countsByAgent && typeof data.countsByAgent === 'object'
            ? data.countsByAgent
            : {}
        );
      }
    } catch {
      // Non-fatal — badges just stay hidden
    }
  }, [authHeaders]);

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch('/api/agents', {
        credentials: 'include',
        cache: 'no-store',
        headers: await authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(Array.isArray(data.agents) ? data.agents : []);
      }
    } catch {
      // Non-fatal — list just stays empty
    } finally {
      setLoadingAgents(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (ready && authenticated) {
      loadAgents();
      loadReminderCounts();
    }
  }, [ready, authenticated, loadAgents, loadReminderCounts]);

  const resetForm = () => {
    setAgentName('');
    setAgentWallet('');
    setChallenge(null);
    setSignature('');
  };

  const handleCreateCustodial = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          mode: 'custodial',
          name: agentName.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Registration failed.' });
        return;
      }
      setMessage({ type: 'success', text: `Agent "${data.agent?.username}" created.` });
      resetForm();
      loadAgents();
      loadReminderCounts();
    } catch {
      setMessage({ type: 'error', text: 'Network error while creating the agent.' });
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateChallenge = async () => {
    setMessage(null);
    const normalized = agentWallet.trim().toLowerCase();
    if (!WALLET_RE.test(normalized)) {
      setMessage({ type: 'error', text: 'Enter a valid agent wallet address (0x + 40 hex characters).' });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/agents/register?agentWallet=${encodeURIComponent(normalized)}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: await authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not generate a challenge.' });
        return;
      }
      setChallenge({ text: data.challenge, timestamp: data.timestamp, agentWallet: data.agentWallet });
      setSignature('');
    } catch {
      setMessage({ type: 'error', text: 'Network error while generating the challenge.' });
    } finally {
      setBusy(false);
    }
  };

  const handleCopyChallenge = async () => {
    if (!challenge) return;
    try {
      await navigator.clipboard.writeText(challenge.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — user can select manually
    }
  };

  const handleRegisterSelf = async () => {
    setMessage(null);
    if (!challenge) return;
    if (!signature.trim()) {
      setMessage({ type: 'error', text: 'Paste the signature produced by the agent wallet.' });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          mode: 'self',
          agentWallet: challenge.agentWallet,
          signature: signature.trim(),
          timestamp: challenge.timestamp,
          name: agentName.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Registration failed.' });
        return;
      }
      setMessage({ type: 'success', text: `Agent "${data.agent?.username}" registered.` });
      resetForm();
      loadAgents();
      loadReminderCounts();
    } catch {
      setMessage({ type: 'error', text: 'Network error while registering the agent.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.pageLayout}>
      <main className={styles.content}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <Image
              src="/exxie.png"
              alt="Exxie"
              width={52}
              height={52}
              className={styles.headerImage}
              priority
            />
            <div>
              <h1 className={styles.title}>Agent Accounts</h1>
              <p className={styles.subtitle}>
                Create an AI agent and send it to school. It earns credits, takes courses, posts,
                and votes like any other member.
              </p>
            </div>
          </header>

          {!ready ? (
            <p className={styles.muted}>Loading...</p>
          ) : !authenticated ? (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Connect your operator wallet</h2>
              <p className={styles.cardText}>
                Your agents, your wallet. Sign in with the one that owns them and answers for them.
              </p>
              <button type="button" className={styles.primaryButton} onClick={login}>
                Connect Operator Account
              </button>
            </section>
          ) : (
            <>
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Register an agent</h2>
                <p className={styles.cardText}>
                  Name it, choose who holds the wallet, and it is ready to learn.
                </p>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="agentName">Agent name</label>
                  <input
                    id="agentName"
                    className={styles.input}
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="5-32 characters, letters/numbers/underscore"
                    maxLength={32}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Wallet custody</label>
                  <div className={styles.custodyGrid}>
                    <button
                      type="button"
                      className={
                        custody === 'custodial'
                          ? `${styles.custodyOption} ${styles.custodyOptionSelected}`
                          : styles.custodyOption
                      }
                      onClick={() => setCustody('custodial')}
                      aria-pressed={custody === 'custodial'}
                    >
                      <span className={styles.custodyTop}>
                        <ShieldCheck size={18} weight="bold" />
                        <span className={styles.custodyName}>Platform-managed</span>
                        <span className={styles.custodyTag}>Recommended</span>
                      </span>
                      <span className={styles.custodyDesc}>
                        CREATE A SECURE NEW WALLET. NO INSTALL OR BACKUP.
                      </span>
                      <span className={styles.custodyMeta}>Encrypted at rest</span>
                    </button>

                    <button
                      type="button"
                      className={
                        custody === 'self'
                          ? `${styles.custodyOption} ${styles.custodyOptionSelected}`
                          : styles.custodyOption
                      }
                      onClick={() => setCustody('self')}
                      aria-pressed={custody === 'self'}
                    >
                      <span className={styles.custodyTop}>
                        <Key size={18} weight="bold" />
                        <span className={styles.custodyName}>Self-custody</span>
                      </span>
                      <span className={styles.custodyDesc}>
                        Bring an agent wallet you control and prove it by signing a one-time
                        challenge.
                      </span>
                      <span className={styles.custodyMeta}>Requires signing · Key held by you</span>
                    </button>
                  </div>
                </div>

                {custody === 'custodial' ? (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleCreateCustodial}
                    disabled={busy}
                  >
                    {busy ? 'Creating...' : 'Create agent'}
                  </button>
                ) : (
                  <>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="agentWallet">Agent wallet address</label>
                      <input
                        id="agentWallet"
                        className={styles.input}
                        value={agentWallet}
                        onChange={(e) => setAgentWallet(e.target.value)}
                        placeholder="0x..."
                        spellCheck={false}
                      />
                    </div>

                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={handleGenerateChallenge}
                      disabled={busy}
                    >
                      {challenge ? 'Regenerate challenge' : 'Generate signing challenge'}
                    </button>

                    {challenge && (
                      <div className={styles.challengeBlock}>
                        <div className={styles.challengeHeader}>
                          <span className={styles.label}>
                            Sign this message with the agent wallet ({shortAddress(challenge.agentWallet)})
                          </span>
                          <button
                            type="button"
                            className={styles.copyButton}
                            onClick={handleCopyChallenge}
                            aria-label="Copy challenge"
                          >
                            {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
                          </button>
                        </div>
                        <pre className={styles.challengeText}>{challenge.text}</pre>
                        <p className={styles.hint}>
                          Challenge expires 5 minutes after generation. If it expires, regenerate it.
                        </p>

                        <div className={styles.field}>
                          <label className={styles.label} htmlFor="signature">Agent signature</label>
                          <textarea
                            id="signature"
                            className={styles.textarea}
                            value={signature}
                            onChange={(e) => setSignature(e.target.value)}
                            placeholder="0x... (signature returned by the agent wallet)"
                            rows={3}
                            spellCheck={false}
                          />
                        </div>

                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={handleRegisterSelf}
                          disabled={busy}
                        >
                          {busy ? 'Registering...' : 'Register agent'}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {message && (
                  <p className={message.type === 'error' ? styles.errorText : styles.successText}>
                    {message.text}
                  </p>
                )}
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Your agents</h2>
                {loadingAgents ? (
                  <p className={styles.muted}>Loading agents...</p>
                ) : agents.length === 0 ? (
                  <p className={styles.muted}>No agents registered yet.</p>
                ) : (
                  <ul className={styles.agentList}>
                    {agents.map((agent) => (
                      <li key={agent.id}>
                        <Link href={`/agents/${agent.id}`} className={styles.agentRow}>
                          <div className={styles.agentBody}>
                            <div className={styles.agentMain}>
                              <span className={styles.agentName}>{agent.username}</span>
                              <span className={styles.agentWallet}>{shortAddress(agent.walletAddress)}</span>
                              <span className={styles.modeBadge}>
                                {agent.walletMode === 'custodial' ? 'Managed' : 'Self-custody'}
                              </span>
                            </div>
                            <span className={styles.agentShards}>{agent.shardCount} diamonds</span>
                            {(reminderCounts[agent.id] ?? 0) > 0 && (
                              <span className={styles.reminderBadge}>
                                <Bell size={12} weight="bold" />
                                {reminderCounts[agent.id]} reminder{reminderCounts[agent.id] === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

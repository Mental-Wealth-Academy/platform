'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Flag,
  PencilSimple,
  Stack,
  Sparkle,
} from '@phosphor-icons/react';
import { usePrivy } from '@privy-io/react-auth';
import { useSound } from '@/hooks/useSound';
import DiamondReward from '@/components/rewards/DiamondReward';
import type { AssemblyTreeResponse } from '@/lib/guide-api-schemas';
import type { AssemblySectionView, AssemblyVerdict } from '@/lib/guide-assembly-db';
import frame from '../page.module.css';
import styles from './assemble.module.css';

type PageProps = { params: { slug: string } };

type Phase = 'intro' | 'play' | 'summary';

interface FlatAxiom {
  id: string;
  statement: string;
  sectionLabel: string;
  approveCount: number;
  flagCount: number;
}

function flatten(sections: AssemblySectionView[]): FlatAxiom[] {
  const out: FlatAxiom[] = [];
  sections.forEach((section, i) => {
    const label = section.label?.trim() || `Passage ${i + 1}`;
    for (const axiom of section.axioms) {
      out.push({
        id: axiom.id,
        statement: axiom.statement,
        sectionLabel: label,
        approveCount: axiom.approveCount,
        flagCount: axiom.flagCount,
      });
    }
  });
  return out;
}

export default function GuideAssemblePage({ params }: PageProps) {
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const { play } = useSound();

  const [data, setData] = useState<AssemblyTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [verdicts, setVerdicts] = useState<Record<string, AssemblyVerdict>>({});
  const [suggested, setSuggested] = useState<Record<string, string>>({});
  const [isVip, setIsVip] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [showReward, setShowReward] = useState(false);

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const token = await getAccessToken().catch(() => null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  // Load the decomposition + the caller's existing verdicts (resume support).
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const headers = authenticated ? await authHeaders() : {};
        const res = await fetch(`/api/guides/${params.slug}/assembly`, {
          cache: 'no-store',
          headers,
        });
        if (!res.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const json = (await res.json()) as AssemblyTreeResponse;
        if (cancelled) return;
        setData(json);
        setClaimed(json.claimed);

        const seeded: Record<string, AssemblyVerdict> = {};
        for (const section of json.sections as AssemblySectionView[]) {
          for (const axiom of section.axioms) {
            if (axiom.verdict) seeded[axiom.id] = axiom.verdict;
          }
        }
        setVerdicts(seeded);

        // Resume where the learner left off.
        const flat = flatten(json.sections as AssemblySectionView[]);
        const answered = flat.filter((a) => seeded[a.id]).length;
        if (json.available && answered > 0) {
          if (answered >= flat.length) {
            setPhase('summary');
          } else {
            setPhase('play');
            const firstUnanswered = flat.findIndex((a) => !seeded[a.id]);
            setIndex(firstUnanswered < 0 ? 0 : firstUnanswered);
          }
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, params.slug, authHeaders]);

  // VIP membership unlocks suggesting rewrites instead of plain flags.
  useEffect(() => {
    if (!ready || !authenticated) {
      setIsVip(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/membership/holding-status', {
          credentials: 'include',
          headers: await authHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setIsVip(!!json.hasVipMembershipCard);
        }
      } catch {
        /* silent: non-VIP experience is the safe default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, authHeaders]);

  const axioms = useMemo(
    () => (data ? flatten(data.sections as AssemblySectionView[]) : []),
    [data],
  );
  const answeredCount = axioms.filter((a) => verdicts[a.id]).length;
  const allAnswered = axioms.length > 0 && answeredCount >= axioms.length;

  const submitVerdict = useCallback(
    async (axiom: FlatAxiom, verdict: AssemblyVerdict) => {
      if (!authenticated) {
        login();
        return;
      }
      setPending(true);
      setError(null);
      try {
        const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
        const res = await fetch(`/api/guides/${params.slug}/assembly/verdict`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nodeId: axiom.id, verdict }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || 'Could not record that. Try again.');
        }
        play(verdict === 'approve' ? 'click' : 'soft-hover');
        setVerdicts((prev) => ({ ...prev, [axiom.id]: verdict }));
        // Advance to the next card, or to the summary when this was the last.
        setIndex((i) => {
          const next = i + 1;
          if (next >= axioms.length) {
            setPhase('summary');
            return i;
          }
          return next;
        });
      } catch (err: any) {
        setError(err?.message ?? 'Something went wrong.');
      } finally {
        setPending(false);
      }
    },
    [authenticated, login, authHeaders, params.slug, axioms.length, play],
  );

  // VIP path: propose a rewrite for Blue to fold into the guide. Server
  // records a flag verdict + the suggestion atomically, so progress advances
  // exactly like a plain verdict.
  const submitSuggestion = useCallback(
    async (axiom: FlatAxiom, suggestion: string) => {
      if (!authenticated) {
        login();
        return false;
      }
      setPending(true);
      setError(null);
      try {
        const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
        const res = await fetch(`/api/guides/${params.slug}/assembly/suggest`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nodeId: axiom.id, suggestion }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || 'Could not send that rewrite. Try again.');
        }
        play('success');
        setVerdicts((prev) => ({ ...prev, [axiom.id]: 'flag' }));
        setSuggested((prev) => ({ ...prev, [axiom.id]: suggestion }));
        setIndex((i) => {
          const next = i + 1;
          if (next >= axioms.length) {
            setPhase('summary');
            return i;
          }
          return next;
        });
        return true;
      } catch (err: any) {
        setError(err?.message ?? 'Something went wrong.');
        return false;
      } finally {
        setPending(false);
      }
    },
    [authenticated, login, authHeaders, params.slug, axioms.length, play],
  );

  const claim = useCallback(async () => {
    setClaiming(true);
    setError(null);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const res = await fetch(`/api/guides/${params.slug}/assembly/complete`, {
        method: 'POST',
        headers,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || 'Could not claim right now.');
      }
      if (body.awarded && body.diamonds > 0) {
        setRewardAmount(body.diamonds);
        setShowReward(true);
        setClaimed(true);
      } else if (body.alreadyClaimed) {
        setClaimed(true);
      } else if (body.reason === 'incomplete') {
        setError('A few axioms still need a verdict.');
        const firstUnanswered = axioms.findIndex((a) => !verdicts[a.id]);
        setIndex(firstUnanswered < 0 ? 0 : firstUnanswered);
        setPhase('play');
      } else if (body.reason === 'too_fast') {
        setError('Take a moment with each axiom, then claim.');
      } else if (body.reason === 'author') {
        setError('This is your guide, so there is no reward for reviewing it.');
      } else {
        setError('Reward is not available for this pass.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.');
    } finally {
      setClaiming(false);
    }
  }, [authHeaders, params.slug, axioms, verdicts]);

  // ── Render ───────────────────────────────────────────────────────────────
  const backHref = `/learn/guides/${params.slug}`;

  return (
    <div className={frame.layout}>
      <main className={frame.page}>
        <Link href={backHref} className={frame.back}>
          <ArrowLeft size={16} weight="bold" /> Back to guide
        </Link>

        {loading && <div className={frame.state}>Decomposing the guide…</div>}
        {notFound && !loading && <div className={frame.state}>Guide not found.</div>}

        {data && !loading && !notFound && (
          <>
            <header className={styles.header}>
              <span className={styles.kicker}>
                <Stack size={13} weight="bold" /> Assembly
              </span>
              <h1 className={frame.title}>{data.guide.topicTitle}</h1>
            </header>

            {!data.available ? (
              <div className={styles.notice}>
                {data.reason === 'empty'
                  ? 'This guide does not have enough written material to break into axioms yet.'
                  : 'This guide is not published yet, so it cannot be assembled.'}
              </div>
            ) : phase === 'intro' ? (
              <section className={styles.intro}>
                <p className={styles.introLede}>
                  Every guide is built from smaller claims. Here you take this guide apart into its{' '}
                  {data.axiomCount} axioms and rebuild it, one claim at a time. Keep each claim that
                  holds up{isVip
                    ? ', or rewrite any that read wrong and Blue folds the good rewrites back into the guide'
                    : ', or mark any that need another look'}. The progress bar tracks every judgment,
                  and the diamonds at the end of it are yours when the rebuild is done.
                </p>
                <div className={styles.rewardChip}>
                  <Sparkle size={14} weight="fill" />
                  {data.isAuthor
                    ? 'You wrote this guide, so this pass earns no diamonds.'
                    : claimed
                      ? 'You have already earned the diamonds for this guide.'
                      : `Finish the pass to earn +${data.reward} diamonds.`}
                </div>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => {
                    play('click');
                    setPhase('play');
                    const firstUnanswered = axioms.findIndex((a) => !verdicts[a.id]);
                    setIndex(firstUnanswered < 0 ? 0 : firstUnanswered);
                  }}
                >
                  {answeredCount > 0 ? 'Resume assembling' : 'Begin assembling'}
                  <ArrowRight size={15} weight="bold" />
                </button>
              </section>
            ) : phase === 'play' ? (
              <PlayView
                key={axioms[index]?.id}
                axiom={axioms[index]}
                index={index}
                total={axioms.length}
                current={verdicts[axioms[index]?.id] ?? null}
                suggestedText={suggested[axioms[index]?.id]}
                isVip={isVip}
                reward={data.isAuthor || claimed ? null : data.reward}
                pending={pending}
                error={error}
                onApprove={() => submitVerdict(axioms[index], 'approve')}
                onFlag={() => submitVerdict(axioms[index], 'flag')}
                onSuggest={(text) => submitSuggestion(axioms[index], text)}
                onPrev={index > 0 ? () => { setError(null); setIndex((i) => i - 1); } : undefined}
                onNext={
                  verdicts[axioms[index]?.id] && index < axioms.length - 1
                    ? () => { setError(null); setIndex((i) => i + 1); }
                    : undefined
                }
                onReview={allAnswered ? () => setPhase('summary') : undefined}
              />
            ) : (
              <section className={styles.summary}>
                <div className={styles.summaryIcon}>
                  <CheckCircle size={30} weight="fill" />
                </div>
                <h2 className={styles.summaryTitle}>You rebuilt {data.guide.topicTitle}</h2>
                <p className={styles.summaryText}>
                  {answeredCount} of {axioms.length} axioms judged.{' '}
                  {Object.keys(suggested).length > 0
                    ? `You sent ${Object.keys(suggested).length} rewrite${Object.keys(suggested).length === 1 ? '' : 's'} to Blue; she folds the good ones back into the guide.`
                    : Object.values(verdicts).filter((v) => v === 'flag').length > 0
                      ? `You marked ${Object.values(verdicts).filter((v) => v === 'flag').length} for another look. That signal helps every future reader.`
                      : 'You kept every claim in your reconstruction.'}
                </p>

                {error && <div className={styles.error}>{error}</div>}

                {claimed ? (
                  <div className={styles.rewardChip}>
                    <Sparkle size={14} weight="fill" />
                    {data.isAuthor
                      ? 'Reconstruction complete.'
                      : 'Diamonds for this guide are already in your wallet.'}
                  </div>
                ) : data.isAuthor ? (
                  <div className={styles.rewardChip}>
                    <Sparkle size={14} weight="fill" /> Reconstruction complete.
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={claim}
                    disabled={claiming}
                  >
                    {claiming ? 'Claiming…' : `Claim +${data.reward} diamonds`}
                    <Sparkle size={15} weight="fill" />
                  </button>
                )}

                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => { setPhase('play'); setIndex(0); }}
                >
                  Review the axioms
                </button>
              </section>
            )}
          </>
        )}
      </main>

      {showReward && (
        <DiamondReward amount={rewardAmount} onComplete={() => setShowReward(false)} />
      )}
    </div>
  );
}

// ── One-card play view ───────────────────────────────────────────────────────

interface PlayViewProps {
  axiom: FlatAxiom | undefined;
  index: number;
  total: number;
  current: AssemblyVerdict | null;
  /** The rewrite this viewer already sent for this axiom, if any. */
  suggestedText?: string;
  isVip: boolean;
  /** Diamonds waiting at the end of the pass; null hides the end-cap. */
  reward: number | null;
  pending: boolean;
  error: string | null;
  onApprove: () => void;
  onFlag: () => void;
  onSuggest: (text: string) => Promise<boolean>;
  onPrev?: () => void;
  onNext?: () => void;
  onReview?: () => void;
}

function PlayView({
  axiom,
  index,
  total,
  current,
  suggestedText,
  isVip,
  reward,
  pending,
  error,
  onApprove,
  onFlag,
  onSuggest,
  onPrev,
  onNext,
  onReview,
}: PlayViewProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState('');

  if (!axiom) return null;
  const progress = Math.round(((index + (current ? 1 : 0)) / total) * 100);
  const community = axiom.approveCount + axiom.flagCount;

  return (
    <section className={styles.play}>
      {/* The bar runs left to right and ends at the diamonds — the reward is
          literally at the end of the visible path. */}
      <div className={styles.progressRow}>
        <span className={styles.progressLabel}>
          {index + 1} / {total}
        </span>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        {reward !== null && (
          <span className={styles.progressReward}>
            <Image src="/icons/ui-diamond.svg" alt="" width={11} height={11} />
            +{reward}
          </span>
        )}
      </div>

      <div className={styles.card}>
        <span className={styles.cardSection}>{axiom.sectionLabel}</span>
        <p className={styles.axiom}>{axiom.statement}</p>
        {community > 0 && (
          <span className={styles.cardMeta}>
            {axiom.approveCount} kept · {axiom.flagCount} questioned by other readers
          </span>
        )}
        {suggestedText && (
          <span className={styles.suggestedNote}>
            <PencilSimple size={12} weight="bold" /> Your rewrite is queued for Blue.
          </span>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {editorOpen ? (
        <div className={styles.suggestPanel}>
          <label className={styles.suggestLabel} htmlFor="axiom-rewrite">
            Rewrite this claim the way it should read
          </label>
          <textarea
            id="axiom-rewrite"
            className={styles.suggestTextarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
          />
          <div className={styles.suggestActions}>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setEditorOpen(false)}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={async () => {
                const ok = await onSuggest(draft.trim());
                if (ok) setEditorOpen(false);
              }}
              disabled={pending || draft.trim().length < 10}
            >
              {pending ? 'Sending…' : 'Send to Blue'}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.verdictRow}>
          <button
            type="button"
            className={`${styles.verdictBtn} ${styles.approve} ${current === 'approve' ? styles.chosen : ''}`}
            onClick={onApprove}
            disabled={pending}
          >
            <Check size={17} weight="bold" /> Keep this claim
          </button>
          {isVip ? (
            <button
              type="button"
              className={`${styles.verdictBtn} ${styles.flag} ${current === 'flag' ? styles.chosen : ''}`}
              onClick={() => {
                setDraft(suggestedText ?? axiom.statement);
                setEditorOpen(true);
              }}
              disabled={pending}
            >
              <PencilSimple size={17} weight="bold" /> Suggest a rewrite
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.verdictBtn} ${styles.flag} ${current === 'flag' ? styles.chosen : ''}`}
              onClick={onFlag}
              disabled={pending}
            >
              <Flag size={17} weight="bold" /> Needs another look
            </button>
          )}
        </div>
      )}

      <div className={styles.navRow}>
        {onPrev ? (
          <button type="button" className={styles.ghostBtn} onClick={onPrev} disabled={pending}>
            <ArrowLeft size={14} weight="bold" /> Previous
          </button>
        ) : (
          <span />
        )}
        {onReview ? (
          <button type="button" className={styles.ghostBtn} onClick={onReview} disabled={pending}>
            Finish
          </button>
        ) : onNext ? (
          <button type="button" className={styles.ghostBtn} onClick={onNext} disabled={pending}>
            Next <ArrowRight size={14} weight="bold" />
          </button>
        ) : (
          <span />
        )}
      </div>
    </section>
  );
}

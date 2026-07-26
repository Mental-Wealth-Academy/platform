# AI performance work — status and handoff

Last updated: 2026-07-25
Branch: `main` (all work is **uncommitted** in the working tree)

This plan covers the AI performance and hardening work approved on 2026-07-25.
All seven approved workstreams are implemented and verified in the working tree,
along with every follow-up item that the first revision of this plan left open.
What remains is deployment: migrations, environment variables, and the commit
split. Sections 4 and 5 are the parts that still need a person.

---

## 1. Context

A read-only review of the AI surfaces (Blue chat, memory, RAG, generation
routes, guide verification, voice, genetics, simulation backend) produced eight
findings. Management approved seven workstreams:

| Workstream | Approved decision |
| --- | --- |
| Sunset research product | Delete its server branch, model settings, client remnants, copy, route references, and corpus records. |
| Retrieval | Reweight ranking, simplify vector search, parallelize retrieval, version the index, add current sources. |
| Memory | Remove duplicated dialogue, add evidence-backed facts, contradiction handling, relevance selection. |
| Model gateway | Centralize task profiles, deadlines, schemas, fallback behavior, quotas, telemetry. |
| Grounding | Give guide review actual published prerequisite evidence and source pointers. |
| Safety | Add a deterministic high-risk route before ordinary generation. |
| Evaluation | Add retrieval, answer quality, safety, latency, and cost gates to CI. |

Genetics UI cleanup was delegated separately and is complete.

---

## 2. Current verification status

Run from the repo root:

```bash
npx tsc --noEmit && npm run build && npm test && BLUE_RAG_EVAL_FORCE_LOCAL=1 npm run eval:blue-rag && npm run eval:ai-behavior && npm run lint
```

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | Clean |
| `npm run build` | Compiles |
| `npm test` | 229 passed, 16 skipped, 0 failed |
| `BLUE_RAG_EVAL_FORCE_LOCAL=1 npm run eval:blue-rag` | 30/30 |
| `npm run eval:ai-behavior` | 9/9 |
| `npm run lint` | Clean (ESLint and design colour) |
| `npx tsc --noEmit` in `blue-server/` | Clean |
| `python3 -m py_compile` on changed simulation files | Clean |

Everything is green. Two failures that existed at the start of this work were
fixed rather than left behind, both noted in section 3.

### Change size

47 tracked files changed (+5205 / -2474), plus 38 new files.

---

## 3. What is done

### 3.1 Sunset research product — complete

The product is fully removed, including its assets and corpus records.

- Deleted `app/api/research/activate/route.ts` and the Blue route's research branch.
- Removed `RESEARCH_MODEL` from `.env.example`.
- Removed research copy from `app/api/voice/tts/route.ts` and the stale comment in `app/api/upload/route.ts`.
- Deleted retired voice recordings: `public/audio/blue-voice/faq-research-mode.mp3`, `faq-identity.mp3`, `greeting-text.mp3` (the last two carried the old "research partner" and "scientist, researcher, BCI" identity), plus their mappings in `scripts/generate-blue-voice-clips.ts`.
- Removed research-era claims from `lib/blue-knowledge.ts` and the Azura/archivist persona residue in `lib/bluepersonality.json`.
- `tests/unit/sunset-research-mode.test.ts` guards against reintroduction.
- `AI_TASK_PROFILES` in `lib/ai/profiles.ts` deliberately has no research profile.

**Note:** the `/research` page (`app/research/`, `ResearchTab`) is a different
surface — it is the simulation report tab and was correctly left alone.

### 3.2 Retrieval rebuild — complete

- **Versioned index manifest.** `blue_rag_index_manifests` stores corpus hash, embedding provider/model/dimension, chunk version, and per-adapter versions. `lib/blue-rag-index.ts` treats readiness as a manifest match, not "a row exists", and reports `manifest_missing` / `manifest_mismatch`.
- **Source adapters.** Product configuration and published guides are versioned adapters. The published-only DAG contract is enforced and covered by `tests/unit/blue-rag-published-contract.test.ts`.
- **Ranking.** Exact user terms and phrase hits are weighted above expanded aliases; expansions now serve candidate recall only (`lib/blue-rag-graph.ts`).
- **Trust from included evidence.** Trust is computed after the token-budget cut, so text the model never receives cannot raise trust.
- **Casual turns skip retrieval** entirely (`intent === 'casual'`).
- **Parallelism and caching.** Lexical retrieval and embedding generation run concurrently; readiness, embeddings, and safe public retrievals are cached; trace writes are off the critical path.
- **Exact cosine search.** The oversized IVFFlat index is gone (37-document corpus).
- **Corpus hygiene.** Stale `/markets`, "Gem Credits", dormant governance/CRE claims removed.
- **Deploy-time seeding.** `vercel.json` runs `npm run seed:blue-rag:deploy` after a successful build. Chat requests are read-only by default (`BLUE_RAG_AUTO_SEED=0`). Unchanged chunks reuse compatible embeddings.
- **Graceful degradation.** On database or index failure, retrieval falls back to the reviewed bundled corpus, reports the reason, and keeps DB-only guide claims untrusted (`tests/unit/blue-rag-fallback.test.ts`).
- **Evaluator is a CI gate.** `.github/workflows/ci.yml` runs `BLUE_RAG_EVAL_FORCE_LOCAL=1 npm run eval:blue-rag`. Suite grew from 20 cases (14 passing) to 30 (30 passing).

### 3.3 Blue runtime — complete

- **Streaming.** The route streams deltas to the client; `components/blue-chat/BlueChat.tsx` consumes the stream with a reader.
- **Deferred work.** Conversation persistence is one transaction; relationship updates, retrieval traces, and memory extraction happen after the response.
- **Conditional extraction.** `couldContainDurableMemory()` gates a small-model extraction pass rather than running a second completion every turn.
- **No duplicated dialogue.** History lives in user/assistant roles only. Memory, RAG, page context, and attachments go into a single JSON-enveloped **user-role** message marked untrusted, so they never gain system-level priority.
- **Paid-turn idempotency.** `lib/diamond-burns.ts` plus migration `20260725123000_chat_burn_idempotency.sql` add `clientRequestId`, a payload hash bound to the receipt, a stored successful response for replay, a two-minute generation lease, and first-token settlement. A retry replays the completed answer instead of burning again. Client recovery state is account-scoped in local storage via `lib/safe-storage.ts`.
- **Deterministic crisis triage.** `getBlueHighRiskResponse()` intercepts self-harm, harm-to-others, and immediate-danger turns **before** paid validation and before generation, and returns a reviewed response. Safety turns are redacted from later provider history. Crisis triage is exempt from rate limits.

### 3.4 Memory quality and privacy — complete

- Migration `20260725121000_blue_memory_hardening.sql` defines the memory tables (the runtime's lazy schema creation stays as a compatibility fallback) and adds provenance: category, evidence span, source turn, confidence, timestamps, supersession.
- Extraction sees only the member's message, so an assistant hallucination cannot become a stored fact.
- `isSensitiveBlueMemoryCandidate()` rejects credentials, seed phrases, card numbers, and health diagnoses.
- Duplicate journal reads combined; quest history uses count plus a recent-limit query.
- `app/api/chat/blue/memory/route.ts` — member-initiated memory erasure (rate limited, 3/hour).
- `app/api/cron/blue-memory-retention/route.ts` — daily retention sweep, `CRON_SECRET`-gated, registered in `vercel.json` at `0 3 * * *`.

### 3.5 Model gateway — complete

`lib/ai/` is the single entry point: `gateway.ts`, `profiles.ts`, `transports.ts`,
`types.ts`, `errors.ts`, `json.ts`, `circuit-breaker.ts`, `rate-limit.ts`,
`runtime-store.ts`, `behavioral-evals.ts`.

Six task profiles, each with fixed model, fallback chain, input/output budget,
temperature, overall deadline, per-attempt timeout, retry and schema-repair
limits, circuit breaker thresholds, and safety policy: `guide_advisory`,
`blue_chat_short`, `blue_memory_extract`, `content_draft`, `structured_extract`,
`safety_review`.

- Migrated routes: Blue chat, course draft, quest draft, guide advisory.
- Telemetry is redacted and non-blocking (`20260725122000_ai_telemetry.sql`).
- Distributed rate limiting is database-backed and cross-instance (`lib/ai/rate-limit.ts`).
- Two regressions found by the integration audit and fixed: timeout retries now reserve enough deadline for a healthy fallback provider, and quest drafts can no longer let model output switch a credits request onto the USDC rail or exceed its cap.

### 3.6 Grounded guide review — complete

`app/api/guides/verification/cre-score/route.ts` and `submit/route.ts` now run
through `lib/ai/guide-advisory.ts`, which retrieves actual published
prerequisite evidence rather than titles, requires evidence pointers per claim,
and reports insufficient evidence explicitly. Advisory generation has a durable
idempotent job record with a stale-worker lease; failure stays non-fatal because
only the human panel resolves a guide.

### 3.7 Genetics cleanup — complete

- `components/genetics/GeneticsChat.tsx` no longer sends questions, variants, or genotype summaries to a server, so the privacy claim in the UI is now true.
- `components/genetics/geneticsChatResponses.ts` provides deterministic in-browser guidance.
- Surface renamed "Genetics Guide"; obsolete network-loading animation removed from the CSS module.
- `app/api/genetics/chat/route.ts` deleted; no references remain.
- `tests/unit/genetics-chat-responses.test.ts` covers privacy and behavior.

### 3.8 Build blocker found and fixed

`npm run build` failed with:

> Type error: Route "app/api/chat/blue/route.ts" does not match the required
> types of a Next.js Route. "getBlueHighRiskResponse" is not a valid Route
> export field.

A Next.js App Router route file may only export handlers and segment config.
Prompt assembly and safety triage were extracted to **`lib/blue-chat-runtime.ts`**
(`BLUE_SYSTEM_PROMPT`, `AUTO_DISTRIBUTION_SYSTEM_PROMPT`,
`getBlueHighRiskResponse`, `buildBlueChatMessages`, `describePage`,
`normalizeBluePathname`, `truncate`, `MAX_ATTACHMENT_TOTAL_CHARS`, `BlueMode`).
The route imports them; `tests/unit/blue-chat-runtime.test.ts` imports from the
new module. **Keep helpers out of route files** — `tsc` alone does not catch
this, only `next build` does. Add `npm run build` to your pre-push checks.

### 3.10 Voice synthesis hardened

`app/api/voice/tts/route.ts` was unauthenticated, unlimited, accepted 5,000
characters, and took provider `voiceId`/`modelId` straight from the request body.
Now:

- Live synthesis requires a member session.
- Voice is chosen by server-side preset name (`blue`, `narrator`); client-supplied provider voice and model IDs are ignored. The narrator ID moved out of `AcademyStory.tsx` into the server (`ELEVENLABS_NARRATOR_VOICE_ID`).
- Text is capped at 1,500 characters.
- A character budget, not a request count, meters spend: 3,000 per minute and 30,000 per day per member. `consumeAiRateLimit` gained a `cost` parameter for this.
- The limiter fails closed: if it cannot be consulted, the route returns 503 rather than opening an unmetered spend path.
- Responses are `audio/mpeg` instead of base64 JSON, which removed the 33% payload inflation. All four call sites were updated (`BlueChat`, `BlueDialogue`, `BlueTerminal`, `AcademyStory`).
- Pre-recorded clips stay open and uncharged; they are static files under `public/` already.

Covered by `tests/unit/voice-tts-route.test.ts` (9 cases).

### 3.11 Verifier credential integrity

`lib/verifier-tests-db.ts` could issue a reviewing credential from padded text
and from questions unrelated to the subject. Now:

- Credential scoring reads answer-keyed items only (`scoreAnswers(..., { keyedOnly: true })`). A 100-character run of one letter scores zero.
- Written answers are recorded and shown back marked "Recorded for the panel to read" rather than scored as correct for being long enough.
- A pass on the ungrounded curated fallback returns `credentialWithheldReason` and grants no credential. The test still runs, so a provider outage does not break the surface.
- Fewer than `MIN_KEYED_QUESTIONS_FOR_CREDENTIAL` (6) keyed items also withholds the credential.
- Generation refuses to run on `openrouter/free`; `OPENROUTER_TEST_MODEL` must name an explicit model or that provider is skipped.

Covered by `tests/unit/verifier-credential-integrity.test.ts` (8 cases). The
existing `guide-levels` and `test-generation` suites still pass unchanged,
because the default completeness scoring behaviour was preserved.

### 3.12 Behavioural evaluation is a real CI gate

`lib/ai/behavioral-evals.ts` previously held cases and a comparator with nothing
producing observations. `scripts/evaluate-ai-behavior.ts` now exercises real
production code through stub transports (no key, no database, no network) and
runs in CI as `npm run eval:ai-behavior`.

Nine cases: structured-output schema validity, provider fallback, guide evidence
pointers, advisory latency budget, guide prompt boundary, Blue crisis triage,
Blue prompt boundary, memory contamination, and credential integrity.

The gate was negative-controlled: deliberately neutering crisis triage and
re-enabling length-based credential scoring made it fail 7/9 with the right
reason codes, and both breakages were reverted.

### 3.13 Memory erasure has a UI

The `DELETE /api/chat/blue/memory` route now has a caller: a "Memory" card in
Blue's expanded Power Tools panel. It opens a confirmation dialog stating that
stored conversations, distilled facts, and relationship state are erased while
credits and their onchain records are untouched, then clears the visible
transcript only after the server confirms. No celebration sound fires on a
failed reset.

### 3.14 Blue server no longer drifts from the app contract

`blue-server/server.ts` served `/chat` while the app requests an
OpenAI-compatible `/api/v1/chat/completions` — and `ELIZA_API_BASE_URL` defaults
to that server's port in local dev. It now serves both, sharing one
`generateBlueTurn` function, and honours `stream: true` with SSE chunks in the
shape the app's transport parses. The duplicated handler body is gone.

### 3.15 Simulation backend budget and log retention

- Both provider SDK clients now carry an explicit `timeout` (`LLM_TIMEOUT_SECONDS`, default 120s) and `max_retries=0`, so this client's own loop is the only retry and the worst-case wait is predictable.
- Retry backoff gained jitter, so parallel section workers stop retrying in lockstep.
- Every call logs `model`, `duration_ms`, and input/output token counts — never prompt or completion text. Streaming usage is captured from the final chunk when the gateway sends it.
- Report run logs cap every string at `REPORT_LOG_MAX_DETAIL_CHARS` (default 4,000), applied centrally in `ReportLogger.log`, so one report can no longer write tens of megabytes of prompts and tool output to disk. The bounding is recursive across dicts and lists and was verified against nested fixtures.

### 3.16 Two pre-existing broken gates fixed

Neither was caused by this work, and both blocked CI:

- `tests/unit/color-contrast.test.ts` failed on three cases because its resolver only understood six-digit hex while `--palette-canvas` is authored as `oklch(98% 0.008 270)`. It now resolves hex, plain `oklch()`, and `var()` chains, so the contrast assertions actually measure the palette again. All 9 cases pass on real values.
- `components/support/SupportModal.tsx` had an unescaped apostrophe failing `react/no-unescaped-entities`, which failed `npm run lint`.


### 3.9 Test coverage added

`ai-gateway`, `ai-rate-limit`, `blue-chat-runtime` (42 cases),
`blue-memory-reset-route`, `blue-memory-retention-route`, `blue-rag-fallback`,
`blue-rag-published-contract`, `course-draft-ai-gateway`,
`diamond-burn-idempotency`, `genetics-chat-responses`, `guide-advisory-ai`,
`quest-draft-ai-gateway`, `sunset-research-mode`, `verifier-credential-integrity`,
`voice-tts-route`.

---

## 4. Rollout — do these before or with the push

This is the highest-priority section. The code is ready; the environment is not.

1. **Apply four migrations to Supabase.** They have never been run against the remote database. Nothing works without them.
   - `20260725120000_blue_rag_manifest.sql`
   - `20260725121000_blue_memory_hardening.sql`
   - `20260725122000_ai_telemetry.sql`
   - `20260725123000_chat_burn_idempotency.sql`
2. **Confirm `CRON_SECRET` is set in Vercel.** The retention route returns 503 without it.
3. **Set `BLUE_RAG_AUTO_SEED=0` in Vercel** (chat requests stay read-only). Optionally document `BLUE_RAG_REQUIRE_DATABASE`.
4. **Watch the first deploy's build step.** `vercel.json` now runs `npm run build && npm run seed:blue-rag:deploy`. If seeding fails, the deploy fails. Verify the seed has database credentials in the build environment; if it does not, drop `seed:blue-rag:deploy` from `buildCommand` and run the seed as a one-off instead.
5. **Cron count.** `vercel.json` now has 7 crons, all daily-or-less as the Hobby plan requires. If the deploy is rejected on cron count, fold the retention sweep into an existing daily job.
6. **Seed and evaluate against the real index** once migrations are applied:
   ```bash
   npm run seed:blue-rag && npm run eval:blue-rag
   ```
   The 30/30 figure is the forced-local lexical baseline. Vector-backed numbers may differ, and that run is the real acceptance check.
7. **Commit deliberately.** Everything is uncommitted on `main`, and this repo auto-deploys `main`. Roughly 10,000 changed lines across 68 files is too large for a single unreviewed push. Suggested split: sunset deletions → retrieval → memory → gateway → guide advisory → genetics → tests. Note the standing risk that work-in-progress can be autocommitted mid-session.

---

## 5. What is left

Every approved workstream and every item that was open in the previous revision
of this plan is now implemented and verified. What remains is not code.

### 5.1 The rollout in section 4

Migrations, `CRON_SECRET`, the seed-in-build decision, cron count, a real
vector-backed evaluation run, and the commit split. These need James, a
database, and a deploy — they cannot be finished from the working tree.

### 5.2 New environment variables to set

| Variable | Where | Why |
| --- | --- | --- |
| `ELEVENLABS_NARRATOR_VOICE_ID` | Vercel | The visual-novel narrator voice moved server-side. It falls back to the previously hardcoded ID, so narration keeps working if this is unset. |
| `OPENROUTER_TEST_MODEL` | Vercel | Must name an explicit model. While it is unset or `openrouter/free`, verifier tests skip OpenRouter and generate through Eliza. |
| `BLUE_RAG_REQUIRE_DATABASE` | optional | Forces the production retrieval contract in a non-production environment. |
| `LLM_TIMEOUT_SECONDS`, `LLM_MAX_ATTEMPTS`, `REPORT_LOG_MAX_DETAIL_CHARS` | Railway | Simulation backend budgets. All have working defaults. |

### 5.3 Judgement calls worth a second opinion

- **TTS budgets.** 3,000 characters/minute and 30,000/day per member are my estimates, not measured from usage. A member working through a long visual-novel session could hit the daily cap; narration then fails quietly and the text stays readable. Check real usage before treating these as final.
- **Verifier fallback.** A pass on the ungrounded fallback test now grants nothing. That is the fail-closed reading of the approval. If you would rather it grant a provisional credential, that is a product decision, not a code constraint.
- **`blue-server`.** It now matches the app's contract, but the question of whether a second Blue runtime should exist at all is still open. Retiring it would remove two CI steps, a dependabot entry, and an ElizaOS dependency tree.
- **Pre-existing uppercase badges.** `VerifierCredentials.module.css` styles its review verdicts with `text-transform: uppercase` and filled pill backgrounds, which both conflict with the house rules. I matched the house rules for the one badge I added and left the existing ones alone rather than restyling your component uninvited.

---

## 6. Ground rules for whoever picks this up

- No emojis, no all-caps, no "X not Y" framing anywhere, including code comments.
- In-app currency is "credits" in all UI. "shard" is code-internal only.
- Web Storage only through `lib/safe-storage.ts`.
- Money and backend paths stay server-gated, fail-closed, and idempotent.
- Reuse `components/shared/CtaButton` and existing tokens before writing new UI.
- Guides work must preserve the published-only DAG contract and acyclicity — load the `mwa-guides-dag` skill first.
- Blue's dialogue follows the `mwa-blue` and `mwa-editorial` skills; EDITORIAL.md v4.0 is the voice source of truth.
- Run `npm run build` before pushing. `npx tsc --noEmit` alone misses illegal route exports.

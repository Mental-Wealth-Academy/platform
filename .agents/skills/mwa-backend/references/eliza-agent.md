# B.L.U.E. — Agent Plumbing

The technical side of the daemon. For her voice and character, see the `mwa-blue` skill instead.

## The five pieces

| File | Role |
|---|---|
| `lib/eliza-api.ts` | HTTP client for Eliza Cloud — chat completions, TTS |
| `lib/blue-memory.ts` | Persistent memory store (Supabase-backed) |
| `lib/blue-wallet.ts` | Server-side wallet client — signs and sends txs as B.L.U.E. |
| `lib/blue-contract.ts` | BlueKillStreak read/write helpers |
| `lib/bluepersonality.json` | System-prompt material — voice, traits, anchors |

These are tightly coupled. A change to `bluepersonality.json` affects every Eliza call. A change to `blue-memory.ts` affects what context she has on the next call. A change to `blue-wallet.ts` affects real money.

## Eliza Cloud API

`lib/eliza-api.ts` shapes:

```ts
interface ElizaChatRequest {
  messages: ElizaChatMessage[];
  id?: string;  // model id; defaults to gpt-4o
}
```

Messages use the `parts: [{ type: 'text', text }]` shape, not OpenAI's plain `content` string. Don't simplify the shape — the API expects this.

Default model is `gpt-4o`. If you change the model for a route, leave a comment on WHY (cost, capability, latency) — model swaps cause subtle behavior shifts.

## Memory

`lib/blue-memory.ts` writes to a Supabase table bootstrapped by `lib/ensureBlueMemorySchema.ts`. Memory is per-user. On each turn:

1. Read recent N memories for this user
2. Assemble into the system prompt context
3. Run the Eliza call
4. After response, decide what to persist — not every exchange should write a memory

**Don't write a memory for every message.** That fills the table and dilutes signal. Persist memories that capture: identity claims, returning themes, decisions, commitments, things she should remember when she sees the user again.

## Wallet

`lib/blue-wallet.ts` holds the viem account that controls B.L.U.E.'s on-chain wallet. **Server-side only.** The private key comes from env (never hard-coded, never in client bundles).

Hard rules:

1. Every send-tx path is **idempotent**. Include a request ID; check whether the tx already fired before signing.
2. Every send-tx path **logs** the tx hash before submission and after confirmation.
3. Failures **roll back** any DB state that depends on the tx success. Don't leave the DB thinking she paid when she didn't.

If you're adding a new endpoint that calls `blue-wallet.ts`, surface the change to the user before merging. Her wallet is real value.

## Personality file

`lib/bluepersonality.json` is the source of truth for her system prompt — voice anchors, behavioral rules, character traits. When the user says "B.L.U.E. is being too friendly" or "she's not remembering things," the fix is usually here.

Edit pattern: change the file, redeploy, test against a known prompt that previously triggered the bad behavior. Don't change it casually — small edits ripple across every conversation.

For her voice and character anchors, also consult `mwa-blue/references/voice.md`. The two should stay in sync.

## How a chat turn flows

1. `app/api/chat/route.ts` receives a user message
2. Auth + rate-limit checks
3. Read user's recent memories (`blue-memory.ts`)
4. Assemble system prompt: `bluepersonality.json` + memory context
5. Call Eliza (`eliza-api.ts`) — stream when possible
6. Send response back to the client
7. Persist new memories worth keeping
8. If she promised an on-chain action (reward, etc.), enqueue it; don't fire it inline

## Quest review flow (different from chat)

Quest review is *not* a chat turn. It's an Eliza scoring call inside the `blue-review` CRE workflow. Flow:

1. Proposal created on BlueKillStreak → event picked up by `blue-review` CRE workflow
2. Workflow fetches the submission, calls Eliza for scoring
3. Workflow computes `blueLevel` (0–4) from the score
4. Workflow submits a DON-signed report → on-chain review record

Don't confuse the two paths. Chat is conversational, runs in the app. Review is governance, runs in CRE.

## Things that have bitten us

- **Memory bloat.** Persisting every exchange filled the table and made later context windows useless. Be selective.
- **Personality drift.** Editing `bluepersonality.json` without testing produced subtle voice regressions. Always diff a known prompt before/after.
- **Wallet retries.** A double-fire on reward distribution sent twice. Always idempotent.
- **Missing model pin.** Default `gpt-4o` shifted behavior across an Eliza upstream change. Pin the model in production routes.

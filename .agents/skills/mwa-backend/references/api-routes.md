# API Routes

Next.js 14 App Router route handlers. Live under `app/api/`. 31 route directories at last count.

## Layout

Each directory under `app/api/` is a route. Examples:

```
app/api/
├── auth/            — wallet-signature → Supabase session
├── chat/            — B.L.U.E. chat completions (proxies Eliza)
├── community/       — forum, posts, comments
├── credit-builder/  — credit-score feature
├── daemon/          — B.L.U.E. agent endpoints (memory writes, decisions)
├── ethereal-progress/ — pathway state, weekly seals
├── leaderboard/     — streaks, rankings
├── quests/          — quest CRUD and submission
├── shards/          — $Shards balance, transactions
├── treasury/        — Kalshi prices, trades, balance, distribution
├── voice/           — TTS via Eliza
└── webhooks/        — inbound from external services
```

## Conventions

### File location

Each route is `app/api/<path>/route.ts`. Methods are exported by name: `export async function GET(req)`, `POST`, etc.

### Response shape

JSON, with consistent error shape:

```ts
return NextResponse.json({ error: 'message', code: 'CODE' }, { status: 400 });
```

When success, return the data directly; don't wrap in `{ data: ... }` unless there's pagination metadata.

### Auth

Routes that touch user data verify the session via Supabase Auth helpers. Routes that touch B.L.U.E.'s wallet require additional admin check — see existing handlers in `app/api/daemon/` for the pattern. Don't invent new auth checks; reuse the existing helpers.

### Rate limiting

Hot paths (chat, voice, webhooks) need rate limits. Check whether the route already has one before adding a new one. If you ship a new endpoint that calls Eliza or Kalshi, add a per-user rate limit — both APIs charge per request.

### Logging

Server-side logs are picked up by Vercel; production-grade routes log at structured boundaries (entry, error, exit). Don't log sensitive data — wallet addresses are fine, signatures are fine, private keys never.

## Patterns to copy

### Reading from a contract

See `app/api/ethereal-progress/`. It uses `lib/pathway-contract.ts` to read seal state. Pattern: viem public client, env-resolved address, typed return.

### Writing from B.L.U.E.'s wallet

See `app/api/daemon/`. Uses `lib/blue-wallet.ts`. The wallet key is server-side only — never expose. Always idempotent: include a request-id check so retries don't double-spend.

### Calling Eliza

See `app/api/chat/`. Uses `lib/eliza-api.ts`. Streams when possible (SSE). Persist conversation memory to `lib/blue-memory.ts` after each exchange.

### Calling Kalshi

See `app/api/treasury/prices/` and `app/api/treasury/trades/`. Uses `lib/kalshi-api.ts`. Cache where the data isn't realtime — Kalshi rate-limits aggressively.

## Anti-patterns

- **Don't import server-only modules into client components.** `lib/db.ts`, `lib/blue-wallet.ts`, anything with secrets — server-only.
- **Don't hand-roll fetch in routes when there's a lib helper.** The libs do error normalization, retry, and rate-limit handling.
- **Don't trust client-supplied user IDs.** Always derive `userId` from the verified session, never from request body.
- **Don't `console.log(req.body)` in production code.** Quests can contain personal reflections; logs leak.

## When to add a new route vs reuse

If the new behavior is < 20 lines and tightly coupled to an existing route, extend the existing handler. If it touches a different table family, owns its own auth requirements, or is a new external integration, give it its own directory.

# Mental Wealth Academy - Production Readiness Audit

**Date:** 2026-03-17
**Build status:** PASSING (all pages compile, all 70 contract tests pass)

---

## Executive Summary

| Area | Critical | High | Medium | Low |
|------|----------|------|--------|-----|
| API Security | 3 | 2 | 13 | 10 |
| Smart Contracts | 1 | 3 | 5 | 3 |
| Database | 4 | 6 | 6 | - |
| Dependencies | 6 HIGH CVEs | - | - | 2 unfixable |
| Git Hygiene | - | - | 3 | 1 |
| Dead Code | - | - | - | cleanup items |
| Env Variables | 8 missing critical | 1 stale | - | - |

**Top 5 issues to fix immediately:**

1. **Client-controlled shard amount** — users can award themselves infinite shards via `/api/quests/complete`
2. **Wallet signup has no signature verification** — anyone can claim any wallet address
3. **Farcaster signin has no FID verification** — anyone can impersonate any Farcaster user
4. **Database: `proposals.status` CHECK constraint rejects valid statuses** — `'expired'`, `'on_chain_pending'`, `'on_chain_active'`, `'executed'` will fail at runtime
5. **Database: CDP webhook uses invalid SQL** — `ORDER BY` in `UPDATE` and wrong column name

---

## 1. API Security

### CRITICAL

**1.1 Client-controlled shard amount** (`app/api/quests/complete/route.ts`)
- `shards` value comes from request body. A user can POST `{"questId": "any", "shards": 999999}`.
- **Fix:** Look up shard reward server-side from quest definition, ignore client value.

**1.2 Wallet signup — no signature verification** (`app/api/auth/wallet-signup/route.ts`)
- Wallet address accepted from request body with no cryptographic proof of ownership.
- **Fix:** Require SIWE (Sign-In With Ethereum) signed message.

**1.3 Farcaster signin — no FID verification** (`app/api/auth/farcaster-signin/route.ts`)
- `fid` accepted from request body with no signature verification. Anyone can impersonate any Farcaster user.
- **Fix:** Verify the Farcaster frame/mini-app signature using Neynar's `validate_frame`.

### HIGH

**1.4 Unauthenticated Padlet post creation** (`app/api/padlet/posts/route.ts`)
- No auth check. Anyone can spam the community board.
- **Fix:** Add `getCurrentUserFromRequestCookie()`.

**1.5 Unauthenticated survey processing** (`app/api/survey/process/route.ts`)
- Calls DeepSeek API (costs money) with no auth. Anyone can burn API credits.
- **Fix:** Add auth or rate limiting.

### MEDIUM (13 issues)

- Webhook signature uses `===` instead of `crypto.timingSafeEqual()` (timing attack)
- State-changing GET in `/api/x-auth/initiate` (CSRF)
- Error message leakage in 8+ routes (return `error.message` to client)
- Missing rate limiting on 10+ write endpoints
- File uploads stored to `public/uploads/` (ephemeral on Vercel)
- Username enumeration via `/api/profile/check-username`

---

## 2. Smart Contracts

### CRITICAL

**2.1 `setKeystoneForwarder` accepts `address(0)`** (AzuraKillStreak + AzuraMarketTrader)
- If owner accidentally sets forwarder to zero address, CRE access control is disabled.
- **Fix:** Add `require(_forwarder != address(0))`.

### HIGH

**2.2 Stale USDC approval on old prediction market** (AzuraMarketTrader)
- When `setPredictionMarket()` changes the address, old market retains USDC allowance.
- **Fix:** Reset approval to 0 on old market before changing.

**2.3 CRE execute path skips voting deadline check** (AzuraKillStreak)
- `onReport(actionType=1)` can execute proposals after deadline. May be intentional but contradicts `executeProposal()`.
- **Fix:** Add deadline check or document as intentional.

**2.4 No minimum/maximum voting period** (AzuraKillStreak)
- `_votingPeriod = 1` makes community voting impossible.
- **Fix:** Add `MIN_VOTING_PERIOD` and `MAX_VOTING_PERIOD` bounds.

### MEDIUM

- Missing events on `emergencyWithdraw`, `setAdmin`, `setAzuraAgent`, `setKeystoneForwarder`, `setPredictionMarket`
- `cancelProposal` can cancel already-rejected proposals
- Low-level `.call()` to prediction market doesn't verify contract exists
- Front-running: multiple proposals can over-commit USDC balance

### TEST GAPS

- No test for explicit `executeProposal()` (only auto-execute via `vote()`)
- No test for `azuraReview` called twice on same proposal
- No test for zero voting period
- No test for `onReport` with zero amount on MarketTrader
- No fuzz tests on `_level` or `_usdcAmount`

---

## 3. Database

### CRITICAL (will cause runtime errors)

**3.1 `proposals.status` CHECK constraint** rejects `'expired'`, `'on_chain_pending'`, `'on_chain_active'`, `'executed'`
- These values are written by `proposal/create`, `proposal/review`, and `webhooks/cdp` routes.
- **Fix:** Expand CHECK constraint or remove it.

**3.2 CDP webhook uses invalid SQL** (`app/api/webhooks/cdp/route.ts`)
- `UPDATE ... ORDER BY ... LIMIT 1` — PostgreSQL doesn't support ORDER BY in UPDATE.
- **Fix:** Use subquery: `WHERE id = (SELECT id FROM ... ORDER BY ... LIMIT 1)`.

**3.3 CDP webhook references wrong column** (`webhooks/cdp/route.ts:232`)
- `blockchain_tx_hash` doesn't exist; should be `transaction_hash`.

**3.4 Reading comments migration can destroy data** (`app/api/readings/comments/route.ts:11-18`)
- Drops and recreates tables if column type doesn't match. Data loss risk.
- **Fix:** Use `ALTER TABLE ... ALTER COLUMN ... TYPE` instead.

### HIGH (data integrity)

- Quest completion not transactional (shards awarded without completion record)
- Loot box spin race condition (concurrent requests can over-deduct)
- Proposal review writes review + status update without transaction
- Ethereal progress seal + shard award without transaction
- Avatar selection updates two tables without transaction
- `x_oauth_states` missing FK to users

### MEDIUM

- N+1 query in proposal cleanup (loop of DELETEs instead of batch)
- Review sweep makes sequential HTTP requests (should parallelize)
- Leaderboard query missing index on `shard_count`
- 30 DDL queries on cold start via `ensureForumSchema`
- No migration ordering or tracking system
- `schema.sql` is stale vs runtime schema

---

## 4. Dependencies

### Vulnerabilities (29 total from `npm audit`)

| Package | Severity | Fix |
|---------|----------|-----|
| next (14.2.33) | HIGH (6 CVEs) | `npm audit fix` for patches |
| hono (transitive) | HIGH (11 CVEs) | `npm audit fix` |
| axios, flatted, glob, h3 | HIGH | `npm audit fix` |
| elliptic (via ethers v5) | LOW | No fix until ethers v6 migration |

### Unused packages (safe to remove)

- `@coinbase/onchainkit` — never imported (also causes the `--legacy-peer-deps` requirement)
- `@polymarket/order-utils` — never imported
- `@react-three/drei` — never imported
- `infobox-parser` — never imported
- `valtio` — never imported
- `@types/intro.js` — no corresponding runtime package

### Upgrade path

| Current | Target | Impact |
|---------|--------|--------|
| Next.js 14 | 15+ | Resolves 6 HIGH CVEs, enables React 19 |
| React 18 | 19 | Server Components default, `use()` hook |
| ethers 5 | 6 | Resolves elliptic vulnerability chain |
| wagmi 2 | 3 | API changes, paired with React 19 |

---

## 5. Git Hygiene

- **No leaked secrets found** in git history
- **4 Foundry broadcast files tracked** despite gitignore — need `git rm --cached`
- **~20 MB of images** in git (8.8 MB hero image) — consider CDN or compression
- **`.cre_build_tmp.js` not gitignored** — FIXED in this audit

---

## 6. Dead Code

### Unused components (8 directories, safe to delete)

- `components/events-carousel/`
- `components/personal-dashboard/`
- `components/prompt-card/`
- `components/prompt-catalog/`
- `components/season-timer/`
- `components/vote-progress/`
- `components/your-impact/`
- `components/messageboard-card/`

### Unused lib files (safe to delete)

- `lib/transaction-monitor.ts` — 256 lines, never imported
- `lib/wallet-auth-client.ts` — never imported, duplicates `wallet-api.ts`

### ~70 orphan files in `public/`

- 41 unused icons, 17 unused company logos, 12 unused uploads
- Duplicate `.png` + `.webp` variants of company logos

---

## 7. Environment Variables

- **54 unique env vars** referenced in code
- **19 defined** in `.env.local`
- **8 high-impact missing** vars: `CDP_API_KEY_NAME`, `CDP_API_KEY_PRIVATE_KEY`, `AZURA_WALLET_ID`, `AZURA_WALLET_SEED`, `CLANKER_API_KEY`, `DEEPSEEK_API_KEY`, `NEYNAR_API_KEY`, `CRON_SECRET`
- **1 stale** var: `POLYMARKET_PROXY_WALLET` (defined but never used)
- **No `.env.example`** existed — CREATED in this audit

---

## Actions Taken During This Audit

1. Created `CLAUDE.md` — authoritative project reference
2. Created `.env.example` — documents all 54 env vars
3. Fixed `.gitignore` — added `.cre_build_tmp.*` pattern
4. Created this `AUDIT.md` — full findings and recommendations

## Recommended Fix Order

### Week 1: Critical security
1. Fix client-controlled shards (`/api/quests/complete`)
2. Add wallet signature verification (`/api/auth/wallet-signup`)
3. Add Farcaster FID verification (`/api/auth/farcaster-signin`)
4. Fix `proposals.status` CHECK constraint
5. Fix CDP webhook SQL (ORDER BY in UPDATE + wrong column name)

### Week 2: Data integrity
6. Wrap quest completion, loot box spin, proposal review, ethereal progress, avatar selection in transactions
7. Add `crypto.timingSafeEqual()` for webhook signature
8. Add rate limiting to write endpoints
9. Add auth to Padlet and survey routes

### Week 3: Smart contracts
10. Add zero-address check to `setKeystoneForwarder`
11. Reset USDC approval in `setPredictionMarket`
12. Add min/max voting period bounds
13. Add missing events to admin functions
14. Write missing tests

### Week 4: Cleanup
15. Remove unused dependencies
16. Remove dead components and lib files
17. `git rm --cached` broadcast files
18. Compress large images
19. Run `npm audit fix`

### Medium-term
20. Migrate Next.js 14 → 15, React 18 → 19
21. Migrate ethers v5 → v6
22. Move to proper migration system (numbered files + tracking table)
23. Move file uploads to cloud storage (S3/R2)

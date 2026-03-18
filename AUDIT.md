# Mental Wealth Academy - Production Readiness Audit

**Date:** 2026-03-17
**Build status:** PASSING (all pages compile, 83 contract tests pass)
**Last updated:** 2026-03-17

---

## Current Status

| Area | Open Issues | Fixed |
|------|-------------|-------|
| API Security | 3 medium, 5 low | 8 (3 critical, 2 high, 3 medium) |
| Smart Contracts | 3 medium, 3 low | 5 (1 critical, 3 high, 1 medium) |
| Database | 1 critical, 1 high, 6 medium | 9 (3 critical, 5 high, 1 medium) |
| Dependencies | 15 npm vulns (need major upgrades) | 14 resolved via audit fix, 4 packages removed |
| Git Hygiene | 1 medium (large images) | 3 (broadcast files, gitignore, no secrets) |
| Dead Code | ~70 orphan public/ files | 8 components, 2 lib files, 4 npm packages removed |
| Env Variables | 8 missing in .env.local | .env.example created |

---

## Open Issues

### API Security

**MEDIUM**
1. **State-changing GET in `/api/x-auth/initiate`** — inserts `x_oauth_states` row via GET (CSRF risk). Should be POST, but OAuth 1.0a flow expects GET redirect.
2. **File uploads stored to `public/uploads/`** — ephemeral on Vercel serverless. Should use cloud storage (S3/R2).
3. **Username enumeration via `/api/profile/check-username`** — unauthenticated, no rate limit. Low risk but enables scraping.

**LOW**
4. Remaining error message leaks in dev-gated routes (only exposed when `NODE_ENV=development`)
5. Leaderboard exposes usernames without auth (intentional for public leaderboard)
6. Proposal finalize GET exposes tx data without auth (governance is public by design)
7. `@react-three/drei` still in package.json but never directly imported (may be used by fiber internally)
8. Farcaster signin uses rate limiting but not cryptographic SIWF — TODO documented in code

### Smart Contracts

**MEDIUM**
1. **CRE execute path skips voting deadline check** — `onReport(actionType=1)` can execute after deadline. Likely intentional (CRE should finalize) but undocumented.
2. **`cancelProposal` can cancel already-rejected proposals** — status changes from Rejected→Cancelled, corrupting governance state.
3. **Low-level `.call()` to prediction market** — doesn't verify target is a contract. Silent success if `predictionMarket` is an EOA.

**LOW**
4. Front-running: multiple proposals can over-commit USDC balance (mitigated by transfer revert)
5. `MockPredictionMarket.resolveMarket` has no access control (mock contract, not deployed to mainnet)
6. No `receive()`/`fallback()` — ETH sent via `selfdestruct` is permanently locked

**TEST GAPS**
- No test for explicit `executeProposal()` (only auto-execute via `vote()`)
- No test for `azuraReview` called twice on same proposal
- No test for `onReport` with zero amount on MarketTrader
- No fuzz tests on `_level` or `_usdcAmount`

### Database

**CRITICAL**
1. **Reading comments migration can destroy data** (`app/api/readings/comments/route.ts:11-18`) — drops and recreates tables if column type doesn't match. Fix: use `ALTER TABLE ... ALTER COLUMN ... TYPE`.

**HIGH**
2. **`x_oauth_states` missing FK to users** — orphan rows can accumulate.

**MEDIUM**
3. N+1 query in proposal cleanup (loop of DELETEs instead of batch)
4. Review sweep makes sequential HTTP requests (should parallelize with `Promise.allSettled()`)
5. Leaderboard query missing index on `shard_count`
6. 30 DDL queries on cold start via `ensureForumSchema` — should move to deploy-time
7. No migration ordering or tracking system
8. `schema.sql` is stale vs runtime schema (ensureForumSchema has diverged)

### Dependencies

15 npm vulnerabilities remain — all require breaking changes:
- `elliptic` (via ethers v5) — no fix until ethers v6
- `next` (14.x) — patches available in 15+
- Remaining transitive deps tied to major version upgrades

### Git / Assets

1. **~20 MB of images in git** — 8.8 MB `chapters-hero.png`, 5.9 MB `azura404.png`. Should compress or move to CDN.
2. **~70 orphan files in `public/`** — 41 unused icons, 17 unused logos, 12 unused uploads. Need manual review before deleting (some may be database-referenced).

### Environment Variables

8 env vars referenced in code but missing from `.env.local`:
`CDP_API_KEY_NAME`, `CDP_API_KEY_PRIVATE_KEY`, `AZURA_WALLET_ID`, `AZURA_WALLET_SEED`, `CLANKER_API_KEY`, `DEEPSEEK_API_KEY`, `NEYNAR_API_KEY`, `CRON_SECRET`

1 stale var: `POLYMARKET_PROXY_WALLET` (defined but never referenced in code)

---

## Completed Fixes (2026-03-17)

### Commit `8bee7632` — Critical security + docs
| # | Fix |
|---|-----|
| 1 | Client-controlled shards → server-side `QUEST_REWARDS` map |
| 2 | Wallet signup → requires cryptographic signature via `verifyWalletSignature()` |
| 3 | Farcaster signin → IP rate limiting (5/min) |
| 4 | `proposals.status` CHECK constraint → expanded to 9 statuses + migration SQL |
| 5 | CDP webhook SQL → subquery pattern, correct column name |
| 6 | CDP webhook HMAC → `crypto.timingSafeEqual()` |
| 7 | Created `CLAUDE.md`, `.env.example`, `AUDIT.md` |
| 8 | `.gitignore` → added `.cre_build_tmp.*` |

### Commit `66dfb757` — Data integrity, hardening, contracts, cleanup
| # | Fix |
|---|-----|
| 9 | Transaction safety → 5 routes wrapped in `withTransaction()` |
| 10 | Loot box race condition → atomic `UPDATE...RETURNING` |
| 11 | Auth added → padlet/posts, survey/process |
| 12 | Rate limiting → 5 write endpoints (reserve, comments, spin, upload, subscribe) |
| 13 | Error leakage → removed `error.message` from 4 API responses |
| 14 | Contracts → zero-address check on `setKeystoneForwarder` (both) |
| 15 | Contracts → USDC approval reset in `setPredictionMarket` |
| 16 | Contracts → voting period bounds (1hr–30d) |
| 17 | Contracts → 5 new admin events |
| 18 | Contracts → 13 new tests (70→83) |
| 19 | Cleanup → 8 unused components, 2 unused lib files deleted |
| 20 | Cleanup → 4 unused npm packages removed |
| 21 | Cleanup → broadcast files untracked |
| 22 | Cleanup → `npm audit fix` (14 vulns resolved) |

---

## Recommended Next Steps

### Short-term (when ready)
1. Fix reading comments destructive migration (`ALTER` instead of `DROP`)
2. Add `cancelProposal` status guard
3. Add pool error handler to `lib/db.ts`
4. Compress large images (saves ~15 MB in git)
5. Implement SIWF for Farcaster (client + server change)

### Medium-term
6. Move `ensure*Schema` DDL to deploy-time migrations
7. Create numbered migration system with tracking table
8. Move file uploads to cloud storage (S3/R2)
9. Batch N+1 queries in proposal cleanup

### Major upgrades
10. Next.js 14 → 15, React 18 → 19
11. ethers v5 → v6 (resolves elliptic vulnerability chain)
12. wagmi 2 → 3, @react-three/fiber 8 → 9

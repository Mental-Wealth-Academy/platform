# Mental Wealth Academy

Gamified mental-wealth education app on Base. Solo builder (James); prototype-to-production since 2026-03. Voice/brand source of truth: EDITORIAL.md (v4.0).

## Stack
- Next.js 14 App Router (`app/`), CSS Modules; fonts via `--font-*` tokens only, never literal family names
- Supabase Postgres; migrations in `supabase/migrations/`
- Foundry contracts in `contracts/` — solc pinned 0.8.24, do not bump
- Deploys: Vercel projextmwa/academy-v3, Hobby plan — every vercel.json cron must be once-daily or less, or the whole deploy fails
- Pushing to `main` auto-deploys production

## Token direction (2026-07)
- Diamonds ($BLUE) v1 live on Base at 0x4A25Cea1f05C6725dC90849FBaafF00d67342B3f; DiamondsV2 + ReflectionVault are built in `contracts/src/` but not deployed — V2 supersedes v1 on deploy
- Spending is a real burn to 0xdEaD, server-verified via the `diamond_burns` ledger
- UI always says "credits" for the in-app currency; "shard" survives only in code internals. "onchain" is one word in copy

## Dormant — do not build on these without asking
- DAO governance (BlueKillStreak) and the proposal/voting flows
- Chainlink CRE workflows (`cre-workflows/`)
- Kalshi (deprecated; `lib/kalshi-api.ts` and `lib/kalshi-trading.ts` remain on disk but are not imported)

## House rules
- No emojis, no all-caps, no "X not Y" framing, anywhere
- Reuse existing components and tokens (components/shared/CtaButton is the canonical CTA) before writing new UI
- Web Storage only via `lib/safe-storage.ts`
- Money/backend paths: server-gated, fail-closed, idempotent
- Course surfaces app/course/[slug] and app/shadow-work share one design system — mirror changes to both (course-design-parity skill)

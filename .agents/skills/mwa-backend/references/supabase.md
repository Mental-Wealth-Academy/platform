# Supabase

Postgres on Supabase, accessed from server code via `lib/db.ts`.

## The `ensureSchema` pattern

Schema is bootstrapped by `lib/ensure*Schema.ts` files. Each one is responsible for a table family and runs at app start (or on first access of that family). Found:

- `ensureBlueMemorySchema.ts` — B.L.U.E.'s persistent memory store
- `ensureCreditBuilderSchema.ts` — credit builder feature
- `ensureCustomQuestsSchema.ts` — user-defined quests
- `ensureForumSchema.ts` — community forum
- `ensurePrayersSchema.ts` — prayers feature
- `ensureProposalSchema.ts` — proposal mirror tables for the BlueKillStreak governance contract
- `ensureWeeksSchema.ts` — weekly state mirroring EtherealHorizonPathway

### Rule

When you change a table, update the corresponding `ensure*Schema.ts` file in the same commit. Hand-editing the live DB and forgetting the script breaks fresh deploys.

If a table doesn't have an `ensure*Schema.ts` yet but you're touching it for production, add one. Pattern: idempotent `CREATE TABLE IF NOT EXISTS`, idempotent `CREATE INDEX IF NOT EXISTS`, idempotent column adds via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

## Querying

`lib/db.ts` exposes the configured Postgres client. From server-only code (route handlers, server actions, CRE-adjacent server code), import from there.

**Never** import `lib/db.ts` into a client component. Supabase has separate client-side and server-side clients — if you need browser access, use the public anon-keyed client and rely on RLS, not direct DB access.

## RLS (row-level security)

Production rule: every user-readable table has RLS enabled. The default policy denies all reads; explicit policies grant access by `auth.uid()` or by role.

When adding a new table that holds user data:

1. `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;`
2. Add a SELECT policy keyed on `auth.uid()` matching the user-id column
3. Add INSERT/UPDATE/DELETE policies as needed — most user tables only need INSERT-own and UPDATE-own
4. Service-role usage (server-side, via `SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS — make sure that's actually what you want before reaching for it

## Migrations vs ensures

If a change is destructive (drop column, rename, type change), the `ensure*Schema.ts` pattern is not enough — those scripts are designed for converging an empty DB to the current shape, not migrating an existing DB through a breaking change. For destructive changes:

1. Write a one-shot migration SQL file in a `migrations/` directory (create one if it doesn't exist)
2. Apply it manually against staging → prod
3. THEN update the `ensure*Schema.ts` to reflect the new shape

The ensure script is for greenfield convergence. The migration is for the live DB. Both are required for destructive changes.

## Performance

Common patterns to apply:

- Add indexes for any `WHERE` column that will see > 1000 rows
- Use `select()` with explicit columns, not `*`, on hot paths
- Use Postgres `JSONB` for flexible-shape data (B.L.U.E.'s memory uses this); add `GIN` indexes if you query inside the JSON

## Auth

Supabase Auth handles sessions. The wallet-based login flow is layered on top via `lib/auth.ts` — wallet signature → Supabase JWT. If you're touching auth, check that file plus `app/api/auth/`.

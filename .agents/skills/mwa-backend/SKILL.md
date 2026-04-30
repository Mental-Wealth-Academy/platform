---
name: mwa-backend
description: Mental Wealth Academy production backend operations. Use when changing contracts, Supabase schema, Next.js API routes, CRE workflows, the Eliza-backed B.L.U.E. agent, or the Kalshi market integration. Covers the production stack we are transitioning into.
version: 1.0.0
user-invocable: true
---

The MWA backend, mapped. This skill is the index — pick the reference that matches the surface you're touching. References live in `references/` next to this file.

## Stack at a glance

- **Smart contracts**: Foundry, Solidity 0.8.24, deployed on Base. 4 src files in `contracts/src/`.
- **App**: Next.js 14 in `app/` with 31 API route directories under `app/api/`.
- **Data**: Supabase Postgres, accessed via `lib/db.ts`. Schema is bootstrapped by `lib/ensure*Schema.ts` files (one per table family).
- **AI agent**: B.L.U.E., backed by Eliza Cloud API (`lib/eliza-api.ts`) with persistent memory in Supabase (`lib/blue-memory.ts`) and an on-chain wallet (`lib/blue-wallet.ts`).
- **Workflows**: 3 Chainlink CRE workflows in `cre-workflows/` — `blue-review`, `auto-execute`, `trade-execute`.
- **Markets**: Kalshi (current) via `lib/kalshi-api.ts` and `lib/kalshi-trading.ts`. Polymarket is deprecated — `lib/market-api.ts` is now a Kalshi re-export shim.

## Routing

Pick by what you're touching:

| Touching | Read |
|---|---|
| `contracts/src/*.sol`, deploy scripts, on-chain reads | `references/contracts.md` |
| `lib/ensure*Schema.ts`, RLS, queries to Supabase | `references/supabase.md` |
| Files under `app/api/**` | `references/api-routes.md` |
| Anything in `cre-workflows/` | `references/cre-workflows.md` |
| `lib/eliza-api.ts`, `lib/blue-*`, `bluepersonality.json` | `references/eliza-agent.md` |
| `lib/kalshi-*.ts`, `lib/market-api.ts`, treasury market data | `references/markets.md` |

If you're touching multiple, load multiple — the references are short.

## Production transition rules

This codebase is moving prototype → production. Two rules apply to every backend change:

1. **No new prototype-grade code.** If a new endpoint, contract, or workflow ships, it gets the same hygiene as production code: typed inputs, error handling at boundaries, idempotency where transactions are involved, and a smoke test or Foundry test.
2. **Schema changes are migrations, not edits.** The `ensure*Schema.ts` pattern is the migration mechanism — if you change a table, update the corresponding ensure-script so a fresh deploy converges to the new shape. Don't hand-edit the live DB and forget the script.

## Contract addresses (Base mainnet)

The live governance contract is **BlueKillStreak**. Previous notes referring to "AzuraKillStreak" are stale — the contract was renamed; the on-chain address may or may not have changed depending on redeploys. Always resolve the current address from `contracts/script/Deploy.s.sol` output or the env var the app reads, not from memory.

Other deployed contracts: **BlueMarketTrader**, **EtherealHorizonPathway**, **MockPredictionMarket** (the mock is intentional — it stands in for live prediction-market exposure during the trade-execute pipeline).

## When in doubt

- Schema changes: read `references/supabase.md` first.
- Anything that calls `lib/blue-*`: read `references/eliza-agent.md` first to understand what state you're touching.
- Anything that signs and sends a transaction from B.L.U.E.'s wallet: stop and surface the change to the user before shipping. Her wallet is real value.

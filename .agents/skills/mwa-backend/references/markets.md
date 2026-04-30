# Markets — Kalshi (current), Polymarket (deprecated)

Treasury market data and prediction-market trading. **Kalshi is the live integration.** Polymarket is no longer used — the old `lib/market-api.ts` is now a Kalshi re-export shim.

## Files

| File | Role |
|---|---|
| `lib/kalshi-api.ts` | Kalshi REST client — markets, orderbook, trades |
| `lib/kalshi-trading.ts` | Trade execution against Kalshi |
| `lib/market-api.ts` | Legacy compatibility shim — re-exports from `kalshi-api` under the old Polymarket-era names |

The shim exists so older call sites still resolve. New code should import directly from `lib/kalshi-api.ts`, not from `lib/market-api.ts`.

## Why we moved off Polymarket

Memory note (older): "Polymarket CLOB" was the original integration. The current code is Kalshi. If you find a doc, comment, or memory referencing Polymarket as the live market source, treat it as stale and verify against `lib/`.

## What Kalshi gives us

- Market metadata and categorization (`fetchCategorizedMarkets`, `fetchKalshiMarkets`)
- BTC trade history (`fetchKalshiBtcTrades`)
- Orderbook snapshots (`fetchKalshiOrderbook`)
- Trade execution (`lib/kalshi-trading.ts`)

Types exported: `CategorizedMarkets`, `MarketCategory`, `MarketRow`, `RecentTrade`, `KalshiMarket`, `KalshiTrade`, `KalshiOrderbookSide`.

## API routes that consume Kalshi

Under `app/api/treasury/`:

```
treasury/
├── apple-stats/    — derived stats
├── balance/        — treasury balance reads
├── deploy-apple/   — deployment helper for an apple-related contract
├── distribute/     — distribution endpoint
├── execution-logs/ — ops visibility
├── kalshi/         — Kalshi-specific endpoints
├── prices/         — pricing reads
├── trade/          — trade execution endpoint
└── trades/         — trade history reads
```

All consume `lib/kalshi-api.ts` (or its shim). Don't bypass the lib — it handles auth, retries, and rate-limit backoff.

## Rate limits

Kalshi rate-limits aggressively. Cache reads where possible — particularly orderbooks and market metadata. The lib has internal handling but won't save you if the app makes parallel uncached calls from many routes.

For UI: don't fetch orderbooks from the client. Have the client hit our route, which hits the lib, which caches.

## Trade execution

`lib/kalshi-trading.ts` is the only path that places trades. It's called from:

1. The CRE `trade-execute` workflow (governance-driven trades)
2. Direct admin endpoints in `app/api/treasury/trade/`

Both paths require server-side execution and elevated permissions. Don't add new client-callable trade entry points.

## Replacing the on-chain mock

The on-chain side currently uses `MockPredictionMarket.sol`. When we wire a real on-chain market adapter, the `trade-execute` CRE workflow needs updating in lockstep — the workflow's expected interface is currently shaped by the mock. See `references/contracts.md` and `references/cre-workflows.md`.

## Things that have bitten us

- **The shim hides drift.** `lib/market-api.ts` re-exports compatibility names. If a Kalshi shape changes and the shim doesn't update, callers see stale types. After upgrading Kalshi, audit the shim.
- **Cache keys collide.** Some cache keys were originally Polymarket-shaped (e.g., included `polymarket:` prefixes). Confirm no Polymarket-shaped cache keys remain in production storage.
- **Client-side fetches.** Earlier code paths fetched Kalshi from the browser. Anything still doing that needs to move server-side — both for rate limits and to avoid leaking access patterns.

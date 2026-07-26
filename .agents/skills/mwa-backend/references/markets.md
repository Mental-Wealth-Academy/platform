# Markets — Polymarket (current), Kalshi (deprecated)

> Status note: Polymarket is the live integration; Kalshi files (`lib/kalshi-api.ts` and `lib/kalshi-trading.ts`) remain on disk for reference.

Treasury market data and prediction-market trading. **Polymarket is the live integration.** Kalshi is deprecated.

## Files

| File | Role |
|---|---|
| `lib/polymarket-api.ts` | Polymarket Gamma/CLOB client — markets, orderbook, trades |
| `lib/polymarket-trading.ts` | Trade execution against Polymarket CLOB V2 |
| `lib/market-api.ts` | Re-export shim pointing to polymarket-api |

The shim exists so older call sites still resolve. New code should import directly from `lib/polymarket-api.ts`, not from `lib/market-api.ts`.

## Why we moved back to Polymarket

As a South African entity, Mental Wealth Academy benefits significantly from Polymarket's global accessibility compared to Kalshi's CFTC-regulated US-only access constraints. Moving back to Polymarket restores global reach and liquidity access across international regions.

## What Polymarket gives us

- Market metadata and categorization (`fetchCategorizedMarkets`, `fetchPolymarketMarkets`)
- Trade history (`fetchPolymarketTrades`)
- Orderbook snapshots (`fetchPolymarketOrderbook`)
- Trade execution (`lib/polymarket-trading.ts`)

Types exported: `CategorizedMarkets`, `MarketCategory`, `MarketRow`, `RecentTrade`, `PolymarketMarket`, `PolymarketTrade`, `OrderbookSide`.

## API routes that consume Polymarket

Under `app/api/treasury/`:

```
treasury/
├── balance/        — treasury balance reads
├── execution-logs/ — ops visibility
├── markets/        — Polymarket market data endpoints (replaces legacy kalshi route)
├── prices/         — pricing reads
├── trade/          — trade execution endpoint
└── trades/         — trade history reads
```

Note: The new `/api/treasury/markets` endpoint replaces the legacy `/api/treasury/kalshi` endpoint.

All routes consume `lib/polymarket-api.ts` (or its shim). Don't bypass the lib — it handles auth, retries, and rate-limit backoff.

## Rate limits

Polymarket is less aggressive than Kalshi, but client calls should still cache reads where possible — particularly orderbooks and market metadata.

For UI: don't fetch orderbooks directly from the browser client. Have the client hit our route, which hits the lib, which handles caching.

## Trade execution

`lib/polymarket-trading.ts` uses HMAC-SHA256 L2 auth for trade execution, and collateral is pUSD on Polygon.

It's called from:
1. The CRE `trade-execute` workflow (governance-driven trades)
2. Direct admin endpoints in `app/api/treasury/trade/`

Both paths require server-side execution and elevated permissions. Don't add new client-callable trade entry points.

## Geo-restrictions warning

Polymarket CLOB is geo-blocked in certain countries: United States, United Kingdom, France, Germany, Italy, Netherlands, and Belgium.

To prevent trade execution or CLOB requests from failing due to geo-blocking, Vercel serverless functions calling CLOB endpoints are explicitly routed to allowed regions (`arn1` / Stockholm or `dub1` / Dublin).

## Replacing the on-chain mock

The on-chain side currently uses `MockPredictionMarket.sol`. When we wire a real on-chain market adapter, the `trade-execute` CRE workflow needs updating in lockstep — the workflow's expected interface is currently shaped by the mock. See `references/contracts.md` and `references/cre-workflows.md`.

## Things that have bitten us

- **The shim hides drift.** `lib/market-api.ts` re-exports compatibility names. If a Polymarket shape changes and the shim doesn't update, callers see stale types. Audit the shim when updating Polymarket client types.
- **Cache keys collide.** Ensure cache keys reflect Polymarket structures and old Kalshi-shaped cache keys do not cause collisions in production storage.
- **Geo-blocking errors.** Running CLOB requests from Vercel edge/serverless functions in US/EU restricted regions causes HTTP 403 / IP block errors. Ensure Vercel regional routing points to permitted regions (`arn1`/`dub1`).
- **Client-side fetches.** Earlier code paths fetched market data from the browser. Anything still doing that needs to move server-side — both for rate limits and to avoid leaking access patterns or encountering geo-blocks.

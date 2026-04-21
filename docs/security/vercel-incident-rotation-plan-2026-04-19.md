# Vercel Incident Rotation Plan

Date: 2026-04-19

Trigger:
- Vercel disclosed unauthorized access to certain internal systems on April 19, 2026.
- Vercel says a limited subset of customers were impacted, but advises customers to review activity logs and rotate environment variables containing secrets that were not marked as sensitive.
- Vercel also published an IOC for a compromised Google Workspace OAuth app:
  `110671459871-30f1spbu0hptbs60cb4vsmv79i7bbvqj.apps.googleusercontent.com`

Official references:
- https://vercel.com/kb/bulletin/vercel-april-2026-security-incident
- https://vercel.com/docs/activity-log/
- https://vercel.com/docs/projects/environment-variables/sensitive-environment-variables
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/security/deployment-protection

## Assumption

Treat any Vercel environment variable that contains a secret and was not marked as Sensitive as potentially exposed until proven otherwise.

## Repo-Specific Blast Radius

This project has server-side endpoints on Vercel that can trigger financial or privileged actions if secrets are exposed:

- `app/api/treasury/trade/route.ts`
  Uses `CRON_SECRET` and can run the trading cycle.
- `app/api/treasury/execute/route.ts`
  Uses `INTERNAL_API_SECRET` and can place Polymarket orders.
- `app/api/treasury/distribute/route.ts`
  Uses `ADMIN_SECRET` and can distribute USDC to holders.
- `app/api/treasury/deploy-apple/route.ts`
  Uses `ADMIN_SECRET` and can deploy a token.
- `app/api/voting/proposal/review/route.ts`
  Uses `INTERNAL_API_SECRET` and `AZURA_PRIVATE_KEY`; can submit on-chain review actions.
- `app/api/voting/proposal/review-sweep/route.ts`
  Uses both `CRON_SECRET` and `INTERNAL_API_SECRET`; can retrigger proposal review flows.
- `app/api/webhooks/cdp/route.ts`
  Uses `CDP_WEBHOOK_SECRET`.
- `vercel.json`
  Configures Vercel cron calls for `/api/treasury/trade` and `/api/voting/proposal/review-sweep`.

## Immediate Containment: First 30 Minutes

1. Review Vercel account and team activity.
   - Check the Vercel Activity Log for:
     - environment variable reads or changes
     - membership or role changes
     - new deployments
     - domain changes
     - token or integration changes
   - If on Enterprise, export Audit Logs as well.

2. Check Google Workspace for the published IOC.
   - Search for OAuth app client ID:
     `110671459871-30f1spbu0hptbs60cb4vsmv79i7bbvqj.apps.googleusercontent.com`
   - Revoke it everywhere if present.

3. Freeze risky automation before rotating long-tail keys.
   - Immediately rotate or temporarily unset:
     - `CRON_SECRET`
     - `INTERNAL_API_SECRET`
     - `ADMIN_SECRET`
   - Redeploy immediately after this batch.
   - Goal: stop or invalidate access to trading, treasury, admin, and internal-control endpoints first.

4. Restrict exposure of old and preview deployments.
   - Enable Vercel Deployment Protection for preview URLs at minimum.
   - If operationally possible, protect all deployments until rotation is complete.
   - Remember that environment variable changes only apply to new deployments, not previous ones.

5. Revoke access paths outside env vars.
   - Review and revoke unnecessary Vercel team access.
   - Revoke or rotate Vercel personal/team access tokens.
   - Review deploy hooks, webhooks, marketplace/integration tokens, and Git integration access.

## Critical Caution: `DATABASE_URL` Is Also an Encryption Secret Fallback

`lib/encrypt.ts` derives encryption keys from:

- `NOTES_ENCRYPTION_KEY`, or if unset
- `DATABASE_URL`

That means rotating `DATABASE_URL` blindly can break decryption of existing encrypted note data.

Safe sequence:

1. Determine whether production already has `NOTES_ENCRYPTION_KEY` set.
2. If it does not:
   - set `NOTES_ENCRYPTION_KEY` to the current production `DATABASE_URL` value
   - deploy once so the app starts using the stable explicit key
3. Only after that rotate `DATABASE_URL`
4. If you want a new long-term notes key later, do a separate re-encryption migration

Do not rotate the database password first without handling this dependency.

## Rotation Order

### P0: Rotate Immediately

These credentials can move funds, submit on-chain actions, trigger privileged endpoints, or expose core data.

1. Control secrets
   - `CRON_SECRET`
   - `INTERNAL_API_SECRET`
   - `ADMIN_SECRET`
   - `CDP_WEBHOOK_SECRET`
   - `PRIVY_APP_SECRET` if set in Vercel

2. Database credentials
   - `DATABASE_URL`
   - `POSTGRES_HOST`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`
   - `POSTGRES_PORT`

3. Private keys and wallet material
   - `AZURA_PRIVATE_KEY`
   - `PATHWAY_OWNER_PRIVATE_KEY`
   - `POLYMARKET_WALLET_PRIVATE_KEY`
   - `CDP_API_KEY_PRIVATE_KEY`
   - `AZURA_WALLET_SEED`

4. Trading credentials
   - `POLYMARKET_CLOB_API_KEY`
   - `POLYMARKET_CLOB_SECRET`
   - `POLYMARKET_CLOB_PASSPHRASE`

Important:
- For asymmetric blockchain private keys, "rotation" means generating a new key or wallet, moving funds and permissions, and updating the app. It is not just changing a password.
- Pause trading and treasury execution until wallet and exchange credentials are replaced and validated.

### P1: Rotate Same Day

These can cause account abuse, quota burn, impersonation, or downstream compromise.

- `ELIZA_API_KEY`
- `ANTHROPIC_API_KEY`
- `DEEPSEEK_API_KEY`
- `NEYNAR_API_KEY`
- `X_API_KEY`
- `X_SECRET`
- `X_BEARER_TOKEN`
- `NOSANA_API_KEY`
- `MAILCHIMP_API_KEY`
- `PADLET_API`
- `CLANKER_API_KEY`
- `CDP_API_KEY_NAME` if paired operationally with the regenerated CDP private key

### P2: Rotate If Exposed or If Abuse Appears

These are public by design or lower-risk operational identifiers, but they may still merit regeneration if you see abuse, quota drain, or provider guidance to rotate them.

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_ALCHEMY_ID`
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `BASESCAN_API_KEY`

### No Rotation Needed

These are public or configuration-only and are not secrets:

- `NEXT_PUBLIC_AZURA_KILLSTREAK_ADDRESS`
- `NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS`
- `NEXT_PUBLIC_USDC_ADDRESS`
- `NEXT_PUBLIC_PATHWAY_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_AZURA_MARKET_TRADER_ADDRESS`
- `NEXT_PUBLIC_BASE_RPC_URL`
- `BASE_RPC_URL`
- `NEXT_PUBLIC_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SCATTER_COLLECTION_ADDRESS`
- `NEXT_PUBLIC_SCATTER_CHAIN_ID`
- `SEASON_START_DATE`
- `NEXT_PUBLIC_SEASON_START_DATE`
- token addresses, pool addresses, and other on-chain public constants

## Repo-Specific Credential Notes

### `AZURA_PRIVATE_KEY`

Used by:
- `app/api/voting/proposal/review/route.ts`
- `lib/x402-research.ts`

Action:
- create a new reviewer wallet
- move any funds needed for gas
- update any on-chain role or allowlist that expects the old address
- redeploy with the new key

### `PATHWAY_OWNER_PRIVATE_KEY`

Used by:
- `lib/pathway-contract.ts`

Action:
- transfer any contract ownership or admin authority to a new address
- verify ownership change on-chain before re-enabling workflows

### Polymarket credentials

Used by:
- `lib/polymarket-clob.ts`
- `app/api/treasury/execute/route.ts`
- `app/api/treasury/trade/route.ts`

Action:
- create a new wallet if private-key compromise is possible
- regenerate CLOB API credentials
- move funds or positions as needed
- keep trading disabled until new credentials are live and tested

### Coinbase / CDP credentials

Used by:
- `lib/azura-wallet.ts`
- `app/api/webhooks/cdp/route.ts`

Action:
- regenerate CDP API key material
- rotate `CDP_WEBHOOK_SECRET`
- verify wallet access and webhook signature validation after redeploy

## Execution Sequence

1. Rotate `CRON_SECRET`, `INTERNAL_API_SECRET`, `ADMIN_SECRET`, `CDP_WEBHOOK_SECRET`
2. Redeploy production
3. Stabilize `NOTES_ENCRYPTION_KEY` if `DATABASE_URL` is currently the fallback secret
4. Rotate database credentials
5. Redeploy production
6. Migrate blockchain private keys and trading credentials
7. Redeploy production
8. Rotate provider API keys
9. Redeploy production
10. Re-enable cron and admin flows only after validation

## Validation Checklist

After each rotation batch:

- confirm a fresh production deployment was created
- verify old deployment URLs are not unintentionally public
- verify `/api/treasury/trade` rejects old auth
- verify `/api/treasury/execute` rejects old auth
- verify `/api/treasury/distribute` rejects old auth
- verify `/api/webhooks/cdp` rejects old signatures
- verify DB reads and writes still work
- verify encrypted note read/write still works
- verify proposal review flow still works
- verify no unexpected outbound provider errors appear in runtime logs

## Post-Incident Hardening

1. Mark all production and preview secrets as Sensitive in Vercel.
2. Enable the team policy that enforces Sensitive environment variables.
3. Split preview and production credentials where possible.
4. Move any long-lived wallet or admin material off Vercel if it is not strictly required there.
5. Add a runtime incident kill switch for privileged routes.
6. Reduce blast radius by separating:
   - trading automation
   - admin endpoints
   - webhook handlers
   - user-facing app
7. Replace any fallback pattern that uses `DATABASE_URL` as an encryption secret.

## Current Inventory Found In This Repo

High-confidence secret-bearing env vars found in code or local env inventory:

- `ADMIN_SECRET`
- `ANTHROPIC_API_KEY`
- `AZURA_PRIVATE_KEY`
- `AZURA_WALLET_ID`
- `AZURA_WALLET_SEED`
- `CDP_API_KEY_NAME`
- `CDP_API_KEY_PRIVATE_KEY`
- `CDP_WEBHOOK_SECRET`
- `CLANKER_API_KEY`
- `CRON_SECRET`
- `DATABASE_URL`
- `DEEPSEEK_API_KEY`
- `ELIZA_API_KEY`
- `INTERNAL_API_SECRET`
- `MAILCHIMP_API_KEY`
- `NEYNAR_API_KEY`
- `NOSANA_API_KEY`
- `NOTES_ENCRYPTION_KEY`
- `PADLET_API`
- `PATHWAY_OWNER_PRIVATE_KEY`
- `POLYMARKET_CLOB_API_KEY`
- `POLYMARKET_CLOB_PASSPHRASE`
- `POLYMARKET_CLOB_SECRET`
- `POLYMARKET_WALLET_PRIVATE_KEY`
- `PRIVY_APP_SECRET`
- `X_API_KEY`
- `X_BEARER_TOKEN`
- `X_SECRET`

## Notes

- This plan is repo-specific and should be executed against both Production and Preview scopes in Vercel.
- If the same values are reused in `cre-workflows`, local automation, GitHub Actions, or other secret stores, rotate them there as part of the same incident.

# Mental Wealth Academy

A decentralized micro-university. Education, governance, AI review, and autonomous treasury management — all on-chain.

## Tech Stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript
- **Blockchain:** Solidity 0.8.24 (Foundry), ethers v5, viem, wagmi, ConnectKit
- **Database:** PostgreSQL (Supabase pooler) via `pg` library
- **AI:** Eliza Cloud API (primary), Anthropic Claude (fallback + trading)
- **Markets:** Kalshi public API (read-only, dry-run signals), CoinGecko prices
- **3D/Animation:** Three.js, react-three/fiber, Framer Motion
- **Deployment:** Vercel (Next.js), Base Mainnet (contracts)
- **CRE:** Chainlink Runtime Environment for decentralized governance

## Deployed Contracts (Base Mainnet)

| Contract | Address |
|----------|---------|
| BlueKillStreak (governance) | `0x2cbb90a761ba64014b811be342b8ef01b471992d` |
| GovernanceToken (ERC20Votes) | `0x84939fEc50EfdEDC8522917645AAfABFd5b3EA6F` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| EtherealHorizonPathway | `0xd116e780Ca9Ec3984e7682e095aaB50006A9c160` |

> **Note:** Source files are named `Blue*` (formerly `Azura*`). The deployed bytecode at the addresses above still carries the original names — Basescan will show `AzuraKillStreak`/`AzuraMarketTrader` until a redeploy. No functional impact; rename is source-only.

## Project Structure

```
app/                    # Next.js App Router (12 pages, 48+ API routes)
components/             # 71 React component directories
contracts/              # Foundry project (4 Solidity contracts, 70 tests)
  src/                  # Contract source files
  test/                 # Forge tests
  script/               # Deployment scripts
cre-workflows/          # Chainlink CRE (governance only, self-contained)
  blue-review/          # Event: AI proposal scoring via DON
  auto-execute/         # Cron: execute proposals past threshold
  trade-execute/        # Event: route governance trades to MarketTrader
  shared/               # ABI fragments
lib/                    # 33 utility files (db, auth, contracts, trading, AI)
db/                     # Schema SQL and migrations
styles/                 # CSS globals and design tokens
types/                  # TypeScript type definitions
hooks/                  # React hooks (sound, SNP worker)
scripts/                # Server-side utility scripts (tsx)
workers/                # Web Workers (SNP matching)
data/                   # brand-identity.json, funding.json
public/                 # Icons, images, readings, logos
docs/                   # Design system, legacy docs, state machines
```

## Key Conventions

### Database
- Use `sqlQuery()` from `lib/db.ts` with named params: `sqlQuery('SELECT * FROM users WHERE id = :id', { id })`
- Schema auto-creation via `ensure*Schema()` functions
- Supabase PostgreSQL with connection pooler (port 6543)

### Smart Contracts
- ABIs defined as ethers v5 human-readable strings in `lib/blue-contract.ts`
- Run Forge commands from `contracts/` directory: `cd contracts && forge test`
- CRE workflows use `onReport()` pattern with `actionType` dispatch
- `keystoneForwarder` gates all DON-signed reports

### API Routes
- Auth: `getCurrentUserFromRequestCookie()` or wallet signature verification
- Internal cross-service calls use `x-internal-secret` header
- Rate limiting on sensitive endpoints via `lib/rate-limit.ts`

### Frontend
- Path alias: `@/*` maps to project root
- Web3Provider wraps wallet-connected pages
- Sound effects via `SoundProvider` + `useSound()` hook
- CSS Modules for component-scoped styles

### CRE Workflows
- Self-contained in `cre-workflows/` with own `package.json` and `tsconfig.json`
- Root `tsconfig.json` excludes `cre-workflows/`
- Demo: `cre workflow simulate --workflow <name>` forces execution regardless of trigger

## Architecture: Governance Flow

```
User creates proposal on-chain (createProposal)
  → ProposalCreated event
  → CRE blue-review workflow triggers
  → Eliza AI scores (6 dimensions) → level 0-4
  → Level 0: proposal killed
  → Level 1-4: Blue votes with 10-40% weight, proposal goes Active
  → Community votes (snapshot-based, anti-transfer)
  → forVotes >= 50% threshold
  → CRE auto-execute workflow submits DON-signed report
  → onReport(actionType=1) executes proposal
  → USDC transferred to recipient
  → If recipient = MarketTrader: trade-execute workflow fires
```

## Architecture: Markets

### Edge detection (trading-engine.ts) — Kalshi, dry-run
- Pulls curated Kalshi markets (crypto/AI/sports/politics) and CoinGecko spot.
- Black-Scholes binary pricing (SIGMA=0.50, EDGE_THRESHOLD=3%).
- Quarter-Kelly notional sizing (max 5% per position, 40% total exposure).
- Emits SIGNAL entries to the live execution log; **no order placement is wired** — Kalshi requires RSA-signed REST calls and a separate USD funding rail, both intentionally out of scope.

## Environment Variables

### Required
```
DATABASE_URL                           # Supabase PostgreSQL connection string
NEXT_PUBLIC_BLUE_KILLSTREAK_ADDRESS   # Governance contract
NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS   # ERC20Votes token
NEXT_PUBLIC_USDC_ADDRESS               # USDC on Base
NEXT_PUBLIC_PATHWAY_CONTRACT_ADDRESS   # Pathway contract
NEXT_PUBLIC_BASE_RPC_URL               # Base Mainnet RPC
BASE_RPC_URL                           # Server-side RPC
BLUE_PRIVATE_KEY                      # Blue agent wallet
PATHWAY_OWNER_PRIVATE_KEY              # Pathway owner wallet
ELIZA_API_KEY                          # Eliza Cloud API
ELIZA_API_BASE_URL                     # https://www.elizacloud.ai
ANTHROPIC_API_KEY                      # Claude fallback
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID   # WalletConnect
INTERNAL_API_SECRET                    # Inter-service auth
```

### Optional
```
PADLET_API                             # Community board
SEASON_START_DATE                      # Defaults to 2026-03-02T00:00:00Z
```

## Vercel Cron Jobs

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/treasury/trade` | Daily midnight | Run dry-run signal scan and update execution log |
| `/api/voting/proposal/review-sweep` | Daily midnight | Review pending proposals |

## Testing

```bash
# Smart contracts (70 tests)
cd contracts && forge test

# Next.js dev
npm run dev

# Install (legacy peer deps required)
npm install --legacy-peer-deps
```

## Design System

- **Primary:** #5168FF (Academy Blue)
- **Background:** #FBF8FF (Light Purple)
- **Fonts:** Poppins (body), Space Grotesk (headlines), IBM Plex Mono (code)
- **Animation:** Framer Motion for UI, Three.js for 3D landing scene

## Security

- Wallet signature auth (EIP-191, 5-min expiry)
- Session cookies (httpOnly, secure, sameSite=none, 30-day)
- Parameterized SQL queries (no raw string interpolation)
- DON-signed CRE reports (tamper-proof governance)
- Snapshot-based voting (prevents vote-transfer attacks)
- Row-level security on Supabase
- HSTS, CSP, X-Content-Type-Options headers

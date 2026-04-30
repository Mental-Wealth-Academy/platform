# Smart Contracts

## Layout

```
contracts/
├── foundry.toml          — Solidity 0.8.24, optimizer 200 runs, via_ir on
├── src/
│   ├── BlueKillStreak.sol         — Governance: token-weighted voting, proposals, execution
│   ├── BlueMarketTrader.sol       — Treasury: routes USDC into prediction-market trades
│   ├── EtherealHorizonPathway.sol — User-state: weekly seals, pathway completion
│   └── MockPredictionMarket.sol   — Mock counterparty for the trade pipeline
├── script/
│   ├── Deploy.s.sol         — Main deploy
│   └── DeployPathway.s.sol  — Pathway-specific deploy
└── test/                    — Foundry tests (fuzz runs: 256)
```

Remappings: `@openzeppelin/=lib/openzeppelin-contracts/`. USDC addresses are in scripts: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia), `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base Mainnet).

## What each contract does

### BlueKillStreak (governance)

Proposals → token-weighted votes → execution. Emits:
- `ProposalCreated` — picked up by the `blue-review` CRE workflow for AI scoring
- `ProposalExecuted` — picked up by `trade-execute` when the action is a trade

Action types matter: type 3 = trade proposal, routed through BlueMarketTrader. Other types execute via standard flow (e.g., USDC to recipient).

### BlueMarketTrader (treasury)

Holds USDC, executes prediction-market positions on behalf of the DAO. Owner-controlled setters: `setPredictionMarket`, `setKeystoneForwarder`. The forwarder is the address authorized to deliver DON-signed reports from CRE.

### EtherealHorizonPathway (user state)

Tracks per-user weekly seals and overall pathway completion. Read pattern:
- `isWeekSealed(user, week) -> bool`
- `getSealedWeekCount(user) -> uint256`
- `pathwayCompleted(user) -> bool`

The owner seals weeks. This is the on-chain mirror of quest-completion state.

### MockPredictionMarket

Stand-in counterparty so the trade pipeline runs end-to-end without real market exposure. Replace with a real adapter when ready — but check the trade-execute workflow first to make sure the interface still matches.

## Deploy flow

1. `forge build` (compiles)
2. Set env: RPC URL for target chain, deployer key, `BLUE_AGENT_ADDRESS`
3. `forge script script/Deploy.s.sol --broadcast --rpc-url <base|base-sepolia>`
4. Copy deployed addresses into the app's env (`.env.local` and Vercel)
5. Update `references/api-routes.md` if any route reads a new contract

## Reading contracts from the app

Helpers: `lib/blue-contract.ts` (BlueKillStreak interactions), `lib/pathway-contract.ts` (EtherealHorizonPathway). Use `viem` clients — see existing call sites for the pattern. Always read addresses from env, never hard-code.

## Things that have bitten us

- **Renames lag the docs.** `BlueKillStreak` was previously called `AzuraKillStreak`. If a grep turns up the old name, treat it as stale and resolve the current name from `contracts/src/`.
- **The mock is load-bearing.** The trade-execute workflow expects the MockPredictionMarket interface. If you swap in a real adapter, the workflow needs updating too — they're a pair.
- **`via_ir` is on.** Compilation is slower but stack-too-deep errors are avoided. Don't disable it without understanding what breaks.
- **CRE forwarder address is wired separately.** After deploying, `setKeystoneForwarder` on BlueMarketTrader must be called with the CRE forwarder address for that environment, or `trade-execute` reverts.

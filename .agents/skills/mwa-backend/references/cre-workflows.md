# Chainlink CRE Workflows

Self-contained TypeScript workflows that run on Chainlink CRE (DON-signed off-chain compute that delivers reports on-chain). Live in `cre-workflows/`.

## The three workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `blue-review` | `ProposalCreated` event on BlueKillStreak | Calls Eliza for AI scoring, computes `blueLevel` (0–4), submits a DON-signed review on-chain via `onReport()` |
| `auto-execute` | Cron, every 10 minutes | Reads active proposals, auto-executes any past 50% vote threshold via KeystoneForwarder |
| `trade-execute` | `ProposalExecuted` event on BlueKillStreak | For trade-action proposals, executes the corresponding position on MockPredictionMarket |

The three together implement the proposal-to-trade pipeline: a proposal is created → B.L.U.E. reviews it → the DAO votes → it auto-executes once it passes → if it's a trade, the trade fires on the market contract.

## Layout

```
cre-workflows/
├── package.json         — own deps (it's self-contained)
├── tsconfig.json        — own TS config
├── project.yaml         — CRE project config
├── secrets.yaml         — secret references (NOT secret values; values live in CRE secrets)
├── shared/              — code shared across workflows
├── blue-review/
│   ├── main.ts             — workflow entry
│   ├── workflow.yaml       — workflow metadata + paths
│   ├── config.production.json — runtime config (addresses, params)
│   └── tmp.{js,wasm}       — build artifacts
├── auto-execute/  (same shape)
└── trade-execute/ (same shape)
```

## The self-contained rule

`cre-workflows/` has its own `package.json`, `tsconfig.json`, and `node_modules/`. **Do not** try to share dependencies with the main app — CRE's runtime expects the workflow to ship as a single bundle, and the build pipeline depends on the local module graph.

If you need code in both the app and a workflow, copy it (or move it to `cre-workflows/shared/` and import only from there).

## Editing a workflow

1. Edit `<workflow>/main.ts`
2. Update `<workflow>/config.production.json` if any addresses or parameters changed
3. Run the simulator (see below) before pushing
4. Stage on `*-staging` workflow names first; promote to production names only after staging passes

## Simulating

Force execution against the local config:

```
cre workflow simulate --workflow <name>
```

This is the fastest feedback loop. It exercises the trigger, runs `main.ts`, and prints what would be reported on-chain.

## Secrets

`secrets.yaml` references secret keys; the actual values live in CRE secret storage. Don't commit values. To add a new secret:

1. Add the key reference to `secrets.yaml`
2. Add the value via `cre secret set <key>` for both staging and production
3. Reference it from `main.ts` via the CRE secrets API

## On-chain interface

Workflows emit DON-signed reports that are delivered to a `KeystoneForwarder` contract. The forwarder authorizes BlueKillStreak (or BlueMarketTrader, for trades) to consume the report. After deploying contracts, **the forwarder address must be set** via `setKeystoneForwarder` on the consuming contract — otherwise the workflow runs successfully but the on-chain side rejects.

## Things that have bitten us

- **Forgetting to set the forwarder.** The workflow logs success; the contract reverts silently to the user. Always verify after deploy.
- **Stale `config.production.json`.** A redeploy that changes a contract address requires the config to be regenerated. The workflow won't fail loudly — it just calls the wrong contract.
- **Mixing staging and prod artifacts.** The `*-staging` workflow names exist for a reason. Promote intentionally; don't deploy directly to prod.
- **Editing in `cre-workflows/` with the main-app TS settings open.** The configs are different. Use the `cre-workflows/tsconfig.json` when working in this directory.

## Adding a new workflow

If a new on-chain pipeline needs CRE compute:

1. Copy an existing workflow directory as a template
2. Update `workflow.yaml` with new names (production AND staging)
3. Write `main.ts`
4. Add to `project.yaml`
5. Simulate, stage, promote

Keep the three-workflow boundary clear: don't fold new logic into existing workflows if it's a separate trigger or a separate concern.

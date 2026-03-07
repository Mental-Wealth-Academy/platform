<div align="center">

<img width="1536" height="769" alt="gtihbuatv" src="https://github.com/user-attachments/assets/b5616451-38b0-4a84-ac0d-cdcf2c1e4424" />

# Mental Wealth Academy

**AI-governed treasury with Chainlink CRE automation on Base**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity&logoColor=white)](https://soliditylang.org/)
[![Chainlink CRE](https://img.shields.io/badge/Chainlink-CRE-375BD2?style=for-the-badge&logo=chainlink&logoColor=white)](https://chain.link/)
[![Base](https://img.shields.io/badge/Base-Mainnet-0052FF?style=for-the-badge)](https://base.org/)

</div>

---

## What This Is

A governance system where an AI agent (Azura) scores funding proposals, the community votes on-chain, and **Chainlink CRE workflows automate the entire pipeline** from review to trade execution -- no centralized server required.

**Contract:** [`0x2cbb90a761ba64014b811be342b8ef01b471992d`](https://basescan.org/address/0x2cbb90a761ba64014b811be342b8ef01b471992d) (Base Mainnet)

---

## CRE Integration (Core Submission)

Three CRE workflows run in the Chainlink DON, automating the full proposal lifecycle:

### 1. `azura-review` -- AI Proposal Scoring
**Trigger:** `ProposalCreated` event on-chain

When a proposal is submitted, this workflow reads the proposal from the contract, calls the Eliza AI API for scoring across 6 dimensions (clarity, impact, feasibility, budget, ingenuity, chaos), computes an approval level (0-4), and writes the review back on-chain via a DON-signed report (`actionType 2`).

Azura's level determines her voting weight: Level 1 = 10%, Level 2 = 20%, Level 3 = 30%, Level 4 = 40%. Level 0 kills the proposal outright. Because the AI scoring runs inside the DON, no single server can fake scores.

### 2. `auto-execute` -- Proposal Execution
**Trigger:** Cron (every 10 minutes)

Scans all active proposals. When one has reached the 50% vote threshold, it submits a DON-signed report (`actionType 1`) to execute the proposal on-chain, transferring USDC to the recipient.

### 3. `trade-execute` -- Prediction Market Trading
**Trigger:** `ProposalExecuted` event on-chain

When a trade proposal passes governance, this workflow reads the proposal details, selects the best matching prediction market, infers trade direction from the proposal text, and submits a DON-signed report (`actionType 3`) that routes treasury USDC into a prediction market position via `MockPredictionMarket.buyOutcome()`.

This closes the loop: **proposal -> AI review -> community vote -> automated trade** -- all verified by the Chainlink DON.

### Pipeline

```
Proposal Created
       |
       v
  [CRE: azura-review]     -- DON scores proposal, writes level on-chain
       |
       v
  Community Votes          -- token-weighted, 50% threshold
       |
       v
  [CRE: auto-execute]     -- DON detects threshold, executes proposal
       |
       v
  [CRE: trade-execute]    -- DON routes USDC into prediction market position
```

---

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| **AzuraKillStreak** | Governance: proposals, token-weighted voting, CRE `onReport()` receiver with 3 action types |
| **MockPredictionMarket** | Binary outcome market accepting USDC -- mock target for CRE trade execution |
| **EtherealHorizonPathway** | 14-milestone on-chain seal system for the educational pathway |

`onReport()` dispatches on `actionType`: 1 = auto-execute, 2 = AI review, 3 = trade execution. All reports are DON-signed and delivered via the KeystoneForwarder.

### Tests

```bash
cd contracts && forge test
# 56 tests pass: 40 governance + trade execution, 16 pathway
```

Key test coverage:
- AI review at all levels (0-4), including CRE-delivered reviews
- Community voting with snapshot-based anti-manipulation
- Trade execution via `actionType 3` with `vm.store` to isolate the CRE trade path
- Mock prediction market position tracking (YES/NO)
- Revert conditions: unauthorized, below threshold, no market set

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Contracts** | Solidity 0.8.24, Foundry, Base Mainnet |
| **Automation** | Chainlink CRE (3 workflows), KeystoneForwarder |
| **AI Agent** | Azura via Eliza Cloud API |
| **Frontend** | Next.js 14, TypeScript |
| **Wallet** | Coinbase SDK |

---

## Project Structure

```
contracts/
  src/
    AzuraKillStreak.sol         -- Governance + CRE receiver
    MockPredictionMarket.sol    -- Trade target for CRE
    EtherealHorizonPathway.sol  -- Educational milestones
  test/
    AzuraKillStreak.t.sol       -- 40 tests (governance + trade)
    EtherealHorizonPathway.t.sol

cre-workflows/
  azura-review/     -- Event-triggered AI scoring
  auto-execute/     -- Cron-based proposal execution
  trade-execute/    -- Event-triggered trade routing
  shared/abi.ts     -- Shared contract ABI fragments
```

---

## Running Locally

```bash
# Frontend
npm install && npm run dev

# Contracts
cd contracts && forge build && forge test

# CRE workflows (simulate)
cd cre-workflows && cre workflow simulate --workflow azura-review
cd cre-workflows && cre workflow simulate --workflow trade-execute
```

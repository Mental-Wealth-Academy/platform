<div align="center">

<img width="1536" height="769" alt="gtihbuatv" src="https://github.com/user-attachments/assets/b5616451-38b0-4a84-ac0d-cdcf2c1e4424" />

# Mental Wealth Academy

**Decentralized Education, Micro-University For Humans & Machines Evolving Through Collectively Owned Cyberspace.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity&logoColor=white)](https://soliditylang.org/)
[![Chainlink CRE](https://img.shields.io/badge/Chainlink-CRE-375BD2?style=for-the-badge&logo=chainlink&logoColor=white)](https://chain.link/)
[![Base](https://img.shields.io/badge/Base-Mainnet-0052FF?style=for-the-badge)](https://base.org/)

</div>

---

## What This Is

A learning app with a transparent treasury where an AI Agent (Blue) scores funding proposals, community uses **Chainlink CRE workflows + ElizaOS to automate the pipeline** from review to autonomous executions -- min beaurocratic pressure required.

**Governance:** [`0x2cbb90a761ba64014b811be342b8ef01b471992d`](https://basescan.org/address/0x2cbb90a761ba64014b811be342b8ef01b471992d) (Base Mainnet)

---



https://github.com/user-attachments/assets/e111f509-1f39-4009-8c8e-b8beef6165a0



## What's The Most Advanced Stuff

### `/community`

The community governance hub. Members submit funding proposals, vote on-chain, and interact with **Blue** -- our AI governance agent.

- **Private Governance Calls** -- Blue reviews every proposal through the ElizaOS API, scoring across 6 dimensions (clarity, impact, feasibility, budget, ingenuity, chaos). Reviews are delivered on-chain via CRE workflow DON, making AI scoring tamper-proof.
- **On-chain Voting** -- Token-weighted community votes with a 50% threshold. Blue's approval level (1-4) determines her voting weight (10%-40%). Level 0 kills the proposal outright.

### `/markets`

A live edge-detection dashboard scanning **Kalshi**, the CFTC-regulated US prediction market exchange.

- **Black-Scholes Binary Pricer** -- Compares Kalshi market prices against a short-dated Black-Scholes model fed by live CoinGecko spot. Edges over 3% become signals.
- **Quarter-Kelly Sizing** -- Conservative position sizing caps notional at 5% of the trading treasury per position, 40% total exposure.
- **Live Orderbooks** -- Curated Kalshi markets across crypto, AI, sports, and politics, sorted by balance, volume, and end-date proximity.
- **Dry-Run Signals** -- Order placement is intentionally not wired. Signals are emitted to the execution log for review; nothing routes capital without explicit approval.
- **Governance Path** -- Trade proposals can also flow through community governance on `/community`, giving the DAO direct input on trading decisions.

---

## CRE Integration

Three CRE workflows run in the Chainlink DON, automating governance review and execution:

### 1. `blue-review` -- AI Proposal Scoring
**Trigger:** `ProposalCreated` event on-chain

When a proposal is submitted, this workflow reads the proposal from the contract, calls the Eliza AI API for scoring across 6 dimensions (clarity, impact, feasibility, budget, ingenuity, chaos), computes an approval level (0-4), and writes the review back on-chain via a DON-signed report (`actionType 2`).

Blue's level determines her voting weight: Level 1 = 10%, Level 2 = 20%, Level 3 = 30%, Level 4 = 40%. Level 0 kills the proposal outright. Because the AI scoring runs inside the DON, no single server can fake scores.

### 2. `auto-execute` -- Proposal Execution
**Trigger:** Cron (every 10 minutes)

Scans all active proposals. When one has reached the 50% vote threshold, it submits a DON-signed report (`actionType 1`) to execute the proposal on-chain, transferring USDC to the recipient.

### 3. `trade-execute` -- Governance-Triggered Trading
**Trigger:** `ProposalExecuted` event on-chain

When a trade proposal passes governance and the recipient is the trader contract, this workflow infers trade direction from the proposal text and submits a DON-signed report to `BlueMarketTrader.onReport()`, routing the trading treasury's USDC into a prediction market position.

> The autonomous market scanner is a Vercel cron, not a CRE workflow. CRE is reserved for governance paths where DON signatures gate on-chain state changes.

### Pipeline

```mermaid
flowchart TD
    A([📝 Proposal Created]) --> B[🤖 CRE: blue-review]
    B -->|DON scores proposal,\nwrites level on-chain| C{🗳️ Community Votes}
    C -->|50% threshold reached| D[⚡ CRE: auto-execute]
    C -->|below threshold| X([❌ Rejected])
    D -->|DON executes proposal| E{Route?}
    E -->|Funding| F([💰 USDC to Recipient])
    E -->|Trade| G[📊 CRE: trade-execute]
    G -->|DON routes to trader| H([🎯 BlueMarketTrader])

    I([⏰ Vercel Cron]) --> J[📈 Kalshi Edge Scanner]
    J -->|Black-Scholes vs market| K([📡 Signal Log])

    style A fill:#5168FF,color:#fff,stroke:#1A1D33
    style B fill:#375BD2,color:#fff,stroke:#1A1D33
    style C fill:#FF7729,color:#fff,stroke:#1A1D33
    style D fill:#375BD2,color:#fff,stroke:#1A1D33
    style F fill:#74C465,color:#fff,stroke:#1A1D33
    style G fill:#375BD2,color:#fff,stroke:#1A1D33
    style H fill:#0052FF,color:#fff,stroke:#1A1D33
    style I fill:#5168FF,color:#fff,stroke:#1A1D33
    style J fill:#5168FF,color:#fff,stroke:#1A1D33
    style K fill:#74C465,color:#fff,stroke:#1A1D33
    style X fill:#e74c3c,color:#fff,stroke:#1A1D33
```

---

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| **BlueKillStreak** | Governance: proposals, token-weighted voting, CRE `onReport()` receiver (actionType 1 = auto-execute, 2 = AI review). All reports DON-signed via KeystoneForwarder. |
| **BlueMarketTrader** | Separate trading treasury: owner and CRE-triggered trades on prediction markets. Own `onReport()` receiver, `deposit()`/`withdraw()` for treasury management. |
| **MockPredictionMarket** | Binary outcome market accepting USDC -- mock target for trade execution testing. |
| **EtherealHorizonPathway** | 14-milestone on-chain seal system for the 12-week educational pathway. |

### Tests

```bash
cd contracts && forge test
# 70 tests pass: 31 governance, 23 market trader, 16 pathway
```

Key test coverage:
- AI review at all levels (0-4), including CRE-delivered reviews
- Community voting with snapshot-based anti-manipulation
- Trader contract: buy YES/NO, CRE onReport, deposit/withdraw, insufficient balance
- Mock prediction market position tracking
- Revert conditions: unauthorized, below threshold, no market set, zero amount

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Contracts** | Solidity 0.8.24, Foundry, Base Mainnet |
| **Automation** | Chainlink CRE (3 governance workflows), KeystoneForwarder |
| **Markets** | Kalshi public API, CoinGecko spot prices |
| **AI Agent** | Blue via Eliza Cloud API (reviews), Anthropic Claude (chat) |
| **Frontend** | Next.js 14, TypeScript |
| **Wallet** | Coinbase SDK |

---

## Project Structure

```
contracts/
  src/
    BlueKillStreak.sol         -- Governance + CRE receiver
    BlueMarketTrader.sol       -- Trading treasury + CRE receiver
    MockPredictionMarket.sol    -- Trade target for testing
    EtherealHorizonPathway.sol  -- Educational milestones
  test/
    BlueKillStreak.t.sol       -- 31 governance tests
    BlueMarketTrader.t.sol     -- 23 trader tests
    EtherealHorizonPathway.t.sol

cre-workflows/
  blue-review/         -- Event-triggered AI scoring
  auto-execute/        -- Cron-based proposal execution
  trade-execute/       -- Event-triggered governance trade routing
  shared/
    abi.ts             -- Governance contract ABI fragments
    trader-abi.ts      -- Trader contract ABI fragments
```

---

## Running Locally

```bash
# Frontend
npm install && npm run dev

# Contracts
cd contracts && forge build && forge test

# CRE workflows (simulate)
cd cre-workflows
cre workflow simulate --workflow blue-review
cre workflow simulate --workflow auto-execute
```

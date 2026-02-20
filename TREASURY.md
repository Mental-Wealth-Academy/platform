# Treasury

> *A living oasis that doesn't sleep. While you build mental wealth, Azura compounds the rest.*

---

## How It Works

The Mental Wealth Academy Treasury is a community-owned fund on Base Mainnet. When you deposit USDC, an autonomous trading bot puts that capital to work across prediction markets — and you earn a share of the returns just by holding.

### 1. Deposit USDC

Send USDC to the Treasury contract. There is no minimum. Your deposit enters the shared liquidity pool that the trading bot operates on.

### 2. Receive MWA Tokens

You receive MWA tokens at a 1:1 rate with your USDC deposit. These tokens represent your share of the Treasury.

- **Always redeemable.** You can burn your MWA tokens and withdraw your USDC at any time at the 1:1 peg.
- **No lock-up period.** Your capital is never trapped.

### 3. Hold and Earn

While you hold MWA tokens, the trading bot generates returns from prediction market strategies. Rewards accrue passively to the Treasury balance — meaning the value backing your tokens grows over time.

You don't need to trade, stake, or claim. Just hold.

---

## Governance

Treasury parameters are not fixed. The community controls them through on-chain voting on the [Home page](/home) via Azura, the AI governance agent.

**What you can vote on:**

- **Risk aversion (gamma)** — How aggressively the bot sizes positions
- **Edge threshold** — The minimum divergence required before the bot enters a trade
- **Kelly fraction** — The fraction of theoretical optimal size actually deployed
- **Market focus** — Which prediction market categories the bot targets (crypto, AI, sports, politics)

Proposals are reviewed by Azura, and execution is handled automatically through Chainlink CRE workflows. One vote, real impact.

---

## How the Bot Generates Returns

The trading bot uses three institutional-grade strategies. These are not speculative bets — they are structural edges measured across hundreds of millions of historical trades.

### Strategy 1: Empirical Kelly Sizing

The bot doesn't guess how much to risk. It calculates position sizes using Monte Carlo simulations across thousands of historical scenarios.

- Standard Kelly assumes you know your edge perfectly. The bot doesn't make that assumption.
- It models the *distribution* of possible outcomes, not a single estimate.
- Position sizes are haircut for uncertainty so the Treasury survives worst-case paths, not just average ones.

**Result:** Steady compounding without catastrophic drawdowns.

### Strategy 2: Calibration Surface Exploitation

Prediction markets are systematically mispriced. Research on 72M+ trades confirms:

- **Longshot bias** — 1-cent contracts win only 0.43% of the time vs. the 1% implied. That's a 57% structural mispricing.
- **Time decay patterns** — Mispricing varies as resolution approaches. Early markets are driven by hope; late markets by information.

The bot maps price *and* time dimensions to find where bias is strongest, then trades against it.

### Strategy 3: Maker vs. Taker Edge

Every prediction market trade has a maker (who posts a limit order and waits) and a taker (who crosses the spread for immediacy).

Verified data shows takers lose at **80 of 99 price levels**. Makers earn +0.77% to +1.25% excess returns — not from better predictions, but from patience and spread capture.

The bot acts as a maker: providing liquidity, collecting spread, and harvesting the structural edge that impatient takers leave behind.

---

## Risk Transparency

The Treasury is real capital, not a simulation. Risks include:

- **Inventory risk** — The bot accumulates positions that can move against it before mean-reverting.
- **Adverse selection** — Sophisticated traders can occasionally exploit the bot's posted liquidity.
- **Market correlation** — Correlated moves across multiple markets can amplify drawdowns.

These risks are mitigated by Monte Carlo sizing, inventory limits, and governance-controlled parameters — but they are never zero. The 1:1 USDC peg means you can always exit, but Treasury-accrued rewards depend on bot performance.

---

## Quick Reference

| Detail | Value |
|---|---|
| **Network** | Base Mainnet |
| **Deposit asset** | USDC |
| **Token received** | MWA (1:1 with USDC) |
| **Redemption** | Anytime, 1:1 peg |
| **Reward accrual** | Passive (hold to earn) |
| **Governance** | Vote on /home with Azura |
| **Bot strategies** | Kelly sizing, calibration surfaces, maker edge |
| **Data foundation** | 400M+ trades, 72M+ with verified resolutions |

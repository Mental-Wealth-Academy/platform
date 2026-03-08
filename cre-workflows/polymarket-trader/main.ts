/**
 * CRE Workflow: Polymarket Auto-Trader
 *
 * Cron-triggered workflow that scans Polymarket for tradeable opportunities
 * using a Bayesian decision framework powered by Anthropic Claude.
 *
 * Decision Framework:
 *   1. EV (Expected Value)     — tells you whether to act
 *   2. Base rates              — ground estimates in reality
 *   3. Sunk costs              — what to ignore
 *   4. Bayes' theorem          — how to update beliefs with new evidence
 *   5. Survivorship bias       — what's missing from the picture
 *   6. Quarter-Kelly criterion  — how much to commit (conservative sizing)
 *
 * Pipeline:
 *   1. Fetch active Polymarket markets via Gamma API
 *   2. Send top candidates to Claude for Bayesian analysis
 *   3. Claude returns structured JSON: fair probability, edge, confidence
 *   4. Apply quarter-Kelly sizing to determine position size
 *   5. Submit DON-signed report to AzuraMarketTrader.onReport()
 *
 * The trader contract has its own USDC treasury, separate from governance.
 */

import {
  cre,
  Runner,
  type Runtime,
  handler,
} from "@chainlink/cre-sdk";
import {
  encodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  zeroAddress,
  type Hex,
} from "viem";
import {
  TRADER_TREASURY_BALANCE_ABI,
} from "../shared/trader-abi";
import {
  encodeCallMsg,
  LATEST_BLOCK_NUMBER,
  prepareReportRequest,
  text,
  consensusIdenticalAggregation,
} from "@chainlink/cre-sdk";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
interface Config {
  traderAddress: `0x${string}`;
  polymarketApiUrl: string;
  minEdgeBps: number;       // minimum edge in basis points to trade (e.g. 300 = 3%)
  maxPositionPct: number;   // max % of treasury per trade (e.g. 5)
  maxTradesPerRun: number;  // max trades per cron cycle
}

// Base mainnet chain selector
const BASE_MAINNET_SELECTOR =
  cre.capabilities.EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-mainnet-base-1"];

/** Convert Uint8Array to hex string for viem. */
function toHexString(data: Uint8Array): Hex {
  return (`0x${Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("")}`) as Hex;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw Polymarket market from Gamma API */
interface PolymarketMarket {
  id: string;
  question: string;
  outcomePrices: string; // JSON: [yesPrice, noPrice]
  volume: string;
  liquidity: string;
  endDate: string;
  active: boolean;
}

/** Claude's structured analysis of a single market */
interface MarketAnalysis {
  marketId: string;
  question: string;
  marketYesPrice: number;
  fairProbability: number;
  confidence: number;          // 0-100
  edge: number;                // signed: positive = YES underpriced, negative = NO underpriced
  baseRate: string;            // explanation of base rate used
  bayesianUpdate: string;      // what evidence shifted the probability
  survivorshipCheck: string;   // what's missing from the data
  sunkCostCheck: boolean;      // true = no sunk cost fallacy detected
  reasoning: string;
}

/** Full response from Claude */
interface TraderAnalysis {
  markets: MarketAnalysis[];
  timestamp: string;
}

/** Trade decision after Kelly sizing */
interface TradeDecision {
  marketId: string;
  isYes: boolean;
  usdcAmount: bigint;
  edge: number;
  kellyFraction: number;
}

// ---------------------------------------------------------------------------
// Anthropic Claude system prompt — Bayesian market analyst
// ---------------------------------------------------------------------------
const TRADER_SYSTEM_PROMPT = `You are a quantitative analyst for a prediction market trading fund.
Your job is to identify mispriced markets on Polymarket using a rigorous Bayesian framework.

For each market you analyze, you MUST apply these mental models in order:

1. BASE RATES: What is the historical base rate for this type of event?
   (e.g., incumbent presidents win re-election ~65% of the time)
   Start here — never anchor on the current market price.

2. BAYESIAN UPDATE: What specific, recent evidence should shift the probability
   away from the base rate? Apply Bayes' theorem:
   P(H|E) = P(E|H) * P(H) / P(E)
   Only strong, verifiable evidence should move your estimate significantly.

3. SURVIVORSHIP BIAS: What information might be MISSING from the picture?
   Are you only seeing the winning narrative? What failed scenarios are invisible?

4. SUNK COST CHECK: Is there any reason the market is anchored to a price
   due to past positions or sentiment rather than current evidence?

5. EXPECTED VALUE: Calculate EV for both YES and NO:
   EV_YES = (fairProb * (1 / yesPrice - 1)) - ((1 - fairProb) * 1)
   EV_NO  = ((1 - fairProb) * (1 / noPrice - 1)) - (fairProb * 1)
   Only recommend trades with positive EV.

6. FAIR PROBABILITY: Your best estimate of the true probability (0.0 to 1.0).
   This must differ from the market price by at least 3% to be worth trading.

You will receive a list of markets with their current YES/NO prices.
Analyze each one and return structured JSON.

IMPORTANT RULES:
- Be CONSERVATIVE. When uncertain, your fair probability should be CLOSER to 50%.
- High-volume markets are more efficient — require stronger evidence to disagree.
- Markets closing within 48 hours have less time for mean reversion — be cautious.
- NEVER chase momentum. If a market moved 10%+ recently, assume the move is mostly priced in.
- Your confidence score (0-100) should reflect how much evidence you have, not how extreme the edge is.

Respond ONLY in JSON format:
{
  "markets": [
    {
      "marketId": "string (the id from input)",
      "question": "string",
      "marketYesPrice": 0.0-1.0,
      "fairProbability": 0.0-1.0,
      "confidence": 0-100,
      "edge": -1.0 to 1.0 (positive = YES underpriced, negative = NO underpriced),
      "baseRate": "string explaining the base rate",
      "bayesianUpdate": "string explaining what evidence shifts probability",
      "survivorshipCheck": "string explaining what might be missing",
      "sunkCostCheck": true/false (true = no sunk cost bias detected),
      "reasoning": "1-2 sentence summary"
    }
  ],
  "timestamp": "ISO 8601"
}`;

// ---------------------------------------------------------------------------
// Quarter-Kelly sizing
// ---------------------------------------------------------------------------

/**
 * Calculate quarter-Kelly bet size.
 *
 * Full Kelly: f* = (p * (b + 1) - 1) / b
 *   where p = estimated true probability, b = net odds (payout per $1 risked)
 *
 * Quarter-Kelly: f = f* / 4
 *   Conservative sizing to survive estimation errors and variance.
 *
 * @param fairProb  Our estimated true probability (0-1)
 * @param price     Market price we'd pay (0-1)
 * @param confidence Confidence in our estimate (0-100), used to scale down further
 * @returns Fraction of bankroll to bet (0 to maxFraction)
 */
function quarterKelly(
  fairProb: number,
  price: number,
  confidence: number,
  maxFraction: number,
): number {
  if (price <= 0 || price >= 1 || fairProb <= 0 || fairProb >= 1) return 0;

  // Net odds: how much we win per $1 risked
  const odds = (1 / price) - 1;
  if (odds <= 0) return 0;

  // Full Kelly fraction
  const fullKelly = (fairProb * (odds + 1) - 1) / odds;

  // Quarter Kelly, scaled by confidence
  const confidenceScale = Math.min(confidence, 100) / 100;
  const fraction = (fullKelly / 4) * confidenceScale;

  // Clamp to [0, maxFraction]
  return Math.max(0, Math.min(fraction, maxFraction));
}

// ---------------------------------------------------------------------------
// Workflow initializer
// ---------------------------------------------------------------------------

const initWorkflow = (config: Config) => {
  const evm = new cre.capabilities.EVMClient(BASE_MAINNET_SELECTOR);
  const cron = new cre.capabilities.CronCapability();

  return [
    handler(
      // Run every 30 minutes
      cron.trigger({ schedule: "*/30 * * * *" }),

      async (runtime: Runtime<Config>) => {
        const { traderAddress, polymarketApiUrl, minEdgeBps, maxPositionPct, maxTradesPerRun } = runtime.config;
        const http = new cre.capabilities.HTTPClient();

        runtime.log("Polymarket auto-trader cron triggered");

        // ── 1. Read trader treasury balance ──────────────────────────────
        const balReply = evm
          .callContract(runtime, {
            call: encodeCallMsg({
              from: zeroAddress,
              to: traderAddress,
              data: encodeFunctionData({
                abi: TRADER_TREASURY_BALANCE_ABI,
                functionName: "treasuryBalance",
              }),
            }),
            blockNumber: LATEST_BLOCK_NUMBER,
          })
          .result();

        const treasuryUsdc = decodeFunctionResult({
          abi: TRADER_TREASURY_BALANCE_ABI,
          functionName: "treasuryBalance",
          data: toHexString(balReply.data),
        }) as bigint;

        const treasuryUsdcNum = Number(treasuryUsdc) / 1e6;
        runtime.log(`Treasury balance: $${treasuryUsdcNum.toFixed(2)} USDC`);

        // Skip if treasury is too small to trade meaningfully
        if (treasuryUsdcNum < 10) {
          runtime.log("Treasury too small to trade (<$10). Skipping.");
          return "low-balance";
        }

        // ── 2. Fetch active Polymarket markets ───────────────────────────
        const fetchMarkets = http.sendRequest(
          runtime,
          (sendRequester) => {
            const response = sendRequester.sendRequest({
              url: `${polymarketApiUrl}/markets?active=true&closed=false&limit=20&order=volume&ascending=false`,
              method: "GET",
              headers: { "Accept": "application/json" },
              body: "",
              cacheSettings: { store: true, maxAge: "120s" },
            }).result();
            return text(response);
          },
          consensusIdenticalAggregation<string>()
        );

        const marketsRaw = fetchMarkets().result();
        let markets: PolymarketMarket[];
        try {
          markets = JSON.parse(marketsRaw);
        } catch {
          runtime.log("Failed to parse Polymarket response");
          return "parse-error";
        }

        // Filter for tradeable markets: active, not lopsided, sufficient liquidity
        const candidates = markets.filter((m) => {
          try {
            const prices = JSON.parse(m.outcomePrices);
            const yes = Number(prices[0]);
            return yes > 0.05 && yes < 0.95 && Number(m.liquidity) > 5000;
          } catch {
            return false;
          }
        }).slice(0, 8); // Top 8 candidates for Claude to analyze

        if (candidates.length === 0) {
          runtime.log("No tradeable market candidates found");
          return "no-candidates";
        }

        runtime.log(`Found ${candidates.length} candidate markets for analysis`);

        // ── 3. Send candidates to Claude for Bayesian analysis ───────────
        const anthropicKey = runtime.getSecret({ id: "ANTHROPIC_API_KEY" }).result();

        const marketsForPrompt = candidates.map((m) => {
          const prices = JSON.parse(m.outcomePrices);
          return {
            id: m.id,
            question: m.question,
            yesPrice: Number(prices[0]),
            noPrice: Number(prices[1]),
            volume: m.volume,
            liquidity: m.liquidity,
            endDate: m.endDate,
          };
        });

        const userPrompt = `Analyze these Polymarket markets for trading opportunities.
Treasury balance: $${treasuryUsdcNum.toFixed(2)} USDC.
Minimum edge required: ${minEdgeBps / 100}%.

Markets:
${JSON.stringify(marketsForPrompt, null, 2)}

Apply the full Bayesian framework to each market. Only return markets where you find an actionable edge.`;

        const getAnalysis = http.sendRequest(
          runtime,
          (sendRequester) => {
            const response = sendRequester.sendRequest({
              url: "https://api.anthropic.com/v1/messages",
              method: "POST",
              headers: {
                "x-api-key": anthropicKey.value,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
              },
              body: Buffer.from(JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 4096,
                system: TRADER_SYSTEM_PROMPT,
                messages: [
                  { role: "user", content: userPrompt },
                ],
              })).toString("base64"),
              cacheSettings: { store: true, maxAge: "300s" },
            }).result();
            return text(response);
          },
          consensusIdenticalAggregation<string>()
        );

        const analysisRaw = getAnalysis().result();

        // Parse Claude's response (Anthropic Messages API format)
        let analysis: TraderAnalysis;
        try {
          const claudeResponse = JSON.parse(analysisRaw);
          const responseText = claudeResponse.content?.[0]?.text || analysisRaw;
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON in Claude response");
          analysis = JSON.parse(jsonMatch[0]);
        } catch (err) {
          runtime.log(`Failed to parse Claude analysis: ${err}`);
          return "analysis-error";
        }

        if (!analysis.markets || analysis.markets.length === 0) {
          runtime.log("Claude found no actionable opportunities");
          return "no-edge";
        }

        // ── 4. Apply quarter-Kelly sizing and filter by minimum edge ─────
        const minEdge = minEdgeBps / 10000;
        const maxFraction = maxPositionPct / 100;
        const trades: TradeDecision[] = [];

        for (const m of analysis.markets) {
          const absEdge = Math.abs(m.edge);

          // Skip if edge is below threshold
          if (absEdge < minEdge) {
            runtime.log(`Market ${m.marketId}: edge ${(m.edge * 100).toFixed(1)}% below threshold, skipping`);
            continue;
          }

          // Skip if confidence is too low
          if (m.confidence < 30) {
            runtime.log(`Market ${m.marketId}: confidence ${m.confidence} too low, skipping`);
            continue;
          }

          // Skip if sunk cost bias detected
          if (!m.sunkCostCheck) {
            runtime.log(`Market ${m.marketId}: sunk cost bias detected, skipping`);
            continue;
          }

          // Determine direction and price
          const isYes = m.edge > 0; // positive edge = YES is underpriced
          const price = isYes ? m.marketYesPrice : (1 - m.marketYesPrice);
          const prob = isYes ? m.fairProbability : (1 - m.fairProbability);

          // Calculate quarter-Kelly position size
          const fraction = quarterKelly(prob, price, m.confidence, maxFraction);

          if (fraction <= 0.001) {
            runtime.log(`Market ${m.marketId}: Kelly fraction too small (${(fraction * 100).toFixed(3)}%), skipping`);
            continue;
          }

          const usdcAmount = BigInt(Math.floor(treasuryUsdcNum * fraction * 1e6));

          // Minimum trade size: $1 USDC
          if (usdcAmount < 1_000_000n) {
            runtime.log(`Market ${m.marketId}: trade size < $1, skipping`);
            continue;
          }

          trades.push({
            marketId: m.marketId,
            isYes,
            usdcAmount,
            edge: m.edge,
            kellyFraction: fraction,
          });

          runtime.log(
            `Market ${m.marketId}: ${isYes ? "YES" : "NO"} | ` +
            `edge=${(m.edge * 100).toFixed(1)}% | ` +
            `kelly=${(fraction * 100).toFixed(2)}% | ` +
            `size=$${(Number(usdcAmount) / 1e6).toFixed(2)}`
          );
        }

        if (trades.length === 0) {
          runtime.log("No trades pass sizing filters");
          return "no-trades";
        }

        // Limit trades per run
        const execTrades = trades
          .sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge))
          .slice(0, maxTradesPerRun);

        runtime.log(`Executing ${execTrades.length} trade(s)`);

        // ── 5. Submit DON-signed reports to AzuraMarketTrader ────────────
        // The trader's onReport() expects: (uint256 marketId, bool isYes, uint256 amount)
        for (const trade of execTrades) {
          // NOTE: Polymarket market IDs are strings (condition IDs).
          // For the MockPredictionMarket, we use sequential uint256 IDs.
          // In production, this mapping would come from a registry.
          // For now, hash the market ID string to a uint256.
          const marketIdNum = BigInt(
            "0x" + Array.from(
              new TextEncoder().encode(trade.marketId)
            ).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16)
          );

          const reportPayload = encodeAbiParameters(
            [{ type: "uint256" }, { type: "bool" }, { type: "uint256" }],
            [marketIdNum, trade.isYes, trade.usdcAmount]
          );

          const report = runtime.report(prepareReportRequest(reportPayload)).result();

          evm.writeReport(runtime, { receiver: traderAddress, report }).result();

          runtime.log(
            `DON-signed trade submitted: market=${trade.marketId}, ` +
            `${trade.isYes ? "YES" : "NO"}, $${(Number(trade.usdcAmount) / 1e6).toFixed(2)}`
          );
        }

        return `executed-${execTrades.length}`;
      }
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();

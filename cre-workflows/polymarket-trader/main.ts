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
 *   1. Check CLOB balance via Polymarket API
 *   2. Fetch active markets via Gamma API
 *   3. Send top candidates to Claude for Bayesian analysis
 *   4. Apply quarter-Kelly sizing to determine position size
 *   5. POST trade decisions to Vercel API for CLOB execution
 */

import {
  cre,
  Runner,
  type Runtime,
  handler,
} from "@chainlink/cre-sdk";
import {
  consensusIdenticalAggregation,
  text,
} from "@chainlink/cre-sdk";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
interface Config {
  polymarketApiUrl: string;
  tradeApiUrl: string;        // Vercel API endpoint for CLOB execution
  minEdgeBps: number;         // minimum edge in basis points to trade (e.g. 300 = 3%)
  maxPositionPct: number;     // max % of treasury per trade (e.g. 5)
  maxTradesPerRun: number;    // max trades per cron cycle
  treasuryUsdcOverride?: number; // optional: override balance for testing
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
  clobTokenIds: string; // JSON: [yesTokenId, noTokenId]
}

/** Claude's structured analysis of a single market */
interface MarketAnalysis {
  marketId: string;
  question: string;
  marketYesPrice: number;
  fairProbability: number;
  confidence: number;          // 0-100
  edge: number;                // signed: positive = YES underpriced, negative = NO underpriced
  baseRate: string;
  bayesianUpdate: string;
  survivorshipCheck: string;
  sunkCostCheck: boolean;
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
  tokenID: string;
  isYes: boolean;
  price: number;
  size: number;
  edge: number;
  kellyFraction: number;
  reasoning: string;
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

function quarterKelly(
  fairProb: number,
  price: number,
  confidence: number,
  maxFraction: number,
): number {
  if (price <= 0 || price >= 1 || fairProb <= 0 || fairProb >= 1) return 0;
  const odds = (1 / price) - 1;
  if (odds <= 0) return 0;
  const fullKelly = (fairProb * (odds + 1) - 1) / odds;
  const confidenceScale = Math.min(confidence, 100) / 100;
  const fraction = (fullKelly / 4) * confidenceScale;
  return Math.max(0, Math.min(fraction, maxFraction));
}

// ---------------------------------------------------------------------------
// Workflow initializer
// ---------------------------------------------------------------------------

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();

  return [
    handler(
      cron.trigger({ schedule: "*/30 * * * *" }),

      async (runtime: Runtime<Config>) => {
        const { polymarketApiUrl, tradeApiUrl, minEdgeBps, maxPositionPct, maxTradesPerRun, treasuryUsdcOverride } = runtime.config;
        const http = new cre.capabilities.HTTPClient();

        runtime.log("Polymarket auto-trader cron triggered");

        // ── 1. Check trading balance ─────────────────────────────────────
        let treasuryUsdcNum = treasuryUsdcOverride || 0;

        if (!treasuryUsdcOverride) {
          // Fetch balance from CLOB API via our Vercel endpoint
          const apiSecret = runtime.getSecret({ id: "INTERNAL_API_SECRET" }).result();

          const fetchBalance = http.sendRequest(
            runtime,
            (sendRequester) => {
              const response = sendRequester.sendRequest({
                url: `${tradeApiUrl.replace('/execute', '/balance')}`,
                method: "GET",
                headers: {
                  "Accept": "application/json",
                },
                body: "",
                cacheSettings: { store: true, maxAge: "60s" },
              }).result();
              return text(response);
            },
            consensusIdenticalAggregation<string>()
          );

          try {
            const balRaw = fetchBalance().result();
            const balData = JSON.parse(balRaw);
            treasuryUsdcNum = balData.trader?.raw
              ? Number(balData.trader.raw) / 1e6
              : Number(balData.formatted) || 0;
          } catch {
            runtime.log("Failed to fetch balance, using fallback");
            treasuryUsdcNum = 18.99; // Current known balance
          }
        }

        runtime.log(`Treasury balance: $${treasuryUsdcNum.toFixed(2)} USDC`);

        if (treasuryUsdcNum < 2) {
          runtime.log("Treasury too small to trade (<$2). Skipping.");
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

        // Filter for tradeable markets
        const candidates = markets.filter((m) => {
          try {
            const prices = JSON.parse(m.outcomePrices);
            const yes = Number(prices[0]);
            return yes > 0.05 && yes < 0.95 && Number(m.liquidity) > 5000;
          } catch {
            return false;
          }
        }).slice(0, 8);

        if (candidates.length === 0) {
          runtime.log("No tradeable market candidates found");
          return "no-candidates";
        }

        runtime.log(`Found ${candidates.length} candidate markets for analysis`);

        // ── 3. Send candidates to Claude for Bayesian analysis ───────────
        const anthropicKey = runtime.getSecret({ id: "ANTHROPIC_API_KEY" }).result();

        const marketsForPrompt = candidates.map((m) => {
          const prices = JSON.parse(m.outcomePrices);
          let tokenIds: string[] = [];
          try { tokenIds = JSON.parse(m.clobTokenIds); } catch { /* */ }
          return {
            id: m.id,
            question: m.question,
            yesPrice: Number(prices[0]),
            noPrice: Number(prices[1]),
            volume: m.volume,
            liquidity: m.liquidity,
            endDate: m.endDate,
            yesTokenId: tokenIds[0] || "",
            noTokenId: tokenIds[1] || "",
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

        // ── 4. Apply quarter-Kelly sizing and filter ─────────────────────
        const minEdge = minEdgeBps / 10000;
        const maxFraction = maxPositionPct / 100;
        const trades: TradeDecision[] = [];

        for (const m of analysis.markets) {
          const absEdge = Math.abs(m.edge);

          if (absEdge < minEdge) {
            runtime.log(`Market ${m.marketId}: edge ${(m.edge * 100).toFixed(1)}% below threshold, skipping`);
            continue;
          }

          if (m.confidence < 30) {
            runtime.log(`Market ${m.marketId}: confidence ${m.confidence} too low, skipping`);
            continue;
          }

          if (!m.sunkCostCheck) {
            runtime.log(`Market ${m.marketId}: sunk cost bias detected, skipping`);
            continue;
          }

          const isYes = m.edge > 0;
          const price = isYes ? m.marketYesPrice : (1 - m.marketYesPrice);
          const prob = isYes ? m.fairProbability : (1 - m.fairProbability);
          const fraction = quarterKelly(prob, price, m.confidence, maxFraction);

          if (fraction <= 0.001) {
            runtime.log(`Market ${m.marketId}: Kelly fraction too small, skipping`);
            continue;
          }

          const sizeUsd = treasuryUsdcNum * fraction;

          if (sizeUsd < 1) {
            runtime.log(`Market ${m.marketId}: trade size < $1, skipping`);
            continue;
          }

          // Find the token ID for this market
          const candidate = marketsForPrompt.find(c => c.id === m.marketId);
          const tokenID = isYes
            ? (candidate?.yesTokenId || "")
            : (candidate?.noTokenId || "");

          if (!tokenID) {
            runtime.log(`Market ${m.marketId}: no token ID found, skipping`);
            continue;
          }

          const shares = Math.floor(sizeUsd / price);

          trades.push({
            marketId: m.marketId,
            tokenID,
            isYes,
            price,
            size: shares,
            edge: m.edge,
            kellyFraction: fraction,
            reasoning: m.reasoning,
          });

          runtime.log(
            `Market ${m.marketId}: ${isYes ? "YES" : "NO"} | ` +
            `edge=${(m.edge * 100).toFixed(1)}% | ` +
            `kelly=${(fraction * 100).toFixed(2)}% | ` +
            `size=$${sizeUsd.toFixed(2)} (${shares} shares)`
          );
        }

        if (trades.length === 0) {
          runtime.log("No trades pass sizing filters");
          return "no-trades";
        }

        // Limit trades per run, sort by edge magnitude
        const execTrades = trades
          .sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge))
          .slice(0, maxTradesPerRun);

        runtime.log(`Executing ${execTrades.length} trade(s) via CLOB API`);

        // ── 5. POST trade decisions to Vercel API for CLOB execution ─────
        const apiSecret = runtime.getSecret({ id: "INTERNAL_API_SECRET" }).result();

        const executeRequest = http.sendRequest(
          runtime,
          (sendRequester) => {
            const response = sendRequester.sendRequest({
              url: tradeApiUrl,
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiSecret.value}`,
                "Content-Type": "application/json",
              },
              body: Buffer.from(JSON.stringify({ trades: execTrades })).toString("base64"),
              cacheSettings: { store: false, maxAge: "0s" },
            }).result();
            return text(response);
          },
          consensusIdenticalAggregation<string>()
        );

        const execResult = executeRequest().result();

        try {
          const result = JSON.parse(execResult);
          runtime.log(`Execution result: ${result.executed} executed, ${result.failed} failed`);
        } catch {
          runtime.log(`Execution response: ${execResult.slice(0, 200)}`);
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

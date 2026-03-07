/**
 * CRE Workflow: Trade Execution
 *
 * Listens for ProposalExecuted events on AzuraKillStreak. When a proposal
 * passes governance, this workflow reads the approved proposal details and
 * executes a corresponding trade on the MockPredictionMarket via a
 * DON-signed report (actionType 3).
 *
 * Pipeline:
 *   1. ProposalExecuted event fires (proposal passed governance threshold)
 *   2. Workflow reads proposal details (amount, description)
 *   3. Workflow reads available prediction markets
 *   4. Selects the best matching market and direction (YES/NO)
 *   5. Submits DON-signed report: actionType 3 = ExecuteTrade
 *   6. AzuraKillStreak.onReport() routes treasury USDC into the market position
 *
 * Action type 3 = execute trade
 */

import {
  cre,
  Runner,
  type Runtime,
  type EVMLog,
  handler,
} from "@chainlink/cre-sdk";
import {
  encodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  zeroAddress,
  keccak256,
  toBytes,
  type Hex,
} from "viem";
import {
  GET_PROPOSAL_ABI,
  MARKET_COUNT_ABI,
  GET_MARKET_ABI,
  ActionType,
  PROPOSAL_EXECUTED_EVENT_SIG,
} from "../shared/abi";
import {
  encodeCallMsg,
  LATEST_BLOCK_NUMBER,
  prepareReportRequest,
} from "@chainlink/cre-sdk";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
interface Config {
  contractAddress: `0x${string}`;
  predictionMarketAddress: `0x${string}`;
}

// Base mainnet chain selector
const BASE_MAINNET_SELECTOR =
  cre.capabilities.EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-mainnet-base-1"];

/** Convert Uint8Array to hex string for viem. */
function toHexString(data: Uint8Array): Hex {
  return (`0x${Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("")}`) as Hex;
}

// ---------------------------------------------------------------------------
// Simple keyword matching to determine trade direction from proposal text
// ---------------------------------------------------------------------------
function inferTradeDirection(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();

  // Bullish / YES indicators
  const bullish = ["buy yes", "bullish", "long", "upside", "growth", "increase", "rise", "gain"];
  // Bearish / NO indicators
  const bearish = ["buy no", "bearish", "short", "downside", "decline", "decrease", "fall", "drop"];

  const bullScore = bullish.filter((kw) => text.includes(kw)).length;
  const bearScore = bearish.filter((kw) => text.includes(kw)).length;

  // Default to YES if ambiguous
  return bullScore >= bearScore;
}

// ---------------------------------------------------------------------------
// Workflow initializer
// ---------------------------------------------------------------------------
const eventTopic0 = keccak256(toBytes(PROPOSAL_EXECUTED_EVENT_SIG));

const initWorkflow = (config: Config) => {
  const evm = new cre.capabilities.EVMClient(BASE_MAINNET_SELECTOR);

  return [
    handler(
      evm.logTrigger({
        addresses: [config.contractAddress],
        topics: [{ values: [eventTopic0] }],
      }),

      async (runtime: Runtime<Config>, log: EVMLog) => {
        const { contractAddress, predictionMarketAddress } = runtime.config;

        // 1. Decode proposalId from log topics[1]
        const proposalId = BigInt(toHexString(log.topics[1]));

        runtime.log(`ProposalExecuted event detected: proposalId=${proposalId}`);

        // 2. Read full proposal struct
        const proposalReply = evm
          .callContract(runtime, {
            call: encodeCallMsg({
              from: zeroAddress,
              to: contractAddress,
              data: encodeFunctionData({
                abi: GET_PROPOSAL_ABI,
                functionName: "getProposal",
                args: [proposalId],
              }),
            }),
            blockNumber: LATEST_BLOCK_NUMBER,
          })
          .result();

        const proposal = decodeFunctionResult({
          abi: GET_PROPOSAL_ABI,
          functionName: "getProposal",
          data: toHexString(proposalReply.data),
        }) as unknown as {
          id: bigint;
          title: string;
          description: string;
          usdcAmount: bigint;
          executed: boolean;
        };

        // Only act on executed proposals
        if (!proposal.executed) {
          runtime.log(`Proposal ${proposalId} not yet executed, skipping trade.`);
          return "skipped";
        }

        // 3. Read available markets from MockPredictionMarket
        const countReply = evm
          .callContract(runtime, {
            call: encodeCallMsg({
              from: zeroAddress,
              to: predictionMarketAddress,
              data: encodeFunctionData({
                abi: MARKET_COUNT_ABI,
                functionName: "marketCount",
              }),
            }),
            blockNumber: LATEST_BLOCK_NUMBER,
          })
          .result();

        const mktCount = decodeFunctionResult({
          abi: MARKET_COUNT_ABI,
          functionName: "marketCount",
          data: toHexString(countReply.data),
        }) as bigint;

        if (mktCount === 0n) {
          runtime.log("No prediction markets available for trade execution.");
          return "no-markets";
        }

        // 4. Select market (use the latest active market for simplicity)
        let selectedMarketId = 0n;

        for (let i = mktCount; i >= 1n; i--) {
          const mktReply = evm
            .callContract(runtime, {
              call: encodeCallMsg({
                from: zeroAddress,
                to: predictionMarketAddress,
                data: encodeFunctionData({
                  abi: GET_MARKET_ABI,
                  functionName: "getMarket",
                  args: [i],
                }),
              }),
              blockNumber: LATEST_BLOCK_NUMBER,
            })
            .result();

          const market = decodeFunctionResult({
            abi: GET_MARKET_ABI,
            functionName: "getMarket",
            data: toHexString(mktReply.data),
          }) as unknown as {
            question: string;
            totalYes: bigint;
            totalNo: bigint;
            resolved: boolean;
            outcome: boolean;
          };

          if (!market.resolved) {
            selectedMarketId = i;
            runtime.log(`Selected market ${i}: "${market.question}"`);
            break;
          }
        }

        if (selectedMarketId === 0n) {
          runtime.log("All prediction markets are resolved. No trade to execute.");
          return "all-resolved";
        }

        // 5. Infer trade direction from proposal text
        const isYes = inferTradeDirection(proposal.title, proposal.description);

        runtime.log(
          `Trade decision: proposalId=${proposalId}, marketId=${selectedMarketId}, ` +
          `direction=${isYes ? "YES" : "NO"}, amount=${Number(proposal.usdcAmount) / 1e6} USDC`
        );

        // 6. Build report payload: actionType 3 (ExecuteTrade)
        const innerPayload = encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }, { type: "bool" }],
          [proposalId, selectedMarketId, isYes]
        );
        const reportPayload = encodeAbiParameters(
          [{ type: "uint8" }, { type: "bytes" }],
          [ActionType.ExecuteTrade, innerPayload]
        );

        // 7. Generate DON-signed report and deliver to contract
        const report = runtime.report(prepareReportRequest(reportPayload)).result();

        evm.writeReport(runtime, { receiver: contractAddress, report }).result();

        runtime.log(
          `DON-signed trade report submitted: proposalId=${proposalId}, ` +
          `market=${selectedMarketId}, ${isYes ? "YES" : "NO"}`
        );

        return "traded";
      }
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();

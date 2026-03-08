/**
 * CRE Workflow: Trade Execution (Governance-Triggered)
 *
 * Listens for ProposalExecuted events on AzuraKillStreak. When a proposal
 * passes governance and the recipient is the trader contract, this workflow
 * executes a corresponding trade on the prediction market.
 *
 * This is the GOVERNANCE-DRIVEN trade path (proposal -> vote -> trade).
 * For the autonomous Polymarket scanner, see polymarket-trader/.
 *
 * Pipeline:
 *   1. ProposalExecuted event fires (proposal passed governance threshold)
 *   2. Workflow reads proposal details (amount, description)
 *   3. Infers trade direction from proposal text (YES/NO keywords)
 *   4. Submits DON-signed report to AzuraMarketTrader.onReport()
 *   5. AzuraMarketTrader routes treasury USDC into the market position
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
  PROPOSAL_EXECUTED_EVENT_SIG,
} from "../shared/abi";
import {
  TRADER_TREASURY_BALANCE_ABI,
} from "../shared/trader-abi";
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
  traderAddress: `0x${string}`;
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

  const bullish = ["buy yes", "bullish", "long", "upside", "growth", "increase", "rise", "gain"];
  const bearish = ["buy no", "bearish", "short", "downside", "decline", "decrease", "fall", "drop"];

  const bullScore = bullish.filter((kw) => text.includes(kw)).length;
  const bearScore = bearish.filter((kw) => text.includes(kw)).length;

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
        const { contractAddress, traderAddress } = runtime.config;

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
          recipient: string;
        };

        if (!proposal.executed) {
          runtime.log(`Proposal ${proposalId} not executed, skipping.`);
          return "skipped";
        }

        // Only act if the recipient is the trader contract
        if (proposal.recipient.toLowerCase() !== traderAddress.toLowerCase()) {
          runtime.log(`Proposal ${proposalId} recipient is not the trader contract, skipping.`);
          return "not-trader";
        }

        // 3. Check trader has balance
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

        const balance = decodeFunctionResult({
          abi: TRADER_TREASURY_BALANCE_ABI,
          functionName: "treasuryBalance",
          data: toHexString(balReply.data),
        }) as bigint;

        if (balance < proposal.usdcAmount) {
          runtime.log(`Trader balance insufficient: ${balance} < ${proposal.usdcAmount}`);
          return "insufficient-balance";
        }

        // 4. Infer trade direction from proposal text
        const isYes = inferTradeDirection(proposal.title, proposal.description);

        runtime.log(
          `Trade decision: proposalId=${proposalId}, ` +
          `direction=${isYes ? "YES" : "NO"}, amount=$${Number(proposal.usdcAmount) / 1e6}`
        );

        // 5. Build report for AzuraMarketTrader.onReport()
        // Payload: (uint256 marketId, bool isYes, uint256 amount)
        // Use proposalId as a proxy marketId for governance-triggered trades
        const reportPayload = encodeAbiParameters(
          [{ type: "uint256" }, { type: "bool" }, { type: "uint256" }],
          [proposalId, isYes, proposal.usdcAmount]
        );

        // 6. Generate DON-signed report and deliver to trader contract
        const report = runtime.report(prepareReportRequest(reportPayload)).result();

        evm.writeReport(runtime, { receiver: traderAddress, report }).result();

        runtime.log(
          `DON-signed trade report submitted to trader: proposalId=${proposalId}, ` +
          `${isYes ? "YES" : "NO"}, $${Number(proposal.usdcAmount) / 1e6}`
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

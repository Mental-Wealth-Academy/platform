/**
 * CRE Workflow: Auto-Execute Proposals
 *
 * Runs on a cron schedule (every 10 minutes). For each active proposal that has
 * reached the 50% vote threshold but hasn't been executed yet, it generates a
 * DON-signed report and delivers it to AzuraKillStreak.onReport() via the
 * KeystoneForwarder.
 *
 * Action type 1 = auto-execute
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
  PROPOSAL_COUNT_ABI,
  GET_PROPOSAL_ABI,
  HAS_REACHED_THRESHOLD_ABI,
  ProposalStatus,
  ActionType,
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
}

// Base mainnet chain selector
const BASE_MAINNET_SELECTOR =
  cre.capabilities.EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-mainnet-base-1"];

/** Convert CallContractReply.data (Uint8Array) to a hex string for viem. */
function toHexString(data: Uint8Array): Hex {
  return (`0x${Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("")}`) as Hex;
}

// ---------------------------------------------------------------------------
// Workflow initializer
// ---------------------------------------------------------------------------
const initWorkflow = (config: Config) => {
  const cronCapability = new cre.capabilities.CronCapability();
  const evm = new cre.capabilities.EVMClient(BASE_MAINNET_SELECTOR);

  return [
    handler(
      cronCapability.trigger({ schedule: "*/10 * * * *" }),

      async (runtime: Runtime<Config>) => {
        const { contractAddress } = runtime.config;

        // 1. Read proposalCount
        const countReply = evm
          .callContract(runtime, {
            call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: encodeFunctionData({ abi: PROPOSAL_COUNT_ABI, functionName: "proposalCount" }) }),
            blockNumber: LATEST_BLOCK_NUMBER,
          })
          .result();

        const count = decodeFunctionResult({
          abi: PROPOSAL_COUNT_ABI,
          functionName: "proposalCount",
          data: toHexString(countReply.data),
        });

        if (count === 0n) {
          runtime.log("No proposals found.");
          return "done";
        }

        runtime.log(`Checking ${count} proposals for auto-execution...`);

        // 2. Iterate over proposals
        for (let i = 1n; i <= (count as bigint); i++) {
          const proposalReply = evm
            .callContract(runtime, {
              call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: encodeFunctionData({ abi: GET_PROPOSAL_ABI, functionName: "getProposal", args: [i] }) }),
              blockNumber: LATEST_BLOCK_NUMBER,
            })
            .result();

          const decoded = decodeFunctionResult({
            abi: GET_PROPOSAL_ABI,
            functionName: "getProposal",
            data: toHexString(proposalReply.data),
          }) as unknown as { status: number; executed: boolean };

          // Skip non-active or already-executed proposals
          if (decoded.status !== ProposalStatus.Active || decoded.executed) {
            continue;
          }

          // 3. Check threshold
          const thresholdReply = evm
            .callContract(runtime, {
              call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: encodeFunctionData({ abi: HAS_REACHED_THRESHOLD_ABI, functionName: "hasReachedThreshold", args: [i] }) }),
              blockNumber: LATEST_BLOCK_NUMBER,
            })
            .result();

          const reached = decodeFunctionResult({
            abi: HAS_REACHED_THRESHOLD_ABI,
            functionName: "hasReachedThreshold",
            data: toHexString(thresholdReply.data),
          });

          if (!reached) continue;

          // 4. Build report payload: actionType 1 (auto-execute) + proposalId
          const innerPayload = encodeAbiParameters([{ type: "uint256" }], [i]);
          const reportPayload = encodeAbiParameters(
            [{ type: "uint8" }, { type: "bytes" }],
            [ActionType.AutoExecute, innerPayload]
          );

          // 5. Generate DON-signed report and write to contract
          const report = runtime.report(prepareReportRequest(reportPayload)).result();

          evm.writeReport(runtime, { receiver: contractAddress, report }).result();

          runtime.log(`Auto-executed proposal ${i}`);
        }

        return "done";
      }
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();

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
  type CRERuntime,
  type CRETriggerEvent,
  Runner,
  EVMClient,
  getNetwork,
  encodeCallMsg,
  LATEST_BLOCK_NUMBER,
} from "@chainlink/cre-sdk";
import {
  encodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  zeroAddress,
} from "viem";
import { z } from "zod";
import {
  PROPOSAL_COUNT_ABI,
  GET_PROPOSAL_ABI,
  HAS_REACHED_THRESHOLD_ABI,
  ProposalStatus,
  ActionType,
} from "../shared/abi";

// ---------------------------------------------------------------------------
// Config schema — validated at deploy time
// ---------------------------------------------------------------------------
const configSchema = z.object({
  /** CRE chain selector name, e.g. "base-mainnet" */
  chainSelectorName: z.string(),
  /** AzuraKillStreak contract address on target chain */
  contractAddress: z.string(),
});

type Config = z.infer<typeof configSchema>;

const runner = new Runner(configSchema);

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
runner.handler(
  // Cron trigger: every 10 minutes
  { type: "cron", schedule: "*/10 * * * *" },

  async (runtime: CRERuntime<Config>, _triggerEvent: CRETriggerEvent) => {
    const { chainSelectorName, contractAddress } = runtime.config;
    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName,
    });
    const evm = new EVMClient(network.chainSelector.selector);

    // 1. Read proposalCount
    const countRaw = evm
      .callContract(runtime, {
        call: encodeCallMsg({
          from: zeroAddress,
          to: contractAddress,
          data: encodeFunctionData({
            abi: PROPOSAL_COUNT_ABI,
            functionName: "proposalCount",
          }),
        }),
        blockNumber: LATEST_BLOCK_NUMBER,
      })
      .result();

    const count = decodeFunctionResult({
      abi: PROPOSAL_COUNT_ABI,
      functionName: "proposalCount",
      data: countRaw,
    }) as bigint;

    if (count === 0n) {
      runtime.log("No proposals found.");
      return;
    }

    runtime.log(`Checking ${count} proposals for auto-execution...`);

    // 2. Iterate over proposals
    for (let i = 1n; i <= count; i++) {
      // Read proposal struct
      const proposalRaw = evm
        .callContract(runtime, {
          call: encodeCallMsg({
            from: zeroAddress,
            to: contractAddress,
            data: encodeFunctionData({
              abi: GET_PROPOSAL_ABI,
              functionName: "getProposal",
              args: [i],
            }),
          }),
          blockNumber: LATEST_BLOCK_NUMBER,
        })
        .result();

      const proposal = decodeFunctionResult({
        abi: GET_PROPOSAL_ABI,
        functionName: "getProposal",
        data: proposalRaw,
      }) as {
        id: bigint;
        status: number;
        executed: boolean;
        forVotes: bigint;
      };

      // Skip non-active or already-executed proposals
      if (proposal.status !== ProposalStatus.Active || proposal.executed) {
        continue;
      }

      // 3. Check threshold
      const thresholdRaw = evm
        .callContract(runtime, {
          call: encodeCallMsg({
            from: zeroAddress,
            to: contractAddress,
            data: encodeFunctionData({
              abi: HAS_REACHED_THRESHOLD_ABI,
              functionName: "hasReachedThreshold",
              args: [i],
            }),
          }),
          blockNumber: LATEST_BLOCK_NUMBER,
        })
        .result();

      const reached = decodeFunctionResult({
        abi: HAS_REACHED_THRESHOLD_ABI,
        functionName: "hasReachedThreshold",
        data: thresholdRaw,
      }) as boolean;

      if (!reached) {
        continue;
      }

      // 4. Build report payload: actionType 1 (auto-execute) + proposalId
      const innerPayload = encodeAbiParameters(
        [{ type: "uint256" }],
        [i]
      );
      const reportPayload = encodeAbiParameters(
        [{ type: "uint8" }, { type: "bytes" }],
        [ActionType.AutoExecute, innerPayload]
      );

      // 5. Generate DON-signed report and write to contract
      const report = runtime.report({
        encodedPayload: Buffer.from(reportPayload.slice(2), "hex").toString(
          "base64"
        ),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      });

      evm
        .writeReport(runtime, {
          receiver: contractAddress,
          report,
        })
        .result();

      runtime.log(`Auto-executed proposal ${i}`);
    }
  }
);

export default runner;

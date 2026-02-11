/**
 * CRE Workflow: Decentralized Azura Review
 *
 * Triggers on ProposalCreated events emitted by AzuraKillStreak. When a new
 * proposal appears on-chain, this workflow:
 *   1. Reads the proposal details from the contract.
 *   2. Calls the Eliza AI API for scoring (same prompt/logic as the server).
 *   3. Computes the azuraLevel (0-4) from the six score dimensions.
 *   4. Submits a DON-signed report (actionType 2) that writes the review
 *      on-chain via onReport() -> _azuraReviewInternal().
 *
 * Because the workflow runs in the Chainlink DON, the AI scoring is
 * decentralized and verifiable — no single server can fake scores.
 *
 * Action type 2 = azura review
 */

import {
  type Runtime,
  type EVMLog,
  EVMClient,
  HTTPClient,
  handler,
  encodeCallMsg,
  LATEST_BLOCK_NUMBER,
  prepareReportRequest,
  text,
  consensusIdenticalAggregation,
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
  ProposalStatus,
  ActionType,
  PROPOSAL_CREATED_EVENT_SIG,
} from "../shared/abi";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
interface Config {
  contractAddress: `0x${string}`;
  elizaApiUrl: string;
}

// Base mainnet chain selector
const BASE_MAINNET_SELECTOR =
  EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-mainnet-base-1"];

/** Convert Uint8Array to hex string for viem. */
function toHex(data: Uint8Array): Hex {
  return (`0x${Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("")}`) as Hex;
}

// ---------------------------------------------------------------------------
// Azura system prompt — mirrors the server-side review prompt exactly
// ---------------------------------------------------------------------------
const REVIEW_SYSTEM_PROMPT = `You are Azura (A.Z.U.R.A. — Autonomous Zealot Unitary Relational Agent), reviewing funding proposals for Mental Wealth Academy.

Analyze proposals based on these criteria (score 0-10 each):
1. CLARITY: How clear, well-written, and understandable is the proposal?
2. IMPACT: What is the potential positive impact on the mental health community?
3. FEASIBILITY: How realistic and achievable is this proposal?
4. BUDGET: Is the budget reasonable, justified, and well-explained?
5. INGENUITY: How creative, innovative, or unique is this idea?
6. CHAOS: A randomness factor — add some unpredictability to your scoring

Based on the total score (out of 60):
- Score >= 25: APPROVE with token allocation (1-40% based on score strength)
- Score < 25: REJECT

Respond ONLY in JSON format:
{
  "decision": "approved" or "rejected",
  "scores": {
    "clarity": 0-10,
    "impact": 0-10,
    "feasibility": 0-10,
    "budget": 0-10,
    "ingenuity": 0-10,
    "chaos": 0-10
  },
  "tokenAllocation": 1-40 (only if approved, null if rejected),
  "reasoning": "One to two sentences explaining your decision concisely."
}`;

// ---------------------------------------------------------------------------
// Score parsing helpers
// ---------------------------------------------------------------------------
interface AzuraScores {
  clarity: number;
  impact: number;
  feasibility: number;
  budget: number;
  ingenuity: number;
  chaos: number;
}

interface AzuraResponse {
  decision: "approved" | "rejected";
  scores: AzuraScores;
  tokenAllocation: number | null;
  reasoning: string;
}

function parseAzuraResponse(raw: string): AzuraResponse {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in Azura response");
  return JSON.parse(jsonMatch[0]) as AzuraResponse;
}

function computeLevel(scores: AzuraScores): number {
  const total = scores.clarity + scores.impact + scores.feasibility + scores.budget + scores.ingenuity + scores.chaos;
  if (total < 25) return 0;
  return Math.min(Math.ceil((total / 60) * 4), 4);
}

// ---------------------------------------------------------------------------
// Handler — EVM Log trigger on ProposalCreated
// ---------------------------------------------------------------------------
const evm = new EVMClient(BASE_MAINNET_SELECTOR);

// Compute event topic0 (keccak256 of event signature)
const eventTopic0 = keccak256(toBytes(PROPOSAL_CREATED_EVENT_SIG));

export default handler(
  evm.logTrigger({
    addresses: [
      // Will be populated from config at deploy time; using placeholder
      // The actual contract address is set in config.production.json
    ],
    topics: [
      { values: [eventTopic0] }, // topic[0] = event signature
    ],
  }),

  async (runtime: Runtime<Config>, log: EVMLog) => {
    const { contractAddress, elizaApiUrl } = runtime.config;
    const http = new HTTPClient();

    // 1. Decode proposalId from log topics[1] (first indexed param)
    const proposalId = BigInt(toHex(log.topics[1]));

    runtime.log(`ProposalCreated event detected: proposalId=${proposalId}`);

    // 2. Read full proposal struct from contract
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
      data: toHex(proposalReply.data),
    }) as unknown as {
      id: bigint;
      title: string;
      description: string;
      usdcAmount: bigint;
      status: number;
    };

    // Only review Pending proposals
    if (proposal.status !== ProposalStatus.Pending) {
      runtime.log(`Proposal ${proposalId} is not Pending (status=${proposal.status}), skipping.`);
      return "skipped";
    }

    // 3. Call Eliza AI API via HTTPClient in node mode with consensus
    //    Only one node makes the HTTP call (cacheSettings.store = true),
    //    other nodes read from cache. All agree via identical consensus.
    const elizaApiKey = runtime.getSecret({ id: "ELIZA_API_KEY" }).result();

    const userPrompt = `Review this proposal:

**Title:** ${proposal.title}

**Proposal:**
${proposal.description}

**Requested Amount:** ${Number(proposal.usdcAmount) / 1e6} USDC`;

    const getReview = http.sendRequest(
      runtime,
      (sendRequester) => {
        const response = sendRequester.sendRequest({
          url: `${elizaApiUrl}/api/v1/chat`,
          method: "POST",
          headers: {
            Authorization: `Bearer ${elizaApiKey.value}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              { role: "system", parts: [{ type: "text", text: REVIEW_SYSTEM_PROMPT }] },
              { role: "user", parts: [{ type: "text", text: userPrompt }] },
            ],
            id: "gpt-4o",
          }),
          // Only one DON node makes the HTTP call; others read from cache.
          cacheSettings: {
            store: true,
            maxAge: "60s",
          },
        }).result();
        return text(response);
      },
      consensusIdenticalAggregation<string>()
    );

    const aiResponseText = getReview().result();

    // 4. Parse AI response and compute level
    const azuraResponse = parseAzuraResponse(aiResponseText);
    const level = computeLevel(azuraResponse.scores);

    const totalScore =
      azuraResponse.scores.clarity + azuraResponse.scores.impact +
      azuraResponse.scores.feasibility + azuraResponse.scores.budget +
      azuraResponse.scores.ingenuity + azuraResponse.scores.chaos;

    runtime.log(`Azura review: proposalId=${proposalId}, totalScore=${totalScore}, level=${level}`);

    // 5. Build report payload: actionType 2 (azura review) + (proposalId, level)
    const innerPayload = encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }],
      [proposalId, BigInt(level)]
    );
    const reportPayload = encodeAbiParameters(
      [{ type: "uint8" }, { type: "bytes" }],
      [ActionType.AzuraReview, innerPayload]
    );

    // 6. Generate DON-signed report and deliver to contract
    const report = runtime.report(prepareReportRequest(reportPayload)).result();

    evm.writeReport(runtime, { receiver: contractAddress, report }).result();

    runtime.log(`DON-signed review submitted for proposal ${proposalId} (level=${level})`);

    return "reviewed";
  }
);

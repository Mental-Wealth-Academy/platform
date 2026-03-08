/**
 * AzuraKillStreak ABI fragments for CRE workflows
 * Only includes the functions needed by the auto-execute and azura-review workflows.
 */

export const PROPOSAL_COUNT_ABI = [
  {
    name: "proposalCount",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const GET_PROPOSAL_ABI = [
  {
    name: "getProposal",
    type: "function",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "proposer", type: "address" },
          { name: "recipient", type: "address" },
          { name: "usdcAmount", type: "uint256" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "createdAt", type: "uint256" },
          { name: "votingDeadline", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "forVotes", type: "uint256" },
          { name: "againstVotes", type: "uint256" },
          { name: "azuraLevel", type: "uint256" },
          { name: "azuraApproved", type: "bool" },
          { name: "executed", type: "bool" },
          { name: "snapshotBlock", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

export const HAS_REACHED_THRESHOLD_ABI = [
  {
    name: "hasReachedThreshold",
    type: "function",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

/** ProposalStatus enum values matching the Solidity contract */
export const ProposalStatus = {
  Pending: 0,
  Active: 1,
  Executed: 2,
  Rejected: 3,
  Cancelled: 4,
} as const;

/** Action types for AzuraKillStreak.onReport() dispatch */
export const ActionType = {
  AutoExecute: 1,
  AzuraReview: 2,
} as const;

/** ProposalCreated event signature for log trigger */
export const PROPOSAL_CREATED_EVENT_SIG =
  "ProposalCreated(uint256,address,address,uint256,string,uint256)";

/** ProposalExecuted event signature for trade-execute workflow */
export const PROPOSAL_EXECUTED_EVENT_SIG =
  "ProposalExecuted(uint256,address,uint256)";

/** MockPredictionMarket ABI fragments */
export const GET_MARKET_ABI = [
  {
    name: "getMarket",
    type: "function",
    inputs: [{ name: "_marketId", type: "uint256" }],
    outputs: [
      { name: "question", type: "string" },
      { name: "totalYes", type: "uint256" },
      { name: "totalNo", type: "uint256" },
      { name: "resolved", type: "bool" },
      { name: "outcome", type: "bool" },
    ],
    stateMutability: "view",
  },
] as const;

export const MARKET_COUNT_ABI = [
  {
    name: "marketCount",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

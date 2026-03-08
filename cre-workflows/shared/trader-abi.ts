/**
 * AzuraMarketTrader ABI fragments for CRE workflows.
 * The trader contract has its own onReport() that accepts:
 *   (uint256 marketId, bool isYes, uint256 amount)
 */

export const TRADER_TREASURY_BALANCE_ABI = [
  {
    name: "treasuryBalance",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const TRADER_TRADE_COUNT_ABI = [
  {
    name: "tradeCount",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const TRADER_GET_TRADE_ABI = [
  {
    name: "getTrade",
    type: "function",
    inputs: [{ name: "_tradeId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "marketId", type: "uint256" },
          { name: "isYes", type: "bool" },
          { name: "usdcAmount", type: "uint256" },
          { name: "executedAt", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

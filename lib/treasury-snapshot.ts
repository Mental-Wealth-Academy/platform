import {
  createPublicClient,
  formatEther,
  formatUnits,
  http,
  isAddress,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia, polygon } from 'viem/chains';
import {
  getChainConfig,
  getRpcCandidates,
  resolveVerifiedRpcUrl,
} from '@/lib/chain-config';

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const DEFAULT_BLUE_ADDRESS = '0x0920553CcA188871b146ee79f562B4Af46aB4f8a';
const DEFAULT_GOVERNANCE_ADDRESS = '0x09a4FEfEe8245B644713546FDF28b4160218f7Fc';
const POLYMARKET_PUSD_ADDRESS = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB';
const POLYGON_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const POLYGON_USDCE_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const POLYGON_EXPLORER_URL = 'https://polygonscan.com';
const TREASURY_PRICE_CACHE_MS = 60_000;

interface TreasuryPrices {
  nativeInUsdc: number;
  bitcoinInUsdc: number;
  polygonInUsdc: number | null;
  asOf: string;
}

let treasuryPriceCache: { data: TreasuryPrices; timestamp: number } | null = null;

export interface TreasuryMetric {
  amount: string | null;
  symbol: string;
  usdcValue: string | null;
}

export type TreasuryAccountRole = 'wallet' | 'governance' | 'trader';

export interface TreasuryAccountSnapshot {
  role: TreasuryAccountRole;
  address: string;
  explorerUrl: string;
  valueUsdc: string | null;
  balances: {
    native: TreasuryMetric;
    cbBtc: TreasuryMetric;
    usdc: TreasuryMetric;
    credits: TreasuryMetric;
    tradingCollateral: TreasuryMetric;
    wrappableUsdc: TreasuryMetric;
    polygonNative: TreasuryMetric;
  };
}

export interface TreasurySnapshot {
  status: 'live' | 'partial' | 'unavailable';
  chain: {
    id: number;
    name: string;
    explorerUrl: string;
  };
  wallet: {
    address: string | null;
    explorerUrl: string | null;
  };
  valuation: {
    amountUsdc: string | null;
    formattedUsdc: string | null;
    pricedSymbols: string[];
    unpricedSymbols: string[];
    priceAsOf: string | null;
  };
  balances: {
    native: TreasuryMetric;
    cbBtc: TreasuryMetric;
    usdc: TreasuryMetric;
    credits: TreasuryMetric;
    tradingCollateral: TreasuryMetric;
    wrappableUsdc: TreasuryMetric;
    polygonNative: TreasuryMetric;
  };
  accounts: TreasuryAccountSnapshot[];
  updatedAt: string;
}

function resolveBlueTreasuryAddress(): Address | null {
  const configuredAddress =
    process.env.BLUE_AGENT_ADDRESS ||
    process.env.NEXT_PUBLIC_BLUE_AGENT_ADDRESS ||
    process.env.BLUE_TREASURY_ADDRESS;

  if (configuredAddress && isAddress(configuredAddress)) {
    return configuredAddress;
  }

  const rawKey = process.env.BLUE_PRIVATE_KEY || process.env.AZURA_PRIVATE_KEY;
  if (!rawKey) return DEFAULT_BLUE_ADDRESS;

  try {
    const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
    return privateKeyToAccount(privateKey).address;
  } catch {
    return DEFAULT_BLUE_ADDRESS;
  }
}

function fulfilledValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}

function configuredTreasuryAccounts(treasuryAddress: Address): Array<{
  role: TreasuryAccountRole;
  address: Address;
}> {
  const candidates: Array<{ role: TreasuryAccountRole; address: string }> = [
    { role: 'wallet', address: treasuryAddress },
    {
      role: 'governance',
      address: process.env.NEXT_PUBLIC_BLUE_KILLSTREAK_ADDRESS || DEFAULT_GOVERNANCE_ADDRESS,
    },
    {
      role: 'trader',
      address:
        process.env.NEXT_PUBLIC_BLUE_MARKET_TRADER_ADDRESS ||
        process.env.POLYMARKET_PROXY_WALLET ||
        '',
    },
  ];
  const seen = new Set<string>();

  return candidates.flatMap((candidate) => {
    if (!isAddress(candidate.address)) return [];
    const normalized = candidate.address.toLowerCase();
    if (seen.has(normalized)) return [];
    seen.add(normalized);
    return [{ role: candidate.role, address: candidate.address as Address }];
  });
}

function resolvePolymarketWallet(): Address | null {
  const configured =
    process.env.NEXT_PUBLIC_BLUE_MARKET_TRADER_ADDRESS ||
    process.env.POLYMARKET_PROXY_WALLET ||
    '';
  return isAddress(configured) ? configured as Address : null;
}

function sumComplete(values: Array<bigint | null>): bigint | null {
  if (values.some((value) => value === null)) return null;
  return values.reduce<bigint>((total, value) => total + (value || 0n), 0n);
}

function numericAmount(amount: string | null): number | null {
  if (amount === null) return null;
  const value = Number(amount);
  return Number.isFinite(value) ? value : null;
}

function valueInUsdc(amount: string | null, quote: number | null): string | null {
  const numeric = numericAmount(amount);
  if (numeric === null || quote === null || !Number.isFinite(quote) || quote <= 0) return null;
  return (numeric * quote).toFixed(6);
}

function aggregateUsdcValue(input: {
  nativeAmount: string | null;
  cbBtcAmount: string | null;
  usdcAmount: string | null;
  prices: TreasuryPrices | null;
}): string | null {
  if (!input.prices) return null;
  const nativeAmount = numericAmount(input.nativeAmount);
  const cbBtcAmount = numericAmount(input.cbBtcAmount);
  const usdcAmount = numericAmount(input.usdcAmount);
  if (nativeAmount === null || cbBtcAmount === null || usdcAmount === null) return null;

  return calculateTreasuryValueUsdc({
    nativeAmount,
    cbBtcAmount,
    usdcAmount,
    nativeInUsdc: input.prices.nativeInUsdc,
    bitcoinInUsdc: input.prices.bitcoinInUsdc,
  }).toFixed(6);
}

export function calculateTreasuryValueUsdc(input: {
  nativeAmount: number;
  cbBtcAmount: number;
  usdcAmount: number;
  nativeInUsdc: number;
  bitcoinInUsdc: number;
}): number {
  const values = Object.values(input);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Treasury valuation inputs must be finite, non-negative numbers.');
  }

  return (
    input.nativeAmount * input.nativeInUsdc +
    input.cbBtcAmount * input.bitcoinInUsdc +
    input.usdcAmount
  );
}

async function fetchTreasuryPrices(): Promise<TreasuryPrices> {
  if (
    treasuryPriceCache &&
    Date.now() - treasuryPriceCache.timestamp < TREASURY_PRICE_CACHE_MS
  ) {
    return treasuryPriceCache.data;
  }

  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,polygon-ecosystem-token,usd-coin&vs_currencies=usd',
    {
      cache: 'no-store',
      headers: { 'User-Agent': 'MentalWealthAcademy/1.0' },
      signal: AbortSignal.timeout(6_000),
    },
  );
  if (!response.ok) {
    if (treasuryPriceCache) return treasuryPriceCache.data;
    throw new Error(`Treasury price feed returned ${response.status}.`);
  }

  const payload = await response.json() as Record<string, { usd?: number }>;
  const bitcoinUsd = Number(payload.bitcoin?.usd);
  const nativeUsd = Number(payload.ethereum?.usd);
  const usdcUsd = Number(payload['usd-coin']?.usd);
  if (
    !Number.isFinite(bitcoinUsd) ||
    !Number.isFinite(nativeUsd) ||
    !Number.isFinite(usdcUsd) ||
    bitcoinUsd <= 0 ||
    nativeUsd <= 0 ||
    usdcUsd <= 0
  ) {
    if (treasuryPriceCache) return treasuryPriceCache.data;
    throw new Error('Treasury price feed returned invalid quotes.');
  }

  const data: TreasuryPrices = {
    nativeInUsdc: nativeUsd / usdcUsd,
    bitcoinInUsdc: bitcoinUsd / usdcUsd,
    polygonInUsdc: Number.isFinite(Number(payload['polygon-ecosystem-token']?.usd))
      ? Number(payload['polygon-ecosystem-token']?.usd) / usdcUsd
      : null,
    asOf: new Date().toISOString(),
  };
  treasuryPriceCache = { data, timestamp: Date.now() };
  return data;
}

interface PolygonTreasuryReads {
  address: Address | null;
  native: bigint | null;
  pUsd: bigint | null;
  usdc: bigint | null;
  usdcBridged: bigint | null;
}

async function fetchPolygonTreasuryReads(): Promise<PolygonTreasuryReads> {
  const address = resolvePolymarketWallet();
  const empty: PolygonTreasuryReads = {
    address,
    native: null,
    pUsd: null,
    usdc: null,
    usdcBridged: null,
  };
  if (!address) return empty;

  const rpcUrls = Array.from(new Set([
    process.env.POLYGON_RPC_URL,
    'https://polygon-bor-rpc.publicnode.com',
    'https://polygon-rpc.com',
  ].filter((value): value is string => Boolean(value))));
  const clients = rpcUrls.map((url) =>
    createPublicClient({
      chain: polygon,
      transport: http(url, { timeout: 5_000 }),
    })
  );
  const readWithFallback = async <T>(
    read: (client: (typeof clients)[number]) => Promise<T>,
  ): Promise<T> => {
    let lastError: unknown;
    for (const client of clients) {
      try {
        return await read(client);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('All Polygon treasury RPC reads failed.');
  };
  const tokenBalance = (token: Address) =>
    readWithFallback<bigint>((client) => client.readContract({
      address: token,
      abi: ERC20_BALANCE_ABI,
      functionName: 'balanceOf',
      args: [address],
    }));
  const reads = await Promise.allSettled([
    readWithFallback<bigint>((client) => client.getBalance({ address })),
    tokenBalance(POLYMARKET_PUSD_ADDRESS),
    tokenBalance(POLYGON_USDC_ADDRESS),
    tokenBalance(POLYGON_USDCE_ADDRESS),
  ]);

  return {
    address,
    native: fulfilledValue<bigint>(reads[0]),
    pUsd: fulfilledValue<bigint>(reads[1]),
    usdc: fulfilledValue<bigint>(reads[2]),
    usdcBridged: fulfilledValue<bigint>(reads[3]),
  };
}

export async function fetchTreasurySnapshot(): Promise<TreasurySnapshot> {
  const cfg = getChainConfig();
  const treasuryAddress = resolveBlueTreasuryAddress();
  const cbBtcAddress = cfg.cbBTcAddress && isAddress(cfg.cbBTcAddress)
    ? cfg.cbBTcAddress as Address
    : null;
  const usdcAddress = isAddress(cfg.usdcAddress) ? cfg.usdcAddress as Address : null;
  const creditsAddress = isAddress(cfg.diamondsTokenAddress)
    ? cfg.diamondsTokenAddress as Address
    : null;

  const emptySnapshot: TreasurySnapshot = {
    status: 'unavailable',
    chain: {
      id: cfg.chainId,
      name: cfg.chainName,
      explorerUrl: cfg.explorerUrl,
    },
    wallet: {
      address: treasuryAddress,
      explorerUrl: treasuryAddress ? `${cfg.explorerUrl}/address/${treasuryAddress}` : null,
    },
    valuation: {
      amountUsdc: null,
      formattedUsdc: null,
      pricedSymbols: ['ETH', 'USDC', 'cbBTC', 'pUSD', 'POL'],
      unpricedSymbols: ['BLUE'],
      priceAsOf: null,
    },
    balances: {
      native: { amount: null, symbol: 'ETH', usdcValue: null },
      cbBtc: { amount: null, symbol: 'cbBTC', usdcValue: null },
      usdc: { amount: null, symbol: 'USDC', usdcValue: null },
      credits: { amount: null, symbol: 'BLUE', usdcValue: null },
      tradingCollateral: { amount: null, symbol: 'pUSD', usdcValue: null },
      wrappableUsdc: { amount: null, symbol: 'USDC.e', usdcValue: null },
      polygonNative: { amount: null, symbol: 'POL', usdcValue: null },
    },
    accounts: [],
    updatedAt: new Date().toISOString(),
  };

  if (!treasuryAddress || !cbBtcAddress || !usdcAddress || !creditsAddress) return emptySnapshot;

  const rpcUrl = await resolveVerifiedRpcUrl();
  const chain = cfg.chainId === baseSepolia.id ? baseSepolia : base;
  const rpcUrls = Array.from(new Set([rpcUrl, ...getRpcCandidates()]));
  const clients = rpcUrls.map((url) =>
    createPublicClient({ chain, transport: http(url, { timeout: 5_000 }) })
  );
  const readWithFallback = async <T>(
    read: (client: (typeof clients)[number]) => Promise<T>,
  ): Promise<T> => {
    let lastError: unknown;
    for (const client of clients) {
      try {
        return await read(client);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('All treasury RPC reads failed.');
  };
  const configuredAccounts = configuredTreasuryAccounts(treasuryAddress);
  const [accountReads, polygonReads, pricesResult] = await Promise.all([
    Promise.all(configuredAccounts.map(async (account) => {
      const reads = await Promise.allSettled([
        readWithFallback<bigint>((client) =>
          client.getBalance({ address: account.address })
        ),
        readWithFallback<bigint>((client) => client.readContract({
          address: cbBtcAddress,
          abi: ERC20_BALANCE_ABI,
          functionName: 'balanceOf',
          args: [account.address],
        })),
        readWithFallback<bigint>((client) => client.readContract({
          address: usdcAddress,
          abi: ERC20_BALANCE_ABI,
          functionName: 'balanceOf',
          args: [account.address],
        })),
        readWithFallback<bigint>((client) => client.readContract({
          address: creditsAddress,
          abi: ERC20_BALANCE_ABI,
          functionName: 'balanceOf',
          args: [account.address],
        })),
      ]);

      return {
        ...account,
        native: fulfilledValue<bigint>(reads[0]),
        cbBtc: fulfilledValue<bigint>(reads[1]),
        usdc: fulfilledValue<bigint>(reads[2]),
        credits: fulfilledValue<bigint>(reads[3]),
      };
    })),
    fetchPolygonTreasuryReads(),
    fetchTreasuryPrices().then(
      (prices) => prices,
      (error) => {
        console.error('fetchTreasurySnapshot price error:', error);
        return null;
      },
    ),
  ]);

  const nativeBalance = sumComplete(accountReads.map((account) => account.native));
  const cbBtcBalance = sumComplete(accountReads.map((account) => account.cbBtc));
  const usdcBalance = sumComplete(accountReads.map((account) => account.usdc));
  const creditsBalance = sumComplete(accountReads.map((account) => account.credits));
  const nativeAmount = nativeBalance === null ? null : formatEther(nativeBalance);
  const cbBtcAmount = cbBtcBalance === null ? null : formatUnits(cbBtcBalance, 8);
  const usdcAmount = usdcBalance === null ? null : formatUnits(usdcBalance, 6);
  const creditsAmount = creditsBalance === null ? null : formatUnits(creditsBalance, 18);
  // pUSD is the only token the CLOB will trade against. USDC.e is reported
  // separately because it has to be wrapped first, and native USDC is excluded
  // entirely since the onramp does not accept it.
  const tradingCollateralAmount = polygonReads.pUsd === null
    ? null
    : formatUnits(polygonReads.pUsd, 6);
  const wrappableUsdcAmount = polygonReads.usdcBridged === null
    ? null
    : formatUnits(polygonReads.usdcBridged, 6);
  const polygonStableBalance = sumComplete([
    polygonReads.pUsd,
    polygonReads.usdcBridged,
  ]);
  const polygonNativeAmount = polygonReads.native === null
    ? null
    : formatEther(polygonReads.native);
  const baseValueUsdc = aggregateUsdcValue({
    nativeAmount,
    cbBtcAmount,
    usdcAmount,
    prices: pricesResult,
  });
  const stableValue = numericAmount(tradingCollateralAmount);
  const polygonAmount = numericAmount(polygonNativeAmount);
  const polygonValue = polygonAmount === null
    ? null
    : polygonAmount === 0
      ? 0
      : pricesResult?.polygonInUsdc
        ? polygonAmount * pricesResult.polygonInUsdc
        : null;
  const totalValueUsdc =
    baseValueUsdc === null || stableValue === null || polygonValue === null
      ? null
      : (Number(baseValueUsdc) + stableValue + polygonValue).toFixed(6);
  const readValues = accountReads.flatMap((account) => [
    account.native,
    account.cbBtc,
    account.usdc,
    account.credits,
  ]);
  readValues.push(
    polygonReads.native,
    polygonReads.pUsd,
    polygonReads.usdc,
    polygonReads.usdcBridged,
  );
  const completedReadCount = readValues.filter((value) => value !== null).length;
  const expectedReadCount = configuredAccounts.length * 4 + 4;
  const accounts: TreasuryAccountSnapshot[] = accountReads.map((account) => {
    const accountNative = account.native === null ? null : formatEther(account.native);
    const accountCbBtc = account.cbBtc === null ? null : formatUnits(account.cbBtc, 8);
    const accountUsdc = account.usdc === null ? null : formatUnits(account.usdc, 6);
    const accountCredits = account.credits === null ? null : formatUnits(account.credits, 18);

    const isPolygonTrader =
      account.role === 'trader' &&
      polygonReads.address?.toLowerCase() === account.address.toLowerCase();
    const accountTradingCollateral = isPolygonTrader ? tradingCollateralAmount : '0';
    const accountWrappableUsdc = isPolygonTrader ? wrappableUsdcAmount : '0';
    const accountPolygonNative = isPolygonTrader ? polygonNativeAmount : '0';
    const baseAccountValue = aggregateUsdcValue({
      nativeAmount: accountNative,
      cbBtcAmount: accountCbBtc,
      usdcAmount: accountUsdc,
      prices: pricesResult,
    });
    const accountPolygonAmount = numericAmount(accountPolygonNative);
    const accountPolygonValue = accountPolygonAmount === null
      ? null
      : accountPolygonAmount === 0
        ? 0
        : pricesResult?.polygonInUsdc
          ? accountPolygonAmount * pricesResult.polygonInUsdc
          : null;
    const accountTradingValue = numericAmount(accountTradingCollateral);
    const accountValueUsdc =
      baseAccountValue === null ||
      accountPolygonValue === null ||
      accountTradingValue === null
        ? null
        : (
          Number(baseAccountValue) +
          accountPolygonValue +
          accountTradingValue
        ).toFixed(6);

    return {
      role: account.role,
      address: account.address,
      explorerUrl: isPolygonTrader
        ? `${POLYGON_EXPLORER_URL}/address/${account.address}`
        : `${cfg.explorerUrl}/address/${account.address}`,
      valueUsdc: accountValueUsdc,
      balances: {
        native: {
          amount: accountNative,
          symbol: 'ETH',
          usdcValue: valueInUsdc(accountNative, pricesResult?.nativeInUsdc ?? null),
        },
        cbBtc: {
          amount: accountCbBtc,
          symbol: 'cbBTC',
          usdcValue: valueInUsdc(accountCbBtc, pricesResult?.bitcoinInUsdc ?? null),
        },
        usdc: {
          amount: accountUsdc,
          symbol: 'USDC',
          usdcValue: accountUsdc,
        },
        credits: {
          amount: accountCredits,
          symbol: 'BLUE',
          usdcValue: null,
        },
        tradingCollateral: {
          amount: accountTradingCollateral,
          symbol: 'pUSD',
          usdcValue: accountTradingCollateral,
        },
        wrappableUsdc: {
          amount: accountWrappableUsdc,
          symbol: 'USDC.e',
          usdcValue: accountWrappableUsdc,
        },
        polygonNative: {
          amount: accountPolygonNative,
          symbol: 'POL',
          usdcValue: valueInUsdc(
            accountPolygonNative,
            pricesResult?.polygonInUsdc ?? null,
          ),
        },
      },
    };
  });

  return {
    ...emptySnapshot,
    status:
      completedReadCount === expectedReadCount && totalValueUsdc !== null
        ? 'live'
        : completedReadCount > 0
          ? 'partial'
          : 'unavailable',
    valuation: {
      ...emptySnapshot.valuation,
      amountUsdc: totalValueUsdc,
      formattedUsdc: totalValueUsdc === null
        ? null
        : Number(totalValueUsdc).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      priceAsOf: pricesResult?.asOf ?? null,
    },
    balances: {
      native: {
        amount: nativeAmount,
        symbol: 'ETH',
        usdcValue: valueInUsdc(nativeAmount, pricesResult?.nativeInUsdc ?? null),
      },
      cbBtc: {
        amount: cbBtcAmount,
        symbol: 'cbBTC',
        usdcValue: valueInUsdc(cbBtcAmount, pricesResult?.bitcoinInUsdc ?? null),
      },
      usdc: {
        amount: usdcAmount,
        symbol: 'USDC',
        usdcValue: usdcAmount,
      },
      credits: {
        amount: creditsAmount,
        symbol: 'BLUE',
        usdcValue: null,
      },
      tradingCollateral: {
        amount: tradingCollateralAmount,
        symbol: 'pUSD',
        usdcValue: tradingCollateralAmount,
      },
      wrappableUsdc: {
        amount: wrappableUsdcAmount,
        symbol: 'USDC.e',
        usdcValue: wrappableUsdcAmount,
      },
      polygonNative: {
        amount: polygonNativeAmount,
        symbol: 'POL',
        usdcValue: valueInUsdc(
          polygonNativeAmount,
          pricesResult?.polygonInUsdc ?? null,
        ),
      },
    },
    accounts,
  };
}

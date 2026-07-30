/**
 * Fund Blue's Polymarket collateral from her Base holdings.
 *
 * Sends a supported Base asset to Blue's dedicated Polymarket bridge address,
 * which converts it into trading collateral on Polygon. No third-party bridge.
 *
 * Show the deposit addresses, supported Base assets, and balances:
 *   npx tsx --env-file=.env.local scripts/polymarket-bridge.ts
 *
 * Check a specific transfer without sending:
 *   npx tsx --env-file=.env.local scripts/polymarket-bridge.ts --symbol ETH --amount 0.005
 *
 * Send it:
 *   npx tsx --env-file=.env.local scripts/polymarket-bridge.ts --symbol ETH --amount 0.005 --execute
 */
import { createPublicClient, formatEther, formatUnits, getAddress, http } from 'viem';
import { base } from 'viem/chains';
import { polymarketSignerAddress } from '../lib/polymarket-proxy';
import {
  BASE_CHAIN_ID,
  bridgeFromBase,
  fetchSupportedAssets,
  getDepositStatus,
  requestDepositAddresses,
  resolveCollateralWallet,
} from '../lib/polymarket-bridge';

const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const execute = process.argv.includes('--execute');
  const symbol = flag('symbol');
  const amountRaw = flag('amount');

  const wallet = await resolveCollateralWallet();
  const addresses = await requestDepositAddresses(wallet);
  // Funds leave Blue's Base EOA; the proxy is only the destination.
  const source = polymarketSignerAddress();

  console.log(`Source wallet      ${source}  (Base)`);
  console.log(`Collateral wallet  ${wallet}  (Polygon proxy)`);
  console.log(`Bridge address     ${addresses.evm}  (send from Base)`);
  console.log('');

  if (!symbol || !amountRaw) {
    const assets = (await fetchSupportedAssets()).filter(
      (asset) => String(asset.chainId) === String(BASE_CHAIN_ID),
    );
    const client = createPublicClient({
      chain: base,
      transport: http(
        process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
        { timeout: 15_000 },
      ),
    });
    const nativeBalance = await client.getBalance({ address: source });
    console.log(`Base ETH  ${formatEther(nativeBalance)}`);

    for (const asset of assets) {
      if (!asset.token.address.startsWith('0x') || asset.token.address.length !== 42) continue;
      if (asset.token.symbol === 'ETH') continue;
      try {
        const held = await client.readContract({
          address: getAddress(asset.token.address),
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [source],
        });
        if (held > 0n) {
          console.log(`Base ${asset.token.symbol}  ${formatUnits(held, asset.token.decimals)}`);
        }
      } catch {
        // A single unreadable token should not hide the rest of the balances.
      }
    }

    console.log('');
    console.log(`Bridgeable from Base (min $${assets[0]?.minCheckoutUsd ?? 2}):`);
    console.log('  ' + assets.map((asset) => asset.token.symbol).join(', '));
    console.log('');
    console.log('Pass --symbol and --amount to prepare a transfer.');
    console.log('Deposit status:', JSON.stringify(await getDepositStatus(wallet)));
    return;
  }

  const amount = Number(amountRaw);
  const result = await bridgeFromBase({ symbol, amount, dryRun: !execute });

  if (!execute) {
    console.log(`Would send ${result.amount} ${result.symbol} to ${result.to}`);
    console.log(`Bridge minimum: $${result.minCheckoutUsd}`);
    console.log('Re-run with --execute to send.');
    return;
  }

  console.log(`Sent ${result.amount} ${result.symbol}: ${result.hash}`);
  console.log('The bridge converts it to Polygon collateral within a few minutes.');
  console.log('Watch it land with: /api/treasury/trade/status');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

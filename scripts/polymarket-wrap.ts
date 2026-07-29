/**
 * Wrap Blue's USDC.e into pUSD so the CLOB sees tradable collateral.
 *
 * Polymarket settles in pUSD, backed 1:1 by USDC.e. Sending plain USDC.e (or
 * native USDC) to the trading wallet is not enough — it has to go through the
 * CollateralOnramp first. See lib/polymarket-collateral.ts.
 *
 * Check:
 *   npx tsx --env-file=.env.local scripts/polymarket-wrap.ts
 *
 * Wrap the whole USDC.e balance:
 *   npx tsx --env-file=.env.local scripts/polymarket-wrap.ts --execute
 *
 * Wrap a specific amount:
 *   npx tsx --env-file=.env.local scripts/polymarket-wrap.ts --execute --amount 5
 */
import {
  readCollateralPosition,
  wrapUsdcToPusd,
  COLLATERAL_ONRAMP_ADDRESS,
  USDCE_ADDRESS,
} from '../lib/polymarket-collateral';

async function main() {
  const execute = process.argv.includes('--execute');
  const amountFlag = process.argv.indexOf('--amount');
  const amountUsdc = amountFlag === -1 ? undefined : Number(process.argv[amountFlag + 1]);
  if (amountUsdc !== undefined && (!Number.isFinite(amountUsdc) || amountUsdc <= 0)) {
    throw new Error('--amount must be a positive number.');
  }

  const position = await readCollateralPosition();
  console.log(`Wallet  ${position.address}`);
  console.log(`USDC.e  ${position.usdce}   (${USDCE_ADDRESS})`);
  console.log(`pUSD    ${position.pUsd}`);
  console.log(`POL     ${position.pol}`);
  console.log(`Onramp  ${COLLATERAL_ONRAMP_ADDRESS}`);
  console.log(`Mode    ${execute ? 'EXECUTE' : 'check only (pass --execute to wrap)'}`);
  console.log('');

  if (Number(position.usdce) === 0) {
    console.log('No USDC.e to wrap. Send bridged USDC.e to the wallet first —');
    console.log('native USDC is a different token and the onramp will not accept it.');
    return;
  }

  const result = await wrapUsdcToPusd({ amountUsdc, dryRun: !execute });
  if (!execute) {
    console.log(`Would wrap ${result.amount} USDC.e into pUSD. Re-run with --execute.`);
    return;
  }

  if (result.approveHash) console.log(`  approved USDC.e for onramp: ${result.approveHash}`);
  console.log(`  wrapped ${result.amount}: ${result.wrapHash}`);
  console.log(`  pUSD ${result.pUsdBefore} -> ${result.pUsdAfter}`);
  console.log('');
  console.log('Now re-run the readiness probe: /api/treasury/trade/status');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

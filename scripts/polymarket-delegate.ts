/**
 * Upgrade Blue's EOA into a Polymarket deposit wallet (EIP-7702).
 *
 * Polymarket's CLOB rejects plain EOAs as order makers with "maker address not
 * allowed, please use the deposit wallet flow". The delegation is what makes the
 * wallet acceptable; orders then use POLYMARKET_SIGNATURE_TYPE=3 (POLY_1271)
 * with the EOA as funder.
 *
 * Check:
 *   npx tsx --env-file=.env.local scripts/polymarket-delegate.ts
 *
 * Execute:
 *   npx tsx --env-file=.env.local scripts/polymarket-delegate.ts --execute
 */
import {
  DEPOSIT_WALLET_IMPLEMENTATION,
  delegateToDepositWallet,
  readDelegationStatus,
} from '../lib/polymarket-deposit-wallet';

async function main() {
  const execute = process.argv.includes('--execute');
  const repoint = process.argv.includes('--repoint');

  const status = await readDelegationStatus();
  console.log(`Wallet          ${status.address}`);
  console.log(`POL             ${status.pol}`);
  console.log(`Delegates to    ${status.delegatedTo ?? '(none — plain EOA)'}`);
  console.log(`Target          ${DEPOSIT_WALLET_IMPLEMENTATION}`);
  console.log(`Deposit wallet  ${status.isDepositWallet ? 'YES' : 'no'}`);
  console.log(`Mode            ${execute ? 'EXECUTE' : 'check only (pass --execute to send)'}`);
  console.log('');

  if (status.isDepositWallet) {
    console.log('Already a Polymarket deposit wallet. Nothing to send.');
    return;
  }

  const result = await delegateToDepositWallet({ dryRun: !execute, repoint });
  if (!execute) {
    console.log('Would send one EIP-7702 delegation transaction from this wallet to itself.');
    console.log('Re-run with --execute to send.');
    return;
  }

  console.log(`Delegated: ${result.hash}`);
  console.log('');
  console.log('Now set POLYMARKET_SIGNATURE_TYPE=3 and POLYMARKET_PROXY_WALLET to this');
  console.log('wallet, then re-run the readiness probe.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

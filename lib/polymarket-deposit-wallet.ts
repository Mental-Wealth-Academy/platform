/**
 * Turn Blue's EOA into a Polymarket deposit wallet via EIP-7702.
 *
 * Polymarket's CLOB rejects plain EOAs as order makers. The current flow does
 * not put a separate proxy contract in front of the wallet: it upgrades the EOA
 * itself with an EIP-7702 delegation, so the same address gains smart-account
 * code and becomes an acceptable maker. Orders then sign as POLY_1271
 * (signature type 3) with the EOA as funder.
 *
 * The delegation is authorised by the key holder, so Blue can perform this
 * upgrade herself — no relayer credentials, no browser wallet, no builder key.
 */

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  getAddress,
  http,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { resolvePolymarketSignerKey } from './polymarket-signer';

/**
 * The smart-account implementation Polymarket delegates deposit wallets to.
 * Observed on a wallet that had completed Polymarket's own deposit flow.
 */
export const DEPOSIT_WALLET_IMPLEMENTATION =
  '0x612373d7003d694220f7800eeaf8e3924c0951d3' as const;

/** EIP-7702 delegation indicator: 0xef0100 followed by the 20-byte target. */
const DELEGATION_PREFIX = '0xef0100';

const POLYGON_RPC_URL =
  process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com';

export interface DelegationStatus {
  address: Address;
  delegatedTo: Address | null;
  isDepositWallet: boolean;
  hasForeignCode: boolean;
  pol: string;
}

export interface DelegationResult {
  delegated: boolean;
  alreadyDelegated: boolean;
  address: Address;
  implementation: Address;
  hash?: `0x${string}`;
}

function signerAccount() {
  return privateKeyToAccount(resolvePolymarketSignerKey());
}

function publicClient() {
  return createPublicClient({
    chain: polygon,
    transport: http(POLYGON_RPC_URL, { timeout: 15_000 }),
  });
}

function parseDelegation(code: string | undefined): {
  delegatedTo: Address | null;
  hasForeignCode: boolean;
} {
  if (!code || code === '0x') return { delegatedTo: null, hasForeignCode: false };
  if (!code.toLowerCase().startsWith(DELEGATION_PREFIX)) {
    // Real contract code at an address we expected to be an EOA.
    return { delegatedTo: null, hasForeignCode: true };
  }
  return {
    delegatedTo: getAddress(`0x${code.slice(DELEGATION_PREFIX.length)}`),
    hasForeignCode: false,
  };
}

export async function readDelegationStatus(): Promise<DelegationStatus> {
  const account = signerAccount();
  const client = publicClient();
  const [code, pol] = await Promise.all([
    client.getBytecode({ address: account.address }),
    client.getBalance({ address: account.address }),
  ]);
  const { delegatedTo, hasForeignCode } = parseDelegation(code);
  return {
    address: account.address,
    delegatedTo,
    isDepositWallet:
      delegatedTo?.toLowerCase() === DEPOSIT_WALLET_IMPLEMENTATION.toLowerCase(),
    hasForeignCode,
    pol: formatEther(pol),
  };
}

/**
 * Upgrade the signer's EOA into a Polymarket deposit wallet.
 *
 * Idempotent: returns without sending when the delegation is already in place.
 * Fails closed when the wallet already delegates somewhere else, since silently
 * repointing an account's code is not a decision this should make on its own.
 */
export async function delegateToDepositWallet(options: {
  dryRun?: boolean;
  repoint?: boolean;
} = {}): Promise<DelegationResult> {
  const account = signerAccount();
  const client = publicClient();
  const status = await readDelegationStatus();

  const base: DelegationResult = {
    delegated: false,
    alreadyDelegated: status.isDepositWallet,
    address: account.address,
    implementation: getAddress(DEPOSIT_WALLET_IMPLEMENTATION),
  };
  if (status.isDepositWallet) return base;

  if (status.hasForeignCode) {
    throw new Error(
      `${account.address} already holds contract code that is not an EIP-7702 ` +
        'delegation. Refusing to touch it.',
    );
  }
  if (status.delegatedTo && !options.repoint) {
    throw new Error(
      `${account.address} already delegates to ${status.delegatedTo}, not the ` +
        `Polymarket deposit wallet ${DEPOSIT_WALLET_IMPLEMENTATION}. Pass repoint ` +
        'to change it.',
    );
  }

  const implementationCode = await client.getBytecode({
    address: DEPOSIT_WALLET_IMPLEMENTATION,
  });
  if (!implementationCode || implementationCode === '0x') {
    throw new Error(
      `The deposit wallet implementation ${DEPOSIT_WALLET_IMPLEMENTATION} has no code ` +
        'on Polygon. Refusing to delegate to an empty address.',
    );
  }
  if (BigInt(0) === (await client.getBalance({ address: account.address }))) {
    throw new Error('The trading wallet holds no POL, so it cannot pay gas to delegate.');
  }
  if (options.dryRun) return base;

  const wallet = createWalletClient({
    account,
    chain: polygon,
    transport: http(POLYGON_RPC_URL, { timeout: 15_000 }),
  });

  // The EOA sends its own delegation, so the authorization nonce must account
  // for the transaction that carries it.
  const authorization = await wallet.signAuthorization({
    account,
    contractAddress: DEPOSIT_WALLET_IMPLEMENTATION,
    executor: 'self',
  });

  const hash = await wallet.sendTransaction({
    authorizationList: [authorization],
    to: account.address,
    value: 0n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') {
    throw new Error(`The delegation transaction reverted (${hash}).`);
  }

  const after = await readDelegationStatus();
  if (!after.isDepositWallet) {
    throw new Error(
      `The delegation transaction succeeded but ${account.address} still delegates to ` +
        `${after.delegatedTo ?? 'nothing'}.`,
    );
  }

  return { ...base, delegated: true, hash };
}

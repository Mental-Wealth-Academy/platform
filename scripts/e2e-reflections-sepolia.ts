/**
 * End-to-end rehearsal of the cbBTC reflections system on Base Sepolia.
 *
 * What it proves, in order:
 *   1. Wiring — Diamonds.vault() matches chain-config, fee and owner sanity.
 *   2. Earning — owner-mints BLUE to fresh holder wallets (1,500 / 3,000 /
 *      500) so the vault registers shares through the token's transfer hook.
 *   3. Threshold — the 500 BLUE wallet stays below minShareBalance (1,000)
 *      and must earn nothing.
 *   4. Exclusion — Blue (the house) holds 200M BLUE and must earn nothing.
 *   5. Deposit — mints TestnetCbBTC to Blue, approves, depositReflections.
 *   6. Accrual — pendingRewards splits the deposit proportionally to shares.
 *   7. Payout — process(gasBudget) pushes cbBTC to holders' wallets.
 *   8. Resync — a BLUE transfer between holders updates vault shares.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/e2e-reflections-sepolia.ts
 *
 * Re-run with the same holders (skips minting fresh ones):
 *   E2E_HOLDER_KEYS=0xkey1,0xkey2,0xkey3 npx tsx --env-file=.env.local scripts/e2e-reflections-sepolia.ts
 *
 * Needs BLUE_PRIVATE_KEY (or AZURA_PRIVATE_KEY) and a little Sepolia ETH in
 * Blue's wallet (scripts/faucet-blue-sepolia.ts tops it up). Testnet only —
 * it refuses to run against chain id 8453.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  formatEther,
  parseEther,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

process.env.NEXT_PUBLIC_USE_TESTNET = 'true';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { getChainConfig } from '../lib/chain-config';

const DIAMONDS_ABI = [
  { type: 'function', name: 'vault', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'owner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'feeBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint16' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

const VAULT_ABI = [
  { type: 'function', name: 'shares', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalShares', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'minShareBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'excluded', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'pendingRewards', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'depositReflections', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'process', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }, { type: 'uint256' }] },
  { type: 'function', name: 'holderCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

const CBBTC_ABI = [
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

let failures = 0;
function check(label: string, ok: boolean, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}
function approxEqual(a: bigint, b: bigint, tolerancePct = 1n): boolean {
  const diff = a > b ? a - b : b - a;
  const scale = a > b ? a : b;
  return scale === 0n ? diff === 0n : diff * 100n <= scale * tolerancePct;
}

async function main() {
  const cfg = getChainConfig();
  if (cfg.chainId !== 84532) throw new Error(`Refusing to run against chain ${cfg.chainId} — Sepolia only.`);
  if (!cfg.cbBTcAddress || !cfg.reflectionVaultAddress) throw new Error('Sepolia vault/cbBTC not configured.');

  const raw = process.env.BLUE_PRIVATE_KEY || process.env.AZURA_PRIVATE_KEY;
  if (!raw) throw new Error('BLUE_PRIVATE_KEY / AZURA_PRIVATE_KEY not set.');
  const blue = privateKeyToAccount((raw.startsWith('0x') ? raw : `0x${raw}`) as `0x${string}`);

  const token = cfg.diamondsTokenAddress as `0x${string}`;
  const vault = cfg.reflectionVaultAddress as `0x${string}`;
  const cbbtc = cfg.cbBTcAddress as `0x${string}`;

  // Flashblocks exposes current sequencer state; standard load-balanced RPCs
  // can confirm a transaction before every replica can read its new state.
  const rpcUrl = process.env.E2E_RPC_URL || 'https://sepolia-preconf.base.org';
  const client = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
  const wallet = createWalletClient({ account: blue, chain: baseSepolia, transport: http(rpcUrl) });

  // Explicit nonce management: load-balanced RPCs lag behind their own
  // mempool, so per-tx nonce lookups race and die "replacement underpriced".
  let nonce = await client.getTransactionCount({ address: blue.address, blockTag: 'pending' });
  const send = async (label: string, tx: Parameters<typeof wallet.writeContract>[0]) => {
    const hash = await wallet.writeContract({ ...tx, nonce: nonce++ } as Parameters<typeof wallet.writeContract>[0]);
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(`${label} reverted (${hash})`);
    console.log(`  tx    ${label}: ${hash}`);
    return receipt;
  };

  console.log(`Blue: ${blue.address}`);
  console.log(`ETH:  ${formatEther(await client.getBalance({ address: blue.address }))}`);

  // ── 1. Wiring ──
  console.log('\n[1] Wiring');
  const [vaultOnToken, owner, feeBps, minShare] = await Promise.all([
    client.readContract({ address: token, abi: DIAMONDS_ABI, functionName: 'vault' }),
    client.readContract({ address: token, abi: DIAMONDS_ABI, functionName: 'owner' }),
    client.readContract({ address: token, abi: DIAMONDS_ABI, functionName: 'feeBps' }),
    client.readContract({ address: vault, abi: VAULT_ABI, functionName: 'minShareBalance' }),
  ]);
  check('Diamonds.vault() matches chain-config', vaultOnToken.toLowerCase() === vault.toLowerCase());
  check('Blue is owner (not renounced on testnet)', owner.toLowerCase() === blue.address.toLowerCase());
  check('feeBps is 100 (1%)', Number(feeBps) === 100, `feeBps=${feeBps}`);
  check('minShareBalance is 1,000 BLUE', minShare === parseUnits('1000', 18));

  // ── 2. Holders ──
  console.log('\n[2] Holders (1,500 / 3,000 / 500 BLUE)');
  const reused = (process.env.E2E_HOLDER_KEYS || '').split(',').filter(Boolean);
  const keys = (reused.length === 3
    ? reused
    : [generatePrivateKey(), generatePrivateKey(), generatePrivateKey()]) as `0x${string}`[];
  const holders = keys.map((k) => privateKeyToAccount(k));
  if (reused.length !== 3) {
    console.log('  Fresh throwaway holders (reuse via E2E_HOLDER_KEYS=' + keys.join(',') + ')');
  }
  const targets = [parseUnits('1500', 18), parseUnits('3000', 18), parseUnits('500', 18)];
  for (let i = 0; i < 3; i++) {
    const bal = await client.readContract({ address: token, abi: DIAMONDS_ABI, functionName: 'balanceOf', args: [holders[i].address] });
    if (bal < targets[i]) {
      await send(`mint ${formatUnits(targets[i] - bal, 18)} BLUE -> holder${i + 1}`, {
        address: token, abi: DIAMONDS_ABI, functionName: 'mint', args: [holders[i].address, targets[i] - bal],
      });
    }
  }
  const shares = await Promise.all(holders.map((h) =>
    client.readContract({ address: vault, abi: VAULT_ABI, functionName: 'shares', args: [h.address] })));
  check('holder1 shares = 1,500', shares[0] === targets[0], formatUnits(shares[0], 18));
  check('holder2 shares = 3,000', shares[1] === targets[1], formatUnits(shares[1], 18));
  check('holder3 (500 BLUE, under threshold) shares = 0', shares[2] === 0n, formatUnits(shares[2], 18));

  // ── 3/4. Exclusions ──
  console.log('\n[3] House exclusion');
  const [blueExcluded, blueShares] = await Promise.all([
    client.readContract({ address: vault, abi: VAULT_ABI, functionName: 'excluded', args: [blue.address] }),
    client.readContract({ address: vault, abi: VAULT_ABI, functionName: 'shares', args: [blue.address] }),
  ]);
  check('Blue excluded from reflections', blueExcluded === true);
  check('Blue shares = 0 despite 200M BLUE', blueShares === 0n);

  // ── 5. Deposit ──
  console.log('\n[4] Treasury deposit (0.01 TestnetCbBTC)');
  const deposit = parseUnits('0.01', 8);
  const readPendings = () => Promise.all([...holders.map((h) => h.address), blue.address].map((a) =>
    client.readContract({ address: vault, abi: VAULT_ABI, functionName: 'pendingRewards', args: [a] })));
  const pendBefore = await readPendings();
  await send('cbBTC.mint -> Blue', { address: cbbtc, abi: CBBTC_ABI, functionName: 'mint', args: [blue.address, deposit] });
  await send('cbBTC.approve vault', { address: cbbtc, abi: CBBTC_ABI, functionName: 'approve', args: [vault, deposit] });
  // Load-balanced RPCs can serve a replica that hasn't seen the approve yet,
  // which fails viem's pre-flight simulation — wait until it is visible.
  for (let i = 0; i < 10; i++) {
    const allowance = await client.readContract({
      address: cbbtc, abi: CBBTC_ABI, functionName: 'allowance', args: [blue.address, vault],
    });
    if (allowance >= deposit) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  const totalShares = await client.readContract({ address: vault, abi: VAULT_ABI, functionName: 'totalShares' });
  await send('vault.depositReflections', { address: vault, abi: VAULT_ABI, functionName: 'depositReflections', args: [deposit] });

  // ── 6. Accrual ──
  console.log('\n[5] Accrual');
  // Reads can lag the receipt on load-balanced RPCs — poll until the deposit
  // is visible (holder1's pending grows) rather than trusting the first read.
  let pend = pendBefore;
  for (let i = 0; i < 10 && pend[0] - pendBefore[0] === 0n; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    pend = await readPendings();
  }
  const gained = pend.map((p, i) => p - pendBefore[i]);
  const expected = (share: bigint) => (deposit * share) / totalShares;
  check('holder1 accrued ~ proportional share of deposit', approxEqual(gained[0], expected(targets[0])),
    `${formatUnits(gained[0], 8)} vs ${formatUnits(expected(targets[0]), 8)} cbBTC`);
  check('holder2 accrued ~ 2x holder1', gained[0] > 0n && approxEqual(gained[1], gained[0] * 2n),
    `${formatUnits(gained[1], 8)} cbBTC`);
  check('holder3 accrued 0 (under threshold)', gained[2] === 0n);
  check('Blue accrued 0 (house excluded)', gained[3] === 0n);

  // ── 7. Payout ──
  console.log('\n[6] Batch payout via process()');
  const before = await Promise.all(holders.map((h) =>
    client.readContract({ address: cbbtc, abi: CBBTC_ABI, functionName: 'balanceOf', args: [h.address] })));
  // A persistent rehearsal vault can contain holders from earlier runs. Walk
  // bounded batches until this run's targets are paid instead of assuming one
  // process call starts close enough to them in the queue.
  const holderCount = Number(await client.readContract({
    address: vault, abi: VAULT_ABI, functionName: 'holderCount',
  }));
  let pendAfterPay = pend;
  for (
    let attempt = 1;
    attempt <= Math.max(2, holderCount) && (pendAfterPay[0] > 0n || pendAfterPay[1] > 0n);
    attempt++
  ) {
    // Explicit gas limit: estimating against a lagging replica undercounts the
    // payout loop and the tx dies out-of-gas onchain (seen on free-tier RPCs).
    await send(`vault.process(600000) batch ${attempt}`, {
      address: vault, abi: VAULT_ABI, functionName: 'process', args: [600000n], gas: 1_200_000n,
    });
    pendAfterPay = await readPendings();
  }
  const after = await Promise.all(holders.map((h) =>
    client.readContract({ address: cbbtc, abi: CBBTC_ABI, functionName: 'balanceOf', args: [h.address] })));
  check('holder1 received their pending cbBTC', after[0] - before[0] >= pend[0] && pend[0] > 0n,
    `+${formatUnits(after[0] - before[0], 8)} cbBTC`);
  check('holder2 received their pending cbBTC', after[1] - before[1] >= pend[1] && pend[1] > 0n,
    `+${formatUnits(after[1] - before[1], 8)} cbBTC`);
  check('holder3 received nothing', after[2] === before[2]);
  check('pendings cleared after process()', pendAfterPay[0] === 0n && pendAfterPay[1] === 0n);

  // ── 8. Share resync on transfer ──
  console.log('\n[7] Share resync on transfer');
  const gasFund = await wallet.sendTransaction({ to: holders[0].address, value: parseEther('0.00005'), nonce: nonce++ });
  await client.waitForTransactionReceipt({ hash: gasFund });
  const h1Wallet = createWalletClient({ account: holders[0], chain: baseSepolia, transport: http(rpcUrl) });
  const moveTx = await h1Wallet.writeContract({
    address: token, abi: DIAMONDS_ABI, functionName: 'transfer', args: [holders[1].address, parseUnits('700', 18)],
    // A lagging estimator can miss the recipient-side vault sync because the
    // token intentionally catches vault failures. Reserve enough gas to prove
    // both share updates execute on the sequencer.
    gas: 300_000n,
  });
  await client.waitForTransactionReceipt({ hash: moveTx });
  // holder1 drops to 800 BLUE — below the 1,000 threshold, so their share must
  // zero out entirely. holder2 rises to 3,700. Poll past replica lag.
  let s1 = -1n; let s2 = -1n;
  for (let i = 0; i < 10; i++) {
    [s1, s2] = await Promise.all([holders[0].address, holders[1].address].map((a) =>
      client.readContract({ address: vault, abi: VAULT_ABI, functionName: 'shares', args: [a] })));
    if (s1 === 0n && s2 === parseUnits('3700', 18)) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  check('holder1 (now 800 BLUE, under threshold) shares zeroed', s1 === 0n, formatUnits(s1, 18));
  check('holder2 shares resynced to 3,700', s2 === parseUnits('3700', 18), formatUnits(s2, 18));

  console.log(failures === 0
    ? '\nAll reflections checks passed.'
    : `\n${failures} check(s) FAILED — do not proceed to mainnet until clean.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });

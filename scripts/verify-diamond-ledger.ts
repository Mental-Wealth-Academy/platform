/**
 * Prove every diamond interaction actually happened onchain.
 *
 * Cross-checks the two server ledgers against every known deployment on Base
 * mainnet and Base Sepolia. The ledger predates chain metadata, so historical
 * rows can legitimately belong to either network.
 *
 *   diamond_onchain_rewards (earning) — every 'sent' row must have a real
 *     Transfer of the right amount to the right wallet in its tx receipt.
 *     Catches the silent failure class where a tx "succeeds" on the wrong
 *     chain against a codeless address and moves nothing. Also reports
 *     pending / failed / capped rows — diamonds owed but not yet onchain.
 *
 *   diamond_burns (spending) — every row must have a real Transfer from the
 *     user's wallet to the dead address in its tx receipt.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/verify-diamond-ledger.ts
 *   npx tsx --env-file=.env.local scripts/verify-diamond-ledger.ts --limit=200
 *
 * Read-only: needs DATABASE_URL and an RPC; touches nothing.
 */
import { providers, utils } from 'ethers';
import { sqlQuery } from '../lib/db';

const TRANSFER_TOPIC = utils.id('Transfer(address,address,uint256)');
const DEAD = '0x000000000000000000000000000000000000dead';
const BASE_MAINNET_V1 = '0x4a25cea1f05c6725dc90849fbaaff00d67342b3f';
const BASE_SEPOLIA_V2 = '0xd116e780ca9ec3984e7682e095aab50006a9c160';

interface RewardRow {
  id: string; user_id: string; wallet_address: string; source: string;
  ref_id: string; amount: number; delivery: string; status: string;
  tx_hash: string | null; error: string | null;
}
interface BurnRow {
  id: string | number; wallet_address: string; purpose: string;
  amount: number; tx_hash: string;
}

interface DeploymentTarget {
  name: string;
  provider: providers.StaticJsonRpcProvider;
  tokens: Set<string>;
}

function topicAddr(topic: string): string {
  return ('0x' + topic.slice(-40)).toLowerCase();
}

function tokenSet(...candidates: Array<string | undefined>): Set<string> {
  return new Set(
    candidates
      .filter((candidate): candidate is string => /^0x[a-fA-F0-9]{40}$/.test(candidate || ''))
      .map((candidate) => candidate.toLowerCase()),
  );
}

async function main() {
  const limit = Number((process.argv.find(a => a.startsWith('--limit=')) || '').split('=')[1] || 1000);
  const targets: DeploymentTarget[] = [
    {
      name: 'Base mainnet',
      provider: new providers.StaticJsonRpcProvider(
        process.env.BASE_RPC_URL ||
          process.env.NEXT_PUBLIC_BASE_RPC_URL ||
          'https://mainnet.base.org',
        { chainId: 8453, name: 'base' },
      ),
      tokens: tokenSet(
        process.env.DIAMONDS_TOKEN_ADDRESS,
        process.env.NEXT_PUBLIC_DIAMONDS_TOKEN_ADDRESS,
        process.env.DIAMONDS_V1_TOKEN_ADDRESS,
        BASE_MAINNET_V1,
      ),
    },
    {
      name: 'Base Sepolia',
      provider: new providers.StaticJsonRpcProvider(
        process.env.BASE_SEPOLIA_RPC_URL ||
          process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
          'https://sepolia-preconf.base.org',
        { chainId: 84532, name: 'base-sepolia' },
      ),
      tokens: tokenSet(
        process.env.DIAMONDS_SEPOLIA_TOKEN_ADDRESS,
        process.env.NEXT_PUBLIC_DIAMONDS_SEPOLIA_TOKEN_ADDRESS,
        BASE_SEPOLIA_V2,
      ),
    },
  ];
  console.log('Known deployments:');
  for (const target of targets) {
    console.log(`  ${target.name}: ${[...target.tokens].join(', ')}`);
  }
  console.log('');

  let bad = 0;
  const verifiedByTarget = new Map<string, number>();

  const verifyTx = async (
    txHash: string, wallet: string, amount: number,
    direction: 'in' | 'burn',
  ): Promise<string | null> => {
    const required = utils.parseUnits(String(amount), 18);
    let receiptFound = false;

    for (const target of targets) {
      const receipt = await target.provider.getTransactionReceipt(txHash).catch(() => null);
      if (!receipt) continue;
      receiptFound = true;
      if (receipt.status !== 1) continue;

      for (const log of receipt.logs) {
        if (!target.tokens.has(log.address.toLowerCase())) continue;
        if (log.topics[0] !== TRANSFER_TOPIC || log.topics.length < 3) continue;
        const from = topicAddr(log.topics[1]);
        const to = topicAddr(log.topics[2]);
        const value = utils.defaultAbiCoder.decode(['uint256'], log.data)[0];
        const matches =
          direction === 'in'
            ? to === wallet.toLowerCase() && value.gte(required)
            : from === wallet.toLowerCase() && to === DEAD && value.gte(required);
        if (matches) {
          verifiedByTarget.set(target.name, (verifiedByTarget.get(target.name) || 0) + 1);
          return null;
        }
      }
    }

    return receiptFound
      ? 'no matching BLUE Transfer in receipt (wrong token, amount, wallet, or no-op tx)'
      : 'tx not found on Base mainnet or Base Sepolia';
  };

  // ── Earning ledger ──
  console.log('── diamond_onchain_rewards (earning) ──');
  const rewards = await sqlQuery<RewardRow[]>(
    `SELECT id, user_id, wallet_address, source, ref_id, amount, delivery, status, tx_hash, error
     FROM diamond_onchain_rewards ORDER BY created_at DESC LIMIT :limit`, { limit });
  const byStatus: Record<string, number> = {};
  for (const r of rewards) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  console.log(`rows: ${rewards.length}  ${JSON.stringify(byStatus)}`);

  for (const r of rewards) {
    if (r.status !== 'sent') continue;
    if (!r.tx_hash) { console.log(`  bad   sent row ${r.id} has no tx_hash`); bad++; continue; }
    const problem = await verifyTx(r.tx_hash, r.wallet_address, r.amount, 'in');
    if (problem) {
      console.log(`  bad   ${r.source}/${r.ref_id} ${r.amount} BLUE -> ${r.wallet_address}\n        tx ${r.tx_hash}: ${problem}`);
      bad++;
    }
  }
  const owed = rewards.filter(r => r.status !== 'sent');
  if (owed.length) {
    console.log(`  OWED  ${owed.length} row(s) not yet onchain (pending/failed/capped) — release with scripts/backfill-diamonds.ts:`);
    for (const r of owed.slice(0, 10)) {
      console.log(`        ${r.status.padEnd(7)} ${r.source}/${r.ref_id}  ${r.amount} BLUE  ${String(r.error || '').slice(0, 70)}`);
    }
  }

  // ── Burn ledger ──
  console.log('\n── diamond_burns (spending) ──');
  const burnsTableExists = await sqlQuery<Array<{ ok: boolean }>>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diamond_burns') AS ok`, {});
  if (!burnsTableExists[0]?.ok) {
    console.log('no diamond_burns table yet (no burns recorded)');
  } else {
    const burns = await sqlQuery<BurnRow[]>(
      `SELECT id, wallet_address, purpose, amount, tx_hash FROM diamond_burns ORDER BY created_at DESC LIMIT :limit`, { limit });
    console.log(`rows: ${burns.length}`);
    for (const b of burns) {
      const problem = await verifyTx(b.tx_hash, b.wallet_address, b.amount, 'burn');
      if (problem) {
        console.log(`  bad   ${b.purpose} ${b.amount} BLUE from ${b.wallet_address}\n        tx ${b.tx_hash}: ${problem}`);
        bad++;
      }
    }
  }

  console.log('\nVerified transfers by deployment:');
  for (const target of targets) {
    console.log(`  ${target.name}: ${verifiedByTarget.get(target.name) || 0}`);
  }
  console.log(bad === 0
    ? '\nLedger and chain agree — every recorded diamond interaction is real.'
    : `\n${bad} ledger row(s) do NOT match the chain — investigate before mainnet.`);
  process.exit(bad === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });

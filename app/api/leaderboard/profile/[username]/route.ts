import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, erc20Abi, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { sqlQuery, isDbConfigured } from '@/lib/db';
import {
  getDiamondsTokenAddress,
  getCbBTCAddress,
  getUsdcAddress,
  getChainConfig,
  resolveVerifiedRpcUrl,
} from '@/lib/chain-config';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getQuestDefinitionForStoredQuestId, QUEST_DEFINITIONS } from '@/lib/quest-definitions';

export const dynamic = 'force-dynamic';

interface ProfileResponse {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  fieldNotes: number;
  questsCompleted: number;
  diamonds: number;
  bitcoin: number;
  usdc: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  }

  const { username } = params;
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  await ensureForumSchema();

  try {
    // 1. Fetch user data
    const users = await sqlQuery<
      Array<{
        id: string;
        username: string;
        avatar_url: string | null;
        bio: string | null;
        wallet_address: string;
      }>
    >(
      `SELECT id, username, avatar_url, bio, wallet_address
       FROM users
       WHERE LOWER(username) = LOWER(:username)
       LIMIT 1`,
      { username }
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // 2. Fetch Field Notes count
    let fieldNotesCount = 0;
    try {
      const prayers = await sqlQuery<Array<{ progress_data: any }>>(
        `SELECT progress_data FROM prayers
         WHERE user_id = :userId
         LIMIT 1`,
        { userId: user.id }
      );
      if (prayers.length > 0) {
        let allWeekPages: Record<string, Array<{ content?: string }>> = {};
        const pd = prayers[0].progress_data;
        // Notice: We don't decrypt other users' field notes here. We just count them if they are public
        // or just count the entries in allWeekPages if they are structured.
        // The structure might be encrypted so we might not be able to count perfectly if it's completely encrypted, 
        // but we'll try parsing allWeekPages if it's exposed.
        if (pd && !pd.encrypted && pd.allWeekPages) {
          allWeekPages = pd.allWeekPages;
        } else if (pd && pd.encrypted && pd.allWeekPages) {
           // If the outer structure has allWeekPages (which happens sometimes)
           allWeekPages = pd.allWeekPages;
        }
        for (const entries of Object.values(allWeekPages)) {
          if (Array.isArray(entries)) {
            for (const entry of entries) {
              if (typeof entry?.content === 'string' && entry.content.trim().length > 0) {
                fieldNotesCount++;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch field notes count:', e);
    }

    // 3. Fetch Quests count
    let questsCompleted = 0;
    try {
      const quests = await sqlQuery<Array<{ quest_id: string }>>(
        `SELECT quest_id FROM quests WHERE user_id = :userId`,
        { userId: user.id }
      );
      for (const row of quests) {
        const definition = getQuestDefinitionForStoredQuestId(row.quest_id);
        if (definition) {
          questsCompleted++;
        }
      }
    } catch (e) {
      console.warn('Could not fetch quests count:', e);
    }

    // 4. Fetch on-chain balances
    let diamonds = 0;
    let bitcoin = 0;
    let usdc = 0;

    if (user.wallet_address && /^0x[a-fA-F0-9]{40}$/.test(user.wallet_address)) {
      try {
        const cfg = getChainConfig();
        const chain = cfg.chainId === 84532 ? baseSepolia : base;
        const rpcUrl = await resolveVerifiedRpcUrl();
        const client = createPublicClient({ chain, transport: http(rpcUrl) });

        const contracts = [];
        const diamondsAddr = getDiamondsTokenAddress();
        const btcAddr = getCbBTCAddress();
        const usdcAddr = getUsdcAddress();

        if (diamondsAddr) contracts.push({ address: diamondsAddr as \`0x\${string}\`, abi: erc20Abi, functionName: 'balanceOf', args: [user.wallet_address as \`0x\${string}\`] });
        if (btcAddr) contracts.push({ address: btcAddr as \`0x\${string}\`, abi: erc20Abi, functionName: 'balanceOf', args: [user.wallet_address as \`0x\${string}\`] });
        if (usdcAddr) contracts.push({ address: usdcAddr as \`0x\${string}\`, abi: erc20Abi, functionName: 'balanceOf', args: [user.wallet_address as \`0x\${string}\`] });

        const results = await client.multicall({
          contracts: contracts as any,
          allowFailure: true,
        });

        let resultIdx = 0;
        if (diamondsAddr) {
          const res = results[resultIdx++];
          if (res?.status === 'success') diamonds = Number(formatUnits(res.result as bigint, 18));
        }
        if (btcAddr) {
          const res = results[resultIdx++];
          if (res?.status === 'success') bitcoin = Number(formatUnits(res.result as bigint, 8)); // cbBTC has 8 decimals
        }
        if (usdcAddr) {
          const res = results[resultIdx++];
          if (res?.status === 'success') usdc = Number(formatUnits(res.result as bigint, 6)); // USDC has 6 decimals
        }
      } catch (e) {
        console.warn('Could not fetch on-chain balances:', e);
      }
    }

    const responseData: ProfileResponse = {
      username: user.username,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      fieldNotes: fieldNotesCount,
      questsCompleted: questsCompleted,
      diamonds,
      bitcoin,
      usdc,
    };

    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error('[leaderboard-profile] Error fetching profile:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

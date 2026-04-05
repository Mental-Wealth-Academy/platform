import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TWITTER_FOLLOW_QUEST_ID = 'twitter-follow-quest';
const TARGET_USERNAME = 'MentalWealthDAO';
const SHARD_REWARD = 10;

export async function POST() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured on the server.' },
      { status: 503 }
    );
  }
  await ensureForumSchema();

  // Get our internal user record (authenticated via wallet address)
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Check if quest already completed
    const existingCompletion = await sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM quests 
       WHERE user_id = :userId AND quest_id = :questId 
       LIMIT 1`,
      { userId: user.id, questId: TWITTER_FOLLOW_QUEST_ID }
    );

    if (existingCompletion.length > 0) {
      // Already completed, return current shard count
      const shardRows = await sqlQuery<Array<{ shard_count: number }>>(
        `SELECT shard_count FROM users WHERE id = :id LIMIT 1`,
        { id: user.id }
      );
      return NextResponse.json({ 
        ok: true, 
        alreadyCompleted: true,
        shardsAwarded: 0,
        newShardCount: shardRows[0]?.shard_count ?? 0,
      });
    }

    // Check if following
    const xAccountRows = await sqlQuery<Array<{
      x_user_id: string;
      x_username: string;
      access_token: string;
      access_token_secret: string;
    }>>(
      `SELECT x_user_id, x_username, access_token, access_token_secret
       FROM x_accounts
       WHERE user_id = :userId
       LIMIT 1`,
      { userId: user.id }
    );

    if (xAccountRows.length === 0) {
      return NextResponse.json({ 
        ok: false,
        error: 'X account not connected',
        message: 'Please connect your X account first.' 
      });
    }

    const xAccount = xAccountRows[0];

    // Check follow status
    const xApiKey = process.env.X_API_KEY;
    const xSecret = process.env.X_SECRET;
    const bearerToken = process.env.X_BEARER_TOKEN;

    if (!xApiKey || !xSecret || !bearerToken) {
      return NextResponse.json({ error: 'X API credentials not configured.' }, { status: 500 });
    }

    // Get target user ID
    const targetUserUrl = `https://api.twitter.com/2/users/by/username/${TARGET_USERNAME}`;
    const targetUserResponse = await fetch(targetUserUrl, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });

    if (!targetUserResponse.ok) {
      return NextResponse.json({ 
        ok: false,
        error: 'Failed to verify follow status',
        message: 'Unable to verify follow status. Please try again later.' 
      });
    }

    const targetUserData = await targetUserResponse.json();
    const targetUserId = targetUserData?.data?.id;

    if (!targetUserId) {
      return NextResponse.json({ 
        ok: false,
        error: 'Target user not found',
        message: 'Unable to verify follow status.' 
      });
    }

    // Check if user follows the target
    const { createHmac } = await import('crypto');
    const crypto = await import('crypto');
    
    function generateOAuthSignature(method: string, url: string, params: Record<string, string>, consumerSecret: string, tokenSecret: string): string {
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

      const signatureBaseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
      const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
      
      return createHmac('sha1', signingKey)
        .update(signatureBaseString)
        .digest('base64');
    }

    const followCheckBaseUrl = 'https://api.twitter.com/1.1/friendships/show.json';
    const followCheckParams = new URLSearchParams({
      source_id: xAccount.x_user_id,
      target_id: targetUserId,
    });
    const followCheckUrl = `${followCheckBaseUrl}?${followCheckParams.toString()}`;
    
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: xApiKey,
      oauth_token: xAccount.access_token,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
      source_id: xAccount.x_user_id,
      target_id: targetUserId,
    };

    oauthParams.oauth_signature = generateOAuthSignature('GET', followCheckBaseUrl, oauthParams, xSecret, xAccount.access_token_secret);

    const authHeader = `OAuth ${Object.keys(oauthParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ')}`;

    const followResponse = await fetch(followCheckUrl, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!followResponse.ok) {
      return NextResponse.json({ 
        ok: false,
        error: 'Failed to verify follow status',
        message: 'Unable to verify follow status. Please try again later.',
        requiresManualVerification: true
      });
    }

    const followData = await followResponse.json();
    const isFollowing = followData?.relationship?.source?.following === true;

    if (!isFollowing) {
      return NextResponse.json({ 
        ok: false,
        error: 'Not following',
        message: `Please follow @${TARGET_USERNAME} to complete the quest.`,
        isFollowing: false
      });
    }

    // User is following! Award shards and complete quest
    const { v4: uuidv4 } = await import('uuid');

    // Get current shard count before update
    const shardRowsBefore = await sqlQuery<Array<{ shard_count: number }>>(
      `SELECT shard_count FROM users WHERE id = :id LIMIT 1`,
      { id: user.id }
    );
    const startingShards = shardRowsBefore[0]?.shard_count ?? 0;

    // Award shards and record completion
    await sqlQuery(
      `UPDATE users 
       SET shard_count = shard_count + :shards 
       WHERE id = :id`,
      { id: user.id, shards: SHARD_REWARD }
    );

    const completionId = uuidv4();
    await sqlQuery(
      `INSERT INTO quests (id, user_id, quest_id, shards_awarded)
       VALUES (:id, :userId, :questId, :shards)`,
      { id: completionId, userId: user.id, questId: TWITTER_FOLLOW_QUEST_ID, shards: SHARD_REWARD }
    );

    // Get updated shard count
    const shardRowsAfter = await sqlQuery<Array<{ shard_count: number }>>(
      `SELECT shard_count FROM users WHERE id = :id LIMIT 1`,
      { id: user.id }
    );
    const newShardCount = shardRowsAfter[0]?.shard_count ?? startingShards + SHARD_REWARD;

    return NextResponse.json({ 
      ok: true, 
      shardsAwarded: SHARD_REWARD,
      startingShards,
      newShardCount,
      isFollowing: true,
      message: `Congratulations! You're following @${TARGET_USERNAME} and have earned ${SHARD_REWARD} shards!`,
    });
  } catch (err: any) {
    console.error('Error auto-completing twitter quest:', err);
    return NextResponse.json({ error: 'Failed to complete quest.' }, { status: 500 });
  }
}

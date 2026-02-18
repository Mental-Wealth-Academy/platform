import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import crypto from 'crypto';
import { createHmac } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TARGET_USERNAME = 'MentalWealthDAO';

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

  const xApiKey = process.env.X_API_KEY;
  const xSecret = process.env.X_SECRET;
  const bearerToken = process.env.X_BEARER_TOKEN;

  if (!xApiKey || !xSecret || !bearerToken) {
    return NextResponse.json({ error: 'X API credentials not configured.' }, { status: 500 });
  }

  try {
    // Get user's X account
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
        isFollowing: false, 
        hasTwitterLinked: false,
        message: 'Please connect your X account first.' 
      });
    }

    const xAccount = xAccountRows[0];

    // First, get the target user's ID using Bearer token (simpler)
    const targetUserUrl = `https://api.twitter.com/2/users/by/username/${TARGET_USERNAME}`;
    const targetUserResponse = await fetch(targetUserUrl, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });

    if (!targetUserResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch target user info.' }, { status: 500 });
    }

    const targetUserData = await targetUserResponse.json();
    const targetUserId = targetUserData?.data?.id;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }

    // Check if user follows the target using OAuth 1.0a
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
      // If API call fails, return that we can't verify
      return NextResponse.json({ 
        isFollowing: false,
        hasTwitterLinked: true,
        message: 'Unable to verify follow status. Please try again later.',
        requiresManualVerification: true
      });
    }

    const followData = await followResponse.json();
    const isFollowing = followData?.relationship?.source?.following === true;

    return NextResponse.json({ 
      isFollowing,
      hasTwitterLinked: true,
      xUsername: xAccount.x_username,
      message: isFollowing 
        ? `You are following @${TARGET_USERNAME}!` 
        : `Please follow @${TARGET_USERNAME} to complete the quest.`,
    });
  } catch (error: any) {
    console.error('X follow check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check follow status.',
      hasTwitterLinked: true,
      requiresManualVerification: true
    }, { status: 500 });
  }
}


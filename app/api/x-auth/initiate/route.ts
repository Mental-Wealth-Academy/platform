import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { createHmac } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// X OAuth 1.0a implementation
function generateOAuthSignature(method: string, url: string, params: Record<string, string>, consumerSecret: string, tokenSecret: string = ''): string {
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

export async function GET() {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json(
        { error: 'Database is not configured on the server.' },
        { status: 503 }
      );
    }
    
    await ensureForumSchema();

    const user = await getCurrentUserFromRequestCookie();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const xApiKey = process.env.X_API_KEY;
    const xSecret = process.env.X_SECRET;

    if (!xApiKey || !xSecret) {
      return NextResponse.json({ error: 'X API credentials not configured.' }, { status: 500 });
    }

    const requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/x-auth/callback`;
    
    console.log('Using callback URL:', callbackUrl);
    
    const oauthParams: Record<string, string> = {
      oauth_callback: callbackUrl,
      oauth_consumer_key: xApiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
    };

    oauthParams.oauth_signature = generateOAuthSignature('POST', requestTokenUrl, oauthParams, xSecret);

    const authHeader = `OAuth ${Object.keys(oauthParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ')}`;

    const response = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('X OAuth request token error:', {
        status: response.status,
        statusText: response.statusText,
        body: text,
      });
      return NextResponse.json({ 
        error: `X API error: ${text || response.statusText || 'Unknown error'}` 
      }, { status: 500 });
    }

    const responseText = await response.text();
    const params = new URLSearchParams(responseText);
    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');

    if (!oauthToken || !oauthTokenSecret) {
      return NextResponse.json({ error: 'Failed to get OAuth tokens.' }, { status: 500 });
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await sqlQuery(
      `INSERT INTO x_oauth_states (id, user_id, state_token, oauth_token, oauth_token_secret, expires_at)
       VALUES (:id, :userId, :stateToken, :oauthToken, :oauthTokenSecret, :expiresAt)`,
      {
        id: uuidv4(),
        userId: user.id,
        stateToken: uuidv4(),
        oauthToken,
        oauthTokenSecret,
        expiresAt,
      }
    );

    const authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${encodeURIComponent(oauthToken)}`;

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('X OAuth initiation error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Failed to initiate X OAuth.' 
    }, { status: 500 });
  }
}


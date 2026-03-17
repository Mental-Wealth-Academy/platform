import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

// Mailchimp API configuration
const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY || '';
const MAILCHIMP_DATACENTER = process.env.MAILCHIMP_DATACENTER || (MAILCHIMP_API_KEY.includes('-') ? MAILCHIMP_API_KEY.split('-')[1] : 'us18');
const MAILCHIMP_API_URL = `https://${MAILCHIMP_DATACENTER}.api.mailchimp.com/3.0`;

// Extract the API key without the datacenter suffix
const apiKey = MAILCHIMP_API_KEY.includes('-') ? MAILCHIMP_API_KEY.split('-')[0] : MAILCHIMP_API_KEY;

// You'll need to replace this with your actual Mailchimp list/audience ID
// You can find it in Mailchimp: Audience > Settings > Audience name and defaults
// The audience ID and list ID are the same thing in Mailchimp
const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID || process.env.MAILCHIMP_AUDIENCE_ID || 'YOUR_LIST_ID_HERE';

export async function POST(request: NextRequest) {
  const rlResult = checkRateLimit({
    max: 10,
    windowMs: 60 * 1000,
    identifier: `subscribe:${getClientIdentifier(request)}`,
  });
  if (!rlResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rlResult) }
    );
  }

  try {
    // Check if API key is configured
    if (!MAILCHIMP_API_KEY) {
      return NextResponse.json(
        { error: 'Mailchimp API key is not configured. Please set MAILCHIMP_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Check if audience/list ID is configured
    if (MAILCHIMP_LIST_ID === 'YOUR_LIST_ID_HERE') {
      return NextResponse.json(
        { error: 'Mailchimp audience/list ID is not configured. Please set MAILCHIMP_LIST_ID or MAILCHIMP_AUDIENCE_ID environment variable.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Subscribe email to Mailchimp
    // Mailchimp uses Basic Auth: username can be any string, password is the API key
    const authString = Buffer.from(`anystring:${apiKey}`).toString('base64');
    
    const response = await fetch(
      `${MAILCHIMP_API_URL}/lists/${MAILCHIMP_LIST_ID}/members`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authString}`,
        },
        body: JSON.stringify({
          email_address: email,
          status: 'subscribed', // or 'pending' if you want double opt-in
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // Handle existing member (already subscribed)
      if (response.status === 400 && data.title === 'Member Exists') {
        return NextResponse.json(
          { message: 'Email is already subscribed', alreadySubscribed: true },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: data.detail || 'Failed to subscribe email' },
        { status: response.status }
      );
    }

    // Just return success - no cookie, no access granted
    return NextResponse.json(
      { message: 'Successfully subscribed to beta!', email: data.email_address },
      { status: 200 }
    );
  } catch (error) {
    console.error('Mailchimp subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


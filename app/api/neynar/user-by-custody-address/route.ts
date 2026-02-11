import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/neynar/user-by-custody-address
 * Fetches a Farcaster user by their custody address using Neynar API
 * 
 * Query params:
 * - address: The custody address (0x...)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 42) {
      return NextResponse.json(
        { error: 'Invalid address format. Expected 0x-prefixed Ethereum address' },
        { status: 400 }
      );
    }

    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) {
      console.error('NEYNAR_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      );
    }

    // Call Neynar API to fetch user by custody address (encode param to avoid injection)
    const neynarUrl = `https://api.neynar.com/v2/farcaster/user/by_custody_address?custody_address=${encodeURIComponent(address)}`;
    const response = await fetch(neynarUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': neynarApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Neynar API error:', response.status, errorText);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'User not found for this custody address' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Failed to fetch user from Neynar API',
          details: errorText 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching user by custody address:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

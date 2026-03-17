import { NextResponse } from 'next/server'

const SCATTER_COLLECTION_SLUG = 'academic-angels'

export async function GET() {
  try {
    // Try to fetch collection info from Scatter API
    const response = await fetch(
      `https://api.scatter.art/v1/collection/${SCATTER_COLLECTION_SLUG}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      // If API returns address, use it
      if (data.address) {
        return NextResponse.json({
          address: data.address,
          chainId: data.chainId || 8453, // Default to Base
          slug: SCATTER_COLLECTION_SLUG,
          name: data.name || 'Academic Angels',
        })
      }
    }

    // Fallback to environment variable
    const fallbackAddress = process.env.NEXT_PUBLIC_SCATTER_COLLECTION_ADDRESS
    const fallbackChainId = process.env.NEXT_PUBLIC_SCATTER_CHAIN_ID 
      ? parseInt(process.env.NEXT_PUBLIC_SCATTER_CHAIN_ID) 
      : 8453

    if (fallbackAddress) {
      return NextResponse.json({
        address: fallbackAddress,
        chainId: fallbackChainId,
        slug: SCATTER_COLLECTION_SLUG,
        name: 'Academic Angels',
      })
    }

    throw new Error('Collection address not available. Please set NEXT_PUBLIC_SCATTER_COLLECTION_ADDRESS environment variable.')
  } catch (error) {
    console.error('[Scatter API] Error fetching collection:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch collection data.'
      },
      { status: 500 }
    )
  }
}

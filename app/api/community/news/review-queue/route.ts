import { NextResponse } from 'next/server';
import { buildCommunityNewsDigest, ONE_WEEK_IN_SECONDS } from '@/lib/community-news';

export const revalidate = ONE_WEEK_IN_SECONDS;

export async function GET() {
  try {
    const digest = await buildCommunityNewsDigest();

    return NextResponse.json({
      fetchedAt: digest.fetchedAt,
      refreshCadence: digest.refreshCadence,
      reviewQueue: digest.reviewQueue,
    });
  } catch {
    return NextResponse.json(
      { reviewQueue: [], error: 'Failed to build review queue' },
      { status: 500 },
    );
  }
}

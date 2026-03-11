import { NextResponse } from 'next/server';
import { sqlQuery, isDbConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface LeaderboardRow {
  username: string;
  avatar_url: string | null;
  shard_count: number;
}

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ users: [] });
  }

  try {
    const rows = await sqlQuery<LeaderboardRow[]>(
      `SELECT username, avatar_url, shard_count
       FROM users
       WHERE username IS NOT NULL
       ORDER BY shard_count DESC
       LIMIT 20`,
      {}
    );

    const users = rows.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      avatarUrl: r.avatar_url,
      shards: r.shard_count,
    }));

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [] });
  }
}

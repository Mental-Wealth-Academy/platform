import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import {
  createWriting,
  getWritingByPrompt,
  getUserWritings,
  getPromptById,
  getUserChapterProgress,
  createOrUpdateChapterProgress,
  checkAndUnsealNextChapter,
  awardShardsForWriting,
  awardShardsForUnseal,
} from '@/lib/library-queries';

interface User {
  id: string;
  username: string;
  wallet_address: string;
  shard_count: number;
}

async function getUserFromSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  if (!sessionToken) return null;

  const rows = await sqlQuery<User[]>(
    `SELECT u.id, u.username, u.wallet_address, u.shard_count
     FROM users u
     JOIN sessions s ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [sessionToken]
  );

  return rows[0] || null;
}

// GET - Fetch user's writings
export async function GET(request: Request) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    const writings = await getUserWritings(
      user.id,
      chapterId ? parseInt(chapterId, 10) : undefined
    );

    return NextResponse.json({
      ok: true,
      writings,
    });
  } catch (error) {
    console.error('Get writings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch writings' },
      { status: 500 }
    );
  }
}

// POST - Submit a new writing
export async function POST(request: Request) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { promptId, content } = body;

    if (!promptId || !content) {
      return NextResponse.json(
        { error: 'Missing promptId or content' },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.trim().length < 100) {
      return NextResponse.json(
        { error: 'Writing must be at least 100 characters' },
        { status: 400 }
      );
    }

    // Get prompt to verify it exists and get chapter ID
    const prompt = await getPromptById(promptId);

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    // Check if user has access to this chapter
    const chapterRows = await sqlQuery<{ chapter_number: number }[]>(
      `SELECT chapter_number FROM library_chapters WHERE id = $1`,
      [prompt.chapter_id]
    );
    const chapterNumber = chapterRows[0]?.chapter_number;

    if (chapterNumber && chapterNumber > 1) {
      // Check previous chapter is unsealed
      const prevChapterRows = await sqlQuery<{ id: number }[]>(
        `SELECT id FROM library_chapters WHERE chapter_number = $1`,
        [chapterNumber - 1]
      );
      const prevChapterId = prevChapterRows[0]?.id;

      if (prevChapterId) {
        const prevProgress = await getUserChapterProgress(user.id, prevChapterId);
        if (!prevProgress || prevProgress.status !== 'unsealed') {
          return NextResponse.json(
            { error: 'Previous chapter must be completed first' },
            { status: 403 }
          );
        }
      }
    }

    // Check if already submitted for this prompt
    const existingWriting = await getWritingByPrompt(user.id, promptId);

    if (existingWriting) {
      return NextResponse.json(
        { error: 'You have already completed this prompt' },
        { status: 400 }
      );
    }

    // Mark chapter as in_progress if not already
    const currentProgress = await getUserChapterProgress(user.id, prompt.chapter_id);
    if (!currentProgress || currentProgress.status === 'locked') {
      await createOrUpdateChapterProgress(user.id, prompt.chapter_id, 'in_progress');
    }

    // Create the writing
    const shardsForWriting = 10;
    const writing = await createWriting(
      user.id,
      prompt.chapter_id,
      promptId,
      content,
      shardsForWriting
    );

    // Award shards for writing
    await awardShardsForWriting(user.id, shardsForWriting);

    // Check if chapter is now complete (7 writings)
    const { unsealed, nextChapter } = await checkAndUnsealNextChapter(user.id, prompt.chapter_id);

    let bonusShards = 0;
    if (unsealed) {
      // Award bonus shards for unsealing
      bonusShards = 50;
      await awardShardsForUnseal(user.id, bonusShards);
    }

    // Get updated shard count
    const updatedUserRows = await sqlQuery<{ shard_count: number }[]>(
      `SELECT shard_count FROM users WHERE id = $1`,
      [user.id]
    );
    const newShardCount = updatedUserRows[0]?.shard_count || 0;

    return NextResponse.json({
      ok: true,
      writing,
      shardsAwarded: shardsForWriting,
      bonusShards,
      totalShardsAwarded: shardsForWriting + bonusShards,
      newShardCount,
      chapterUnsealed: unsealed,
      nextChapter: nextChapter
        ? {
            id: nextChapter.id,
            chapterNumber: nextChapter.chapter_number,
            title: nextChapter.title,
          }
        : null,
    });
  } catch (error) {
    console.error('Create writing error:', error);
    return NextResponse.json(
      { error: 'Failed to save writing' },
      { status: 500 }
    );
  }
}

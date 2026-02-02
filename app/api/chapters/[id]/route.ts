import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import {
  getChapterById,
  getPromptsByChapter,
  getUserChapterProgress,
  getUserWritings,
  getCurrentPromptForChapter,
} from '@/lib/library-queries';
import { AZURA_DIALOGUES } from '@/lib/library-seed-data';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const chapterId = parseInt(id, 10);

    if (isNaN(chapterId)) {
      return NextResponse.json({ error: 'Invalid chapter ID' }, { status: 400 });
    }

    // Get chapter details
    const chapter = await getChapterById(chapterId);

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Get user's progress for this chapter
    const progress = await getUserChapterProgress(user.id, chapterId);

    // Check if chapter is accessible
    // Chapter 1 is always accessible
    // Other chapters require previous chapter to be unsealed
    if (chapter.chapter_number > 1) {
      // Get previous chapter
      const prevChapterRows = await sqlQuery<{ id: number }[]>(
        `SELECT id FROM library_chapters WHERE chapter_number = $1`,
        [chapter.chapter_number - 1]
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

    // Get all prompts for this chapter
    const prompts = await getPromptsByChapter(chapterId);

    // Get user's writings for this chapter
    const writings = await getUserWritings(user.id, chapterId);
    const completedPromptIds = new Set(writings.map((w) => w.prompt_id));

    // Get current prompt (next one to complete)
    const currentPrompt = await getCurrentPromptForChapter(user.id, chapterId);

    // Determine status
    const writingsCompleted = writings.length;
    let status = progress?.status || 'in_progress';

    // If all 7 writings complete, status should be unsealed
    if (writingsCompleted >= 7 && status !== 'unsealed') {
      status = 'unsealed';
    }

    // Get Azura dialogue
    const azura = AZURA_DIALOGUES[chapter.chapter_number] || null;

    // Determine which Azura message to show
    let azuraMessage = azura?.intro;
    if (writingsCompleted > 0 && writingsCompleted < 7) {
      azuraMessage = azura?.encouragement;
    } else if (writingsCompleted >= 7) {
      azuraMessage = azura?.unseal;
    }

    // Format prompts with completion status
    const promptsWithStatus = prompts.map((prompt) => ({
      ...prompt,
      completed: completedPromptIds.has(prompt.id),
      writing: writings.find((w) => w.prompt_id === prompt.id) || null,
      isCurrentPrompt: currentPrompt?.id === prompt.id,
    }));

    return NextResponse.json({
      ok: true,
      chapter: {
        ...chapter,
        status,
        writingsCompleted,
        totalWritings: 7,
        startedAt: progress?.started_at,
        unsealedAt: progress?.unsealed_at,
        azura,
        azuraMessage,
      },
      prompts: promptsWithStatus,
      currentPrompt,
    });
  } catch (error) {
    console.error('Get chapter error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapter' },
      { status: 500 }
    );
  }
}

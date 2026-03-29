import { NextResponse } from 'next/server';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { getChaptersWithProgress, unlockFirstChapter } from '@/lib/library-queries';
import { AZURA_DIALOGUES } from '@/lib/library-seed-data';

export async function GET() {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const user = await getCurrentUserFromRequestCookie();

    // If user is logged in, get their progress
    if (user) {
      // Ensure chapter 1 is unlocked for the user
      await unlockFirstChapter(user.id);

      // Get all chapters with user's progress
      const chapters = await getChaptersWithProgress(user.id);

      // Add Azura dialogue to each chapter
      const chaptersWithDialogue = chapters.map((chapter) => ({
        ...chapter,
        azura: AZURA_DIALOGUES[chapter.chapter_number] || null,
      }));

      return NextResponse.json({
        ok: true,
        authenticated: true,
        chapters: chaptersWithDialogue,
      });
    }

    // For visitors (not logged in), return chapters without progress
    const chaptersRows = await sqlQuery<{ id: number; chapter_number: number; title: string; description: string; theme: string; image_url: string }[]>(
      `SELECT id, chapter_number, title, description, theme, image_url
       FROM library_chapters
       ORDER BY chapter_number ASC`
    );

    // Return chapters with locked status for visitors
    const chaptersForVisitors = chaptersRows.map((chapter) => ({
      ...chapter,
      status: chapter.chapter_number === 1 ? 'preview' : 'locked',
      writingsCompleted: 0,
      totalWritings: 7,
      startedAt: null,
      unsealedAt: null,
      azura: AZURA_DIALOGUES[chapter.chapter_number] || null,
    }));

    return NextResponse.json({
      ok: true,
      authenticated: false,
      chapters: chaptersForVisitors,
    });
  } catch (error) {
    console.error('Get chapters error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}

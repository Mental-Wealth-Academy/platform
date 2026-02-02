import { NextResponse } from 'next/server';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { CHAPTERS, PROMPTS } from '@/lib/library-seed-data';

export async function POST(request: Request) {
  try {
    // Check for admin authorization (simple check - in production use proper auth)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isDbConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Create tables
    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS library_chapters (
        id SERIAL PRIMARY KEY,
        chapter_number INTEGER NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        theme VARCHAR(100),
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS library_prompts (
        id SERIAL PRIMARY KEY,
        chapter_id INTEGER REFERENCES library_chapters(id) ON DELETE CASCADE,
        day_number INTEGER NOT NULL,
        prompt_text TEXT NOT NULL,
        placeholder_text VARCHAR(255),
        min_characters INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(chapter_id, day_number)
      )
    `);

    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS user_chapter_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chapter_id INTEGER REFERENCES library_chapters(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'locked',
        started_at TIMESTAMP,
        unsealed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, chapter_id)
      )
    `);

    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS user_writings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chapter_id INTEGER REFERENCES library_chapters(id) ON DELETE CASCADE,
        prompt_id INTEGER REFERENCES library_prompts(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        word_count INTEGER,
        shards_awarded INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, prompt_id)
      )
    `);

    // Create indexes
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_user_chapter_progress_user ON user_chapter_progress(user_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_user_writings_user ON user_writings(user_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_user_writings_chapter ON user_writings(chapter_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_library_prompts_chapter ON library_prompts(chapter_id)`);

    // Check if chapters already exist
    const existingChaptersRows = await sqlQuery<{ count: string }[]>(`SELECT COUNT(*) as count FROM library_chapters`);
    const chaptersExist = parseInt(existingChaptersRows[0]?.count || '0', 10) > 0;

    if (chaptersExist) {
      return NextResponse.json({
        ok: true,
        message: 'Tables created. Chapters already seeded.',
        chaptersCount: existingChaptersRows[0]?.count,
      });
    }

    // Seed chapters
    for (const chapter of CHAPTERS) {
      await sqlQuery(
        `INSERT INTO library_chapters (chapter_number, title, description, theme, image_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (chapter_number) DO NOTHING`,
        [chapter.chapter_number, chapter.title, chapter.description, chapter.theme, chapter.image_url]
      );
    }

    // Get chapter IDs for prompt seeding
    const chaptersRows = await sqlQuery<{ id: number; chapter_number: number }[]>(
      `SELECT id, chapter_number FROM library_chapters ORDER BY chapter_number`
    );
    const chapterIdMap = new Map(chaptersRows.map((c) => [c.chapter_number, c.id]));

    // Seed prompts
    let promptsSeeded = 0;
    for (const [chapterNum, prompts] of Object.entries(PROMPTS)) {
      const chapterId = chapterIdMap.get(parseInt(chapterNum, 10));
      if (!chapterId) continue;

      for (const prompt of prompts) {
        await sqlQuery(
          `INSERT INTO library_prompts (chapter_id, day_number, prompt_text, placeholder_text, min_characters)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (chapter_id, day_number) DO NOTHING`,
          [chapterId, prompt.day, prompt.prompt, prompt.placeholder, 100]
        );
        promptsSeeded++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Library initialized successfully',
      chaptersSeeded: CHAPTERS.length,
      promptsSeeded,
    });
  } catch (error) {
    console.error('Library init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize library', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

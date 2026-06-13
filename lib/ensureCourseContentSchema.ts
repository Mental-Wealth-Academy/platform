import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaCourseContentSchemaEnsured: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mwaCourseContentSchemaLock: Promise<void> | undefined;
}

export async function ensureCourseContentSchema() {
  if (globalThis.__mwaCourseContentSchemaEnsured) return;
  if (globalThis.__mwaCourseContentSchemaLock) {
    await globalThis.__mwaCourseContentSchemaLock;
    return;
  }

  const lockPromise = (async () => {
    try {
      await sqlQuery(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
      await sqlQuery(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    } catch (err: any) {
      if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND' || err?.code === 'ETIMEDOUT') {
        throw err;
      }
    }

    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS academy_courses (
        id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        slug VARCHAR(128) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        status VARCHAR(16) NOT NULL DEFAULT 'draft',
        sort_order INTEGER NOT NULL DEFAULT 0,
        cover_image_url TEXT NULL,
        estimated_weeks INTEGER NULL,
        created_by VARCHAR(36) NULL,
        updated_by VARCHAR(36) NULL,
        published_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS academy_chapters (
        id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        course_id CHAR(36) NOT NULL,
        slug VARCHAR(128) NOT NULL,
        title VARCHAR(255) NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(16) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE CASCADE,
        UNIQUE (course_id, slug)
      )
    `);

    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS academy_lessons (
        id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        chapter_id CHAR(36) NOT NULL,
        slug VARCHAR(128) NOT NULL,
        title VARCHAR(255) NOT NULL,
        lesson_type VARCHAR(24) NOT NULL DEFAULT 'article',
        body_markdown TEXT NOT NULL DEFAULT '',
        video_url TEXT NULL,
        resource_url TEXT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        duration_minutes INTEGER NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'draft',
        published_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chapter_id) REFERENCES academy_chapters(id) ON DELETE CASCADE,
        UNIQUE (chapter_id, slug)
      )
    `);

    try {
      await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_academy_courses_status_order ON academy_courses(status, sort_order)`);
      await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_academy_chapters_course_order ON academy_chapters(course_id, sort_order)`);
      await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_academy_lessons_chapter_order ON academy_lessons(chapter_id, sort_order)`);
    } catch {
      // indexes are best-effort for the bootstrap path
    }

    globalThis.__mwaCourseContentSchemaEnsured = true;
  })();

  globalThis.__mwaCourseContentSchemaLock = lockPromise;
  try {
    await lockPromise;
  } finally {
    globalThis.__mwaCourseContentSchemaLock = undefined;
  }
}

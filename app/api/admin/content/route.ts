import { NextResponse } from 'next/server';
import { isDbConfigured } from '@/lib/db';
import { requireVipAdmin } from '@/lib/admin-access';
import {
  createChapter,
  createCourse,
  createLesson,
  getContentTree,
} from '@/lib/course-content-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ContentStatus = 'draft' | 'published' | 'archived';
type LessonType = 'article' | 'video' | 'assignment' | 'quiz';

function parseStatus(value: unknown) {
  return value === 'published' || value === 'archived' ? value : 'draft';
}

function parseText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseNullableText(value: unknown) {
  const text = parseText(value);
  return text ? text : null;
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

function requireText(value: unknown, field: string) {
  const text = parseText(value);
  if (!text) {
    throw new Error(`${field} is required`);
  }
  return text;
}

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  }
  const adminResponse = await requireVipAdmin(request);
  if (adminResponse) return adminResponse;

  const content = await getContentTree();
  return NextResponse.json({ content });
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  }
  const adminResponse = await requireVipAdmin(request);
  if (adminResponse) return adminResponse;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const entity = parseText(body.entity);
  const status = parseStatus(body.status);

  try {
    if (entity === 'course') {
      const course = await createCourse({
        slug: requireText(body.slug, 'slug'),
        title: requireText(body.title, 'title'),
        summary: requireText(body.summary, 'summary'),
        description: requireText(body.description, 'description'),
        status: status as ContentStatus,
        sortOrder: parseNumber(body.sortOrder) ?? 0,
        coverImageUrl: parseNullableText(body.coverImageUrl),
        estimatedWeeks: parseNumber(body.estimatedWeeks),
        createdBy: parseNullableText(body.createdBy),
      });
      return NextResponse.json({ course }, { status: 201 });
    }

    if (entity === 'chapter') {
      const chapter = await createChapter({
        courseId: requireText(body.courseId, 'courseId'),
        slug: requireText(body.slug, 'slug'),
        title: requireText(body.title, 'title'),
        summary: requireText(body.summary, 'summary'),
        status: status as ContentStatus,
        sortOrder: parseNumber(body.sortOrder) ?? 0,
      });
      return NextResponse.json({ chapter }, { status: 201 });
    }

    if (entity === 'lesson') {
      const lesson = await createLesson({
        chapterId: requireText(body.chapterId, 'chapterId'),
        slug: requireText(body.slug, 'slug'),
        title: requireText(body.title, 'title'),
        lessonType: (['article', 'video', 'assignment', 'quiz'].includes(parseText(body.lessonType))
          ? parseText(body.lessonType)
          : 'article') as LessonType,
        bodyMarkdown: requireText(body.bodyMarkdown, 'bodyMarkdown'),
        videoUrl: parseNullableText(body.videoUrl),
        resourceUrl: parseNullableText(body.resourceUrl),
        status: status as ContentStatus,
        sortOrder: parseNumber(body.sortOrder) ?? 0,
        durationMinutes: parseNumber(body.durationMinutes),
      });
      return NextResponse.json({ lesson }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unknown entity type.' }, { status: 400 });
  } catch (error) {
    console.error('[admin/content] create error:', error);
    return NextResponse.json({ error: 'Failed to save content.' }, { status: 500 });
  }
}

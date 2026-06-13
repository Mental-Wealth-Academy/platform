import { NextResponse } from 'next/server';
import { isDbConfigured } from '@/lib/db';
import { requireVipAdmin } from '@/lib/admin-access';
import {
  deleteChapter,
  deleteCourse,
  deleteLesson,
  updateChapter,
  updateCourse,
  updateLesson,
} from '@/lib/course-content-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseStatus(value: unknown) {
  return value === 'published' || value === 'archived' ? value : undefined;
}

function parseText(value: unknown) {
  return typeof value === 'string' ? value.trim() : undefined;
}

function parseNullableText(value: unknown) {
  if (value === null) return null;
  return parseText(value);
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return undefined;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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
  if (!entity) {
    return NextResponse.json({ error: 'entity is required' }, { status: 400 });
  }

  try {
    if (entity === 'course') {
      const course = await updateCourse(params.id, {
        slug: parseText(body.slug),
        title: parseText(body.title),
        summary: parseText(body.summary),
        description: parseText(body.description),
        status: parseStatus(body.status),
        sortOrder: parseNumber(body.sortOrder),
        coverImageUrl: body.coverImageUrl === null ? null : parseNullableText(body.coverImageUrl),
        estimatedWeeks: parseNumber(body.estimatedWeeks),
      });
      return NextResponse.json({ course });
    }

    if (entity === 'chapter') {
      const chapter = await updateChapter(params.id, {
        courseId: parseText(body.courseId),
        slug: parseText(body.slug),
        title: parseText(body.title),
        summary: parseText(body.summary),
        status: parseStatus(body.status),
        sortOrder: parseNumber(body.sortOrder),
      });
      return NextResponse.json({ chapter });
    }

    if (entity === 'lesson') {
      const lesson = await updateLesson(params.id, {
        chapterId: parseText(body.chapterId),
        slug: parseText(body.slug),
        title: parseText(body.title),
        lessonType: parseText(body.lessonType) as any,
        bodyMarkdown: parseText(body.bodyMarkdown),
        videoUrl: body.videoUrl === null ? null : parseNullableText(body.videoUrl),
        resourceUrl: body.resourceUrl === null ? null : parseNullableText(body.resourceUrl),
        status: parseStatus(body.status),
        sortOrder: parseNumber(body.sortOrder),
        durationMinutes: parseNumber(body.durationMinutes),
      });
      return NextResponse.json({ lesson });
    }

    return NextResponse.json({ error: 'Unknown entity type.' }, { status: 400 });
  } catch (error) {
    console.error('[admin/content] update error:', error);
    return NextResponse.json({ error: 'Failed to save content.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  }
  const adminResponse = await requireVipAdmin(request);
  if (adminResponse) return adminResponse;

  const url = new URL(request.url);
  const entity = url.searchParams.get('entity');

  try {
    if (entity === 'chapter') {
      return NextResponse.json({ deleted: await deleteChapter(params.id) });
    }
    if (entity === 'lesson') {
      return NextResponse.json({ deleted: await deleteLesson(params.id) });
    }
    return NextResponse.json({ deleted: await deleteCourse(params.id) });
  } catch (error) {
    console.error('[admin/content] delete error:', error);
    return NextResponse.json({ error: 'Failed to delete content.' }, { status: 500 });
  }
}

import { sqlQuery } from './db';
import { ensureCourseContentSchema } from './ensureCourseContentSchema';

export type CourseContentStatus = 'draft' | 'published' | 'archived';
export type LessonContentType = 'article' | 'video' | 'assignment' | 'quiz';

export interface CourseRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  status: CourseContentStatus;
  sortOrder: number;
  coverImageUrl: string | null;
  estimatedWeeks: number | null;
  createdBy: string | null;
  updatedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterRecord {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  summary: string;
  status: CourseContentStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonRecord {
  id: string;
  chapterId: string;
  slug: string;
  title: string;
  lessonType: LessonContentType;
  bodyMarkdown: string;
  videoUrl: string | null;
  resourceUrl: string | null;
  status: CourseContentStatus;
  sortOrder: number;
  durationMinutes: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentTree {
  courses: Array<CourseRecord & { chapters: Array<ChapterRecord & { lessons: LessonRecord[] }> }>;
}

interface CourseRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  status: string;
  sort_order: number;
  cover_image_url: string | null;
  estimated_weeks: number | null;
  created_by: string | null;
  updated_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ChapterRow {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  summary: string;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface LessonRow {
  id: string;
  chapter_id: string;
  slug: string;
  title: string;
  lesson_type: string;
  body_markdown: string;
  video_url: string | null;
  resource_url: string | null;
  status: string;
  sort_order: number;
  duration_minutes: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

function toCourseRecord(row: CourseRow): CourseRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    status: (row.status as CourseContentStatus) || 'draft',
    sortOrder: row.sort_order,
    coverImageUrl: row.cover_image_url,
    estimatedWeeks: row.estimated_weeks,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toChapterRecord(row: ChapterRow): ChapterRecord {
  return {
    id: row.id,
    courseId: row.course_id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    status: (row.status as CourseContentStatus) || 'draft',
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLessonRecord(row: LessonRow): LessonRecord {
  return {
    id: row.id,
    chapterId: row.chapter_id,
    slug: row.slug,
    title: row.title,
    lessonType: (row.lesson_type as LessonContentType) || 'article',
    bodyMarkdown: row.body_markdown,
    videoUrl: row.video_url,
    resourceUrl: row.resource_url,
    status: (row.status as CourseContentStatus) || 'draft',
    sortOrder: row.sort_order,
    durationMinutes: row.duration_minutes,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getContentTree(): Promise<ContentTree> {
  await ensureCourseContentSchema();

  const [courses, chapters, lessons] = await Promise.all([
    sqlQuery<CourseRow[]>(`SELECT * FROM academy_courses ORDER BY sort_order ASC, created_at ASC`),
    sqlQuery<ChapterRow[]>(`SELECT * FROM academy_chapters ORDER BY sort_order ASC, created_at ASC`),
    sqlQuery<LessonRow[]>(`SELECT * FROM academy_lessons ORDER BY sort_order ASC, created_at ASC`),
  ]);

  const chapterMap = new Map<string, ChapterRecord & { lessons: LessonRecord[] }>();
  for (const chapter of chapters.map(toChapterRecord)) {
    chapterMap.set(chapter.id, { ...chapter, lessons: [] });
  }

  for (const lesson of lessons.map(toLessonRecord)) {
    const chapter = chapterMap.get(lesson.chapterId);
    if (chapter) chapter.lessons.push(lesson);
  }

  const courseMap = new Map<string, CourseRecord & { chapters: Array<ChapterRecord & { lessons: LessonRecord[] }> }>();
  for (const course of courses.map(toCourseRecord)) {
    courseMap.set(course.id, { ...course, chapters: [] });
  }

  for (const chapter of chapterMap.values()) {
    const course = courseMap.get(chapter.courseId);
    if (course) course.chapters.push(chapter);
  }

  return { courses: Array.from(courseMap.values()) };
}

export async function createCourse(input: {
  slug: string;
  title: string;
  summary: string;
  description: string;
  status: CourseContentStatus;
  sortOrder: number;
  coverImageUrl: string | null;
  estimatedWeeks: number | null;
  createdBy: string | null;
}): Promise<CourseRecord> {
  await ensureCourseContentSchema();
  const rows = await sqlQuery<CourseRow[]>(
    `INSERT INTO academy_courses
      (slug, title, summary, description, status, sort_order, cover_image_url, estimated_weeks, created_by, updated_by, published_at)
     VALUES
      (:slug, :title, :summary, :description, :status, :sortOrder, :coverImageUrl, :estimatedWeeks, :createdBy, :createdBy,
       CASE WHEN :status = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)
     RETURNING *`,
    input,
  );
  return toCourseRecord(rows[0]);
}

export async function createChapter(input: {
  courseId: string;
  slug: string;
  title: string;
  summary: string;
  status: CourseContentStatus;
  sortOrder: number;
}): Promise<ChapterRecord> {
  await ensureCourseContentSchema();
  const rows = await sqlQuery<ChapterRow[]>(
    `INSERT INTO academy_chapters
      (course_id, slug, title, summary, status, sort_order)
     VALUES
      (:courseId, :slug, :title, :summary, :status, :sortOrder)
     RETURNING *`,
    input,
  );
  return toChapterRecord(rows[0]);
}

export async function createLesson(input: {
  chapterId: string;
  slug: string;
  title: string;
  lessonType: LessonContentType;
  bodyMarkdown: string;
  videoUrl: string | null;
  resourceUrl: string | null;
  status: CourseContentStatus;
  sortOrder: number;
  durationMinutes: number | null;
}): Promise<LessonRecord> {
  await ensureCourseContentSchema();
  const rows = await sqlQuery<LessonRow[]>(
    `INSERT INTO academy_lessons
      (chapter_id, slug, title, lesson_type, body_markdown, video_url, resource_url, status, sort_order, duration_minutes, published_at)
     VALUES
      (:chapterId, :slug, :title, :lessonType, :bodyMarkdown, :videoUrl, :resourceUrl, :status, :sortOrder, :durationMinutes,
       CASE WHEN :status = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)
     RETURNING *`,
    input,
  );
  return toLessonRecord(rows[0]);
}

export async function updateCourse(id: string, input: Partial<{
  slug: string;
  title: string;
  summary: string;
  description: string;
  status: CourseContentStatus;
  sortOrder: number;
  coverImageUrl: string | null;
  estimatedWeeks: number | null;
}>): Promise<CourseRecord | null> {
  await ensureCourseContentSchema();
  const rows = await sqlQuery<CourseRow[]>(
    `UPDATE academy_courses
     SET slug = COALESCE(:slug, slug),
         title = COALESCE(:title, title),
         summary = COALESCE(:summary, summary),
         description = COALESCE(:description, description),
         status = COALESCE(:status, status),
         sort_order = COALESCE(:sortOrder, sort_order),
         cover_image_url = COALESCE(:coverImageUrl, cover_image_url),
         estimated_weeks = COALESCE(:estimatedWeeks, estimated_weeks),
         published_at = CASE
           WHEN :status = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP)
           WHEN :status = 'draft' THEN NULL
           ELSE published_at
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = :id
     RETURNING *`,
    { id, ...input },
  );
  return rows[0] ? toCourseRecord(rows[0]) : null;
}

export async function updateChapter(id: string, input: Partial<{
  courseId: string;
  slug: string;
  title: string;
  summary: string;
  status: CourseContentStatus;
  sortOrder: number;
}>): Promise<ChapterRecord | null> {
  await ensureCourseContentSchema();
  const rows = await sqlQuery<ChapterRow[]>(
    `UPDATE academy_chapters
     SET course_id = COALESCE(:courseId, course_id),
         slug = COALESCE(:slug, slug),
         title = COALESCE(:title, title),
         summary = COALESCE(:summary, summary),
         status = COALESCE(:status, status),
         sort_order = COALESCE(:sortOrder, sort_order),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = :id
     RETURNING *`,
    { id, ...input },
  );
  return rows[0] ? toChapterRecord(rows[0]) : null;
}

export async function updateLesson(id: string, input: Partial<{
  chapterId: string;
  slug: string;
  title: string;
  lessonType: LessonContentType;
  bodyMarkdown: string;
  videoUrl: string | null;
  resourceUrl: string | null;
  status: CourseContentStatus;
  sortOrder: number;
  durationMinutes: number | null;
}>): Promise<LessonRecord | null> {
  await ensureCourseContentSchema();
  const rows = await sqlQuery<LessonRow[]>(
    `UPDATE academy_lessons
     SET chapter_id = COALESCE(:chapterId, chapter_id),
         slug = COALESCE(:slug, slug),
         title = COALESCE(:title, title),
         lesson_type = COALESCE(:lessonType, lesson_type),
         body_markdown = COALESCE(:bodyMarkdown, body_markdown),
         video_url = COALESCE(:videoUrl, video_url),
         resource_url = COALESCE(:resourceUrl, resource_url),
         status = COALESCE(:status, status),
         sort_order = COALESCE(:sortOrder, sort_order),
         duration_minutes = COALESCE(:durationMinutes, duration_minutes),
         published_at = CASE
           WHEN :status = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP)
           WHEN :status = 'draft' THEN NULL
           ELSE published_at
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = :id
     RETURNING *`,
    { id, ...input },
  );
  return rows[0] ? toLessonRecord(rows[0]) : null;
}

export async function deleteCourse(id: string): Promise<boolean> {
  await ensureCourseContentSchema();
  const rows = await sqlQuery<Array<{ id: string }>>(`DELETE FROM academy_courses WHERE id = :id RETURNING id`, { id });
  return rows.length > 0;
}

export async function deleteChapter(id: string): Promise<boolean> {
  await ensureCourseContentSchema();
  const rows = await sqlQuery<Array<{ id: string }>>(`DELETE FROM academy_chapters WHERE id = :id RETURNING id`, { id });
  return rows.length > 0;
}

export async function deleteLesson(id: string): Promise<boolean> {
  await ensureCourseContentSchema();
  const rows = await sqlQuery<Array<{ id: string }>>(`DELETE FROM academy_lessons WHERE id = :id RETURNING id`, { id });
  return rows.length > 0;
}

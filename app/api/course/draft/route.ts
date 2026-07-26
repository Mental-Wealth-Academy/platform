import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runAiStructured } from '@/lib/ai';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { walletHasMembershipAccess } from '@/lib/membership-access';
import type { CourseData } from '@/lib/personal-course';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DRAFT_SYSTEM_PROMPT = `You are a course curriculum designer for Mental Wealth Academy, an educational gameworld.
Generate a practical 4-week micro-course based on the user's topic and goal.

Rules:
- Generate concrete, behavioral tasks: specific actions the user will take each day or week.
- Do not make factual claims about medicine, neuroscience, or psychology research. Avoid "studies show..." statements.
- Tasks must be actionable: "write for 5 minutes each morning", "take a 10-minute walk", "practice one breathing exercise before bed".
- Each week has a short theme (2–4 words), a weekly read, and exactly 4 tasks.
- Tasks are 1 sentence each, plain language, active voice.
- Title: direct and concrete — "Build a drawing practice", "Start a running habit", "Develop a public speaking skill".
- Build on widely accepted behavioral principles: small steps, consistency, gradual progression, reflection.
- Week 1 should be very gentle. Week 4 should lock in the habit.

Weekly read:
- Each week includes a "read": a short reflective passage that frames that week's theme and motivates the tasks.
- "read.title" is a short, evocative title (2–5 words) tied to the week's theme.
- "read.body" is 2–3 short paragraphs (plain language, warm, second person "you"), separated by a blank line (\\n\\n).
- The read is reflective and practical — it sets up the mindset for the week. No factual/medical/research claims.

Return raw JSON only, with no prose or markdown fences, in exactly this shape:
{"title":"string","focus":"string","weeks":[{"weekNumber":1,"theme":"string","read":{"title":"string","body":"string"},"tasks":["","","",""]},{"weekNumber":2,"theme":"string","read":{"title":"string","body":"string"},"tasks":["","","",""]},{"weekNumber":3,"theme":"string","read":{"title":"string","body":"string"},"tasks":["","","",""]},{"weekNumber":4,"theme":"string","read":{"title":"string","body":"string"},"tasks":["","","",""]}]}`;

const nonEmptyString = z.string().trim().min(1);
const courseReadSchema = z.object({
  title: nonEmptyString,
  body: nonEmptyString,
}).strict();
const courseWeekSchema = z.object({
  weekNumber: z.number().int().min(1).max(4),
  theme: nonEmptyString,
  read: courseReadSchema,
  tasks: z.array(nonEmptyString).length(4),
}).strict();
const courseDraftSchema: z.ZodType<CourseData> = z.object({
  title: nonEmptyString,
  focus: nonEmptyString,
  weeks: z.array(courseWeekSchema).length(4),
}).strict().superRefine((course, context) => {
  course.weeks.forEach((week, index) => {
    if (week.weekNumber !== index + 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Week ${index + 1} must use weekNumber ${index + 1}.`,
        path: ['weeks', index, 'weekNumber'],
      });
    }
  });
});

function configuredAiProviderExists(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY || process.env.ELIZA_API_KEY);
}

function aiErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}

export async function POST(request: Request) {
  // Course creation is a VIP-membership perk — gate before spending LLM budget.
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to build a course.' }, { status: 401 });
  }
  const hasMembership = await walletHasMembershipAccess(user.walletAddress);
  if (!hasMembership) {
    return NextResponse.json(
      { error: 'A VIP membership is required to build a course.', code: 'vip_required' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({})) as { prompt?: unknown };
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';

  if (!prompt) {
    return NextResponse.json({ error: 'Tell Blue what you want to learn.' }, { status: 400 });
  }

  if (!configuredAiProviderExists()) {
    return NextResponse.json({ error: 'No LLM configured.' }, { status: 503 });
  }

  let course: CourseData;
  try {
    const result = await runAiStructured<CourseData>({
      task: 'content_draft',
      messages: [
        { role: 'system', content: DRAFT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      schema: courseDraftSchema,
      schemaName: 'course_draft',
      schemaDescription:
        'A course title and focus with exactly four ordered weeks numbered 1 through 4. Each week has a theme, a read with title and body, and exactly four non-empty task strings.',
      signal: request.signal,
    });
    course = result.data;
  } catch (err) {
    if (aiErrorCode(err) === 'ai_schema_invalid') {
      return NextResponse.json(
        { error: 'Could not generate a course from that. Try being more specific about your topic and goal.' },
        { status: 422 },
      );
    }
    console.error('[course/draft] LLM call failed:', err);
    return NextResponse.json({ error: 'Course generation failed. Try again.' }, { status: 500 });
  }

  return NextResponse.json({ course });
}

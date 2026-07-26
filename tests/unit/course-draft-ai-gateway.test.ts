import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  runAiStructured: vi.fn(),
  walletHasMembershipAccess: vi.fn(),
}));

vi.mock('@/lib/ai', () => ({
  runAiStructured: mocks.runAiStructured,
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromRequestCookie: mocks.getCurrentUser,
}));
vi.mock('@/lib/membership-access', () => ({
  walletHasMembershipAccess: mocks.walletHasMembershipAccess,
}));

import { POST } from '@/app/api/course/draft/route';

const originalDeepSeekKey = process.env.DEEPSEEK_API_KEY;
const originalElizaKey = process.env.ELIZA_API_KEY;

const course = {
  title: 'Build a drawing practice',
  focus: 'Draw for twenty minutes each day',
  weeks: [1, 2, 3, 4].map((weekNumber) => ({
    weekNumber,
    theme: `Week ${weekNumber}`,
    read: {
      title: `Read ${weekNumber}`,
      body: `Start with one small action in week ${weekNumber}.`,
    },
    tasks: [
      `Task ${weekNumber}.1`,
      `Task ${weekNumber}.2`,
      `Task ${weekNumber}.3`,
      `Task ${weekNumber}.4`,
    ],
  })),
};

function request(prompt = '  Help me build a drawing habit.  '): Request {
  return new Request('https://academy.example/api/course/draft', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

describe('POST /api/course/draft AI gateway migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEEPSEEK_API_KEY = 'test-key';
    delete process.env.ELIZA_API_KEY;
    mocks.getCurrentUser.mockResolvedValue({
      id: 'member-1',
      walletAddress: '0x1234',
    });
    mocks.walletHasMembershipAccess.mockResolvedValue(true);
    mocks.runAiStructured.mockResolvedValue({ data: course });
  });

  afterAll(() => {
    if (originalDeepSeekKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = originalDeepSeekKey;
    if (originalElizaKey === undefined) delete process.env.ELIZA_API_KEY;
    else process.env.ELIZA_API_KEY = originalElizaKey;
  });

  it('checks authentication before membership or AI work', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Sign in to build a course.',
    });
    expect(mocks.walletHasMembershipAccess).not.toHaveBeenCalled();
    expect(mocks.runAiStructured).not.toHaveBeenCalled();
  });

  it('checks membership before AI work', async () => {
    mocks.walletHasMembershipAccess.mockResolvedValue(false);

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'A VIP membership is required to build a course.',
      code: 'vip_required',
    });
    expect(mocks.runAiStructured).not.toHaveBeenCalled();
  });

  it('uses the content draft profile and returns the existing course response shape', async () => {
    const response = await POST(request());
    const input = mocks.runAiStructured.mock.calls[0][0];

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ course });
    expect(input.task).toBe('content_draft');
    expect(input.schemaName).toBe('course_draft');
    expect(input.messages.at(-1)).toEqual({
      role: 'user',
      content: 'Help me build a drawing habit.',
    });
    expect(input.schema.safeParse(course).success).toBe(true);

    const outOfOrder = {
      ...course,
      weeks: course.weeks.map((week, index) => ({
        ...week,
        weekNumber: index === 0 ? 2 : week.weekNumber,
      })),
    };
    expect(input.schema.safeParse(outOfOrder).success).toBe(false);
    expect(
      input.schema.safeParse({
        ...course,
        weeks: course.weeks.map(({ read: _read, ...week }) => week),
      }).success,
    ).toBe(false);
    expect(input.schema.safeParse({ ...course, title: '   ' }).success).toBe(false);
    const whitespaceWeek = {
      ...course,
      weeks: course.weeks.map((week, index) => (
        index === 0
          ? {
              ...week,
              theme: '   ',
              read: { title: '   ', body: '   ' },
              tasks: ['   ', ...week.tasks.slice(1)],
            }
          : week
      )),
    };
    expect(input.schema.safeParse(whitespaceWeek).success).toBe(false);
  });

  it('preserves the course-specific schema failure response', async () => {
    mocks.runAiStructured.mockRejectedValue(
      Object.assign(new Error('invalid structured output'), {
        code: 'ai_schema_invalid',
      }),
    );

    const response = await POST(request());

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'Could not generate a course from that. Try being more specific about your topic and goal.',
    });
  });

  it('preserves the no-provider response without invoking the gateway', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.ELIZA_API_KEY;

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'No LLM configured.' });
    expect(mocks.runAiStructured).not.toHaveBeenCalled();
  });
});

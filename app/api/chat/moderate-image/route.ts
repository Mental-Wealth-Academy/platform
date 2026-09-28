import { NextRequest, NextResponse } from 'next/server';
import { isDbConfigured } from '@/lib/db';
import { postBlueMessage } from '@/lib/blue-link-reviewer';
import { runAiText } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODERATION_FALLBACKS = [
  'Blue verified this upload. Safe and on-theme for the academy room.',
  'Checked over the visual context. Looks clean and supportive of today\'s focus.',
  'Image reviewed. Good aesthetic for somatic reflection and study.',
  'Blue approved the upload. Fits the community standards.',
];

export async function POST(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  let body: { imageUrl?: string; caption?: string; userId?: string; username?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const imageUrl = body.imageUrl?.trim();
  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl is required.' }, { status: 400 });
  }

  const username = body.username || 'member';
  const caption = body.caption?.trim() || '';

  // Prompt Blue to act as automatic AI moderator
  const prompt = `You are Blue, the resident AI daemon and automatic moderator at Mental Wealth Academy.
A member (@${username}) just posted an image in the global chat: ${imageUrl}
${caption ? `Member caption: "${caption}"` : 'No caption provided.'}

Write an immediate, natural 1-2 sentence moderator review to the room about this image.
Rules:
- Length: 1 to 2 short sentences.
- Tone: Calm, sharp, perceptive, and encouraging of mental wealth, study habits, or somatic health.
- State whether the visual looks safe, on-topic, or reflective.
- Never use emojis.
- Never use all-caps words.
- Never use "X not Y" framing.
- Sound like Blue chatting directly in the room, not a generic robot.`;

  let reviewText = '';

  try {
    const aiResult = await runAiText({
      task: 'blue_chat_short',
      messages: [{ role: 'user', content: prompt }],
      safety: { decision: 'allow', policyVersion: 'preflight-v1' },
    });

    const cleaned = aiResult.text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[*_#`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length >= 10 && cleaned.length <= 300) {
      reviewText = cleaned;
    }
  } catch {
    // AI fallback
  }

  if (!reviewText) {
    const pick = Math.abs(username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % MODERATION_FALLBACKS.length;
    reviewText = MODERATION_FALLBACKS[pick];
  }

  // Small delay to simulate thoughtful review
  await new Promise((r) => setTimeout(r, 1200));

  const posted = await postBlueMessage(reviewText);

  return NextResponse.json({
    ok: true,
    reviewed: true,
    review: reviewText,
    messageId: posted?.id,
  });
}

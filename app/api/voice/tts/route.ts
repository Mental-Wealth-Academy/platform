import { NextRequest, NextResponse } from 'next/server';
import bluePersona from '@/lib/bluepersonality.json';

const ELIZA_BASE_URL = (process.env.ELIZA_API_BASE_URL || 'https://www.elizacloud.ai').replace(/\/+$/, '');
const ELIZA_API_KEY = process.env.ELIZA_API_KEY || '';
const BLUE_VOICE_ID = bluePersona.settings?.voice?.voiceId || '';
const BLUE_VOICE_MODEL =
  bluePersona.settings?.voice?.model ||
  'eleven_flash_v2_5';

async function requestTts(path: string, text: string, voiceId?: string) {
  const payload: Record<string, string> = {
    text,
    modelId: BLUE_VOICE_MODEL,
  };

  if (voiceId) {
    payload.voiceId = voiceId;
  }

  return fetch(`${ELIZA_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ELIZA_API_KEY}`,
      'X-API-Key': ELIZA_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function POST(req: NextRequest) {
  if (!ELIZA_API_KEY) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 500 });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.length > 5000) {
      return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
    }

    const attempts: Array<{ label: string; path: string; voiceId?: string }> = [
      { label: 'v1-configured-voice', path: '/api/v1/voice/tts', voiceId: BLUE_VOICE_ID || undefined },
      { label: 'v1-default-voice', path: '/api/v1/voice/tts' },
      { label: 'legacy-configured-voice', path: '/api/elevenlabs/tts', voiceId: BLUE_VOICE_ID || undefined },
      { label: 'legacy-default-voice', path: '/api/elevenlabs/tts' },
    ];

    let response: Response | null = null;
    let lastStatus = 500;
    let lastErrorText = '';

    for (const attempt of attempts) {
      response = await requestTts(attempt.path, text, attempt.voiceId);

      if (response.ok) {
        if (attempt.label !== 'v1-configured-voice') {
          console.warn(`Eliza TTS succeeded via fallback path: ${attempt.label}`);
        }
        break;
      }

      const errText = await response.text();
      lastStatus = response.status;
      lastErrorText = errText;
      console.error(`Eliza TTS attempt failed: ${attempt.label}`, response.status, errText.slice(0, 200));
    }

    if (!response || !response.ok) {
      console.error('Eliza TTS error:', lastStatus, lastErrorText.slice(0, 200));
      return NextResponse.json({ error: 'TTS generation failed' }, { status: lastStatus });
    }

    // Eliza returns streaming audio/mpeg
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return NextResponse.json({ audio: base64 });
  } catch (err) {
    console.error('TTS route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

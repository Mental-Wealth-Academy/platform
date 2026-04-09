import { NextRequest, NextResponse } from 'next/server';
import bluePersona from '@/lib/bluepersonality.json';

const ELIZA_BASE_URL = (process.env.ELIZA_API_BASE_URL || 'https://www.elizacloud.ai').replace(/\/+$/, '');
const ELIZA_API_KEY = process.env.ELIZA_API_KEY || '';
const BLUE_VOICE_ID = process.env.AZURA_VOICE_ID || bluePersona.settings?.voice?.voiceId || '';
const BLUE_VOICE_MODEL = bluePersona.settings?.voice?.model || 'eleven_flash_v2_5';

async function requestTts(text: string, voiceId?: string) {
  const payload: Record<string, string> = {
    text,
    modelId: BLUE_VOICE_MODEL,
  };

  if (voiceId) {
    payload.voiceId = voiceId;
  }

  return fetch(`${ELIZA_BASE_URL}/api/v1/voice/tts`, {
    method: 'POST',
    headers: {
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

    let response = await requestTts(text, BLUE_VOICE_ID || undefined);

    if (!response.ok && BLUE_VOICE_ID) {
      const errText = await response.text();
      console.error('Eliza TTS BLUE voice request failed, retrying with default voice:', response.status, errText.slice(0, 200));
      response = await requestTts(text);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('Eliza TTS error:', response.status, errText.slice(0, 200));
      return NextResponse.json({ error: 'TTS generation failed' }, { status: response.status });
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

import { NextRequest, NextResponse } from 'next/server';

const ELIZA_BASE_URL = (process.env.ELIZA_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
const ELIZA_API_KEY = process.env.ELIZA_API_KEY || '';

export async function POST(req: NextRequest) {
  if (!ELIZA_API_KEY) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 500 });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.length > 5000) {
      return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
    }

    const response = await fetch(`${ELIZA_BASE_URL}/api/elevenlabs/tts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ELIZA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        modelId: 'eleven_flash_v2_5',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Eliza TTS error:', response.status, errText);
      return NextResponse.json({ error: 'TTS generation failed' }, { status: response.status });
    }

    // Eliza returns streaming audio/mpeg -- convert to base64 for client
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('audio')) {
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return NextResponse.json({ audio: base64 });
    }

    // May return JSON with audio_data field
    const data = await response.json();
    if (data.audio_data) {
      return NextResponse.json({ audio: data.audio_data });
    }
    if (data.audio) {
      return NextResponse.json({ audio: data.audio });
    }

    return NextResponse.json({ error: 'No audio data returned' }, { status: 502 });
  } catch (err) {
    console.error('TTS route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

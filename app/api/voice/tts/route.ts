import { NextRequest, NextResponse } from 'next/server';

const ELIZA_BASE_URL = (process.env.ELIZA_API_BASE_URL || 'https://www.elizacloud.ai').replace(/\/+$/, '');
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

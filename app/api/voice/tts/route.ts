import { NextRequest, NextResponse } from 'next/server';

const ELIZA_BASE_URL = (process.env.ELIZA_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
const ELIZA_API_KEY = process.env.ELIZA_API_KEY || '';

// Try multiple TTS endpoint paths (Eliza Cloud vs self-hosted ElizaOS)
const TTS_PATHS = [
  '/api/elevenlabs/tts',
  '/api/v1/tts',
];

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.length > 5000) {
      return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (ELIZA_API_KEY) {
      headers['Authorization'] = `Bearer ${ELIZA_API_KEY}`;
    }

    // Try each TTS path until one works
    for (const path of TTS_PATHS) {
      try {
        const response = await fetch(`${ELIZA_BASE_URL}${path}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text,
            modelId: 'eleven_flash_v2_5',
          }),
        });

        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || '';

        // Streaming audio response
        if (contentType.includes('audio')) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          return NextResponse.json({ audio: base64 });
        }

        // JSON response with audio data
        const data = await response.json();
        if (data.audio_data) return NextResponse.json({ audio: data.audio_data });
        if (data.audio) return NextResponse.json({ audio: data.audio });
      } catch {
        // Try next path
        continue;
      }
    }

    // All TTS paths failed
    return NextResponse.json({ error: 'TTS unavailable' }, { status: 502 });
  } catch (err) {
    console.error('TTS route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

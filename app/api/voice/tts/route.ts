import { NextRequest, NextResponse } from 'next/server';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_TTS_URL = 'https://api.mistral.ai/v1/audio/speech';
const MODEL = 'voxtral-mini-tts-2603';

// Azura's voice persona instructions — shapes tone, pace, and delivery
const VOICE_PERSONA = [
  'You are Azura, a confident young woman with a sharp, quick voice.',
  'Speak with calm intensity — measured but never slow.',
  'Your tone is direct, slightly sardonic, and subtly warm underneath.',
  'Deliver lines like you are already three steps ahead of whoever you are talking to.',
  'Keep it natural, conversational, not robotic or overly dramatic.',
].join(' ');

export async function POST(req: NextRequest) {
  if (!MISTRAL_API_KEY) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 500 });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.length > 4000) {
      return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
    }

    const response = await fetch(MISTRAL_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input: `<persona>${VOICE_PERSONA}</persona>\n${text}`,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Mistral TTS error:', response.status, errText);
      return NextResponse.json(
        { error: 'TTS generation failed' },
        { status: response.status },
      );
    }

    const data = await response.json();

    if (!data.audio_data) {
      return NextResponse.json({ error: 'No audio data returned' }, { status: 502 });
    }

    return NextResponse.json({ audio: data.audio_data });
  } catch (err) {
    console.error('TTS route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

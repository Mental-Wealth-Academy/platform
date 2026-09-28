import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const agentId = process.env.ELEVENLABS_AGENT_ID?.trim() || 'agent_9801kx535dzwefxar95qgenx5a7z';

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Blue is resting her voice right now. Please try again in a moment.' },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Failed to get ElevenLabs signed conversation URL:', response.status, errorText);
      return NextResponse.json(
        { error: 'Could not connect with Blue right now. Please try again in a moment.' },
        { status: response.status },
      );
    }

    const data = (await response.json()) as { signed_url?: string };
    if (!data.signed_url) {
      return NextResponse.json(
        { error: 'Could not connect with Blue right now. Please try again in a moment.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error requesting conversation signed URL:', message);
    return NextResponse.json(
      { error: 'Could not connect with Blue right now. Please try again in a moment.' },
      { status: 500 },
    );
  }
}

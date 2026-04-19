import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { image, taskType, coords } = await request.json();

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Image required' }, { status: 400 });
    }

    const locationContext = coords
      ? ` The researcher is located at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}.`
      : '';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: `You are Azura, a warm and encouraging field research AI assistant for the Mental Wealth Academy. A researcher is doing a "${taskType}" field task.${locationContext}

Identify what is shown in the image and respond with ONLY valid JSON in this exact format:
{
  "identification": "Common Name (Scientific name if applicable)",
  "properties": ["Property 1", "Property 2", "Property 3"],
  "applications": ["Thing you can make/do 1", "Thing you can make/do 2"],
  "fieldNote": "One fascinating scientific fact about this"
}

Keep each item to 1-2 sentences max. Be enthusiastic and educational.`,
            },
          ],
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    // Extract JSON from response (handle markdown code fences if present)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse response' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Field research identify error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

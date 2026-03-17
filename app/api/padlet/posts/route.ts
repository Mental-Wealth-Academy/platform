import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';

const PADLET_API_KEY = process.env.PADLET_API;
const BOARD_ID = 'nru8fi4l8r3tf6f3';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequestCookie();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    if (!PADLET_API_KEY) {
      return NextResponse.json(
        { error: 'Padlet API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { content, title, color } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Padlet API requires data in JSON:API format
    const postData: {
      data: {
        type: string;
        attributes: {
          content: {
            subject: string;
            body: string;
          };
          color?: string;
        };
      };
    } = {
      data: {
        type: 'post',
        attributes: {
          content: {
            subject: title || '',
            body: content,
          },
        },
      },
    };

    // Add color if provided
    if (color) {
      postData.data.attributes.color = color;
    }

    const response = await fetch(
      `https://api.padlet.dev/v1/boards/${BOARD_ID}/posts`,
      {
        method: 'POST',
        headers: {
          'X-Api-Key': PADLET_API_KEY,
          'content-type': 'application/vnd.api+json',
          'accept': 'application/vnd.api+json',
        },
        body: JSON.stringify(postData),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating Padlet post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

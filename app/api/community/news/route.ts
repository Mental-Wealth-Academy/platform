import { NextResponse } from 'next/server';
import { normalizeCommunityArticleUrl } from '@/lib/community-links';

export const revalidate = 1800;

const NEWS_TOPICS = [
  {
    topic: 'DeSci',
    query: 'decentralized+science+DeSci',
    color: '#5168FF',
  },
  {
    topic: 'Blockchain',
    query: 'blockchain+ethereum+web3+crypto',
    color: '#2FB7A0',
  },
  {
    topic: 'AI Health',
    query: 'artificial+intelligence+health+medicine',
    color: '#8a7dff',
  },
  {
    topic: 'Cyberculture',
    query: 'internet+culture+digital+society+technology',
    color: '#E85D9F',
  },
];

interface HNHit {
  title?: string;
  story_title?: string;
  url?: string;
  author: string;
  created_at: string;
  points: number | null;
}

export async function GET() {
  try {
    const results = await Promise.all(
      NEWS_TOPICS.map(async ({ topic, query, color }) => {
        const res = await fetch(
          `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=6`,
          { next: { revalidate: 1800 } },
        );

        if (!res.ok) {
          return { topic, color, items: [] };
        }

        const data = await res.json();
        const hits: HNHit[] = data.hits ?? [];

        const items = hits
          .filter((hit) => (hit.title || hit.story_title) && hit.url)
          .slice(0, 3)
          .map((hit) => {
            const normalizedUrl = normalizeCommunityArticleUrl(hit.url!);
            let source = 'hackernews';
            try {
              source = new URL(normalizedUrl).hostname.replace(/^www\./, '');
            } catch {
              // keep default
            }
            return {
              title: hit.title ?? hit.story_title ?? '',
              url: normalizedUrl,
              source,
              createdAt: hit.created_at,
            };
          });

        return { topic, color, items };
      }),
    );

    return NextResponse.json({ topics: results, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { topics: [], error: 'Failed to fetch news' },
      { status: 500 },
    );
  }
}

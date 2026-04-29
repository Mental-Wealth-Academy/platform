import { NextRequest, NextResponse } from 'next/server';
import { normalizeCommunityArticleUrl } from '@/lib/community-links';

export const revalidate = 1800;

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&apos;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function pickMeta(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match?.[1] ? decodeHtmlEntities(match[1]).trim() : null;
}

function buildSummary(description: string | null, paragraphs: string[]): string {
  const summaryParts: string[] = [];

  if (description) {
    summaryParts.push(description);
  }

  for (const paragraph of paragraphs) {
    if (summaryParts.join(' ').length > 440) break;
    if (!summaryParts.includes(paragraph)) {
      summaryParts.push(paragraph);
    }
  }

  return summaryParts
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 520);
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing article url' }, { status: 400 });
  }

  const canonicalUrl = normalizeCommunityArticleUrl(rawUrl);

  try {
    const response = await fetch(canonicalUrl, {
      headers: {
        'User-Agent': 'MentalWealthAcademy/1.0',
      },
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error(`Article fetch failed with status ${response.status}`);
    }

    const html = await response.text();
    const title =
      pickMeta(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"]+)["']/i) ??
      pickMeta(html, /<title[^>]*>([^<]+)<\/title>/i) ??
      'Article preview';
    const description =
      pickMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["']/i) ??
      pickMeta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"]+)["']/i);

    const articleHtml = html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html;
    const paragraphs = Array.from(articleHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
      .map((match) => stripHtml(match[1]))
      .filter((paragraph) => paragraph.length >= 110)
      .slice(0, 2);

    const summary = buildSummary(description, paragraphs);
    const hostname = new URL(canonicalUrl).hostname.replace(/^www\./, '');

    return NextResponse.json({
      canonicalUrl,
      title,
      source: hostname,
      summary: summary || description || `Open ${title} on ${hostname}.`,
      isRecovered: canonicalUrl !== rawUrl,
    });
  } catch (error) {
    console.error('Error building article preview:', error);

    return NextResponse.json({
      canonicalUrl,
      title: 'Article preview',
      source: new URL(canonicalUrl).hostname.replace(/^www\./, ''),
      summary: 'I could not summarize this article cleanly, but the destination link is ready if you want to continue.',
      isRecovered: canonicalUrl !== rawUrl,
    });
  }
}

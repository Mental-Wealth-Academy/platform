import { normalizeCommunityArticleUrl } from '@/lib/community-links';

export const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

export interface CommunityNewsItem {
  title: string;
  url: string;
  source: string;
  createdAt: string;
}

export interface CommunityNewsTopicResult {
  topic: string;
  color: string;
  items: CommunityNewsItem[];
}

export interface CommunityNewsReviewCandidate {
  source: string;
  url: string;
  reason: string;
}

export interface CommunityNewsReviewQueueEntry {
  topic: string;
  priority: 'low' | 'medium' | 'high';
  reason: string;
  freshItemCount: number;
  minimumFreshItems: number;
  freshestPublishedAt: string | null;
  activeSources: Array<{
    source: string;
    url: string;
    freshestPublishedAt: string | null;
    freshItemCount: number;
  }>;
  candidates: CommunityNewsReviewCandidate[];
}

interface FeedSource {
  source: string;
  url: string;
}

interface ReviewCandidate extends FeedSource {
  reason: string;
}

interface TopicConfig {
  topic: string;
  color: string;
  maxAgeDays: number;
  fallbackMaxAgeDays: number;
  minimumFreshItems: number;
  activeFeeds: FeedSource[];
  reviewCandidates: ReviewCandidate[];
}

const COMMUNITY_NEWS_TOPICS: TopicConfig[] = [
  {
    topic: 'Onchain Briefing',
    color: '#5168FF',
    maxAgeDays: 21,
    fallbackMaxAgeDays: 60,
    minimumFreshItems: 2,
    activeFeeds: [
      {
        url: 'https://api.paragraph.com/blogs/rss/%40ethdaily',
        source: 'ETH Daily',
      },
      {
        url: 'https://api.paragraph.com/blogs/rss/%40nouns',
        source: 'Nouns',
      },
      {
        url: 'https://api.paragraph.com/blogs/rss/%40yearn',
        source: 'Yearn',
      },
    ],
    reviewCandidates: [
      {
        url: 'https://www.citationneeded.news/feed',
        source: 'Citation Needed',
        reason: 'Fresh crypto and policy reporting to rotate in if governance coverage thins out.',
      },
    ],
  },
  {
    topic: 'DeSci',
    color: '#2FB7A0',
    maxAgeDays: 45,
    fallbackMaxAgeDays: 120,
    minimumFreshItems: 2,
    activeFeeds: [
      {
        url: 'https://medium.com/feed/tag/decentralized-science',
        source: 'Medium / DeSci',
      },
      {
        url: 'https://medium.com/feed/@descicolab',
        source: 'DeSciCoLab',
      },
      {
        url: 'https://valleydao.medium.com/feed',
        source: 'ValleyDAO',
      },
    ],
    reviewCandidates: [],
  },
  {
    topic: 'AI Systems',
    color: '#8a7dff',
    maxAgeDays: 45,
    fallbackMaxAgeDays: 90,
    minimumFreshItems: 2,
    activeFeeds: [
      {
        url: 'https://www.understandingai.org/feed',
        source: 'Understanding AI',
      },
      {
        url: 'https://www.oneusefulthing.org/feed',
        source: 'One Useful Thing',
      },
    ],
    reviewCandidates: [
      {
        url: 'https://medium.com/feed/@aiforhealthcare',
        source: 'AI for Healthcare',
        reason: 'Useful backup when the broader AI systems feed needs more applied-health coverage.',
      },
      {
        url: 'https://medium.com/feed/tag/ai-in-healthcare',
        source: 'Medium / AI in Healthcare',
        reason: 'High-volume candidate pool for manual review when we need fresh applied AI stories.',
      },
    ],
  },
  {
    topic: 'Internet Culture',
    color: '#E85D9F',
    maxAgeDays: 30,
    fallbackMaxAgeDays: 90,
    minimumFreshItems: 2,
    activeFeeds: [
      {
        url: 'https://www.usermag.co/feed',
        source: 'User Mag',
      },
      {
        url: 'https://www.platformer.news/rss/',
        source: 'Platformer',
      },
      {
        url: 'https://www.404media.co/rss/',
        source: '404 Media',
      },
    ],
    reviewCandidates: [],
  },
];

interface FeedHealth {
  source: string;
  url: string;
  freshestPublishedAt: string | null;
  freshItemCount: number;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&apos;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function extractXmlValue(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1] ? decodeXmlEntities(match[1]) : null;
}

function parseFeedItems(xml: string, source: string): CommunityNewsItem[] {
  return Array.from(xml.matchAll(/<item\b[\s\S]*?>([\s\S]*?)<\/item>/gi))
    .map((match) => {
      const block = match[1];
      const title = extractXmlValue(block, 'title');
      const rawUrl = extractXmlValue(block, 'link');
      const createdAt =
        extractXmlValue(block, 'pubDate') ??
        extractXmlValue(block, 'published') ??
        extractXmlValue(block, 'updated') ??
        extractXmlValue(block, 'atom:updated');

      if (!title || !rawUrl || !createdAt) {
        return null;
      }

      const normalizedUrl = normalizeCommunityArticleUrl(rawUrl);
      const createdAtTimestamp = Date.parse(createdAt);

      if (!Number.isFinite(createdAtTimestamp)) {
        return null;
      }

      return {
        title,
        url: normalizedUrl,
        source,
        createdAt: new Date(createdAtTimestamp).toISOString(),
      };
    })
    .filter((item): item is CommunityNewsItem => item !== null);
}

async function fetchFeedItems(feed: FeedSource): Promise<CommunityNewsItem[]> {
  try {
    const response = await fetch(feed.url, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'User-Agent': 'MentalWealthAcademy/1.0',
      },
      next: { revalidate: ONE_WEEK_IN_SECONDS },
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    return parseFeedItems(xml, feed.source);
  } catch {
    return [];
  }
}

function dedupeAndSort(items: CommunityNewsItem[]): CommunityNewsItem[] {
  const seen = new Set<string>();

  return items
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .filter((item) => {
      if (seen.has(item.url)) {
        return false;
      }

      seen.add(item.url);
      return true;
    });
}

function filterRecentItems(items: CommunityNewsItem[], maxAgeDays: number): CommunityNewsItem[] {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return items.filter((item) => Date.parse(item.createdAt) >= cutoff);
}

function getFreshestPublishedAt(items: CommunityNewsItem[]): string | null {
  if (items.length === 0) {
    return null;
  }

  return items
    .map((item) => Date.parse(item.createdAt))
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((a, b) => b - a)
    .map((timestamp) => new Date(timestamp).toISOString())[0] ?? null;
}

function buildReviewQueueEntry(
  topic: TopicConfig,
  freshItems: CommunityNewsItem[],
  feedHealth: FeedHealth[],
): CommunityNewsReviewQueueEntry | null {
  const freshestPublishedAt = getFreshestPublishedAt(freshItems);
  const isUnderfilled = freshItems.length < topic.minimumFreshItems;
  const hasCandidates = topic.reviewCandidates.length > 0;

  if (!isUnderfilled && !hasCandidates) {
    return null;
  }

  let priority: 'low' | 'medium' | 'high' = 'low';
  let reason = 'Healthy watchlist for future curation.';

  if (freshItems.length === 0) {
    priority = 'high';
    reason = 'No fresh stories cleared the active sources window.';
  } else if (isUnderfilled) {
    priority = 'medium';
    reason = 'Fresh story volume dropped below the weekly target.';
  }

  return {
    topic: topic.topic,
    priority,
    reason,
    freshItemCount: freshItems.length,
    minimumFreshItems: topic.minimumFreshItems,
    freshestPublishedAt,
    activeSources: feedHealth,
    candidates: topic.reviewCandidates.map((candidate) => ({
      source: candidate.source,
      url: candidate.url,
      reason: candidate.reason,
    })),
  };
}

export async function buildCommunityNewsDigest(): Promise<{
  topics: CommunityNewsTopicResult[];
  reviewQueue: CommunityNewsReviewQueueEntry[];
  fetchedAt: string;
  refreshCadence: 'weekly';
}> {
  const topicResults = await Promise.all(
    COMMUNITY_NEWS_TOPICS.map(async (topicConfig) => {
      const feedItems = await Promise.all(topicConfig.activeFeeds.map((feed) => fetchFeedItems(feed)));

      const feedHealth: FeedHealth[] = topicConfig.activeFeeds.map((feed, index) => {
        const items = feedItems[index] ?? [];
        const freshItems = filterRecentItems(items, topicConfig.maxAgeDays);

        return {
          source: feed.source,
          url: feed.url,
          freshestPublishedAt: getFreshestPublishedAt(items),
          freshItemCount: freshItems.length,
        };
      });

      const sortedItems = dedupeAndSort(feedItems.flat());
      const freshItems = filterRecentItems(sortedItems, topicConfig.maxAgeDays);
      const fallbackItems = freshItems.length > 0
        ? freshItems
        : filterRecentItems(sortedItems, topicConfig.fallbackMaxAgeDays);

      return {
        topic: topicConfig.topic,
        color: topicConfig.color,
        items: fallbackItems.slice(0, 3),
        reviewQueueEntry: buildReviewQueueEntry(topicConfig, freshItems, feedHealth),
      };
    }),
  );

  return {
    topics: topicResults.map(({ topic, color, items }) => ({
      topic,
      color,
      items,
    })),
    reviewQueue: topicResults
      .map(({ reviewQueueEntry }) => reviewQueueEntry)
      .filter((entry): entry is CommunityNewsReviewQueueEntry => entry !== null)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
    fetchedAt: new Date().toISOString(),
    refreshCadence: 'weekly',
  };
}

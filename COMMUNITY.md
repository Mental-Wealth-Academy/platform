# Community Page — Build Notes

## Overview
`/app/community/page.tsx` — the Decision Room. Governance, proposals, treasury, and news feed.

## Layout Structure
```
dashboardChrome
  dashboardMasthead       — top bar with brand, search, avatars
  dashboardTitleRow       — title + subtitle (no live badge)
  dashboardFilters        — pills: Treasury Cycle 01 / Proposal Status Active / Updated Live
  communityTopbar         — Community | Proposals tabs
  communityViewViewport
    overview tab
      reserveCard
        newsGrid          — 4 topic cards (DeSci, Blockchain, AI Health, Cyberculture)
        reserveInsightsGrid
          funding carousel (left)
          sentiment chart (right)
      overviewAngelSection
    proposals tab
      proposalsEntryButton
      TreasuryDisplay
      proposalsGrid / emptyState / errorState
```

## News Feed

### API Route
`/app/api/community/news/route.ts`

Source: Hacker News Algolia API — free, no auth required.
`https://hn.algolia.com/api/v1/search?query={query}&tags=story&hitsPerPage=6`

Revalidates every 30 minutes via Next.js `revalidate = 1800`.

Topics and queries:
| Topic       | Query                                      | Color   |
|-------------|---------------------------------------------|---------|
| DeSci       | `decentralized science DeSci`              | #5168FF |
| Blockchain  | `blockchain ethereum web3 crypto`          | #2FB7A0 |
| AI Health   | `artificial intelligence health medicine`  | #8a7dff |
| Cyberculture| `internet culture digital society`         | #E85D9F |

### Response Shape
```typescript
{
  topics: Array<{
    topic: string;
    color: string;
    items: Array<{
      title: string;
      url: string;
      source: string;    // domain, www. stripped
      createdAt: string; // ISO 8601
    }>;
  }>;
  fetchedAt: string;
}
```

### Client State
```typescript
const [newsTopics, setNewsTopics] = useState<NewsTopic[]>([]);
const [newsLoading, setNewsLoading] = useState(true);
```
Fetched in `useEffect` on mount, independent of proposal fetch.
If the feed fails or returns no stories, the UI now shows a full-width fallback card instead of leaving the news area blank.

## Removed Elements
- **Governance live badge** — `dashboardStatus` div in `dashboardTitleRow`. Removed entirely.
- **4 stats cards** — `reserveIntro` section (Treasury reserve, Treasury programmed, Community-backed, Awaiting review). Replaced by `newsGrid`.
- Unused variables removed: `approvedProposalsCount`, `pendingProposalsCount`, `treasuryAllocated`, `treasuryReserveBuffer`, `treasuryProgrammedPct`, `treasuryPulse`.

## CSS Classes Added (appended to page.module.css)
- `.newsGrid` — 4-column grid, 12px gap, collapses to 2-col then 1-col on mobile
- `.newsTopicCard` — card container, reuses reservePulseCard visual style
- `.newsTopicLabel` — eyebrow label, color set via prop (topic accent)
- `.newsTopicDivider` — separator line under label
- `.newsArticleList` — unstyled list
- `.newsArticleItem` — list item with bottom border
- `.newsArticleLink` — block-level anchor, full click target
- `.newsArticleTitle` — 2-line clamp
- `.newsArticleMeta` — source + time string
- `.newsLoadingGrid` — 4-placeholder skeleton grid

## Editorial Notes (per style guide)
- Topic labels: plain caps, no punctuation
- Article titles: display as-is from source (truncated to 2 lines)
- Source meta: `{domain} · {n}d ago` — factual, no flair
- No emojis, no highlight pills, no decorative copy

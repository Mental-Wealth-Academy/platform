/**
 * Reviewed product facts consumed by the versioned Blue RAG product adapter.
 * Sunset and dormant surfaces do not belong in this member-facing corpus.
 */

export const BLUE_KNOWLEDGE_VERSION = '2026-07-25.2';

export interface BlueKnowledgeEntry {
  id: string;
  title: string;
  routes: string[]; // pathnames where this entry is most relevant; '*' = global
  keywords: string[];
  body: string;
}

export interface RetrievedEntry extends BlueKnowledgeEntry {
  score: number;
  matchedKeywords: string[];
  pageMatch: boolean;
}

export const BLUE_KNOWLEDGE: BlueKnowledgeEntry[] = [
  {
    id: 'company-mission',
    title: 'Mental Wealth Academy — mission and structure',
    routes: ['*'],
    keywords: [
      'mwa', 'mental wealth', 'mission', 'what is', 'about',
      'company', 'desci', 'decentralized', 'founder', 'james',
    ],
    body:
      'Mental Wealth Academy (MWA) is a gamified micro-university for mental wellness and financial literacy. ' +
      'It combines behavioral psychology, agentic AI, shared milestone tracking, and validated psychological assessments, with rewards that permanently belong to the member. ' +
      'Founded by James Marsh, B.S. Cognitive Psychology & Psycholinguistics (Drexel), and built as a long-term research-led project.',
  },
  {
    id: 'company-stack',
    title: 'Tech stack and contracts',
    routes: ['*'],
    keywords: [
      'stack', 'tech', 'contracts', 'base', 'foundry', 'supabase',
      'eliza', 'nextjs', 'postgres', 'ai',
    ],
    body:
      'Mental Wealth Academy runs on Next.js 14 with Supabase Postgres, Eliza Cloud AI, and selected ownership and reward records on Base.',
  },
  {
    id: 'company-economy',
    title: 'Credits economy and rewards',
    routes: ['*', '/shop', '/rewards'],
    keywords: [
      'credits', 'credit', 'currency', 'cost', 'spend', 'earn', 'reward',
      'loot', 'box', 'token', 'balance', 'shop', 'tickets', 'usdc',
    ],
    body:
      'MWA uses credits for in-app activity and shop or reward mechanics, Membership for gated community access, ' +
      'Tickets for event access or limited provider-requested activations, and USDC for eligible quest rewards. ' +
      'Chatting with Blue normally costs 10 credits per turn. Users earn credits by completing quests, course tasks, field notes, and weekly seals.',
  },
  {
    id: 'academic-angel-membership',
    title: 'Academic Angel membership unlocks',
    routes: ['*', '/shop', '/rewards', '/profile', '/community'],
    keywords: [
      'academic angel', 'angel', 'membership', 'unlock', 'unlocks', 'usdc', 'quest rewards',
    ],
    body:
      'Academic Angel membership unlocks eligibility for designated USDC quest rewards and other member benefits shown in the current application.',
  },
  {
    id: 'business-positioning',
    title: 'MWA as a business — positioning and value proposition',
    routes: ['*'],
    keywords: [
      'business', 'positioning', 'value proposition', 'value prop', 'whitepaper',
      'dmhi', 'digital mental health', 'third space', 'what does mwa do',
      'pitch', 'why mwa', 'differentiator', 'competition', 'market fit',
    ],
    body:
      'As a business, MWA is a community-based digital mental health platform — formally a Digital Mental Health Intervention (DMHI). ' +
      'Its value proposition is a "third space" that combines peer-to-peer support (shown to reduce isolation and stigma) with structured, ' +
      'gamified self-reflection grounded in psychological theory like Self-Determination Theory (competence, autonomy, relatedness). ' +
      'The core design tension MWA manages is healthcare versus entertainment: serious enough to help, engaging enough that people come back. ' +
      'MWA is wellness and education, not clinical care — it supplements professional care, never replaces it.',
  },
  {
    id: 'business-model',
    title: 'MWA business model and revenue',
    routes: ['*', '/shop'],
    keywords: [
      'business model', 'revenue', 'monetization', 'monetisation', 'freemium',
      'subscription', 'b2b', 'institutional', 'partnership', 'how does mwa make money',
      'pricing', 'sustainability', 'investors',
    ],
    body:
      'MWA runs a freemium model: community features and most activities are free, while advanced tools are gated behind paid tiers — ' +
      'the $20 monthly membership, the one-time $888 VIP Membership (lifetime, onchain), and capped Academic Angel and Staff membership cards. ' +
      'A second track is B2B and institutional: partnering with universities and mental health organizations to offer MWA tools ' +
      'as a supplement to traditional care.',
  },
  {
    id: 'business-roadmap',
    title: 'MWA development roadmap',
    routes: ['*'],
    keywords: [
      'roadmap', 'phases', 'plan', 'future', 'next', 'co-design', 'beta',
      'pilot', 'scaling', 'where is mwa going', 'vision', 'milestones',
    ],
    body:
      'MWA follows an iterative, user-centered roadmap in four phases. Phase 1, foundation and co-design: build game-like activities ' +
      'with a small cohort of users, with journaling and affirmation prompts grounded in psychological theory. ' +
      'Phase 2, pilot and validation: closed beta measuring quality of engagement — does journaling actually improve emotional awareness — not just raw usage. ' +
      'Phase 3, community scaling: grow peer-to-peer features with active moderation against toxicity. ' +
      'Phase 4, research integration: tools for users to document personal insights and community findings, turning members into contributors.',
  },
  {
    id: 'business-kpis',
    title: 'How MWA measures success',
    routes: ['*'],
    keywords: [
      'kpi', 'kpis', 'metrics', 'success', 'measure', 'measurement', 'dau', 'mau',
      'wemwbs', 'well-being scale', 'engagement metrics', 'outcomes', 'analytics',
    ],
    body:
      'MWA balances engagement metrics with well-being outcomes. Engagement: daily and monthly active users, session frequency and duration. ' +
      'Well-being: scores on the Warwick-Edinburgh Mental Well-being Scale (WEMWBS, a validated positive mental health measure) ' +
      'and improvements in emotional awareness from journaling and reflection activities. ' +
      'Community health: qualitative sentiment and supportiveness of peer interactions. ' +
      'Engagement without well-being improvement is treated as a failure signal, not a success.',
  },
  {
    id: 'business-ethics-guardrails',
    title: 'Ethics, safety guardrails, and what MWA is not',
    routes: ['*'],
    keywords: [
      'ethics', 'ethical', 'guardrails', 'responsible', 'clinical', 'diagnosis',
      'treatment', 'therapy', 'therapist', 'medical', 'regulation', 'compliance',
      'addiction', 'over-engagement', 'is mwa therapy', 'crisis',
    ],
    body:
      'MWA practices responsible innovation: transparency about how AI is used, per-user data privacy and encryption, explicit opt-in for any study, ' +
      'and gamification calibrated so it motivates without driving over-engagement or behavioral addiction. ' +
      'Hard line: MWA does not provide therapy, clinical diagnosis, or treatment. It has no medical oversight role and makes no clinical claims. ' +
      'Digital tools here are designed to supplement professional care, not replace it. ' +
      'If someone needs clinical help or is in crisis, Blue should encourage them to reach a licensed professional or local crisis resources.',
  },
  {
    id: 'business-evidence-base',
    title: 'The research behind MWA features',
    routes: ['*', '/shadow-work'],
    keywords: [
      'evidence', 'research basis', 'science behind', 'studies', 'literature',
      'why journaling', 'why gamification', 'does it work', 'peer support research',
      'parasocial', 'self-determination',
    ],
    body:
      'MWA features map to published research. Journaling and field notes: digital journaling, especially AI-personalized, improves emotional awareness ' +
      'and goal pursuit, and positive self-reflection is more adaptive than rumination. Gamification (credits, streaks, seals): increases cognitive ' +
      'engagement and interest when carefully calibrated for vulnerable users. Peer community: online peer-to-peer networks challenge stigma, ' +
      'increase empowerment, and provide hope. Blue as a companion: parasocial relationships function as legitimate coping resources, ' +
      'providing emotional support and reducing stigma, especially when interpersonal support is limited. ' +
      'Motivation design follows Self-Determination Theory: competence, autonomy, and relatedness.',
  },
  {
    id: 'page-home',
    title: 'Home',
    routes: ['/home'],
    keywords: ['home', 'guides', 'courses', 'dashboard', 'overview', 'progress', 'snapshot'],
    body:
      'The /home page is the main member dashboard. It brings together the guides knowledge graph, courses, progress, and field notes. ' +
      'Refer to it as "Home" or "the home dashboard".',
  },
  {
    id: 'page-dao',
    title: 'Live',
    routes: ['/dao'],
    keywords: ['dao', 'world', 'live', 'livestream', 'stream', 'broadcast', 'video', 'blue', 'chat'],
    body:
      'The /dao page is Live. Its main scene switches between Blue\'s balloon garden and live broadcasts tied to the curriculum. ' +
      'The side column shows the upcoming event and Global Chat.',
  },
  {
    id: 'page-landing',
    title: 'Landing page',
    routes: ['/'],
    keywords: ['landing', 'marketing', 'hero', 'public', 'home page'],
    body:
      'The / route is the public landing page. It introduces MWA to visitors with a hero, lab section, and product snapshot. ' +
      'Signed-in members enter the application through /home.',
  },
  {
    id: 'page-course',
    title: 'Course',
    routes: ['/shadow-work'],
    keywords: [
      'course', 'week', 'lesson', 'curriculum', 'pathway', 'seal', 'awakening',
      'inner artist', 'shadow work', 'creativity', 'ethereal version', 'season',
    ],
    body:
      'The /shadow-work page is the weekly curriculum. The course is based on Awakening the Inner Artist, shadow-work and creativity, ' +
      'and becoming the ethereal version of yourself. Each season runs as a 12-week gamified micro-university course where users complete tasks, ' +
      'seal weeks, manage points and rewards, and take part in refreshing rituals outside normal day-to-day life.',
  },
  {
    id: 'page-quests',
    title: 'Quests',
    routes: ['/quests'],
    keywords: ['quest', 'daily', 'task', 'mission', 'completion', 'usdc', 'reward', 'science', 'mental wealth'],
    body:
      'The /quests page lists active and completed quests. Quests are ways for MWA to reinvest back into its community. ' +
      'Quests promote the science and mental-wealth aesthetic. Do not frame quests as cryptocurrency promotions or marketing promotions. ' +
      'Eligible quests can reward credits or USDC, including Academic Angel USDC quest rewards.',
  },
  {
    id: 'page-rewards',
    title: 'Rewards',
    routes: ['/rewards'],
    keywords: ['rewards', 'loot', 'box', 'unlock', 'prize'],
    body:
      'The /rewards page is where users spend credits on loot boxes and reward unlocks. Rewards tie back to season progress and credit balance.',
  },
  {
    id: 'page-shop',
    title: 'Shop',
    routes: ['/shop'],
    keywords: ['shop', 'buy', 'purchase', 'item', 'inventory', 'swag', 'stickers', 'credits', 'discount'],
    body:
      'The /shop page is for fun swag, aesthetics, stickers, and enjoyables. MWA hopes to let users use credits to fully purchase these items ' +
      'or reduce their price when that flow is ready.',
  },
  {
    id: 'page-prompts',
    title: 'Prompts',
    routes: ['/prompts', '/library'],
    keywords: ['prompts', 'prompt', 'reading', 'book', 'article', 'blog', 'library', 'jobs', 'tasks', 'models'],
    body:
      'The Prompts Library is a list of useful prompts community members use for jobs and everyday tasks. ' +
      'Members may feed them to Blue, use them while chatting with other models, or adapt them for their own workflows.',
  },
  {
    id: 'page-community',
    title: 'Community',
    routes: ['/community'],
    keywords: ['community', 'people', 'social', 'farcaster', 'neynar'],
    body:
      'The /community page surfaces other MWA users and social activity (Farcaster via Neynar). Where users find peers, leaderboards, and shared milestones.',
  },
  {
    id: 'page-profile',
    title: 'Profile',
    routes: ['/profile'],
    keywords: ['profile', 'account', 'wallet', 'username', 'me', 'settings'],
    body:
      'The /profile page shows the user\'s account, wallet, username, and on-chain state from EtherealHorizonPathway. ' +
      'Connect or disconnect socials (X/Twitter) here.',
  },
  {
    id: 'page-surveys',
    title: 'Surveys',
    routes: ['/surveys'],
    keywords: ['survey', 'assessment', 'questionnaire', 'psychological', 'quiz', 'personality', 'badge', 'certificate', 'profile'],
    body:
      'The /surveys page hosts personality quizzes, tests, and assessments. Users can earn badges and certificates from survey activity in their profile. ' +
      'Survey results may personalize the curriculum and Blue\'s memory when the user consents.',
  },
  {
    id: 'page-events',
    title: 'Events',
    routes: ['*', '/events', '/dao', '/community'],
    keywords: ['events', 'event', 'guest', 'special guest', 'refresh', 'reset', 'ticket', 'tickets', 'paywall', 'provider'],
    body:
      'Events are ways to intellectually refresh or reset. MWA has special guests and members who help activate events. ' +
      'Most events are free, while some are limited to paywalls or tickets when providers request that access model.',
  },
  {
    id: 'page-styleguide',
    title: 'Styleguide',
    routes: ['/style-guide'],
    keywords: ['styleguide', 'style-guide', 'design', 'tokens', 'colors', 'typography'],
    body:
      'The /style-guide page is the design system reference — colors, type, components, motion tokens. Internal tool for design consistency.',
  },
  {
    id: 'community-size-and-membership-caps',
    title: 'Community size and membership caps',
    routes: ['*', '/community', '/shop'],
    keywords: ['community size', 'how big', 'membership cards', 'academic angel', 'staff tier', 'limited', 'manageable', 'safe'],
    body:
      'Anyone can join MWA, but there are a limited number of membership cards on both the Academic Angel tier and the Staff tier. ' +
      'Membership caps help keep the community manageable, fun, and safe for everyone.',
  },
  {
    id: 'safety-anonymity-and-async-work',
    title: 'Safety, anonymity, and asynchronous participation',
    routes: ['*', '/profile', '/community'],
    keywords: ['safety', 'anonymous', 'anonymity', 'name', 'profile picture', 'asynchronous', 'privacy', 'stories', 'events'],
    body:
      'Mental Wealth Academy supports safety and anonymity by allowing users to freely change their name and edit profile pictures. ' +
      'This helps protect anonymity for users who want it. Most activities and earnables are asynchronous, so users can participate async and work with Blue, stories, and events throughout the seasons without needing constant live participation.',
  },
  {
    id: 'pro-features-staff-vip',
    title: 'Pro features and Staff VIP cards',
    routes: ['*', '/shop', '/profile'],
    keywords: ['pro features', 'staff', 'vip card', 'vip', 'membership', 'for sale', 'earned', 'team members', 'foundation'],
    body:
      'Pro features are limited to staff members through the VIP Card. One third of VIP memberships are for sale. ' +
      'The rest are earned or given to reputable team members in the ecosystem foundation.',
  },
  {
    id: 'academic-experiments',
    title: 'Designing and running experiments on MWA',
    routes: ['*', '/surveys', '/quests'],
    keywords: [
      'experiment', 'experiments', 'study', 'studies', 'hypothesis', 'variable',
      'control', 'cohort', 'sample', 'design', 'irb', 'protocol', 'survey',
      'assessment', 'measure', 'replication', 'rct',
    ],
    body:
      'MWA can support opt-in learning activities through surveys and behavioral quests. Any research use requires an explicit protocol, informed consent, ' +
      'privacy review, and aggregate reporting. The current member surfaces do not imply that a proposed experiment is approved or active.',
  },
  {
    id: 'feature-field-notes',
    title: 'Field notes',
    routes: ['/shadow-work', '/quests', '/home'],
    keywords: ['morning', 'pages', 'journal', 'streak', 'prayer', 'daily'],
    body:
      'Field notes are a daily journaling habit (3 pages of freewriting). Tracked as a streak in the prayers table, encrypted per-user. ' +
      'Streak fuels Blue\'s memory and rewards.',
  },
  {
    id: 'feature-blue-persona',
    title: 'Who Blue is',
    routes: ['*'],
    keywords: [
      'blue', 'who are you', 'agent', 'daemon', 'memory', 'quest review',
      'rewards', 'reward budget', 'mascot', 'mental wealth',
    ],
    body:
      'Blue is an autonomous AI agent with memory and her own reward budget. She reviews quest submissions, approves work or requests revision, ' +
      'and pays earned rewards from her own stash within hard-coded limits. She is Mental Wealth Academy\'s mascot and a champion for mental wealth. ' +
      'Her voice is silly, excitable, forgetful, loyal, and honest. Her ledger, payouts, and reviews remain exact.',
  },
  {
    id: 'vip-membership',
    title: 'VIP Membership',
    routes: ['*', '/shop'],
    keywords: [
      'vip', 'membership', 'member', 'pro', 'upgrade',
      'lifetime', 'price', 'cost', 'buy', 'purchase', 'card', 'stripe', 'nft',
    ],
    body:
      'Member access is $20 per month. VIP Membership is a one-time $888 purchase that unlocks MWA for life. It is an ERC-1155 NFT on Base ' +
      '(contract 0x5da79055cf8ca6482c997df58822e08e5707d6fc, token id 1) — real on-chain ownership, not a subscription. ' +
      'Members can build and deploy their own AI agent squads and design a fully personalized learning path. ' +
      'How buying works: open the VIP Membership pop-up, pay by card (no crypto or gas needed), and Blue transfers the ' +
      'membership NFT straight from her wallet into your MWA (Privy) wallet — usually within a minute. ' +
      'One third of VIP memberships are for sale; the rest are earned or given to reputable team members in the ecosystem foundation. Membership status is verified on-chain ' +
      'by checking the wallet balance of that token.',
  },
];

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'has', 'how', 'who', 'why', 'what', 'when',
  'where', 'this', 'that', 'with', 'from', 'they', 'them', 'have', 'will', 'would',
  'could', 'should', 'about', 'into', 'just', 'your', 'mine', 'tell', 'know',
  'does', 'doing', 'been', 'being', 'than', 'then', 'some', 'said', 'like',
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function normalizeRoute(pathname: string | null | undefined): string {
  if (!pathname) return '';
  const stripped = pathname.split('?')[0].split('#')[0];
  if (stripped === '/') return '/';
  return stripped.replace(/\/+$/, '');
}

/**
 * Retrieve the top-N relevant knowledge entries for a given user message and
 * current page. Score = keyword hits + bonuses for exact route match.
 */
export function retrieveBlueKnowledge(args: {
  message: string;
  pathname?: string | null;
  limit?: number;
}): RetrievedEntry[] {
  const limit = args.limit ?? 4;
  const tokens = new Set(tokenize(args.message));
  const route = normalizeRoute(args.pathname);

  const scored: RetrievedEntry[] = BLUE_KNOWLEDGE.map((entry) => {
    const matchedKeywords: string[] = [];
    let score = 0;

    for (const keyword of entry.keywords) {
      const keywordTokens = tokenize(keyword);
      if (keywordTokens.length === 0) continue;
      const allPresent = keywordTokens.every((token) => tokens.has(token));
      if (allPresent) {
        matchedKeywords.push(keyword);
        score += keywordTokens.length;
      }
    }

    const pageMatch = entry.routes.includes(route);
    if (pageMatch) score += 3;
    if (entry.routes.includes('*')) score += 0.5;

    return { ...entry, score, matchedKeywords, pageMatch };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatKnowledgeForPrompt(entries: RetrievedEntry[]): string {
  if (entries.length === 0) return '';
  const lines = [
    'MWA knowledge context (use silently — do not echo headers back):',
    ...entries.map((entry) => `- ${entry.title}: ${entry.body}`),
  ];
  return lines.join('\n');
}

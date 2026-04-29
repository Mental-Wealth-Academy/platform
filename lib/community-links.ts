const COMMUNITY_ARTICLE_REDIRECTS: Record<string, string> = {
  'https://principiaorphica.substack.com/p/a-use-case-for-crypto-decentralized':
    'https://blog.startuppirate.com/p/a-use-case-for-crypto-decentralized',
  'https://www.principiaorphica.substack.com/p/a-use-case-for-crypto-decentralized':
    'https://blog.startuppirate.com/p/a-use-case-for-crypto-decentralized',
  'https://startuppirate.substack.com/p/a-use-case-for-crypto-decentralized':
    'https://blog.startuppirate.com/p/a-use-case-for-crypto-decentralized',
  'https://www.startuppirate.substack.com/p/a-use-case-for-crypto-decentralized':
    'https://blog.startuppirate.com/p/a-use-case-for-crypto-decentralized',
};

export function normalizeCommunityArticleUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const normalized = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`.replace(/\/$/, '');
    return COMMUNITY_ARTICLE_REDIRECTS[normalized] ?? rawUrl;
  } catch {
    return rawUrl;
  }
}

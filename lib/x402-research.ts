import { x402Client } from '@x402/core/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { toClientEvmSigner } from '@x402/evm';
import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { encode } from '@toon-format/toon';

const BAZAAR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources';

// ── Types ──────────────────────────────────────────────────

export interface DiscoveredSource {
  id: string;
  url: string;
  title: string;
  description: string;
  price: string;       // human-readable, e.g. "$0.01"
  priceUsdc: number;   // numeric USDC amount
}

export interface FetchedContent {
  id: string;
  title: string;
  content: string;
}

// ── x402 client (lazy singleton) ───────────────────────────

let paidFetch: typeof fetch | null = null;

function getPaidFetch(): typeof fetch {
  if (paidFetch) return paidFetch;

  const pk = process.env.BLUE_PRIVATE_KEY;
  if (!pk) throw new Error('BLUE_PRIVATE_KEY required for x402 research');

  const account = privateKeyToAccount(pk as `0x${string}`);
  const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL),
  });

  const signer = toClientEvmSigner(account, publicClient);
  const client = new x402Client();
  client.register('eip155:*', new ExactEvmScheme(signer));

  paidFetch = wrapFetchWithPayment(fetch, client);
  return paidFetch;
}

export function getPayToAddress(): string {
  const pk = process.env.BLUE_PRIVATE_KEY;
  if (!pk) return '0x0920553CcA188871b146ee79f562B4Af46aB4f8a';
  return privateKeyToAccount(pk as `0x${string}`).address;
}

// ── Discovery (metadata only, no payment) ──────────────────

function parsePrice(raw?: string): { display: string; usdc: number } {
  if (!raw) return { display: '$0.01', usdc: 0.01 };
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return {
    display: raw.startsWith('$') ? raw : `$${num.toFixed(2)}`,
    usdc: isNaN(num) ? 0.01 : num,
  };
}

export async function discoverSources(topic: string): Promise<DiscoveredSource[]> {
  try {
    const res = await fetch(`${BAZAAR_URL}?q=${encodeURIComponent(topic)}&limit=6`);
    if (!res.ok) return [];
    const data = await res.json();
    const raw = (data.resources || data.results || []).slice(0, 3);

    return raw.map((r: Record<string, string>, i: number) => {
      const { display, usdc } = parsePrice(r.price);
      return {
        id: `src-${i}`,
        url: r.url || '',
        title: r.title || r.name || `Source ${i + 1}`,
        description: r.description || '',
        price: display,
        priceUsdc: usdc,
      };
    });
  } catch (err) {
    console.warn('Bazaar discovery failed:', err);
    return [];
  }
}

// ── Fetch selected sources (x402 paid) ─────────────────────

export async function fetchSelectedSources(
  sources: { id: string; url: string; title: string }[]
): Promise<FetchedContent[]> {
  const payFetch = getPaidFetch();
  const results: FetchedContent[] = [];

  const fetches = sources.map(async (source) => {
    try {
      const res = await payFetch(source.url, {
        headers: { 'Accept': 'application/json, text/plain' },
      });
      if (!res.ok) return;

      const ct = res.headers.get('content-type') || '';
      let content: string;
      if (ct.includes('json')) {
        const json = await res.json();
        content = json.content || json.text || json.abstract || json.summary || JSON.stringify(json);
      } else {
        content = await res.text();
      }

      if (content && content.length > 20) {
        results.push({
          id: source.id,
          title: source.title,
          content: content.slice(0, 3000),
        });
      }
    } catch {
      // source unavailable or payment failed
    }
  });

  await Promise.allSettled(fetches);
  return results;
}

// ── TOON encoding for token-efficient LLM context ──────────

export function encodeForLLM(sources: FetchedContent[]): string {
  if (sources.length === 0) return '';
  try {
    return encode({ sources });
  } catch {
    // fallback to compact text if TOON fails
    return sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.content}`).join('\n\n');
  }
}

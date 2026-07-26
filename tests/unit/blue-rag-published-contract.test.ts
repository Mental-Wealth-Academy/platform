import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Blue RAG published-guide contract', () => {
  it('revalidates guide status and revision in both database channels', () => {
    const graph = readRepoFile('lib/blue-rag-graph.ts');

    expect(graph.match(/current_guide\.status = 'published'/g)).toHaveLength(2);
    expect(
      graph.match(
        /current_guide\.updated_at::text = s\.metadata->>'guideUpdatedAt'/g,
      ),
    ).toHaveLength(2);
    expect(graph).toContain('getPublishedGuideStateStamp');
  });

  it('versions guide revisions and seeds the manifest on production deploys', () => {
    const index = readRepoFile('lib/blue-rag-index.ts');
    const vercel = readRepoFile('vercel.json');

    expect(index).toContain('guideUpdatedAt: row.updated_at');
    expect(index).toContain('adapterVersions.get(GUIDE_ADAPTER_ID)');
    expect(vercel).toContain('npm run seed:blue-rag:deploy');
  });
});

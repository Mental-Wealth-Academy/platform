import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('paid Blue turn idempotency', () => {
  it('stores a stable request id and one result per paid receipt', () => {
    const ledger = readRepoFile('lib/diamond-burns.ts');
    const migration = readRepoFile(
      'supabase/migrations/20260725123000_chat_burn_idempotency.sql',
    );

    expect(ledger).toContain('request_id');
    expect(ledger).toContain('payload_hash');
    expect(ledger).toContain('response_text');
    expect(ledger).toContain("status = 'completed'");
    expect(migration).toContain('diamond_burns_request_id_unique');
    expect(migration).toContain('(user_id, purpose, request_id)');
  });

  it('scopes replay lookup to the authenticated member and purpose', () => {
    const ledger = readRepoFile('lib/diamond-burns.ts');
    const replayLookup = ledger.slice(
      ledger.indexOf('export async function getDiamondBurnResult'),
      ledger.indexOf('export async function reclaimDiamondBurnReservation'),
    );

    expect(replayLookup).toContain('AND user_id = :userId');
    expect(replayLookup).toContain('AND purpose = :purpose');
  });

  it('uses an atomic lease before regenerating a crashed request', () => {
    const ledger = readRepoFile('lib/diamond-burns.ts');
    const reclaim = ledger.slice(
      ledger.indexOf('export async function reclaimDiamondBurnReservation'),
      ledger.indexOf('export async function completeDiamondBurn'),
    );

    expect(reclaim).toContain("status = 'reserved'");
    expect(reclaim).toContain('AND request_id = :requestId');
    expect(reclaim).toContain('AND payload_hash = :payloadHash');
    expect(reclaim).toContain('lease_expires_at <= CURRENT_TIMESTAMP');
    expect(reclaim).toContain('RETURNING tx_hash');
    expect(reclaim).not.toContain("status = 'output_started'");
  });

  it('durably consumes the receipt before output and never releases it afterward', () => {
    const ledger = readRepoFile('lib/diamond-burns.ts');
    const outputStarted = ledger.slice(
      ledger.indexOf('export async function markDiamondBurnOutputStarted'),
      ledger.indexOf('export async function reclaimDiamondBurnReservation'),
    );
    const release = ledger.slice(ledger.indexOf('export async function releaseDiamondBurn'));

    expect(outputStarted).toContain("SET status = 'output_started'");
    expect(outputStarted).toContain("AND status = 'reserved'");
    expect(outputStarted).toContain('AND request_id = :requestId');
    expect(outputStarted).toContain('AND payload_hash = :payloadHash');
    expect(outputStarted).toContain('response_text = :responsePrefix');
    expect(release).toContain("AND status = 'reserved'");
    expect(release).not.toContain('output_started');
  });
});

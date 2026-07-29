import { describe, expect, it } from 'vitest';
import { calculateTreasuryValueUsdc } from '@/lib/treasury-snapshot';

describe('treasury USDC valuation', () => {
  it('adds native ETH, cbBTC, and USDC holdings at their USDC quotes', () => {
    const value = calculateTreasuryValueUsdc({
      nativeAmount: 0.003,
      cbBtcAmount: 0.0001,
      usdcAmount: 25,
      nativeInUsdc: 3_500,
      bitcoinInUsdc: 100_000,
    });

    expect(value).toBe(45.5);
  });

  it('accepts an empty treasury', () => {
    expect(calculateTreasuryValueUsdc({
      nativeAmount: 0,
      cbBtcAmount: 0,
      usdcAmount: 0,
      nativeInUsdc: 3_500,
      bitcoinInUsdc: 100_000,
    })).toBe(0);
  });

  it.each([
    { nativeAmount: -1 },
    { cbBtcAmount: Number.NaN },
    { usdcAmount: Number.POSITIVE_INFINITY },
    { nativeInUsdc: -1 },
    { bitcoinInUsdc: Number.NEGATIVE_INFINITY },
  ])('rejects invalid valuation input: %o', (invalid) => {
    expect(() => calculateTreasuryValueUsdc({
      nativeAmount: 0,
      cbBtcAmount: 0,
      usdcAmount: 0,
      nativeInUsdc: 3_500,
      bitcoinInUsdc: 100_000,
      ...invalid,
    })).toThrow('finite, non-negative');
  });
});

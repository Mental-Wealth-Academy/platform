'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, erc20Abi } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { getChainConfig } from '@/lib/chain-config';

export interface OnchainBalances {
  diamonds: string | null;
  btc: string | null;
  btcUsd: string | null;
  usdc: string | null;
  hasBtc: boolean;
  netLabel: string;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

let cachedBtcPrice: { usd: number; ts: number } | null = null;

async function getBtcUsdPrice(): Promise<number | null> {
  if (cachedBtcPrice && Date.now() - cachedBtcPrice.ts < 60_000) {
    return cachedBtcPrice.usd;
  }
  try {
    const res = await fetch('/api/treasury/prices');
    if (!res.ok) return cachedBtcPrice?.usd ?? null;
    const data = await res.json();
    if (Array.isArray(data)) {
      const btc = data.find((c: { id?: string; symbol?: string }) => c.id === 'bitcoin' || c.symbol === 'BTC');
      if (btc && typeof btc.usd === 'number' && btc.usd > 0) {
        cachedBtcPrice = { usd: btc.usd, ts: Date.now() };
        return btc.usd;
      }
    }
  } catch {
    // silent
  }
  return cachedBtcPrice?.usd ?? null;
}

function formatBtcUsd(amount: number, price: number | null): string {
  if (amount === 0) return '$0.00';
  if (!price || price <= 0) {
    return amount < 0.0001 ? '<$0.01' : `$${(amount * 80_000).toFixed(2)}`;
  }
  const usdVal = amount * price;
  if (usdVal === 0) return '$0.00';
  if (usdVal < 0.01) return '<$0.01';
  return (
    '$' +
    usdVal.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function useOnchainBalances(address: string | undefined, enabled = true): OnchainBalances {
  const [diamonds, setDiamonds] = useState<string | null>(null);
  const [btc, setBtc] = useState<string | null>(null);
  const [btcUsd, setBtcUsd] = useState<string | null>(null);
  const [usdc, setUsdc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cfg = getChainConfig();
  const hasBtc = Boolean(cfg.cbBTcAddress);
  const netLabel = cfg.chainId === 84532 ? 'Base Sepolia' : 'Base';

  const refetch = useCallback(async () => {
    if (!address || !enabled) return;
    setIsLoading(true);
    const chain = cfg.chainId === 84532 ? baseSepolia : base;
    const client = createPublicClient({ chain, transport: http(cfg.rpcUrl) });
    try {
      const a = address as `0x${string}`;

      const balanceOf = (token: string) => ({
        address: token as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf' as const,
        args: [a] as const,
      });

      const [diamondsR, usdcR, btcR] = await client.multicall({
        contracts: [
          balanceOf(cfg.diamondsTokenAddress),
          balanceOf(cfg.usdcAddress),
          ...(cfg.cbBTcAddress ? [balanceOf(cfg.cbBTcAddress)] : []),
        ],
        allowFailure: true,
      });

      if (diamondsR.status === 'success') {
        const d = Number(diamondsR.result) / 1e18;
        setDiamonds(d < 1 ? d.toFixed(2) : Math.floor(d).toLocaleString());
      }
      if (usdcR.status === 'success') {
        setUsdc(
          (Number(usdcR.result) / 1e6).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        );
      }
      if (btcR && btcR.status === 'success') {
        const rawAmount = Number(btcR.result) / 1e8;
        setBtc(rawAmount.toFixed(8));
        const price = await getBtcUsdPrice();
        setBtcUsd(formatBtcUsd(rawAmount, price));
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [address, enabled, cfg.chainId, cfg.rpcUrl, cfg.diamondsTokenAddress, cfg.usdcAddress, cfg.cbBTcAddress]);

  useEffect(() => {
    if (enabled && address) {
      void refetch();
    } else if (!enabled) {
      setDiamonds(null);
      setBtc(null);
      setBtcUsd(null);
      setUsdc(null);
    }
  }, [enabled, address, refetch]);

  // Re-fetch on balance update events
  useEffect(() => {
    if (!enabled || !address) return;
    const handleUpdate = () => void refetch();
    window.addEventListener('shardsUpdated', handleUpdate);
    window.addEventListener('vipMembershipUpdated', handleUpdate);
    return () => {
      window.removeEventListener('shardsUpdated', handleUpdate);
      window.removeEventListener('vipMembershipUpdated', handleUpdate);
    };
  }, [enabled, address, refetch]);

  return {
    diamonds,
    btc,
    btcUsd,
    usdc,
    hasBtc,
    netLabel,
    isLoading,
    refetch,
  };
}

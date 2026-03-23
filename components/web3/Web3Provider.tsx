'use client';

import React, { useMemo } from 'react';
import { WagmiProvider, createConfig, http, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

// Lazy-create config only when Web3Provider is actually rendered
let wagmiConfig: ReturnType<typeof createConfig> | null = null;
let queryClientInstance: QueryClient | null = null;

// Custom storage that doesn't persist - prevents auto-reconnect on page load
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function getWagmiConfig() {
  if (!wagmiConfig) {
    const defaultConfig = getDefaultConfig({
      // Your dApps chains
      chains: [base],
      transports: {
        // RPC URL for each chain
        [base.id]: http(
          process.env.NEXT_PUBLIC_ALCHEMY_ID
            ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
            : 'https://mainnet.base.org',
        ),
      },

      // Required API Keys
      walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',

      // Required App Info
      appName: "Mental Wealth Academy",

      // Optional App Info
      appDescription: "Mental Wealth Academy - A platform for mental health and wellness",
      appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://mentalwealth.academy',
      appIcon: typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : 'https://mentalwealth.academy/favicon.ico',
    });
    
    // Override storage to prevent auto-reconnect
    wagmiConfig = createConfig({
      ...defaultConfig,
      connectors: [
        ...defaultConfig.connectors ?? [],
        // Phantom wallet (EVM mode) — appears as a named option in the modal
        injected({
          target: {
            id: 'phantom',
            name: 'Phantom',
            icon: 'https://phantom.com/img/phantom-icon-purple.svg',
            provider: typeof window !== 'undefined'
              ? (window as unknown as Record<string, any>).phantom?.ethereum
              : undefined,
          },
        }),
      ],
      storage: createStorage({ storage: noopStorage }),
      ssr: true,
    });
  }
  return wagmiConfig;
}

function getQueryClient() {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient();
  }
  return queryClientInstance;
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => getWagmiConfig(), []);
  const queryClient = useMemo(() => getQueryClient(), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="rounded" options={{ initialChainId: base.id }}>
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

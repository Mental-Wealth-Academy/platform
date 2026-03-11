/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable static page generation and prefetching
  experimental: {
    optimizePackageImports: ['connectkit', 'wagmi'],
  },
  // SECURITY: Add security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          // Allow framing for mini app context (Base/Farcaster)
          // X-Frame-Options is removed to allow iframe embedding
          // Security is maintained via Content-Security-Policy frame-ancestors
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.mentalwealthacademy.world https://mentalwealthacademy.world https://www.mentalwealthacademy.world https://base.dev https://www.base.dev https://*.base.dev https://base.org https://www.base.org https://*.base.org https://farcaster.xyz https://www.farcaster.xyz https://*.farcaster.xyz https://warpcast.com https://www.warpcast.com https://*.warpcast.com;"
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
          },
        ],
      },
    ];
  },
  // Proxy external resources to avoid CORS issues
  async rewrites() {
    return [
      {
        source: '/api/proxy/snpedia-db',
        destination: 'https://static.snpbrowser.com/snpedia.db',
      },
    ];
  },
  // Suppress preload warnings for resources that may not be immediately used
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Optimize compilation
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'cdn.builder.io' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'www.larvalabs.com' },
      { protocol: 'https', hostname: 'i.pinimg.com' },
      { protocol: 'https', hostname: 'cloudflare-ipfs.com' },
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
      { protocol: 'https', hostname: 'dweb.link' },
      { protocol: 'https', hostname: 'peach-impossible-chicken-451.mypinata.cloud' },
      { protocol: 'https', hostname: 'nftstorage.link' },
      { protocol: 'https', hostname: '*.ipfs.nftstorage.link' },
      { protocol: 'https', hostname: '*.ipfs.dweb.link' },
    ],
    unoptimized: false,
  },
  webpack: (config, { isServer, webpack, dev }) => {
    // Avoid PackFileCacheStrategy rename errors and 500s on chunks in dev (e.g. app-pages-internals.js)
    if (dev) {
      config.cache = false;
    }
    // ConnectKit webpack config
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false 
    };
    
    // Ignore optional Solana/Coinbase dependencies that aren't needed for Ethereum-only
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^bs58$/,
        contextRegExp: /@coinbase\/cdp-sdk/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^@solana\/kit$/,
        contextRegExp: /@solana-program/,
      }),
      // Suppress MetaMask SDK async-storage warning (React Native dependency not needed in browser)
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-async-storage\/async-storage$/,
        contextRegExp: /@metamask\/sdk/,
      }),
      // Suppress MetaMask SDK analytics to prevent fetch errors
      new webpack.IgnorePlugin({
        resourceRegExp: /^@metamask\/sdk-analytics$/,
        contextRegExp: /@metamask\/sdk/,
      }),
      // Suppress pino-pretty warning - it's an optional dev dependency for pino logging
      // Not needed in production builds, especially for pages that don't use Web3
      new webpack.IgnorePlugin({
        resourceRegExp: /^pino-pretty$/,
      })
    );
    
    if (!isServer) {
      config.module.rules.push({
        test: /\.glsl$/,
        use: 'raw-loader',
      });
    }
    return config;
  },
}

module.exports = nextConfig


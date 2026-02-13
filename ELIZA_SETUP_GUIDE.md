# Eliza API & Azura Voice Setup Guide

This guide explains how to set up the Eliza Cloud API integration for Azura's personality-driven proposal reviews and voice generation.

## 🎯 Overview

The system uses Eliza Cloud API to:
1. **Proposal Review**: Azura reviews proposals using her personality from `lib/Azurapersonality.json`
2. **Voice Generation**: Generate Azura's voice responses for proposals using ElevenLabs TTS
3. **Wallet Authentication**: Azura's private key for signing on-chain transactions

## 📋 Prerequisites

1. **Eliza Cloud API Access**
   - Deploy or access an Eliza Cloud API instance
   - Get your API key from the Eliza Cloud dashboard
   - Note the base URL (default: `http://localhost:3000` for local development)

2. **Azura's Wallet**
   - Generate or use an existing Ethereum private key for Azura
   - Fund the wallet with ETH for gas fees on Base network
   - Fund with governance tokens if needed

## 🔧 Environment Variables

Add these to your `.env.local` file:

```env
# Eliza Cloud API Configuration
ELIZA_API_KEY=your_eliza_api_key_here
ELIZA_API_BASE_URL=http://localhost:3000  # or your production URL

# Azura's Wallet (for on-chain proposal creation)
AZURA_PRIVATE_KEY=0x...  # Private key for Azura's wallet

# Coinbase CDP (if using CDP wallet management)
CDP_API_KEY_NAME=your_cdp_api_key_name
CDP_API_KEY_PRIVATE_KEY=your_cdp_private_key

# Wallet IDs (if using CDP wallet)
AZURA_WALLET_ID=your_wallet_id
AZURA_WALLET_SEED=your_wallet_seed

# Contract Addresses
NEXT_PUBLIC_AZURA_KILLSTREAK_ADDRESS=0x...
VOTING_TOKEN_CONTRACT_ADDRESS=0x...

# Base Network
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
```

## 🚀 Setup Steps

### 1. Configure Eliza API

If running Eliza Cloud locally:
```bash
# Clone and set up Eliza Cloud
git clone https://github.com/elizaOS/eliza-cloud-v2
cd eliza-cloud-v2
npm install
npm run dev
```

The API will be available at `http://localhost:3000` by default.

### 2. Set Up Azura's Private Key

**Option A: Generate New Private Key**
```bash
# Using Node.js
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

**Option B: Use Existing Wallet**
- Export private key from MetaMask or your wallet
- **⚠️ SECURITY WARNING**: Never commit private keys to git!

### 3. Fund Azura's Wallet

1. Send ETH to Azura's wallet address for gas fees
2. Send governance tokens if needed for allocations

To get Azura's wallet address:
```bash
npm run check-azura-wallet
```

### 4. Test the Integration

1. **Test Proposal Review**:
   - Create a test proposal via the "Submit Proposal" modal on `/voting` or `/home`
   - Check that Azura reviews it using Eliza API
   - Verify the review appears in the database

2. **Test Voice Generation**:
   - View a proposal card
   - Click the voice player button
   - Verify audio is generated and plays

## 📁 File Structure

```
lib/
  ├── eliza-api.ts              # Eliza API client
  ├── Azurapersonality.json     # Azura's personality definition
  └── azura-wallet.ts           # Wallet management

app/api/voting/proposal/
  ├── review/route.ts           # Proposal review endpoint (uses Eliza)
  └── voice/route.ts            # Voice generation endpoint

components/
  └── proposal-voice/
      ├── ProposalVoicePlayer.tsx
      └── ProposalVoicePlayer.module.css
```

## 🎨 Voice Component

The voice player component (`ProposalVoicePlayer`) features:
- **Skeuomorphic Design**: 3D depth with shadows and highlights
- **Full Width**: Positioned at bottom of proposal card
- **Lazy Loading**: Generates audio on-demand when user clicks play
- **Waveform Visualization**: Animated bars during playback

## 🔍 Troubleshooting

### Eliza API Connection Issues

**Error: "ELIZA_API_KEY not configured"**
- Check that `ELIZA_API_KEY` is set in `.env.local`
- Restart your Next.js dev server after adding env vars

**Error: "Failed to connect to Eliza API"**
- Verify `ELIZA_API_BASE_URL` is correct
- Check if Eliza Cloud is running (if local)
- Verify network connectivity

### Voice Generation Issues

**Error: "Failed to generate voice"**
- Check Eliza API TTS endpoint is accessible
- Verify ElevenLabs integration is configured in Eliza Cloud
- Check API rate limits

**Audio doesn't play**
- Check browser console for errors
- Verify audio format is supported (MP3)
- Check CORS settings if using remote API

### Wallet Issues

**Error: "Azura private key not configured"**
- Set `AZURA_PRIVATE_KEY` in `.env.local`
- Ensure private key starts with `0x`
- Verify key is 66 characters (0x + 64 hex chars)

**Error: "Insufficient gas"**
- Fund Azura's wallet with ETH
- Check current gas prices
- Verify wallet address is correct

## 🔐 Security Best Practices

1. **Never commit private keys or API keys to git**
2. **Use environment variables for all secrets**
3. **Rotate API keys regularly**
4. **Use separate wallets for development and production**
5. **Monitor wallet balances and set up alerts**

## 📚 Additional Resources

- [Eliza Cloud Documentation](https://github.com/elizaOS/eliza-cloud-v2)
- [Eliza API OpenAPI Spec](./elizacloudapi.json)
- [Azura Personality Definition](./lib/Azurapersonality.json)
- [State Machine Diagram](./docs/state-machine-diagram.md)

## 🎯 Next Steps

1. ✅ Set up Eliza API
2. ✅ Configure Azura's private key
3. ✅ Test proposal review flow
4. ✅ Test voice generation
5. ⏳ (Optional) Clone Azura's voice in ElevenLabs for custom voice
6. ⏳ (Optional) Set up background jobs for async voice generation

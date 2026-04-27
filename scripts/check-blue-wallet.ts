#!/usr/bin/env tsx
/**
 * Check Blue's Wallet Balance
 * 
 * This script checks Blue's ETH (for gas) and governance token balances
 * to ensure she can create on-chain proposals and vote.
 */

import { providers, Wallet, Contract } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const BLUE_PRIVATE_KEY = process.env.BLUE_PRIVATE_KEY;
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
const GOV_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS || '0x84939fEc50EfdEDC8522917645AAfABFd5b3EA6F';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

async function checkBlueWallet() {
  console.log('\n🤖 Checking Blue\'s Wallet Balance...\n');

  if (!BLUE_PRIVATE_KEY) {
    console.error('❌ BLUE_PRIVATE_KEY not set in .env.local');
    console.log('\n📝 To set up Blue\'s wallet:');
    console.log('1. Generate a new private key OR use existing wallet');
    console.log('2. Add to .env.local: BLUE_PRIVATE_KEY=0x...');
    console.log('3. Fund the wallet with ETH (for gas) and governance tokens\n');
    process.exit(1);
  }

  try {
    // Connect to Base network
    const provider = new providers.JsonRpcProvider(RPC_URL);
    const blueWallet = new Wallet(BLUE_PRIVATE_KEY, provider);

    console.log('Configuration:');
    console.log('  Blue Wallet:', blueWallet.address);
    console.log('  Network:', RPC_URL);
    console.log('  Gov Token:', GOV_TOKEN_ADDRESS);
    console.log('');

    // Check ETH balance (for gas)
    const ethBalance = await blueWallet.getBalance();
    const ethBalanceFormatted = Number(ethBalance) / 1e18;
    
    console.log('⛽ Gas Balance (ETH):');
    console.log('  Raw:', ethBalance.toString());
    console.log('  Formatted:', ethBalanceFormatted.toFixed(6), 'ETH');
    
    if (ethBalanceFormatted < 0.001) {
      console.log('  ⚠️  WARNING: Low gas balance! Need at least 0.001 ETH');
      console.log('  💰 Send ETH to:', blueWallet.address);
    } else if (ethBalanceFormatted < 0.01) {
      console.log('  ⚡ Adequate for a few transactions');
    } else {
      console.log('  ✅ Well funded for gas!');
    }
    console.log('');

    // Check governance token balance (for voting)
    const govTokenContract = new Contract(GOV_TOKEN_ADDRESS, ERC20_ABI, provider);
    const tokenName = await govTokenContract.name();
    const tokenSymbol = await govTokenContract.symbol();
    const tokenDecimals = await govTokenContract.decimals();
    const tokenBalance = await govTokenContract.balanceOf(blueWallet.address);
    const tokenBalanceFormatted = Number(tokenBalance) / (10 ** Number(tokenDecimals));

    console.log('🗳️  Voting Power (Governance Tokens):');
    console.log('  Token:', tokenName, '(', tokenSymbol, ')');
    console.log('  Decimals:', tokenDecimals);
    console.log('  Raw Balance:', tokenBalance.toString());
    console.log('  Formatted:', tokenBalanceFormatted.toLocaleString(), tokenSymbol);
    
    if (tokenBalanceFormatted === 0) {
      console.log('  ⚠️  WARNING: Blue has no voting power!');
      console.log('  💰 Send governance tokens to:', blueWallet.address);
    } else {
      const percentage = (tokenBalanceFormatted / 100000) * 100; // Assuming 100k total supply
      console.log('  ✅ Voting power:', percentage.toFixed(2), '% of total supply');
    }
    console.log('');

    // Summary
    console.log('📊 Summary:');
    const canCreateProposals = ethBalanceFormatted >= 0.001;
    const canVote = tokenBalanceFormatted > 0;
    
    console.log('  Can create proposals:', canCreateProposals ? '✅ YES' : '❌ NO (need ETH for gas)');
    console.log('  Can vote on proposals:', canVote ? '✅ YES' : '❌ NO (need governance tokens)');
    console.log('');

    if (!canCreateProposals || !canVote) {
      console.log('⚠️  Action Required:');
      if (!canCreateProposals) {
        console.log(`  1. Send at least 0.01 ETH to ${blueWallet.address}`);
      }
      if (!canVote) {
        console.log(`  2. Send governance tokens (${tokenSymbol}) to ${blueWallet.address}`);
        console.log(`     Recommended: 40,000 tokens (40% of supply for strong voting power)`);
      }
      console.log('');
    }

    // Links
    console.log('🔗 View on BaseScan:');
    console.log('  Wallet:', `https://basescan.org/address/${blueWallet.address}`);
    console.log('  Token:', `https://basescan.org/token/${GOV_TOKEN_ADDRESS}?a=${blueWallet.address}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the check
checkBlueWallet()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

#!/usr/bin/env node
/**
 * Check Contract Interactions
 * 
 * This script checks the transaction count and unique address interactions
 * for the Mental Wealth Academy contracts to verify OP Atlas eligibility.
 */

import { providers } from 'ethers';

const GOVERNANCE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS || '0x84939fEc50EfdEDC8522917645AAfABFd5b3EA6F';
const BLUE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BLUE_KILLSTREAK_ADDRESS || '0x2cbb90a761ba64014b811be342b8ef01b471992d';
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || 'YourApiKeyToken';
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  timeStamp: string;
  blockNumber: string;
  isError: string;
}

interface ContractStats {
  totalTransactions: number;
  uniqueAddresses: Set<string>;
  uniqueFromAddresses: Set<string>;
  uniqueToAddresses: Set<string>;
  successfulTransactions: number;
  failedTransactions: number;
  firstTransaction: string | null;
  lastTransaction: string | null;
  activeDays: Set<string>;
}

async function fetchTransactions(address: string, contractName: string): Promise<ContractStats> {
  const stats: ContractStats = {
    totalTransactions: 0,
    uniqueAddresses: new Set(),
    uniqueFromAddresses: new Set(),
    uniqueToAddresses: new Set(),
    successfulTransactions: 0,
    failedTransactions: 0,
    firstTransaction: null,
    lastTransaction: null,
    activeDays: new Set(),
  };

  try {
    // Try API V1 first (for compatibility)
    let txUrl = `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${BASESCAN_API_KEY}`;
    
    console.log(`\n📡 Fetching transactions for ${contractName}...`);
    console.log(`   Address: ${address}`);
    
    const response = await fetch(txUrl);
    const data = await response.json();
    
    if (data.status === '0' && data.message === 'No transactions found') {
      console.log(`   ⚠️  No transactions found`);
      return stats;
    }
    
    if (data.status !== '1') {
      // Handle deprecated API message
      if (data.message?.includes('deprecated') || data.message === 'NOTOK') {
        console.log(`   ⚠️  API endpoint issue. Please check BaseScan manually or use a valid API key.`);
        console.log(`   🔗 View on BaseScan: https://basescan.org/address/${address}`);
        console.log(`   💡 Tip: Get a free API key from https://basescan.org/apis`);
        return stats;
      }
      // Handle rate limiting or API key issues
      if (data.message?.includes('rate limit') || data.message === 'NOTOK') {
        console.log(`   ⚠️  API rate limit or key issue. Try with BASESCAN_API_KEY or check BaseScan directly.`);
        console.log(`   🔗 View on BaseScan: https://basescan.org/address/${address}`);
        return stats;
      }
      throw new Error(`API Error: ${data.message || 'Unknown error'}`);
    }
    
    const transactions: Transaction[] = data.result || [];
    
    // Process transactions
    for (const tx of transactions) {
      stats.totalTransactions++;
      
      // Track unique addresses
      if (tx.from) {
        stats.uniqueFromAddresses.add(tx.from.toLowerCase());
        stats.uniqueAddresses.add(tx.from.toLowerCase());
      }
      if (tx.to) {
        stats.uniqueToAddresses.add(tx.to.toLowerCase());
        stats.uniqueAddresses.add(tx.to.toLowerCase());
      }
      
      // Track success/failure
      if (tx.isError === '0') {
        stats.successfulTransactions++;
      } else {
        stats.failedTransactions++;
      }
      
      // Track active days (last 180 days)
      const txDate = new Date(parseInt(tx.timeStamp) * 1000);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 180) {
        const dateKey = txDate.toISOString().split('T')[0]; // YYYY-MM-DD
        stats.activeDays.add(dateKey);
      }
      
      // Track first and last transaction
      if (!stats.firstTransaction) {
        stats.firstTransaction = txDate.toISOString();
      }
      stats.lastTransaction = txDate.toISOString();
    }
    
    // Also fetch internal transactions
    const internalUrl = `https://api.basescan.org/api?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${BASESCAN_API_KEY}`;
    
    console.log(`   📡 Fetching internal transactions...`);
    const internalResponse = await fetch(internalUrl);
    const internalData = await internalResponse.json();
    
    if (internalData.status === '1' && internalData.result) {
      const internalTxs: Transaction[] = internalData.result;
      console.log(`   Found ${internalTxs.length} internal transactions`);
      
      // Count internal transactions but don't double-count addresses
      for (const tx of internalTxs) {
        if (tx.from) {
          stats.uniqueAddresses.add(tx.from.toLowerCase());
        }
        if (tx.to) {
          stats.uniqueAddresses.add(tx.to.toLowerCase());
        }
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Error fetching transactions:`, error instanceof Error ? error.message : error);
  }
  
  return stats;
}

function formatStats(stats: ContractStats, contractName: string): void {
  console.log(`\n📊 ${contractName} Statistics:`);
  console.log('─'.repeat(60));
  console.log(`Total Transactions:        ${stats.totalTransactions.toLocaleString()}`);
  console.log(`Successful Transactions:   ${stats.successfulTransactions.toLocaleString()}`);
  console.log(`Failed Transactions:       ${stats.failedTransactions.toLocaleString()}`);
  console.log(`Unique Addresses:          ${stats.uniqueAddresses.size.toLocaleString()}`);
  console.log(`Unique From Addresses:     ${stats.uniqueFromAddresses.size.toLocaleString()}`);
  console.log(`Unique To Addresses:       ${stats.uniqueToAddresses.size.toLocaleString()}`);
  console.log(`Active Days (Last 180):    ${stats.activeDays.size.toLocaleString()}`);
  
  if (stats.firstTransaction) {
    console.log(`First Transaction:         ${new Date(stats.firstTransaction).toLocaleString()}`);
  }
  if (stats.lastTransaction) {
    console.log(`Last Transaction:         ${new Date(stats.lastTransaction).toLocaleString()}`);
  }
}

function checkOPAtlasEligibility(
  governanceStats: ContractStats,
  blueStats: ContractStats
): void {
  console.log(`\n🎯 OP Atlas Eligibility Check:`);
  console.log('═'.repeat(60));
  
  // Combine stats from both contracts
  const combinedUniqueAddresses = new Set([
    ...governanceStats.uniqueAddresses,
    ...blueStats.uniqueAddresses,
  ]);
  
  const combinedTransactions = governanceStats.totalTransactions + blueStats.totalTransactions;
  const combinedActiveDays = new Set([
    ...governanceStats.activeDays,
    ...blueStats.activeDays,
  ]);
  
  console.log(`\nCombined Statistics:`);
  console.log(`  Total Transactions:      ${combinedTransactions.toLocaleString()} / 1,000 required`);
  console.log(`  Unique Addresses:       ${combinedUniqueAddresses.size.toLocaleString()} / 420 required`);
  console.log(`  Active Days (180 days):  ${combinedActiveDays.size.toLocaleString()} / 10 required`);
  
  console.log(`\n✅ Requirements Status:`);
  
  const meetsTransactions = combinedTransactions >= 1000;
  const meetsAddresses = combinedUniqueAddresses.size >= 420;
  const meetsActiveDays = combinedActiveDays.size >= 10;
  
  console.log(`  ${meetsTransactions ? '✅' : '❌'} At least 1,000 transactions: ${meetsTransactions ? 'PASS' : 'FAIL'}`);
  console.log(`  ${meetsAddresses ? '✅' : '❌'} At least 420 unique addresses: ${meetsAddresses ? 'PASS' : 'FAIL'}`);
  console.log(`  ${meetsActiveDays ? '✅' : '❌'} Activity on 10+ distinct days: ${meetsActiveDays ? 'PASS' : 'FAIL'}`);
  
  const allRequirementsMet = meetsTransactions && meetsAddresses && meetsActiveDays;
  
  console.log(`\n${'═'.repeat(60)}`);
  if (allRequirementsMet) {
    console.log(`\n🎉 ELIGIBLE for OP Atlas Retro Funding!`);
    console.log(`   All requirements are met.`);
  } else {
    console.log(`\n⚠️  NOT YET ELIGIBLE for OP Atlas Retro Funding`);
    console.log(`   Continue building activity to meet all requirements.`);
    
    if (!meetsTransactions) {
      const needed = 1000 - combinedTransactions;
      console.log(`   • Need ${needed.toLocaleString()} more transactions`);
    }
    if (!meetsAddresses) {
      const needed = 420 - combinedUniqueAddresses.size;
      console.log(`   • Need ${needed} more unique addresses`);
    }
    if (!meetsActiveDays) {
      const needed = 10 - combinedActiveDays.size;
      console.log(`   • Need ${needed} more active days`);
    }
  }
  console.log(`\n`);
}

async function main() {
  console.log('\n🔍 Checking Contract Interactions for OP Atlas Eligibility\n');
  console.log('═'.repeat(60));
  
  // Check if API key is set
  if (BASESCAN_API_KEY === 'YourApiKeyToken') {
    console.log('⚠️  WARNING: BASESCAN_API_KEY not set in environment variables');
    console.log('   Using public API (may have rate limits)');
    console.log('   For better results, set BASESCAN_API_KEY in your .env file\n');
  }
  
  try {
    // Fetch stats for both contracts
    const governanceStats = await fetchTransactions(
      GOVERNANCE_TOKEN_ADDRESS,
      'Governance Token (MWG)'
    );
    
    const blueStats = await fetchTransactions(
      BLUE_CONTRACT_ADDRESS,
      'BlueKillStreak Contract'
    );
    
    // Display individual stats
    formatStats(governanceStats, 'Governance Token (MWG)');
    formatStats(blueStats, 'BlueKillStreak Contract');
    
    // Check OP Atlas eligibility
    checkOPAtlasEligibility(governanceStats, blueStats);
    
    // Display BaseScan links
    console.log('🔗 View on BaseScan:');
    console.log(`   Governance Token: https://basescan.org/address/${GOVERNANCE_TOKEN_ADDRESS}`);
    console.log(`   BlueKillStreak:  https://basescan.org/address/${BLUE_CONTRACT_ADDRESS}`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the check
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

#!/usr/bin/env node
/**
 * Check Treasury Balance
 * 
 * This script checks the USDC balance of the BlueKillStreak contract
 * to help diagnose treasury display issues.
 */

import { providers, Contract, BigNumber } from 'ethers';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BLUE_KILLSTREAK_ADDRESS || '0x2cbb90a761ba64014b811be342b8ef01b471992d';
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

async function checkTreasuryBalance() {
  console.log('\n🔍 Checking Treasury Balance...\n');
  console.log('Configuration:');
  console.log('  Contract Address:', CONTRACT_ADDRESS);
  console.log('  USDC Address:', USDC_ADDRESS);
  console.log('  RPC URL:', RPC_URL);
  console.log('  Network: Base Mainnet (Chain ID: 8453)\n');

  try {
    // Connect to Base Mainnet (ethers v5 syntax)
    const provider = new providers.JsonRpcProvider(RPC_URL);
    
    // Verify network
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name, '(Chain ID:', network.chainId, ')\n');

    // Create USDC contract instance (ethers v5 syntax)
    const usdcContract = new Contract(USDC_ADDRESS, USDC_ABI, provider);
    
    // Get USDC details
    const symbol = await usdcContract.symbol();
    const decimals = await usdcContract.decimals();
    console.log('💵 Token Details:');
    console.log('  Symbol:', symbol);
    console.log('  Decimals:', decimals);
    
    // Get treasury balance
    const balanceRaw = await usdcContract.balanceOf(CONTRACT_ADDRESS);
    const balanceNum = Number(balanceRaw) / (10 ** Number(decimals));
    
    console.log('\n💰 Treasury Balance:');
    console.log('  Raw:', balanceRaw.toString());
    console.log('  Formatted:', balanceNum.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }), symbol);
    
    // Status
    if (balanceNum === 0) {
      console.log('\n⚠️  WARNING: Treasury is empty!');
      console.log('   The contract needs to be funded with USDC.');
      console.log('   See: contracts/DEPLOY_TO_MAINNET.md for funding instructions\n');
    } else {
      console.log('\n✅ Treasury is funded!\n');
    }
    
    // View on BaseScan
    console.log('🔗 View on BaseScan:');
    console.log('  Contract:', `https://basescan.org/address/${CONTRACT_ADDRESS}`);
    console.log('  USDC Token:', `https://basescan.org/token/${USDC_ADDRESS}?a=${CONTRACT_ADDRESS}`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the check
checkTreasuryBalance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

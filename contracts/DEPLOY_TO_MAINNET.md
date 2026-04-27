# Deploy BlueKillStreak to Base Mainnet

## 🎯 Pre-Deployment Checklist

Before deploying to mainnet, verify:

- [ ] All 22 Foundry tests passing ✅
- [ ] Contract reviewed for security
- [ ] You have Base Mainnet ETH for gas (~$5-10)
- [ ] Blue agent wallet address ready
- [ ] Deployer wallet has sufficient ETH
- [ ] Ready to distribute governance tokens

## 🔑 Environment Setup

Create `contracts/.env` file:

```env
# Deployer private key (will deploy contract and mint tokens)
PRIVATE_KEY=0x...

# Blue AI agent wallet address (will receive 40% of governance tokens)
BLUE_AGENT_ADDRESS=0x...

# Base Mainnet RPC (already configured in foundry.toml)
# Using: https://api.developer.coinbase.com/rpc/v1/base/9oU7BptpclCm3gy0G7d9bfbp9J2oUoQP

# BaseScan API key for contract verification (optional but recommended)
BASESCAN_API_KEY=...
```

## 🚀 Deployment Command

### Dry Run First (Recommended)
```bash
cd contracts

# Simulate deployment without broadcasting
forge script script/Deploy.s.sol:Deploy \
  --rpc-url base \
  --private-key $PRIVATE_KEY
```

### Deploy to Base Mainnet
```bash
cd contracts

# Deploy and broadcast transactions
forge script script/Deploy.s.sol:Deploy \
  --rpc-url base \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

**Without verification:**
```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url base \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## 📋 What Gets Deployed

### 1. Governance Token (MWG)
- **Name**: Mental Wealth Governance
- **Symbol**: MWG
- **Total Supply**: 100,000 tokens
- **Decimals**: 18

### 2. BlueKillStreak Contract
- **Governance Token**: Address from step 1
- **USDC Token**: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (Base Mainnet)
- **Blue Agent**: Your Blue wallet address
- **Total Supply**: 100,000 tokens

### 3. Initial Token Distribution
- **Blue**: 40,000 MWG (40%) - Automatically transferred
- **Deployer**: 60,000 MWG (60%) - For admin distribution

## 💰 Cost Estimate

**Gas Costs on Base Mainnet:**
- Deploy GovernanceToken: ~600k gas (~$0.60)
- Deploy BlueKillStreak: ~1.8M gas (~$1.80)
- Transfer to Blue: ~50k gas (~$0.05)
- **Total**: ~$2.50 - $5.00

(Base is cheap! Much less than Ethereum mainnet)

## 📝 After Deployment

You'll see output like:

```
==============================================
DEPLOYMENT COMPLETE
==============================================
Network: Base Mainnet
Governance Token: 0x1234...
BlueKillStreak: 0x5678...
USDC Token: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Blue Agent: 0xabcd...
==============================================

NEXT STEPS:
1. Verify contracts on BaseScan
2. Fund BlueKillStreak contract with USDC
3. Distribute remaining governance tokens to admins
4. Update frontend with contract addresses
5. Set up CDP webhooks for event monitoring
==============================================
```

### Save These Addresses:

```env
# Add to your app's .env.local
NEXT_PUBLIC_BLUE_KILLSTREAK_ADDRESS=0x...
NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

## 💵 Fund Contract with USDC

After deployment, send USDC to the BlueKillStreak contract:

```bash
# How much USDC to fund?
# Example: $100,000 USDC for initial funding
# (Each proposal can request up to this amount)

# You can send via:
# 1. Coinbase Wallet
# 2. MetaMask
# 3. Any wallet supporting Base Mainnet

# Or via Cast:
cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "transfer(address,uint256)" \
  0xYOUR_BLUEKILLSTREAK_ADDRESS \
  100000000000 \  # 100k USDC (6 decimals)
  --rpc-url base \
  --private-key $PRIVATE_KEY
```

## 👥 Distribute Admin Tokens

After deployment, you'll have 60,000 MWG tokens to distribute:

```bash
# Example: 5 admins get 10k each, 10k reserve

# Admin 1
cast send $GOVERNANCE_TOKEN_ADDRESS \
  "transfer(address,uint256)" \
  0xADMIN1_ADDRESS \
  10000000000000000000000 \  # 10k tokens (18 decimals)
  --rpc-url base \
  --private-key $PRIVATE_KEY

# Repeat for Admin 2-5...
```

## 🔍 Verify Deployment

### Check on BaseScan

1. Go to [BaseScan](https://basescan.org/)
2. Search for your contract addresses
3. Verify:
   - ✅ Governance Token created with 100k supply
   - ✅ BlueKillStreak contract verified
   - ✅ Blue has 40k tokens (40%)
   - ✅ Contract has USDC balance

### Test Basic Functions

```bash
# Check proposal count (should be 0)
cast call $BLUEKILLSTREAK_ADDRESS \
  "proposalCount()" \
  --rpc-url base

# Check Blue's voting power (should be 40k tokens)
cast call $BLUEKILLSTREAK_ADDRESS \
  "getVotingPower(address)" \
  $BLUE_AGENT_ADDRESS \
  --rpc-url base

# Check contract USDC balance
cast call 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "balanceOf(address)" \
  $BLUEKILLSTREAK_ADDRESS \
  --rpc-url base
```

## 🎯 Next: Set Up CDP Webhook

After successful deployment:

1. Go to [CDP Portal](https://portal.cdp.coinbase.com/products/data/node)
2. Create webhook with:
   - **URL**: `https://mentalwealthacademy.world/api/webhooks/cdp`
   - **Network**: Base Mainnet
   - **Contract Address**: Your deployed BlueKillStreak address
   - **Events**: Smart Contract Events

## ⚠️ Important Notes

### Gas Prices on Base
- Base is an L2 (Layer 2) - much cheaper than Ethereum
- Typical gas: ~0.001 gwei
- Fast confirmation: ~2 seconds
- Cost per transaction: $0.01 - $0.10

### USDC on Base Mainnet
- **Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Official**: Yes, this is Circle's official USDC on Base
- **Decimals**: 6
- **Verified**: Check on [BaseScan](https://basescan.org/token/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913)

### Token Distribution Strategy
```
Total: 100,000 MWG tokens

Immediate:
- Blue: 40,000 (40%) ← Auto-transferred on deploy

Manual Distribution:
- Admin 1: 10,000 (10%)
- Admin 2: 10,000 (10%)
- Admin 3: 10,000 (10%)
- Admin 4: 10,000 (10%)
- Admin 5: 10,000 (10%)
- Reserve: 10,000 (10%) ← Keep for future admins

With this distribution:
- Blue + 1 admin = 50% (can pass Level 4 proposals)
- Blue + 2 admins = 60% (can pass Level 3 proposals)
- Blue + 4 admins = 80% (can pass Level 1 proposals)
```

## 🐛 Troubleshooting

### "Insufficient funds for gas"
- Add more ETH to deployer wallet
- Need ~$5-10 for deployment

### "Nonce too high"
- Reset nonce: `cast nonce $YOUR_ADDRESS --rpc-url base`
- Adjust in deployment script

### "Contract not verified"
- Run verification separately:
```bash
forge verify-contract \
  $CONTRACT_ADDRESS \
  src/BlueKillStreak.sol:BlueKillStreak \
  --chain-id 8453 \
  --constructor-args $(cast abi-encode "constructor(address,address,address,uint256)" $GOV_TOKEN $USDC $BLUE $SUPPLY)
```

## ✅ Deployment Complete When:

- ✅ Both contracts deployed to Base Mainnet
- ✅ Contracts verified on BaseScan
- ✅ Blue has 40k governance tokens
- ✅ Contract funded with USDC
- ✅ Admin tokens distributed
- ✅ CDP webhook configured
- ✅ Frontend updated with addresses

---

**Ready to deploy? Run the command above!** 🚀

Let me know when deployed and I'll help set up the webhook with the contract address.

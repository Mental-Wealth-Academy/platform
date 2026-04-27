# Contract Verification Guide

This guide explains how to verify your deployed contracts on Basescan (Base's block explorer).

## 📋 Overview

You have two contracts deployed to Base Mainnet:
- **GovernanceToken**: `0x84939fEc50EfdEDC8522917645AAfABFd5b3EA6F`
- **BlueKillStreak**: `0x2cbb90a761ba64014b811be342b8ef01b471992d`

## ✅ Method 1: Using Foundry (Recommended)

Foundry has built-in support for contract verification. This is the easiest and most reliable method.

### Prerequisites

1. **Get a Basescan API Key**:
   - Go to [Basescan](https://basescan.org/)
   - Sign in or create an account
   - Navigate to [API Keys](https://basescan.org/myapikey)
   - Click "Add" to create a new API key
   - Copy your API key

2. **Set the API Key**:
   ```bash
   export BASESCAN_API_KEY=your_api_key_here
   ```

3. **Make sure contracts are compiled**:
   ```bash
   cd contracts
   forge build
   ```

### Verify Using the Script

We've provided a verification script that verifies both contracts:

```bash
cd contracts
./verify.sh
```

This script will:
- Verify GovernanceToken with its constructor arguments
- Verify BlueKillStreak with its constructor arguments
- Show you the Basescan links when complete

### Verify Manually

If you prefer to verify manually, use these commands:

**GovernanceToken:**
```bash
forge verify-contract \
  0x84939fEc50EfdEDC8522917645AAfABFd5b3EA6F \
  script/Deploy.s.sol:GovernanceToken \
  --chain-id 8453 \
  --num-of-optimizations 200 \
  --constructor-args $(cast abi-encode "constructor(uint256)" 100000000000000000000000) \
  --watch \
  --etherscan-api-key $BASESCAN_API_KEY
```

**BlueKillStreak:**
```bash
forge verify-contract \
  0x2cbb90a761ba64014b811be342b8ef01b471992d \
  src/BlueKillStreak.sol:BlueKillStreak \
  --chain-id 8453 \
  --num-of-optimizations 200 \
  --constructor-args $(cast abi-encode "constructor(address,address,address,uint256)" \
    0x84939fEc50EfdEDC8522917645AAfABFd5b3EA6F \
    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
    0x0920553CcA188871b146ee79f562B4Af46aB4f8a \
    100000000000000000000000) \
  --watch \
  --etherscan-api-key $BASESCAN_API_KEY
```

## 🔧 Method 2: Using Basescan API Directly

If you want to verify using the Basescan API directly (like the tutorial), you can use the provided Node.js script.

### Prerequisites

1. Node.js installed
2. BASESCAN_API_KEY environment variable set
3. Contracts compiled (for getting compiler metadata)

### Using the Script

The script uses `forge flatten` to get single-file source code and then submits it to Basescan API:

```bash
cd contracts
node verify-contracts.js
```

**Note**: This method is more complex because:
- Contracts have imports (OpenZeppelin), so they need to be flattened
- You need the exact compiler version string with commit hash
- Single-file verification can be tricky with complex contracts

For most use cases, **Method 1 (Foundry)** is recommended.

## 📝 Verification Details

### Compiler Settings

From `foundry.toml`:
- **Solidity Version**: 0.8.20
- **Optimizer**: Enabled
- **Optimizer Runs**: 200
- **Via IR**: false

### Constructor Arguments

**GovernanceToken:**
- `initialSupply`: 100000000000000000000000 (100,000 tokens with 18 decimals)

**BlueKillStreak:**
- `_governanceToken`: 0x84939fEc50EfdEDC8522917645AAfABFd5b3EA6F
- `_usdcToken`: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (Base Mainnet USDC)
- `_blueAgent`: 0x0920553CcA188871b146ee79f562B4Af46aB4f8a
- `_totalSupply`: 100000000000000000000000 (100,000 tokens)

## 🔍 Verify on Basescan

After successful verification, check your contracts:

- **GovernanceToken**: https://basescan.org/address/0x84939fEc50EfdEDC8522917645AAfABFd5b3EA6F
- **BlueKillStreak**: https://basescan.org/address/0x2cbb90a761ba64014b811be342b8ef01b471992d

You should see:
- ✅ Contract verified badge
- 📄 Source code tab with readable code
- 📊 Read/Write contract tabs for interaction

## ⚠️ Troubleshooting

### "Contract already verified"
This is normal if the contract was already verified. You can skip it or re-run verification.

### "Compiler version mismatch"
Make sure you're using the same compiler version that was used for deployment. Check `foundry.toml` for the version.

### "Constructor arguments mismatch"
Double-check the constructor arguments match exactly what was used during deployment. You can verify from the deployment broadcast file: `contracts/broadcast/Deploy.s.sol/8453/run-latest.json`

### "Verification failed"
- Check that your API key is correct
- Make sure the contract address is correct
- Verify that the contract source code matches what was deployed
- Check Basescan API status

## 📚 Resources

- [Basescan Documentation](https://docs.basescan.org/)
- [Foundry Verification Guide](https://book.getfoundry.sh/reference/forge/forge-verify-contract)
- [Basescan API Keys](https://basescan.org/myapikey)

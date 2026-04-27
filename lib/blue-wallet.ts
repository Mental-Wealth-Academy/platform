import { Coinbase, Wallet, WalletData } from "@coinbase/coinbase-sdk";

/**
 * Blue Wallet Manager
 * Manages Blue's blockchain wallet for token distribution to approved proposals
 */

interface TokenAllocation {
  recipientAddress: string;
  percentage: number;
  proposalId: string;
  amount: bigint;
  txHash: string;
}

class BlueWalletManager {
  private static instance: BlueWalletManager;
  private wallet: Wallet | null = null;
  private coinbase: Coinbase | null = null;
  private initialized = false;
  private tokenContractAddress: string;
  private totalTokenPool: bigint;
  private allocations: Map<string, TokenAllocation> = new Map();

  private constructor() {
    this.tokenContractAddress = process.env.VOTING_TOKEN_CONTRACT_ADDRESS || '';
    const poolSize = process.env.BLUE_TOTAL_TOKEN_POOL || '1000000';
    const decimals = parseInt(process.env.VOTING_TOKEN_DECIMALS || '18');
    this.totalTokenPool = BigInt(poolSize) * BigInt(10 ** decimals);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BlueWalletManager {
    if (!BlueWalletManager.instance) {
      BlueWalletManager.instance = new BlueWalletManager();
    }
    return BlueWalletManager.instance;
  }

  /**
   * Initialize Blue's wallet
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Validate environment variables
      const apiKeyName = process.env.CDP_API_KEY_NAME;
      const apiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

      if (!apiKeyName || !apiKeyPrivateKey) {
        throw new Error('CDP API credentials not configured. Set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY in environment.');
      }

      if (!this.tokenContractAddress) {
        throw new Error('VOTING_TOKEN_CONTRACT_ADDRESS not configured in environment.');
      }

      // Initialize Coinbase SDK
      this.coinbase = new Coinbase({
        apiKeyName,
        privateKey: apiKeyPrivateKey,
      });

      // Load or create Blue's wallet
      const walletId = process.env.BLUE_WALLET_ID;
      const walletSeed = process.env.BLUE_WALLET_SEED;

      if (walletId && walletSeed) {
        // Import existing wallet
        console.log('Loading existing Blue wallet...');
        this.wallet = await Wallet.import({
          walletId,
          seed: walletSeed,
        });
      } else {
        // Create new wallet
        console.log('Creating new Blue wallet...');
        this.wallet = await Wallet.create({
          networkId: 'base-mainnet', // or 'base-sepolia' for testnet
        });

        const address = await this.wallet.getDefaultAddress();
        console.log(`New Blue wallet created: ${address}`);
        console.warn('BLUE_WALLET_ID and BLUE_WALLET_SEED must be set in env vars. Check wallet setup script.');
      }

      this.initialized = true;
      console.log('✅ Blue wallet initialized successfully');
      
      // Log current balance
      const balance = await this.getTokenBalance();
      console.log(`Blue token balance: ${this.formatTokenAmount(balance)} tokens`);
    } catch (error) {
      console.error('Failed to initialize Blue wallet:', error);
      throw error;
    }
  }

  /**
   * Get Blue's wallet address
   */
  public async getWalletAddress(): Promise<string> {
    if (!this.wallet) {
      await this.initialize();
    }
    const address = await this.wallet!.getDefaultAddress();
    return address.getId();
  }

  /**
   * Get current token balance
   */
  public async getTokenBalance(): Promise<bigint> {
    if (!this.wallet) {
      await this.initialize();
    }

    try {
      const address = await this.wallet!.getDefaultAddress();
      const balance = await address.getBalance(this.tokenContractAddress);
      return BigInt(balance.toString());
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return BigInt(0);
    }
  }

  /**
   * Calculate token amount from percentage
   */
  private calculateTokenAmount(percentage: number): bigint {
    if (percentage < 1 || percentage > 40) {
      throw new Error('Percentage must be between 1 and 40');
    }
    return (this.totalTokenPool * BigInt(percentage)) / BigInt(100);
  }

  /**
   * Get total allocated tokens
   */
  public getTotalAllocated(): bigint {
    let total = BigInt(0);
    for (const allocation of this.allocations.values()) {
      total += allocation.amount;
    }
    return total;
  }

  /**
   * Get available allocation percentage
   */
  public getAvailableAllocationPercentage(): number {
    const allocated = this.getTotalAllocated();
    const remaining = this.totalTokenPool - allocated;
    return Number((remaining * BigInt(100)) / this.totalTokenPool);
  }

  /**
   * Check if allocation is possible
   */
  public async canAllocate(percentage: number): Promise<{ canAllocate: boolean; reason?: string }> {
    const amount = this.calculateTokenAmount(percentage);
    const balance = await this.getTokenBalance();
    const totalAllocated = this.getTotalAllocated();
    const availableFromPool = this.totalTokenPool - totalAllocated;

    if (amount > balance) {
      return {
        canAllocate: false,
        reason: `Insufficient balance. Required: ${this.formatTokenAmount(amount)}, Available: ${this.formatTokenAmount(balance)}`,
      };
    }

    if (amount > availableFromPool) {
      return {
        canAllocate: false,
        reason: `Exceeds available pool allocation. Required: ${percentage}%, Available: ${this.getAvailableAllocationPercentage()}%`,
      };
    }

    return { canAllocate: true };
  }

  /**
   * Allocate tokens to a proposal recipient
   */
  public async allocateTokens(
    recipientAddress: string,
    percentage: number,
    proposalId: string
  ): Promise<{ txHash: string; amount: bigint; estimatedGas: string }> {
    if (!this.wallet) {
      await this.initialize();
    }

    // Validate allocation
    const canAllocate = await this.canAllocate(percentage);
    if (!canAllocate.canAllocate) {
      throw new Error(canAllocate.reason);
    }

    // Check for duplicate allocation
    if (this.allocations.has(proposalId)) {
      throw new Error('Tokens already allocated for this proposal');
    }

    const amount = this.calculateTokenAmount(percentage);

    try {
      console.log(`Allocating ${percentage}% (${this.formatTokenAmount(amount)} tokens) to ${recipientAddress}`);

      // Create ERC-20 transfer transaction
      const address = await this.wallet!.getDefaultAddress();
      
      // Transfer tokens using CDP SDK
      const transfer = await address.invokeContract({
        contractAddress: this.tokenContractAddress,
        method: 'transfer',
        args: {
          to: recipientAddress,
          amount: amount.toString(),
        },
      });

      // Wait for transaction to be broadcast
      await transfer.wait();
      
      const txHash = transfer.getTransactionHash();
      
      if (!txHash) {
        throw new Error('Transaction hash not available');
      }

      // Record allocation
      const allocation: TokenAllocation = {
        recipientAddress,
        percentage,
        proposalId,
        amount,
        txHash,
      };
      this.allocations.set(proposalId, allocation);

      console.log(`✅ Tokens allocated successfully. TX: ${txHash}`);

      return {
        txHash,
        amount,
        estimatedGas: '50000', // Typical ERC-20 transfer gas
      };
    } catch (error) {
      console.error('Failed to allocate tokens:', error);
      throw new Error(`Token allocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get allocation for a proposal
   */
  public getAllocation(proposalId: string): TokenAllocation | undefined {
    return this.allocations.get(proposalId);
  }

  /**
   * Format token amount for display
   */
  private formatTokenAmount(amount: bigint): string {
    const decimals = parseInt(process.env.VOTING_TOKEN_DECIMALS || '18');
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fraction = amount % divisor;
    return `${whole}.${fraction.toString().padStart(decimals, '0').slice(0, 4)}`;
  }

  /**
   * Distribute USDC to multiple addresses on Base.
   * Used for APPLE holder profit distribution.
   */
  public async distributeUSDC(
    recipients: { address: string; amount: string }[],
  ): Promise<{ txHashes: string[]; failed: { address: string; error: string }[] }> {
    if (!this.wallet) {
      await this.initialize();
    }

    const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const walletAddress = await this.wallet!.getDefaultAddress();
    const txHashes: string[] = [];
    const failed: { address: string; error: string }[] = [];

    for (const { address, amount } of recipients) {
      try {
        const transfer = await walletAddress.invokeContract({
          contractAddress: usdcAddress,
          method: 'transfer',
          args: {
            to: address,
            amount,
          },
        });
        await transfer.wait();
        const hash = transfer.getTransactionHash();
        if (hash) txHashes.push(hash);
      } catch (err) {
        failed.push({
          address,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return { txHashes, failed };
  }

  /**
   * Get wallet statistics
   */
  public async getStats(): Promise<{
    walletAddress: string;
    tokenBalance: string;
    totalPool: string;
    totalAllocated: string;
    availablePercentage: number;
    allocationCount: number;
  }> {
    const balance = await this.getTokenBalance();
    const allocated = this.getTotalAllocated();

    return {
      walletAddress: await this.getWalletAddress(),
      tokenBalance: this.formatTokenAmount(balance),
      totalPool: this.formatTokenAmount(this.totalTokenPool),
      totalAllocated: this.formatTokenAmount(allocated),
      availablePercentage: this.getAvailableAllocationPercentage(),
      allocationCount: this.allocations.size,
    };
  }
}

// Export singleton instance
export const blueWallet = BlueWalletManager.getInstance();

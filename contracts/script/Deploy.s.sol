// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/BlueKillStreak.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title GovernanceToken
 * @notice ERC20Votes governance token for Mental Wealth Academy voting
 * @dev Inherits ERC20Votes for snapshot-based voting power via getPastVotes()
 */
contract GovernanceToken is ERC20, ERC20Permit, ERC20Votes {
    constructor(uint256 initialSupply)
        ERC20("Mental Wealth Governance", "MWG")
        ERC20Permit("Mental Wealth Governance")
    {
        _mint(msg.sender, initialSupply);
    }

    // Diamond overrides required by Solidity for ERC20 + ERC20Votes
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}

/**
 * @title Deploy
 * @notice Deployment script for BlueKillStreak governance system
 *
 * To deploy on Base Sepolia:
 * forge script script/Deploy.s.sol:Deploy --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 *
 * To deploy on Base Mainnet:
 * forge script script/Deploy.s.sol:Deploy --rpc-url $BASE_MAINNET_RPC_URL --broadcast --verify
 */
contract Deploy is Script {
    // Token configuration
    uint256 constant TOTAL_SUPPLY = 100_000 * 1e18; // 100k governance tokens
    uint256 constant BLUE_ALLOCATION = 40_000 * 1e18; // 40% to Blue

    // USDC addresses (Base network)
    address constant USDC_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC
    address constant USDC_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // Base Mainnet USDC

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address blueAgent = vm.envAddress("BLUE_AGENT_ADDRESS");

        // Determine which USDC to use based on chain ID
        address usdcAddress;
        if (block.chainid == 84532) { // Base Sepolia
            usdcAddress = USDC_SEPOLIA;
            console.log("Deploying to Base Sepolia (Testnet)...");
        } else if (block.chainid == 8453) { // Base Mainnet
            usdcAddress = USDC_MAINNET;
            console.log("Deploying to Base Mainnet (Production)...");
        } else {
            revert("Unsupported network");
        }

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Governance Token (ERC20Votes)
        console.log("\n1. Deploying Governance Token (ERC20Votes)...");
        GovernanceToken governanceToken = new GovernanceToken(TOTAL_SUPPLY);
        console.log("Governance Token deployed at:", address(governanceToken));
        console.log("Total Supply:", TOTAL_SUPPLY / 1e18, "tokens");

        // 2. Deploy BlueKillStreak Contract
        console.log("\n2. Deploying BlueKillStreak Contract...");
        BlueKillStreak governance = new BlueKillStreak(
            address(governanceToken),
            usdcAddress,
            blueAgent,
            TOTAL_SUPPLY
        );
        console.log("BlueKillStreak deployed at:", address(governance));
        console.log("Blue Agent:", blueAgent);
        console.log("USDC Token:", usdcAddress);

        // 3. Transfer tokens to Blue (40%)
        console.log("\n3. Transferring tokens to Blue...");
        governanceToken.transfer(blueAgent, BLUE_ALLOCATION);
        console.log("Blue balance:", BLUE_ALLOCATION / 1e18, "tokens (40%)");

        // 4. Self-delegate so voting power activates immediately
        console.log("\n4. Activating voting power via self-delegation...");
        governanceToken.delegate(vm.addr(deployerPrivateKey));
        console.log("Deployer delegated to self");

        // 5. Check remaining balance for admin distribution
        uint256 remainingBalance = governanceToken.balanceOf(vm.addr(deployerPrivateKey));
        console.log("Remaining for admins:", remainingBalance / 1e18, "tokens (60%)");

        vm.stopBroadcast();

        // 6. Print deployment summary
        console.log("\n==============================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("==============================================");
        console.log("Network:", block.chainid == 84532 ? "Base Sepolia" : "Base Mainnet");
        console.log("Governance Token:", address(governanceToken));
        console.log("BlueKillStreak:", address(governance));
        console.log("USDC Token:", usdcAddress);
        console.log("Blue Agent:", blueAgent);
        console.log("==============================================");
        console.log("\nNEXT STEPS:");
        console.log("1. Verify contracts on BaseScan");
        console.log("2. Fund BlueKillStreak contract with USDC");
        console.log("3. Distribute remaining governance tokens to admins");
        console.log("4. Each token holder must call delegate(self) to activate voting power");
        console.log("5. Update frontend with contract addresses");
        console.log("6. Set up CDP webhooks for event monitoring");
        console.log("==============================================\n");
    }
}

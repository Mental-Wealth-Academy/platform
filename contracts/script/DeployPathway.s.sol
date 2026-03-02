// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/EtherealHorizonPathway.sol";

/**
 * @title DeployPathway
 * @notice Deployment script for EtherealHorizonPathway
 *
 * To deploy on Base Sepolia:
 * forge script script/DeployPathway.s.sol:DeployPathway --rpc-url base_sepolia --broadcast --verify
 *
 * To deploy on Base Mainnet:
 * forge script script/DeployPathway.s.sol:DeployPathway --rpc-url base --broadcast --verify
 */
contract DeployPathway is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("AZURA_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        EtherealHorizonPathway pathway = new EtherealHorizonPathway();

        vm.stopBroadcast();

        console.log("==============================================");
        console.log("ETHEREAL HORIZON PATHWAY DEPLOYED");
        console.log("==============================================");
        console.log("Network:", block.chainid == 84532 ? "Base Sepolia" : "Base Mainnet");
        console.log("Contract:", address(pathway));
        console.log("Owner:", vm.addr(deployerPrivateKey));
        console.log("Total Weeks:", pathway.TOTAL_WEEKS());
        console.log("==============================================");
        console.log("\nNEXT STEPS:");
        console.log("1. Verify contract on BaseScan");
        console.log("2. Set NEXT_PUBLIC_PATHWAY_CONTRACT_ADDRESS in .env");
        console.log("3. Set PATHWAY_OWNER_PRIVATE_KEY in .env (server-only)");
        console.log("==============================================\n");
    }
}

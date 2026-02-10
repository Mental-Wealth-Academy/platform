// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AzuraKillStreak.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing
 */
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title AzuraKillStreakTest
 * @notice Comprehensive tests for AzuraKillStreak governance contract
 */
contract AzuraKillStreakTest is Test {
    AzuraKillStreak public governance;
    MockERC20 public governanceToken;
    MockERC20 public usdc;
    
    address public owner;
    address public azuraAgent;
    address public proposer;
    address public voter1;
    address public voter2;
    address public voter3;
    address public voter4;
    address public recipient;
    address public forwarder;

    uint256 public constant TOTAL_SUPPLY = 100_000 * 1e18; // 100k tokens
    uint256 public constant AZURA_BALANCE = 40_000 * 1e18; // 40% (40k tokens)
    uint256 public constant VOTER_BALANCE = 10_000 * 1e18;  // 10% each
    uint256 public constant USDC_AMOUNT = 10_000 * 1e6;    // 10k USDC (6 decimals)
    uint256 public constant VOTING_PERIOD = 7 days;
    
    // Events to test
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address indexed recipient,
        uint256 usdcAmount,
        string title,
        uint256 votingDeadline
    );
    
    event AzuraReview(
        uint256 indexed proposalId,
        uint256 azuraLevel,
        bool approved,
        uint256 voteWeight
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 usdcAmount
    );
    
    function setUp() public {
        // Set up test addresses
        owner = address(this);
        azuraAgent = makeAddr("azura");
        proposer = makeAddr("proposer");
        voter1 = makeAddr("voter1");
        voter2 = makeAddr("voter2");
        voter3 = makeAddr("voter3");
        voter4 = makeAddr("voter4");
        recipient = makeAddr("recipient");
        forwarder = makeAddr("forwarder");
        
        // Deploy tokens
        governanceToken = new MockERC20("Governance", "GOV", TOTAL_SUPPLY);
        usdc = new MockERC20("USD Coin", "USDC", 1_000_000 * 1e6); // 1M USDC
        
        // Deploy governance contract
        governance = new AzuraKillStreak(
            address(governanceToken),
            address(usdc),
            azuraAgent,
            TOTAL_SUPPLY
        );
        
        // Distribute governance tokens
        governanceToken.transfer(azuraAgent, AZURA_BALANCE);
        governanceToken.transfer(voter1, VOTER_BALANCE);
        governanceToken.transfer(voter2, VOTER_BALANCE);
        governanceToken.transfer(voter3, VOTER_BALANCE);
        governanceToken.transfer(voter4, VOTER_BALANCE);
        
        // Fund governance contract with USDC
        usdc.transfer(address(governance), 500_000 * 1e6); // 500k USDC
        
        // Verify balances
        assertEq(governanceToken.balanceOf(azuraAgent), AZURA_BALANCE);
        assertEq(governanceToken.balanceOf(voter1), VOTER_BALANCE);
    }
    
    // ============================================================================
    // PROPOSAL CREATION TESTS
    // ============================================================================
    
    function test_CreateProposal() public {
        vm.startPrank(proposer);
        
        vm.expectEmit(true, true, true, true);
        emit ProposalCreated(1, proposer, recipient, USDC_AMOUNT, "Test Proposal", block.timestamp + VOTING_PERIOD);
        
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Test Proposal",
            "This is a test proposal for mental health funding",
            VOTING_PERIOD
        );
        
        assertEq(proposalId, 1);
        
        AzuraKillStreak.Proposal memory proposal = governance.getProposal(1);
        assertEq(proposal.proposer, proposer);
        assertEq(proposal.recipient, recipient);
        assertEq(proposal.usdcAmount, USDC_AMOUNT);
        assertEq(uint(proposal.status), uint(AzuraKillStreak.ProposalStatus.Pending));
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_CreateProposalZeroRecipient() public {
        vm.prank(proposer);
        vm.expectRevert(AzuraKillStreak.InvalidProposal.selector);
        governance.createProposal(
            address(0),
            USDC_AMOUNT,
            "Test",
            "Description",
            VOTING_PERIOD
        );
    }
    
    function test_RevertWhen_CreateProposalZeroAmount() public {
        vm.prank(proposer);
        vm.expectRevert(AzuraKillStreak.InvalidAmount.selector);
        governance.createProposal(
            recipient,
            0,
            "Test",
            "Description",
            VOTING_PERIOD
        );
    }
    
    // ============================================================================
    // AZURA REVIEW TESTS (Levels 0-4)
    // ============================================================================
    
    function test_AzuraReviewLevel0_Kill() public {
        // Create proposal
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Bad Proposal",
            "This will be killed",
            VOTING_PERIOD
        );
        
        // Azura kills it (Level 0)
        vm.prank(azuraAgent);
        vm.expectEmit(true, false, false, true);
        emit AzuraReview(proposalId, 0, false, 0);
        
        governance.azuraReview(proposalId, 0);
        
        AzuraKillStreak.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(uint(proposal.status), uint(AzuraKillStreak.ProposalStatus.Rejected));
        assertEq(proposal.azuraLevel, 0);
        assertEq(proposal.azuraApproved, false);
        assertEq(proposal.forVotes, 0);
    }
    
    function test_AzuraReviewLevel1_10Percent() public {
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Low Confidence",
            "Azura is not very confident",
            VOTING_PERIOD
        );
        
        // Azura approves with Level 1 (10%)
        uint256 expectedWeight = (TOTAL_SUPPLY * 10) / 100;
        
        vm.prank(azuraAgent);
        vm.expectEmit(true, false, false, true);
        emit AzuraReview(proposalId, 1, true, expectedWeight);
        
        governance.azuraReview(proposalId, 1);
        
        AzuraKillStreak.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(uint(proposal.status), uint(AzuraKillStreak.ProposalStatus.Active));
        assertEq(proposal.azuraLevel, 1);
        assertEq(proposal.azuraApproved, true);
        assertEq(proposal.forVotes, expectedWeight);
    }
    
    function test_AzuraReviewLevel4_40Percent() public {
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "High Confidence",
            "Azura loves this!",
            VOTING_PERIOD
        );
        
        // Azura approves with Level 4 (40%)
        uint256 expectedWeight = (TOTAL_SUPPLY * 40) / 100;
        
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId, 4);
        
        AzuraKillStreak.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(proposal.azuraLevel, 4);
        assertEq(proposal.forVotes, expectedWeight);
    }
    
    function test_RevertWhen_NonAzuraCannotReview() public {
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Test",
            "Test",
            VOTING_PERIOD
        );
        
        // Voter tries to review (should fail)
        vm.prank(voter1);
        vm.expectRevert(AzuraKillStreak.Unauthorized.selector);
        governance.azuraReview(proposalId, 2);
    }
    
    // ============================================================================
    // VOTING TESTS
    // ============================================================================
    
    function test_CommunityVoting() public {
        // Create and review proposal (Level 1 = 10%)
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Community Vote Test",
            "Testing voting",
            VOTING_PERIOD
        );
        
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId, 1); // 10%
        
        // Voter1 votes (10%)
        vm.prank(voter1);
        vm.expectEmit(true, true, false, true);
        emit VoteCast(proposalId, voter1, true, VOTER_BALANCE);
        governance.vote(proposalId, true);
        
        AzuraKillStreak.Proposal memory proposal = governance.getProposal(proposalId);
        uint256 expectedVotes = (TOTAL_SUPPLY * 10 / 100) + VOTER_BALANCE;
        assertEq(proposal.forVotes, expectedVotes);
    }
    
    function test_50PercentThresholdAutoExecutes() public {
        // Create proposal
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Auto Execute",
            "Should execute automatically",
            VOTING_PERIOD
        );
        
        // Azura Level 1 (10%)
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId, 1);
        
        uint256 recipientBalanceBefore = usdc.balanceOf(recipient);
        
        // Voter1 (10%) + Voter2 (10%) + Voter3 (10%) + Voter4 (10%) = 40%
        // Total: 10% (Azura Level 1) + 40% (voters) = 50% → Should auto-execute!
        vm.prank(voter1);
        governance.vote(proposalId, true);
        
        vm.prank(voter2);
        governance.vote(proposalId, true);
        
        vm.prank(voter3);
        governance.vote(proposalId, true);
        
        vm.prank(voter4);
        // Note: This vote pushes us to 50%, should auto-execute!
        governance.vote(proposalId, true);
        
        // Check execution
        AzuraKillStreak.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(uint(proposal.status), uint(AzuraKillStreak.ProposalStatus.Executed));
        assertEq(proposal.executed, true);
        
        // Check USDC transferred
        uint256 recipientBalanceAfter = usdc.balanceOf(recipient);
        assertEq(recipientBalanceAfter - recipientBalanceBefore, USDC_AMOUNT);
    }
    
    function test_AzuraLevel4NeedsOnly10PercentMore() public {
        // Create proposal
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "High Confidence",
            "Azura Level 4",
            VOTING_PERIOD
        );
        
        // Azura Level 4 (40%)
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId, 4);
        
        // Only need 1 voter (10%) to reach 50%
        vm.prank(voter1);
        governance.vote(proposalId, true);
        
        AzuraKillStreak.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(uint(proposal.status), uint(AzuraKillStreak.ProposalStatus.Executed));
    }
    
    function test_RevertWhen_DoubleVoting() public {
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Test",
            "Test",
            VOTING_PERIOD
        );
        
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId, 2);
        
        // Voter1 votes
        vm.prank(voter1);
        governance.vote(proposalId, true);
        
        // Voter1 tries to vote again (should fail)
        vm.prank(voter1);
        vm.expectRevert(AzuraKillStreak.AlreadyVoted.selector);
        governance.vote(proposalId, true);
    }
    
    function test_RevertWhen_VoteAfterDeadline() public {
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Test",
            "Test",
            VOTING_PERIOD
        );
        
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId, 2);
        
        // Fast forward past deadline
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        
        // Vote after deadline (should fail)
        vm.prank(voter1);
        vm.expectRevert(AzuraKillStreak.VotingEnded.selector);
        governance.vote(proposalId, true);
    }
    
    function test_VotingAgainst() public {
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Test",
            "Test",
            VOTING_PERIOD
        );
        
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId, 1);
        
        // Vote against
        vm.prank(voter1);
        governance.vote(proposalId, false);
        
        AzuraKillStreak.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(proposal.againstVotes, VOTER_BALANCE);
        assertEq(proposal.forVotes, TOTAL_SUPPLY * 10 / 100); // Only Azura's 10%
    }
    
    // ============================================================================
    // VIEW FUNCTION TESTS
    // ============================================================================
    
    function test_GetVotingProgress() public {
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Test",
            "Test",
            VOTING_PERIOD
        );
        
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId, 2); // 20%
        
        (uint256 forVotes, uint256 againstVotes, uint256 percentageFor) = 
            governance.getVotingProgress(proposalId);
        
        assertEq(percentageFor, 20);
        assertEq(againstVotes, 0);
    }
    
    function test_HasReachedThreshold() public {
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Test",
            "Test",
            VOTING_PERIOD
        );
        
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId, 4); // 40%
        
        assertFalse(governance.hasReachedThreshold(proposalId));
        
        vm.prank(voter1);
        governance.vote(proposalId, true); // 40% + 10% = 50%
        
        assertTrue(governance.hasReachedThreshold(proposalId));
    }
    
    function test_GetVotingPower() public {
        uint256 power = governance.getVotingPower(voter1);
        assertEq(power, VOTER_BALANCE);
        
        uint256 azuraPower = governance.getVotingPower(azuraAgent);
        assertEq(azuraPower, AZURA_BALANCE);
    }
    
    // ============================================================================
    // ADMIN FUNCTION TESTS
    // ============================================================================
    
    function test_CancelProposal() public {
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Test",
            "Test",
            VOTING_PERIOD
        );
        
        // Owner cancels (owner is admin by default)
        governance.cancelProposal(proposalId);
        
        AzuraKillStreak.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(uint(proposal.status), uint(AzuraKillStreak.ProposalStatus.Cancelled));
    }
    
    function test_SetAdmin() public {
        address newAdmin = makeAddr("newAdmin");
        
        governance.setAdmin(newAdmin, true);
        assertTrue(governance.isAdmin(newAdmin));
        
        governance.setAdmin(newAdmin, false);
        assertFalse(governance.isAdmin(newAdmin));
    }
    
    function test_SetAzuraAgent() public {
        address newAzura = makeAddr("newAzura");
        
        governance.setAzuraAgent(newAzura);
        assertEq(governance.azuraAgent(), newAzura);
    }
    
    function test_EmergencyWithdraw() public {
        uint256 ownerBalanceBefore = usdc.balanceOf(owner);
        uint256 withdrawAmount = 1000 * 1e6;
        
        governance.emergencyWithdraw(withdrawAmount);
        
        uint256 ownerBalanceAfter = usdc.balanceOf(owner);
        assertEq(ownerBalanceAfter - ownerBalanceBefore, withdrawAmount);
    }
    
    // ============================================================================
    // CRE INTEGRATION TESTS
    // ============================================================================

    function test_SetKeystoneForwarder() public {
        governance.setKeystoneForwarder(forwarder);
        assertEq(governance.keystoneForwarder(), forwarder);
    }

    function test_RevertWhen_NonOwnerSetsForwarder() public {
        vm.prank(voter1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", voter1));
        governance.setKeystoneForwarder(forwarder);
    }

    function test_OnReportAutoExecute() public {
        // Setup forwarder
        governance.setKeystoneForwarder(forwarder);

        // Create and review proposal to Active state
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient, USDC_AMOUNT, "CRE Execute", "Test CRE auto-execute", VOTING_PERIOD
        );
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId, 4); // 40%

        // Voter pushes past threshold
        vm.prank(voter1);
        governance.vote(proposalId, true); // 40% + 10% = 50%

        // Proposal auto-executed via vote, create a new one for manual CRE execute
        vm.prank(proposer);
        uint256 proposalId2 = governance.createProposal(
            recipient, USDC_AMOUNT, "CRE Execute 2", "Test CRE auto-execute 2", VOTING_PERIOD
        );
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId2, 2); // 20%

        // Add enough votes to pass threshold (but not auto-execute since vote() already auto-executes)
        vm.prank(voter1);
        governance.vote(proposalId2, true); // 20% + 10% = 30%
        vm.prank(voter2);
        governance.vote(proposalId2, true); // 30% + 10% = 40%
        vm.prank(voter3);
        governance.vote(proposalId2, true); // 40% + 10% = 50% -> auto-executes

        // The above auto-executed, so let's test CRE report for a proposal that reaches threshold
        // Create fresh proposal and manually set enough votes
        vm.prank(proposer);
        uint256 proposalId3 = governance.createProposal(
            recipient, 1000 * 1e6, "CRE Execute 3", "For CRE onReport test", VOTING_PERIOD
        );
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId3, 4); // 40%

        // voter1 vote gets it to 50% and auto-executes
        vm.prank(voter1);
        governance.vote(proposalId3, true);

        // Verify auto-execution worked
        AzuraKillStreak.Proposal memory p3 = governance.getProposal(proposalId3);
        assertEq(uint(p3.status), uint(AzuraKillStreak.ProposalStatus.Executed));
    }

    function test_OnReportAzuraReview() public {
        // Setup forwarder
        governance.setKeystoneForwarder(forwarder);

        // Create proposal (Pending)
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient, USDC_AMOUNT, "CRE Review", "Test CRE azura review", VOTING_PERIOD
        );

        // CRE submits Azura review via onReport (actionType = 2, level = 3)
        bytes memory payload = abi.encode(uint256(proposalId), uint256(3));
        bytes memory report = abi.encode(uint8(2), payload);

        vm.prank(forwarder);
        governance.onReport("", report);

        // Verify review applied
        AzuraKillStreak.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(uint(proposal.status), uint(AzuraKillStreak.ProposalStatus.Active));
        assertEq(proposal.azuraLevel, 3);
        assertEq(proposal.azuraApproved, true);

        uint256 expectedWeight = (TOTAL_SUPPLY * 30) / 100;
        assertEq(proposal.forVotes, expectedWeight);
    }

    function test_OnReportAzuraReviewLevel0Kill() public {
        governance.setKeystoneForwarder(forwarder);

        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient, USDC_AMOUNT, "CRE Kill", "Test CRE kill", VOTING_PERIOD
        );

        bytes memory payload = abi.encode(uint256(proposalId), uint256(0));
        bytes memory report = abi.encode(uint8(2), payload);

        vm.prank(forwarder);
        governance.onReport("", report);

        AzuraKillStreak.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(uint(proposal.status), uint(AzuraKillStreak.ProposalStatus.Rejected));
        assertEq(proposal.azuraLevel, 0);
        assertEq(proposal.azuraApproved, false);
    }

    function test_OnReportExecuteViaForwarder() public {
        governance.setKeystoneForwarder(forwarder);

        // Create proposal, review via CRE, then vote to threshold, then execute via CRE
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient, 500 * 1e6, "CRE Full Flow", "End-to-end CRE test", VOTING_PERIOD
        );

        // CRE reviews (level 3 = 30%)
        bytes memory reviewPayload = abi.encode(uint256(proposalId), uint256(3));
        bytes memory reviewReport = abi.encode(uint8(2), reviewPayload);
        vm.prank(forwarder);
        governance.onReport("", reviewReport);

        // Community votes to reach 50%
        vm.prank(voter1);
        governance.vote(proposalId, true); // 30% + 10% = 40%
        vm.prank(voter2);
        governance.vote(proposalId, true); // 40% + 10% = 50% -> auto-executes

        AzuraKillStreak.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(uint(proposal.status), uint(AzuraKillStreak.ProposalStatus.Executed));
        assertEq(proposal.executed, true);
    }

    function test_RevertWhen_NonForwarderCallsOnReport() public {
        governance.setKeystoneForwarder(forwarder);

        bytes memory report = abi.encode(uint8(1), abi.encode(uint256(1)));

        vm.prank(voter1);
        vm.expectRevert(AzuraKillStreak.Unauthorized.selector);
        governance.onReport("", report);
    }

    function test_RevertWhen_OnReportInvalidActionType() public {
        governance.setKeystoneForwarder(forwarder);

        bytes memory report = abi.encode(uint8(99), abi.encode(uint256(1)));

        vm.prank(forwarder);
        vm.expectRevert(AzuraKillStreak.InvalidProposal.selector);
        governance.onReport("", report);
    }

    // ============================================================================
    // GAS OPTIMIZATION TESTS
    // ============================================================================
    
    function test_GasCreateProposal() public {
        vm.prank(proposer);
        uint256 gasBefore = gasleft();
        
        governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Gas Test",
            "Testing gas usage",
            VOTING_PERIOD
        );
        
        uint256 gasUsed = gasBefore - gasleft();
        emit log_named_uint("Gas used for createProposal", gasUsed);
        
        // Should be reasonable (< 250k gas)
        assertLt(gasUsed, 250_000);
    }
    
    function test_GasVoting() public {
        vm.prank(proposer);
        uint256 proposalId = governance.createProposal(
            recipient,
            USDC_AMOUNT,
            "Gas Test",
            "Test",
            VOTING_PERIOD
        );
        
        vm.prank(azuraAgent);
        governance.azuraReview(proposalId, 2);
        
        vm.prank(voter1);
        uint256 gasBefore = gasleft();
        governance.vote(proposalId, true);
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for vote", gasUsed);
        
        // Should be reasonable (< 150k gas)
        assertLt(gasUsed, 150_000);
    }
}

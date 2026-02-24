// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";

/**
 * @title AzuraKillStreak
 * @notice Governance contract for Mental Wealth Academy proposals with token-weighted voting
 * @dev Azura AI holds 40% of governance tokens, 50% approval threshold required to pass proposals
 * 
 * Game Mechanics:
 * - 1 governance token = 1 vote
 * - Azura's confidence level (0-4) determines her approval level:
 *   Level 0: Reject (kills proposal)
 *   Level 1: 10% approval
 *   Level 2: 20% approval  
 *   Level 3: 30% approval
 *   Level 4: 40% approval (full support)
 * - 50% of total voting power needed to execute proposal
 * - Approved proposals transfer USDC to recipients
 */
contract AzuraKillStreak is Ownable, ReentrancyGuard {
    // ============================================================================
    // STATE VARIABLES
    // ============================================================================
    
    /// @notice Governance token used for voting (1 token = 1 vote)
    IERC20 public immutable governanceToken;
    
    /// @notice USDC token for proposal funding
    IERC20 public immutable usdcToken;
    
    /// @notice Azura AI agent address (holds 40% of governance tokens)
    address public azuraAgent;
    
    /// @notice Total supply of governance tokens
    uint256 public immutable totalGovernanceTokens;
    
    /// @notice Threshold for proposal approval (50% of total supply)
    uint256 public immutable approvalThreshold;
    
    /// @notice Proposal counter
    uint256 public proposalCount;

    /// @notice Chainlink CRE KeystoneForwarder address (delivers DON-signed reports)
    address public keystoneForwarder;
    
    // ============================================================================
    // STRUCTS
    // ============================================================================
    
    /// @notice Proposal status enum
    enum ProposalStatus {
        Pending,            // Created but not yet voted on by Azura
        Active,             // Azura voted, awaiting community votes
        Executed,           // Passed and USDC transferred
        Rejected,           // Failed to reach threshold or Azura killed it
        Cancelled           // Cancelled by proposer or admin
    }
    
    /// @notice Proposal struct
    struct Proposal {
        uint256 id;
        address proposer;
        address recipient;
        uint256 usdcAmount;         // Amount in USDC (6 decimals)
        string title;
        string description;
        uint256 createdAt;
        uint256 votingDeadline;
        ProposalStatus status;
        uint256 forVotes;           // Total tokens voted in favor
        uint256 againstVotes;       // Total tokens voted against
        uint256 azuraLevel;         // Azura's confidence level (0-4)
        bool azuraApproved;         // Did Azura approve?
        bool executed;
        uint256 snapshotBlock;      // Block number when proposal was created (for getPastVotes)
    }
    
    /// @notice Vote struct to track individual votes
    struct Vote {
        bool hasVoted;
        bool support;               // true = approve, false = reject
        uint256 weight;             // Number of tokens used to vote
    }
    
    // ============================================================================
    // STORAGE
    // ============================================================================
    
    /// @notice Mapping of proposal ID to Proposal
    mapping(uint256 => Proposal) public proposals;
    
    /// @notice Mapping of proposal ID to voter address to Vote
    mapping(uint256 => mapping(address => Vote)) public votes;
    
    /// @notice Mapping to track if address is an authorized admin
    mapping(address => bool) public isAdmin;
    
    // ============================================================================
    // EVENTS
    // ============================================================================
    
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
    
    event ProposalRejected(
        uint256 indexed proposalId,
        string reason
    );
    
    event ProposalCancelled(
        uint256 indexed proposalId,
        address indexed cancelledBy
    );
    
    // ============================================================================
    // ERRORS
    // ============================================================================
    
    error InvalidProposal();
    error ProposalNotActive();
    error AlreadyVoted();
    error InsufficientVotingPower();
    error VotingEnded();
    error ThresholdNotReached();
    error AlreadyExecuted();
    error Unauthorized();
    error InvalidAmount();
    error TransferFailed();
    
    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================
    
    /**
     * @notice Initialize the AzuraKillStreak governance contract
     * @param _governanceToken Address of governance token (for voting)
     * @param _usdcToken Address of USDC token (for funding)
     * @param _azuraAgent Address of Azura AI agent
     * @param _totalSupply Total supply of governance tokens
     */
    constructor(
        address _governanceToken,
        address _usdcToken,
        address _azuraAgent,
        uint256 _totalSupply
    ) Ownable(msg.sender) {
        if (_governanceToken == address(0) || _usdcToken == address(0) || _azuraAgent == address(0)) {
            revert InvalidProposal();
        }
        
        governanceToken = IERC20(_governanceToken);
        usdcToken = IERC20(_usdcToken);
        azuraAgent = _azuraAgent;
        totalGovernanceTokens = _totalSupply;
        
        // 50% threshold for approval
        approvalThreshold = (_totalSupply * 50) / 100;
        
        // Contract owner is admin
        isAdmin[msg.sender] = true;
    }
    
    // ============================================================================
    // MODIFIERS
    // ============================================================================
    
    modifier onlyAdmin() {
        if (!isAdmin[msg.sender]) revert Unauthorized();
        _;
    }
    
    modifier onlyAzura() {
        if (msg.sender != azuraAgent) revert Unauthorized();
        _;
    }

    modifier onlyForwarder() {
        if (msg.sender != keystoneForwarder) revert Unauthorized();
        _;
    }
    
    // ============================================================================
    // PROPOSAL CREATION
    // ============================================================================
    
    /**
     * @notice Create a new funding proposal
     * @param _recipient Address to receive USDC if approved
     * @param _usdcAmount Amount of USDC to request (6 decimals)
     * @param _title Proposal title
     * @param _description Proposal description (markdown supported)
     * @param _votingPeriod Duration of voting in seconds
     * @return proposalId The ID of the created proposal
     */
    function createProposal(
        address _recipient,
        uint256 _usdcAmount,
        string memory _title,
        string memory _description,
        uint256 _votingPeriod
    ) external returns (uint256) {
        if (_recipient == address(0)) revert InvalidProposal();
        if (_usdcAmount == 0) revert InvalidAmount();
        if (_usdcAmount > usdcToken.balanceOf(address(this))) revert InvalidAmount();
        if (bytes(_title).length == 0) revert InvalidProposal();
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.recipient = _recipient;
        proposal.usdcAmount = _usdcAmount;
        proposal.title = _title;
        proposal.description = _description;
        proposal.createdAt = block.timestamp;
        proposal.votingDeadline = block.timestamp + _votingPeriod;
        proposal.status = ProposalStatus.Pending;
        proposal.snapshotBlock = block.number;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            _recipient,
            _usdcAmount,
            _title,
            proposal.votingDeadline
        );
        
        return proposalId;
    }
    
    // ============================================================================
    // AZURA REVIEW (Level 0-4)
    // ============================================================================
    
    /**
     * @notice Azura reviews proposal and assigns confidence level
     * @param _proposalId ID of proposal to review
     * @param _level Confidence level (0-4)
     *        0 = Kill/Reject
     *        1 = 10% approval
     *        2 = 20% approval
     *        3 = 30% approval
     *        4 = 40% approval (full support)
     */
    function azuraReview(uint256 _proposalId, uint256 _level) external onlyAzura {
        Proposal storage proposal = proposals[_proposalId];
        
        if (proposal.status != ProposalStatus.Pending) revert ProposalNotActive();
        if (_level > 4) revert InvalidProposal();
        
        proposal.azuraLevel = _level;
        
        // Level 0 = Kill
        if (_level == 0) {
            proposal.status = ProposalStatus.Rejected;
            proposal.azuraApproved = false;
            
            emit AzuraReview(_proposalId, _level, false, 0);
            emit ProposalRejected(_proposalId, "Azura killed proposal (Level 0)");
            return;
        }
        
        // Level 1-4 = Approve with weight
        proposal.azuraApproved = true;
        proposal.status = ProposalStatus.Active;
        
        // Calculate Azura's vote weight (10%, 20%, 30%, or 40% of total supply)
        uint256 azuraVoteWeight = (totalGovernanceTokens * _level * 10) / 100;
        proposal.forVotes = azuraVoteWeight;
        
        // Record Azura's vote
        votes[_proposalId][azuraAgent] = Vote({
            hasVoted: true,
            support: true,
            weight: azuraVoteWeight
        });
        
        emit AzuraReview(_proposalId, _level, true, azuraVoteWeight);
        emit VoteCast(_proposalId, azuraAgent, true, azuraVoteWeight);
    }
    
    // ============================================================================
    // COMMUNITY VOTING
    // ============================================================================
    
    /**
     * @notice Cast a vote on an active proposal
     * @param _proposalId ID of proposal to vote on
     * @param _support true to approve, false to reject
     */
    function vote(uint256 _proposalId, bool _support) external nonReentrant {
        Proposal storage proposal = proposals[_proposalId];

        if (proposal.status != ProposalStatus.Active) revert ProposalNotActive();
        if (block.timestamp > proposal.votingDeadline) revert VotingEnded();
        if (votes[_proposalId][msg.sender].hasVoted) revert AlreadyVoted();

        // Check voter's voting power at snapshot block (prevents vote-transfer attacks)
        uint256 voterBalance = IVotes(address(governanceToken)).getPastVotes(msg.sender, proposal.snapshotBlock);
        if (voterBalance == 0) revert InsufficientVotingPower();
        
        // Record vote
        votes[_proposalId][msg.sender] = Vote({
            hasVoted: true,
            support: _support,
            weight: voterBalance
        });
        
        // Update vote counts
        if (_support) {
            proposal.forVotes += voterBalance;
        } else {
            proposal.againstVotes += voterBalance;
        }
        
        emit VoteCast(_proposalId, msg.sender, _support, voterBalance);
        
        // Auto-execute if threshold reached
        if (proposal.forVotes >= approvalThreshold) {
            _executeProposal(_proposalId);
        }
    }
    
    // ============================================================================
    // PROPOSAL EXECUTION
    // ============================================================================
    
    /**
     * @notice Execute an approved proposal
     * @param _proposalId ID of proposal to execute
     */
    function executeProposal(uint256 _proposalId) external nonReentrant {
        Proposal storage proposal = proposals[_proposalId];

        if (proposal.status != ProposalStatus.Active) revert ProposalNotActive();
        if (block.timestamp > proposal.votingDeadline) revert VotingEnded();
        if (proposal.forVotes < approvalThreshold) revert ThresholdNotReached();
        if (proposal.executed) revert AlreadyExecuted();

        _executeProposal(_proposalId);
    }
    
    /**
     * @notice Internal function to execute proposal
     * @param _proposalId ID of proposal to execute
     */
    function _executeProposal(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];
        
        proposal.executed = true;
        proposal.status = ProposalStatus.Executed;
        
        // Transfer USDC to recipient
        bool success = usdcToken.transfer(proposal.recipient, proposal.usdcAmount);
        if (!success) revert TransferFailed();
        
        emit ProposalExecuted(_proposalId, proposal.recipient, proposal.usdcAmount);
    }
    
    // ============================================================================
    // CRE (CHAINLINK RUNTIME ENVIRONMENT) INTEGRATION
    // ============================================================================

    /**
     * @notice Receive DON-signed reports from Chainlink CRE via KeystoneForwarder
     * @param metadata CRE metadata (unused, required by interface)
     * @param report ABI-encoded payload: (uint8 actionType, bytes payload)
     *        actionType 1 = Auto-execute proposal
     *        actionType 2 = Azura review from DON
     */
    function onReport(bytes calldata metadata, bytes calldata report) external onlyForwarder nonReentrant {
        (uint8 actionType, bytes memory payload) = abi.decode(report, (uint8, bytes));

        if (actionType == 1) {
            uint256 proposalId = abi.decode(payload, (uint256));
            Proposal storage proposal = proposals[proposalId];
            if (proposal.status != ProposalStatus.Active) revert ProposalNotActive();
            if (proposal.forVotes < approvalThreshold) revert ThresholdNotReached();
            if (proposal.executed) revert AlreadyExecuted();
            _executeProposal(proposalId);
        } else if (actionType == 2) {
            (uint256 proposalId, uint256 level) = abi.decode(payload, (uint256, uint256));
            _azuraReviewInternal(proposalId, level);
        } else {
            revert InvalidProposal();
        }
    }

    /**
     * @notice Internal Azura review callable by CRE onReport (bypasses onlyAzura)
     * @param _proposalId ID of proposal to review
     * @param _level Confidence level (0-4)
     */
    function _azuraReviewInternal(uint256 _proposalId, uint256 _level) internal {
        Proposal storage proposal = proposals[_proposalId];

        if (proposal.status != ProposalStatus.Pending) revert ProposalNotActive();
        if (_level > 4) revert InvalidProposal();

        proposal.azuraLevel = _level;

        if (_level == 0) {
            proposal.status = ProposalStatus.Rejected;
            proposal.azuraApproved = false;
            emit AzuraReview(_proposalId, _level, false, 0);
            emit ProposalRejected(_proposalId, "Azura killed proposal (Level 0)");
            return;
        }

        proposal.azuraApproved = true;
        proposal.status = ProposalStatus.Active;

        uint256 azuraVoteWeight = (totalGovernanceTokens * _level * 10) / 100;
        proposal.forVotes = azuraVoteWeight;

        votes[_proposalId][azuraAgent] = Vote({
            hasVoted: true,
            support: true,
            weight: azuraVoteWeight
        });

        emit AzuraReview(_proposalId, _level, true, azuraVoteWeight);
        emit VoteCast(_proposalId, azuraAgent, true, azuraVoteWeight);
    }

    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================

    /**
     * @notice Set the Chainlink CRE KeystoneForwarder address
     * @param _forwarder Address of the KeystoneForwarder on this chain
     */
    function setKeystoneForwarder(address _forwarder) external onlyOwner {
        keystoneForwarder = _forwarder;
    }

    /**
     * @notice Cancel a proposal (admin only)
     * @param _proposalId ID of proposal to cancel
     */
    function cancelProposal(uint256 _proposalId) external onlyAdmin {
        Proposal storage proposal = proposals[_proposalId];
        
        if (proposal.executed) revert AlreadyExecuted();
        
        proposal.status = ProposalStatus.Cancelled;
        
        emit ProposalCancelled(_proposalId, msg.sender);
    }
    
    /**
     * @notice Add or remove admin
     * @param _admin Address to modify
     * @param _status true to add, false to remove
     */
    function setAdmin(address _admin, bool _status) external onlyOwner {
        isAdmin[_admin] = _status;
    }
    
    /**
     * @notice Update Azura agent address
     * @param _newAzura New Azura agent address
     */
    function setAzuraAgent(address _newAzura) external onlyOwner {
        if (_newAzura == address(0)) revert InvalidProposal();
        azuraAgent = _newAzura;
    }
    
    /**
     * @notice Emergency withdraw USDC (owner only)
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        bool success = usdcToken.transfer(owner(), _amount);
        if (!success) revert TransferFailed();
    }
    
    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Get proposal details
     * @param _proposalId ID of proposal
     * @return Proposal struct
     */
    function getProposal(uint256 _proposalId) external view returns (Proposal memory) {
        return proposals[_proposalId];
    }
    
    /**
     * @notice Get vote details for a specific voter
     * @param _proposalId ID of proposal
     * @param _voter Address of voter
     * @return Vote struct
     */
    function getVote(uint256 _proposalId, address _voter) external view returns (Vote memory) {
        return votes[_proposalId][_voter];
    }
    
    /**
     * @notice Check if proposal has reached approval threshold
     * @param _proposalId ID of proposal
     * @return true if threshold reached
     */
    function hasReachedThreshold(uint256 _proposalId) external view returns (bool) {
        return proposals[_proposalId].forVotes >= approvalThreshold;
    }
    
    /**
     * @notice Get current voting progress
     * @param _proposalId ID of proposal
     * @return forVotes Total votes in favor
     * @return againstVotes Total votes against
     * @return percentageFor Percentage of total supply voting in favor
     */
    function getVotingProgress(uint256 _proposalId) 
        external 
        view 
        returns (
            uint256 forVotes,
            uint256 againstVotes,
            uint256 percentageFor
        ) 
    {
        Proposal memory proposal = proposals[_proposalId];
        forVotes = proposal.forVotes;
        againstVotes = proposal.againstVotes;
        percentageFor = (forVotes * 100) / totalGovernanceTokens;
    }
    
    /**
     * @notice Get current voting power of an address (requires delegation)
     * @param _voter Address to check
     * @return Voting power (delegated votes)
     */
    function getVotingPower(address _voter) external view returns (uint256) {
        return IVotes(address(governanceToken)).getVotes(_voter);
    }
}

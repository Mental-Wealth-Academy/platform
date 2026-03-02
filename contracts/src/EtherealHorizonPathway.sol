// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EtherealHorizonPathway
 * @notice On-chain seal system for the Mental Wealth Academy 14-milestone journey.
 *         When a week is sealed, it is permanently locked. A final reward triggers
 *         when all 14 milestones (Intro + 12 weeks + Epilogue) are sealed.
 * @dev Gasless pattern: the owner wallet pays gas on behalf of users (cheap on Base).
 */
contract EtherealHorizonPathway is Ownable, ReentrancyGuard {
    // ─── Constants ───────────────────────────────────────────────────────
    uint256 public constant TOTAL_WEEKS = 14; // weeks 0-13

    // ─── Types ───────────────────────────────────────────────────────────
    struct Seal {
        bool isSealed;
        bytes32 contentHash;
        uint256 timestamp;
    }

    // ─── Storage ─────────────────────────────────────────────────────────
    mapping(address => mapping(uint256 => Seal)) public seals;
    mapping(address => uint256) public sealedWeekCount;
    mapping(address => bool) public pathwayCompleted;

    // ─── Events ──────────────────────────────────────────────────────────
    event WeekSealed(
        address indexed user,
        uint256 indexed week,
        bytes32 contentHash,
        uint256 timestamp
    );

    event PathwayCompleted(
        address indexed user,
        uint256 timestamp
    );

    // ─── Errors ──────────────────────────────────────────────────────────
    error WeekAlreadySealed();
    error InvalidWeek();
    error Unauthorized();

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ─── Write ───────────────────────────────────────────────────────────

    /**
     * @notice Seal a week for a user. Only callable by the contract owner.
     * @param user        The user whose week is being sealed
     * @param week        The week number (0-13)
     * @param contentHash SHA-256 hash of the week's journal content
     */
    function sealWeek(
        address user,
        uint256 week,
        bytes32 contentHash
    ) external onlyOwner nonReentrant {
        if (week >= TOTAL_WEEKS) revert InvalidWeek();
        if (seals[user][week].isSealed) revert WeekAlreadySealed();

        seals[user][week] = Seal({
            isSealed: true,
            contentHash: contentHash,
            timestamp: block.timestamp
        });

        sealedWeekCount[user]++;

        emit WeekSealed(user, week, contentHash, block.timestamp);

        // Auto-check pathway completion
        if (sealedWeekCount[user] == TOTAL_WEEKS) {
            pathwayCompleted[user] = true;
            emit PathwayCompleted(user, block.timestamp);
        }
    }

    // ─── Views ───────────────────────────────────────────────────────────

    /**
     * @notice Check if a specific week is sealed for a user
     */
    function isWeekSealed(address user, uint256 week) external view returns (bool) {
        return seals[user][week].isSealed;
    }

    /**
     * @notice Get the number of sealed weeks for a user
     */
    function getSealedWeekCount(address user) external view returns (uint256) {
        return sealedWeekCount[user];
    }

    /**
     * @notice Check if a user has completed the full pathway
     */
    function hasCompletedPathway(address user) external view returns (bool) {
        return pathwayCompleted[user];
    }

    /**
     * @notice Get full seal data for a user's week
     */
    function getSeal(address user, uint256 week) external view returns (
        bool sealStatus,
        bytes32 contentHash,
        uint256 timestamp
    ) {
        Seal memory s = seals[user][week];
        return (s.isSealed, s.contentHash, s.timestamp);
    }
}

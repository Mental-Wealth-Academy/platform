// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/EtherealHorizonPathway.sol";

contract EtherealHorizonPathwayTest is Test {
    EtherealHorizonPathway public pathway;

    address public owner;
    address public user1;
    address public user2;
    address public nonOwner;

    bytes32 constant CONTENT_HASH_1 = keccak256("week0-content-user1");
    bytes32 constant CONTENT_HASH_2 = keccak256("week1-content-user1");

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        nonOwner = makeAddr("nonOwner");

        pathway = new EtherealHorizonPathway();
    }

    // ─── sealWeek ────────────────────────────────────────────────────────

    function test_sealWeek_success() public {
        pathway.sealWeek(user1, 0, CONTENT_HASH_1);

        assertTrue(pathway.isWeekSealed(user1, 0));
        assertEq(pathway.getSealedWeekCount(user1), 1);

        (bool sealStatus, bytes32 hash, uint256 ts) = pathway.getSeal(user1, 0);
        assertTrue(sealStatus);
        assertEq(hash, CONTENT_HASH_1);
        assertGt(ts, 0);
    }

    function test_sealWeek_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit EtherealHorizonPathway.WeekSealed(user1, 0, CONTENT_HASH_1, block.timestamp);

        pathway.sealWeek(user1, 0, CONTENT_HASH_1);
    }

    function test_sealWeek_multipleWeeks() public {
        pathway.sealWeek(user1, 0, CONTENT_HASH_1);
        pathway.sealWeek(user1, 1, CONTENT_HASH_2);

        assertEq(pathway.getSealedWeekCount(user1), 2);
        assertTrue(pathway.isWeekSealed(user1, 0));
        assertTrue(pathway.isWeekSealed(user1, 1));
    }

    function test_sealWeek_differentUsers() public {
        pathway.sealWeek(user1, 0, CONTENT_HASH_1);
        pathway.sealWeek(user2, 0, CONTENT_HASH_2);

        assertTrue(pathway.isWeekSealed(user1, 0));
        assertTrue(pathway.isWeekSealed(user2, 0));
        assertEq(pathway.getSealedWeekCount(user1), 1);
        assertEq(pathway.getSealedWeekCount(user2), 1);
    }

    // ─── Reverts ─────────────────────────────────────────────────────────

    function test_sealWeek_revertsDuplicate() public {
        pathway.sealWeek(user1, 0, CONTENT_HASH_1);

        vm.expectRevert(EtherealHorizonPathway.WeekAlreadySealed.selector);
        pathway.sealWeek(user1, 0, CONTENT_HASH_1);
    }

    function test_sealWeek_revertsInvalidWeek() public {
        vm.expectRevert(EtherealHorizonPathway.InvalidWeek.selector);
        pathway.sealWeek(user1, 14, CONTENT_HASH_1);
    }

    function test_sealWeek_revertsInvalidWeekHigh() public {
        vm.expectRevert(EtherealHorizonPathway.InvalidWeek.selector);
        pathway.sealWeek(user1, 100, CONTENT_HASH_1);
    }

    function test_sealWeek_revertsNonOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", nonOwner));
        pathway.sealWeek(user1, 0, CONTENT_HASH_1);
    }

    // ─── Pathway Completion ──────────────────────────────────────────────

    function test_pathwayCompletion() public {
        assertFalse(pathway.hasCompletedPathway(user1));

        // Seal all 14 weeks
        for (uint256 i = 0; i < 14; i++) {
            bytes32 hash = keccak256(abi.encodePacked("content-week-", i));
            pathway.sealWeek(user1, i, hash);
        }

        assertTrue(pathway.hasCompletedPathway(user1));
        assertEq(pathway.getSealedWeekCount(user1), 14);
    }

    function test_pathwayCompletion_emitsEvent() public {
        // Seal weeks 0-12
        for (uint256 i = 0; i < 13; i++) {
            bytes32 hash = keccak256(abi.encodePacked("content-week-", i));
            pathway.sealWeek(user1, i, hash);
        }

        assertFalse(pathway.hasCompletedPathway(user1));

        // Expect PathwayCompleted event on the final seal
        vm.expectEmit(true, false, false, true);
        emit EtherealHorizonPathway.PathwayCompleted(user1, block.timestamp);

        bytes32 finalHash = keccak256(abi.encodePacked("content-week-", uint256(13)));
        pathway.sealWeek(user1, 13, finalHash);
    }

    function test_pathwayNotCompleted_partial() public {
        // Seal only 5 weeks
        for (uint256 i = 0; i < 5; i++) {
            bytes32 hash = keccak256(abi.encodePacked("content-week-", i));
            pathway.sealWeek(user1, i, hash);
        }

        assertFalse(pathway.hasCompletedPathway(user1));
        assertEq(pathway.getSealedWeekCount(user1), 5);
    }

    // ─── View Functions ──────────────────────────────────────────────────

    function test_isWeekSealed_false() public view {
        assertFalse(pathway.isWeekSealed(user1, 0));
    }

    function test_getSealedWeekCount_zero() public view {
        assertEq(pathway.getSealedWeekCount(user1), 0);
    }

    function test_hasCompletedPathway_false() public view {
        assertFalse(pathway.hasCompletedPathway(user1));
    }

    function test_getSeal_unsealed() public view {
        (bool sealStatus, bytes32 hash, uint256 ts) = pathway.getSeal(user1, 0);
        assertFalse(sealStatus);
        assertEq(hash, bytes32(0));
        assertEq(ts, 0);
    }

    function test_totalWeeksConstant() public view {
        assertEq(pathway.TOTAL_WEEKS(), 14);
    }
}

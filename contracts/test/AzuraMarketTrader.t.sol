// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/AzuraMarketTrader.sol";
import "../src/MockPredictionMarket.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor(uint256 initialSupply) ERC20("USD Coin", "USDC") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract AzuraMarketTraderTest is Test {
    AzuraMarketTrader public trader;
    MockPredictionMarket public market;
    MockUSDC public usdc;

    address public owner;
    address public forwarder;
    address public user;

    uint256 public constant TREASURY_FUND = 100_000 * 1e6; // 100k USDC

    event TradeExecuted(
        uint256 indexed tradeId,
        uint256 indexed marketId,
        bool isYes,
        uint256 usdcAmount
    );

    function setUp() public {
        owner = address(this);
        forwarder = makeAddr("forwarder");
        user = makeAddr("user");

        usdc = new MockUSDC(1_000_000 * 1e6);
        market = new MockPredictionMarket(address(usdc));
        trader = new AzuraMarketTrader(address(usdc));

        trader.setPredictionMarket(address(market));
        trader.setKeystoneForwarder(forwarder);

        // Fund the trader treasury
        usdc.transfer(address(trader), TREASURY_FUND);
    }

    // ============================================================================
    // DEPLOYMENT TESTS
    // ============================================================================

    function test_Constructor() public view {
        assertEq(address(trader.usdcToken()), address(usdc));
        assertEq(trader.predictionMarket(), address(market));
        assertEq(trader.keystoneForwarder(), forwarder);
        assertEq(trader.tradeCount(), 0);
    }

    function test_TreasuryBalance() public view {
        assertEq(trader.treasuryBalance(), TREASURY_FUND);
    }

    // ============================================================================
    // TRADE EXECUTION TESTS (owner)
    // ============================================================================

    function test_ExecuteTrade_BuyYes() public {
        uint256 marketId = market.createMarket("ETH > 5k?");
        uint256 amount = 5000 * 1e6;

        vm.expectEmit(true, true, false, true);
        emit TradeExecuted(1, marketId, true, amount);

        uint256 tradeId = trader.executeTrade(marketId, true, amount);
        assertEq(tradeId, 1);
        assertEq(trader.tradeCount(), 1);

        // Verify position on market
        (uint256 yes, uint256 no) = market.getPosition(marketId, address(trader));
        assertEq(yes, amount);
        assertEq(no, 0);

        // Verify trade record
        AzuraMarketTrader.Trade memory t = trader.getTrade(1);
        assertEq(t.marketId, marketId);
        assertEq(t.isYes, true);
        assertEq(t.usdcAmount, amount);
        assertGt(t.executedAt, 0);
    }

    function test_ExecuteTrade_BuyNo() public {
        uint256 marketId = market.createMarket("Market downturn?");
        uint256 amount = 3000 * 1e6;

        trader.executeTrade(marketId, false, amount);

        (, uint256 no) = market.getPosition(marketId, address(trader));
        assertEq(no, amount);
    }

    function test_MultipleTrades() public {
        uint256 m1 = market.createMarket("BTC > 150k?");
        uint256 m2 = market.createMarket("SOL > 300?");

        trader.executeTrade(m1, true, 2000 * 1e6);
        trader.executeTrade(m2, false, 1000 * 1e6);
        trader.executeTrade(m1, true, 500 * 1e6);

        assertEq(trader.tradeCount(), 3);

        (uint256 yes,) = market.getPosition(m1, address(trader));
        assertEq(yes, 2500 * 1e6);
    }

    function test_RevertWhen_NonOwnerExecutesTrade() public {
        uint256 marketId = market.createMarket("Test?");

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user));
        trader.executeTrade(marketId, true, 1000 * 1e6);
    }

    function test_RevertWhen_ZeroAmount() public {
        uint256 marketId = market.createMarket("Test?");

        vm.expectRevert(AzuraMarketTrader.InvalidAmount.selector);
        trader.executeTrade(marketId, true, 0);
    }

    function test_RevertWhen_InsufficientBalance() public {
        uint256 marketId = market.createMarket("Test?");

        vm.expectRevert(AzuraMarketTrader.InsufficientBalance.selector);
        trader.executeTrade(marketId, true, TREASURY_FUND + 1);
    }

    function test_RevertWhen_NoPredictionMarket() public {
        trader.setPredictionMarket(address(0));
        uint256 marketId = 1; // doesn't matter, will fail before call

        vm.expectRevert(AzuraMarketTrader.InvalidMarket.selector);
        trader.executeTrade(marketId, true, 1000 * 1e6);
    }

    // ============================================================================
    // CRE INTEGRATION TESTS
    // ============================================================================

    function test_OnReport_ExecutesTrade() public {
        uint256 marketId = market.createMarket("CRE trade test?");
        uint256 amount = 4000 * 1e6;

        bytes memory report = abi.encode(uint256(marketId), true, uint256(amount));

        vm.prank(forwarder);
        vm.expectEmit(true, true, false, true);
        emit TradeExecuted(1, marketId, true, amount);
        trader.onReport("", report);

        (uint256 yes,) = market.getPosition(marketId, address(trader));
        assertEq(yes, amount);
        assertEq(trader.tradeCount(), 1);
    }

    function test_OnReport_BuyNo() public {
        uint256 marketId = market.createMarket("CRE NO test?");

        bytes memory report = abi.encode(uint256(marketId), false, uint256(2000 * 1e6));

        vm.prank(forwarder);
        trader.onReport("", report);

        (, uint256 no) = market.getPosition(marketId, address(trader));
        assertEq(no, 2000 * 1e6);
    }

    function test_RevertWhen_NonForwarderCallsOnReport() public {
        bytes memory report = abi.encode(uint256(1), true, uint256(1000 * 1e6));

        vm.prank(user);
        vm.expectRevert(AzuraMarketTrader.Unauthorized.selector);
        trader.onReport("", report);
    }

    // ============================================================================
    // TREASURY MANAGEMENT TESTS
    // ============================================================================

    function test_Deposit() public {
        uint256 depositAmount = 10_000 * 1e6;
        usdc.approve(address(trader), depositAmount);

        trader.deposit(depositAmount);
        assertEq(trader.treasuryBalance(), TREASURY_FUND + depositAmount);
    }

    function test_RevertWhen_DepositZero() public {
        vm.expectRevert(AzuraMarketTrader.InvalidAmount.selector);
        trader.deposit(0);
    }

    function test_Withdraw() public {
        uint256 withdrawAmount = 5000 * 1e6;
        uint256 ownerBefore = usdc.balanceOf(owner);

        trader.withdraw(withdrawAmount);

        assertEq(trader.treasuryBalance(), TREASURY_FUND - withdrawAmount);
        assertEq(usdc.balanceOf(owner), ownerBefore + withdrawAmount);
    }

    function test_RevertWhen_NonOwnerWithdraws() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user));
        trader.withdraw(1000 * 1e6);
    }

    function test_RevertWhen_WithdrawExceedsBalance() public {
        vm.expectRevert(AzuraMarketTrader.InsufficientBalance.selector);
        trader.withdraw(TREASURY_FUND + 1);
    }

    // ============================================================================
    // ADMIN TESTS
    // ============================================================================

    function test_SetPredictionMarket() public {
        address newMarket = makeAddr("newMarket");
        trader.setPredictionMarket(newMarket);
        assertEq(trader.predictionMarket(), newMarket);
    }

    function test_SetKeystoneForwarder() public {
        address newForwarder = makeAddr("newForwarder");
        trader.setKeystoneForwarder(newForwarder);
        assertEq(trader.keystoneForwarder(), newForwarder);
    }

    function test_RevertWhen_NonOwnerSetsMarket() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user));
        trader.setPredictionMarket(makeAddr("x"));
    }

    function test_RevertWhen_NonOwnerSetsForwarder() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user));
        trader.setKeystoneForwarder(makeAddr("x"));
    }

    // ============================================================================
    // MOCK PREDICTION MARKET TESTS
    // ============================================================================

    function test_MockMarket_CreateAndResolve() public {
        uint256 marketId = market.createMarket("Will it rain?");
        assertEq(market.marketCount(), marketId);

        market.resolveMarket(marketId, true);
        (,,, bool resolved, bool outcome) = market.getMarket(marketId);
        assertTrue(resolved);
        assertTrue(outcome);
    }

    function test_MockMarket_BuyAndVerify() public {
        uint256 marketId = market.createMarket("ETH > 5k?");

        address t = makeAddr("trader");
        usdc.mint(t, 5000 * 1e6);

        vm.startPrank(t);
        usdc.approve(address(market), 5000 * 1e6);
        market.buyOutcome(marketId, true, 3000 * 1e6);
        market.buyOutcome(marketId, false, 2000 * 1e6);
        vm.stopPrank();

        (uint256 yes, uint256 no) = market.getPosition(marketId, t);
        assertEq(yes, 3000 * 1e6);
        assertEq(no, 2000 * 1e6);

        (, uint256 totalYes, uint256 totalNo,,) = market.getMarket(marketId);
        assertEq(totalYes, 3000 * 1e6);
        assertEq(totalNo, 2000 * 1e6);
    }
}

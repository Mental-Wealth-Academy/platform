// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockPredictionMarket
 * @notice Simplified prediction market for CRE trade-execution demos.
 *         Accepts USDC to open YES/NO positions on binary-outcome markets.
 *         Not a real AMM — positions are tracked at cost basis for demonstration.
 */
contract MockPredictionMarket {
    IERC20 public immutable usdc;

    struct Market {
        string question;
        uint256 totalYes;
        uint256 totalNo;
        bool resolved;
        bool outcome;
    }

    struct Position {
        uint256 yesAmount;
        uint256 noAmount;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    uint256 public marketCount;

    event MarketCreated(uint256 indexed marketId, string question);
    event PositionOpened(uint256 indexed marketId, address indexed buyer, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool outcome);

    error InvalidMarket();
    error MarketAlreadyResolved();
    error TransferFailed();
    error InvalidAmount();

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Create a new binary prediction market
     * @param _question The market question (e.g. "Will BTC exceed $100k by June?")
     * @return marketId The new market's ID
     */
    function createMarket(string calldata _question) external returns (uint256) {
        marketCount++;
        markets[marketCount].question = _question;
        emit MarketCreated(marketCount, _question);
        return marketCount;
    }

    /**
     * @notice Buy a YES or NO position on a market with USDC
     * @param _marketId Market to trade on
     * @param _isYes    true = buy YES, false = buy NO
     * @param _amount   USDC amount (6 decimals)
     */
    function buyOutcome(uint256 _marketId, bool _isYes, uint256 _amount) external {
        if (_marketId == 0 || _marketId > marketCount) revert InvalidMarket();
        if (markets[_marketId].resolved) revert MarketAlreadyResolved();
        if (_amount == 0) revert InvalidAmount();

        bool ok = usdc.transferFrom(msg.sender, address(this), _amount);
        if (!ok) revert TransferFailed();

        if (_isYes) {
            markets[_marketId].totalYes += _amount;
            positions[_marketId][msg.sender].yesAmount += _amount;
        } else {
            markets[_marketId].totalNo += _amount;
            positions[_marketId][msg.sender].noAmount += _amount;
        }

        emit PositionOpened(_marketId, msg.sender, _isYes, _amount);
    }

    /**
     * @notice Resolve a market (mock — anyone can resolve for demo purposes)
     * @param _marketId Market to resolve
     * @param _outcome  true = YES wins, false = NO wins
     */
    function resolveMarket(uint256 _marketId, bool _outcome) external {
        if (_marketId == 0 || _marketId > marketCount) revert InvalidMarket();
        if (markets[_marketId].resolved) revert MarketAlreadyResolved();

        markets[_marketId].resolved = true;
        markets[_marketId].outcome = _outcome;
        emit MarketResolved(_marketId, _outcome);
    }

    // ── Views ────────────────────────────────────────────────────────────

    function getPosition(uint256 _marketId, address _holder)
        external
        view
        returns (uint256 yesAmount, uint256 noAmount)
    {
        Position memory p = positions[_marketId][_holder];
        return (p.yesAmount, p.noAmount);
    }

    function getMarket(uint256 _marketId)
        external
        view
        returns (string memory question, uint256 totalYes, uint256 totalNo, bool resolved, bool outcome)
    {
        Market memory m = markets[_marketId];
        return (m.question, m.totalYes, m.totalNo, m.resolved, m.outcome);
    }
}

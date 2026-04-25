// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TaQtik Escrow - locks player stakes for a match and pays the winner.
/// @notice Deploy on Monad testnet. The deployer is the rake/dispute keeper.
///         Both players stake the same amount. Winner takes 2 * stake minus 2.5% rake.
contract TaQtikEscrow {
    struct Match {
        address host;
        address joiner;
        uint256 stake;
        bool settled;
    }

    address public immutable keeper;
    uint16 public constant RAKE_BPS = 250; // 2.5%

    mapping(bytes32 => Match) public matches;

    event MatchCreated(bytes32 indexed matchId, address indexed host, uint256 stake);
    event MatchJoined(bytes32 indexed matchId, address indexed joiner);
    event MatchSettled(bytes32 indexed matchId, address indexed winner, uint256 payout);
    event MatchCancelled(bytes32 indexed matchId);

    error AlreadyExists();
    error NotFound();
    error WrongStake();
    error NotKeeper();
    error AlreadySettled();
    error NotPlayer();

    constructor() {
        keeper = msg.sender;
    }

    function createMatch(bytes32 matchId) external payable {
        if (matches[matchId].host != address(0)) revert AlreadyExists();
        if (msg.value == 0) revert WrongStake();
        matches[matchId] = Match({
            host: msg.sender,
            joiner: address(0),
            stake: msg.value,
            settled: false
        });
        emit MatchCreated(matchId, msg.sender, msg.value);
    }

    function joinMatch(bytes32 matchId) external payable {
        Match storage m = matches[matchId];
        if (m.host == address(0)) revert NotFound();
        if (m.joiner != address(0) || m.settled) revert AlreadySettled();
        if (msg.value != m.stake) revert WrongStake();
        m.joiner = msg.sender;
        emit MatchJoined(matchId, msg.sender);
    }

    function settleMatch(bytes32 matchId, address winner) external {
        if (msg.sender != keeper) revert NotKeeper();
        Match storage m = matches[matchId];
        if (m.host == address(0)) revert NotFound();
        if (m.settled) revert AlreadySettled();
        if (winner != m.host && winner != m.joiner) revert NotPlayer();
        m.settled = true;
        uint256 pot = m.stake * (m.joiner == address(0) ? 1 : 2);
        uint256 rake = (pot * RAKE_BPS) / 10000;
        uint256 payout = pot - rake;
        (bool ok, ) = winner.call{value: payout}("");
        require(ok, "payout failed");
        if (rake > 0) {
            (bool ok2, ) = keeper.call{value: rake}("");
            require(ok2, "rake failed");
        }
        emit MatchSettled(matchId, winner, payout);
    }

    function cancelMatch(bytes32 matchId) external {
        Match storage m = matches[matchId];
        if (m.host == address(0)) revert NotFound();
        if (m.settled) revert AlreadySettled();
        if (msg.sender != m.host && msg.sender != keeper) revert NotKeeper();
        if (m.joiner != address(0)) revert AlreadySettled();
        m.settled = true;
        (bool ok, ) = m.host.call{value: m.stake}("");
        require(ok, "refund failed");
        emit MatchCancelled(matchId);
    }
}

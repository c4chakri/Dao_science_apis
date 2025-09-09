// SPDX-License-Identifier: MIT
/**
 * @title Proposal Contract
 * @author c4Chakri
 * @dev Handles the lifecycle of a proposal within a DAO, including creation, voting, and execution of associated actions.
 */
pragma solidity ^0.8.21;

import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {IProposal} from "./IProposal.sol";
import {DAO} from "./Dao.sol";

contract Proposal is IProposal {
    // State Variables
    address public daoAddress; // Address of the associated DAO contract
    address public proposerAddress; // Address of the proposal creator
    address public governanceTokenAddress; // Address of the governance token

    string public proposalTitle; // Title of the proposal
    string public proposalDescription; // Description of the proposal

    uint256 public yesVotes; // Total "yes" votes
    uint256 public noVotes; // Total "no" votes
    uint256 public abstainVotes; // Total abstain votes
    uint32 public startTime; // Proposal start time
    uint32 public endTime; // Proposal end time

    uint8 public status; // Current status of the proposal: 0 (not started), 1 (active), 2 (approved), 3 (executed)
    uint8 public minimumParticipationPercentage; // Minimum participation required for the proposal
    uint8 public supportThresholdPercentage; // Minimum "yes" vote percentage for approval
    uint256 public minimumDurationForProposal; // Minimum duration for proposal voting
    bool public executed; // Whether the proposal has been executed
    bool public approved; // Whether the proposal has been approved
    bool public earlyExecution; // Whether early execution is allowed
    bool public canVoteChange; // Whether voters can change their vote
    DAO public dao; // Reference to the DAO contract
    Action[] public actions; // List of actions to execute upon proposal approval

    uint256 public minApproval; // Minimum approval required for multi-signature DAOs

    mapping(address => bool) public hasVoted; // Tracks whether an address has voted

    // Errors
    error InvalidVoteType(string expected, uint256 actual);
    error UnAuthorized();
    error InsufficientPower();
    error ZeroSupply();
    error ProposalNotExist();
    error NotStarted();
    error AlreadyVoted();
    error ProposalAlreadyExecuted();
    error VotingEnded();
    error ProposalNotApproved();
    error ActionExecutionFailed();

    // Modifiers
    /**
     * @dev Ensures that the caller is authorized and the proposal is in a valid voting state.
     */
    modifier canVote() {
        require(dao.canInteract(msg.sender), UnAuthorized());
        require(status > 0, ProposalNotExist());
        require(!executed, ProposalAlreadyExecuted());
        require(!hasVoted[msg.sender], AlreadyVoted());
        require(block.timestamp >= startTime, NotStarted());
        require(block.timestamp <= endTime, VotingEnded());
        _;
    }

    /**
     * @dev Ensures that the proposal is eligible for execution.
     */
    modifier canExecute() {
        require(dao.canInteract(msg.sender), UnAuthorized());
        require(!executed, ProposalAlreadyExecuted());
        require(approved, ProposalNotApproved());
        _;
    }

    /**
     * @dev Initializes a new proposal.
     *
     * @param _daoAddress Address of the DAO associated with the proposal.
     * @param _proposerAddress Address of the user proposing this proposal.
     * @param _minApproval Minimum approvals required for execution in multi-sign DAOs.
     * @param _title Title of the proposal.
     * @param _description Description of the proposal.
     * @param _startTime Start time for voting on the proposal.
     * @param _duration Duration for which voting is allowed.
     * @param actionId ID of the action associated with the proposal.
     * @param _actions Array of actions to be executed if the proposal is approved.
     *
     * Requirements:
     * - `_proposerAddress` must be authorized by the DAO.
     * - If the DAO requires token-based approval, the proposer must meet the minimum token threshold.
     */
    constructor(
        address _daoAddress,
        address _proposerAddress,
        uint256 _minApproval,
        string memory _title,
        string memory _description,
        uint32 _startTime,
        uint32 _duration,
        uint8 actionId,
        Action[] memory _actions
    ) {
        daoAddress = _daoAddress;
        dao = DAO(payable(daoAddress));
        governanceTokenAddress = address(dao.governanceToken());
        proposerAddress = _proposerAddress;
        minApproval = _minApproval;

        (bool isTokenBased, uint256 miniReqToken) = dao
            ._proposalCreationSettings();
        require(dao.canInteract(_proposerAddress), UnAuthorized());
        if (isTokenBased) {
            require(
                miniReqToken <= _getVotingUnits(_proposerAddress),
                InsufficientPower()
            );
        }

        proposalTitle = _title;
        proposalDescription = _description;
        startTime = _startTime;
        endTime = startTime + _duration;
        dao.configureProposal(
            address(this),
            _proposerAddress,
            _title,
            actionId
        );

        (
            uint8 _minimumParticipationPercentage,
            uint8 _supportThresholdPercentage,
            uint32 _minimumDurationForProposal,
            bool _earlyExecution,
            bool _canVoteChange
        ) = dao.governanceSettings();

        minimumParticipationPercentage = _minimumParticipationPercentage;
        supportThresholdPercentage = _supportThresholdPercentage;
        minimumDurationForProposal = _minimumDurationForProposal;
        earlyExecution = _earlyExecution;
        canVoteChange = _canVoteChange;
        status = 1;

        for (uint8 i = 0; i < _actions.length; i++) {
            actions.push(_actions[i]);
        }
    }

    /**
     * @dev Private function to retrieve the voting units of a given account.
     *
     * @param account Address of the account.
     * @return The number of voting units the account possesses.
     */

    function _getVotingUnits(address account) public view returns (uint256) {
    if (dao.isMultiSignDAO()) {
        return 1;
    } else {
        ERC20Votes erc20 = ERC20Votes(governanceTokenAddress);

        // Calculate votes based on delegation status
        if (erc20.delegates(account) == address(0)) {
            return erc20.balanceOf(account) + erc20.getVotes(account);
        } else if (erc20.delegates(account) == account) {
            return erc20.getVotes(account);
        } else {
            return 0; // Votes delegated to another account
        }
    }
}

    /**
     * @dev Allows an eligible user to cast their vote on the proposal.
     *
     * @param _voteOption Voting option chosen by the user:
     * - 1: Yes
     * - 2: No
     * - 3: Abstain
     *
     * Requirements:
     * - Caller must meet the `canVote` modifier conditions.
     * - Caller must hold sufficient voting power.
     *
     * Effects:
     * - Updates the respective vote count based on the user's choice.
     * - Marks the caller as having voted.
     * - For multi-sign DAOs, checks if minimum approvals are met for automatic approval.
     * - For token-based DAOs, calculates approval based on participation and support thresholds.
     */
    function vote(uint8 _voteOption) external canVote {
        uint256 votes = _getVotingUnits(msg.sender);
        require(votes > 0, InsufficientPower());

        if (_voteOption == 1) {
            yesVotes += votes;
        } else if (_voteOption == 2) {
            noVotes += votes;
        } else if (_voteOption == 3) {
            abstainVotes += votes;
        } else {
            revert InvalidVoteType({
                expected: "1 or 2 or 3",
                actual: _voteOption
            });
        }

        hasVoted[msg.sender] = true;

        if (dao.isMultiSignDAO()) {
            if (yesVotes >= minApproval) {
                approved = true;
                status = 2;
            } else {
                approved = false;
            }
        } else {
            uint256 totalSupply = ERC20Votes(governanceTokenAddress)
                .totalSupply();
            require(totalSupply > 0, ZeroSupply());

            uint256 totalVotes = yesVotes + noVotes + abstainVotes;
            uint256 tokenParticipation = (totalVotes * 100) / totalSupply;
            uint256 yesVotesPercentage = (yesVotes * 100) / totalVotes;

            if (
                yesVotesPercentage >= supportThresholdPercentage &&
                tokenParticipation >= minimumParticipationPercentage
            ) {
                approved = yesVotes > noVotes;
                status = 2;
            } else {
                approved = false;
            }
        }
    }

    /**
     * @dev Executes the proposal if approved and conditions are met.
     *
     * Requirements:
     * - Caller must meet the `canExecute` modifier conditions.
     * - Proposal must have reached its end time or allow early execution.
     *
     * Effects:
     * - Marks the proposal as executed.
     * - Updates the proposal's status to executed (status = 3).
     * - Executes all associated actions in order.
     * - Reverts if any action fails to execute.
     */
    function executeProposal() external canExecute {
        if (earlyExecution || block.timestamp >= endTime) {
            executed = true;
            status = 3;
            for (uint256 i = 0; i < actions.length; i++) {
                Action memory action = actions[i];
                (bool success, ) = action.to.call{value: action.value}(
                    action.data
                );
                require(success, ActionExecutionFailed());
            }
        }
    }
}

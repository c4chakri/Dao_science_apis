// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract NBGovernor is Ownable {
    using SafeMath for uint256;

    // Token used for voting
    ERC20Votes public governanceToken;

    // Proposal struct
    struct Proposal {
        address proposer;
        uint256 startTime;
        uint256 endTime;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        bool passed;
        string description;
        bytes actionsData; // Serialized actions data
    }

    // Action struct
    struct Action {
        ActionType actionType;
        address to;
        uint256 amount;
        bytes data;
    }

    // Enum to represent the type of action
    enum ActionType {
        Mint,
        TransferFromTreasury,
        SmartContractCall
    }

    // Array of proposals
    Proposal[] public proposals;

    // Proposal threshold and quorum
    uint256 public proposalThreshold;
    uint256 public quorum;

    // Voting delay and early execution
    uint256 public votingDelay;
    uint256 public earlyExecutionWindow;

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description
    );
    event Voted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event SmartContractCall(address contractAddress);

    // Constructor
    constructor(
        ERC20Votes _governanceToken,
        uint256 _proposalThreshold,
        uint256 _quorum,
        uint256 _votingDelay,
        uint256 _earlyExecutionWindow
    ) Ownable(msg.sender) {
        governanceToken = _governanceToken;
        proposalThreshold = _proposalThreshold;
        quorum = _quorum;
        votingDelay = _votingDelay;
        earlyExecutionWindow = _earlyExecutionWindow;
    }

    // Create a new proposal
    function createProposal(
        string memory _description,
        Action[] memory _actions
    ) external {
        require(
            governanceToken.getVotes(msg.sender) >= proposalThreshold,
            "Insufficient tokens"
        );
        uint256 startTime = block.timestamp.add(votingDelay);
        uint256 endTime = startTime.add(earlyExecutionWindow);

        // Serialize the actions array to bytes
        bytes memory actionsData = abi.encode(_actions);

        proposals.push(
            Proposal(
                msg.sender,
                startTime,
                endTime,
                0,
                0,
                false,
                false,
                _description,
                actionsData
            )
        );
        emit ProposalCreated(proposals.length - 1, msg.sender, _description);
    }

    // Vote on a proposal
    function vote(uint256 _proposalId, bool _support) external {
        require(
            block.timestamp >= proposals[_proposalId].startTime,
            "Voting not started"
        );
        require(
            block.timestamp <= proposals[_proposalId].endTime,
            "Voting ended"
        );
        require(
            governanceToken.getVotes(msg.sender) > 0,
            "You must have tokens to vote"
        );

        if (_support) {
            proposals[_proposalId].votesFor = proposals[_proposalId]
                .votesFor
                .add(governanceToken.getVotes(msg.sender));
        } else {
            proposals[_proposalId].votesAgainst = proposals[_proposalId]
                .votesAgainst
                .add(governanceToken.getVotes(msg.sender));
        }

        emit Voted(_proposalId, msg.sender, _support);
    }

    // Execute a proposal
    function executeProposal(uint256 _proposalId) external onlyOwner {
        require(!proposals[_proposalId].executed, "Proposal already executed");
        require(
            block.timestamp > proposals[_proposalId].endTime,
            "Voting still in progress"
        );

        // Check for quorum
        uint256 totalVotes = proposals[_proposalId].votesFor.add(
            proposals[_proposalId].votesAgainst
        );
        require(
            totalVotes.mul(100).div(governanceToken.totalSupply()) >= quorum,
            "Quorum not reached"
        );

        // Check if the proposal passed
        proposals[_proposalId].passed =
            proposals[_proposalId].votesFor >
            proposals[_proposalId].votesAgainst;

        // Execute the proposal based on your logic
        if (proposals[_proposalId].passed) {
            _executeActions(_proposalId);
            emit ProposalExecuted(_proposalId);
        }

        proposals[_proposalId].executed = true;
    }

    // Internal function to execute actions in a proposal
    function _executeActions(uint256 _proposalId) internal {
        // Deserialize the actions data to an array of Action structs
        Action[] memory actions = abi.decode(
            proposals[_proposalId].actionsData,
            (Action[])
        );

        for (uint256 i = 0; i < actions.length; i++) {
            Action memory action = actions[i];

            if (action.actionType == ActionType.Mint) {
                _mint(action.to, action.amount);
            } else if (action.actionType == ActionType.TransferFromTreasury) {
                address payable toPayable = payable(action.to);
                _transferFromTreasury(toPayable, action.amount);
            } else if (action.actionType == ActionType.SmartContractCall) {
                emit SmartContractCall(action.to);
            }
        }
    }

    // Internal function to mint new governance tokens
    function _mint(address _to, uint256 _amount) internal {
        require(_to != address(0), "Invalid address");

        // Assuming governanceToken follows the ERC-20 standard
        // Make sure to replace "transfer" with the actual function for minting in your token contract
        require(
            governanceToken.transfer(_to, _amount),
            "Token transfer failed"
        );
    }

    // Internal function to transfer ETH from DAO treasury
    function _transferFromTreasury(address payable _to, uint256 _amount)
        internal
    {
        require(_to != address(0), "Invalid address");
        require(address(this).balance >= _amount, "Insufficient ETH balance");
        _to.transfer(_amount);
    }

    // Get the total number of proposals
    function getProposalsCount() external view returns (uint256) {
        return proposals.length;
    }

    // Get details about a specific proposal by ID
    function getProposalById(uint256 _proposalId)
        external
        view
        returns (Proposal memory)
    {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        return proposals[_proposalId];
    }
}
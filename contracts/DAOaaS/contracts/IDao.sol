// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * @title IDAO
 * @author c4Chackri
 * @dev Interface defining the structure and core functions for a DAO (Decentralized Autonomous Organization).
 */
interface IDAO {
    /**
     * @dev Struct representing a proposal's information.
     * @param deployedProposalAddress The address of the deployed proposal contract.
     * @param creator The address of the proposal creator.
     * @param title The title of the proposal.
     * @param id The unique identifier for the proposal.
     */
    struct ProposalInfo {
        address deployedProposalAddress;
        address creator;
        string title;
        uint256 id;
    }

    /**
     * @dev Struct representing a DAO member's information.
     * @param memberAddress The address of the DAO member.
     * @param deposit The amount deposited by the member into the DAO.
     */
    struct DAOMember {
        address memberAddress;
        uint256 deposit;
    }

    /**
     * @dev Enum representing the types of actions a DAO can execute.
     * @param Mint Represents a token minting action.
     * @param Withdraw Represents a withdrawal of funds or tokens.
     * @param AddDaoMembers Represents adding new members to the DAO.
     * @param RemoveDaoMembers Represents removing members from the DAO.
     * @param DaoSetting Represents updating the DAO's settings.
     * @param Burn Represents a token burning action.
     */
    enum ActionType {
        Mint,           // 0
        Withdraw,       // 1
        AddDaoMembers,  // 2
        RemoveDaoMembers, // 3
        DaoSetting,     // 4
        Burn            // 5
    }

    /**
     * @dev Struct representing governance settings for the DAO.
     * @param minimumParticipationPercentage The minimum percentage of participation required for a proposal.
     * @param supportThresholdPercentage The percentage of votes required to approve a proposal.
     * @param minimumDurationForProposal The minimum duration (in seconds) for a proposal.
     * @param earlyExecution Indicates if proposals can be executed early upon approval.
     * @param canVoteChange Indicates if voters can change their votes.
     */
    struct GovernanceSettings {
        uint8 minimumParticipationPercentage;
        uint8 supportThresholdPercentage;
        uint32 minimumDurationForProposal;
        bool earlyExecution;
        bool canVoteChange;
    }

    /**
     * @dev Struct representing the parameters for a governance token.
     * @param name The name of the governance token.
     * @param symbol The symbol of the governance token.
     * @param councilAddress The address of the council managing the token.
     */
    struct GovernanceTokenParams {
        string name;
        string symbol;
        address councilAddress;
    }

    /**
     * @dev Struct representing the settings for a DAO.
     * @param name The name of the DAO.
     * @param data Additional configuration data for the DAO.
     */
    struct DaoSettings {
        string name;
        bytes data;
    }

    /**
     * @dev Struct representing the settings for creating a proposal.
     * @param isTokenBasedProposal Indicates if the proposal is token-based.
     * @param MinimumRequirement The minimum requirement for proposal creation (e.g., stake or deposit).
     */
    struct ProposalCreationSettings {
        bool isTokenBasedProposal;
        uint256 MinimumRequirement;
    }

    /**
     * @dev Deposits Ether into the DAO treasury.
     * @param _amount The amount of Ether to deposit.
     */
    // function depositToDAOTreasury(uint256 _amount) external payable;

    /**
     * @dev Withdraws Ether from the DAO treasury.
     * @param _to The recipient address for the Ether.
     * @param amount The amount of Ether to withdraw.
     */
    function withdrawFromDAOTreasury(
      
        address _to,
        uint256 amount
    ) external;

    /**
     * @dev Deposits tokens into the DAO treasury.
     * @param _token The address of the token to deposit.
     * @param _amount The amount of tokens to deposit.
     */
    // function depositTokens(address _token, uint256 _amount) external;

    /**
     * @dev Withdraws tokens from the DAO treasury.
     * @param _token The address of the token to withdraw.
     * @param _to The recipient address for the tokens.
     * @param _amount The amount of tokens to withdraw.
     */
    function withdrawTokens(
        address _token,
        address _to,
        uint256 _amount
    ) external;
}

// SPDX-License-Identifier: MIT

/**
 * @title DAO
 * @author c4Chackri
 * @dev This contract is a decentralized autonomous organization (DAO) allowing
 *      members to create and vote on proposals. It is based on OpenZeppelin's
 *      ERC20Votes contract and includes roles for minting, burning, pausing,
 *      and changing the owner of the governance token.
 */

pragma solidity ^0.8.21;

import {GovernanceToken, ReentrancyGuard, AccessControl, ERC20} from "./GovernanceToken.sol";
import {IDAO} from "./IDao.sol";
import {DaoManagement} from "./DaoManagement.sol";

contract DAO is IDAO, ReentrancyGuard {
    /**
     * @dev The governance token used for voting and staking within the DAO.
     */
    GovernanceToken public immutable governanceToken;

    /**
     * @dev DAO settings including parameters like quorum and voting period.
     */
    DaoSettings public _daoSettings;

    /**
     * @dev Settings related to proposal creation, such as required deposit.
     */
    ProposalCreationSettings public _proposalCreationSettings;

    /**
     * @dev Governance settings including parameters like treasury limits.
     */
    GovernanceSettings public governanceSettings;

    address private daoMangementAddress;
    /**
     * @dev Address of the creator of the DAO.
     */
    address public immutable DaoCreator;

    /**
     * @dev Indicates if the DAO is multi-signature enabled.
     */
    bool public isMultiSignDAO;

    /**
     * @dev Counter for tracking proposal IDs.
     */
    uint256 public proposalId;

    /**
     * @dev Counter for tracking the number of DAO members.
     */
    uint256 public membersCount;

    /**
     * @dev Mapping of proposal ID to proposal information.
     */
    mapping(uint256 => ProposalInfo) public proposals;

    /**
     * @dev Mapping to track blacklisted addresses.
     */
    mapping(address => bool) public blacklisted;

    /**
     * @dev Mapping to check if an address is a DAO member.
     */
    mapping(address => bool) public isDAOMember;

    /**
     * @dev Mapping to check if an address is a proposal contract.
     */
    mapping(address => bool) public isProposal;

    /**
     * @dev Mapping of addresses to their treasury balance.
     */
    mapping(address => uint256) public treasuryBalance;

    /**
     * @dev Mapping of addresses to the token and amount of tokens deposited by the user.
     */
    // mapping(address => mapping(address => uint256)) public tokenDeposited;

    /**
     * @dev Mapping of addresses to the amount of tokens deposited.
     */

    mapping (address=>address) public delegator;
    struct DepositedTokens {
        address token;
        uint256 balance;
    }

    struct TokenBalance {
        address token;
        uint256 balance;
    }

    mapping(address => DepositedTokens[]) public tokenDeposited;
    mapping(address => uint256) public totalTokenDeposits;

    // Array to store all unique token addresses
    address[] private treasuryTokens;
    // Mapping to check if a token is already in the treasury list
    mapping(address => bool) private isTokenInTreasury;

    // Custom error messages for specific conditions in the DAO contract
    error DAOBlacklistedAddress();
    error DAONotADaoMember();
    error DAOInsufficientBalance();
    error DAOInvalidAmount();
    error DepositsMisMatch(uint256 expected, uint256 actual);
    error DAOInsufficientAllowanceGovernanceToken();
    error DAOUnAuthorizedInteraction();
    error NotAFreshGovernanceToken();

    modifier notBlacklisted(address account) {
        if (blacklisted[account]) revert DAOBlacklistedAddress();
        _;
    }
    modifier _isProposal(address account) {
        require(isProposal[account], DAOUnAuthorizedInteraction());
        _;
    }
    modifier canInteractWithDAO(address account) {
        require(
            isDAOMember[account] || isProposal[msg.sender],
            DAONotADaoMember() 
        );

        if (blacklisted[account]) revert DAOBlacklistedAddress();
        _;
    }

    /**
     * @dev Initializes the DAO with the provided parameters.
     * @param daoManagementAddress The address of the DAO management contract.
     * @param _daoParams Initial settings for the DAO.
     * @param _governanceToken Address of an existing governance token or zero to create a new token.
     * @param _GovernanceTokenParams Parameters for governance token creation.
     * @param _governanceSettings Governance configuration settings.
     * @param _daoMembers Initial members of the DAO.
     * @param _proposalCreationParams Settings for creating proposals in the DAO.
     * @param _isMultiSignDAO Flag indicating if the DAO requires multi-signature for actions.
     */

    constructor(
        address daoManagementAddress,
        DaoSettings memory _daoParams,
        address _governanceToken,
        GovernanceTokenParams memory _GovernanceTokenParams,
        GovernanceSettings memory _governanceSettings,
        DAOMember[] memory _daoMembers,
        ProposalCreationSettings memory _proposalCreationParams,
        bool _isMultiSignDAO
    ) {
        daoMangementAddress = daoManagementAddress;
        DaoManagement daoManagement = DaoManagement(daoManagementAddress);
        isMultiSignDAO = _isMultiSignDAO;
        if (!isMultiSignDAO) {
            governanceToken = _governanceToken != address(0)
                ? GovernanceToken(_governanceToken)
                : GovernanceToken(
                    daoManagement.createGovernanceToken(_GovernanceTokenParams)
                );
            governanceToken.setDAOAddress(address(this));
        }
        governanceSettings = _governanceSettings;
        _daoSettings = _daoParams;
        _proposalCreationSettings = _proposalCreationParams;
        DaoCreator = _GovernanceTokenParams.councilAddress;
        isDAOMember[msg.sender] = true;
        addDAOMembers(_daoMembers);
    }

    /**
     * @dev Allows members to deposit funds to the DAO's treasury.
     * @param _amount The amount (in wei) to deposit.
     */

    // function depositToDAOTreasury(uint256 _amount)
    //     external
    //     payable
    //     canInteractWithDAO(msg.sender)
    // {
    //     require(msg.value == _amount, "Incorrect amount sent");
    //     treasuryBalance[msg.sender] += _amount;
    // }

    /**
     * @dev Withdraws funds from the DAO treasury.
     * @param _to The recipient address.
     * @param amount The amount to withdraw.
     */
    function withdrawFromDAOTreasury(address _to, uint256 amount)
        external
        nonReentrant
        _isProposal(msg.sender)
    {
        require(amount > 0, "DAOInvalidAmount");
        require(address(this).balance >= amount, "DAOInsufficientBalance");
        (bool success, ) = payable(_to).call{value: amount}("");
        require(success, "Transfer Failed");
    }

    /**
     * @dev Deposits ERC20 tokens into the DAO.
     * @param _token ERC20 Token to deposit
     * @param _amount Amount of tokens to deposit.
     */
    // Deposit tokens into DAO treasury

    // function depositTokens(address _token, uint256 _amount) external {
    //     require(_amount > 0, "Deposit amount must be greater than zero");

    //     ERC20 token = ERC20(_token);
    //     require(
    //         token.balanceOf(msg.sender) >= _amount,
    //         "Insufficient token balance"
    //     );
    //     require(
    //         token.allowance(msg.sender, address(this)) >= _amount,
    //         "Insufficient allowance"
    //     );

    //     bool success = token.transferFrom(msg.sender, address(this), _amount);
    //     require(success, "Token transfer failed");

    //     // Update total deposits for the token
    //     totalTokenDeposits[_token] += _amount;

    //     // Add the token to the treasury if it's not already present
    //     if (!isTokenInTreasury[_token]) {
    //         treasuryTokens.push(_token);
    //         isTokenInTreasury[_token] = true;
    //     }

    //     // Update user deposits
    //     bool tokenFound = false;
    //     DepositedTokens[] storage deposits = tokenDeposited[msg.sender];
    //     for (uint256 i = 0; i < deposits.length; i++) {
    //         if (deposits[i].token == _token) {
    //             deposits[i].balance += _amount;
    //             tokenFound = true;
    //             break;
    //         }
    //     }

    //     if (!tokenFound) {
    //         deposits.push(DepositedTokens({token: _token, balance: _amount}));
    //     }
    // }

    /**
     * @dev Withdraws governance tokens from the DAO.
     * @param _token The address ERC20 Token which are deposited in DAO
     * @param _to The recipient address.
     * @param _amount The amount to withdraw.
     */
    function withdrawTokens(
        address _token,
       
        address _to,
        uint256 _amount
    ) external nonReentrant _isProposal(msg.sender) {
        require(_amount > 0, "Withdrawal amount must be greater than zero");

        // DepositedTokens[] storage deposits = tokenDeposited[_from];

        // bool tokenFound = false;
        // for (uint256 i = 0; i < deposits.length; i++) {
        //     if (deposits[i].token == _token) {
        //         require(
        //             deposits[i].balance >= _amount,
        //             "Insufficient deposited balance"
        //         );

        //         deposits[i].balance -= _amount;
        //         if (deposits[i].balance == 0) {
        //             deposits[i] = deposits[deposits.length - 1];
        //             deposits.pop();
        //         }
        //         tokenFound = true;
        //         break;
        //     }
        // }

        // require(tokenFound, "Token not deposited");

        ERC20 token = ERC20(_token);
        // require(
        //     totalTokenDeposits[_token] >= _amount,
        //     "Insufficient treasury balance"
        // );
        // totalTokenDeposits[_token] -= _amount;

        require(
            token.balanceOf(address(this)) >= _amount,
            "Insufficient treasury balance"
        );
        bool success = token.transfer(_to, _amount);
        require(success, "Token transfer failed");
    }

    // function _getTreasuryTokenCount() internal view returns (uint256) {
    //     return treasuryTokens.length;
    // }

    // function _getTreasuryTokenAt(uint256 index)
    //     internal
    //     view
    //     returns (address)
    // {
    //     require(index < treasuryTokens.length, "Index out of bounds");
    //     return treasuryTokens[index];
    // }

    // function getTotalTreasuryTokens()
    //     external
    //     view
    //     returns (TokenBalance[] memory)
    // {
    //     uint256 count = _getTreasuryTokenCount();
    //     TokenBalance[] memory treasuryBalances = new TokenBalance[](count);
    //     for (uint256 i = 0; i < count; i++) {
    //         address token = _getTreasuryTokenAt(i);
    //         treasuryBalances[i] = TokenBalance({
    //             token: token,
    //             balance: totalTokenDeposits[token]
    //         });
    //     }
    //     return treasuryBalances;
    // }

    /**
     * @dev Adds new members to the DAO.
     * @param members Array of members to be added.
     * It will mint tokens to the new members if its a token based DAO
     */
    function addDAOMembers(DAOMember[] memory members) public {
        require(
            (isDAOMember[msg.sender] && membersCount == 0) ||
                isProposal[msg.sender],
            DAONotADaoMember()
        );
        for (uint32 i = 0; i < members.length; i++) {
            address memberAddress = members[i].memberAddress;
            uint256 deposit = members[i].deposit;
            if (!isDAOMember[memberAddress]) {
                isDAOMember[memberAddress] = true;
                ++membersCount;
            }
            if (!isMultiSignDAO) {
                governanceToken.mintSupply(memberAddress, deposit);
            }
        }
    }

    /**
     * @dev Removes members from the DAO.
     * @param members Array of members to be removed.
     */
    function removeDAOMembers(DAOMember[] memory members) public {
        require(isMultiSignDAO, DAOUnAuthorizedInteraction());
        require(isProposal[msg.sender], DAOUnAuthorizedInteraction());
        for (uint32 i = 0; i < members.length; i++) {
            address memberAddress = members[i].memberAddress;
            uint256 burnAmt = members[i].deposit;

            if (isDAOMember[memberAddress]) {
                isDAOMember[memberAddress] = false;
                --membersCount;
            }
            if (!isMultiSignDAO) {
                governanceToken.burnSupply(memberAddress, burnAmt);
            }
        }
    }

    /**
     * @dev Configures a proposal for the DAO.
     * @param proposalAddress Address of the deployed proposal.
     * @param _proposerAddress Address of the proposal creator.
     * @param _title Title of the proposal.
     * @param _actionId ID of the action proposed 0 for mint and 5 for burn.
     */
    function configureProposal(
        address proposalAddress,
        address _proposerAddress,
        string memory _title,
        uint8 _actionId
    ) external {
        require(msg.sender == proposalAddress, DAOUnAuthorizedInteraction());
        proposals[proposalId] = ProposalInfo({
            deployedProposalAddress: proposalAddress,
            creator: _proposerAddress,
            title: _title,
            id: proposalId
        });

        if (_actionId <= uint8(ActionType.DaoSetting)) {
            ActionType action = ActionType(_actionId);
            if (action == ActionType.Mint || action == ActionType.Burn) {
                governanceToken.setProposalRole(proposalAddress, _actionId);
            }
        }
        proposalId++;
        isProposal[proposalAddress] = true;
    }

    /**
    * @dev Updates the governance settings for the DAO.
    * @param _newSettings The new governance settings.

    */
    function updateGovernanceSettings(GovernanceSettings memory _newSettings)
        external
        _isProposal(msg.sender)
    {
        governanceSettings = _newSettings;
    }

    function updateDaoSettings(DaoSettings memory _daoParams)
        external
        _isProposal(msg.sender)
    {
        _daoSettings = _daoParams;
    }

    /**
     * @dev Updates the proposal creation settings for the DAO.
     * @param _proposalCreationParams The new proposal creation settings.
    
     */

    function updateProposalMemberSettings(
        ProposalCreationSettings memory _proposalCreationParams
    ) external _isProposal(msg.sender) {
        _proposalCreationSettings = _proposalCreationParams;
    }

    /**
    @dev can Interact is a modifier funtion to check if the user can interact with the contract

    */
    function canInteract(address _account)
        external
        view
        canInteractWithDAO(_account)
        returns (bool)
    {
        return true;
    }


    function delegate(address delegatee) external canInteractWithDAO(msg.sender){
        require(delegatee != address(0), "Cannot delegate to zero");
        require(governanceToken.balanceOf(msg.sender) >= 0, "Zero Delegated Power");
        delegator[delegatee] = msg.sender;
        governanceToken.delegate(delegatee);
    }

    function claimPower() external canInteractWithDAO(msg.sender){
        require(governanceToken.delegates(msg.sender) != address(0),"You don't have delegates, to claim");
        address _delegator = governanceToken.delegates(msg.sender);
        delegator[_delegator] = address(0);
        governanceToken.delegate(msg.sender);


    }

     fallback() external payable {
    }
}

// SPDX-License-Identifier: MIT

/** @title GovernanceToken
 * @author c4Chackri
 * @dev This contract is for decentralized autonomous organization (DAO) allowing for members to create and vote on proposals. It is based on OpenZeppelin's ERC20Votes contract and includes roles for minting, burning, pausing, and changing the owner of the governance token.
 */

pragma solidity ^0.8.21;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC20Permit, Nonces} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
contract GovernanceToken is
    ERC20,
    Pausable,
    ReentrancyGuard,
    Ownable,
    ERC20Permit,
    ERC20Votes,
    AccessControl
{
    error GovernanceERC20unAuthorizedRole();
    error GovernanceERC20IdNotFound();
    error GovernanceERC20ZeroAmount();
    error GovernanceERC20ZeroAddressFound();
    error GovernanceERC20InsufficientBalance();
    error GovernanceERC20MintNotEnabled();
    error GovernanceERC20BurnNotEnabled();
    error GovernanceERC20PauseNotEnabled();
    error GovernanceERC20StakeNotEnabled();
    error GovernanceERC20TransferNotEnabled();
    error GovernanceERC20ChangeOwnerNotEnabled();
    error GovernanceERC20NotADaoInteraction();

    /**
     * @dev The number of decimals used to get its user representation.
     */
    uint8 private _decimals;
    /**
     * @dev MINTER_ROLE is the role assigned to the address that can mint tokens.
     */
    bytes32 private constant MINTER_ROLE = keccak256("TOKEN_MINTER");
    /**
     * @dev BURNER_ROLE is the role assigned to the address that can burn tokens.
     */
    bytes32 private constant BURNER_ROLE = keccak256("TOKEN_BURNER");
    /**
     * @dev GOVERNER_COUNCIL is the role assigned to the address that can interact with the contract.
     */
    bytes32 private constant GOVERNER_COUNCIL = keccak256("TOKEN_GOVERNER");
    /**
     * @dev PROPOSAL_ROLE is the role assigned to the address that can interact with the contract.
     */
    bytes32 private constant PROPOSAL_ROLE = keccak256("TOKEN_PROPOSAL");
    /**
     * @dev The address of the DAO which is interacting with this contract.
     */
    address public daoAddress;
    /**
     * @dev smartContractActions is a struct that contains the boolean values for each action like mint, burn, pause, stake, transfer.
     */
    struct smartContractActions {
        bool canMint;
        bool canBurn;
        bool canPause;
        bool canStake;
        bool canTransfer;
        bool canChangeOwner;
    }

    smartContractActions public actions;
    /**
     * @dev this mapping is used to check if the address is a valid dao address.
     */
    mapping(address => bool) public isDaoAddress;
    /**
     * @dev this mapping is used to check if the address is a valid proposal address.
     */
    mapping(address => bool) public isProposal;

    /**
     * @dev This modifier is used to check if the address is a valid DAO address.
     * It throws an error if the address is not a registered DAO.
     *
     * Requirements:
     * - `_addr` must be an address registered as a DAO in the `isDaoAddress` mapping.
     *
     * Reverts with:
     * - `GovernanceERC20NotADaoInteraction` if `_addr` is not a valid DAO address.
     */
    modifier isDao(address _addr) {
        require(isDaoAddress[_addr], GovernanceERC20NotADaoInteraction());
        _;
    }

    /**
     * @dev This modifier is used to check if the `mint` action is enabled for the contract.
     * It throws an error if minting is disabled.
     *
     * Requirements:
     * - `actions.canMint` must be `true`.
     *
     * Reverts with:
     * - `GovernanceERC20MintNotEnabled` if minting is not enabled.
     */
    modifier canMintModifier() {
        require(actions.canMint, GovernanceERC20MintNotEnabled());
        _;
    }

    /**
     * @dev This modifier is used to check if the `burn` action is enabled for the contract.
     * It throws an error if burning is disabled.
     *
     * Requirements:
     * - `actions.canBurn` must be `true`.
     *
     * Reverts with:
     * - `GovernanceERC20BurnNotEnabled` if burning is not enabled.
     */
    modifier canBurnModifier() {
        require(actions.canBurn, GovernanceERC20BurnNotEnabled());
        _;
    }

    /**
     * @dev This modifier is used to check if the `pause` action is enabled for the contract.
     * It throws an error if pausing is disabled.
     *
     * Requirements:
     * - `actions.canPause` must be `true`.
     *
     * Reverts with:
     * - `GovernanceERC20PauseNotEnabled` if pausing is not enabled.
     */
    modifier canPauseModifier() {
        require(actions.canPause, GovernanceERC20PauseNotEnabled());
        _;
    }

    /**
     * @dev This modifier is used to check if the `stake` action is enabled for the contract.
     * It throws an error if staking is disabled.
     *
     * Requirements:
     * - `actions.canStake` must be `true`.
     *
     * Reverts with:
     * - `GovernanceERC20StakeNotEnabled` if staking is not enabled.
     */
    modifier canStakeModifier() {
        require(actions.canStake, GovernanceERC20StakeNotEnabled());
        _;
    }

    /**
     * @dev This modifier is used to check if the `transfer` action is enabled for the contract.
     * It throws an error if transferring tokens is disabled.
     *
     * Requirements:
     * - `actions.canTransfer` must be `true`.
     *
     * Reverts with:
     * - `GovernanceERC20TransferNotEnabled` if transferring tokens is not enabled.
     */
    modifier canTransfer() {
        require(actions.canTransfer, GovernanceERC20TransferNotEnabled());
        _;
    }

    /**
     * @dev This modifier is used to check if the `change owner` action is enabled for the contract.
     * It throws an error if changing the owner is disabled.
     *
     * Requirements:
     * - `actions.canChangeOwner` must be `true`.
     *
     * Reverts with:
     * - `GovernanceERC20ChangeOwnerNotEnabled` if changing the owner is not enabled.
     */
    modifier canChangeOwner() {
        require(actions.canChangeOwner, GovernanceERC20ChangeOwnerNotEnabled());
        _;
    }
    /**
     * @dev This modifier is used to restrict access to authorized roles for performing specific actions.
     * It checks if the caller (`msg.sender`) has one of the predefined roles: `MINTER_ROLE`, `BURNER_ROLE`, or `PROPOSAL_ROLE`.
     * If the caller does not possess any of these roles, it throws an error.
     *
     * Parameters:
     * - `action`: A `bytes32` parameter representing the action to be authorized. This is for potential future use
     *   or to signify the specific action being verified.
     *
     * Requirements:
     * - The caller (`msg.sender`) must have at least one of the following roles:
     *   - `MINTER_ROLE`: Authorized to mint tokens.
     *   - `BURNER_ROLE`: Authorized to burn tokens.
     *   - `PROPOSAL_ROLE`: Authorized to propose changes or actions in the contract.
     *
     * Reverts with:
     * - `GovernanceERC20unAuthorizedRole` if the caller does not have any of the required roles.
     */
    modifier auth(bytes32 action) {
        require(
            hasRole(MINTER_ROLE, msg.sender) ||
                hasRole(BURNER_ROLE, msg.sender) ||
                hasRole(PROPOSAL_ROLE, msg.sender),
            GovernanceERC20unAuthorizedRole()
        );
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address councilAddress,
        uint8 decimals_,
        smartContractActions memory _actions
    ) ERC20(name, symbol) Ownable(councilAddress) ERC20Permit(name) {
        daoAddress = address(0);
        initializeFeatures(_actions);
        _decimals = decimals_;
        _grantRole(DEFAULT_ADMIN_ROLE, councilAddress);
        _grantRole(GOVERNER_COUNCIL, councilAddress);
        //delete this 
        // _grantRole(MINTER_ROLE,councilAddress);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }


    /**
     * @dev Initializes the features of the smart contract by setting action flags from the provided `_actions` parameter.
     *
     * Parameters:
     * - `_actions`: A struct of type `smartContractActions` containing boolean values for each feature to be enabled or disabled:
     *   - `canStake`: Enables staking functionality.
     *   - `canBurn`: Enables burning of tokens.
     *   - `canMint`: Enables minting of tokens.
     *   - `canPause`: Enables pausing of contract operations.
     *   - `canTransfer`: Enables token transfer functionality.
     *   - `canChangeOwner`: Enables changing the contract owner.
     *
     * Requirements:
     * - This function should be called internally (e.g., during contract initialization or upgrades).
     */
    function initializeFeatures(smartContractActions memory _actions) internal {
        actions.canStake = _actions.canStake;
        actions.canBurn = _actions.canBurn;
        actions.canMint = _actions.canMint;
        actions.canPause = _actions.canPause;
        actions.canTransfer = _actions.canTransfer;
        actions.canChangeOwner = _actions.canChangeOwner;
    }

    /**
     * @dev Allows minting of tokens to the specified address.
     * Only authorized accounts (e.g., `MINTER_ROLE` or proposal-related roles) can perform this action.
     *
     * Parameters:
     * - `to`: The address that will receive the minted tokens.
     * - `_amount`: The number of tokens to mint.
     *
     * Requirements:
     * - The `canMint` action must be enabled (enforced by the `canMintModifier`).
     * - The contract must not be paused.
     * - `to` cannot be the zero address.
     * - `_amount` must be greater than zero.
     * - The caller must have either the `MINTER_ROLE` or a proposal-related role.
     *
     * Reverts with:
     * - `GovernanceERC20ZeroAddressFound` if `to` is the zero address.
     * - `GovernanceERC20ZeroAmount` if `_amount` is zero.
     * - `GovernanceERC20unAuthorizedRole` if the caller lacks the required role.
     */
    function mintSupply(address to, uint256 _amount)
        external
        nonReentrant
        whenNotPaused
        canMintModifier
    {
        require(to != address(0), GovernanceERC20ZeroAddressFound());
        require(_amount > 0, GovernanceERC20ZeroAmount());
        require(
            hasRole(MINTER_ROLE, msg.sender) || isProposalRole(msg.sender),
            GovernanceERC20unAuthorizedRole()
        );
        _mint(to, _amount);
       
    }

    /**
     * @dev Allows burning of tokens from the specified address.
     * Only authorized accounts (e.g., `BURNER_ROLE` or proposal-related roles) can perform this action.
     *
     * Parameters:
     * - `from`: The address from which tokens will be burned.
     * - `_amount`: The number of tokens to burn.
     *
     * Requirements:
     * - The `canBurn` action must be enabled (enforced by the `canBurnModifier`).
     * - The contract must not be paused.
     * - `from` cannot be the zero address.
     * - The caller must have either the `BURNER_ROLE` or a proposal-related role.
     *
     * Reverts with:
     * - `GovernanceERC20ZeroAddressFound` if `from` is the zero address.
     * - `GovernanceERC20unAuthorizedRole` if the caller lacks the required role.
     */
    function burnSupply(address from, uint256 _amount)
        external
        canBurnModifier
        nonReentrant
        whenNotPaused
    {
        require(from != address(0), GovernanceERC20ZeroAddressFound());
        require(
            hasRole(BURNER_ROLE, msg.sender) || isProposalRole(msg.sender),
            GovernanceERC20unAuthorizedRole()
        );
        _burn(from, _amount);
    }

    /**
     * @dev Transfers tokens to the specified recipient address.
     *
     * Parameters:
     * - `recipient`: The address of the recipient who will receive the tokens.
     * - `amount`: The number of tokens to transfer.
     *
     * Returns:
     * - `bool`: A boolean indicating whether the transfer was successful.
     *
     * Requirements:
     * - The `canTransfer` action must be enabled (enforced by the `canTransfer` modifier).
     * - The contract must not be paused.
     * - Standard ERC20 transfer rules apply.
     *
     * Emits:
     * - `Transfer` event from the ERC20 standard.
     */
    function transfer(address recipient, uint256 amount)
        public
        override
        canTransfer
        nonReentrant
        whenNotPaused
        returns (bool)
    {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /**
     * @dev Sets the DAO address for the governance token and assigns it specific roles.
     *
     * Parameters:
     * - `_daoAddress`: The address of the DAO to be set.
     *
     * Effects:
     * - Updates the `daoAddress` state variable.
     * - Marks the address as a valid DAO in the `isDaoAddress` mapping.
     * - Grants the following roles to the DAO:
     *   - `MINTER_ROLE`: Allows minting of tokens.
     *   - `BURNER_ROLE`: Allows burning of tokens.
     *   - `DEFAULT_ADMIN_ROLE`: Grants administrative control over the contract.
     *
     * Requirements:
     * - `_daoAddress` must not be the zero address.
     *
     * Reverts with:
     * - `"Invalid DAO address"` if `_daoAddress` is the zero address.
     */
    function setDAOAddress(address _daoAddress) external {
        require(daoAddress == address(0), "DAO address already set");
        require(_daoAddress != address(0), "Invalid DAO address");
        daoAddress = _daoAddress;
        isDaoAddress[_daoAddress] = true;
        _grantRole(MINTER_ROLE, _daoAddress);
        _grantRole(BURNER_ROLE, _daoAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, _daoAddress);
    }

    /**
     * @dev Assigns roles to a proposal based on the specified action ID.
     *
     * Parameters:
     * - `proposal`: The address of the proposal.
     * - `actionId`: An integer representing the type of action:
     *   - `0`: Grants `PROPOSAL_ROLE` and `MINTER_ROLE`.
     *   - `5`: Grants `PROPOSAL_ROLE` and `BURNER_ROLE`.
     *
     * Effects:
     * - Assigns the roles to the proposal address based on the `actionId`.
     *
     * Requirements:
     * - The caller must be a valid DAO (enforced by the `isDao` modifier).
     * - `proposal` must not be the zero address.
     *
     * Reverts with:
     * - `"Invalid proposal address"` if `proposal` is the zero address.
     */
    function setProposalRole(address proposal, uint256 actionId)
        external
        isDao(msg.sender)
    {
        require(proposal != address(0), "Invalid proposal address");
        if (actionId == 0) {
            _grantRole(PROPOSAL_ROLE, proposal);
            _grantRole(MINTER_ROLE, proposal);
        }
        if (actionId == 5) {
            _grantRole(PROPOSAL_ROLE, proposal);
            _grantRole(BURNER_ROLE, proposal);
        }
    }

    /**
     * @dev Checks if a given address has the `PROPOSAL_ROLE`.
     *
     * Parameters:
     * - `proposal`: The address to be checked.
     *
     * Returns:
     * - `true` if the address has the `PROPOSAL_ROLE`, otherwise `false`.
     */
    function isProposalRole(address proposal) public view returns (bool) {
        require(proposal != address(0), "Invalid proposal address");
        return hasRole(PROPOSAL_ROLE, proposal);
    }

    /**
     * @dev Pauses all operations of the contract.
     *
     * Requirements:
     * - The `canPause` action must be enabled (enforced by `canPauseModifier`).
     * - The contract must not already be paused.
     *
     * Reverts with:
     * - `"Contract is already paused."` if the contract is already paused.
     */
    function pause() external canPauseModifier whenNotPaused {
        require(!paused(), "Contract is already paused.");
        _pause();
    }

    /**
     * @dev Resumes all operations of the contract.
     *
     * Requirements:
     * - The `canPause` action must be enabled (enforced by `canPauseModifier`).
     * - The contract must currently be paused.
     *
     * Reverts with:
     * - `"Contract is not paused."` if the contract is not paused.
     */
    function unpause() external canPauseModifier whenPaused {
        require(paused(), "Contract is not paused.");
        _unpause();
    }

    /**
     * @dev Updates token balances after a transfer or token operation.
     *
     * Parameters:
     * - `from`: The address transferring tokens.
     * - `to`: The address receiving tokens.
     * - `value`: The number of tokens being transferred.
     *
     * Effects:
     * - Calls the parent `_update` function from both `ERC20` and `ERC20Votes`.
     *
     * Requirements:
     * - The contract must not be paused.
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Votes) whenNotPaused {
        super._update(from, to, value);
    }

    /**
     * @dev Returns the number of nonces associated with the given `owner` address.
     *
     * Parameters:
     * - `owner`: The address to query for nonces.
     *
     * Returns:
     * - `uint256`: The number of nonces for the `owner`.
     */
    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    /**
     * @dev Retrieves the voting units (i.e., token balance) of a given account.
     *
     * Parameters:
     * - `account`: The address to query for voting units.
     *
     * Returns:
     * - `uint256`: The token balance of the account, used as voting power.
     */
    function _getVotingUnits(address account)
        internal
        view
        virtual
        override
        returns (uint256)
    {
        return balanceOf(account);
    }

    /**
     * @dev Checks if the governance token is fresh (i.e., not yet linked to a DAO).
     *
     * Returns:
     * - `true` if `daoAddress` is the zero address, indicating the token is fresh.
     * - `false` otherwise.
     */
    function isFreshGovernanceToken() external view returns (bool) {
        return daoAddress == address(0);
    }

    
}

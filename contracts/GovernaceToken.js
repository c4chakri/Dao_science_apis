 function governanceToken (contractName)  {

    return `
    // SPDX-License-Identifier: MIT

/** @title GovernanceToken
 * @author MobiusDev
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

contract ${contractName} is
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
    
    mapping(address => bool) public isDaoAddress;
    
    mapping(address => bool) public isProposal;

    modifier isDao(address _addr) {
        require(isDaoAddress[_addr], GovernanceERC20NotADaoInteraction());
        _;
    }

    modifier canMintModifier() {
        require(actions.canMint, GovernanceERC20MintNotEnabled());
        _;
    }

    modifier canBurnModifier() {
        require(actions.canBurn, GovernanceERC20BurnNotEnabled());
        _;
    }

    modifier canPauseModifier() {
        require(actions.canPause, GovernanceERC20PauseNotEnabled());
        _;
    }

    modifier canStakeModifier() {
        require(actions.canStake, GovernanceERC20StakeNotEnabled());
        _;
    }

    modifier canTransfer() {
        require(actions.canTransfer, GovernanceERC20TransferNotEnabled());
        _;
    }

    modifier canChangeOwner() {
        require(actions.canChangeOwner, GovernanceERC20ChangeOwnerNotEnabled());
        _;
    }
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


    function initializeFeatures(smartContractActions memory _actions) internal {
        actions.canStake = _actions.canStake;
        actions.canBurn = _actions.canBurn;
        actions.canMint = _actions.canMint;
        actions.canPause = _actions.canPause;
        actions.canTransfer = _actions.canTransfer;
        actions.canChangeOwner = _actions.canChangeOwner;
    }

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

    
    function setDAOAddress(address _daoAddress) external {
        require(daoAddress == address(0), "DAO address already set");
        require(_daoAddress != address(0), "Invalid DAO address");
        daoAddress = _daoAddress;
        isDaoAddress[_daoAddress] = true;
        _grantRole(MINTER_ROLE, _daoAddress);
        _grantRole(BURNER_ROLE, _daoAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, _daoAddress);
    }

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

    function isProposalRole(address proposal) public view returns (bool) {
        require(proposal != address(0), "Invalid proposal address");
        return hasRole(PROPOSAL_ROLE, proposal);
    }

    function pause() external canPauseModifier whenNotPaused {
        require(!paused(), "Contract is already paused.");
        _pause();
    }

    function unpause() external canPauseModifier whenPaused {
        require(paused(), "Contract is not paused.");
        _unpause();
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Votes) whenNotPaused {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }

   
    function _getVotingUnits(address account)
        internal
        view
        virtual
        override
        returns (uint256)
    {
        return balanceOf(account);
    }

   
    function isFreshGovernanceToken() external view returns (bool) {
        return daoAddress == address(0);
    }

    
}

    
    `
}

module.exports = {governanceToken}


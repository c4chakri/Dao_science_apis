// generateSecurityToken.js
const fs = require("fs");
const solc = require("solc");
const path = require("path");

async function generateSecurityTokenContract(options) {
  return new Promise(async (resolve, reject) => {
    const finalContract = options.contract;
    const filePath = `contracts/${options.name}.sol`;
    await fs.writeFileSync(filePath, finalContract);

    if (fs.existsSync(filePath)) {
      const input = {
        language: "Solidity",
        sources: {
          [options.name + ".sol"]: {
            content: finalContract,
          },
        },
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "paris",
          outputSelection: {
            "*": {
              "*": ["abi", "evm.bytecode.object"],
            },
          },
        },
      };

      function findImports(path) {
        const zeppelinPath = "node_modules/@openzeppelin/contracts";
        const customContractsPath = "contracts";

        if (path.startsWith("@openzeppelin/contracts")) {
          const fullPath = path.replace("@openzeppelin/contracts", zeppelinPath);
          return { contents: fs.readFileSync(fullPath, "utf-8") };
        } else if (path.startsWith("./")) {
          const fullPath = path.replace("./", customContractsPath + "/");
          return { contents: fs.readFileSync(fullPath, "utf-8") };
        } else {
          return { error: "File not found" };
        }
      }

      try {
        const output = JSON.parse(
          solc.compile(JSON.stringify(input), { import: findImports })
        );

        if (output.errors) {
          output.errors.forEach((err) => {
            if (err.severity === "error") {
              console.error("Solidity compilation error:", err.formattedMessage);
            }
          });
        }

        // Prepare the output structure to match the required format
        const formattedOutput = {
          contracts: {
            [options.name + ".sol"]: {},
          },
          sources: {
            [options.name + ".sol"]: { id: 0 },
          },
        };

        // Iterate over each contract in the specified file and organize ABI and bytecode
        const contractData = output.contracts[options.name + ".sol"];
        if (contractData) {
          for (const contractName in contractData) {
            formattedOutput.contracts[options.name + ".sol"][contractName] = {
              abi: contractData[contractName].abi,
              bytecode: contractData[contractName].evm.bytecode.object,
            };
          }
        } else {
          throw new Error(`Contract data not found in output for ${options.name}.sol`);
        }

        fs.unlinkSync(filePath);
        resolve(formattedOutput);
      } catch (compileError) {
        console.error("Compilation Error:", compileError);
        reject(compileError);
      }
    } else {
      reject("File does not exist");
    }
  });
}

// Export the main function for external use
module.exports = { generateSecurityTokenContract };

if (require.main === module) {
    const contractSource = `
// SPDX-License-Identifier: MIT

// File: contracts/contracts/IIdentityStorage.sol


pragma solidity ^0.8.21;

interface IIdentityStorage {
    /**
     * @dev Checks if a user is a valid investor.
     * @param _userAddress Address of the user to check.
     * @return bool indicating if the user is a valid investor.
     */
    function isValidInvestor(address _userAddress) external view returns (bool);

    function registerUsers(address[] calldata _userAddresses) external;
}

// File: @openzeppelin/contracts/token/ERC20/IERC20.sol


// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {

    event Transfer(address indexed from, address indexed to, uint256 value);


    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// File: contracts/contracts/ISecurityToken.sol




pragma solidity ^0.8.21;


// import "../compliance/modular/IModularCompliance.sol";


interface ISecurityToken is IERC20 {

    event UpdatedTokenInformation(string indexed _newName, string indexed _newSymbol, uint8 _newDecimals, string
    _newVersion, address indexed _newOnchainID);
 
    event ComplianceAdded(address indexed _compliance);

    event RecoverySuccess(address indexed _lostWallet, address indexed _newWallet, address indexed _investorOnchainID);

    event AddressFrozen(address indexed _userAddress, bool indexed _isFrozen, address indexed _owner);

    event TokensFrozen(address indexed _userAddress, uint256 _amount);

 
    event TokensUnfrozen(address indexed _userAddress, uint256 _amount);

    event MaxSupplyIncreased(uint256 newMaxSupply);


    event Paused(address _userAddress);

    event Unpaused(address _userAddress);

    function setName(string calldata _name) external;


    function setSymbol(string calldata _symbol) external;

    function pause() external;

    function unpause() external;

    function setAddressFrozen(address _userAddress, bool _freeze) external;


    function freezePartialTokens(address _userAddress, uint256 _amount) external;

    function unfreezePartialTokens(address _userAddress, uint256 _amount) external;

    function setIdentityStorage(address _identityStorage) external;


    function setCompliance(address _compliance) external;


    function forcedTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external returns (bool);


    function mint(address _to, uint256 _amount) external;

    function burn(address _userAddress, uint256 _amount) external;


    // function recoveryAddress(
    //     address _lostWallet,
    //     address _newWallet,
    //     address _investorAddress
    // ) external returns (bool);


    function batchTransfer(address[] calldata _toList, uint256[] calldata _amounts) external;

    function batchForcedTransfer(
        address[] calldata _fromList,
        address[] calldata _toList,
        uint256[] calldata _amounts
    ) external;

    function batchMint(address[] calldata _toList, uint256[] calldata _amounts) external;


    function batchBurn(address[] calldata _userAddresses, uint256[] calldata _amounts) external;


    function batchSetAddressFrozen(address[] calldata _userAddresses, bool[] calldata _freeze) external;

    function batchFreezePartialTokens(address[] calldata _userAddresses, uint256[] calldata _amounts) external;


    function batchUnfreezePartialTokens(address[] calldata _userAddresses, uint256[] calldata _amounts) external;


    function decimals() external view returns (uint8);

 
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);



    // function compliance() external view returns (IModularCompliance);

   

    function isFrozen(address _userAddress) external view returns (bool);

    function getFrozenTokens(address _userAddress) external view returns (uint256);
}
// File: contracts/contracts/TokenStorage.sol



pragma solidity ^0.8.21;
// import "../compliance/modular/IModularCompliance.sol";

contract TokenStorage {
    /// @dev ERC20 basic variables
    mapping(address => uint256) internal _balances;
    mapping(address => mapping(address => uint256)) internal _allowances;
    uint256 internal _totalSupply;

    /// @dev Token information
    string internal _tokenName;
    string internal _tokenSymbol;
    uint8 internal _tokenDecimals;
    address internal _tokenOnchainID;
    // string internal constant _TOKEN_VERSION = "4.1.3";

    /// @dev Variables of freeze and pause functions
    mapping(address => bool) internal _frozen;
    mapping(address => uint256) internal _frozenTokens;

    bool internal _tokenPaused = false;

    /// @dev Identity Registry contract used by the onchain validator system
    // IIdentityRegistry internal _tokenIdentityRegistry;

    /// @dev Compliance contract linked to the onchain validator system
    // IModularCompliance internal _tokenCompliance;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[49] private __gap;
}
// File: @openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol


// OpenZeppelin Contracts (last updated v5.0.0) (proxy/utils/Initializable.sol)

pragma solidity ^0.8.20;


abstract contract Initializable {

    struct InitializableStorage {
        /**
         * @dev Indicates that the contract has been initialized.
         */
        uint64 _initialized;
        /**
         * @dev Indicates that the contract is in the process of being initialized.
         */
        bool _initializing;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Initializable")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant INITIALIZABLE_STORAGE = 0xf0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00;

    /**
     * @dev The contract is already initialized.
     */
    error InvalidInitialization();

    /**
     * @dev The contract is not initializing.
     */
    error NotInitializing();

    /**
     * @dev Triggered when the contract has been initialized or reinitialized.
     */
    event Initialized(uint64 version);

    modifier initializer() {
        // solhint-disable-next-line var-name-mixedcase
        InitializableStorage storage $ = _getInitializableStorage();

        // Cache values to avoid duplicated sloads
        bool isTopLevelCall = !$._initializing;
        uint64 initialized = $._initialized;

        // Allowed calls:
        // - initialSetup: the contract is not in the initializing state and no previous version was
        //                 initialized
        // - construction: the contract is initialized at version 1 (no reininitialization) and the
        //                 current contract is just being deployed
        bool initialSetup = initialized == 0 && isTopLevelCall;
        bool construction = initialized == 1 && address(this).code.length == 0;

        if (!initialSetup && !construction) {
            revert InvalidInitialization();
        }
        $._initialized = 1;
        if (isTopLevelCall) {
            $._initializing = true;
        }
        _;
        if (isTopLevelCall) {
            $._initializing = false;
            emit Initialized(1);
        }
    }

 
    modifier reinitializer(uint64 version) {
        // solhint-disable-next-line var-name-mixedcase
        InitializableStorage storage $ = _getInitializableStorage();

        if ($._initializing || $._initialized >= version) {
            revert InvalidInitialization();
        }
        $._initialized = version;
        $._initializing = true;
        _;
        $._initializing = false;
        emit Initialized(version);
    }

    /**
     * @dev Modifier to protect an initialization function so that it can only be invoked by functions with the
     * {initializer} and {reinitializer} modifiers, directly or indirectly.
     */
    modifier onlyInitializing() {
        _checkInitializing();
        _;
    }

    /**
     * @dev Reverts if the contract is not in an initializing state. See {onlyInitializing}.
     */
    function _checkInitializing() internal view virtual {
        if (!_isInitializing()) {
            revert NotInitializing();
        }
    }

    /**
     * @dev Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
     * Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
     * to any version. It is recommended to use this to lock implementation contracts that are designed to be called
     * through proxies.
     *
     * Emits an {Initialized} event the first time it is successfully executed.
     */
    function _disableInitializers() internal virtual {
        // solhint-disable-next-line var-name-mixedcase
        InitializableStorage storage $ = _getInitializableStorage();

        if ($._initializing) {
            revert InvalidInitialization();
        }
        if ($._initialized != type(uint64).max) {
            $._initialized = type(uint64).max;
            emit Initialized(type(uint64).max);
        }
    }

    /**
     * @dev Returns the highest version that has been initialized. See {reinitializer}.
     */
    function _getInitializedVersion() internal view returns (uint64) {
        return _getInitializableStorage()._initialized;
    }


    function _isInitializing() internal view returns (bool) {
        return _getInitializableStorage()._initializing;
    }

    /**
     * @dev Returns a pointer to the storage namespace.
     */
    // solhint-disable-next-line var-name-mixedcase
    function _getInitializableStorage() private pure returns (InitializableStorage storage $) {
        assembly {
            $.slot := INITIALIZABLE_STORAGE
        }
    }
}

// File: @openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol


// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;


/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract ContextUpgradeable is Initializable {
    function __Context_init() internal onlyInitializing {
    }

    function __Context_init_unchained() internal onlyInitializing {
    }
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// File: @openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol


// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

abstract contract OwnableUpgradeable is Initializable, ContextUpgradeable {
    /// @custom:storage-location erc7201:openzeppelin.storage.Ownable
    struct OwnableStorage {
        address _owner;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Ownable")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant OwnableStorageLocation = 0x9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c199300;

    function _getOwnableStorage() private pure returns (OwnableStorage storage $) {
        assembly {
            $.slot := OwnableStorageLocation
        }
    }

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

 
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    function __Ownable_init(address initialOwner) internal onlyInitializing {
        __Ownable_init_unchained(initialOwner);
    }

    function __Ownable_init_unchained(address initialOwner) internal onlyInitializing {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        OwnableStorage storage $ = _getOwnableStorage();
        return $._owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }


    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }


    function _transferOwnership(address newOwner) internal virtual {
        OwnableStorage storage $ = _getOwnableStorage();
        address oldOwner = $._owner;
        $._owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// File: contracts/contracts/Roles.sol



pragma solidity ^0.8.21;

/**
 * @title Roles
 * @dev Library for managing addresses assigned to a Role.
 */
library Roles {
    struct Role {
        mapping(address => bool) bearer;
    }

    /**
     * @dev Give an account access to this role.
     */
    function add(Role storage role, address account) internal {
        require(!has(role, account), "Roles: account already has role");
        role.bearer[account] = true;
    }

    /**
     * @dev Remove an account's access to this role.
     */
    function remove(Role storage role, address account) internal {
        require(has(role, account), "Roles: account does not have role");
        role.bearer[account] = false;
    }

    /**
     * @dev Check if an account has this role.
     * @return bool
     */
    function has(Role storage role, address account) internal view returns (bool) {
        require(account != address(0), "Roles: account is the zero address");
        return role.bearer[account];
    }
}

// File: contracts/contracts/AgentRoleUpgradeable.sol



pragma solidity ^0.8.21;



contract AgentRoleUpgradeable is OwnableUpgradeable {
    using Roles for Roles.Role;

    Roles.Role private _agents;

    event AgentAdded(address indexed _agent);
    event AgentRemoved(address indexed _agent);

    modifier onlyAgent() {
        require(isAgent(msg.sender), "AgentRole: caller does not have the Agent role");
        _;
    }

    function addAgent(address _agent) public onlyOwner {
        require(_agent != address(0), "invalid argument - zero address");
        _agents.add(_agent);
        emit AgentAdded(_agent);
    }

    function removeAgent(address _agent) public onlyOwner {
        require(_agent != address(0), "invalid argument - zero address");
        _agents.remove(_agent);
        emit AgentRemoved(_agent);
    }

    function isAgent(address _agent) public view returns (bool) {
        return _agents.has(_agent);
    }
}

// File: contracts/contracts/SecurityToken.sol



pragma solidity ^0.8.21;






contract SecurityToken is TokenStorage, AgentRoleUpgradeable, ISecurityToken {

    IIdentityStorage public identityStorage;
    address private _complianceAddress;

    uint256 public maxTotalSupply;

    /// @dev Modifier to make a function callable only when the contract is not paused.
    modifier whenNotPaused() {
        require(!_tokenPaused, "Pausable: paused");
        _;
    }

    /// @dev Modifier to make a function callable only when the contract is paused.
    modifier whenPaused() {
        require(_tokenPaused, "Pausable: not paused");
        _;
    }

    modifier onlyOwnerOrAgent() {
        require(owner() == msg.sender || isAgent(msg.sender), "Caller is not owner or agent");
        _;
    }

        // Constructor
        function init(
            address _identityStorage,
            // address _compliance,
            string memory _name,
            string memory _symbol,
            uint8 _decimals,
            uint256 _initialSupply
        ) external initializer {
            require(owner() == address(0), "already initialized");
            require(_identityStorage != address(0), "invalid argument - zero address");
            require(
                keccak256(abi.encode(_name)) != keccak256(abi.encode("")) &&
                keccak256(abi.encode(_symbol)) != keccak256(abi.encode("")),
                "invalid argument - empty string"
            );
            require(0 <= _decimals && _decimals <= 18, "decimals between 0 and 18");

            __Ownable_init(msg.sender);
            _tokenName = _name;
            _tokenSymbol = _symbol;
            _tokenDecimals = _decimals;
            _tokenPaused = true;

            maxTotalSupply = _initialSupply;
            setIdentityStorage(_identityStorage);
        }

    // Setters
    function setName(string calldata _name) external onlyOwner {
        require(keccak256(abi.encode(_name)) != keccak256(abi.encode("")), "invalid argument - empty string");
        _tokenName = _name;
    }

    function setSymbol(string calldata _symbol) external onlyOwner {
        require(keccak256(abi.encode(_symbol)) != keccak256(abi.encode("")), "invalid argument - empty string");
        _tokenSymbol = _symbol;
    }

    function setIdentityStorage(address _identityStorage) public onlyOwner {
        require(_identityStorage != address(0), "invalid argument - zero address");
        identityStorage = IIdentityStorage(_identityStorage);
    }

    function setCompliance(address _compliance) public onlyOwner {
        require(_compliance != address(0), "invalid argument - zero address");
        _complianceAddress = _compliance;
        emit ComplianceAdded(_compliance);
    }

    function increaseMaxSupply(uint256 _newMaxSupply) external onlyOwner {
        require(_newMaxSupply > maxTotalSupply, "New max supply must be greater than current max supply");
        require(_totalSupply == maxTotalSupply, "Total supply has not yet reached the maximum limit");
    
        maxTotalSupply = _newMaxSupply;
        emit MaxSupplyIncreased(maxTotalSupply);
    }

    // Pause functions
    function pause() external onlyOwner whenNotPaused {
        _tokenPaused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner whenPaused {
        _tokenPaused = false;
        emit Unpaused(msg.sender);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        _allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    // Transfer functions
    function transfer(address _to, uint256 _amount) public whenNotPaused returns (bool) {
        require(!_frozen[_to] && !_frozen[msg.sender], "wallet is frozen");
        require(_amount <= balanceOf(msg.sender) - _frozenTokens[msg.sender], "Insufficient Balance");
        
        if (identityStorage.isValidInvestor(_to)) {
            _transfer(msg.sender, _to, _amount);
            return true;
        }
        revert("Transfer not possible");
    }

     function transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) external whenNotPaused returns (bool) {
        require(!_frozen[_to] && !_frozen[_from], "wallet is frozen");
        require(_amount <= balanceOf(_from) - (_frozenTokens[_from]), "Insufficient Balance");
        if(identityStorage.isValidInvestor(_to)) {
            _approve(_from, msg.sender, _allowances[_from][msg.sender] - (_amount));
            _transfer(_from, _to, _amount);
            // _tokenCompliance.transferred(_from, _to, _amount);
            return true;
        }
        revert("Transfer not possible");
    }

    function batchForcedTransfer(
        address[] calldata _fromList,
        address[] calldata _toList,
        uint256[] calldata _amounts
    ) external override {
        for (uint256 i = 0; i < _fromList.length; i++) {
            forcedTransfer(_fromList[i], _toList[i], _amounts[i]);
        }
    }

    function forcedTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) public override onlyOwnerOrAgent returns (bool) {
        require(balanceOf(_from) >= _amount, "sender balance too low");
        uint256 freeBalance = balanceOf(_from) - (_frozenTokens[_from]);
        if (_amount > freeBalance) {
            uint256 tokensToUnfreeze = _amount - (freeBalance);
            _frozenTokens[_from] = _frozenTokens[_from] - (tokensToUnfreeze);
            emit TokensUnfrozen(_from, tokensToUnfreeze);
        }
        if (identityStorage.isValidInvestor(_to)) {
            _transfer(_from, _to, _amount);
            // _tokenCompliance.transferred(_from, _to, _amount);
            return true;
        }
        revert("Transfer not possible");
    }

    // Internal functions
    function _transfer(address _from, address _to, uint256 _amount) internal {
        require(_from != address(0), "ERC20: transfer from the zero address");
        require(_to != address(0), "ERC20: transfer to the zero address");
        require(_balances[_from] >= _amount, "ERC20: transfer amount exceeds balance");

        _balances[_from] -= _amount;
        _balances[_to] += _amount;
        emit Transfer(_from, _to, _amount);
    }

    function _mint(address _userAddress, uint256 _amount) internal {
        require(_userAddress != address(0), "ERC20: mint to the zero address");
        require(_totalSupply + _amount <= maxTotalSupply, "Minting exceeds total supply limit");  // Check supply limit
        _totalSupply += _amount;
        _balances[_userAddress] += _amount;
        emit Transfer(address(0), _userAddress, _amount);
    }

    function _burn(address _userAddress, uint256 _amount) internal {
        require(_userAddress != address(0), "ERC20: burn from the zero address");
        require(_balances[_userAddress] >= _amount, "ERC20: burn amount exceeds balance");
        
        _balances[_userAddress] -= _amount;
        _totalSupply -= _amount;
        emit Transfer(_userAddress, address(0), _amount);
    }

    function _approve(address _owner, address _spender, uint256 _amount) internal {
        require(_owner != address(0), "ERC20: approve from the zero address");
        require(_spender != address(0), "ERC20: approve to the zero address");

        _allowances[_owner][_spender] = _amount;
        emit Approval(_owner, _spender, _amount);
    }

    // Freeze functions
    function freezePartialTokens(address _userAddress, uint256 _amount) public onlyOwnerOrAgent {
        require(_balances[_userAddress] >= _amount, "insufficient balance");
        _frozenTokens[_userAddress] += _amount;
        emit TokensFrozen(_userAddress, _amount);
    }

    function unfreezePartialTokens(address _userAddress, uint256 _amount) public onlyOwnerOrAgent {
        require(_frozenTokens[_userAddress] >= _amount, "Amount should be less than or equal to frozen tokens");
        _frozenTokens[_userAddress] -= _amount;
        emit TokensUnfrozen(_userAddress, _amount);
    }

    function setAddressFrozen(address _userAddress, bool _freeze) public onlyOwnerOrAgent {
        _frozen[_userAddress] = _freeze;
        emit AddressFrozen(_userAddress, _freeze, msg.sender);
    }

    // Mint and Burn functions
    function mint(address _to, uint256 _amount) public onlyOwnerOrAgent {
        require(identityStorage.isValidInvestor(_to), "Identity is not verified.");
        _mint(_to, _amount);
    }

    function burn(address _userAddress, uint256 _amount) external onlyOwnerOrAgent {
        require(balanceOf(_userAddress) >= _amount, "cannot burn more than balance");
        uint256 freeBalance = balanceOf(_userAddress) - _frozenTokens[_userAddress];
        if (_amount > freeBalance) {
            uint256 tokensToUnfreeze = _amount - (freeBalance);
            _frozenTokens[_userAddress] = _frozenTokens[_userAddress] - (tokensToUnfreeze);
            emit TokensUnfrozen(_userAddress, tokensToUnfreeze);
        }
        _burn(_userAddress, _amount);
    }

    // Batch operations
    function batchMint(address[] calldata _toList, uint256[] calldata _amounts) external override onlyOwnerOrAgent {
        for (uint256 i = 0; i < _toList.length; i++) {
            mint(_toList[i], _amounts[i]);
        }
    }

    function batchTransfer(address[] calldata _toList, uint256[] calldata _amounts) external {
        require(_toList.length == _amounts.length, "arrays must be of equal length");
        for (uint256 i = 0; i < _toList.length; i++) {
            transfer(_toList[i], _amounts[i]);
        }
    }

    function batchBurn(address[] calldata _userAddresses, uint256[] calldata _amounts) external onlyOwnerOrAgent {
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            _burn(_userAddresses[i], _amounts[i]);
        }
    }

    function batchSetAddressFrozen(address[] calldata _userAddresses, bool[] calldata _freeze) external onlyOwnerOrAgent {
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            setAddressFrozen(_userAddresses[i], _freeze[i]);
        }
    }

    function batchFreezePartialTokens(address[] calldata _userAddresses, uint256[] calldata _amounts) external {
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            freezePartialTokens(_userAddresses[i], _amounts[i]);
        }
    }
    
    function batchUnfreezePartialTokens(address[] calldata _userAddresses, uint256[] calldata _amounts) external override {
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            unfreezePartialTokens(_userAddresses[i], _amounts[i]);
        }
    }

    // View functions
    function balanceOf(address _userAddress) public view returns (uint256) {
        return _balances[_userAddress];
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function isFrozen(address _userAddress) external view returns (bool) {
        return _frozen[_userAddress];
    }

    function decimals() external view returns (uint8) {
        return _tokenDecimals;
    }

    function name() external view returns (string memory) {
        return _tokenName;
    }

    function symbol() external view returns (string memory) {
        return _tokenSymbol;
    }

    function getFrozenTokens(address _userAddress) external view override returns (uint256) {
        return _frozenTokens[_userAddress];
    }

    function remainingMintableTokens() external view returns (uint256) {
    if (_totalSupply >= maxTotalSupply) {
        return 0;
    }
    return maxTotalSupply - _totalSupply;
    }
  }`;
  
    const options = {
      name: "SecurityToken",
      contract: contractSource,
    };
  
    generateSecurityTokenContract(options)
    .then((output) => {
      console.log("Formatted Output:", JSON.stringify(output, null, 2));
    })
    .catch((error) => {
      console.error("Error during compilation:", error);
    });
  }

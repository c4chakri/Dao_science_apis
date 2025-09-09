// SPDX-License-Identifier: MIT

    /**
    * @dev This contract is a factory for creating DAOs.
    */

    pragma solidity ^0.8.21;

    import {DAO} from "./Dao.sol";
    import {IDAO} from "./IDao.sol";
    import {IDAOFactory} from "./IDaoFactory.sol";
    import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
    import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
    import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
    import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

    /**
    * @dev This contract is a factory for creating DAOs.

    */
    contract DAOFactory is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    IDAOFactory
    {
    /**
     * @dev daoId is used to track the number of DAOs created.
     */
    uint32 public daoId;
    /**
     * @dev Mapping of DAO IDs to DAO information.
     */
    mapping(uint32 => DAOInfo) public daos;
    /**
     * @dev Address of the DAO management contract responsible for creating proposals.
     */
    address public daoManagement;
    /**
     * @dev Event emitted when a new DAO is created .
     */

    event daoCreated(address daoAddress, address governanceToken);

    /**
     * @dev Initializes the factory with the provided address of the DAO management contract.
     * @param _daoManagement The address of the DAO management contract.
     */
    function initialize(address _daoManagement) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        daoManagement = _daoManagement;
    }

    /**
     * @dev Authorizes the upgrade to a new implementation contract.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    /**
    * @dev Creates a new DAO with the provided parameters.
    * @param daoParams Initial settings for the DAO includes (Name and description(in Bytes)).
    * @param governanceTokenAddress Address of an existing governance token or zero to create a new token.
    * @param governanceTokenParams Parameters for governance token creation.
    * @param governanceSettings Governance configuration settings includes ( minimumParticipationPercentage;
         supportThresholdPercentage;
         minimumDurationForProposal;
         earlyExecution;
         canVoteChange;).
    * @param _daoMembers Initial members of the DAO and miniting members if its a token based DAO.
    * @param proposalCreationParams Settings for creating proposals in the DAO includes ( TokenBasedProposal and MinimumRequirement;).
    * @param isMultiSignDAO Flag indicating if the DAO is multisign DAO.
    */
    function createDAO(
        DAO.DaoSettings memory daoParams,
        address governanceTokenAddress,
        DAO.GovernanceTokenParams memory governanceTokenParams,
        DAO.GovernanceSettings memory governanceSettings,
        DAO.DAOMember[] memory _daoMembers,
        DAO.ProposalCreationSettings memory proposalCreationParams,
        bool isMultiSignDAO
    ) external {
        DAO newDAO = new DAO(
            daoManagement,
            daoParams,
            governanceTokenAddress,
            governanceTokenParams,
            governanceSettings,
            _daoMembers,
            proposalCreationParams,
            isMultiSignDAO
        );

        DAOInfo storage dao = daos[daoId];
        dao.name = keccak256(bytes(daoParams.name));
        dao.daoAddress = address(newDAO);
        dao.daoCreator = msg.sender;
        dao.governanceAddress = address(newDAO.governanceToken());
        daoId++;

        emit daoCreated(address(newDAO), address(newDAO.governanceToken()));
    }

    /**
     * @dev Returns the version of the contract.
     */
    function version() external pure returns (string memory) {
        return "0.2.3";
    }
}

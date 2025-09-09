// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {GovernanceToken} from "./GovernanceToken.sol";
import {DAO} from "./Dao.sol";

/**
 * @title IDAOFactory
 * @dev Interface defining the structure and core functions for a DAO Factory, which is responsible for creating and managing DAOs.
 */
interface IDAOFactory {
    /**
     * @dev Struct representing information about a DAO.
     * @param name The name of the DAO.
     * @param daoAddress The address of the deployed DAO contract.
     * @param daoCreator The address of the creator of the DAO.
     * @param governanceAddress The address of the associated governance token contract.
     */
    struct DAOInfo {
        bytes32 name;
        address daoAddress;
        address daoCreator;
        address governanceAddress;
    }

    /**
     * @notice Retrieves the current DAO ID counter.
     * @return The current DAO ID as an unsigned 32-bit integer.
     */
    function daoId() external view returns (uint32);

    /**
     * @notice Retrieves the details of a DAO by its ID.
     * @param id The ID of the DAO to retrieve.
     * @return name The name of the DAO.
     * @return daoAddress The address of the deployed DAO contract.
     * @return daoCreator The address of the creator of the DAO.
     * @return governanceAddress The address of the associated governance token contract.
     */
    function daos(uint32 id)
        external
        view
        returns (
            bytes32 name,
            address daoAddress,
            address daoCreator,
            address governanceAddress
        );

    /**
     * @notice Creates a new DAO and its associated contracts.
     * @dev Deploys a new DAO contract and links it with a governance token.
     * @param daoParams The settings for the DAO (e.g., name, additional configuration data).
     * @param governanceTokenAddress The address of the governance token contract, if already deployed.
     * @param governanceTokenParams Parameters for creating a new governance token, if applicable.
     * @param governanceSettings Governance settings for the DAO, such as participation thresholds and proposal duration.
     * @param _daoMembers The initial members of the DAO, including their addresses and deposits.
     * @param proposalCreationParams Settings for creating proposals in the DAO.
     * @param isMultiSignDAO Indicates whether the DAO operates as a multi-signature organization.
     */
    function createDAO(
        DAO.DaoSettings memory daoParams,
        address governanceTokenAddress,
        DAO.GovernanceTokenParams memory governanceTokenParams,
        DAO.GovernanceSettings memory governanceSettings,
        DAO.DAOMember[] memory _daoMembers,
        DAO.ProposalCreationSettings memory proposalCreationParams,
        bool isMultiSignDAO
    ) external;
}

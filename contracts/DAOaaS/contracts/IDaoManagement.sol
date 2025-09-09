// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {IProposal} from "./IProposal.sol";
import {IDAO} from "./IDao.sol";

/**
 * @title IDaoManagement
 * @dev Interface for the DaoManagement contract, providing functions to create proposals and governance tokens.
 */
interface IDaoManagement {
    /**
     * @dev Emitted when a new proposal is created.
     * @param proposal The address of the newly created proposal.
     */
    event proposalCreated(address proposal);

    /**
     * @dev Creates a new proposal contract and associates it with a DAO.
     * @param _daoAddress The address of the DAO to which the proposal is linked.
     * @param _title The title of the proposal.
     * @param _description A detailed description of the proposal.
     * @param _minApproval The minimum approval required for the proposal to pass.
     * @param _startTime The start time for voting, in UNIX timestamp format.
     * @param _duration The duration of the voting period, in seconds.
     * @param actionId The identifier of the action the proposal relates to.
     * @param _actions An array of actions the proposal will execute if approved.
     * @return The address of the newly created proposal contract.
     */
    function createProposal(
        address _daoAddress,
        string memory _title,
        string memory _description,
        uint256 _minApproval,
        uint32 _startTime,
        uint32 _duration,
        uint8 actionId,
        IProposal.Action[] memory _actions
    ) external returns (address);

    /**
     * @dev Creates a new governance token for a DAO.
     * @param _GovernanceTokenParams A struct containing parameters for the governance token, including:
     *   - `name`: The name of the governance token.
     *   - `symbol`: The symbol of the governance token.
     *   - `councilAddress`: The address with initial permissions for the token.
     * @return The address of the newly created governance token contract.
     */
    function createGovernanceToken(
        IDAO.GovernanceTokenParams memory _GovernanceTokenParams
    ) external returns (address);
}

// SPDX-License-Identifier: MIT
/**
 * @title DaoManagement
 * @author c4Chakri
 * @dev This contract provides functionality to create new proposals and governance tokens for DAOs.
 */
pragma solidity ^0.8.21;

import {Proposal} from "./Proposal.sol";
import {IProposal} from "./IProposal.sol";
import {DAO} from "./Dao.sol";
import {IDAO} from "./IDao.sol";
import {GovernanceToken, ReentrancyGuard, AccessControl} from "./GovernanceToken.sol";
import {IDaoManagement} from "./IDaoManagement.sol";

contract DaoManagement is IDaoManagement{
    

    /**
     * @dev Creates a new proposal contract and associates it with a DAO.
     * Requirements:
     * - `_daoAddress` must be a valid DAO address.
     * - Caller must be authorized to create proposals within the DAO.
     * 
     * Emits:
     * - `proposalCreated` event with the address of the new proposal.
     * 
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
    ) external returns (address) {
        Proposal newProposal = new Proposal(
            _daoAddress,
            msg.sender,
            _minApproval,
            _title,
            _description,
            _startTime,
            _duration,
            actionId,
            _actions
        );
        emit proposalCreated(address(newProposal));
        return address(newProposal);
    }

    /**
     * @dev Creates a new governance token for a DAO.
     * The token is initialized with specific parameters and default permissions.
     * Requirements:
     * - `_GovernanceTokenParams.councilAddress` must be a valid address.
     * 
     * @param _GovernanceTokenParams A struct containing parameters for the governance token, including:
     *   - `name`: The name of the governance token.
     *   - `symbol`: The symbol of the governance token.
     *   - `councilAddress`: The address with initial permissions for the token.
     * @return The address of the newly created governance token contract.
     */
    function createGovernanceToken(
        IDAO.GovernanceTokenParams memory _GovernanceTokenParams
    ) public returns (address) {
        GovernanceToken gnt = new GovernanceToken(
            _GovernanceTokenParams.name,
            _GovernanceTokenParams.symbol,
            _GovernanceTokenParams.councilAddress,
            18,
            GovernanceToken.smartContractActions({
                canMint: true,
                canBurn: true,
                canPause: true,
                canStake: true,
                canTransfer: true,
                canChangeOwner: false
            })
        );
        return address(gnt);
    }
}

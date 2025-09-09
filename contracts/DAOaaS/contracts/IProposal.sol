// SPDX-License-Identifier: MIT
/**
@title IProposal
@Author: Firstname Lastname
 */
pragma solidity ^0.8.20;
/** 
@dev This interface defines the structure and core functions for a proposal.
 */
interface IProposal {
        struct Action {
        address to;
        uint256 value;
        bytes data;
    }
    /**
    @dev Function to vote on a proposal.
    @param _voteOption The vote option:1 for yes, 2 for no and 3 for abstain.
     */
    function vote(uint8 _voteOption) external;

    /**
    @dev Function to execute a proposal.
     */
    function executeProposal() external ;
}
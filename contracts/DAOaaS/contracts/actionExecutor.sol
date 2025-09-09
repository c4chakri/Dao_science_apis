// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract ActionExecutor {
    // Define an Action struct to hold the information for each action
    struct Action {
        address target;  // The address of the contract to call
        uint256 value;   // The amount of Ether to send (in wei)
        bytes data;      // The encoded function call data
    }

    // Event to log the results of each executed action
    event ActionExecuted(
        address indexed target,
        uint256 value,
        bytes data,
        bool success,
        bytes returnData
    );

    // Function to execute a series of actions
    function executeActions(Action[] memory actions) public payable {
        for (uint256 i = 0; i < actions.length; i++) {
            Action memory action = actions[i];

            // Call the target contract with the provided value and data
            (bool success, bytes memory returnData) = action.target.call{value: action.value}(action.data);

            // Emit an event to log the result of the action
            emit ActionExecuted(action.target, action.value, action.data, success, returnData);

            // Optionally revert if one of the actions fails
            require(success, "Action execution failed");
        }
    }

    // Fallback function to allow this contract to receive Ether
    receive() external payable {}
}

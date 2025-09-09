// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ProposalTestingToken is ERC20 {

    constructor() ERC20("Proposal Testing Token", "PTT") {
        _mint(msg.sender, 1000000000000000000000000 ether);
        _mint(address(this), 1000000000000000000000000 ether);
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(address(this), recipient, amount);
        return true;
    }
}
// generateIdentityStorage.js
const fs = require("fs");
const solc = require("solc");

async function generateIdentityStorageContract(options) {
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

        const formattedOutput = {
          contracts: {
            [options.name + ".sol"]: {},
          },
          sources: {
            [options.name + ".sol"]: { id: 0 },
          },
        };

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
module.exports = { generateIdentityStorageContract };

// Testing the compiler directly in this file
if (require.main === module) {
  const contractSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;
pragma abicoder v2;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';

contract IdentityStorage is Initializable, UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable {
    struct USER {
        uint id;
    }
    mapping(address => USER) public users;
    mapping(uint => address) public idToAddress;
    uint256 public constant MAX_BATCH_SIZE = 100;
    uint public totalUsers;

    event RegisterUser(address userAddress, uint user_id);

    function initialize() public initializer {
        OwnableUpgradeable.__Ownable_init(_msgSender());
    }

    function _authorizeUpgrade(address) internal view override {
        require(owner() == _msgSender(), "#ERR: Only owner can upgrade implementation");
    }

    function registerUsers(address[] calldata _userAddresses) external onlyOwner whenNotPaused {
        require(_userAddresses.length <= MAX_BATCH_SIZE, "Batch size too large");

        for (uint i = 0; i < _userAddresses.length; i++) {
            address userAddress = _userAddresses[i];
            require(!isUserExists(userAddress), "Already registered");

            uint32 size;
            assembly {
                size := extcodesize(userAddress)
            }
            require(size == 0, "Cannot be a contract");

            _createNewUser(userAddress);
        }
    }

    function _createNewUser(address userAddress) private {
        totalUsers++;
        users[userAddress].id = totalUsers;
        idToAddress[totalUsers] = userAddress;

        emit RegisterUser(userAddress, users[userAddress].id);
    }

    function isValidInvestor(address _userAddress) public view returns (bool) {
        return isUserExists(_userAddress);
    }

    function isUserExists(address _userAddress) internal view returns (bool) {
        return (users[_userAddress].id != 0);
    }

    function getIdByAddress(address _userAddress) public view returns (uint) {
        return users[_userAddress].id;
    }

    function getAddressById(uint _id) public view returns (address) {
        return idToAddress[_id];
    }

    function pause() external onlyOwner virtual whenNotPaused {
        _pause();
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner virtual whenPaused {
        _unpause();
        emit Unpaused(msg.sender);
    }
}`;

  const options = {
    name: "IdentityStorage",
    contract: contractSource,
  };

  generateIdentityStorageContract(options)
    .then((output) => {
      console.log("Formatted Output:", JSON.stringify(output, null, 2));
    })
    .catch((error) => {
      console.error("Error during compilation:", error);
    });
}

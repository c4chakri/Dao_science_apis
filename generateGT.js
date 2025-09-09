const fs = require("fs");
const solc = require("solc");

async function generateGT(options) {
  try {
    const finalContract = options.contract;
    // console.log("finalContract", finalContract);
    
    const input = {
      language: "Solidity",
      sources: {
        [options.name]: {
          content: finalContract,
        },
      },
      settings: {
        optimizer: {
          enabled: true,  // Enables optimizer for reduced gas usage
          runs: 200,
        },
        evmVersion: "paris", // Set the EVM version to "Paris" (since it works on Remix)
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode.object"], // Only retrieve ABI and Bytecode
          },
        },
      },
    };

    function findImports(path) {
      const zeppelinPath = "node_modules/@openzeppelin/contracts";
      if (path.startsWith("@openzeppelin/contracts")) {
        const fullPath = path.replace("@openzeppelin/contracts", zeppelinPath);
        return { contents: fs.readFileSync(fullPath, "utf-8") };
      } else {
        return { error: "File not found" };
      }
    }

    const output = JSON.parse(
      solc.compile(JSON.stringify(input), { import: findImports })
    );

    // Check if there are any compilation errors
    if (output.errors) {
      output.errors.forEach(err => {
        if (err.severity === 'error') {
          console.error('Solidity compilation error:', err.formattedMessage);
        }
      });
    }

    let abi;
    let bytecode;

    for (const contractName in output.contracts[options.name]) {
      abi = output.contracts[options.name][contractName].abi;
      bytecode = output.contracts[options.name][contractName].evm.bytecode.object;
    }

    return {
      abi,
      bytecode,
    };
  } catch (e) {
    console.error('Error:', e);
    throw Error(e);
  }
}

module.exports = { generateGT };

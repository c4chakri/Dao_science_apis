// generateERC20.js
const fs = require("fs");
const solc = require("solc");
const path = require('path');
const { ERC20Code } = require("./ERC20Code");

// async function generateERC20Contract(options) {
//   return new Promise(async (resolve, reject) => {
//     const finalContract = options.contract || ERC20Code(options.name.split(" ").join(""));
//     const filePath = `contracts/${options.name.split(" ").join("")}.sol`
//     await fs.writeFileSync(filePath, finalContract);
//     if (fs.existsSync(filePath)) {
//       const input = {
//         language: "Solidity",
//         sources: {
//           [filePath]: {
//             content: finalContract,
//           },
//         },
//         settings: {
//           optimizer: {
//             enabled: true, 
//             runs: 200,
//           },
//           evmVersion: "paris", 
//           outputSelection: {
//             "*": {
//               "*": ["abi", "evm.bytecode.object"], 
//             },
//           },
//         },
//       };

//       function findImports(path) {
//         const zeppelinPath = "node_modules/@openzeppelin/contracts";
//         const uniswapPath = "node_modules/@uniswap/v2-periphery";

//         if (path.startsWith("@openzeppelin/contracts")) {
//           const fullPath = path.replace("@openzeppelin/contracts", zeppelinPath);
//           return { contents: fs.readFileSync(fullPath, "utf-8") };
//         } else if (path.startsWith("@uniswap/v2-periphery")) {
//           const fullPath = path.replace("@uniswap/v2-periphery", uniswapPath);
//           return { contents: fs.readFileSync(fullPath, "utf-8") };
//         } else {
//           return { error: "File not found" };
//         }
//       }

//       try {
//         const output = JSON.parse(
//           solc.compile(JSON.stringify(input), { import: findImports })
//         );

//         if (output.errors) {
//           output.errors.forEach(err => {
//             if (err.severity === 'error') {
//               console.error('Solidity compilation error:', err.formattedMessage);
//             }
//           });
//         }

//         let abi;
//         let bytecode;

//         for (const contractName in output.contracts[filePath]) {
//           abi = output.contracts[filePath][contractName].abi;
//           bytecode = output.contracts[filePath][contractName].evm.bytecode.object;
//         }

//         fs.unlinkSync(filePath); 
//         resolve({ abi, bytecode });
//       } catch (compileError) {
//         console.error('Compilation Error:', compileError);
//         reject(compileError);
//       }
//     } else {
//       reject('File does not exist');
//     }
//   });
// }


async function generateERC20Contract(options, solcVersion = 'v0.8.22+commit.4fc1097e') {
  return new Promise((resolve, reject) => {
    // 1. Load the remote compiler
    solc.loadRemoteVersion(solcVersion, async (err, solcSnapshot) => {
      if (err) return reject(err);

      try {
        // 2. Prepare contract source
        const contractName = options.name.split(' ').join('');
        const finalContract = options.contract || ERC20Code(contractName);
        const filePath = path.resolve(`contracts/${contractName}.sol`);
        await fs.promises.writeFile(filePath, finalContract, 'utf8');

        // 3. Build standard JSON input
        const input = {
          language: 'Solidity',
          sources: {
            [filePath]: { content: finalContract }
          },
          settings: {
            optimizer: { enabled: true, runs: 200 },
            evmVersion: 'paris',
            outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } }
          }
        };

        // 4. Import callback
        function findImports(importPath) {
          const deps = {
            '@openzeppelin/contracts': 'node_modules/@openzeppelin/contracts',
            '@uniswap/v2-periphery': 'node_modules/@uniswap/v2-periphery'
          };
          for (const key of Object.keys(deps)) {
            if (importPath.startsWith(key)) {
              const fullPath = importPath.replace(key, deps[key]);
              return { contents: fs.readFileSync(fullPath, 'utf8') };
            }
          }
          return { error: 'File not found' };
        }

        // 5. Compile with the snapshot
        const rawOutput = solcSnapshot.compile(JSON.stringify(input), { import: findImports });
        const output = JSON.parse(rawOutput);

        // 6. Handle errors
        if (output.errors) {
          const fatal = output.errors.filter(e => e.severity === 'error');
          if (fatal.length) {
            fatal.forEach(e => console.error(e.formattedMessage));
            throw new Error('Compilation failed with errors');
          }
        }

        // 7. Extract ABI & bytecode
        const contractData = output.contracts[filePath];
        const contractKey = Object.keys(contractData)[0];
        const { abi } = contractData[contractKey];
        const bytecode = contractData[contractKey].evm.bytecode.object;

        // 8. Cleanup and return
        await fs.promises.unlink(filePath);
        resolve({ abi, bytecode });

      } catch (compileError) {
        reject(compileError);
      }
    });
  });
}


module.exports = { generateERC20Contract };

const fs = require("fs");
const solc = require("solc");
const { ERC20Code } = require("./ERC20Code");
const { ethers } = require("ethers");
const path = require('path');
// async function generateERC20Contract(options) {
//     return new Promise(async (resolve, reject) => {
//         const finalContract = options.contract || ERC20Code(options.name.split(" ").join(""));
//         const filePath = `contracts/${options.name.split(" ").join("")}.sol`
//         await fs.writeFileSync(filePath, finalContract);
//         if (fs.existsSync(filePath)) {
//             const input = {
//                 language: "Solidity",
//                 sources: {
//                     [filePath]: {
//                         content: finalContract,
//                     },
//                 },
//                 settings: {
//                     optimizer: {
//                         enabled: true,
//                         runs: 200,
//                     },
//                     evmVersion: "paris",
//                     outputSelection: {
//                         "*": {
//                             "*": ["abi", "evm.bytecode.object"],
//                         },
//                     },
//                 },
//             };

//             function findImports(path) {
//                 const zeppelinPath = "node_modules/@openzeppelin/contracts";
//                 const uniswapPath = "node_modules/@uniswap/v2-periphery";

//                 if (path.startsWith("@openzeppelin/contracts")) {
//                     const fullPath = path.replace("@openzeppelin/contracts", zeppelinPath);
//                     return { contents: fs.readFileSync(fullPath, "utf-8") };
//                 } else if (path.startsWith("@uniswap/v2-periphery")) {
//                     const fullPath = path.replace("@uniswap/v2-periphery", uniswapPath);
//                     return { contents: fs.readFileSync(fullPath, "utf-8") };
//                 } else {
//                     return { error: "File not found" };
//                 }
//             }

//             try {
//                 const output = JSON.parse(
//                     solc.compile(JSON.stringify(input), { import: findImports })
//                 );

//                 if (output.errors) {
//                     output.errors.forEach(err => {
//                         if (err.severity === 'error') {
//                             console.error('Solidity compilation error:', err.formattedMessage);
//                         }
//                     });
//                 }

//                 let abi;
//                 let bytecode;

//                 for (const contractName in output.contracts[filePath]) {
//                     abi = output.contracts[filePath][contractName].abi;
//                     bytecode = output.contracts[filePath][contractName].evm.bytecode.object;
//                 }

//                 fs.unlinkSync(filePath);
//                 resolve({ abi, bytecode });
//             } catch (compileError) {
//                 console.error('Compilation Error:', compileError);
//                 reject(compileError);
//             }
//         } else {
//             reject('File does not exist');
//         }
//     });
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
async function deployERC20Contract(options) {
    // console.log("chain Id :::::",options.chainId);
    // console.log("api hitted from",options.triggeredFrom)
    
    try {
        if (!options?.name) {
            throw new Error("Missing token name in deployment options");
        }
        if (!options?.chainId) {
            throw new Error("Missing chainId in deployment options");
        }
        if (!Array.isArray(options.params)) {
            throw new Error("Deployment params must be an array");
        }
        
        const PRIVATE_KEY = process.env.PRIVATE_KEY;
        const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
       
        
        const { abi, bytecode } = await generateERC20Contract(options);
        
        if (!abi || !bytecode) {
            throw new Error("Contract ABI or bytecode generation failed");
        }

        let networkRPC;
        switch (options.chainId) {
            case 1: 
                networkRPC = "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID";
                break;
            case 11155111: 
                networkRPC = `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`;
                break;
            case 31337:
                networkRPC = "http://localhost:8545";
                break;
            case 17000:
                networkRPC = "https://ethereum-holesky-rpc.publicnode.com";
                break;
            default:
                return { error: `Unsupported chainId: ${options.chainId}` };
        }
        // console.log("[network] is an wallet ",networkRPC);
        
        const provider = new ethers.providers.JsonRpcProvider(networkRPC);
        if(!provider) {
            throw new Error("Failed to connect to RPC provider");
        }
        
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        // const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);
        // const contract = await contractFactory.deploy(...options.params);
        // await contract.deployed();

        // console.log(`[DEPLOYMENT SUCCESS] Contract deployed at: ${contract.address}`);
        // // console.log(`[DEPLOYMENT SUCCESS] Contract deployed at: 0x52a5a8e7783E4316788aa4D051FFEf05C881cF4f`);

        return { deployedUTContractAddress: "0x52a5a8e7783E4316788aa4D051FFEf05C881cF4f" };

    } catch (error) {
    
        let cleanMessage = error?.message || "Unknown deployment error";
    
        const match = cleanMessage.match(/message\\?":\\?"([^"]+)/);
        if (match && match[1]) {
            cleanMessage = match[1]; 
        }
    
        return { error: cleanMessage };
    }
    
}



module.exports = { deployERC20Contract };
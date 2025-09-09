
const fs = require("fs");
const solc = require("solc");
const { ethers } = require("ethers");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();
const { ERC721 } = require("./flattenERC721");

async function generateERC721Contract() {
    return new Promise((resolve, reject) => {
        const contractFileName = "MobiusNFT721.sol";
        const contractName = "MobiusNFT721";
        const finalContract = ERC721;
        const contractPath = `contracts/${contractFileName}`;

        // Write contract to disk
        fs.writeFileSync(contractPath, finalContract);

        const input = {
            language: "Solidity",
            sources: {
                [contractFileName]: { content: finalContract },
            },
            settings: {
                optimizer: { enabled: true, runs: 200 },
                evmVersion: "paris",
                outputSelection: {
                    "*": {
                        "*": ["abi", "evm.bytecode.object"],
                    },
                },
            },
        };

        function findImports(path) {
            return { error: "File not found" }; 
        }

        try {
            const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
            const compiledContracts = output.contracts[contractFileName];

            if (!compiledContracts) {
                return reject("No contracts found after compilation.");
            }

            const contract = compiledContracts[contractName];

            if (!contract || !contract.evm.bytecode.object) {
                return reject(`No valid bytecode found for ${contractName}`);
            }

            const abi = contract.abi;
            const bytecode = contract.evm.bytecode.object;

            fs.unlinkSync(contractPath);

            resolve({
                abi,
                bytecode,
                input,
                contractName,
                contractFileName
            });
        } catch (err) {
            reject("Compilation failed: " + err);
        }
    });
}

async function deployERC721Contract( initialOwner, tokenName, tokenSymbol, chainId ) {
    try {
        console.log("Deploying ERC721 contract...", { initialOwner, tokenName, tokenSymbol, chainId });
        if (!initialOwner || !tokenName || !tokenSymbol || !chainId) {
            throw new Error("Missing required parameters: initialOwner, tokenName, tokenSymbol, chainId");
        }
        
        const PRIVATE_KEY = process.env.PRIVATE_KEY;
        const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
        const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

        console.log("Generating contract...",PRIVATE_KEY, INFURA_PROJECT_ID, ETHERSCAN_API_KEY);
        
        const { abi, bytecode, input, contractName, contractFileName } = await generateERC721Contract();

        const rpc = chainId === 11155111
            ? `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`
            : `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;

        const provider = new ethers.providers.JsonRpcProvider(rpc);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);

        console.log("Deploying contract...");
        console.log(`Initial Owner: ${initialOwner}`);
        console.log(`Token Name: ${tokenName}`);        
        console.log(`Token Symbol: ${tokenSymbol}`);
        const contract = await factory.deploy(initialOwner, tokenName, tokenSymbol);
        await contract.deployed();
        console.log(`✅ Deployed at: ${contract.address}`);

        // Encode constructor arguments
        const encodedArgs = ethers.utils.defaultAbiCoder.encode(
            ["address", "string", "string"],
            [initialOwner, tokenName, tokenSymbol]
        ).slice(2);

        console.log("Waiting for contract to be indexed...");
        await new Promise(resolve => setTimeout(resolve, 120000)); // wait 2 minutes

        const result = await verifyContract({
            apiKey: ETHERSCAN_API_KEY,
            chainId: chainId.toString(),
            finalContract: JSON.stringify(input),
            contractAddress: contract.address,
            contractName: `${contractFileName}:${contractName}`,
            compilerVersion: "v0.8.22+commit.4fc1097e",
            optimizationUsed: "1",
            runs: "200",
            constructorArguments: encodedArgs,
        });

        return {
            contractAddress: contract.address,
            verification: result,
        };
    } catch (err) {
        return { error: err.toString() };
    }
}

async function verifyContract({
    apiKey,
    chainId,
    finalContract,
    contractAddress,
    contractName,
    compilerVersion,
    optimizationUsed,
    runs,
    constructorArguments
}) {
    const chainApiMap = {
        1: "https://api.etherscan.io/api",
        11155111: "https://api-sepolia.etherscan.io/api",
    };

    const apiUrl = chainApiMap[chainId];
    if (!apiUrl) throw new Error(`Unsupported chainId: ${chainId}`);

    const form = new FormData();
    form.append("module", "contract");
    form.append("action", "verifysourcecode");
    form.append("apikey", apiKey);
    form.append("contractaddress", contractAddress);
    form.append("sourceCode", finalContract);
    form.append("codeformat", "solidity-standard-json-input");
    form.append("contractname", contractName);
    form.append("compilerversion", compilerVersion);
    form.append("optimizationUsed", optimizationUsed);
    form.append("runs", runs);
    form.append("constructorArguments", constructorArguments);

    const response = await axios.post(apiUrl, form, {
        headers: form.getHeaders(),
    });

    if (response.data.status !== "1") {
        console.error("❌ Verification failed:", response.data);
        throw new Error(response.data.result || "Verification failed");
    }

    const guid = response.data.result;
    await new Promise(resolve => setTimeout(resolve, 5000));
    return await checkVerificationStatus(guid, apiKey, apiUrl);
}

async function checkVerificationStatus(guid, apiKey, apiUrl) {
    const params = {
        module: "contract",
        action: "checkverifystatus",
        guid: guid,
        apikey: apiKey,
    };

    const response = await axios.get(apiUrl, { params });
    console.log("🔎 Verification Status:", response.data);
    return response.data;
}

module.exports = { deployERC721Contract };
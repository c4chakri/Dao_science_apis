const { ethers } = require("ethers");
const DaoUtils = require("../utils/DAOutils.js");
const daoManagentABI = require("../artifacts/DaoManagement.json")
async function deployGT(options) {

    if (!options?.name) {
        throw new Error("Missing token name in deployment options");
    }
    if (!options?.chainId) {
        throw new Error("Missing chainId in deployment options");
    }
    if (!options?.symbol) {
        throw new Error("Missing token symbol in deployment options");
    }
    if (!options?.councilAddress) {
        throw new Error("Missing council address in deployment options");
    }

    // console.log("chain Id :::::", options.chainId);
    // console.log("api hitted from", options.triggeredFrom)
    
    try {

        const PRIVATE_KEY = process.env.PRIVATE_KEY;
        const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

        let networkRPC;
        let daoUtils;

        switch (options.chainId) {
            case 1:
                networkRPC = "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID";
                break;
            case 11155111:
                networkRPC = `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`;
                daoUtils = DaoUtils.SEPOLIA_DAO_UTILS;
                break;
            case 31337:
                networkRPC = "http://localhost:8545";
                daoUtils = DaoUtils.HARDHAT_DAO_UTILS;
                break;
            case 17000:
                networkRPC = "https://ethereum-holesky-rpc.publicnode.com";
                daoUtils = DaoUtils.HOLESKY_DAO_UTILS;
                break;
            default:
                return { error: `Unsupported chainId: ${options.chainId}` };
        }

        // console.log("[network] is an wallet ", networkRPC);

        const provider = new ethers.providers.JsonRpcProvider(networkRPC);

        if (!provider) {
            throw new Error("Failed to connect to RPC provider");
        }

        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        const gtPayload = {
            name: options.name,
            symbol: options.symbol,
            councilAddress: options.councilAddress
        };


        const daoManagementContract = new ethers.Contract(daoUtils.DAO_MANAGEMENT_ADDRESS, daoManagentABI.abi, wallet);
        const tx = await daoManagementContract.createGovernanceToken(gtPayload);
        // console.log("receipt", );
        const transactionHash = tx.hash;
        const receipt = await tx.wait();

        const deployedGTContractAddress = receipt.events[0].address;
        // console.log("deployedGTContractAddress", deployedGTContractAddress);


        return { deployedGTContractAddress,transactionHash };
    } catch (error) {
        // console.error("Error during compilation:", error);
        return { error }
    }
}

module.exports = { deployGT };





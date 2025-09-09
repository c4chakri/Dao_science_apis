const { ethers } = require("ethers");
const DAO_ABI = require("../artifacts/DAO.json").abi;
const GOVERNANCE_TOKEN_ABI = require("../artifacts/GovernanceToken.json").abi;
const { decodeRevertReason } = require("../utils/DAOutils.js");
const {getWalletByAddress,decryptPrivateKey} = require("../walletUtils.js");
require("dotenv").config();


const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;


function networkData(chainId) {
    switch (chainId) {
        case 1:
            return "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID";
        case 11155111:
            if (!INFURA_PROJECT_ID) {
                throw new Error("INFURA_PROJECT_ID environment variable is required for Sepolia");
            }
            return `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`;
        case 31337:
            return "http://localhost:8545";
        case 17000:
            return "https://ethereum-holesky-rpc.publicnode.com";
        default:
            throw new Error(`Unsupported chainId: ${chainId}`);
    }
}
const delegateVotes = async (options) => {
    const address = options.daoAdderss;
    const chainId = options.chainId;
    const delegateAddress = options.delegateAddress;

    try {

        if (!address) throw { code: 400, message: "Missing dao contract address" };
        if (!delegateAddress) throw { code: 400, message: "Missing delegate  address" };
        
        if (!chainId) throw { code: 400, message: "Missing chainId" };
        if (!ethers.utils.isAddress(address)) throw { code: 400, message: "Invalid Ethereum address format" };
        if (!ethers.utils.isAddress(delegateAddress)) throw { code: 400, message: "Invalid Ethereum address format of delegate" };



        const walleteAddres = options.sender

        const wallet = await getWalletByAddress(walleteAddres);
        if (!wallet || !wallet.agentId || !wallet.walletAddress || !wallet.encryptedKey || !wallet.iv || !wallet.tag) {
          throw new Error("Wallet Data not found");
        }
    
        
        const privateKey = decryptPrivateKey(wallet.encryptedKey, wallet.agentId, wallet.iv, wallet.tag);
    
    
        if (!privateKey) {
          throw new Error("Private key not found");
        }
    
        const PRIVATE_KEY = privateKey;

        const provider = new ethers.providers.JsonRpcProvider(networkData(chainId));
        const _wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        const contract = new ethers.Contract(address, DAO_ABI, _wallet);
        const governanceAddress = await contract.governanceToken();
        if(!governanceAddress) throw { code: 400, message: "Governance token address not found" };
        const governanceContract = new ethers.Contract(governanceAddress, GOVERNANCE_TOKEN_ABI, _wallet);
        if(!governanceContract) throw { code: 400, message: "Governance token contract not found" };
        const tx = await governanceContract.delegate(delegateAddress);
        const receipt = await tx.wait();
        return {
            transactionHash: receipt.transactionHash,
            status: receipt.status,
        };
    } catch (error) {
        console.error("[Delegate call] error:", error);
        return {
            error: {
                code: error.code || 500,
                message: error.message || "Failed to delegate votes",
            },
        };
    }
};

const claimVotes = async (options) => {
    const address = options.daoAddress;
    const chainId = options.chainId;

    try {
        if (!address) throw { code: 400, message: "Missing dao contract address" };
        if (!chainId) throw { code: 400, message: "Missing chainId" };
        if (!ethers.utils.isAddress(address)) throw { code: 400, message: "Invalid Ethereum address format" };
        const walleteAddres = options.sender
        const wallet = await getWalletByAddress(walleteAddres);
        if (!wallet || !wallet.agentId || !wallet.walletAddress || !wallet.encryptedKey || !wallet.iv || !wallet.tag) {
          throw new Error("Wallet Data not found");
        }
        const privateKey = decryptPrivateKey(wallet.encryptedKey, wallet.agentId, wallet.iv, wallet.tag);
        if (!privateKey) {
          throw new Error("Private key not found");
        }
    
        const PRIVATE_KEY = privateKey;

        const provider = new ethers.providers.JsonRpcProvider(networkData(chainId));
        const _wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        const contract = new ethers.Contract(address, DAO_ABI, _wallet);
        const governanceAddress = await contract.governanceToken();
        if(!governanceAddress) throw { code: 400, message: "Governance token address not found" };
        const governanceContract = new ethers.Contract(governanceAddress, GOVERNANCE_TOKEN_ABI, _wallet);
        if(!governanceContract) throw { code: 400, message: "Governance token contract not found" };
        
        const tx = await governanceContract.delegate(_wallet.address);
        const receipt = await tx.wait();
        return {
            transactionHash: receipt.transactionHash,
            status: receipt.status,
        };
    } catch (error) {
        console.error("[Claim call] error:", error);
        return {
            error: {
                code: error.code || 500,
                message: error.message || "Failed to claim votes",
            },
        };
    }
};

module.exports = {
    delegateVotes,
    claimVotes
};
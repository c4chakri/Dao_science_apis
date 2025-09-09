const { ethers } = require("ethers");
const DaoUtils = require("../utils/DAOutils.js");
const UtilityTokenABI = require("../artifacts/UTToken.json");
const { parseEther, parseUnits } = require("ethers/lib/utils.js");
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

// Validate environment variables
// if (!PRIVATE_KEY) {
//     console.error("PRIVATE_KEY environment variable is required");
//     process.exit(1);
// }

function networkData(chainId) {
    try {
        let networkRPC;
        let daoUtils;

        switch (chainId) {
            case 1:
                networkRPC = "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID";
                break;
            case 11155111:
                if (!INFURA_PROJECT_ID) {
                    throw new Error("INFURA_PROJECT_ID environment variable is required for Sepolia");
                }
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
                throw new Error(`Unsupported chainId: ${chainId}`);
        }

        return { networkRPC, daoUtils };
    } catch (error) {
        console.error("Error in networkData:", error);
        throw error; 
    }
}

function fromhexToNumber(hex) {
    try {
        return parseInt(hex, 16);
    } catch (error) {
        console.error("Error converting hex to number:", error);
        throw new Error("Failed to convert hex value to number");
    }
}

const getUTData = async (utAddress, chainId) => {
    try {
        if (!utAddress) {
            throw { code: 400, message: "Utility Token address is required" };
        }
        
        if (!chainId) {
            throw { code: 400, message: "Chain ID is required" };
        }
        
        if (!ethers.utils.isAddress(utAddress)) {
            throw { code: 400, message: "Invalid Token address format" };
        }

        const { networkRPC, daoUtils } = networkData(chainId);
        console.log("[network] is", networkRPC);

        const provider = new ethers.providers.JsonRpcProvider(networkRPC);
        if (!provider) {
            throw { code: 500, message: "Failed to connect to RPC provider" };
        }

        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        if (!wallet) {
            throw { code: 500, message: "Failed to connect to wallet" };
        }

        const utContract = new ethers.Contract(utAddress, UtilityTokenABI, wallet);
        if (!utContract) {
            throw { code: 500, message: "Failed to connect to Utility Token contract" };
        }

        const [
            name,
            symbol,
            decimals,
            owner,
            totalSupply,
            txnTaxWallet,
            rewardRates,
            actions,
            
        ] = await Promise.all([
            utContract.name(),
            utContract.symbol(),
            utContract.decimals(),
            utContract.owner(),
            utContract.totalSupply(),
            utContract.txnTaxWallet(),
            utContract.getRewardRates(),
            utContract.actions(),
        ]);

        let utilityActions= {
            canMint :actions[0],
            canBurn :actions[1],
            canPause:actions[2],
            canBlacklist:actions[3],
            canChangeOwner:actions[4],
            canTxTax:actions[5],
            canBuyBack:actions[6],
            canStake:actions[7]
        }

        return {
            name,
            symbol,
            owner,
            totalSupply: ethers.utils.formatUnits(totalSupply, decimals), 
            txnTaxWallet,
            rewardRates,
            utilityActions,
        };
    } catch (error) {
        // console.error("Error in getUTData:", error);
    
        if (error && typeof error.code === "number") {
          throw error;
        }
    
        if (error.code === "CALL_EXCEPTION") {
          throw {
            code: 400,
            message:
              "Contract call failed — make sure the address is a valid UtilityToken and implements all required methods",
          };
        }
    
        throw {
          code: 500,
          message: error.message || "Failed to fetch Utility Token data",
        };
      }
};


module.exports = { getUTData };
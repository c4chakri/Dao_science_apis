
const ethers = require("ethers");
const DaoUtils = require("../utils/DAOutils.js");
const daoFactoryABI = require("../artifacts/DAOFactory.json");
const daoManagentABI = require("../artifacts/DaoManagement.json");
const daoABI = require("../artifacts/DAO.json");
const gtABI = require("../artifacts/GovernanceToken.json");

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

function fromhexToNumber(hex) {
    try {
        return parseInt(hex, 16);
    } catch (error) {
        throw new Error(`Failed to convert hex to number: ${error.message}`);
    }
}

function networkData(chainId) {
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
}

const getGTdata = async (address, chainId) => {
    try {
        console.log("[getGTdata] is called");
        
        if (!address) {
            throw { code: 400, message: "Missing address" };
        }
        
        if (!chainId) {
            throw { code: 400, message: "Missing chainId" };
        }
        
        if (!ethers.utils.isAddress(address)) {
            throw { code: 400, message: "Invalid Ethereum address format" };
        }

        const { networkRPC, daoUtils } = networkData(chainId);
        
        if (!PRIVATE_KEY) {
            throw { code: 500, message: "PRIVATE_KEY environment variable is not set" };
        }

        const provider = new ethers.providers.JsonRpcProvider(networkRPC);

        if (!provider) {
            throw { code: 500, message: "Failed to connect to RPC provider" };
        }
        
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        if (!wallet) {
            throw { code: 500, message: "Failed to connect to wallet" };
        }
        
        const gtContract = new ethers.Contract(address, gtABI.abi, wallet);
        
        if (!gtContract) {
            throw { code: 500, message: "Failed to connect to contract" };
        }
       
        const [
            name,
            symbol,
            decimals,
            totalSupplyHex,
            _actions,
            governanceDaoAddress
        ] = await Promise.all([
            gtContract.name(),
            gtContract.symbol(),
            gtContract.decimals(),
            gtContract.totalSupply(),
            gtContract.actions(),
            gtContract.daoAddress()
        ]);

        const totalSupply = fromhexToNumber(totalSupplyHex);

        const gtData = {
            name,
            symbol,
            decimals,
            totalSupply,
            actions: {
                canMint: _actions[0],
                canBurn: _actions[1],
                canPause: _actions[2],
                canStake: _actions[3],
                canTransfer: _actions[4],
                canChangeOwner: _actions[5],
            },
            governanceDaoAddress
        };

        return gtData;
    } catch (error) {
        // console.error("[error] in getGTdata:", error);
        
        if (error && typeof error.code === "number") {
            throw error;
          }
        if (error.code === "CALL_EXCEPTION") {
            throw {
              code: 400,
              message:
                "Contract call failed — make sure the address is a valid Governance contract and implements all required methods",
            };
          }
        
        return { 
            error: {
                code: 500,
                message: error.message || "Failed to fetch governance token data"
            }
        };
    }
};

module.exports = { getGTdata };
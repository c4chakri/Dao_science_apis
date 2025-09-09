const { ethers } = require("ethers");
const DaoUtils = require("../utils/DAOutils.js");
const daoFactoryABI = require("../artifacts/DAOFactory.json");
const daoManagentABI = require("../artifacts/DaoManagement.json");
const daoABI = require("../artifacts/DAO.json");

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
        throw error; // Re-throw to be handled by the caller
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

const getDaoData = async (daoAddress, chainId) => {
    
    try {
        if (!daoAddress) {
            throw { code: 400, message: "DAO address is required" };
        }
        
        if (!chainId) {
            throw { code: 400, message: "Chain ID is required" };
        }
        
        if (!ethers.utils.isAddress(daoAddress)) {
            throw { code: 400, message: "Invalid DAO address format" };
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

        const daoContract = new ethers.Contract(daoAddress, daoABI.abi, wallet);
        if (!daoContract) {
            throw { code: 500, message: "Failed to connect to DAO contract" };
        }

        const [
            governanceToken,
            _daoSettings,
            _proposalCreationSettings,
            _governanceSettings,
            _DaoCreator,
            _isMultiSignDAO,
            _proposalCount,
            _membersCount
        ] = await Promise.all([
            daoContract.governanceToken(),
            daoContract._daoSettings(),
            daoContract._proposalCreationSettings(),
            daoContract.governanceSettings(),
            daoContract.DaoCreator(),
            daoContract.isMultiSignDAO(),
            daoContract.proposalId(),
            daoContract.membersCount()
        ]);

        const daoSettings = {
            name: _daoSettings[0],
            data: _daoSettings[1],
        };

        const proposalCreationSettings = {
            isTokenBasedProposal: _proposalCreationSettings[0],
            MinimumRequirement: fromhexToNumber(_proposalCreationSettings[1]),
        };

        const governanceSettings = {
            minimumParticipationPercentage: _governanceSettings[0],
            supportThresholdPercentage: _governanceSettings[1],
            minimumDurationForProposal: _governanceSettings[2],
            earlyExecution: _governanceSettings[3],
            canVoteChange: _governanceSettings[4],
        };

        return {
            daoSettings,
            governanceToken,
            proposalCreationSettings,
            governanceSettings,
            DaoCreator: _DaoCreator,
            DaoType: _isMultiSignDAO ? "MultiSignDAO" : "Token Based DAO",
            ProposalCount: fromhexToNumber(_proposalCount),
            MembersCount: fromhexToNumber(_membersCount),
        };
    } catch (error) {
        // console.error("Error in getDaoData:", error);
        
        if (error && typeof error.code === "number") {
            throw error;
          }
        if (error.code === "CALL_EXCEPTION") {
            throw {
              code: 400,
              message:
                "Contract call failed — make sure the address is a valid DAO contract and implements all required methods",
            };
          }

        
      
         
        throw { 
            code: 500, 
            message: error.message || "Failed to fetch DAO data" 
        };
    }
};


module.exports = { getDaoData };
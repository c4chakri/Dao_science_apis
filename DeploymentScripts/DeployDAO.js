const { ethers } = require("ethers");
const DaoUtils = require("../utils/DAOutils.js");
const daoFactoryABI = require("../artifacts/DAOFactory.json")
const daoManagentABI = require("../artifacts/DaoManagement.json")
require("dotenv").config();
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
if (!PRIVATE_KEY) {
    console.error("PRIVATE_KEY environment variable is required");
    process.exit(1);
}
if (!INFURA_PROJECT_ID) {
    console.error("INFURA_PROJECT_ID environment variable is required");
    process.exit(1);
}

if(!PRIVATE_KEY) {
    console.error("PRIVATE_KEY environment variable is required");
    process.exit(1);
}
if(!INFURA_PROJECT_ID) {
    console.error("INFURA_PROJECT_ID environment variable is required");
    process.exit(1);
}
function toHashBytes(input) {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(input));
}


function normalizeAddress(rawHex) {
    const hex = rawHex.replace(/^0x/, "").toLowerCase();

    const addr = hex.slice(-40);

    return ethers.utils.getAddress("0x" + addr);
}

function networkData(chainId) {
    let networkRPC;
    let daoUtils;

    switch (chainId) {
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

    return { networkRPC, daoUtils };

}
async function deployDAO(options) {

    if (!options?.daoCreator && !options?.daoCreator != "0x0000000000000000000000000000000000000000") {
        throw new Error("Missing daoCreator in deployment options");
    }
    if (!options?.chainId) {
        throw new Error("Missing chainId in deployment options");
    }



    try {


        const { networkRPC, daoUtils } = networkData(options.chainId);



        const provider = new ethers.providers.JsonRpcProvider(networkRPC);

        if (!provider) {
            throw new Error("Failed to connect to RPC provider");
        }

        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);


        const daoPayload = {
            daoSettings: [options.daoParams.name, toHashBytes(options.daoParams.data)],
            govToken: (options.govTokenAddress && ethers.utils.isAddress(options.govTokenAddress)) ? options.govTokenAddress : "0x0000000000000000000000000000000000000000",
            govParams: [options.govTokenParams.name, options.govTokenParams.symbol, options.govTokenParams.councilAddress],
            govSettings: [
                options.govTokenSettings.minimumParticipationPercentage,
                options.govTokenSettings.supportThresholdPercentage,
                options.govTokenSettings.minimumDurationForProposal,
                options.govTokenSettings.earlyExecution,
                options.govTokenSettings.canVoteChange
            ],
            daoMembres: options.daoMembers.members,
            proposalParams: [
                options.propsalCreationParams.isTokenBasedProposal,
                options.propsalCreationParams.MinimumRequirement
            ],
            isMultisigDao: options.isMultisigDao
        };


        const daoFactoryContract = new ethers.Contract(daoUtils.DAO_FACTORY_ADDRESS, daoFactoryABI.abi, wallet);

        const tx = await daoFactoryContract.createDAO(
            daoPayload.daoSettings,
            daoPayload.govToken,
            daoPayload.govParams,
            daoPayload.govSettings,
            daoPayload.daoMembres,
            daoPayload.proposalParams,
            daoPayload.isMultisigDao
        );
        const receipt = await tx.wait();

        const deployedGTContractAddress = receipt.events[0].address;
        const deployedDAOContractAddress = normalizeAddress(receipt.events[4].topics[2]);
        // console.log("deployedDAOContractAddress", deployedDAOContractAddress);
        // console.log("deployedGTContractAddress", deployedGTContractAddress);

        const transactionHash = tx.hash
        return { deployedDAOContractAddress, deployedGTContractAddress, transactionHash };
    } catch (error) {
        console.error("Error during compilation:", error);
        return { error }
    }
}

module.exports = { deployDAO };
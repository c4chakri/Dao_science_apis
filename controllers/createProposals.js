
const ethers = require("ethers");
require("dotenv").config();
const DaoUtils = require("../utils/DAOutils.js");
const { getWalletByAddress, decryptPrivateKey } = require("../walletUtils.js");
const {getVotingPower} = require('../daoControllers/getVotingPower.js')
const DAO_MANAGEMENT_CONTRACT_ABI = require("../artifacts/DaoManagement.json");
const PROPOSAL_ABI = require("../artifacts/Proposal.json").abi;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
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

async function createProposal(options) {

    if (!options?.chainId) {
        throw new Error("Missing chainId in deployment options");
    }
    if (!options?.sender) {
        throw new Error("Missing sender in deployment options");
    }
    const { networkRPC, daoUtils } = networkData(options.chainId);

    const walleteAddres = options.sender

    const wallet = await getWalletByAddress(walleteAddres);
    if (!wallet || !wallet.agentId || !wallet.walletAddress || !wallet.encryptedKey || !wallet.iv || !wallet.tag) {
        throw new Error("Wallet Data not found");
    }


    const { encryptedKey, iv, tag } = wallet;

    const privateKey = decryptPrivateKey(wallet.encryptedKey, wallet.agentId, wallet.iv, wallet.tag);


    if (!privateKey) {
        throw new Error("Private key not found");
    }
    const PRIVATE_KEY = privateKey;
    const DAO_MANAGEMENT_CONTRACT_ADDRESS = daoUtils.DAO_MANAGEMENT_ADDRESS;



    try {
        const provider = new ethers.providers.JsonRpcProvider(networkRPC);

        if (!provider) {
            throw new Error("Failed to connect to RPC provider");
        }

        const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        const signerAddress = await signer.getAddress();

        // Contract instance
        const daoManagementContract = new ethers.Contract(
            DAO_MANAGEMENT_CONTRACT_ADDRESS,
            DAO_MANAGEMENT_CONTRACT_ABI.abi,
            signer
        );

        // Params
        const daoAddress = options.daoAddress;
        const title = options.title;
        const description = options.description;
        const minApproval = options.minApproval;
        const startTime = options.startTime;
        const duration = options.duration;
        const actionId = options.actionId;
        const constructActions = options.actions.map(([to, value, data]) => ({
            to,
            value,
            data
        }));

        // Call createProposal
        const tx = await daoManagementContract.createProposal(
            daoAddress,
            title,
            description,
            minApproval,
            startTime,
            duration,
            actionId,
            constructActions
        );

        // console.log("Transaction submitted:", tx.hash);

        const receipt = await tx.wait();
        // console.log("Proposal created in block:", receipt.blockNumber);
        // console.log("Events:", receipt.events);
        const event = receipt.events?.find((e) => e.event === "proposalCreated");

        let proposalAddress;
        if (event && event.args && event.args.proposal) {
            proposalAddress = event.args.proposal;
        } else if (event && event.args && event.args[0]) {
            proposalAddress = event.args[0];
        } else {
            throw new Error("proposalCreated event not found in receipt");
        }

        // console.log("✅ Proposal Address:", proposalAddress);

        return { proposalAddress, transactionHash: tx.hash };
    } catch (error) {
        console.error("Error creating proposal:", error);
    }
}

async function executeProposal(options) {

    if (!options.proposalAddress) throw new Error("Missing proposalAddress in deployment options");
    if (!options.chainId) throw new Error("Missing chainId in deployment options");
    if (!options.sender) throw new Error("Missing sender in deployment options");
    if (!ethers.utils.isAddress(options.proposalAddress)) throw new Error("Invalid Ethereum address format");
    if (!ethers.utils.isAddress(options.sender)) throw new Error("Invalid Ethereum Sender address format");
    const { networkRPC, daoUtils } = networkData(options.chainId);
    const provider = new ethers.providers.JsonRpcProvider(networkRPC);

    const walleteAddres = options.sender

    const wallet = await getWalletByAddress(walleteAddres);
    if (!wallet || !wallet.agentId || !wallet.walletAddress || !wallet.encryptedKey || !wallet.iv || !wallet.tag) {
        throw new Error("Wallet Data not found");
    }


    const { encryptedKey, iv, tag } = wallet;

    const privateKey = decryptPrivateKey(wallet.encryptedKey, wallet.agentId, wallet.iv, wallet.tag);


    if (!privateKey) {
        throw new Error({code:400,error:"Private key not found"});
    }
    const PRIVATE_KEY = privateKey;

    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = await signer.getAddress();

    const proposalContract = new ethers.Contract(
        options.proposalAddress,
        PROPOSAL_ABI,
        signer
    )
    const isApproved = await proposalContract.approved();
    if (!isApproved) {
        throw new Error("GOVERNANCE: Proposal not approved to execute");
    }
    const getVotingUnits = await getVotingPower(options.proposalAddress, options.sender, options.chainId);

    if(getVotingUnits.votingPower < 0) {
        throw new Error("Not enough voting power");
    }
    
    try {
        const tx = await proposalContract.executeProposal();
        const receipt = await tx.wait();
        return { transactionHash: tx.hash,status: receipt.status };
    } catch (error) {
        return { error: error.message };
    }
}
// const options = {
//     chainId: 11155111,
//     daoAddress: "0x7Afa66592749D1b80A05a8e28E96Ecc72805257D",
//     title: "add",
//     description: "add",
//     minApproval: 1,
//     startTime: 1756964976,
//     duration: 1188623,
//     actionId: 0,
//     actions: [
//         [
//             "0x7Afa66592749D1b80A05a8e28E96Ecc72805257D",
//             0,
//             "0xb9183515000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000009e6a5818cc4a1b449ece2c887baf820b67924b3200000000000000000000000000000000000000000000000029a2241af62c0000"
//         ]
//     ]
// }
// createProposal(options);

module.exports = { createProposal, executeProposal };
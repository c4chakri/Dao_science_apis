const { ethers } = require("ethers");
const proposalABI = require("../artifacts/Proposal.json");
const { decodeRevertReason } = require("../utils/DAOutils.js");
const {getWalletByAddress,decryptPrivateKey} = require("../walletUtils.js");
require("dotenv").config();
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

function normalizeValue(value) {
  if (ethers.BigNumber.isBigNumber(value)) {
    return value.toString();
  }
  return value;
}

function normalizeResponse(data) {
  if (Array.isArray(data)) {
    return data.map(normalizeResponse);
  } else if (data && typeof data === "object" && !ethers.BigNumber.isBigNumber(data)) {
    const result = {};
    for (const key of Object.keys(data)) {
      result[key] = normalizeResponse(data[key]);
    }
    return result;
  }
  return normalizeValue(data);
}

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
// const castVote = async (options) => {
//   const address = options.proposalAddress;
//   const chainId = options.chainId;
//   const voteType = Number(options.voteType) ;

//   try {
//     console.log("[voting ] called");

//     if (!address) throw { code: 400, message: "Missing proposal contract address" };
//     if (!chainId) throw { code: 400, message: "Missing chainId" };
//     if (!ethers.utils.isAddress(address)) throw { code: 400, message: "Invalid Ethereum address format" };

//     const PRIVATE_KEY = '0x1045d33ada829a6f225cc43a9e14ef27dc14584eb8e119f5fea17081da3f879f';
//     const provider = new ethers.providers.JsonRpcProvider(networkData(chainId));
//     const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
//     const contract = new ethers.Contract(address, proposalABI.abi, wallet);
    
//     const hasVoted = await contract.hasVoted(wallet.address);
//     if(hasVoted){
//       throw { code: 200, message: "You have already voted on this proposal" };
//     }
//     const isExecuted = await contract.executed();
//     if(isExecuted){
//       throw { code: 200, message: "Proposal has already been executed" };
//     }
//     const endTime = await contract.endTime();
//     const currentTime = Math.floor(Date.now() / 1000);
//     // console.log("[castVote] currentTime:", currentTime);
//     // console.log("[castVote] endTime:", endTime);
    
//     if(currentTime > endTime){
//       throw { code: 200, message: "Proposal has already ended" };
//     }
//     const tx = await contract.vote(voteType); 
//     const receipt = await tx.wait();
//     // console.log("[castVote] tx:", tx);
    
//     // console.log("[castVote] receipt:", receipt);

//     return {
//       transactionHash: receipt.transactionHash,
//       status: receipt.status, //  success (1) or fail (0)
//     };
//   } catch (error) {
//     console.error("[Voting] error:", error);
//     return {
//       error: {
//         code: error.code || 500,
//         message: error.message || "Failed to Vote on proposal",
//       },
//     };
//   }
// };

const castVote = async (options) => {
  const proposalAddress = options.proposalAddress;
  const chainId = options.chainId;
  const voteType = Number(options.voteType);

  try {
    console.log("[voting] called");

    if (!proposalAddress) throw { code: 400, message: "Missing proposal contract address" };
    if (!chainId) throw { code: 400, message: "Missing chainId" };
    if (!ethers.utils.isAddress(proposalAddress)) throw { code: 400, message: "Invalid Ethereum address format" };
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
    const provider = new ethers.providers.JsonRpcProvider(networkData(chainId));
    const wallet_ = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(proposalAddress, proposalABI.abi, wallet_);

    const hasVoted = await contract.hasVoted(wallet_.address);
    if (hasVoted) {
      throw { code: 200, message: "GOVERNANCE: You have already voted on this proposal" };
    }
    const isExecuted = await contract.executed();
    if (isExecuted) {
      throw { code: 200, message: "GOVERNANCE: Proposal has already been executed" };
    }
    const endTime = await contract.endTime();
    const currentTime = Math.floor(Date.now() / 1000);
    // console.log("[castVote] currentTime:", currentTime);
    // console.log("[castVote] endTime:", endTime);

    if (currentTime > endTime) {
      throw { code: 200, message: "Proposal has already ended" };
    }
    const tx = await contract.vote(voteType);
    const receipt = await tx.wait();
    // console.log("[castVote] tx:", tx);

    // console.log("[castVote] receipt:", receipt);

    return {
      transactionHash: receipt.transactionHash,
      status: receipt.status, // success (1) or fail (0)
    };
  } catch (error) {
    console.error("[Voting] error:", error);
    return {
      error: {
        code: error.code || 500,
        message: error.message || "Failed to Vote on proposal",
      },
    };
  }
};

const getProposalData = async (address, chainId) => {
  try {
    console.log("[getProposalData] called");

    if (!address) {
      throw { code: 400, message: "Missing proposal contract address" };
    }
    if (!chainId) {
      throw { code: 400, message: "Missing chainId" };
    }
    if (!ethers.utils.isAddress(address)) {
      throw { code: 400, message: "Invalid Ethereum address format" };
    }
    if (!PRIVATE_KEY) {
      throw { code: 500, message: "PRIVATE_KEY environment variable is not set" };
    }

    const provider = new ethers.providers.JsonRpcProvider(networkData(chainId));
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(address, proposalABI.abi, wallet);

    const data = {};
    data.approved = await contract.approved();
    data.canVoteChange = await contract.canVoteChange();
    data.daoAddress = await contract.daoAddress();
    data.earlyExecution = await contract.earlyExecution();
    data.startTime = await contract.startTime();
    data.endTime = await contract.endTime();
    data.executed = await contract.executed();
    data.governanceTokenAddress = await contract.governanceTokenAddress();
    data.minApproval = await contract.minApproval();
    data.minimumDurationForProposal = await contract.minimumDurationForProposal();
    data.minimumParticipationPercentage = await contract.minimumParticipationPercentage();
    data.abstainVotes = await contract.abstainVotes();
    data.yesVotes = await contract.yesVotes();
    data.noVotes = await contract.noVotes();
    data.proposalDescription = await contract.proposalDescription();
    data.proposalTitle = await contract.proposalTitle();
    data.proposerAddress = await contract.proposerAddress();
    data.startTime = await contract.startTime();
    data.status = await contract.status();
    data.supportThresholdPercentage = await contract.supportThresholdPercentage();

    const actions = [];
    let index = 0;
    while (true) {
      try {
        const action = await contract.actions(index);
        actions.push({
          to: action.to,
          value: action.value.toString(),
          data: action.data,
        });
        index++;
      } catch (err) {
        break;
      }
    }
    data.actions = actions;

    const normalizedData = normalizeResponse(data);

    return {
      contractAddress: address,
      data: normalizedData,
    };
  } catch (error) {
    console.error("[getProposalData] error:", error);
    return {
      error: {
        code: 500,
        message: error.message || "Failed to fetch proposal data",
      },
    };
  }
};



// const options = {
//   proposalAddress: "0x479ea7cA10a387DbB2e8eeE69F94024a8A69B56e",
//   chainId: 11155111,
//   voteType:1
// }

// const revertData = "0x7a19ed05"; // 0x7c9a1cf9
// const proposalAbi = [
//   "error ActionExecutionFailed()",
//   "error AlreadyVoted()",
//   "error InsufficientPower()"
// ];

// console.log("Revert Message",decodeRevertReason(revertData, proposalAbi));
// castVote(options);
module.exports = { getProposalData, castVote };

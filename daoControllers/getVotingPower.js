
const { ethers } = require("ethers");
const proposalABI = require("../artifacts/Proposal.json").abi;

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

function networkData(chainId) {
  switch (parseInt(chainId)) {
    case 1:
      return `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;
    case 11155111:
      if (!INFURA_PROJECT_ID) throw new Error("INFURA_PROJECT_ID required for Sepolia");
      return `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`;
    case 31337:
      return "http://localhost:8545";
    case 17000:
      return "https://ethereum-holesky-rpc.publicnode.com";
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
}

const getVotingPower = async (proposalAddress, userAddress, chainId) => {
  try {
    if (!proposalAddress) throw { code: 400, message: "Missing Proposal contract address" };
    if (!userAddress) throw { code: 400, message: "Missing user address" };
    if (!ethers.utils.isAddress(proposalAddress)) throw { code: 400, message: "Invalid Proposal address" };
    if (!ethers.utils.isAddress(userAddress)) throw { code: 400, message: "Invalid user address" };

    const provider = new ethers.providers.JsonRpcProvider(networkData(chainId));
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const contract = new ethers.Contract(proposalAddress, proposalABI, wallet);

    const votingPowerBN = await contract._getVotingUnits(userAddress);

    return {
      proposalAddress,
      userAddress,
      chainId,
      votingPower: votingPowerBN.toString()
    };
  } catch (error) {
    console.error("[getVotingPower] error:", error);
    return {
      error: {
        code: error.code || 500,
        message: error.message || "Failed to fetch voting power"
      }
    };
  }
};

module.exports = { getVotingPower };

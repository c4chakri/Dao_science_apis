const { ethers } = require("ethers");
const daoABI = require("../artifacts/DAO.json").abi;

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

function networkData(chainId) {
  switch (parseInt(chainId)) {
    case 1:
      return "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID";
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

const getProposals = async (daoAddress, chainId) => {
  try {
    if (!daoAddress) throw { code: 400, message: "Missing DAO contract address" };
    if (!chainId) throw { code: 400, message: "Missing chainId" };
    if (!ethers.utils.isAddress(daoAddress)) throw { code: 400, message: "Invalid address" };
    if (!PRIVATE_KEY) throw { code: 500, message: "PRIVATE_KEY not set" };

    const provider = new ethers.providers.JsonRpcProvider(networkData(chainId));
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(daoAddress, daoABI, wallet);

    const totalProposalsBN = await contract.proposalId();
    const totalProposals = totalProposalsBN.toNumber();

    const proposals = [];
    //Skip index 0
    for (let i = 1; i <= totalProposals; i++) {
      try {
        const proposal = await contract.proposals(i);

        if (proposal.deployedProposalAddress === ethers.constants.AddressZero) continue;

        proposals.push({
          deployedProposalAddress: proposal.deployedProposalAddress,
          creator: proposal.creator,
          title: proposal.title,
          id: proposal.id.toString()
        });
      } catch (err) {
        console.error(`Error fetching proposal ${i}:`, err.message);
      }
    }

    return {
      daoAddress,
      totalProposals: proposals.length,
      proposals
    };
  } catch (error) {
    console.error("[getProposals] error:", error);
    return {
      error: {
        code: error.code || 500,
        message: error.message || "Failed to fetch proposals"
      }
    };
  }
};

module.exports = { getProposals };
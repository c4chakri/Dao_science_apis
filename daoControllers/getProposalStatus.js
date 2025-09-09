const { ethers } = require("ethers");
require("dotenv").config();

const proposalABI = require("../artifacts/Proposal.json").abi;
const tokenABI = require("../artifacts/GovernanceToken.json").abi;

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

function toPercent(value, total) {
  if (total.isZero()) return 0;
  return (
    (Number(ethers.utils.formatUnits(value, 0)) /
      Number(ethers.utils.formatUnits(total, 0))) *
    100
  );
}

function decodeStatus(statusValue) {
  switch (Number(statusValue)) {
    case 0: return "Not Started";
    case 1: return "Active";
    case 2: return "Approved";
    case 3: return "Executed";
    default: return "Unknown";
  }
}

async function getProposalStatus(proposalAddress, chainId) {
  let rpcUrl;
  switch (chainId) {
    case 11155111:
      rpcUrl = `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`;
      break;
    case 1:
      rpcUrl = `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;
      break;
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  // ✅ FIX: pass proposalABI directly
  const proposal = new ethers.Contract(proposalAddress, proposalABI, provider);

  const [
    governanceTokenAddress,
    minParticipation,
    supportThreshold,
    yesVotes,
    noVotes,
    abstainVotes,
    endTime,
    earlyExecution,
    status
  ] = await Promise.all([
    proposal.governanceTokenAddress(),
    proposal.minimumParticipationPercentage(),
    proposal.supportThresholdPercentage(),
    proposal.yesVotes(),
    proposal.noVotes(),
    proposal.abstainVotes(),
    proposal.endTime(),
    proposal.earlyExecution(),
    proposal.status(),
  ]);

  const token = new ethers.Contract(governanceTokenAddress, tokenABI, provider);
  const totalSupply = await token.totalSupply();

  const totalVotes = yesVotes.add(noVotes).add(abstainVotes);

  const participationAchieved = toPercent(totalVotes, totalSupply);
  const supportAchieved = totalVotes.isZero()
    ? 0
    : (Number(ethers.utils.formatUnits(yesVotes, 0)) /
        Number(ethers.utils.formatUnits(totalVotes, 0))) *
      100;

 const now = Math.floor(Date.now() / 1000);
  const endTimePassed = now > Number(endTime);

  return {
    minimumParticipationPercentage: Number(minParticipation),
    participationAchieved: participationAchieved.toFixed(2),
    supportThresholdPercentage: Number(supportThreshold),
    supportAchieved: supportAchieved.toFixed(2),
    endTimePassed,
    earlyExecution,
    statusText: decodeStatus(status)
  };
}

module.exports = { getProposalStatus };

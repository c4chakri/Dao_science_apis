
const HARDHAT_DAO_UTILS = {
    DAO_MANAGEMENT_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    DAO_FACTORY_ADDRESS: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"

}

// const SEPOLIA_DAO_UTILS = {
//     DAO_MANAGEMENT_ADDRESS: "0x41c84a55B64af966ccA9d4DeB9581E07AFea5c98",
//     DAO_FACTORY_ADDRESS: "0x092dF2d3a6d7BaF3Db892f66f71F176Fd1c05192"
// }
const SEPOLIA_DAO_UTILS = {
    DAO_MANAGEMENT_ADDRESS: "0xD7f0E82C30C832548130B847f3c6709492593195",
    DAO_FACTORY_ADDRESS: "0x3CB6AfA66Da96138C367f99B8033959F06ce28C1"
}

const HOLESKY_DAO_UTILS = {
    DAO_MANAGEMENT_ADDRESS: "0xCC137065cD4Cc2282dcfEC743B196C987f8Ab908",
    DAO_FACTORY_ADDRESS: "0x55D820D556F4B8fEdCa9d68f3144995f593f6694"
}

// const networksData=(chainId) => {
//     switch (chainId) {
//         case 1:
//             return HARDHAT_DAO_UTILS;
//         case 11155111:
//             return SEPOLIA_DAO_UTILS;
//         case 80001:
//             return HOLEKSYS_DAO_UTILS;
//         default:
//             return null;
//     }
// }

function decodeRevertReason(data) {
    try {
      const iface = new ethers.utils.Interface(proposalAbi);
      const decoded = iface.parseError(data);
      return `Custom Error: ${decoded.name}(${decoded.args.join(", ")})`;
    } catch (err) {
      try {
        const reason = ethers.utils.toUtf8String("0x" + data.slice(10));
        return `Revert Reason: ${reason}`;
      } catch {
        return `Unknown error data: ${data}`;
      }
    }
  }

module.exports = { HARDHAT_DAO_UTILS, SEPOLIA_DAO_UTILS,HOLESKY_DAO_UTILS, decodeRevertReason };
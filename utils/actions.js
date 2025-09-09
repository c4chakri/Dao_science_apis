
const { ethers } = require('ethers');




async function encodeAddDAOMembers(options) {

    const { daoAddress, memberAddresses, deposits } = options;
    if (!memberAddresses || !deposits) throw { code: 400, message: "Member addresses and deposits are required" };
    if (memberAddresses.length !== deposits.length) throw { code: 400, message: "Member addresses and deposits must be of equal length" };



    const members = options.memberAddresses.map((address, index) => ({
        memberAddress: address,
        deposit: ethers.utils.parseEther(options.deposits[index].toString())
    }));

    const abiFragment = [
        "function addDAOMembers((address memberAddress, uint256 deposit)[] members) external"
    ];

    const iface = new ethers.utils.Interface(abiFragment);


    const encodedData = iface.encodeFunctionData('addDAOMembers', [members]);

    const action = [
        options.daoAddress,
        0,
        encodedData
    ]
    return ([action]);
}

const options = {
    actionType: "addDAOMembers",
    daoAddress: "0x46fBA006CB7488D319111cdE86b9E7d36f2a3D0d",
    memberAddresses: ["0x804a00c75a095841C81530153C62B3fE428Ce20a"],
    deposits: [10]
}

// encodeAddDAOMembers(options).then((encodedData) => {
  
//     console.log("Action Tuple Array:", encodedData);
// });

const getActions = async (options) => {
    if(!options.actionType) throw { code: 400, message: "Action type is required" };
    switch (options.actionType) {
        case "addDAOMembers":
            return await encodeAddDAOMembers(options);
        default:
            throw { code: 400, message: "Invalid action type" };
    }
    
}

module.exports = { getActions };
const { ethers } = require('ethers');

async function getTokenData(chainId, contractAddress) {
    let rpcUrl;
    switch (chainId) {
        case 1:
            rpcUrl = 'https://eth.llamarpc.com'; // https://mainnet.infura.io/v3/e427baed8ae44e6ba79e542b53c0a524
            break;
        case 137:
            rpcUrl = 'https://polygon-rpc.com/';
            break;
        case 11155111:
            rpcUrl = 'https://sepolia.infura.io/v3/e427baed8ae44e6ba79e542b53c0a524';
            break;
        default:
            return { error: `Unsupported chainId: ${chainId}` };
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)"
    ];

    const contract = new ethers.Contract(contractAddress, erc20Abi, provider);

    try {
        const network = await provider.getNetwork();

        const name = await contract.name();
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();
        const totalSupply = await contract.totalSupply();

        const erc20Data = {
            networkName: network.name,
            chainId: network.chainId,
            name,
            symbol,
            decimals,
            totalSupply: ethers.utils.formatUnits(totalSupply, decimals)
        };

        return erc20Data;
    } catch (error) {
        return { error: error.reason || error.message || "Unknown error occurred" };
    }
}

module.exports = { getTokenData };


// Ethereum Sepolia

// const chainId = 11155111;
// const contractAddress = '0x28a9BBCB900e4bE4541761E66681f0704e7aB5Ad';

// Polygon Mainnet
// const chainId = 137;
// const contractAddress = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619';

// Ethereum Mainnet

// const chainId = 1;
// const contractAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7';


// getTokenData(chainId, contractAddress)
//     .then(erc20Data => console.log(`ERC20 Data: ${JSON.stringify(erc20Data, null, 2)}`))
//     .catch(err => console.error(err));

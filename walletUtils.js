const { ethers } = require("ethers");
const crypto = require("crypto");
const axios = require("axios");
require("dotenv").config();

const PI_SCHEMA_URL =
  "https://ig.gov-cloud.ai/pi-entity-instances-service/v2.0/schemas/68b7e69a449b0c059a42ae34/instances";
const AUTH_TOKEN = process.env.PI_AUTH_TOKEN;
const SALT = process.env.WALLET_SALT;

const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const fundingWallet = new ethers.Wallet(process.env.FUNDING_PRIVATE_KEY, provider);
function encryptPrivateKey(privateKey, agentId) {
  const key = crypto.scryptSync(agentId + SALT, "unique_salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    encryptedKey: encrypted,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

function decryptPrivateKey(encryptedKey, agentId, ivHex, tagHex) {
  // console.log("encryptedKey", encryptedKey, ivHex, tagHex);
  
  const key = crypto.scryptSync(agentId + SALT, "unique_salt", 32);
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);


  let decrypted = decipher.update(encryptedKey, "hex", "utf8");
  decrypted += decipher.final("utf8");

  // console.log("Decrypted private key:", decrypted);
  
  return decrypted;
}

async function fundWallet(recipientAddress) {
  try {
    const balance = await provider.getBalance(fundingWallet.address);
    const minRequired = ethers.utils.parseEther("0.1");

    if (balance.lt(minRequired)) {
      throw new Error(
        `Insufficient balance in funding wallet. Current: ${ethers.utils.formatEther(balance)} ETH, Required: 0.1 ETH`
      );
    }

    const tx = await fundingWallet.sendTransaction({
      to: recipientAddress,
      value: minRequired,
    });

    console.log(`Funding transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`Wallet funded: ${recipientAddress} with 0.1 Sepolia ETH`);

    return tx.hash;
  } catch (err) {
    console.error("Funding failed:", err.message);
    throw err;
  }
}


async function createWallet(agentId) {
  const existingWallet = await getWallet(agentId);
  if (existingWallet) {
      return {
      error: true,
      message: `Wallet already exists for agentId: ${agentId}`,
    };
  }

  const wallet = ethers.Wallet.createRandom();
  const encryptedData = encryptPrivateKey(wallet.privateKey, agentId);

  await axios.post(
    PI_SCHEMA_URL,
    {
      data: [
        {
          agentId,
          agentAddress: wallet.address,
          agentPrivateKey: encryptedData.encryptedKey,
          iv: encryptedData.iv,
          tag: encryptedData.tag,
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    }
  );

  let fundingTx = null;
  try {
    fundingTx = await fundWallet(wallet.address);
  } catch (err) {
    console.warn(`⚠️ Wallet created but not funded: ${err.message}`);
  }

  return {
    agentId,
    walletAddress: wallet.address,
    encryptedKey: encryptedData.encryptedKey,
    iv: encryptedData.iv,
    tag: encryptedData.tag,
    fundingTx, 
  };
}


async function getWallet(agentId) {
  try {
    const response = await axios.post(
      `${PI_SCHEMA_URL}/list?page=0&size=50&showDBaaSReservedKeywords=true&showPageableMetaData=true`,
      {
        dbType: "TIDB",
        filter: { agentId },
      },
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const records = response.data?.content || [];
    if (records.length === 0) {
      console.log(`No wallet found for agentId ${agentId}`);
      return null; 
    }

    const record = records[0];
    return {
      agentId,
      walletAddress: record.agentAddress,
      encryptedKey: record.agentPrivateKey,
      iv: record.iv,
      tag: record.tag,
    };
  } catch (err) {
    console.error("Error fetching wallet:", err.response?.data || err.message);
    throw err;
  }
}

async function getWalletByAddress(walletAddress) {
  try {
    const response = await axios.post(
      `${PI_SCHEMA_URL}/list?page=0&size=50&showDBaaSReservedKeywords=true&showPageableMetaData=true`,
      {
        dbType: "TIDB",
        filter: { agentAddress: walletAddress }, 
      },
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const records = response.data?.content || [];
    // console.log("Records fetched:", records);

    if (records.length === 0) {
      console.log(`No wallet found for address ${walletAddress}`);
      return null;
    }

    const record = records[0];
    return {
      agentId: record.agentId,
      walletAddress: record.agentAddress,
      encryptedKey: record.agentPrivateKey,
      iv: record.iv,
      tag: record.tag,
    };
  } catch (err) {
    console.error("Error fetching wallet by address:", err.response?.data || err.message);
    throw err;
  }
}


module.exports = {
  createWallet,
  getWallet,
  decryptPrivateKey,
  getWalletByAddress
};
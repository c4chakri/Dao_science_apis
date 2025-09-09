// server.js
const express = require('express')
const bodyParser = require('body-parser')
const ethers = require("ethers");

const cors = require('cors')
const { generateERC20Contract } = require('./generateERC20.js')
const { generateERC721Contract } = require('./generateERC721.js')
const { generateERC1155Contract } = require('./generateERC1155.js')
const { generateGT } = require('./generateGT.js')
const { generateGovernor } = require('./generateGovernor.js')
const { generalGeneral } = require('./generateGeneral.js')
const { getTokenData } = require('./getErc20data.js');
const { deployERC20Contract } = require('./deployERC20.js');
const { deployGT } = require('./DeploymentScripts/DeployGT.js')
const { deployDAO } = require('./DeploymentScripts/DeployDAO.js')
const {createProposal,executeProposal} = require('./controllers/createProposals.js')
const {getDaoData} = require('./daoControllers/getDaoData.js')
const {getUTData} = require('./daoControllers/getUTdata.js')
const { ERC20Code } = require('./ERC20Code.js')
const {getGTdata} = require('./daoControllers/getGTdata.js')
const {deployERC721Contract} = require('./deployERC721.js')
const {delegateVotes,claimVotes} = require('./controllers/daoControllers.js')
// const { createWallet, getWallet, decryptPrivateKey } = require("./walletUtils");
const { createWallet, getWallet, getWalletByAddress, decryptPrivateKey } = require("./walletUtils.js");
const { getProposalData,castVote } = require("./daoControllers/getProposalData.js");
const { getProposals } = require("./daoControllers/getProposal.js");
const { getVotingPower, getGovernanceTokenAddress } = require("./daoControllers/getVotingPower.js");
const { getProposalStatus } = require("./daoControllers/getProposalStatus.js");
const {getActions} = require('./utils/actions.js')
const app = express()
const port = 8080

app.use(bodyParser.json())
app.use(cors());


app.post('/create-erc20-contract', async (req, res) => {
	try {
		const erc20Options = req.body
		const { abi, bytecode } = await generateERC20Contract(erc20Options)
		res.status(200).json({ abi, bytecode })
	} catch (error) {
		res.status(500).json({
			code: 500,
			message: error,
		})
	}
})

app.post('/create-general-contract', async (req, res) => {
	try {
		const contractOptions = req.body
		const { abi, bytecode } = await generalGeneral(contractOptions)
		res.status(200).json({ abi, bytecode })
	} catch (error) {
		res.status(500).json({
			code: 500,
			message: error,
		})
	}
})


app.post("/deploy-erc721", async (req, res) => {
    try {
        const options = req.body;
		console.log("Options:", options);		
		const { initialOwner, tokenName, tokenSymbol, chainId } = options.params;

    if (!initialOwner || !tokenName || !tokenSymbol || !chainId) {
        return res.status(400).json({ error: "Missing required parameters" });
    }
    
        const result = await deployERC721Contract(
			initialOwner,
			tokenName,
			tokenSymbol,
			chainId
		);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/create-erc1155-contract', async (req, res) => {
	try {
		const erc1155Options = req.body
		const { abi, bytecode } = await generateERC1155Contract(erc1155Options)
		res.status(200).json({ abi, bytecode })
	} catch (error) {
		res.status(500).json({
			code: 500,
			message: error,
		})
	}
})

app.post('/create-gt-contract', async (req, res) => {
	try {
		const gtOptions = req.body
		const { abi, bytecode } = await generateGT(gtOptions)
		res.status(200).json({ abi, bytecode })
	} catch (error) {
		res.status(500).json({
			code: 500,
			message: error,
		})
	}
})

app.post('/create-governor-contract', async (req, res) => {
	try {
		const governorOptions = req.body
		const { abi, bytecode } = await generateGovernor(governorOptions)
		res.status(200).json({ abi, bytecode })
	} catch (error) {
		res.status(500).json({
			code: 500,
			message: error,
		})
	}
})
app.post('/get-erc20-data', async (req, res) => {
	const { chainId, contractAddress } = req.body

	try {
		const erc20Data = await getTokenData(chainId, contractAddress)
		res.status(200).json(erc20Data)
	} catch (error) {
		res.status(500).json({
			code: 500,
			message: error,
		})
	}
})
app.get('/', (req, res) => {
	res.send('Hello')
})

app.get('/secret-path', (req, res) => {
	res.status(200).send('You are at the right place!')
})



app.post('/deploy-erc20-contract', async (req, res) => {

	try {
		const erc20Options = req.body; //  { name, chainId, params, triggeredFrom }
	console.log(`[DeployUtilityToken] is called on network ${erc20Options.chainId} via '/deplo-erc20-contract' endpoint`);
		
		const { deployedUTContractAddress, error } = await deployERC20Contract(erc20Options);

		if (error) {
			return res.status(400).json({
				code: 400,
				message: error,
			});
		}
		console.log("[deployedUTContractAddress] status 200");

		return res.status(200).json({
			deployedUTContractAddress: deployedUTContractAddress,
		});

	} catch (error) {
		return res.status(500).json({
			code: 500,
			message: error.message || 'Internal server error',
		});
	}
});

app.post('/deploy-gt-contract', async (req, res) => {
	try {

		const gtOptions = req.body; // 
		console.log(`[DeployGovernanceToken] is called on network ${gtOptions.chainId} via '/deplo-gt-contract' endpoint`);

		const { deployedGTContractAddress, transactionHash,error } = await deployGT(gtOptions);

		if (error) {
			return res.status(400).json({
				code: 400,
				data: error || 'Internal server error',
			});
		}

		console.log("[deployedGTContractAddress] status 200");

		return res.status(200).json({
			data: {
				deployedGTContractAddress: deployedGTContractAddress,
				transactionHash: transactionHash,
			}
		});

	} catch (error) {
		return res.status(500).json({
			code: 500,
			message: error.message || 'Internal server error',
		});
	}
});

app.post('/deploy-dao-contract', async (req, res) => {
	console.log("[DeployDaoContract] is called via '/deplo-dao-contract' endpoint");

	try {
		const daoOptions = req.body; 

		const { deployedDAOContractAddress,deployedGTContractAddress,transactionHash, error } = await deployDAO(daoOptions);

		if (error) {
			return res.status(400).json({
				code: 400,
				data: error || 'Internal server error',
			});
		}
		console.log("[deployedDAOContractAddress] status 200");

		return res.status(200).json({
			data: {
				deployedDAOContractAddress: deployedDAOContractAddress,
				deployedGTContractAddress:deployedGTContractAddress,
				transactionHash:transactionHash
			}
		});
		
	} catch (error) {
		return res.status(500).json({
			code: 500,
			data: error.message || 'Internal server error',
		});
	}
});

app.post('/create-proposal', async (req, res) => {
	try {
		console.log("[createProposal] is called via '/create-proposal' endpoint");
		
		const proposalOptions = req.body; 
		const { proposalAddress,transactionHash, error } = await createProposal(proposalOptions);

		if (error) {
			return res.status(400).json({
				code: 400,
				data: error || 'Internal server error',
			});
		}

		return res.status(200).json({
			data: {
				proposalAddress: proposalAddress,
				transactionHash:transactionHash
			}
		});

	} catch (error) {
		return res.status(500).json({
			code: 500,
			data: error.message || 'Internal server error',
		});
	}
});

app.post('/cast-vote', async (req, res) => {
	try {
		console.log("[castVote] is called via '/cast-vote' endpoint");
		
		const voteOptions = req.body; 
		const { transactionHash, status, error } = await castVote(voteOptions);

		if (error) {
			return res.status(400).json({
				code: 400,
				data: error || 'Internal server error',
			});
		}

		return res.status(200).json({
			data: {
				transactionHash:transactionHash,
				status:(status),
				message:"Voted Successfully"
			}
		});

	} catch (error) {
		return res.status(500).json({
			code: 500,
			data: error.message || 'Internal server error',
		});
	}
});
app.post('/execute-proposal', async (req, res) => {
	try {
		console.log("[executeProposal] is called via '/execute-proposal' endpoint");
		
		const executeProposalOptions = req.body; 
		const { transactionHash, status, error } = await executeProposal(executeProposalOptions);

		if (error) {
			return res.status(400).json({
				code: 400,
				data: error || 'Internal server error',
			});
		}

		return res.status(200).json({
			data: {
				transactionHash:transactionHash,
				status:(status==1?"Executed Successfully":"Execution Failed")
			}
		});

	} catch (error) {
		return res.status(500).json({
			code: 500,
			data: error.message || 'Internal server error',
		});
	}
});
	
app.post('/delegate-votes', async (req, res) => {
	try {
		console.log("[delegateVote] is called via '/delegate-vote' endpoint");
		
		const delegateVoteOptions = req.body; 
		const { transactionHash, status, error } = await delegateVotes(delegateVoteOptions);

		if (error) {
			return res.status(400).json({
				code: 400,
				data: error || 'Internal server error',
			});
		}

		return res.status(200).json({
			data: {
				transactionHash:transactionHash,
				status:(status==1?"Delegated Successfully":"Delegation Failed")
			}
		});

	} catch (error) {
		return res.status(500).json({
			code: 500,
			data: error.message || 'Internal server error',
		});
	}
});
app.post('/claim-votes', async (req, res) => {
	try {
		console.log("[claimVotes] is called via '/claim-votes' endpoint");
		
		const claimVoteOptions = req.body; 
		const { transactionHash, status, error } = await claimVotes(claimVoteOptions);

		if (error) {
			return res.status(400).json({
				code: 400,
				data: error || 'Internal server error',
			});
		}

		return res.status(200).json({
			data: {
				transactionHash:transactionHash,
				status:(status==1?"Claimed Successfully":"Claim Failed")
			}
		});

	} catch (error) {
		return res.status(500).json({
			code: 500,
			data: error.message || 'Internal server error',
		});
	}
});
		
app.post('/dao-data', async (req, res) => {
	console.log("[getDAOdata] is called");
	
    try {
        if (!req.body) {
            return res.status(400).json({
                code: 400,
                message: "Request body is missing"
            });
        }

        const { daoAddress, chainId } = req.body;

        if (!daoAddress) {
            return res.status(400).json({
                code: 400,
                message: "DAO address parameter is required"
            });
        }
        
        if (!chainId) {
            return res.status(400).json({
                code: 400,
                message: "Chain ID parameter is required"
            });
        }

        const daoData = await getDaoData(daoAddress, chainId);
        
        return res.status(200).json(daoData);
    } catch (error) {
        // console.error("Error in /dao-data endpoint:", error);
        
        const statusCode = error.code || 500;
        const errorMessage = error.message || "Internal server error";
        
        return res.status(statusCode).json({
            code: statusCode,
            message: errorMessage
        });
    }
});

app.post('/get-actions', async (req, res) => {
	try {
		if (!req.body) {
			return res.status(400).json({
				code: 400,
				message: "Request body is missing"
			});
		}
		const actions = await getActions(req.body);
		return res.status(200).json({
			code: 200,
			data: actions});
	} catch (error) {
		console.error("Error in /get-actions endpoint:", error);
		const statusCode = error.code || 500;
		const errorMessage = error.message || "Internal server error";
		return res.status(statusCode).json({
			code: statusCode,
			message: errorMessage
		});
	}
})
app.post('/proposal-data', async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({
                code: 400,
                message: "Request body is missing"
            });
        }

        const { proposalAddress, chainId } = req.body;

        if (!proposalAddress) {
            return res.status(400).json({
                code: 400,
                message: "Proposal address parameter is required"
            });
        }
        
        if (!chainId) {
            return res.status(400).json({
                code: 400,
                message: "Chain ID parameter is required"
            });
        }

        const proposalData = await getProposalData(proposalAddress, chainId);
        
        return res.status(200).json(daoData);
    } catch (error) {
        console.error("Error in /proposal-data endpoint:", error);
        
        const statusCode = error.code || 500;
        const errorMessage = error.message || "Internal server error";
        
        return res.status(statusCode).json({
            code: statusCode,
            message: errorMessage
        });
    }
});

app.post ('/create-ut-contract', async (req, res) => {
	try {
		const utOptions = req.body
		console.log(utOptions);
		
		const utContract = await ERC20Code(utOptions.contractName.split(" ").join(""))
		const utOption = {
			name:utOptions.contractName,
		}
		const {abi, bytecode} = await generateERC20Contract(utOption)

		res.status(200).json({ compilerVersion:"0.8.22+commit.4fc1097e",
			contract: utContract,
			abi: abi,
			bytecode: bytecode,
		})
	} catch (error) {
		res.status(500).json({
			code: 500,
			message: error || 'Internal server error',
		})
	}
})	

app.post('/ut-data', async (req, res) => {
    try {
		console.log("[getUTdata] is called")
        if (!req.body) {
            return res.status(400).json({
                code: 400,
                message: "Request body is missing"
            });
        }

        const { address, chainId } = req.body;

        if (!address) {
            return res.status(400).json({
                code: 400,
                message: "Utility Token address parameter is required"
            });
        }
        
        if (!chainId) {
            return res.status(400).json({
                code: 400,
                message: "Chain ID parameter is required"
            });
        }
 
        const utData = await getUTData(address, chainId);
        
        return res.status(200).json(utData);
    } catch (error) {
        // console.error("Error in /ut-data endpoint:", error);
        const statusCode = error.code || 500;
        const errorMessage = error.message || "Internal server error";
        
        return res.status(statusCode).json({
            code: statusCode,
            message: errorMessage
        });
    }
});

app.post('/governance-token-data', async (req, res) => {
	try {
		if (!req.body) {
			return res.status(400).json({
				code: 400,
				message: "Request body is missing"
			});
		}

		const { address, chainId } = req.body;
		
		if (!address) {
			return res.status(400).json({
				code: 400,
				message: "Address parameter is required"
			});
		}
		
		if (!chainId) {
			return res.status(400).json({
				code: 400,
				message: "Chain ID parameter is required"
			});
		}

		if (!ethers.utils.isAddress(address)) {
			return res.status(400).json({
				code: 400,
				message: "Invalid Ethereum address format"
			});
		}

		const gtData = await getGTdata(address, chainId);
		
		if (gtData.error) {
			throw gtData.error;
		}
		
		res.status(200).json(gtData);
		
	} catch (error) {
		// console.error("Error in /governance-token-data:", error);
		
		const statusCode = error.code || 500;
		const errorMessage = error.message || "Internal server error";
		
		res.status(statusCode).json({
			code: statusCode,
			message: errorMessage
		});
	}
});

app.post("/wallets", async (req, res) => {
  const { agentId } = req.body;
  try {
    const result = await createWallet(agentId);
    res.json(result);
  } catch (err) {
    console.error("Error creating wallet:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/wallets/:agentId", async (req, res) => {
  const { agentId } = req.params;
  console.log("Fetching wallet for agentId:", agentId);
  try {
    const result = await getWallet(agentId);
    res.json(result);
  } catch (err) {
    console.error("Error fetching wallet:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/wallets/decode", async (req, res) => {
  const { walletAddress } = req.body;

  try {
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress is required in body" });
    }

    const wallet = await getWalletByAddress(walletAddress);

    if (!wallet || !wallet.iv || !wallet.tag) {
      return res.status(404).json({ error: "Wallet metadata not found" });
    }

    const privateKey = decryptPrivateKey(
      wallet.encryptedKey,
      wallet.agentId,
      wallet.iv,
      wallet.tag
    );

    res.json({
      agentId: wallet.agentId,
      walletAddress: wallet.walletAddress,
      privateKey
    });
  } catch (err) {
    console.error("Error decoding private key:", err.message);
    res.status(500).json({ error: "Failed to decode private key" });
  }
});

app.post("/proposal", async (req, res) => {
  const { address, chainId } = req.body;
  try {
    const data = await getProposalData(address, parseInt(chainId));
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to fetch proposal data",
    });
  }
});

app.post("/getProposals", async (req, res) => {
  const { daoAddress, chainId } = req.body;
  try {
    const result = await getProposals(daoAddress, chainId);
    res.json(result);
  } catch (err) {
    console.error("Error fetching proposals:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/votingPower", async (req, res) => {
  const { proposalAddress, userAddress, chainId } = req.body;
  const result = await getVotingPower(proposalAddress, userAddress, chainId);
  if (result.error) {
    return res.status(result.error.code).json(result);
  }
  res.json(result);
});

app.post("/proposal/status", async (req, res) => {
  try {
    const { proposalAddress, chainId } = req.body;
    if (!proposalAddress || !chainId) {
      return res
        .status(400)
        .json({ error: "proposalAddress and chainId are required" });
    }

    const status = await getProposalStatus(proposalAddress, chainId);
    res.json(status);
  } catch (err) {
    console.error("Error in /proposal/status:", err);
    res.status(500).json({ error: err.message || "Failed to fetch proposal status" });
  }
});


app.get('/health', (_, res) =>
	res.status(200).json({
		health: 'ok',
	}))
app.listen(port, () => {
	console.log(`Server is running on port ${port}`)
})

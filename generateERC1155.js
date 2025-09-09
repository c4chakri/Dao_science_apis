const fs = require('fs')
const solc = require('solc')

async function generateERC1155Contract(options) {
	return new Promise((resolve, reject) => {
		const finalContract = options.contract

		const filePath = `contracts/${options.name}.sol`

		fs.writeFileSync(filePath, finalContract)

		if (fs.existsSync(filePath)) {
			const input = {
				language: 'Solidity',
				sources: {
					[filePath]: {
						content: finalContract,
					},
				},
				settings: {
					outputSelection: {
						'*': {
							'*': ['*'],
						},
					},
				},
			}

			function findImports(path) {
				const zeppelinPath = 'node_modules/@openzeppelin/contracts'
				if (path.startsWith(filePath)) {
					return { contents: finalContract }
				} else if (path.startsWith('@openzeppelin/contracts')) {
					const fullPath = path.replace('@openzeppelin/contracts', zeppelinPath)
					return { contents: fs.readFileSync(fullPath, 'utf-8') }
				} else {
					return { error: 'File not found' }
				}
			}

			const output = JSON.parse(
				solc.compile(JSON.stringify(input), { import: findImports })
			)

			console.log(output)

			let abi
			let bytecode

			for (const contractName in output.contracts[filePath]) {
				abi = output.contracts[filePath][contractName].abi
				bytecode = output.contracts[filePath][contractName].evm.bytecode.object
			}

			fs.unlinkSync(filePath)

			resolve({ abi, bytecode })
		} else {
			reject('Error')
		}
	})
}

module.exports = { generateERC1155Contract }
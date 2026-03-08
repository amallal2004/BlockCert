

## Blockchain Requirement — Constraints

Lovable runs entirely in the browser (React/Vite). It **cannot**:

- Compile or deploy Solidity contracts (requires solc, Hardhat/Foundry CLI)
- Run a Node.js/Python backend (no Web3.py, no Flask)
- Execute CLI tools like `truffle migrate` or `hardhat deploy`

### What I *can* do

1. **Build the complete frontend** with all screens from the PRD (admin dashboard, student dashboard, verification portal, QR codes, SHA-512 hashing)
2. **Integrate with an already-deployed smart contract** — if you deploy the Solidity contract yourself on a testnet (Sepolia, etc.), I can connect the frontend to it using **ethers.js** + MetaMask

### Recommended approach

1. **I build the full app now** with simulated blockchain (as approved), so all flows work end-to-end
2. **You deploy the Solidity contract** outside Lovable using Remix IDE (remix.ethereum.org) — takes ~10 minutes, no install needed
3. **I then swap** the simulated blockchain layer for real ethers.js calls to your deployed contract

I can provide you the exact Solidity contract code to paste into Remix and deploy on Sepolia testnet. Then you give me the contract address and I wire it up.

### Should we proceed this way?




## Real Blockchain Integration Plan (Sepolia Testnet + MetaMask)

### Overview
Replace the simulated localStorage blockchain with a real Ethereum Sepolia testnet smart contract. The admin will use MetaMask to sign transactions when registering certificates. Verification remains public (no wallet needed — read-only call).

### What You Need to Do First (Outside Lovable)
1. **Install MetaMask** browser extension, switch to Sepolia testnet
2. **Get free Sepolia ETH** from a faucet (e.g. sepoliafaucet.com)
3. **Deploy the smart contract** on Remix IDE (remix.ethereum.org) — I'll generate the Solidity code for you
4. **Share the deployed contract address** with me so I can wire it into the frontend

### Smart Contract (Solidity)
A simple `CertificateRegistry` contract with:
- `registerCertificate(bytes32 hash, string rollNumber)` — stores hash on-chain (admin only)
- `verifyCertificate(bytes32 hash)` — returns existence + timestamp (public, free)
- `owner` restriction so only the deployer can register

### Code Changes

**1. Generate Solidity contract file** (`contracts/CertificateRegistry.sol`)
- For reference/deployment via Remix IDE — not compiled by Vite

**2. Install `ethers` package**
- Add `ethers` (v6) for interacting with the contract from the browser

**3. Create `src/lib/ethereum.ts`**
- `connectWallet()` — requests MetaMask connection, returns signer
- `registerCertificateOnChain(hash)` — calls the contract's register function (sends real tx)
- `verifyCertificateOnChain(hash)` — calls the contract's verify function (free read)
- `getContractStats()` — reads total certificates count from contract
- Contract address + ABI stored as constants

**4. Update `src/lib/blockchain.ts`**
- Keep localStorage as a local cache/fallback
- `addCertificate()` now also calls `registerCertificateOnChain()` and stores the real tx hash
- `verifyCertificate()` now calls `verifyCertificateOnChain()` for on-chain verification

**5. Update `src/components/AddRecordForm.tsx`**
- Add wallet connection step before form submission
- Show MetaMask confirmation prompt during registration
- Display real transaction hash + link to Sepolia Etherscan
- Replace `generateMockTxHash()` with the real tx hash from MetaMask

**6. Update `src/pages/VerifyPortal.tsx`**
- Verification calls the contract directly (read-only, no wallet needed)
- Add Etherscan link for the transaction hash

**7. Update `src/pages/AdminDashboard.tsx`**
- Add "Connect Wallet" button in the header
- Show connected wallet address
- Stats pull from the smart contract

### What Stays the Same
- localStorage still stores student records, user accounts, departments (local database)
- QR code generation, hash generation (SHA-512), login system — unchanged
- The blockchain layer becomes real, everything else stays as-is


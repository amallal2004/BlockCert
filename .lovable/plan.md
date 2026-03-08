

## Store student_name and department on-chain

### What changes
Add `studentName` and `department` fields to the smart contract struct, register/verify functions, and update the frontend to pass and read them.

### 1. Update `contracts/CertificateRegistry.sol`
- Add `string studentName` and `string department` to the `Certificate` struct
- Update `registerCertificate` to accept `_studentName` and `_department` parameters
- Update `verifyCertificate` to return them
- Update the event to include them

### 2. Update `src/lib/ethereum.ts`
- Update `CONTRACT_ABI` to match new function signatures (3 string params for register, 6 return values for verify)
- Update `registerCertificateOnChain` to accept and pass `studentName` and `department`
- Update `verifyCertificateOnChain` return type and parsing to include `studentName` and `department`

### 3. Update `src/lib/blockchain.ts`
- Pass `studentName` and `department` to `registerCertificateOnChain`
- Use on-chain `studentName`/`department` when building entries from on-chain-only data

### 4. Update `src/pages/VerifyPortal.tsx`
- When on-chain verification returns data, use the on-chain `studentName` and `department` directly (no localStorage dependency for these fields)

### Gas cost note
Two extra strings per registration will add ~20-40k gas (~$0.01-0.02 on Sepolia — free testnet ETH anyway).

### Important
You will need to **redeploy** the updated contract on Remix IDE since the struct changed. The old contract won't be compatible.


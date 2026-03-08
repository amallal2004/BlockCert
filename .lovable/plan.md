

## Problem Analysis

There are **two distinct issues** causing verification to fail:

### 1. Sepolia RPC Connection Failure
All network requests to `https://rpc.sepolia.org` are returning "Failed to fetch". This public RPC endpoint is unreliable and frequently blocks cross-origin requests from hosted preview domains. Since the verification code catches all errors and returns `{ isValid: false }`, the user sees "FAILED" with no indication that it's a network issue, not an invalid certificate.

### 2. Contract ABI Mismatch (Secondary)
The existing certificate (tx `0xc07c28...`) was registered using the **old contract** that stored personal data on-chain. The code now uses the **new privacy-preserving ABI** with a different `verifyCertificate` function signature. Even if RPC works, the call may fail or return unexpected results if the contract at this address still has the old ABI.

---

## Plan

### A. Fix Sepolia RPC Reliability
- Replace the single `https://rpc.sepolia.org` endpoint with multiple fallback RPCs (e.g., `https://ethereum-sepolia-rpc.publicnode.com`, `https://sepolia.drpc.org`)
- Implement a fallback strategy: try the first RPC, if it fails, try the next
- This is the primary fix since all verification calls are currently failing

### B. Add User-Facing Error Distinction  
- In `VerifyPortal.tsx`, distinguish between "hash not found" and "network error" so the user sees an appropriate message like "Could not connect to blockchain — please try again" instead of the misleading "FAILED / certificate may be tampered"

### C. Verify Contract Compatibility
- Confirm the deployed contract at `0x9bBA...9635` matches the new hash-only ABI
- If the existing certificate was registered on the old contract, the admin will need to re-register it using the new contract after deployment

---

### Technical Details

**Files to modify:**

1. **`src/lib/ethereum.ts`** — Add fallback RPC endpoints and a helper that tries each in order:
   ```typescript
   const SEPOLIA_RPCS = [
     "https://ethereum-sepolia-rpc.publicnode.com",
     "https://rpc.sepolia.org",
     "https://sepolia.drpc.org",
   ];
   ```
   Create a `getProvider()` function that attempts connection with each RPC.

2. **`src/pages/VerifyPortal.tsx`** — Update the `catch` block to detect network errors vs. "not found" and show distinct UI (e.g., a yellow warning for network issues vs. the red FAILED state for invalid hashes).

3. **`src/lib/blockchain.ts`** — Propagate error types so the UI can differentiate.


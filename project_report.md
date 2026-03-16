# Project Report: Privacy-Preserving Blockchain Certificate Registry

## 1. Project Overview
This project is a decentralized application (dApp) designed to revolutionize the issuance and verification of academic certificates. It addresses the global problem of "degree fraud" while maintaining strict student privacy by utilizing a **"Hash-on-Chain"** architecture.

Instead of storing sensitive personal data on a public ledger, the system generates a unique cryptographic fingerprint (hash) of the certificate and stores only that hash on the Ethereum Sepolia blockchain. This ensures that certificates are immutable and verifiable without exposing private student information.

---

## 2. Tech Stack

### Frontend (Web2 Layer)
*   **React (TypeScript):** Core UI framework, providing type safety and component-based architecture.
*   **Vite:** Ultra-fast build tool and development server.
*   **Tailwind CSS:** Utility-first CSS framework for responsive design.
*   **shadcn/ui:** A collection of high-quality, accessible UI components (based on Radix UI).
*   **Framer Motion:** Used for "Cyber-Grid" themed animations and smooth transitions.
*   **React Hook Form & Zod:** For robust form handling and schema validation.

### Backend & Storage
*   **Supabase:** 
    *   **Auth:** Handles Admin and Student role-based authentication.
    *   **Database (PostgreSQL):** Stores full certificate metadata (names, marks, dates) off-chain.
    *   **Edge Functions/Client:** Direct interaction with the database via `@supabase/supabase-js`.

### Blockchain (Web3 Layer)
*   **Solidity:** Smart contract language used for the `CertificateRegistry`.
*   **Ethereum Sepolia:** The testnet where the smart contract is deployed.
*   **Ethers.js (v6):** The library used to interact with the Ethereum blockchain and the deployed contract.
*   **MetaMask:** The browser wallet used by Admins to authorize and sign blockchain transactions.

---

## 3. System Architecture

The project operates on a hybrid model combining traditional database efficiency with blockchain-based trust.

### A. The "Hash-on-Chain" Logic (`src/lib/crypto.ts`)
When a certificate is created, the system performs the following:
1.  Collects student data (Name, Roll No, Department, Marks, etc.).
2.  Concatenates this data with a **University Secret Salt** (to prevent brute-force attacks).
3.  Generates a **SHA-512 Hash**.
4.  **Important:** Only this 512-bit string is sent to the blockchain.

### B. Smart Contract (`contracts/CertificateRegistry.sol`)
The contract is a simple, highly optimized registry:
*   **`certificates` Mapping:** A `mapping(bytes32 => Certificate)` stores whether a hash exists, its timestamp, and block number.
*   **`registerCertificate`:** An `onlyOwner` function that allows the University Admin to "stamp" a hash onto the ledger.
*   **`verifyCertificate`:** A public `view` function that anyone can call (gas-free) to check if a hash is authentic.

---

## 4. User Flows

### Flow 1: The Admin (Issuer)
1.  **Login:** Authenticates via Supabase as an Admin.
2.  **Wallet Connection:** Connects MetaMask to the Sepolia Testnet.
3.  **Data Entry:** Fills out the "Add Record" form with student details.
4.  **Issuance:** 
    *   System generates the SHA-512 hash.
    *   Admin signs a transaction via MetaMask.
    *   The hash is stored on Sepolia.
    *   The full record (including the Blockchain TxHash) is saved to Supabase.

### Flow 2: The Student (Recipient)
1.  **Login:** Logs in using their Roll Number/Credentials.
2.  **View Certificate:** Accesses their dashboard to see their academic record.
3.  **Proof of Authenticity:** Can see their unique Certificate Hash and a direct link to the transaction on Etherscan.
4.  **QR Code:** Can download a system-generated QR code for sharing with employers.

### Flow 3: The Verifier (Third Party)
1.  **Public Portal:** Accesses the `/verify` route (no login required).
2.  **Input:** Scans a student's QR code or pastes a Certificate Hash.
3.  **Blockchain Query:** The app calls the Smart Contract's `verifyCertificate` function.
4.  **Result:** If valid, the app shows the "On-Chain" proof (Block # and Timestamp), confirming the certificate was issued by the legitimate university address.

---

## 5. Directory Structure for Developers

*   `/contracts`: Contains the Solidity smart contract.
*   `/src/lib/blockchain.ts`: Abstracted blockchain logic (Add/Verify).
*   `/src/lib/ethereum.ts`: Low-level Ethers.js configuration, provider setup, and wallet connection.
*   `/src/lib/crypto.ts`: SHA-512 hashing logic and salt management.
*   `/src/pages/AdminDashboard.tsx`: Main administrative hub.
*   `/src/components/AddRecordForm.tsx`: The "heart" of the issuance logic.
*   `/src/integrations/supabase`: Supabase client and auto-generated types.

---

## 6. Security & Privacy Considerations

1.  **Data Sovereignty:** No PII (Personally Identifiable Information) is stored on the blockchain. Even if the blockchain is public, the student's name and marks remain private in the database.
2.  **Immutability:** Once a hash is registered, it cannot be deleted or modified by anyone, including the Admin.
3.  **Salted Hashing:** By using a server-side salt, we ensure that external parties cannot "guess" hashes by trying common student names/roll numbers.
4.  **Role-Based Access (RBAC):** Supabase RLS (Row Level Security) ensures students can only read their own records, while only Admins can write new ones.

---

## 7. Setup for New Developers

1.  **Environment Variables:** Create a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2.  **Contract Address:** Deploy the `CertificateRegistry.sol` using Remix/Hardhat and update `CONTRACT_ADDRESS` in `src/lib/ethereum.ts`.
3.  **Dependencies:** Run `npm install`.
4.  **Run:** `npm run dev` to start the local environment.

---

*End of Report*

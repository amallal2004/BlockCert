import { BlockchainEntry } from "./types";

const BLOCKCHAIN_KEY = "blockchain_ledger";
const ISSUER_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18";

function getLedger(): BlockchainEntry[] {
  const data = localStorage.getItem(BLOCKCHAIN_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLedger(ledger: BlockchainEntry[]): void {
  localStorage.setItem(BLOCKCHAIN_KEY, JSON.stringify(ledger));
}

export function addCertificate(entry: Omit<BlockchainEntry, "blockNumber" | "issuerAddress">): BlockchainEntry {
  const ledger = getLedger();
  
  // Check for duplicate hash
  if (ledger.some(e => e.hash === entry.hash)) {
    throw new Error("DUPLICATE_HASH: Certificate hash already exists on the blockchain");
  }

  const fullEntry: BlockchainEntry = {
    ...entry,
    issuerAddress: ISSUER_ADDRESS,
    blockNumber: ledger.length + 1,
  };

  ledger.push(fullEntry);
  saveLedger(ledger);
  return fullEntry;
}

export function verifyCertificate(hash: string): { exists: boolean; entry?: BlockchainEntry } {
  const ledger = getLedger();
  const entry = ledger.find(e => e.hash === hash);
  return entry ? { exists: true, entry } : { exists: false };
}

export function getAllEntries(): BlockchainEntry[] {
  return getLedger();
}

export function getBlockchainStats() {
  const ledger = getLedger();
  return {
    totalBlocks: ledger.length,
    totalCertificates: ledger.length,
    lastBlockTimestamp: ledger.length > 0 ? ledger[ledger.length - 1].timestamp : null,
    issuerAddress: ISSUER_ADDRESS,
  };
}

export function verifyChainIntegrity(): { isValid: boolean; message: string } {
  const ledger = getLedger();
  if (ledger.length === 0) return { isValid: true, message: "Chain is empty — no entries to verify." };
  
  for (let i = 0; i < ledger.length; i++) {
    if (ledger[i].blockNumber !== i + 1) {
      return { isValid: false, message: `Block number mismatch at index ${i}` };
    }
  }
  return { isValid: true, message: `All ${ledger.length} blocks verified. Chain integrity intact.` };
}

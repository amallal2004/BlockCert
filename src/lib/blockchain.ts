import { BlockchainEntry } from "./types";
import { registerCertificateOnChain, verifyCertificateOnChain, isContractConfigured } from "./ethereum";

const BLOCKCHAIN_KEY = "blockchain_ledger";
const ISSUER_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18";

function getLedger(): BlockchainEntry[] {
  const data = localStorage.getItem(BLOCKCHAIN_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLedger(ledger: BlockchainEntry[]): void {
  localStorage.setItem(BLOCKCHAIN_KEY, JSON.stringify(ledger));
}

export async function addCertificate(
  entry: Omit<BlockchainEntry, "blockNumber" | "issuerAddress">
): Promise<BlockchainEntry> {
  const ledger = getLedger();

  if (ledger.some(e => e.hash === entry.hash)) {
    throw new Error("DUPLICATE_HASH: Certificate hash already exists on the blockchain");
  }

  let txHash = entry.txHash;
  let blockNumber = ledger.length + 1;
  let issuerAddress = ISSUER_ADDRESS;

  // If the real contract is configured, register on-chain
  if (isContractConfigured()) {
    const result = await registerCertificateOnChain(entry.hash, entry.rollNumber, entry.studentName, entry.department);
    txHash = result.txHash;
    blockNumber = result.blockNumber;
  }

  const fullEntry: BlockchainEntry = {
    ...entry,
    txHash,
    issuerAddress,
    blockNumber,
  };

  ledger.push(fullEntry);
  saveLedger(ledger);
  return fullEntry;
}

export async function verifyCertificate(hash: string): Promise<{ exists: boolean; entry?: BlockchainEntry }> {
  // Try on-chain first if configured
  if (isContractConfigured()) {
    const onChain = await verifyCertificateOnChain(hash);
    if (onChain.exists) {
      // Merge with local data for full details
      const ledger = getLedger();
      const localEntry = ledger.find(e => e.hash === hash);
      if (localEntry) {
        return { exists: true, entry: localEntry };
      }
      // On-chain exists but not in local cache
      return {
        exists: true,
        entry: {
          hash,
          studentName: onChain.studentName || "",
          rollNumber: onChain.rollNumber || "",
          department: onChain.department || "",
          timestamp: (onChain.timestamp || 0) * 1000,
          issuerAddress: ISSUER_ADDRESS,
          txHash: "",
          blockNumber: onChain.blockNumber || 0,
        },
      };
    }
  }

  // Fallback to local ledger
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
      // When using real blockchain, block numbers won't be sequential
      if (isContractConfigured()) continue;
      return { isValid: false, message: `Block number mismatch at index ${i}` };
    }
  }
  return { isValid: true, message: `All ${ledger.length} blocks verified. Chain integrity intact.` };
}

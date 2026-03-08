import { BlockchainEntry } from "./types";
import { registerCertificateOnChain, verifyCertificateOnChain, getOnChainStats, isMetaMaskInstalled } from "./ethereum";

/**
 * All operations go through the Sepolia smart contract.
 * localStorage is used only as a local cache for display (academic year, marks, etc.)
 * but the source of truth is always the blockchain.
 */

const LEDGER_CACHE_KEY = "blockchain_ledger_cache";

function getCache(): BlockchainEntry[] {
  const data = localStorage.getItem(LEDGER_CACHE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveCache(ledger: BlockchainEntry[]): void {
  localStorage.setItem(LEDGER_CACHE_KEY, JSON.stringify(ledger));
}

export async function addCertificate(
  entry: Omit<BlockchainEntry, "blockNumber" | "issuerAddress">
): Promise<BlockchainEntry> {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is required to register certificates on the blockchain.");
  }

  const result = await registerCertificateOnChain(entry.hash, entry.rollNumber, entry.studentName, entry.department);

  const fullEntry: BlockchainEntry = {
    ...entry,
    txHash: result.txHash,
    issuerAddress: "",
    blockNumber: result.blockNumber,
  };

  // Cache locally for dashboard display
  const cache = getCache();
  cache.push(fullEntry);
  saveCache(cache);

  return fullEntry;
}

export async function verifyCertificate(hash: string): Promise<{ exists: boolean; entry?: BlockchainEntry }> {
  const onChain = await verifyCertificateOnChain(hash);
  if (!onChain.exists) return { exists: false };

  return {
    exists: true,
    entry: {
      hash,
      studentName: onChain.studentName || "",
      rollNumber: onChain.rollNumber || "",
      department: onChain.department || "",
      timestamp: (onChain.timestamp || 0) * 1000,
      issuerAddress: "",
      txHash: "",
      blockNumber: onChain.blockNumber || 0,
    },
  };
}

export function getCachedEntries(): BlockchainEntry[] {
  return getCache();
}

export async function getBlockchainStats(): Promise<{
  totalCertificates: number;
  owner: string;
}> {
  return getOnChainStats();
}

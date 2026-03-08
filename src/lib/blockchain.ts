import { registerCertificateOnChain, verifyCertificateOnChain, getOnChainStats, isMetaMaskInstalled } from "./ethereum";

/**
 * Privacy-preserving blockchain layer.
 * Only the cryptographic hash is stored on-chain.
 * All personal data stays in the off-chain database.
 */

export async function addCertificate(
  hash: string
): Promise<{ txHash: string; blockNumber: number }> {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is required to register certificates on the blockchain.");
  }

  // Only the hash goes to the blockchain — no personal info
  return await registerCertificateOnChain(hash);
}

/**
 * Verify a hash exists on-chain.
 * Returns only blockchain metadata (timestamp, block number).
 * Personal data must be fetched separately from the database.
 */
export async function verifyCertificate(hash: string): Promise<{
  exists: boolean;
  timestamp?: number;
  blockNumber?: number;
}> {
  // Let errors propagate so UI can distinguish network errors from "not found"
  const onChain = await verifyCertificateOnChain(hash);
  if (!onChain.exists) return { exists: false };

  return {
    exists: true,
    timestamp: (onChain.timestamp || 0) * 1000,
    blockNumber: onChain.blockNumber || 0,
  };
}

export async function getBlockchainStats(): Promise<{
  totalCertificates: number;
  owner: string;
}> {
  return getOnChainStats();
}

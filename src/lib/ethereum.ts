import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";

// ⚠️ REPLACE THIS with your deployed contract address on Sepolia
const CONTRACT_ADDRESS = "0x25e634c395475C272e5A75581640AA0625c46971";

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

// Multiple fallback RPCs for reliability
const SEPOLIA_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://sepolia.drpc.org",
  "https://rpc2.sepolia.org",
];

async function getReadProvider(): Promise<JsonRpcProvider> {
  for (const rpcUrl of SEPOLIA_RPCS) {
    try {
      const provider = new JsonRpcProvider(rpcUrl);
      await provider.getBlockNumber(); // test connection
      return provider;
    } catch {
      console.warn(`RPC failed: ${rpcUrl}`);
    }
  }
  throw new Error(
    "NETWORK_ERROR: All Sepolia RPC endpoints failed. Please try again later.",
  );
}

// Updated ABI — hash-only, no personal info on-chain
const CONTRACT_ABI = [
  "function registerCertificate(bytes32 _hash) external",
  "function verifyCertificate(bytes32 _hash) external view returns (bool exists, uint256 timestamp, uint256 blockNum)",
  "function totalCertificates() external view returns (uint256)",
  "function owner() external view returns (address)",
  "event CertificateRegistered(bytes32 indexed hash, uint256 timestamp, uint256 blockNumber)",
];

function toBytes32Hash(hash: string): string {
  return hash.length === 128 ? "0x" + hash.substring(0, 64) : "0x" + hash;
}

function getWindow(): any {
  return typeof window !== "undefined" ? window : {};
}

export function isMetaMaskInstalled(): boolean {
  return Boolean(getWindow().ethereum?.isMetaMask);
}

export async function switchToSepolia(): Promise<void> {
  const ethereum = getWindow().ethereum;
  if (!ethereum) throw new Error("MetaMask not found");

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID,
            chainName: "Sepolia Testnet",
            nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
            rpcUrls: [SEPOLIA_RPCS[0]],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

export async function connectWallet(): Promise<{
  address: string;
  provider: BrowserProvider;
}> {
  const ethereum = getWindow().ethereum;
  if (!ethereum)
    throw new Error("Please install MetaMask to use blockchain features");

  await switchToSepolia();

  const provider = new BrowserProvider(ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found. Please unlock MetaMask.");
  }

  return { address: accounts[0], provider };
}

/**
 * Register only the hash on-chain — no personal data.
 */
export async function registerCertificateOnChain(
  hash: string,
): Promise<{ txHash: string; blockNumber: number }> {
  const { provider } = await connectWallet();
  const signer = await provider.getSigner();
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  const bytes32Hash = toBytes32Hash(hash);

  const tx = await contract.registerCertificate(bytes32Hash);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Verify a hash on-chain — returns only existence, timestamp, and block number.
 * No personal data is returned from the blockchain.
 */
export async function verifyCertificateOnChain(hash: string): Promise<{
  exists: boolean;
  timestamp?: number;
  blockNumber?: number;
}> {
  const provider = await getReadProvider();
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  const bytes32Hash = toBytes32Hash(hash);

  const [exists, timestamp, blockNum] =
    await contract.verifyCertificate(bytes32Hash);
  if (!exists) return { exists: false };
  return {
    exists: true,
    timestamp: Number(timestamp),
    blockNumber: Number(blockNum),
  };
}

export async function getExistingCertificateRegistration(hash: string): Promise<{
  exists: boolean;
  timestamp?: number;
  blockNumber?: number;
  txHash?: string;
}> {
  const provider = await getReadProvider();
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  const bytes32Hash = toBytes32Hash(hash);

  const [exists, timestamp, blockNum] = await contract.verifyCertificate(bytes32Hash);
  if (!exists) return { exists: false };

  const filter = contract.filters.CertificateRegistered(bytes32Hash);
  const events = await contract.queryFilter(filter, 0, "latest");
  const latestEvent = events[events.length - 1];

  return {
    exists: true,
    timestamp: Number(timestamp),
    blockNumber: Number(blockNum),
    txHash: latestEvent?.transactionHash,
  };
}

export async function getOnChainStats(): Promise<{
  totalCertificates: number;
  owner: string;
}> {
  const provider = await getReadProvider();
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  const [total, owner] = await Promise.all([
    contract.totalCertificates(),
    contract.owner(),
  ]);
  return { totalCertificates: Number(total), owner };
}

export function getEtherscanTxUrl(txHash: string): string {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

export function getEtherscanAddressUrl(address: string): string {
  return `https://sepolia.etherscan.io/address/${address}`;
}

export function getContractAddress(): string {
  return CONTRACT_ADDRESS;
}

export function isContractConfigured(): boolean {
  const zeroAddress = "0x" + "0".repeat(40);
  return CONTRACT_ADDRESS.length > 0 && CONTRACT_ADDRESS !== zeroAddress;
}

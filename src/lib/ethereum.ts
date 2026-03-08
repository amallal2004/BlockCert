import { BrowserProvider, Contract, JsonRpcProvider, isError } from "ethers";

// ⚠️ REPLACE THIS with your deployed contract address on Sepolia
const CONTRACT_ADDRESS = "0x8C8A3749FdFdD9245262491e7f5C2Cb525Ee6eD1";

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111
const SEPOLIA_RPC = "https://rpc.sepolia.org";

const CONTRACT_ABI = [
  "function registerCertificate(bytes32 _hash, string calldata _rollNumber, string calldata _studentName, string calldata _department) external",
  "function verifyCertificate(bytes32 _hash) external view returns (bool exists, string rollNumber, string studentName, string department, uint256 timestamp, uint256 blockNum)",
  "function totalCertificates() external view returns (uint256)",
  "function owner() external view returns (address)",
  "event CertificateRegistered(bytes32 indexed hash, string rollNumber, string studentName, string department, uint256 timestamp, uint256 blockNumber)",
];

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
    // Chain not added yet — add it
    if (switchError.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: SEPOLIA_CHAIN_ID,
          chainName: "Sepolia Testnet",
          nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
          rpcUrls: [SEPOLIA_RPC],
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        }],
      });
    } else {
      throw switchError;
    }
  }
}

export async function connectWallet(): Promise<{ address: string; provider: BrowserProvider }> {
  const ethereum = getWindow().ethereum;
  if (!ethereum) throw new Error("Please install MetaMask to use blockchain features");

  await switchToSepolia();

  const provider = new BrowserProvider(ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found. Please unlock MetaMask.");
  }

  return { address: accounts[0], provider };
}

export async function registerCertificateOnChain(
  hash: string,
  rollNumber: string,
  studentName: string,
  department: string
): Promise<{ txHash: string; blockNumber: number }> {
  const { provider } = await connectWallet();
  const signer = await provider.getSigner();
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  // Convert hex hash string to bytes32
  const bytes32Hash = hash.length === 128
    ? "0x" + hash.substring(0, 64) // Take first 32 bytes of SHA-512 for bytes32
    : "0x" + hash;

  const tx = await contract.registerCertificate(bytes32Hash, rollNumber, studentName, department);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

export async function verifyCertificateOnChain(hash: string): Promise<{
  exists: boolean;
  rollNumber?: string;
  studentName?: string;
  department?: string;
  timestamp?: number;
  blockNumber?: number;
}> {
  // Use public RPC for read-only calls (no wallet needed)
  const provider = new JsonRpcProvider(SEPOLIA_RPC);
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  const bytes32Hash = hash.length === 128
    ? "0x" + hash.substring(0, 64)
    : "0x" + hash;

  try {
    const [exists, rollNumber, studentName, department, timestamp, blockNum] = await contract.verifyCertificate(bytes32Hash);
    if (!exists) return { exists: false };
    return {
      exists: true,
      rollNumber,
      studentName,
      department,
      timestamp: Number(timestamp),
      blockNumber: Number(blockNum),
    };
  } catch {
    return { exists: false };
  }
}

export async function getOnChainStats(): Promise<{
  totalCertificates: number;
  owner: string;
}> {
  const provider = new JsonRpcProvider(SEPOLIA_RPC);
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  try {
    const [total, owner] = await Promise.all([
      contract.totalCertificates(),
      contract.owner(),
    ]);
    return { totalCertificates: Number(total), owner };
  } catch {
    return { totalCertificates: 0, owner: "" };
  }
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

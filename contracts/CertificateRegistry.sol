// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CertificateRegistry
 * @notice Privacy-preserving certificate registry. Only stores cryptographic hashes.
 * @dev No personal student information is stored on-chain.
 *
 * Deploy via Remix IDE (remix.ethereum.org):
 * 1. Create a new file, paste this code
 * 2. Compile with Solidity 0.8.19+
 * 3. Deploy → Environment: "Injected Provider (MetaMask)" → Select Sepolia
 * 4. Copy the deployed contract address
 */

contract CertificateRegistry {
    address public owner;
    uint256 public totalCertificates;

    struct Certificate {
        bool exists;
        uint256 timestamp;
        uint256 blockNumber;
    }

    mapping(bytes32 => Certificate) public certificates;

    event CertificateRegistered(
        bytes32 indexed hash,
        uint256 timestamp,
        uint256 blockNumber
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can register certificates");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerCertificate(bytes32 _hash) external onlyOwner {
        require(!certificates[_hash].exists, "Certificate already registered");

        certificates[_hash] = Certificate({
            exists: true,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        totalCertificates++;

        emit CertificateRegistered(_hash, block.timestamp, block.number);
    }

    function verifyCertificate(bytes32 _hash) external view returns (
        bool exists,
        uint256 timestamp,
        uint256 blockNum
    ) {
        Certificate memory cert = certificates[_hash];
        return (cert.exists, cert.timestamp, cert.blockNumber);
    }
}

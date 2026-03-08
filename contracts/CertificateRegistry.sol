// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CertificateRegistry
 * @notice Deploy this contract on Sepolia testnet via Remix IDE (remix.ethereum.org)
 * @dev Only the deployer (owner) can register certificates. Anyone can verify.
 *
 * Steps to deploy:
 * 1. Go to https://remix.ethereum.org
 * 2. Create a new file, paste this code
 * 3. Compile with Solidity 0.8.19+
 * 4. Deploy → Environment: "Injected Provider (MetaMask)" → Select Sepolia
 * 5. Click Deploy
 * 6. Copy the deployed contract address and share it
 */

contract CertificateRegistry {
    address public owner;
    uint256 public totalCertificates;

    struct Certificate {
        bool exists;
        string rollNumber;
        uint256 timestamp;
        uint256 blockNumber;
    }

    mapping(bytes32 => Certificate) public certificates;

    event CertificateRegistered(
        bytes32 indexed hash,
        string rollNumber,
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

    function registerCertificate(bytes32 _hash, string calldata _rollNumber) external onlyOwner {
        require(!certificates[_hash].exists, "Certificate already registered");

        certificates[_hash] = Certificate({
            exists: true,
            rollNumber: _rollNumber,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        totalCertificates++;

        emit CertificateRegistered(_hash, _rollNumber, block.timestamp, block.number);
    }

    function verifyCertificate(bytes32 _hash) external view returns (
        bool exists,
        string memory rollNumber,
        uint256 timestamp,
        uint256 blockNum
    ) {
        Certificate memory cert = certificates[_hash];
        return (cert.exists, cert.rollNumber, cert.timestamp, cert.blockNumber);
    }
}

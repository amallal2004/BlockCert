export interface StudentRecord {
  id: string;
  studentName: string;
  rollNumber: string;
  department: string;
  academicYear: string;
  dateOfJoining: string;
  dateOfCompletion: string;
  totalMarks: number;
  certificateHash: string;
  blockchainTxHash: string;
  qrCodeData: string;
  createdAt: string;
  status: 'registered' | 'verified';
}

export interface BlockchainEntry {
  hash: string;
  studentName: string;
  rollNumber: string;
  department: string;
  timestamp: number;
  issuerAddress: string;
  txHash: string;
  blockNumber: number;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'student';
  name: string;
  rollNumber?: string;
}

export interface VerificationResult {
  isValid: boolean;
  studentName?: string;
  rollNumber?: string;
  department?: string;
  academicYear?: string;
  totalMarks?: number;
  timestamp?: number;
  issuerAddress?: string;
  txHash?: string;
  blockNumber?: number;
}

export interface StudentRecord {
  id: string;
  studentName: string;
  rollNumber: string;
  department: string;
  academicYear: string;
  dateOfJoining: string;
  dateOfCompletion: string;
  totalMarks: number;
  cgpa?: number;
  certificateFilePath?: string;
  photoPath?: string;
  certificateFileHash?: string;
  photoHash?: string;
  certificateHash: string;
  blockchainTxHash: string;
  qrCodeData: string;
  createdAt: string;
  status: 'registered' | 'verified';
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'student';
  name: string;
  rollNumber?: string;
}

export interface VerificationResult {
  isValid: boolean;
  // On-chain data (only hash proof)
  timestamp?: number;
  blockNumber?: number;
  txHash?: string;
  // Off-chain data (from database)
  studentName?: string;
  rollNumber?: string;
  department?: string;
  academicYear?: string;
  totalMarks?: number;
}

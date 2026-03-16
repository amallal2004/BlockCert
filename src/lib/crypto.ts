const UNIVERSITY_SECRET_SALT = "UNIV_BLOCKCHAIN_CERT_SALT_2024_SECURE";

export async function generateSHA512Hash(data: {
  studentName: string;
  rollNumber: string;
  department: string;
  academicYear: string;
  dateOfJoining: string;
  dateOfCompletion: string;
  totalMarks: number;
  cgpa?: number;
  certificateFileHash?: string;
  photoHash?: string;
}): Promise<string> {
  const salt = import.meta.env.VITE_UNIVERSITY_SALT || UNIVERSITY_SECRET_SALT;
  
  // Standardised order: studentName | rollNumber | department | academicYear | 
  // dateOfJoining | dateOfCompletion | totalMarks | cgpa | 
  // certificateFileHash | photoHash | UNIVERSITY_SECRET_SALT
  
  // Normalize optional values to string for concatenation
  const cgpaStr = data.cgpa !== undefined ? data.cgpa.toString() : "";
  const certHash = data.certificateFileHash || "";
  const photoHash = data.photoHash || "";

  const raw = `${data.studentName}|${data.rollNumber}|${data.department}|${data.academicYear}|${data.dateOfJoining}|${data.dateOfCompletion}|${data.totalMarks}|${cgpaStr}|${certHash}|${photoHash}|${salt}`;
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-512", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Computes a SHA-512 hash of a File object using the Web Crypto API.
 */
export async function computeFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-512", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export function generateMockTxHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function generateMockAddress(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

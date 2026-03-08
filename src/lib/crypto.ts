const UNIVERSITY_SECRET_SALT = "UNIV_BLOCKCHAIN_CERT_SALT_2024_SECURE";

export async function generateSHA512Hash(data: {
  studentName: string;
  rollNumber: string;
  department: string;
  academicYear: string;
  dateOfJoining: string;
  dateOfCompletion: string;
  totalMarks: number;
}): Promise<string> {
  const raw = `${data.studentName}|${data.rollNumber}|${data.department}|${data.academicYear}|${data.dateOfJoining}|${data.dateOfCompletion}|${data.totalMarks}|${UNIVERSITY_SECRET_SALT}`;
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-512", dataBuffer);
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

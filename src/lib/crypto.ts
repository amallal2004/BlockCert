import { supabase } from "@/integrations/supabase/client";

function normalizeNumericValue(value: number | string | undefined): string {
  if (value === undefined || value === "") return "";

  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue.toString() : String(value).trim();
}

export async function generateSHA512Hash(data: {
  studentName: string;
  rollNumber: string;
  department: string;
  academicYear: string;
  dateOfJoining: string;
  dateOfCompletion: string;
  totalMarks: number | string;
  cgpa?: number | string;
  certificateFileHash?: string;
  photoHash?: string;
}): Promise<string> {
  const { data: response, error } = await supabase.functions.invoke("generate-certificate-hash", {
    body: {
      ...data,
      totalMarks: normalizeNumericValue(data.totalMarks),
      cgpa: normalizeNumericValue(data.cgpa),
      certificateFileHash: data.certificateFileHash || "",
      photoHash: data.photoHash || "",
    },
  });

  if (error) {
    let message = error.message;
    const response = (error as { context?: Response }).context;

    if (response) {
      try {
        const payload = await response.clone().json() as { error?: string };
        if (payload?.error) {
          message = payload.error;
        }
      } catch {
        // Fall back to the default error message if the response body is not JSON.
      }
    }

    throw new Error(message);
  }

  if (!response?.hash) {
    throw new Error("Hash generation failed");
  }

  return response.hash;
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

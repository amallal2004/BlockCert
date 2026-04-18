/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Contract, JsonRpcProvider } from "https://esm.sh/ethers@6.13.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CONTRACT_ADDRESS = "0xe5a4063430c194CAe363C0f5554d3B7028609EDd";
const UNIVERSITY_SECRET_SALT = "UNIV_BLOCKCHAIN_CERT_SALT_2024_SECURE";
const SIGNED_URL_TTL_SECONDS = 900;
const HASH_PATTERN = /^(?:[a-f0-9]{64}|[a-f0-9]{128})$/;
const SEPOLIA_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://sepolia.drpc.org",
  "https://rpc2.sepolia.org",
];
const CONTRACT_ABI = [
  "function verifyCertificate(bytes32 _hash) external view returns (bool exists, uint256 timestamp, uint256 blockNum)",
];

type StudentRecordRow = {
  student_name: string;
  roll_number: string;
  department: string;
  academic_year: string;
  date_of_joining: string;
  date_of_completion: string;
  total_marks: number;
  cgpa: number | null;
  certificate_file_path: string | null;
  photo_path: string | null;
  certificate_file_hash: string | null;
  photo_hash: string | null;
  blockchain_tx_hash: string;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeHash(hash: string): string {
  return hash.trim().toLowerCase();
}

function toBytes32Hash(hash: string): string {
  return hash.length === 128 ? `0x${hash.substring(0, 64)}` : `0x${hash}`;
}

async function getReadProvider(): Promise<JsonRpcProvider> {
  for (const rpcUrl of SEPOLIA_RPCS) {
    try {
      const provider = new JsonRpcProvider(rpcUrl);
      await provider.getBlockNumber();
      return provider;
    } catch (_error) {
      continue;
    }
  }

  throw new Error("NETWORK_ERROR: All Sepolia RPC endpoints failed. Please try again later.");
}

async function verifyCertificateOnChain(hash: string): Promise<{
  exists: boolean;
  timestamp?: number;
  blockNumber?: number;
}> {
  const provider = await getReadProvider();
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  const [exists, timestamp, blockNumber] = await contract.verifyCertificate(toBytes32Hash(hash));

  if (!exists) {
    return { exists: false };
  }

  return {
    exists: true,
    timestamp: Number(timestamp) * 1000,
    blockNumber: Number(blockNumber),
  };
}

async function generateSHA512Hash(data: {
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
  const salt = Deno.env.get("UNIVERSITY_SALT") || UNIVERSITY_SECRET_SALT;
  const cgpa = data.cgpa !== undefined ? data.cgpa.toString() : "";
  const certificateFileHash = data.certificateFileHash || "";
  const photoHash = data.photoHash || "";
  const raw = `${data.studentName}|${data.rollNumber}|${data.department}|${data.academicYear}|${data.dateOfJoining}|${data.dateOfCompletion}|${data.totalMarks}|${cgpa}|${certificateFileHash}|${photoHash}|${salt}`;

  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-512", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createSignedUrl(
  supabaseAdmin: ReturnType<typeof createClient>,
  bucket: "certificates" | "photos",
  path: string | null,
): Promise<string | undefined> {
  if (!path) {
    return undefined;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.warn(`Failed to create ${bucket} signed URL for ${path}: ${error.message}`);
    return undefined;
  }

  return data.signedUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { hash } = await req.json();
    const normalizedHash = normalizeHash(hash || "");

    if (!HASH_PATTERN.test(normalizedHash)) {
      return jsonResponse({ error: "Invalid certificate hash" }, 400);
    }

    const blockchainResult = await verifyCertificateOnChain(normalizedHash);
    if (!blockchainResult.exists) {
      return jsonResponse({ exists: false });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabaseAdmin
      .from("student_records")
      .select(`
        student_name,
        roll_number,
        department,
        academic_year,
        date_of_joining,
        date_of_completion,
        total_marks,
        cgpa,
        certificate_file_path,
        photo_path,
        certificate_file_hash,
        photo_hash,
        blockchain_tx_hash
      `)
      .eq("certificate_hash", normalizedHash)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const record = data as StudentRecordRow | null;

    if (!record) {
      return jsonResponse(blockchainResult);
    }

    const recomputedHash = await generateSHA512Hash({
      studentName: record.student_name,
      rollNumber: record.roll_number,
      department: record.department,
      academicYear: record.academic_year,
      dateOfJoining: record.date_of_joining,
      dateOfCompletion: record.date_of_completion,
      totalMarks: record.total_marks,
      cgpa: record.cgpa ?? undefined,
      certificateFileHash: record.certificate_file_hash ?? undefined,
      photoHash: record.photo_hash ?? undefined,
    });

    if (recomputedHash !== normalizedHash) {
      return jsonResponse({
        ...blockchainResult,
        isTampered: true,
        tamperMessage:
          "This record has been tampered with after registration. The data no longer matches the blockchain record.",
      });
    }

    const [certificateUrl, photoUrl] = await Promise.all([
      createSignedUrl(supabaseAdmin, "certificates", record.certificate_file_path),
      createSignedUrl(supabaseAdmin, "photos", record.photo_path),
    ]);

    return jsonResponse({
      ...blockchainResult,
      record: {
        studentName: record.student_name,
        rollNumber: record.roll_number,
        department: record.department,
        academicYear: record.academic_year,
        totalMarks: record.total_marks,
        cgpa: record.cgpa ?? undefined,
        blockchainTxHash: record.blockchain_tx_hash,
        photoUrl,
        certificateUrl,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.startsWith("NETWORK_ERROR:") ? 503 : 500;
    return jsonResponse({ error: message }, status);
  }
});

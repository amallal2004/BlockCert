/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CONTRACT_ADDRESS = "0xE1768F9F6995f5694B371691B210f7e228B271c9";
const SIGNED_URL_TTL_SECONDS = 900;
const HASH_PATTERN = /^(?:[a-f0-9]{64}|[a-f0-9]{128})$/;
const SEPOLIA_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://sepolia.drpc.org",
  "https://rpc2.sepolia.org",
];
const VERIFY_CERTIFICATE_SELECTOR = "0x850c1768";

type StudentRecordRow = {
  student_name: string;
  roll_number: string;
  department: string;
  academic_year: string;
  date_of_joining: string;
  date_of_completion: string;
  total_marks: number | string;
  cgpa: number | string | null;
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

function normalizeNumericValue(value: number | string | null | undefined): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue.toString() : String(value).trim();
}

function toNumber(value: number | string | null | undefined): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

async function callRpc<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC_HTTP_${response.status}`);
  }

  const payload = await response.json() as {
    result?: T;
    error?: { message?: string };
  };

  if (payload.error) {
    throw new Error(payload.error.message || "Unknown RPC error");
  }

  if (payload.result === undefined) {
    throw new Error("RPC returned no result");
  }

  return payload.result;
}

function parseHexToBigInt(value: string): bigint {
  return BigInt(`0x${value}`);
}

function decodeVerifyCertificateResult(result: string): {
  exists: boolean;
  timestamp?: number;
  blockNumber?: number;
} {
  const hex = result.startsWith("0x") ? result.slice(2) : result;
  if (hex.length < 64 * 3) {
    throw new Error("Malformed verifyCertificate response");
  }

  const existsWord = hex.slice(0, 64);
  const timestampWord = hex.slice(64, 128);
  const blockWord = hex.slice(128, 192);
  const exists = parseHexToBigInt(existsWord) === 1n;

  if (!exists) {
    return { exists: false };
  }

  return {
    exists: true,
    timestamp: Number(parseHexToBigInt(timestampWord)) * 1000,
    blockNumber: Number(parseHexToBigInt(blockWord)),
  };
}

async function verifyCertificateOnChain(hash: string): Promise<{
  exists: boolean;
  timestamp?: number;
  blockNumber?: number;
}> {
  const calldata = `${VERIFY_CERTIFICATE_SELECTOR}${toBytes32Hash(hash).slice(2)}`;

  for (const rpcUrl of SEPOLIA_RPCS) {
    try {
      await callRpc<string>(rpcUrl, "eth_blockNumber", []);
      const result = await callRpc<string>(rpcUrl, "eth_call", [
        {
          to: CONTRACT_ADDRESS,
          data: calldata,
        },
        "latest",
      ]);

      return decodeVerifyCertificateResult(result);
    } catch (_error) {
      continue;
    }
  }

  throw new Error(
    "NETWORK_ERROR: All Sepolia RPC endpoints failed. Please try again later.",
  );
}

async function generateSHA512Hash(data: {
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
  const salt = Deno.env.get("UNIVERSITY_SALT");
  if (!salt) {
    throw new Error("UNIVERSITY_SALT is not configured");
  }
  const totalMarks = normalizeNumericValue(data.totalMarks);
  const cgpa = normalizeNumericValue(data.cgpa);
  const certificateFileHash = data.certificateFileHash || "";
  const photoHash = data.photoHash || "";
  const raw = `${data.studentName}|${data.rollNumber}|${data.department}|${data.academicYear}|${data.dateOfJoining}|${data.dateOfCompletion}|${totalMarks}|${cgpa}|${certificateFileHash}|${photoHash}|${salt}`;

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
    console.warn(
      `Failed to create ${bucket} signed URL for ${path}: ${error.message}`,
    );
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
      .select(
        `
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
      `,
      )
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
      createSignedUrl(
        supabaseAdmin,
        "certificates",
        record.certificate_file_path,
      ),
      createSignedUrl(supabaseAdmin, "photos", record.photo_path),
    ]);

    return jsonResponse({
      ...blockchainResult,
      record: {
        studentName: record.student_name,
        rollNumber: record.roll_number,
        department: record.department,
        academicYear: record.academic_year,
        totalMarks: toNumber(record.total_marks),
        cgpa: toNumber(record.cgpa),
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

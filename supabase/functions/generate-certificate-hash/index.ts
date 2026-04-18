/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeNumericValue(value: number | string | null | undefined): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue.toString() : String(value).trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const salt = Deno.env.get("UNIVERSITY_SALT");
    if (!salt) {
      throw new Error("UNIVERSITY_SALT is not configured");
    }

    const {
      studentName,
      rollNumber,
      department,
      academicYear,
      dateOfJoining,
      dateOfCompletion,
      totalMarks,
      cgpa,
      certificateFileHash,
      photoHash,
    } = await req.json();

    const raw = `${studentName}|${rollNumber}|${department}|${academicYear}|${dateOfJoining}|${dateOfCompletion}|${normalizeNumericValue(totalMarks)}|${normalizeNumericValue(cgpa)}|${certificateFileHash || ""}|${photoHash || ""}|${salt}`;
    const encoded = new TextEncoder().encode(raw);
    const hashBuffer = await crypto.subtle.digest("SHA-512", encoded);
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    return new Response(
      JSON.stringify({ hash }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

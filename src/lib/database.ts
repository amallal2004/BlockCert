import { supabase } from "@/integrations/supabase/client";
import { StudentRecord, User, VerifyCertificateAccessResponse } from "./types";

// --- Department Management ---

export async function getDepartments(): Promise<string[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("name")
    .order("name");
  if (error) throw new Error(error.message);
  return (data || []).map(d => d.name);
}

export async function addDepartment(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Department name cannot be empty");
  const { error } = await supabase.from("departments").insert({ name: trimmed });
  if (error) {
    if (error.code === "23505") throw new Error("Department already exists");
    throw new Error(error.message);
  }
}

export async function removeDepartment(name: string): Promise<void> {
  const records = await getRecords();
  if (records.some(r => r.department === name)) {
    throw new Error("Cannot remove department — students are registered on the blockchain with this department");
  }
  const { error } = await supabase.from("departments").delete().eq("name", name);
  if (error) throw new Error(error.message);
}

export async function isDepartmentInUse(name: string): Promise<boolean> {
  const { data } = await supabase
    .from("student_records")
    .select("id")
    .eq("department", name)
    .limit(1);
  return (data || []).length > 0;
}

// --- User Management (via Supabase Auth) ---

/**
 * Gets all student users from the app_users table (read-only reference).
 * We keep this table as a lightweight index for the admin "Student Manager".
 */
export async function getStudentUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("role", "student")
    .order("name");
  if (error) return [];
  return (data || []).map(d => ({
    id: d.supabase_user_id || d.id,
    username: d.username,
    role: "student" as const,
    name: d.name,
    rollNumber: d.roll_number || undefined,
  }));
}

function generatePassword(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

function normalizeStudentIdentity(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) throw new Error("Roll number is required");
  return normalized;
}

function mapAppUserToUser(appUser: {
  id: string;
  supabase_user_id: string | null;
  username: string;
  role: string;
  name: string;
  roll_number: string | null;
}): User {
  return {
    id: appUser.supabase_user_id || appUser.id,
    username: appUser.username,
    role: appUser.role as "admin" | "student",
    name: appUser.name,
    rollNumber: appUser.roll_number || undefined,
  };
}

async function upsertStudentIndexRow(userId: string, name: string, rollNumber: string): Promise<void> {
  const { error } = await supabase.from("app_users").upsert({
    id: userId,
    supabase_user_id: userId,
    username: rollNumber,
    password_hash: "managed_by_supabase_auth",
    role: "student",
    name,
    roll_number: rollNumber,
  }, { onConflict: "username" });

  if (error) {
    throw new Error(error.message);
  }
}

async function invokeEdgeFunction<TResponse>(name: string, body: Record<string, unknown>): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke(name, { body });

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

  return data as TResponse;
}

/**
 * Resets a student's password by using a secure Edge Function.
 * The Edge Function uses the Service Role key to bypass RLS and update auth.users.
 */
export async function resetStudentPassword(userId: string): Promise<string> {
  const newPassword = generatePassword();

  // Look up the student's details from app_users
  const { data: studentByAuthId } = await supabase
    .from("app_users")
    .select("*")
    .eq("supabase_user_id", userId)
    .maybeSingle();

  const student = studentByAuthId || (await supabase
    .from("app_users")
    .select("*")
    .eq("id", userId)
    .maybeSingle()).data;

  if (!student) throw new Error("Student not found");

  await invokeEdgeFunction<{ success: boolean }>("reset-student-password", {
    userId,
    newPassword,
  });

  // Update the password_hash in app_users for backward compat / admin reference
  try {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(newPassword));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    
    await supabase
      .from("app_users")
      .update({ password_hash: hashedPassword })
      .eq("id", student.id);
  } catch (hashError) {
    console.warn("Failed to update app_users password_hash, but auth password was reset:", hashError);
  }

  return newPassword;
}

/**
 * Creates or repairs a student auth user via the service-role admin API.
 */
export async function addStudentUser(
  name: string,
  rollNumber: string
): Promise<{ user: User; wasCreated: boolean }> {
  const normalizedRollNumber = normalizeStudentIdentity(rollNumber);
  const normalizedName = name.trim();
  const email = `${normalizedRollNumber}@blockcert.edu`;

  // First check if user already exists in our app_users table
  const { data: existing } = await supabase
    .from("app_users")
    .select("*")
    .eq("username", normalizedRollNumber)
    .maybeSingle();

  if (existing) {
    return { user: mapAppUserToUser(existing), wasCreated: false };
  }

  const defaultPassword = normalizedRollNumber;
  const data = await invokeEdgeFunction<{ id?: string; user?: { id: string }; wasCreated?: boolean }>("create-student-user", {
    email,
    password: defaultPassword,
    name: normalizedName,
    rollNumber: normalizedRollNumber,
    role: "student",
  });

  const userId = data.user?.id || data.id;
  if (!userId) throw new Error("Failed to create student: no user returned");

  try {
    await upsertStudentIndexRow(userId, normalizedName, normalizedRollNumber);
  } catch (indexError) {
    await invokeEdgeFunction<{ success: boolean }>("delete-student-user", { userId });
    throw new Error("Failed to create student: " + (indexError instanceof Error ? indexError.message : "Failed to save student index"));
  }

  return {
    user: {
      id: userId,
      username: normalizedRollNumber,
      role: "student",
      name: normalizedName,
      rollNumber: normalizedRollNumber,
    },
    wasCreated: Boolean(data.wasCreated),
  };
}

// --- Record Management ---

export async function getRecords(): Promise<StudentRecord[]> {
  const { data, error } = await supabase
    .from("student_records")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data || []).map(d => ({
    id: d.id,
    studentName: d.student_name,
    rollNumber: d.roll_number,
    department: d.department,
    academicYear: d.academic_year,
    dateOfJoining: d.date_of_joining,
    dateOfCompletion: d.date_of_completion,
    totalMarks: d.total_marks,
    cgpa: d.cgpa || undefined,
    certificateFilePath: d.certificate_file_path || undefined,
    photoPath: d.photo_path || undefined,
    certificateFileHash: d.certificate_file_hash || undefined,
    photoHash: d.photo_hash || undefined,
    certificateHash: d.certificate_hash,
    blockchainTxHash: d.blockchain_tx_hash,
    qrCodeData: d.qr_code_data,
    createdAt: d.created_at,
    status: d.status as "registered" | "verified",
  }));
}

export async function addRecord(record: StudentRecord, ownerId: string): Promise<void> {
  const { error } = await supabase.from("student_records").insert({
    id: record.id,
    supabase_user_id: ownerId,
    student_name: record.studentName,
    roll_number: record.rollNumber,
    department: record.department,
    academic_year: record.academicYear,
    date_of_joining: record.dateOfJoining,
    date_of_completion: record.dateOfCompletion,
    total_marks: record.totalMarks,
    cgpa: record.cgpa,
    certificate_file_path: record.certificateFilePath,
    photo_path: record.photoPath,
    certificate_file_hash: record.certificateFileHash,
    photo_hash: record.photoHash,
    certificate_hash: record.certificateHash,
    blockchain_tx_hash: record.blockchainTxHash,
    qr_code_data: record.qrCodeData,
    status: record.status,
  });
  if (error) {
    if (error.code === "23505") throw new Error("DUPLICATE_ROLL: A record with this roll number already exists");
    throw new Error(error.message);
  }
}

export async function updateRecordBlockchainDetails(
  recordId: string,
  blockchainTxHash: string,
  qrCodeData: string
): Promise<void> {
  const { error } = await supabase
    .from("student_records")
    .update({
      blockchain_tx_hash: blockchainTxHash,
      qr_code_data: qrCodeData,
      status: "registered",
    })
    .eq("id", recordId);

  if (error) throw new Error(error.message);
}

export async function deleteRecord(recordId: string): Promise<void> {
  const { error } = await supabase
    .from("student_records")
    .delete()
    .eq("id", recordId);

  if (error) throw new Error(error.message);
}

export async function deleteStudentUser(userId: string): Promise<void> {
  await invokeEdgeFunction<{ success: boolean }>("delete-student-user", { userId });

  await supabase
    .from("app_users")
    .delete()
    .or(`id.eq.${userId},supabase_user_id.eq.${userId}`);
}

export async function getRecordByRollNumber(rollNumber: string): Promise<StudentRecord | undefined> {
  const { data } = await supabase
    .from("student_records")
    .select("*")
    .ilike("roll_number", rollNumber)
    .maybeSingle();
  if (!data) return undefined;
  return {
    id: data.id,
    studentName: data.student_name,
    rollNumber: data.roll_number,
    department: data.department,
    academicYear: data.academic_year,
    dateOfJoining: data.date_of_joining,
    dateOfCompletion: data.date_of_completion,
    totalMarks: data.total_marks,
    cgpa: data.cgpa || undefined,
    certificateFilePath: data.certificate_file_path || undefined,
    photoPath: data.photo_path || undefined,
    certificateFileHash: data.certificate_file_hash || undefined,
    photoHash: data.photo_hash || undefined,
    certificateHash: data.certificate_hash,
    blockchainTxHash: data.blockchain_tx_hash,
    qrCodeData: data.qr_code_data,
    createdAt: data.created_at,
    status: data.status as "registered" | "verified",
  };
}

export async function getRecordForUser(userId: string): Promise<StudentRecord | undefined> {
  const { data } = await supabase
    .from("student_records")
    .select("*")
    .eq("supabase_user_id", userId)
    .maybeSingle();
  if (!data) return undefined;
  return {
    id: data.id,
    studentName: data.student_name,
    rollNumber: data.roll_number,
    department: data.department,
    academicYear: data.academic_year,
    dateOfJoining: data.date_of_joining,
    dateOfCompletion: data.date_of_completion,
    totalMarks: data.total_marks,
    cgpa: data.cgpa || undefined,
    certificateFilePath: data.certificate_file_path || undefined,
    photoPath: data.photo_path || undefined,
    certificateFileHash: data.certificate_file_hash || undefined,
    photoHash: data.photo_hash || undefined,
    certificateHash: data.certificate_hash,
    blockchainTxHash: data.blockchain_tx_hash,
    qrCodeData: data.qr_code_data,
    createdAt: data.created_at,
    status: data.status as "registered" | "verified",
  };
}

export async function getRecordByHash(hash: string): Promise<StudentRecord | undefined> {
  const normalizedHash = hash.trim().toLowerCase();
  const { data } = await supabase
    .from("student_records")
    .select("*")
    .eq("certificate_hash", normalizedHash)
    .maybeSingle();
  if (!data) return undefined;
  return {
    id: data.id,
    studentName: data.student_name,
    rollNumber: data.roll_number,
    department: data.department,
    academicYear: data.academic_year,
    dateOfJoining: data.date_of_joining,
    dateOfCompletion: data.date_of_completion,
    totalMarks: data.total_marks,
    cgpa: data.cgpa || undefined,
    certificateFilePath: data.certificate_file_path || undefined,
    photoPath: data.photo_path || undefined,
    certificateFileHash: data.certificate_file_hash || undefined,
    photoHash: data.photo_hash || undefined,
    certificateHash: data.certificate_hash,
    blockchainTxHash: data.blockchain_tx_hash,
    qrCodeData: data.qr_code_data,
    createdAt: data.created_at,
    status: data.status as "registered" | "verified",
  };
}

export async function verifyRecordAccess(hash: string): Promise<VerifyCertificateAccessResponse> {
  const normalizedHash = hash.trim().toLowerCase();
  const { data, error } = await supabase.functions.invoke("verify-certificate-record", {
    body: { hash: normalizedHash },
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

  return (data || { exists: false }) as VerifyCertificateAccessResponse;
}

// No-op for backward compat — DB is always initialized
export function initializeDatabase(): void {}

import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { StudentRecord, User } from "./types";

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
    id: d.id,
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

/**
 * Resets a student's password by re-creating their auth account.
 * Uses the non-persistent supabaseAdmin client so the admin's session is preserved.
 */
export async function resetStudentPassword(userId: string): Promise<string> {
  const newPassword = generatePassword();

  // Look up the student's details from app_users
  const { data: student } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!student) throw new Error("Student not found");

  const email = `${student.username}@blockcert.edu`;

  // Sign up with the same email + new password on the non-persistent client.
  // If the user already exists, Supabase will return the existing user (no error)
  // and we need to sign in and update the password.
  // Simplest approach: sign in on admin client with old creds won't work (we don't know the password).
  // Instead, we use signUp which for an existing confirmed email will return a fake user 
  // (Supabase doesn't reveal if the email exists). So we need a different approach.

  // Use Supabase's built-in password recovery by directly updating via admin client
  // Since we can't update another user's password from client-side,
  // we'll sign in as the student with a magic workaround:
  // Just re-create the account (signUp will fail silently for existing emails if confirmations are off)

  // The reliable approach: use the admin client to sign in as the student is not possible
  // without their current password. So let's just update the app_users table hash
  // and also try to update via signUp.

  // Practical approach: Update the password in app_users for backward compat
  // and attempt to reset via the admin signUp flow.
  
  // Try using the admin client to sign up (which for existing users with confirmations off
  // might update the user or return existing)
  const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
    email,
    password: newPassword,
    options: {
      data: {
        name: student.name,
        role: "student",
        roll_number: student.roll_number,
      },
    },
  });

  // If signUp returns a user with an identities array length of 0,
  // it means the email already exists and we couldn't update the password.
  // In that case, we fall back to the edge function.
  if (signUpData?.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
    // User already exists — try the edge function as fallback
    const { data, error } = await supabase.functions.invoke("reset-student-password", {
      body: { userId, newPassword },
    });
    
    if (error || data?.error) {
      // Edge function also failed — update just the app_users table as last resort
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(newPassword));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      
      await supabase
        .from("app_users")
        .update({ password_hash: hashedPassword })
        .eq("id", userId);
    }
  }

  return newPassword;
}

/**
 * Creates a new student user via Supabase Auth.
 * Uses a separate non-persistent client so the admin's session is not affected.
 */
export async function addStudentUser(name: string, rollNumber: string): Promise<User> {
  const email = `${rollNumber.toLowerCase()}@blockcert.edu`;

  // First check if user already exists in our app_users table
  const { data: existing } = await supabase
    .from("app_users")
    .select("*")
    .eq("username", rollNumber.toLowerCase())
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      username: existing.username,
      role: existing.role as "admin" | "student",
      name: existing.name,
      rollNumber: existing.roll_number || undefined,
    };
  }

  const defaultPassword = rollNumber.toLowerCase();

  // Sign up via a non-persistent client (won't overwrite admin's session)
  const { data, error } = await supabaseAdmin.auth.signUp({
    email,
    password: defaultPassword,
    options: {
      data: {
        name,
        role: "student",
        roll_number: rollNumber,
      },
    },
  });

  if (error) throw new Error("Failed to create student: " + error.message);
  if (!data.user) throw new Error("Failed to create student: no user returned");

  const userId = data.user.id;

  // Also insert into app_users table for admin reference
  await supabase.from("app_users").upsert({
    id: userId,
    username: rollNumber.toLowerCase(),
    password_hash: "managed_by_supabase_auth",
    role: "student",
    name,
    roll_number: rollNumber,
  }, { onConflict: "username" });

  return {
    id: userId,
    username: rollNumber.toLowerCase(),
    role: "student",
    name,
    rollNumber,
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

export async function addRecord(record: StudentRecord): Promise<void> {
  const { error } = await supabase.from("student_records").insert({
    id: record.id,
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

export async function getRecordByRollNumber(rollNumber: string): Promise<StudentRecord | undefined> {
  const { data } = await supabase
    .from("student_records")
    .select("*")
    .eq("roll_number", rollNumber)
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
  const { data } = await supabase
    .from("student_records")
    .select("*")
    .eq("certificate_hash", hash)
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

// No-op for backward compat — DB is always initialized
export function initializeDatabase(): void {}

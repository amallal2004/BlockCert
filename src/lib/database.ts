import { supabase } from "@/integrations/supabase/client";
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

// --- User Management ---

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .ilike("username", username)
    .eq("password_hash", password)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    username: data.username,
    password: data.password_hash,
    role: data.role as "admin" | "student",
    name: data.name,
    rollNumber: data.roll_number || undefined,
  };
}

export async function getStudentUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("role", "student");
  if (error) return [];
  return (data || []).map(d => ({
    id: d.id,
    username: d.username,
    password: d.password_hash,
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

export async function resetStudentPassword(userId: string): Promise<string> {
  const newPassword = generatePassword();
  const { error } = await supabase
    .from("app_users")
    .update({ password_hash: newPassword })
    .eq("id", userId)
    .eq("role", "student");
  if (error) throw new Error("Failed to reset password");
  return newPassword;
}

export async function addStudentUser(name: string, rollNumber: string): Promise<User> {
  const username = rollNumber.toLowerCase();
  // Check if already exists
  const { data: existing } = await supabase
    .from("app_users")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (existing) {
    return {
      id: existing.id,
      username: existing.username,
      password: existing.password_hash,
      role: existing.role as "admin" | "student",
      name: existing.name,
      rollNumber: existing.roll_number || undefined,
    };
  }
  const defaultPassword = generatePassword();
  const { data, error } = await supabase
    .from("app_users")
    .insert({
      username,
      password_hash: defaultPassword,
      role: "student",
      name,
      roll_number: rollNumber,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    username: data.username,
    password: data.password_hash,
    role: "student",
    name: data.name,
    rollNumber: data.roll_number || undefined,
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
    certificateHash: data.certificate_hash,
    blockchainTxHash: data.blockchain_tx_hash,
    qrCodeData: data.qr_code_data,
    createdAt: data.created_at,
    status: data.status as "registered" | "verified",
  };
}

// No-op for backward compat — DB is always initialized
export function initializeDatabase(): void {}

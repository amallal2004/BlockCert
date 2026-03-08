import { StudentRecord, User } from "./types";

const RECORDS_KEY = "student_records";
const DEPARTMENTS_KEY = "departments";
const USERS_KEY = "app_users";
const PASSWORDS_KEY = "user_passwords";

const DEFAULT_DEPARTMENTS = [
  "Computer Science",
  "Electronics",
  "Mechanical",
  "Civil",
  "Electrical",
  "Information Technology",
  "Chemical",
  "Biotechnology",
];

// Demo credentials
const DEFAULT_USERS: User[] = [
  { id: "admin-1", username: "admin", password: "admin123", role: "admin", name: "University Admin" },
];

export function initializeDatabase(): void {
  // Check if stored users have the password field; if not, re-seed defaults
  const existingUsers = localStorage.getItem(USERS_KEY);
  if (!existingUsers) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  } else {
    try {
      const parsed = JSON.parse(existingUsers);
      const adminUser = parsed.find((u: any) => u.username === "admin");
      // Re-seed if admin is missing or has no password field (stale data)
      if (!adminUser || !adminUser.password) {
        const nonDefaults = parsed.filter((u: any) => !DEFAULT_USERS.some(d => d.username === u.username));
        localStorage.setItem(USERS_KEY, JSON.stringify([...DEFAULT_USERS, ...nonDefaults]));
      }
      // Purge legacy hardcoded demo students that were never on the blockchain
      const LEGACY_IDS = ["student-1", "student-2"];
      const current = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      const cleaned = current.filter((u: any) => !LEGACY_IDS.includes(u.id));
      localStorage.setItem(USERS_KEY, JSON.stringify(cleaned));
    } catch {
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    }
  }
  if (!localStorage.getItem(RECORDS_KEY)) {
    localStorage.setItem(RECORDS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(DEPARTMENTS_KEY)) {
    localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(DEFAULT_DEPARTMENTS));
  }
}

// --- Department Management ---

export function getDepartments(): string[] {
  const data = localStorage.getItem(DEPARTMENTS_KEY);
  return data ? JSON.parse(data) : DEFAULT_DEPARTMENTS;
}

export function addDepartment(name: string): void {
  const departments = getDepartments();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Department name cannot be empty");
  if (departments.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error("Department already exists");
  }
  departments.push(trimmed);
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
}

export function removeDepartment(name: string): void {
  const records = getRecords();
  const hasRecords = records.some(r => r.department === name);
  if (hasRecords) {
    throw new Error("Cannot remove department — students are registered on the blockchain with this department");
  }
  const departments = getDepartments().filter(d => d !== name);
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
}

export function isDepartmentInUse(name: string): boolean {
  return getRecords().some(r => r.department === name);
}

// --- User Management ---

export function getUsers(): User[] {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

export function getStudentUsers(): User[] {
  return getUsers().filter(u => u.role === "student");
}

export function authenticateUser(username: string, password: string): User | null {
  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (user && user.password === password) return user;
  return null;
}

function generatePassword(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export function resetStudentPassword(userId: string): string {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error("User not found");
  if (user.role !== "student") throw new Error("Can only reset student passwords");
  const newPassword = generatePassword();
  user.password = newPassword;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return newPassword;
}

// --- Record Management ---

export function getRecords(): StudentRecord[] {
  return JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
}

export function addRecord(record: StudentRecord): void {
  const records = getRecords();
  if (records.some(r => r.rollNumber === record.rollNumber)) {
    throw new Error("DUPLICATE_ROLL: A record with this roll number already exists");
  }
  records.push(record);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function getRecordByRollNumber(rollNumber: string): StudentRecord | undefined {
  return getRecords().find(r => r.rollNumber === rollNumber);
}

export function getRecordByHash(hash: string): StudentRecord | undefined {
  return getRecords().find(r => r.certificateHash === hash);
}

export function addStudentUser(name: string, rollNumber: string): User {
  const users = getUsers();
  const username = rollNumber.toLowerCase();
  if (users.some(u => u.username === username)) return users.find(u => u.username === username)!;
  const defaultPassword = generatePassword();
  const newUser: User = {
    id: `student-${Date.now()}`,
    username,
    password: defaultPassword,
    role: "student",
    name,
    rollNumber,
  };
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return newUser;
}

import { StudentRecord, User } from "./types";

const RECORDS_KEY = "student_records";
const DEPARTMENTS_KEY = "departments";

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
const USERS_KEY = "app_users";

// Demo credentials
const DEFAULT_USERS: User[] = [
  { id: "admin-1", username: "admin", role: "admin", name: "University Admin" },
  { id: "student-1", username: "student1", role: "student", name: "Rahul Sharma", rollNumber: "CS2024001" },
  { id: "student-2", username: "student2", role: "student", name: "Priya Patel", rollNumber: "EC2024002" },
];

export function initializeDatabase(): void {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem(RECORDS_KEY)) {
    localStorage.setItem(RECORDS_KEY, JSON.stringify([]));
  }
}

export function getUsers(): User[] {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

export function authenticateUser(username: string, password: string): User | null {
  const users = getUsers();
  // Demo: password is same as username
  const user = users.find(u => u.username === username);
  if (user && password === username) return user;
  return null;
}

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
  const newUser: User = {
    id: `student-${Date.now()}`,
    username,
    role: "student",
    name,
    rollNumber,
  };
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return newUser;
}

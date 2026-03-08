

## Yes — There Are Fake Students Hardcoded

Lines 22-23 of `src/lib/database.ts` contain two hardcoded demo students ("Rahul Sharma" and "Priya Patel") that get seeded into localStorage on initialization. These students were never registered on the blockchain — they're just fake entries that show up in the Student Accounts panel.

## Plan

### 1. Remove demo students from `DEFAULT_USERS` (database.ts)
- Keep only the admin account in `DEFAULT_USERS`
- Update `initializeDatabase()` to strip out any legacy demo students (matching `student-1`, `student-2` IDs) from existing localStorage data, while preserving legitimately created student accounts

### 2. Clean up Login page hint (Login.tsx)
- The student login hint already looks correct (no demo student credentials shown) — no change needed there

### 3. Fix `isAdmin` usage order (Login.tsx)
- Minor bug: `isAdmin` is used on line 28 before it's declared on line 32. Move the declaration above `handleSubmit`.

**After this change:** Student accounts will only exist when an admin registers a certificate via "Add Record." The Student Accounts panel will be empty until then.


-- Add individual file hash columns to student_records
-- These store the SHA-512 hashes of the certificate and photo files
-- computed at registration time, enabling tamper detection during verification.

ALTER TABLE student_records
  ADD COLUMN certificate_file_hash TEXT,
  ADD COLUMN photo_hash TEXT;

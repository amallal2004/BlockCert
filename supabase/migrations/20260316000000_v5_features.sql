-- Add new v5.0 fields to student_records table
ALTER TABLE public.student_records 
  ADD COLUMN IF NOT EXISTS cgpa NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS certificate_file_path TEXT,
  ADD COLUMN IF NOT EXISTS photo_path TEXT;

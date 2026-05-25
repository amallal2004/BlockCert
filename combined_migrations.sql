
-- Departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Anyone can read departments
CREATE POLICY "Departments are publicly readable"
  ON public.departments FOR SELECT USING (true);

-- Seed default departments
INSERT INTO public.departments (name) VALUES
  ('Computer Science'), ('Electronics'), ('Mechanical'), ('Civil'),
  ('Electrical'), ('Information Technology'), ('Chemical'), ('Biotechnology');

-- Student records table (certificates)
CREATE TABLE public.student_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supabase_user_id UUID REFERENCES auth.users(id),
  student_name TEXT NOT NULL,
  roll_number TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  date_of_joining TEXT NOT NULL,
  date_of_completion TEXT NOT NULL,
  total_marks NUMERIC NOT NULL,
  certificate_hash TEXT NOT NULL UNIQUE,
  blockchain_tx_hash TEXT NOT NULL DEFAULT '',
  qr_code_data TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'registered',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY;

-- Anyone can read student records (for verification)
CREATE POLICY "Student records are publicly readable"
  ON public.student_records FOR SELECT USING (true);

-- Only authenticated or service role can insert (we'll use anon for now since no Supabase auth)
CREATE POLICY "Anyone can insert student records"
  ON public.student_records FOR INSERT WITH CHECK (true);

-- App users table (admin & student accounts with credentials)
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supabase_user_id UUID REFERENCES auth.users(id),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  name TEXT NOT NULL,
  roll_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- App users readable by anyone (password_hash will be handled via a view)
-- We need a secure view to hide password_hash from general reads
CREATE VIEW public.app_users_public
WITH (security_invoker = on) AS
  SELECT id, username, role, name, roll_number, created_at
  FROM public.app_users;

-- Only allow select through the view pattern - restrict direct table access
CREATE POLICY "App users select for auth only"
  ON public.app_users FOR SELECT USING (true);

CREATE POLICY "Anyone can insert app users"
  ON public.app_users FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update app users"
  ON public.app_users FOR UPDATE USING (true);

-- Seed admin user (password: admin123)
INSERT INTO public.app_users (username, password_hash, role, name)
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 'University Admin');
-- Allow inserts and deletes on departments (admin manages these)
CREATE POLICY "Anyone can insert departments"
  ON public.departments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete departments"
  ON public.departments FOR DELETE
  USING (true);

-- Allow updates on student_records
CREATE POLICY "Anyone can update student records"
  ON public.student_records FOR UPDATE
  USING (true);

-- Allow deletes on app_users (for admin management)
CREATE POLICY "Anyone can delete app users"
  ON public.app_users FOR DELETE
  USING (true);-- Add new v5.0 fields to student_records table
ALTER TABLE public.student_records 
  ADD COLUMN IF NOT EXISTS cgpa NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS certificate_file_path TEXT,
  ADD COLUMN IF NOT EXISTS photo_path TEXT;
-- Add individual file hash columns to student_records
-- These store the SHA-512 hashes of the certificate and photo files
-- computed at registration time, enabling tamper detection during verification.

ALTER TABLE student_records
  ADD COLUMN certificate_file_hash TEXT,
  ADD COLUMN photo_hash TEXT;
-- =============================================================
-- Migration: Switch to Supabase Auth + Storage Buckets & Owner-Scoped RLS
-- =============================================================
-- This migration:
--   1. Creates private storage buckets for certificates & photos
--   2. Sets up storage RLS policies (admin write, owner/admin read)
--   3. Tightens table RLS so students can read only their own record via auth.uid()
--      while admins manage records and account indexes
--
-- PREREQUISITES (must be done manually in Supabase Dashboard):
--   - Authentication > Providers > Email: Enable email provider
--   - Authentication > Providers > Email: Disable "Confirm email"
--   - Authentication > Users > Add user:
--       Email: admin@admin.com (or your preferred admin email)
--       Password: your-password
--       Auto Confirm: YES
--   - Then run in SQL Editor:
--       UPDATE auth.users
--       SET raw_user_meta_data = '{"role": "admin", "name": "University Admin"}'::jsonb
--       WHERE email = 'admin@admin.com';
--
-- EDGE FUNCTIONS (deploy with Supabase CLI):
--   npx supabase functions deploy create-student-user --project-ref <your-project-ref>
--   npx supabase functions deploy reset-student-password --project-ref <your-project-ref>
-- =============================================================

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT LOWER(
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      ''
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_app_role() = 'admin';
$$;

-- =====================
-- 1. STORAGE BUCKETS
-- =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', false)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 2. STORAGE RLS POLICIES
-- =====================
DROP POLICY IF EXISTS "Allow authenticated uploads 6j30sc_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads 6j30sc_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads 1io9m69_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads 1io9m69_0" ON storage.objects;
DROP POLICY IF EXISTS "certificates_insert" ON storage.objects;
DROP POLICY IF EXISTS "certificates_select" ON storage.objects;
DROP POLICY IF EXISTS "certificates_update" ON storage.objects;
DROP POLICY IF EXISTS "certificates_delete" ON storage.objects;
DROP POLICY IF EXISTS "photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "photos_select" ON storage.objects;
DROP POLICY IF EXISTS "photos_update" ON storage.objects;
DROP POLICY IF EXISTS "photos_delete" ON storage.objects;

CREATE POLICY "certificates_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificates' AND public.is_admin());

CREATE POLICY "certificates_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.student_records
        WHERE certificate_file_path = name
          AND supabase_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "certificates_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificates' AND public.is_admin())
  WITH CHECK (bucket_id = 'certificates' AND public.is_admin());

CREATE POLICY "certificates_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificates' AND public.is_admin());

CREATE POLICY "photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND public.is_admin());

CREATE POLICY "photos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'photos'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.student_records
        WHERE photo_path = name
          AND supabase_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "photos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'photos' AND public.is_admin());

CREATE POLICY "photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND public.is_admin());

-- =====================
-- 3. TABLE RLS POLICIES
-- =====================

DROP POLICY IF EXISTS "Student records are publicly readable" ON public.student_records;
DROP POLICY IF EXISTS "Anyone can insert student records" ON public.student_records;
DROP POLICY IF EXISTS "Anyone can update student records" ON public.student_records;
DROP POLICY IF EXISTS "Admins can read all student records" ON public.student_records;
DROP POLICY IF EXISTS "Students can read own student record" ON public.student_records;

CREATE POLICY "Admins can insert student records"
  ON public.student_records FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND supabase_user_id IS NOT NULL);

CREATE POLICY "Admins can update student records"
  ON public.student_records FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin() AND supabase_user_id IS NOT NULL);

CREATE POLICY "Admins can delete student records"
  ON public.student_records FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can read all student records"
  ON public.student_records FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Students can read own student record"
  ON public.student_records FOR SELECT TO authenticated
  USING (supabase_user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can insert departments" ON public.departments;
CREATE POLICY "Admins can insert departments"
  ON public.departments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can delete departments" ON public.departments;
CREATE POLICY "Admins can delete departments"
  ON public.departments FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "App users select for auth only" ON public.app_users;
DROP POLICY IF EXISTS "Anyone can insert app users" ON public.app_users;
DROP POLICY IF EXISTS "Anyone can update app users" ON public.app_users;
DROP POLICY IF EXISTS "Anyone can delete app users" ON public.app_users;

CREATE POLICY "Admins can read all app_users"
  ON public.app_users FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can read own app_users row"
  ON public.app_users FOR SELECT TO authenticated
  USING (supabase_user_id = auth.uid());

CREATE POLICY "Admins can insert app_users"
  ON public.app_users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND (role <> 'student' OR supabase_user_id IS NOT NULL));

CREATE POLICY "Admins can update app_users"
  ON public.app_users FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin() AND (role <> 'student' OR supabase_user_id IS NOT NULL));

CREATE POLICY "Admins can delete app_users"
  ON public.app_users FOR DELETE TO authenticated
  USING (public.is_admin());
-- Tighten verifier access so off-chain student data is only released
-- after a backend-controlled blockchain verification step.

-- Remove anonymous reads from student records.
DROP POLICY IF EXISTS "Student records are publicly readable" ON public.student_records;
DROP POLICY IF EXISTS "Admins can read all student records" ON public.student_records;
DROP POLICY IF EXISTS "Students can read own student record" ON public.student_records;

CREATE POLICY "Admins can read all student records"
  ON public.student_records
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Students can read own student record"
  ON public.student_records
  FOR SELECT
  TO authenticated
  USING (supabase_user_id = auth.uid());

-- Remove anonymous storage reads. Verifier URLs are now minted server-side
-- only after the backend re-checks the blockchain result.
DROP POLICY IF EXISTS "certificates_select" ON storage.objects;
DROP POLICY IF EXISTS "certificates_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "photos_select" ON storage.objects;
DROP POLICY IF EXISTS "photos_select_authenticated" ON storage.objects;

CREATE POLICY "certificates_select_authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.student_records
        WHERE certificate_file_path = name
          AND supabase_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "photos_select_authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.student_records
        WHERE photo_path = name
          AND supabase_user_id = auth.uid()
      )
    )
  );
-- Align student data access with the PRD:
-- every student-facing record is linked to auth.users and read via owner-scoped RLS.

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

ALTER TABLE public.student_records
ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

UPDATE public.app_users AS au
SET supabase_user_id = au.id
WHERE au.supabase_user_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.id = au.id
  );

UPDATE public.app_users AS au
SET supabase_user_id = u.id
FROM auth.users AS u
WHERE au.supabase_user_id IS NULL
  AND LOWER(au.username) = LOWER(split_part(u.email, '@', 1));

UPDATE public.app_users AS au
SET supabase_user_id = u.id
FROM auth.users AS u
WHERE au.supabase_user_id IS NULL
  AND au.roll_number IS NOT NULL
  AND LOWER(au.roll_number) = LOWER(
    COALESCE(
      u.raw_user_meta_data ->> 'roll_number',
      u.raw_app_meta_data ->> 'roll_number',
      split_part(u.email, '@', 1)
    )
  );

ALTER TABLE public.app_users
DROP CONSTRAINT IF EXISTS app_users_supabase_user_id_fkey;

ALTER TABLE public.app_users
ADD CONSTRAINT app_users_supabase_user_id_fkey
FOREIGN KEY (supabase_user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_supabase_user_id_key
ON public.app_users (supabase_user_id)
WHERE supabase_user_id IS NOT NULL;

ALTER TABLE public.app_users
DROP CONSTRAINT IF EXISTS app_users_student_requires_supabase_user_id;

ALTER TABLE public.app_users
ADD CONSTRAINT app_users_student_requires_supabase_user_id
CHECK (role <> 'student' OR supabase_user_id IS NOT NULL);

UPDATE public.student_records AS sr
SET supabase_user_id = au.supabase_user_id
FROM public.app_users AS au
WHERE sr.supabase_user_id IS NULL
  AND au.supabase_user_id IS NOT NULL
  AND LOWER(au.roll_number) = LOWER(sr.roll_number);

UPDATE public.student_records AS sr
SET supabase_user_id = u.id
FROM auth.users AS u
WHERE sr.supabase_user_id IS NULL
  AND LOWER(sr.roll_number) = LOWER(
    COALESCE(
      u.raw_user_meta_data ->> 'roll_number',
      u.raw_app_meta_data ->> 'roll_number',
      split_part(u.email, '@', 1)
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.student_records
    WHERE supabase_user_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Unable to backfill student_records.supabase_user_id for all rows. Populate missing student auth users before re-running this migration.';
  END IF;
END
$$;

ALTER TABLE public.student_records
ALTER COLUMN supabase_user_id SET NOT NULL;

ALTER TABLE public.student_records
DROP CONSTRAINT IF EXISTS student_records_supabase_user_id_fkey;

ALTER TABLE public.student_records
ADD CONSTRAINT student_records_supabase_user_id_fkey
FOREIGN KEY (supabase_user_id)
REFERENCES auth.users(id)
ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS student_records_supabase_user_id_key
ON public.student_records (supabase_user_id);

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT LOWER(
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      ''
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_app_role() = 'admin';
$$;

DROP POLICY IF EXISTS "Student records are publicly readable" ON public.student_records;
DROP POLICY IF EXISTS "Anyone can insert student records" ON public.student_records;
DROP POLICY IF EXISTS "Anyone can update student records" ON public.student_records;
DROP POLICY IF EXISTS "Authenticated users can insert student records" ON public.student_records;
DROP POLICY IF EXISTS "Authenticated users can update student records" ON public.student_records;
DROP POLICY IF EXISTS "Admins can read all student records" ON public.student_records;
DROP POLICY IF EXISTS "Students can read own student record" ON public.student_records;
DROP POLICY IF EXISTS "Admins can insert student records" ON public.student_records;
DROP POLICY IF EXISTS "Admins can update student records" ON public.student_records;
DROP POLICY IF EXISTS "Admins can delete student records" ON public.student_records;

CREATE POLICY "Admins can read all student records"
  ON public.student_records
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Students can read own student record"
  ON public.student_records
  FOR SELECT
  TO authenticated
  USING (supabase_user_id = auth.uid());

CREATE POLICY "Admins can insert student records"
  ON public.student_records
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND supabase_user_id IS NOT NULL);

CREATE POLICY "Admins can update student records"
  ON public.student_records
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin() AND supabase_user_id IS NOT NULL);

CREATE POLICY "Admins can delete student records"
  ON public.student_records
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Anyone can delete departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated users can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated users can delete departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can delete departments" ON public.departments;

CREATE POLICY "Admins can insert departments"
  ON public.departments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete departments"
  ON public.departments
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "App users select for auth only" ON public.app_users;
DROP POLICY IF EXISTS "Anyone can insert app users" ON public.app_users;
DROP POLICY IF EXISTS "Anyone can update app users" ON public.app_users;
DROP POLICY IF EXISTS "Anyone can delete app users" ON public.app_users;
DROP POLICY IF EXISTS "Authenticated users can read app_users" ON public.app_users;
DROP POLICY IF EXISTS "Authenticated users can insert app_users" ON public.app_users;
DROP POLICY IF EXISTS "Authenticated users can update app_users" ON public.app_users;
DROP POLICY IF EXISTS "Authenticated users can delete app_users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can read all app_users" ON public.app_users;
DROP POLICY IF EXISTS "Users can read own app_users row" ON public.app_users;
DROP POLICY IF EXISTS "Admins can insert app_users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can update app_users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can delete app_users" ON public.app_users;

CREATE POLICY "Admins can read all app_users"
  ON public.app_users
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can read own app_users row"
  ON public.app_users
  FOR SELECT
  TO authenticated
  USING (supabase_user_id = auth.uid());

CREATE POLICY "Admins can insert app_users"
  ON public.app_users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND (role <> 'student' OR supabase_user_id IS NOT NULL));

CREATE POLICY "Admins can update app_users"
  ON public.app_users
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin() AND (role <> 'student' OR supabase_user_id IS NOT NULL));

CREATE POLICY "Admins can delete app_users"
  ON public.app_users
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "certificates_insert" ON storage.objects;
DROP POLICY IF EXISTS "certificates_select" ON storage.objects;
DROP POLICY IF EXISTS "certificates_update" ON storage.objects;
DROP POLICY IF EXISTS "certificates_delete" ON storage.objects;
DROP POLICY IF EXISTS "certificates_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "photos_select" ON storage.objects;
DROP POLICY IF EXISTS "photos_update" ON storage.objects;
DROP POLICY IF EXISTS "photos_delete" ON storage.objects;
DROP POLICY IF EXISTS "photos_select_authenticated" ON storage.objects;

CREATE POLICY "certificates_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificates' AND public.is_admin());

CREATE POLICY "certificates_select_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.student_records
        WHERE certificate_file_path = name
          AND supabase_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "certificates_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificates' AND public.is_admin())
  WITH CHECK (bucket_id = 'certificates' AND public.is_admin());

CREATE POLICY "certificates_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificates' AND public.is_admin());

CREATE POLICY "photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND public.is_admin());

CREATE POLICY "photos_select_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'photos'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.student_records
        WHERE photo_path = name
          AND supabase_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "photos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'photos' AND public.is_admin());

CREATE POLICY "photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND public.is_admin());

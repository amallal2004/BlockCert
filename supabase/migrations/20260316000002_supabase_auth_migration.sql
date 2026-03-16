-- =============================================================
-- Migration: Switch to Supabase Auth + Storage Buckets & RLS
-- =============================================================
-- This migration:
--   1. Creates private storage buckets for certificates & photos
--   2. Sets up storage RLS policies (anon read for verification, authenticated write)
--   3. Tightens table RLS: INSERT/UPDATE/DELETE require authenticated, SELECT stays public
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
-- Drop any previously created storage policies
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

-- Certificates bucket
-- INSERT/UPDATE/DELETE: authenticated only (admin uploads)
-- SELECT: anon + authenticated (public verification portal needs to read)
CREATE POLICY "certificates_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificates');

CREATE POLICY "certificates_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'certificates');

CREATE POLICY "certificates_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificates');

CREATE POLICY "certificates_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificates');

-- Photos bucket
-- INSERT/UPDATE/DELETE: authenticated only (admin uploads)
-- SELECT: anon + authenticated (public verification portal needs to read)
CREATE POLICY "photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');

CREATE POLICY "photos_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'photos');

CREATE POLICY "photos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'photos');

CREATE POLICY "photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'photos');

-- =====================
-- 3. TABLE RLS POLICIES
-- =====================

-- student_records: public SELECT (verification portal), authenticated INSERT/UPDATE
DROP POLICY IF EXISTS "Anyone can insert student records" ON public.student_records;
CREATE POLICY "Authenticated users can insert student records"
  ON public.student_records FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update student records" ON public.student_records;
CREATE POLICY "Authenticated users can update student records"
  ON public.student_records FOR UPDATE TO authenticated
  USING (true);
-- NOTE: The original "Student records are publicly readable" SELECT policy
-- from the first migration is intentionally kept — it allows public verification.

-- departments: public SELECT (form dropdowns), authenticated INSERT/DELETE
DROP POLICY IF EXISTS "Anyone can insert departments" ON public.departments;
CREATE POLICY "Authenticated users can insert departments"
  ON public.departments FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete departments" ON public.departments;
CREATE POLICY "Authenticated users can delete departments"
  ON public.departments FOR DELETE TO authenticated
  USING (true);
-- NOTE: The original "Departments are publicly readable" SELECT policy is kept.

-- app_users: authenticated only (admin manages student accounts)
DROP POLICY IF EXISTS "App users select for auth only" ON public.app_users;
CREATE POLICY "Authenticated users can read app_users"
  ON public.app_users FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert app users" ON public.app_users;
CREATE POLICY "Authenticated users can insert app_users"
  ON public.app_users FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update app users" ON public.app_users;
CREATE POLICY "Authenticated users can update app_users"
  ON public.app_users FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete app users" ON public.app_users;
CREATE POLICY "Authenticated users can delete app_users"
  ON public.app_users FOR DELETE TO authenticated
  USING (true);

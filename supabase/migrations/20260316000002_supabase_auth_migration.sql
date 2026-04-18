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

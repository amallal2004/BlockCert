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

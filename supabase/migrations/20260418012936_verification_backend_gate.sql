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

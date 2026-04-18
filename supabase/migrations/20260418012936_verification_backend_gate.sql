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
  USING (
    COALESCE(
      LOWER(auth.jwt() -> 'user_metadata' ->> 'role'),
      LOWER(auth.jwt() -> 'app_metadata' ->> 'role'),
      ''
    ) = 'admin'
  );

CREATE POLICY "Students can read own student record"
  ON public.student_records
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      LOWER(auth.jwt() -> 'user_metadata' ->> 'role'),
      LOWER(auth.jwt() -> 'app_metadata' ->> 'role'),
      ''
    ) = 'student'
    AND LOWER(roll_number) = LOWER(
      COALESCE(
        auth.jwt() -> 'user_metadata' ->> 'roll_number',
        auth.jwt() -> 'app_metadata' ->> 'roll_number',
        ''
      )
    )
  );

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
      COALESCE(
        LOWER(auth.jwt() -> 'user_metadata' ->> 'role'),
        LOWER(auth.jwt() -> 'app_metadata' ->> 'role'),
        ''
      ) = 'admin'
      OR LOWER((storage.foldername(name))[1]) = LOWER(
        COALESCE(
          auth.jwt() -> 'user_metadata' ->> 'roll_number',
          auth.jwt() -> 'app_metadata' ->> 'roll_number',
          ''
        )
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
      COALESCE(
        LOWER(auth.jwt() -> 'user_metadata' ->> 'role'),
        LOWER(auth.jwt() -> 'app_metadata' ->> 'role'),
        ''
      ) = 'admin'
      OR LOWER((storage.foldername(name))[1]) = LOWER(
        COALESCE(
          auth.jwt() -> 'user_metadata' ->> 'roll_number',
          auth.jwt() -> 'app_metadata' ->> 'roll_number',
          ''
        )
      )
    )
  );

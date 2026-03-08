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
  USING (true);
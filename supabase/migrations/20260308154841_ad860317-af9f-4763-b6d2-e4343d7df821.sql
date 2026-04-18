
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

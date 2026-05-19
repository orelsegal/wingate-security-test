
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS birth_year integer,
  ADD COLUMN IF NOT EXISTS subject_levels jsonb DEFAULT '{}'::jsonb;

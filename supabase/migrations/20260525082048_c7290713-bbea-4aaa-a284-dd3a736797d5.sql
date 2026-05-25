ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS subjects text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS classes text[] DEFAULT '{}';

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS attendance_percent integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS sessions_completed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS open_requests integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS strengths text DEFAULT '',
  ADD COLUMN IF NOT EXISTS challenges text DEFAULT '',
  ADD COLUMN IF NOT EXISTS next_action text DEFAULT '',
  ADD COLUMN IF NOT EXISTS primary_support_subject text DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_session_date date,
  ADD COLUMN IF NOT EXISTS trend text DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS timeline jsonb DEFAULT '[]'::jsonb;

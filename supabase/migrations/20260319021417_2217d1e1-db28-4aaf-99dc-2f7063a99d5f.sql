
-- Add new columns to students table
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS diagnosis_status text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bagrut_accommodations text DEFAULT '',
  ADD COLUMN IF NOT EXISTS english_support text DEFAULT '',
  ADD COLUMN IF NOT EXISTS book_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS book_grade numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS summative_assessment text DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS exams_completed text DEFAULT '',
  ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_updated_at timestamp with time zone DEFAULT now();

-- Create sports table
CREATE TABLE IF NOT EXISTS public.sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_name text NOT NULL UNIQUE,
  active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sports" ON public.sports FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert sports" ON public.sports FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update sports" ON public.sports FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete sports" ON public.sports FOR DELETE TO public USING (true);

-- Seed initial sports
INSERT INTO public.sports (sport_name) VALUES 
  ('כדורגל'), ('התעמלות'), ('שחייה'), ('אתלטיקה'), ('ג''ודו'), ('טניס')
ON CONFLICT (sport_name) DO NOTHING;

-- Split existing full_name into first_name/last_name for existing records
UPDATE public.students SET 
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE 
    WHEN position(' ' IN full_name) > 0 THEN substring(full_name FROM position(' ' IN full_name) + 1)
    ELSE ''
  END,
  last_updated_at = now()
WHERE first_name IS NULL;

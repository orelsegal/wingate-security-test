
CREATE TABLE public.daily_quiz_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_date date NOT NULL,
  subject text NOT NULL,
  topic text NOT NULL DEFAULT '',
  questions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_date, subject)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_quiz_cache TO authenticated;
GRANT SELECT ON public.daily_quiz_cache TO anon;
GRANT ALL ON public.daily_quiz_cache TO service_role;
ALTER TABLE public.daily_quiz_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view daily quiz cache" ON public.daily_quiz_cache FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Service role manages quiz cache" ON public.daily_quiz_cache FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.daily_quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  quiz_date date NOT NULL,
  subject text NOT NULL,
  correct integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 10,
  score integer NOT NULL DEFAULT 0,
  seconds integer NOT NULL DEFAULT 0,
  daily_point boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, quiz_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_quiz_results TO authenticated;
GRANT ALL ON public.daily_quiz_results TO service_role;
ALTER TABLE public.daily_quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view all quiz results" ON public.daily_quiz_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert quiz results" ON public.daily_quiz_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update quiz results" ON public.daily_quiz_results FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_quiz_results_class_date ON public.daily_quiz_results (class_name, quiz_date);
CREATE INDEX idx_quiz_results_student ON public.daily_quiz_results (student_id, quiz_date);

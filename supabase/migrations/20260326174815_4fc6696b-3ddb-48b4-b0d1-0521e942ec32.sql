CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  user_role text NOT NULL,
  user_email text NOT NULL,
  event_type text NOT NULL DEFAULT 'login',
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read activity_logs" ON public.activity_logs FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert activity_logs" ON public.activity_logs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete activity_logs" ON public.activity_logs FOR DELETE TO public USING (true);